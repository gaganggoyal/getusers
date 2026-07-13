import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import EmbedSnippet from "@/components/EmbedSnippet";
import {
  CreateGiveawayForm,
  CreateOfferForm,
  GiveawayManage,
  OfferManage,
  type GiveawayShape,
  type OfferShape,
} from "@/components/AdvertiserActions";
import {
  taskLabel,
  GIVEAWAY_STATUS_LABELS,
  GIVEAWAY_STATUS_PILL,
  TASK_STATUS_LABELS,
  TASK_STATUS_PILL,
} from "@/lib/taskTypes";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function AdvertiserPage() {
  const user = await requireRole("ADVERTISER", "ADMIN");
  if (!user) redirect("/dashboard");

  const [myGiveaways, tasks, embeddable] = await Promise.all([
    db.giveaway.findMany({
      where: { createdById: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        tasks: {
          orderBy: { createdAt: "desc" },
          include: {
            _count: { select: { clicks: true } },
            completions: { select: { status: true } },
          },
        },
      },
    }),
    db.task.findMany({
      where: { advertiserId: user.id },
      include: {
        giveaway: { select: { title: true } },
        _count: { select: { clicks: true } },
        completions: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.giveaway.findMany({
      where: {
        status: "ACTIVE",
        ...(user.role === "ADMIN"
          ? {}
          : { tasks: { some: { advertiserId: user.id } } }),
      },
      select: { id: true, title: true, prize: true },
      orderBy: { endsAt: "asc" },
    }),
  ]);

  const rows = tasks.map((t) => {
    const approved = t.completions.filter((c) => c.status === "APPROVED").length;
    const pending = t.completions.filter((c) => c.status === "PENDING").length;
    const clicks = t._count.clicks;
    return {
      id: t.id,
      title: t.title,
      giveaway: t.giveaway.title,
      clicks,
      approved,
      pending,
      cr: clicks ? ((approved / clicks) * 100).toFixed(1) + "%" : "—",
    };
  });

  const totals = rows.reduce(
    (a, r) => ({
      clicks: a.clicks + r.clicks,
      approved: a.approved + r.approved,
      pending: a.pending + r.pending,
    }),
    { clicks: 0, approved: 0, pending: 0 }
  );

  // Giveaways still open for new offers (used by the create-offer picker).
  const openGiveaways = myGiveaways
    .filter((g) => g.status !== "ENDED")
    .map((g) => ({ id: g.id, title: g.title }));

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Advertiser dashboard
          {user.company && (
            <span className="ml-3 text-base font-normal text-slate-500">
              {user.company}
            </span>
          )}
        </h1>
        {user.postbackKey && (
          <p className="mt-2 text-sm text-slate-600">
            Your postback key:{" "}
            <code className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-violet-700">
              {user.postbackKey}
            </code>{" "}
            — keep it secret.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total clicks" value={totals.clicks} />
        <Stat label="Confirmed conversions" value={totals.approved} />
        <Stat label="Pending review" value={totals.pending} />
      </div>

      {/* ── Your giveaways ─────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">
          Your giveaways
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Launch your own giveaway, add the offers users complete to earn
          entries, and we&apos;ll review each one before it goes live.
        </p>

        {myGiveaways.length === 0 ? (
          <p className="card p-5 text-sm text-slate-500">
            You haven&apos;t created a giveaway yet — use the form below to launch
            your first one.
          </p>
        ) : (
          <div className="space-y-4">
            {myGiveaways.map((g) => {
              const shape: GiveawayShape = {
                id: g.id,
                title: g.title,
                description: g.description,
                prize: g.prize,
                imageUrl: g.imageUrl,
                endsAt: g.endsAt.toISOString(),
                status: g.status,
              };
              return (
                <div key={g.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {g.title}{" "}
                        <span
                          className={`pill ml-1 ${GIVEAWAY_STATUS_PILL[g.status]}`}
                        >
                          {GIVEAWAY_STATUS_LABELS[g.status]}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-amber-600">🏆 {g.prize}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {g.tasks.length} offer{g.tasks.length === 1 ? "" : "s"} ·
                        ends {g.endsAt.toLocaleDateString()}
                      </p>
                    </div>
                    <GiveawayManage giveaway={shape} />
                  </div>

                  {g.status === "REJECTED" && g.reviewNote && (
                    <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      Rejected: {g.reviewNote}
                    </p>
                  )}

                  {g.tasks.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {g.tasks.map((t) => {
                        const approved = t.completions.filter(
                          (c) => c.status === "APPROVED"
                        ).length;
                        const offer: OfferShape = {
                          id: t.id,
                          type: t.type,
                          title: t.title,
                          description: t.description,
                          targetUrl: t.targetUrl,
                          entries: t.entries,
                          verification: t.verification,
                          timerSeconds: t.timerSeconds,
                          status: t.status,
                          active: t.active,
                        };
                        return (
                          <div
                            key={t.id}
                            className="rounded-lg border border-slate-200 p-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {taskLabel(t.type)} — {t.title}{" "}
                                  <span
                                    className={`pill ml-1 ${TASK_STATUS_PILL[t.status]}`}
                                  >
                                    {TASK_STATUS_LABELS[t.status]}
                                  </span>
                                  {t.status === "APPROVED" && !t.active && (
                                    <span className="pill ml-1 bg-orange-100 text-orange-700">
                                      Paused
                                    </span>
                                  )}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  +{t.entries}{" "}
                                  {t.entries === 1 ? "entry" : "entries"} ·{" "}
                                  {t._count.clicks} clicks · {approved} conversions
                                </p>
                                {t.status === "REJECTED" && t.reviewNote && (
                                  <p className="mt-1 text-xs text-red-600">
                                    Rejected: {t.reviewNote}
                                  </p>
                                )}
                              </div>
                              <OfferManage offer={offer} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Create forms ───────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Launch a new giveaway
          </h2>
          <CreateGiveawayForm />
        </section>
        <section className="card p-5">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">
            Add an offer
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Attach a task to one of your giveaways — a signup, install, follow,
            visit and more.
          </p>
          <CreateOfferForm giveaways={openGiveaways} />
        </section>
      </div>

      {/* ── Performance table ──────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Offer performance
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Offer</th>
                <th className="px-4 py-3 font-medium">Giveaway</th>
                <th className="px-4 py-3 font-medium">Clicks</th>
                <th className="px-4 py-3 font-medium">Conversions</th>
                <th className="px-4 py-3 font-medium">Pending</th>
                <th className="px-4 py-3 font-medium">Conv. rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-900">{r.title}</td>
                  <td className="px-4 py-3 text-slate-600">{r.giveaway}</td>
                  <td className="px-4 py-3 text-slate-600">{r.clicks}</td>
                  <td className="px-4 py-3 text-emerald-600">{r.approved}</td>
                  <td className="px-4 py-3 text-amber-600">{r.pending}</td>
                  <td className="px-4 py-3 text-slate-600">{r.cr}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    No offers yet — create a giveaway and add your first offer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Embed ──────────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">
          Embed a giveaway on your site
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Showcase a giveaway your offer is part of, right on your own page. Drop
          in the snippet and a live, auto-sizing widget appears — every visitor
          who enters flows through your offer.
        </p>
        {embeddable.length === 0 ? (
          <p className="card p-5 text-sm text-slate-500">
            No embeddable giveaways yet. Once your offer is added to an active
            giveaway, its embed snippet will appear here.
          </p>
        ) : (
          <div className="space-y-4">
            {embeddable.map((g) => (
              <EmbedSnippet
                key={g.id}
                siteUrl={SITE_URL}
                giveawayId={g.id}
                title={`${g.title} — 🏆 ${g.prize}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Postback integration ───────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Postback integration
        </h2>
        <div className="card p-5 text-sm text-slate-700 space-y-3">
          <p>
            We append a unique{" "}
            <code className="rounded bg-slate-100 px-1 text-violet-700">
              click_id
            </code>{" "}
            to every user we send you. When a referred user completes the desired
            action (signup, install, purchase…), call our postback URL
            server-side:
          </p>
          <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-emerald-300">
{`GET ${SITE_URL}/api/postback?click_id={click_id}&key=${
  user.postbackKey ?? "<your-postback-key>"
}&payout=1.50`}
          </pre>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>
              <code className="text-violet-700">click_id</code> — the value we
              passed to your landing page.
            </li>
            <li>
              <code className="text-violet-700">key</code> — your secret postback
              key{user.postbackKey ? "" : " (shown here once assigned)"}. Keep it
              private.
            </li>
            <li>
              <code className="text-violet-700">payout</code> — optional
              conversion value for your reporting.
            </li>
            <li>
              <code className="text-violet-700">status=rejected</code> — optional,
              to reverse a conversion (fraud/chargeback).
            </li>
          </ul>
          <p className="text-slate-500">
            The endpoint returns <code>OK</code> on success and is idempotent —
            duplicate postbacks for the same click are ignored.
          </p>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
