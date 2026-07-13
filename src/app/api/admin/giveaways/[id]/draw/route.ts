import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

/**
 * Draw a winner: weighted random pick where each approved completion's
 * `entries` value counts as that many tickets. Marks the giveaway ENDED.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const giveaway = await db.giveaway.findUnique({ where: { id } });
  if (!giveaway) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (giveaway.winnerId) {
    return NextResponse.json({ error: "Winner already drawn." }, { status: 409 });
  }

  const completions = await db.completion.findMany({
    where: { status: "APPROVED", task: { giveawayId: id } },
    include: { task: { select: { entries: true } } },
  });

  const ticketsByUser = new Map<string, number>();
  for (const c of completions) {
    ticketsByUser.set(
      c.userId,
      (ticketsByUser.get(c.userId) ?? 0) + c.task.entries
    );
  }
  const total = [...ticketsByUser.values()].reduce((a, b) => a + b, 0);
  if (total === 0) {
    return NextResponse.json(
      { error: "No approved entries to draw from." },
      { status: 400 }
    );
  }

  let ticket = randomInt(total);
  let winnerId: string | null = null;
  for (const [userId, count] of ticketsByUser) {
    ticket -= count;
    if (ticket < 0) {
      winnerId = userId;
      break;
    }
  }

  const updated = await db.giveaway.update({
    where: { id },
    data: { winnerId, status: "ENDED" },
    include: { winner: { select: { name: true, email: true } } },
  });

  return NextResponse.json({ ok: true, winner: updated.winner });
}
