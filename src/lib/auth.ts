import { cookies } from "next/headers";
import { db } from "./db";
import { SESSION_COOKIE, verifySessionToken, type SessionPayload } from "./session";
import type { Role } from "@prisma/client";

export { createSessionToken, SESSION_COOKIE } from "./session";

/** Read the session cookie and return the payload, or null. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Load the full user for the current session, or null. */
export async function getSessionUser() {
  const session = await getSession();
  if (!session) return null;
  return db.user.findUnique({ where: { id: session.sub } });
}

export async function requireRole(...roles: Role[]) {
  const user = await getSessionUser();
  if (!user || !roles.includes(user.role)) return null;
  return user;
}
