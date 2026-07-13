import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim();
  const accountType = body?.accountType === "advertiser" ? "advertiser" : "user";
  const company = String(body?.company ?? "").trim();
  const website = String(body?.website ?? "").trim();

  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || !name) {
    return NextResponse.json(
      { error: "Valid email, name, and a password of 8+ characters are required." },
      { status: 400 }
    );
  }
  if (accountType === "advertiser" && !company) {
    return NextResponse.json(
      { error: "Company name is required for advertiser accounts." },
      { status: 400 }
    );
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered." }, { status: 409 });
  }

  const signupIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const user = await db.user.create({
    data: {
      email,
      name,
      passwordHash: await bcrypt.hash(password, 10),
      signupIp,
      ...(accountType === "advertiser"
        ? {
            role: "ADVERTISER" as const,
            postbackKey: randomBytes(24).toString("hex"),
            company,
            website: website || null,
          }
        : {}),
    },
  });

  const token = await createSessionToken(user.id, user.role);
  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
