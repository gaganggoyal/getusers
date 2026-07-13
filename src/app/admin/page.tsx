import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import {
  ReviewButtons,
  ModerationButtons,
  GiveawayControls,
  TaskControls,
  CreateGiveawayForm,
  CreateTaskForm,
  MakeAdvertiserForm,
} from "@/components/AdminActions";
import {
  taskLabel,
  GIVEAWAY_STATUS_LABELS,
  GIVEAWAY_STATUS_PILL,
  TASK_STATUS_LABELS,
  TASK_STATUS_PILL,
} from "@/lib/taskTypes";

export const dynamic = "force-dynamic";

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  ACTIVE: 1,
  PAUSED: 2,
  DRAFT: 3,
  ENDED: 4,
  REJECTED: 5,
};

export default async function AdminPage() {
  const admin = await requireRole("ADMIN");
  if (!admin) redirect("/dashboard");

  const [pending, giveaways, pendingTasks, dupIpUsers] = await Promise.all([
    db.completion.findMany({
      where: { status: "PENDING" },
      include: { user: true, task: { include: { giveaway: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.giveaway.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        winner: true,
        createdBy: { select: { email: true, company: true } },
        tasks: {
          orderBy: { createdAt: "asc" },
          include: {
            advertiser: { select: { email: true } },
            completions: { select: { status: true } },
            _count: { select: { clicks: true } },
          },
        },
      },
    }),
    db.task.findMany({
      where: { status: "PENDING" },
      include: {
        giveaway: { select: { title: true } },
        advertiser: { select: { email: true, company: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    // fraud signal: registered accounts sharing a signup IP
    db.user.groupBy({
      by: ["signupIp"],
      where: { signupIp: { not: null } },
      having: { signupIp: { _count: { gt: 1 } } },
      _count: { signupIp: true },
    }),
  ]);

  const sortedGiveaways = [...giveaways].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
  );
  const pendingGiveawayCount = giveaways.filter(
    (g) => g.status === "PENDING"
  ).length;

  return (
    <div className="space-y-12">
      <h1 className="text-2xl font-bold text-slate-900">Admin</h1>

      {/* ── Offers awaiting review ─────────────────────────── */}
      <section>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">
          Offers awaiting review{" "}
          <span className="pill ml-1 bg-amber-100 text-amber-700">
            {pendingTasks.length}
          </span>
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Offers advertisers submitted. Approve to make them visible to users, or
          reject with a reason.
        </p>
        {pendingTasks.length === 0 ? (
          <p className="card p-5 text-sm text-slate-500">Nothing to review 🎉</p>
        ) : (
          <div className="space-y-3">
            {pendingTasks.map((t) => (
              <div
                key={t.id}
                className="card p-4 flex flex-wrap items-start justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {taskLabel(t.type)} — {t.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t.giveaway.title} · +{t.entries} entries · {t.verification}
                    {t.advertiser && <> · by {t.advertiser.company ?? t.advertiser.email}</>}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 break-all">
                    {t.targetUrl}
                  </p>
                </div>
                <ModerationButtons url={`/api/admin/tasks/${t.id}`} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Manual proof queue ─────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Manual proof reviews{" "}
          <span className="pill ml-1 bg-amber-100 text-amber-700">
            {pending.length}
          </span>
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Proof</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-900">
                    {c.user.name}
                    <span className="block text-xs text-slate-500">{c.user.email}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.task.title}
                    <span className="block text-xs text-slate-500">{c.task.giveaway.title}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-48 break-all">{c.proof}</td>
                  <td className="px-4 py-3 text-slate-500">{c.ip ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{c.createdAt.toLocaleString()}</td>
                  <td className="px-4 py-3"><ReviewButtons completionId={c.id} /></td>
                </tr>
              ))}
              {pending.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Queue is empty 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── All giveaways (management) ─────────────────────── */}
      <section>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">
          Giveaways
          {pendingGiveawayCount > 0 && (
            <span className="pill ml-2 bg-amber-100 text-amber-700">
              {pendingGiveawayCount} pending approval
            </span>
          )}
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Approve pending submissions, pause or end live ones, draw winners, and
          moderate each offer.
        </p>
        <div className="space-y-4">
          {sortedGiveaways.map((g) => (
            <div key={g.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {g.title}{" "}
                    <span className={`pill ml-1 ${GIVEAWAY_STATUS_PILL[g.status]}`}>
                      {GIVEAWAY_STATUS_LABELS[g.status]}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-amber-600">🏆 {g.prize}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {g.tasks.length} offer{g.tasks.length === 1 ? "" : "s"} · ends{" "}
                    {g.endsAt.toLocaleDateString()}
                    {g.createdBy && <> · by {g.createdBy.company ?? g.createdBy.email}</>}
                    {g.winner && <> · winner: {g.winner.name}</>}
                  </p>
                </div>
                <GiveawayControls
                  giveaway={{ id: g.id, title: g.title, status: g.status }}
                />
              </div>

              {g.tasks.length > 0 && (
                <div className="mt-4 space-y-2">
                  {g.tasks.map((t) => {
                    const approved = t.completions.filter(
                      (c) => c.status === "APPROVED"
                    ).length;
                    return (
                      <div
                        key={t.id}
                        className="rounded-lg border border-slate-200 p-3 flex flex-wrap items-start justify-between gap-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {taskLabel(t.type)} — {t.title}{" "}
                            <span className={`pill ml-1 ${TASK_STATUS_PILL[t.status]}`}>
                              {TASK_STATUS_LABELS[t.status]}
                            </span>
                            {t.status === "APPROVED" && !t.active && (
                              <span className="pill ml-1 bg-orange-100 text-orange-700">
                                Paused
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            +{t.entries} entries · {t._count.clicks} clicks ·{" "}
                            {approved} conversions
                            {t.advertiser && <> · {t.advertiser.email}</>}
                          </p>
                        </div>
                        <TaskControls
                          task={{ id: t.id, status: t.status, active: t.active }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {sortedGiveaways.length === 0 && (
            <p className="card p-5 text-sm text-slate-500">No giveaways yet.</p>
          )}
        </div>
      </section>

      {/* ── Create forms ───────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">New giveaway</h2>
          <CreateGiveawayForm />
        </section>
        <section className="card p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">New task / offer</h2>
          <CreateTaskForm giveaways={giveaways.map((g) => ({ id: g.id, title: g.title }))} />
        </section>
      </div>

      {/* ── Advertiser accounts ────────────────────────────── */}
      <section className="card p-5">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Advertiser accounts</h2>
        <p className="mb-4 text-sm text-slate-500">
          Promote a registered user to advertiser — this issues the postback key
          they use to confirm conversions.
        </p>
        <MakeAdvertiserForm />
      </section>

      {/* ── Fraud signals ──────────────────────────────────── */}
      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Fraud signals</h2>
        <p className="mb-3 text-sm text-slate-500">
          Signup IPs shared by more than one account (possible multi-accounting):
        </p>
        {dupIpUsers.length === 0 ? (
          <p className="text-sm text-slate-500">None detected.</p>
        ) : (
          <ul className="text-sm text-slate-700 space-y-1">
            {dupIpUsers.map((d) => (
              <li key={d.signupIp}>
                <code className="text-amber-600">{d.signupIp}</code> —{" "}
                {d._count.signupIp} accounts
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
