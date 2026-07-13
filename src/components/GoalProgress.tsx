/** Progress bar toward a giveaway's sign-up goal. */
export default function GoalProgress({
  current,
  goal,
  tone = "light",
  className = "",
}: {
  current: number;
  goal: number;
  /** "light" for white cards, "onColor" for the colored hero */
  tone?: "light" | "onColor";
  className?: string;
}) {
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
  const reached = current >= goal;

  const track = tone === "onColor" ? "bg-white/25" : "bg-slate-200";
  const labelColor = tone === "onColor" ? "text-white/90" : "text-slate-600";
  const bar = reached ? "bg-emerald-400" : tone === "onColor" ? "bg-white" : "bg-emerald-500";

  return (
    <div className={className}>
      <div className={`flex items-center justify-between text-xs font-medium ${labelColor}`}>
        <span>
          {reached ? "🎯 " : ""}
          {current.toLocaleString()} / {goal.toLocaleString()} sign-ups
        </span>
        <span>{pct}%</span>
      </div>
      <div className={`mt-1 h-2 w-full overflow-hidden rounded-full ${track}`}>
        <div
          className={`h-full rounded-full ${bar} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
