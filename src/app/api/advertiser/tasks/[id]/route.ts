import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parseTaskFields } from "@/lib/validateTask";

async function loadOwned(id: string, userId: string, isAdmin: boolean) {
  const task = await db.task.findUnique({ where: { id } });
  if (!task) return { error: "Not found.", status: 404 as const };
  if (!isAdmin && task.advertiserId !== userId) {
    return { error: "Forbidden", status: 403 as const };
  }
  return { task };
}

/** Edit an offer, or toggle its pause switch via { active }. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole("ADVERTISER", "ADMIN");
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const res = await loadOwned(id, user.id, user.role === "ADMIN");
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  const { task } = res;

  const body = await req.json().catch(() => null);

  // Pause / resume toggle — allowed on approved offers without re-review.
  if (typeof body?.active === "boolean" && Object.keys(body).length === 1) {
    await db.task.update({ where: { id }, data: { active: body.active } });
    return NextResponse.json({ ok: true });
  }

  const parsed = parseTaskFields(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (parsed.data.verification === "POSTBACK" && !user.postbackKey && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Postback offers need your tracking key — contact us to enable it." },
      { status: 400 }
    );
  }

  // Advertiser edits send the offer back through review; admin edits don't.
  const status = user.role === "ADMIN" ? task.status : "PENDING";

  await db.task.update({
    where: { id },
    data: {
      ...parsed.data,
      status,
      reviewNote: status === "PENDING" ? null : task.reviewNote,
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole("ADVERTISER", "ADMIN");
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const res = await loadOwned(id, user.id, user.role === "ADMIN");
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }

  await db.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
