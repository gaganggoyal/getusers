import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import TaskCard, { type TaskView } from "@/components/TaskCard";
import PrizeImage from "@/components/PrizeImage";
import GoalProgress from "@/components/GoalProgress";
import { isOpenForEntries, closedReason } from "@/lib/giveaway";

export const dynamic = "force-dynamic";

// Statuses a signed-out visitor is allowed to see.
const PUBLIC_STATUSES = ["ACTIVE", "PAUSED", "ENDED"];

export default async function GiveawayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();

  const giveaway = await db.giveaway.findUnique({
    where: { id },
    include: {
      tasks: {
        where: { active: true, status: "APPROVED" },
        orderBy: { createdAt: "asc" },
      },
      winner: true,
    },
  });
  if (!giveaway) notFound();

  const canPreview =
    user && (user.role === "ADMIN" || giveaway.createdById === user.id);
  if (!PUBLIC_STATUSES.includes(giveaway.status) && !canPreview) {
    notFound();
  }

  const taskIds = giveaway.tasks.map((t) => t.id);

  const [myCompletions, approvedAgg] = await Promise.all([
    user
      ? db.completion.findMany({
          where: { userId: user.id, taskId: { in: taskIds } },
        })
      : Promise.resolve([]),
    db.completion.findMany({
      where: { taskId: { in: taskIds }, status: "APPROVED" },
      include: { task: { select: { entries: true } } },
    }),
  ]);

  const byTask = new Map(myCompletions.map((c) => [c.taskId, c.status]));
  const myEntries = myCompletions
    .filter((c) => c.status === "APPROVED")
    .reduce(
      (s, c) => s + (giveaway.tasks.find((t) => t.id === c.taskId)?.entries ?? 0),
      0
    );
  const totalEntries = approvedAgg.reduce((s, c) => s + c.task.entries, 0);
  const maxEntries = giveaway.tasks.reduce((s, t) => s + t.entries, 0);

  // "Sign-ups" = number of approved conversions, used for the goal.
  const approvedSignups = approvedAgg.length;
  const open = isOpenForEntries(giveaway, approvedSignups);
  const reason = closedReason(giveaway, approvedSignups);
  const ended = giveaway.status === "ENDED";

  const tasks: TaskView[] = giveaway.tasks.map((t) => ({
    id: t.id,
    type: t.type,
    title: t.title,
    description: t.description,
    entries: t.entries,
    verification: t.verification,
    timerSeconds: t.timerSeconds,
    completionStatus: (byTask.get(t.id) as TaskView["completionStatus"]) ?? null,
    loggedIn: !!user,
    open,
  }));

  const endsLabel = giveaway.endsAt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div>
      {giveaway.status !== "ACTIVE" && canPreview && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Preview — this giveaway is <strong>{giveaway.status}</strong> and not
          publicly listed.
        </p>
      )}

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="bg-linear-to-br from-violet-600 to-fuchsia-600 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {giveaway.imageUrl && (
              <div className="shrink-0">
                <div className="overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/20">
                  <PrizeImage
                    src={giveaway.imageUrl}
                    alt={giveaway.prize}
                    className="h-40 w-40 object-contain sm:h-48 sm:w-48"
                  />
                </div>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="pill bg-white/20 text-white">🎁 Giveaway</span>
              <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
                {giveaway.title}
              </h1>
              <p className="mt-1 text-lg font-semibold text-amber-200">
                🏆 {giveaway.prize}
              </p>
              <p className="mt-3 max-w-2xl text-sm text-violet-100">
                {giveaway.description}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <HeroChip
                  k={reason === "date" || ended ? "Ended" : "Ends"}
                  v={endsLabel}
                />
                <HeroChip k="Total entries" v={totalEntries.toLocaleString()} />
                {user && (
                  <HeroChip
                    k="Your entries"
                    v={`${myEntries} / ${maxEntries}`}
                    highlight
                  />
                )}
              </div>

              {giveaway.signupGoal != null && (
                <GoalProgress
                  current={approvedSignups}
                  goal={giveaway.signupGoal}
                  tone="onColor"
                  className="mt-5 max-w-md"
                />
              )}
            </div>
          </div>

          {ended ? (
            <p className="mt-5 rounded-lg bg-white/15 px-4 py-2 text-sm">
              This giveaway has ended.
              {giveaway.winner && (
                <>
                  {" "}
                  Winner: <strong>{giveaway.winner.name}</strong> 🎉
                </>
              )}
            </p>
          ) : !open && reason === "goal" ? (
            <p className="mt-5 rounded-lg bg-white/15 px-4 py-2 text-sm">
              🎯 Sign-up goal reached — entries are closed. The winner will be
              announced soon!
            </p>
          ) : !open && reason === "date" ? (
            <p className="mt-5 rounded-lg bg-white/15 px-4 py-2 text-sm">
              ⏰ This giveaway has closed for entries. The winner will be
              announced soon!
            </p>
          ) : null}
        </div>
      </div>

      {/* ── Tasks ─────────────────────────────────────────── */}
      <h2 className="mt-8 mb-1 text-lg font-semibold text-slate-900">
        Earn entries
      </h2>
      <p className="mb-4 text-sm text-slate-500">
        Every entry is one ticket in the draw. Partner signups credit
        automatically once confirmed, timer tasks credit instantly, and social
        tasks credit after a quick review — track them all on your dashboard.
      </p>
      <div className="space-y-4">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
        {tasks.length === 0 && (
          <p className="text-slate-500 text-sm">No tasks yet.</p>
        )}
      </div>
    </div>
  );
}

function HeroChip({
  k,
  v,
  highlight,
}: {
  k: string;
  v: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/15">
      <p className="text-[10px] uppercase tracking-wide text-white/70">{k}</p>
      <p className={`text-sm font-bold ${highlight ? "text-amber-200" : "text-white"}`}>
        {v}
      </p>
    </div>
  );
}
