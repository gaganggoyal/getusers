import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import {
  ReviewButtons,
  DrawWinnerButton,
  DeleteGiveawayButton,
  CreateGiveawayForm,
  CreateTaskForm,
  MakeAdvertiserForm,
} from "@/components/AdminActions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireRole("ADMIN");
  if (!admin) redirect("/dashboard");

  const [pending, giveaways, dupIpUsers] = await Promise.all([
    db.completion.findMany({
      where: { status: "PENDING" },
      include: { user: true, task: { include: { giveaway: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.giveaway.findMany({
      orderBy: { createdAt: "desc" },
      include: { winner: true, tasks: true },
    }),
    // fraud signal: registered accounts sharing a signup IP
    db.user.groupBy({
      by: ["signupIp"],
      where: { signupIp: { not: null } },
      having: { signupIp: { _count: { gt: 1 } } },
      _count: { signupIp: true },
    }),
  ]);

  return (
    <div className="space-y-12">
      <h1 className="text-2xl font-bold text-white">Admin</h1>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">
          Pending manual reviews{" "}
          <span className="text-sm font-normal text-amber-400">
            ({pending.length})
          </span>
        </h2>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400 text-left">
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
                <tr key={c.id} className="border-t border-slate-800">
                  <td className="px-4 py-3 text-white">
                    {c.user.name}
                    <span className="block text-xs text-slate-500">{c.user.email}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {c.task.title}
                    <span className="block text-xs text-slate-500">{c.task.giveaway.title}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 max-w-48 break-all">{c.proof}</td>
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

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Giveaways</h2>
        <div className="space-y-3">
          {giveaways.map((g) => (
            <div
              key={g.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="text-white font-medium">
                  {g.title}{" "}
                  <span
                    className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      g.status === "ACTIVE"
                        ? "bg-emerald-600/20 text-emerald-300"
                        : "bg-slate-700/40 text-slate-400"
                    }`}
                  >
                    {g.status}
                  </span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {g.tasks.length} tasks · ends {g.endsAt.toLocaleDateString()}
                  {g.winner && <> · winner: {g.winner.name}</>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {g.status === "ACTIVE" && <DrawWinnerButton giveawayId={g.id} />}
                <DeleteGiveawayButton giveawayId={g.id} title={g.title} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-lg font-semibold text-white mb-4">New giveaway</h2>
          <CreateGiveawayForm />
        </section>
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-lg font-semibold text-white mb-4">New task / offer</h2>
          <CreateTaskForm giveaways={giveaways.map((g) => ({ id: g.id, title: g.title }))} />
        </section>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-lg font-semibold text-white mb-2">Advertiser accounts</h2>
        <p className="text-sm text-slate-400 mb-4">
          Promote a registered user to advertiser — this issues the postback key
          they use to confirm conversions.
        </p>
        <MakeAdvertiserForm />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-2">Fraud signals</h2>
        <p className="text-sm text-slate-400 mb-3">
          Signup IPs shared by more than one account (possible multi-accounting):
        </p>
        {dupIpUsers.length === 0 ? (
          <p className="text-sm text-slate-500">None detected.</p>
        ) : (
          <ul className="text-sm text-slate-300 space-y-1">
            {dupIpUsers.map((d) => (
              <li key={d.signupIp}>
                <code className="text-amber-300">{d.signupIp}</code> —{" "}
                {d._count.signupIp} accounts
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
