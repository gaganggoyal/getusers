/**
 * Seeds the "Claude Pro membership" giveaway with its four partner tasks.
 *
 *   node prisma/seed-claude-giveaway.mjs          # insert / update
 *   node prisma/seed-claude-giveaway.mjs --dry    # print the plan, write nothing
 *
 * Re-runnable: matched on the giveaway slug. Tasks are matched on their title
 * within the giveaway, so editing copy below and re-running updates in place
 * rather than duplicating. Existing Clicks/Completions are never touched.
 *
 * ── One winner, not many ────────────────────────────────────────────────────
 * src/app/api/admin/giveaways/[id]/draw/route.ts picks a single weighted-random
 * winner and returns 409 if a winner already exists. The platform cannot award
 * multiple winners, so the copy here says one winner. If you want more, run
 * separate giveaways — do not advertise a number the draw can't deliver.
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const DRY = process.argv.includes("--dry");

// ── Edit before launch ──────────────────────────────────────────────────────
const SLUG     = "claude-pro-membership-giveaway";
const ENDS_AT  = new Date("2026-08-31T18:29:59Z"); // 2026-09-01 00:00 IST
const PRIZE    = "1 month of Claude Pro (₹2,399 value)";
const IMAGE    = "/prizes/claude-pro.svg";

const TITLE = "Win a Claude Pro Membership";

const DESCRIPTION = `Complete the partner tasks below to earn entries. One winner is drawn at random when entries close on 31 August 2026 — every entry is one ticket, so finishing more tasks improves your odds.

The prize is an official Anthropic gift subscription code, redeemed on your own Claude account at claude.ai/redeem. Your account stays yours: no shared logins, no credentials exchanged. Codes expire 365 days after purchase and cannot be stacked with another gift redemption.

Open to residents of India aged 18+. One entry per person — duplicate or automated entries are disqualified. The winner is contacted on the email used to register here; if there is no reply within 7 days a replacement is drawn. No cash alternative.

Run by GetUsers.online. Not sponsored, endorsed, administered by, or associated with Anthropic. Claude and Anthropic are trademarks of Anthropic PBC, used only to identify the prize.`;

// Verification notes:
//   MANUAL → user submits proof (username/email), admin approves in /admin.
//   TIMER  → auto-credits after the dwell time, no review needed.
// All four are first-party sites, so these can be upgraded to POSTBACK later by
// having each site call /api/postback with its advertiser key — see README.
const TASKS = [
  {
    type: "PARTNER_SIGNUP",
    verification: "MANUAL",
    entries: 5,
    title: "Sign up on Mivloc and start an encrypted chat",
    description:
      "Create a free Mivloc account, then start one chat so you can see the 60-second auto-encryption in action. Submit the email address or username you registered with and we'll verify it.",
    targetUrl: "https://mivloc.online/?utm_source=getusers&utm_medium=giveaway&utm_campaign=claude-pro&click_id={click_id}",
  },
  {
    type: "PARTNER_SIGNUP",
    verification: "MANUAL",
    entries: 5,
    title: "Sign up on QuickCric and play two matches",
    description:
      "Register on QuickCric, then simulate at least two full matches in the browser. Submit your QuickCric username — we check the match count against your account before approving.",
    targetUrl: "https://quickcric.online/?utm_source=getusers&utm_medium=giveaway&utm_campaign=claude-pro&click_id={click_id}",
  },
  {
    type: "VISIT_WEBSITE",
    verification: "TIMER",
    entries: 1,
    timerSeconds: 45,
    title: "Visit TrulyVeg and read one ingredient guide",
    description:
      "Spend at least 45 seconds on TrulyVeg — the independent guide to genuinely vegetarian products. This entry credits automatically once the timer completes.",
    targetUrl: "https://trulyveg.com/?utm_source=getusers&utm_medium=giveaway&utm_campaign=claude-pro",
  },
  {
    type: "PARTNER_SIGNUP",
    verification: "MANUAL",
    entries: 3,
    title: "Register on IndiaOffers",
    description:
      "Create a free IndiaOffers account to get deal alerts and bank-offer stacking. Submit the email address you registered with so we can confirm the account.",
    targetUrl: "https://indiaoffers.in/register?utm_source=getusers&utm_medium=giveaway&utm_campaign=claude-pro&click_id={click_id}",
  },
];

// ── Guards that mirror src/lib/validateTask.ts ──────────────────────────────
for (const t of TASKS) {
  if (t.entries < 1 || t.entries > 50) throw new Error(`entries out of range: ${t.title}`);
  if (t.timerSeconds != null && (t.timerSeconds < 5 || t.timerSeconds > 600)) {
    throw new Error(`timerSeconds out of range: ${t.title}`);
  }
  new URL(t.targetUrl.replaceAll("{click_id}", "x")); // throws on a bad URL
}

const existing = await db.giveaway.findFirst({
  where: { slug: SLUG },
  include: { tasks: true },
});

if (DRY) {
  console.log(existing ? `[dry-run] would update giveaway ${SLUG}` : `[dry-run] would create giveaway ${SLUG}`);
  for (const t of TASKS) {
    const hit = existing?.tasks.find((x) => x.title === t.title);
    console.log(`  [dry-run] would ${hit ? "update" : "create"} task — ${t.entries} entries · ${t.verification} · ${t.title}`);
  }
  await db.$disconnect();
  process.exit(0);
}

let giveawayId;
if (existing) {
  await db.giveaway.update({
    where: { id: existing.id },
    data: {
      title: TITLE,
      description: DESCRIPTION,
      prize: PRIZE,
      imageUrl: IMAGE,
      endsAt: ENDS_AT,
      status: "ACTIVE",
    },
  });
  giveawayId = existing.id;
  console.log(`Updated giveaway ${SLUG} (${giveawayId})`);
} else {
  const created = await db.giveaway.create({
    data: {
      slug: SLUG,
      title: TITLE,
      description: DESCRIPTION,
      prize: PRIZE,
      imageUrl: IMAGE,
      endsAt: ENDS_AT,
      status: "ACTIVE",
    },
  });
  giveawayId = created.id;
  console.log(`Created giveaway ${SLUG} (${giveawayId})`);
}

for (const t of TASKS) {
  const hit = existing?.tasks.find((x) => x.title === t.title);
  const data = {
    type: t.type,
    verification: t.verification,
    title: t.title,
    description: t.description,
    targetUrl: t.targetUrl,
    entries: t.entries,
    timerSeconds: t.timerSeconds ?? 30,
    status: "APPROVED", // admin-seeded, so it goes live without a review round
    active: true,
  };
  if (hit) {
    await db.task.update({ where: { id: hit.id }, data });
    console.log(`  Updated task — ${t.title}`);
  } else {
    await db.task.create({ data: { ...data, giveawayId } });
    console.log(`  Created task — ${t.title}`);
  }
}

const maxEntries = TASKS.reduce((s, t) => s + t.entries, 0);
console.log(`\nMax entries per user: ${maxEntries}`);
console.log(`→ /giveaways/${SLUG}`);

await db.$disconnect();
