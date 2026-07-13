import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import TaskCard, { type TaskView } from "@/components/TaskCard";

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

  // Hide pending/draft/rejected giveaways from everyone except an admin or the
  // advertiser who owns it.
  const canPreview =
    user &&
    (user.role === "ADMIN" || giveaway.createdById === user.id);
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
  }));

  return (
    <div>
      {giveaway.status !== "ACTIVE" && canPreview && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Preview — this giveaway is <strong>{giveaway.status}</strong> and not
          publicly listed.
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="bg-linear-to-br from-violet-600 to-fuchsia-600 p-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{giveaway.title}</h1>
              <p className="mt-1 font-medium text-amber-200">🏆 {giveaway.prize}</p>
              <p className="mt-3 text-sm text-violet-100 max-w-2xl">
                {giveaway.description}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="text-violet-100">
                Ends{" "}
                <span className="font-semibold text-white">
                  {giveaway.endsAt.toLocaleDateString()}
                </span>
              </p>
              <p className="mt-1 text-violet-100">
                Total entries:{" "}
                <span className="font-semibold text-white">{totalEntries}</span>
              </p>
              {user && (
                <p className="mt-1 text-violet-100">
                  Your entries:{" "}
                  <span className="font-semibold text-amber-200">
                    {myEntries}
                  </span>{" "}
                  / {maxEntries}
                </p>
              )}
            </div>
          </div>
          {giveaway.status === "ENDED" && (
            <p className="mt-4 rounded-lg bg-white/15 px-4 py-2 text-sm text-white">
              This giveaway has ended.
              {giveaway.winner && (
                <>
                  {" "}
                  Winner: <strong>{giveaway.winner.name}</strong> 🎉
                </>
              )}
            </p>
          )}
        </div>
      </div>

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
