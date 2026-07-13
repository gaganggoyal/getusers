import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  APPROVED: "text-emerald-400",
  PENDING: "text-amber-400",
  REJECTED: "text-red-400",
};

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  const completions = await db.completion.findMany({
    where: { userId: user.id },
    include: { task: { include: { giveaway: true } } },
    orderBy: { createdAt: "desc" },
  });

  // entries per giveaway
  const perGiveaway = new Map<
    string,
    { title: string; id: string; entries: number }
  >();
  for (const c of completions) {
    if (c.status !== "APPROVED") continue;
    const g = c.task.giveaway;
    const cur = perGiveaway.get(g.id) ?? { title: g.title, id: g.id, entries: 0 };
    cur.entries += c.task.entries;
    perGiveaway.set(g.id, cur);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">My entries</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[...perGiveaway.values()].map((g) => (
          <Link
            key={g.id}
            href={`/giveaways/${g.id}`}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-indigo-600"
          >
            <p className="text-sm text-slate-400">{g.title}</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">
              {g.entries}{" "}
              <span className="text-sm font-normal text-slate-500">entries</span>
            </p>
          </Link>
        ))}
        {perGiveaway.size === 0 && (
          <p className="text-slate-400 text-sm sm:col-span-3">
            No entries yet —{" "}
            <Link href="/" className="text-indigo-400 hover:underline">
              pick a giveaway
            </Link>{" "}
            and complete your first task.
          </p>
        )}
      </div>

      <h2 className="mt-10 mb-4 text-lg font-semibold text-white">
        Task history
      </h2>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Task</th>
              <th className="px-4 py-3 font-medium">Giveaway</th>
              <th className="px-4 py-3 font-medium">Entries</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {completions.map((c) => (
              <tr key={c.id} className="border-t border-slate-800">
                <td className="px-4 py-3 text-white">{c.task.title}</td>
                <td className="px-4 py-3 text-slate-400">
                  {c.task.giveaway.title}
                </td>
                <td className="px-4 py-3 text-slate-400">+{c.task.entries}</td>
                <td className={`px-4 py-3 font-medium ${STATUS_STYLE[c.status]}`}>
                  {c.status}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {c.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
            {completions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
