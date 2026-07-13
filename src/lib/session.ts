// Edge-safe session helpers (no Prisma import — used by middleware too).
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-me-in-production"
);

export const SESSION_COOKIE = "session";

export type SessionPayload = { sub: string; role: Role };

export async function createSessionToken(userId: string, role: Role) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    return { sub: payload.sub, role: payload.role as Role };
  } catch {
    return null;
  }
}
