import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { TaskType, VerificationMode } from "@prisma/client";

export async function POST(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const giveawayId = String(body?.giveawayId ?? "");
  const title = String(body?.title ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const targetUrl = String(body?.targetUrl ?? "").trim();
  const entries = Math.max(1, Number(body?.entries ?? 1) | 0);
  const timerSeconds = Math.max(5, Number(body?.timerSeconds ?? 30) | 0);
  const advertiserEmail = String(body?.advertiserEmail ?? "").trim().toLowerCase();

  const type = body?.type as TaskType;
  const verification = body?.verification as VerificationMode;
  if (!Object.values(TaskType).includes(type)) {
    return NextResponse.json({ error: "Invalid task type." }, { status: 400 });
  }
  if (!Object.values(VerificationMode).includes(verification)) {
    return NextResponse.json({ error: "Invalid verification mode." }, { status: 400 });
  }

  try {
    new URL(targetUrl.replaceAll("{click_id}", "x"));
  } catch {
    return NextResponse.json({ error: "Invalid target URL." }, { status: 400 });
  }

  const giveaway = await db.giveaway.findUnique({ where: { id: giveawayId } });
  if (!giveaway || !title) {
    return NextResponse.json(
      { error: "Giveaway and title are required." },
      { status: 400 }
    );
  }

  let advertiserId: string | null = null;
  if (advertiserEmail) {
    const adv = await db.user.findUnique({ where: { email: advertiserEmail } });
    if (!adv || adv.role !== "ADVERTISER") {
      return NextResponse.json(
        { error: "No advertiser account with that email." },
        { status: 400 }
      );
    }
    advertiserId = adv.id;
  }
  if (verification === "POSTBACK" && !advertiserId) {
    return NextResponse.json(
      { error: "Postback-verified tasks need an advertiser (owner of the postback key)." },
      { status: 400 }
    );
  }

  const task = await db.task.create({
    data: {
      giveawayId,
      advertiserId,
      type,
      verification,
      title,
      description,
      targetUrl,
      entries,
      timerSeconds,
    },
  });
  return NextResponse.json({ ok: true, id: task.id });
}
