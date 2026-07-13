import { db } from "./db";

/**
 * Turn a giveaway title into a URL-friendly slug: lowercase, accents stripped,
 * runs of non-alphanumerics collapsed to single hyphens, trimmed, capped at 60
 * chars. Returns "" when the title has no usable characters (e.g. all emoji).
 */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "") // drop combining accent marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, ""); // slice may leave a trailing hyphen
}

/**
 * Build a slug from `title` that is unique across giveaways. On collision it
 * probes `base-2`, `base-3`, … then falls back to a short random suffix, so it
 * always terminates even with many same-titled giveaways.
 */
export async function uniqueGiveawaySlug(title: string): Promise<string> {
  const base = slugify(title) || "giveaway";
  let candidate = base;
  let n = 2;
  while (
    await db.giveaway.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
  ) {
    candidate =
      n <= 20
        ? `${base}-${n++}`
        : `${base}-${Math.random().toString(36).slice(2, 8)}`;
  }
  return candidate;
}

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
