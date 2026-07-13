import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import TaskCard, { type TaskView } from "@/components/TaskCard";

export const dynamic = "force-dynamic";

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
      tasks: { where: { active: true }, orderBy: { createdAt: "asc" } },
      winner: true,
    },
  });
  if (!giveaway) notFound();

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
      <div className="rounded-xl border border-slate-800 bg-linear-to-br from-indigo-950/60 to-slate-900/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{giveaway.title}</h1>
            <p className="mt-1 text-indigo-400 font-medium">🏆 {giveaway.prize}</p>
            <p className="mt-3 text-sm text-slate-400 max-w-2xl">
              {giveaway.description}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="text-slate-400">
              Ends{" "}
              <span className="text-white">
                {giveaway.endsAt.toLocaleDateString()}
              </span>
            </p>
            <p className="mt-1 text-slate-400">
              Total entries: <span className="text-white">{totalEntries}</span>
            </p>
            {user && (
              <p className="mt-1 text-slate-400">
                Your entries:{" "}
                <span className="text-emerald-400 font-semibold">
                  {myEntries}
                </span>{" "}
                / {maxEntries}
              </p>
            )}
          </div>
        </div>
        {giveaway.status === "ENDED" && (
          <p className="mt-4 rounded-md bg-amber-500/10 border border-amber-500/30 px-4 py-2 text-sm text-amber-300">
            This giveaway has ended.
            {giveaway.winner && (
              <> Winner: <strong>{giveaway.winner.name}</strong> 🎉</>
            )}
          </p>
        )}
      </div>

      <h2 className="mt-8 mb-1 text-lg font-semibold text-white">
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
          <p className="text-slate-400 text-sm">No tasks yet.</p>
        )}
      </div>
    </div>
  );
}
