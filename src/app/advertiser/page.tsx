import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdvertiserPage() {
  const user = await requireRole("ADVERTISER", "ADMIN");
  if (!user) redirect("/dashboard");

  const tasks = await db.task.findMany({
    where: user.role === "ADMIN" ? {} : { advertiserId: user.id },
    include: {
      giveaway: { select: { title: true } },
      _count: { select: { clicks: true } },
      completions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = tasks.map((t) => {
    const approved = t.completions.filter((c) => c.status === "APPROVED").length;
    const pending = t.completions.filter((c) => c.status === "PENDING").length;
    const clicks = t._count.clicks;
    return {
      id: t.id,
      title: t.title,
      giveaway: t.giveaway.title,
      type: t.type,
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">
        Advertiser dashboard
        {user.company && (
          <span className="ml-3 text-base font-normal text-slate-400">
            {user.company}
          </span>
        )}
      </h1>
      {user.postbackKey && (
        <p className="mt-2 text-sm text-slate-400">
          Your postback key:{" "}
          <code className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-indigo-300">
            {user.postbackKey}
          </code>{" "}
          — keep it secret.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total clicks" value={totals.clicks} />
        <Stat label="Confirmed conversions" value={totals.approved} />
        <Stat label="Pending review" value={totals.pending} />
      </div>

      <h2 className="mt-10 mb-4 text-lg font-semibold text-white">Your offers</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400 text-left">
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
              <tr key={r.id} className="border-t border-slate-800">
                <td className="px-4 py-3 text-white">{r.title}</td>
                <td className="px-4 py-3 text-slate-400">{r.giveaway}</td>
                <td className="px-4 py-3 text-slate-400">{r.clicks}</td>
                <td className="px-4 py-3 text-emerald-400">{r.approved}</td>
                <td className="px-4 py-3 text-amber-400">{r.pending}</td>
                <td className="px-4 py-3 text-slate-400">{r.cr}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  No offers yet — ask the site admin to add your offer to a
                  giveaway.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 mb-4 text-lg font-semibold text-white">
        Postback integration
      </h2>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300 space-y-3">
        <p>
          We append a unique <code className="text-indigo-300">click_id</code>{" "}
          to every user we send you. When a referred user completes the desired
          action (signup, install, purchase…), call our postback URL
          server-side:
        </p>
        <pre className="overflow-x-auto rounded-md bg-slate-950 border border-slate-800 p-3 text-xs text-emerald-300">
{`GET ${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/postback?click_id={click_id}&key=${user.postbackKey ?? "<your-postback-key>"}&payout=1.50`}
        </pre>
        <ul className="list-disc pl-5 space-y-1 text-slate-400">
          <li>
            <code className="text-indigo-300">click_id</code> — the value we
            passed to your landing page.
          </li>
          <li>
            <code className="text-indigo-300">key</code> — your secret postback
            key{user.postbackKey ? "" : " (shown here once assigned)"}. Keep it
            private.
          </li>
          <li>
            <code className="text-indigo-300">payout</code> — optional
            conversion value for your reporting.
          </li>
          <li>
            <code className="text-indigo-300">status=rejected</code> — optional,
            to reverse a conversion (fraud/chargeback).
          </li>
        </ul>
        <p className="text-slate-500">
          The endpoint returns <code>OK</code> on success and is idempotent —
          duplicate postbacks for the same click are ignored.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
