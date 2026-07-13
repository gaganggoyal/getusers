import { NextRequest, NextResponse } from "next/server";
import { GiveawayStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parseSignupGoal } from "@/lib/giveaway";

/**
 * Moderate / manage a giveaway.
 * Body is either { action: "approve" | "reject" | "pause" | "resume" | "end", note? }
 * or a set of editable fields { title, description, prize, endsAt, imageUrl }.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const giveaway = await db.giveaway.findUnique({ where: { id } });
  if (!giveaway) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const action = body?.action ? String(body.action) : null;

  if (action) {
    const map: Record<string, GiveawayStatus> = {
      approve: "ACTIVE",
      resume: "ACTIVE",
      reject: "REJECTED",
      pause: "PAUSED",
      end: "ENDED",
    };
    const status = map[action];
    if (!status) {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
    await db.giveaway.update({
      where: { id },
      data: {
        status,
        reviewNote: action === "reject" ? String(body?.note ?? "").trim() || null : null,
      },
    });
    return NextResponse.json({ ok: true, status });
  }

  // Field edit
  const title = String(body?.title ?? giveaway.title).trim();
  const description = String(body?.description ?? giveaway.description).trim();
  const prize = String(body?.prize ?? giveaway.prize).trim();
  const imageUrl = String(body?.imageUrl ?? giveaway.imageUrl ?? "").trim();
  const endsAt = body?.endsAt ? new Date(String(body.endsAt)) : giveaway.endsAt;

  if (!title || !prize || Number.isNaN(endsAt.getTime())) {
    return NextResponse.json(
      { error: "Title, prize and a valid end date are required." },
      { status: 400 }
    );
  }

  const signupGoal =
    body?.signupGoal !== undefined
      ? parseSignupGoal(body.signupGoal)
      : giveaway.signupGoal;

  await db.giveaway.update({
    where: { id },
    data: { title, description, prize, imageUrl: imageUrl || null, endsAt, signupGoal },
  });
  return NextResponse.json({ ok: true });
}

/**
 * Delete a giveaway. Cascades to its tasks, and in turn their clicks and
 * completions, via the schema's onDelete: Cascade rules.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const giveaway = await db.giveaway.findUnique({ where: { id } });
  if (!giveaway) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.giveaway.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
