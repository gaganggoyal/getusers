import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parseSignupGoal } from "@/lib/giveaway";

export async function POST(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const prize = String(body?.prize ?? "").trim();
  const imageUrl = String(body?.imageUrl ?? "").trim();
  const endsAt = new Date(body?.endsAt ?? "");

  if (!title || !prize || Number.isNaN(endsAt.getTime())) {
    return NextResponse.json(
      { error: "Title, prize and a valid end date are required." },
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
    // admin-created giveaways go live immediately
    data: {
      title,
      description,
      prize,
      imageUrl: imageUrl || null,
      endsAt,
      signupGoal: parseSignupGoal(body?.signupGoal),
      status: "ACTIVE",
      createdById: admin.id,
    },
  });
  return NextResponse.json({ ok: true, id: giveaway.id });
}
