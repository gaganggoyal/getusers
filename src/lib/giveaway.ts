import { db } from "./db";

/** Parse a sign-up goal from form input; blank/invalid → null (date-only). */
export function parseSignupGoal(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Math.floor(Number(s));
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(n, 1_000_000);
}

export type GiveawayLike = {
  status: string;
  endsAt: Date;
  signupGoal: number | null;
};

/** A "sign-up" is one approved conversion toward the giveaway's goal. */
export function goalReached(g: GiveawayLike, approvedSignups: number): boolean {
  return g.signupGoal != null && approvedSignups >= g.signupGoal;
}

export function datePassed(g: GiveawayLike): boolean {
  return g.endsAt.getTime() <= Date.now();
}

/**
 * Can a user still earn entries? Requires the giveaway to be ACTIVE, before its
 * deadline, and not yet at its sign-up goal. Winner draws stay manual (admin),
 * so hitting the goal or the date closes entries but never auto-awards a prize.
 */
export function isOpenForEntries(g: GiveawayLike, approvedSignups: number): boolean {
  return g.status === "ACTIVE" && !datePassed(g) && !goalReached(g, approvedSignups);
}

/** Human reason a giveaway is closed, for admin/user messaging. */
export function closedReason(
  g: GiveawayLike,
  approvedSignups: number
): "goal" | "date" | null {
  if (g.status !== "ACTIVE") return null;
  if (goalReached(g, approvedSignups)) return "goal";
  if (datePassed(g)) return "date";
  return null;
}

/**
 * Approved sign-up counts per giveaway for a set of giveaways (each with its
 * task ids), using a single grouped query.
 */
export async function approvedSignupsByGiveaway(
  giveaways: { id: string; tasks: { id: string }[] }[]
): Promise<Map<string, number>> {
  const taskToGiveaway = new Map<string, string>();
  for (const g of giveaways) {
    for (const t of g.tasks) taskToGiveaway.set(t.id, g.id);
  }
  const taskIds = [...taskToGiveaway.keys()];
  const counts = new Map<string, number>();
  if (taskIds.length === 0) return counts;

  const grouped = await db.completion.groupBy({
    by: ["taskId"],
    where: { status: "APPROVED", taskId: { in: taskIds } },
    _count: { _all: true },
  });
  for (const row of grouped) {
    const gid = taskToGiveaway.get(row.taskId);
    if (gid) counts.set(gid, (counts.get(gid) ?? 0) + row._count._all);
  }
  return counts;
}
