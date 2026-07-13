import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/**
 * User claims a task as done.
 * - POSTBACK tasks: rejected — only the advertiser's postback can credit them.
 * - TIMER tasks: auto-approved if the tracked click is at least `timerSeconds` old.
 * - MANUAL tasks: creates a PENDING completion with user-submitted proof for review.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const task = await db.task.findUnique({
    where: { id },
    include: { giveaway: true },
  });
  if (
    !task ||
    !task.active ||
    task.status !== "APPROVED" ||
    task.giveaway.status !== "ACTIVE"
  ) {
    return NextResponse.json({ error: "Task not available." }, { status: 404 });
  }

  if (task.verification === "POSTBACK") {
    return NextResponse.json(
      { error: "This task is credited automatically once the partner confirms your signup." },
      { status: 400 }
    );
  }

  const existing = await db.completion.findUnique({
    where: { taskId_userId: { taskId: task.id, userId: user.id } },
  });
  if (existing && existing.status !== "REJECTED") {
    return NextResponse.json({ error: "Already submitted." }, { status: 409 });
  }

  // Both TIMER and MANUAL require the user to have actually clicked through.
  const click = await db.click.findFirst({
    where: { taskId: task.id, userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  if (!click) {
    return NextResponse.json(
      { error: "Open the task link first." },
      { status: 400 }
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  if (task.verification === "TIMER") {
    const elapsed = (Date.now() - click.createdAt.getTime()) / 1000;
    if (elapsed < task.timerSeconds) {
      return NextResponse.json(
        { error: `Please spend at least ${task.timerSeconds}s on the page before claiming.` },
        { status: 400 }
      );
    }
    const completion = await upsertCompletion(task.id, user.id, {
      status: "APPROVED",
      source: "TIMER",
      clickDbId: click.id,
      ip,
      reviewedAt: new Date(),
    });
    return NextResponse.json({ ok: true, status: completion.status });
  }

  // MANUAL
  const body = await req.json().catch(() => null);
  const proof = String(body?.proof ?? "").trim().slice(0, 500);
  if (!proof) {
    return NextResponse.json(
      { error: "Please provide proof (your username or a link)." },
      { status: 400 }
    );
  }
  const completion = await upsertCompletion(task.id, user.id, {
    status: "PENDING",
    source: "MANUAL",
    clickDbId: click.id,
    proof,
    ip,
  });
  return NextResponse.json({ ok: true, status: completion.status });
}

function upsertCompletion(
  taskId: string,
  userId: string,
  data: {
    status: "APPROVED" | "PENDING";
    source: "TIMER" | "MANUAL";
    clickDbId: string;
    ip: string | null;
    proof?: string;
    reviewedAt?: Date;
  }
) {
  return db.completion.upsert({
    where: { taskId_userId: { taskId, userId } },
    create: { taskId, userId, ...data },
    update: { ...data },
  });
}
