import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

/**
 * Advertiser submits a new giveaway. It is created as PENDING and only goes
 * live once an admin approves it.
 */
export async function POST(req: NextRequest) {
  const user = await requireRole("ADVERTISER", "ADMIN");
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const prize = String(body?.prize ?? "").trim();
  const imageUrl = String(body?.imageUrl ?? "").trim();
  const endsAt = new Date(String(body?.endsAt ?? ""));

  if (!title || !prize || Number.isNaN(endsAt.getTime())) {
    return NextResponse.json(
      { error: "Title, prize and a valid end date are required." },
      { status: 400 }
    );
  }
  if (endsAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "End date must be in the future." },
      { status: 400 }
    );
  }
  if (imageUrl) {
    try {
      new URL(imageUrl);
    } catch {
      return NextResponse.json({ error: "Invalid image URL." }, { status: 400 });
    }
  }

  const giveaway = await db.giveaway.create({
    data: {
      title,
      description,
      prize,
      imageUrl: imageUrl || null,
      endsAt,
      status: "PENDING",
      createdById: user.id,
    },
  });
  return NextResponse.json({ ok: true, id: giveaway.id });
}
