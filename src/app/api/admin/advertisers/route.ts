import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

/** Promote an existing user to ADVERTISER and issue their postback key. */
export async function POST(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "No user with that email — ask them to register first." },
      { status: 404 }
    );
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      role: user.role === "ADMIN" ? "ADMIN" : "ADVERTISER",
      postbackKey: user.postbackKey ?? randomBytes(24).toString("hex"),
    },
  });

  return NextResponse.json({ ok: true, postbackKey: updated.postbackKey });
}
