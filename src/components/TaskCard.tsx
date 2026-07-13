"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type TaskView = {
  id: string;
  type: string;
  title: string;
  description: string;
  entries: number;
  verification: "POSTBACK" | "MANUAL" | "TIMER";
  timerSeconds: number;
  completionStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  loggedIn: boolean;
};

const TYPE_LABEL: Record<string, string> = {
  PARTNER_SIGNUP: "🤝 Partner signup",
  APP_INSTALL: "📱 App install",
  YOUTUBE_SUBSCRIBE: "▶️ YouTube subscribe",
  YOUTUBE_LIKE: "👍 YouTube like",
  INSTAGRAM_FOLLOW: "📸 Instagram follow",
  X_FOLLOW: "🐦 X follow",
  NEWSLETTER_SIGNUP: "✉️ Newsletter",
  CUSTOM: "⭐ Task",
};

export default function TaskCard({ task }: { task: TaskView }) {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(task.timerSeconds);
  const [proof, setProof] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!started || task.verification !== "TIMER" || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [started, secondsLeft, task.verification]);

  async function claim() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/tasks/${task.id}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proof }),
    });
    setBusy(false);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  const status = task.completionStatus;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs text-slate-500">{TYPE_LABEL[task.type] ?? task.type}</span>
          <h3 className="font-medium text-white">{task.title}</h3>
          <p className="text-sm text-slate-400 mt-1">{task.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-indigo-600/20 text-indigo-300 text-xs font-semibold px-3 py-1">
          +{task.entries} {task.entries === 1 ? "entry" : "entries"}
        </span>
      </div>

      <div className="mt-4">
        {status === "APPROVED" ? (
          <p className="text-sm font-medium text-emerald-400">✓ Completed — entries credited</p>
        ) : status === "PENDING" ? (
          <p className="text-sm font-medium text-amber-400">⏳ Submitted — under review</p>
        ) : !task.loggedIn ? (
          <a href="/login" className="text-sm text-indigo-400 hover:underline">
            Log in to complete this task
          </a>
        ) : (
          <div className="space-y-3">
            {status === "REJECTED" && (
              <p className="text-sm text-red-400">✗ Rejected — you can try again</p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={`/go/${task.id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setStarted(true)}
                className="rounded-md bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white"
              >
                {started ? "Open again" : "Start task ↗"}
              </a>

              {started && task.verification === "TIMER" && (
                <button
                  onClick={claim}
                  disabled={busy || secondsLeft > 0}
                  className="rounded-md border border-slate-700 px-4 py-2 text-sm text-white disabled:opacity-50 hover:border-indigo-500"
                >
                  {secondsLeft > 0 ? `Claim in ${secondsLeft}s…` : "Claim entries"}
                </button>
              )}
            </div>

            {started && task.verification === "POSTBACK" && (
              <p className="text-xs text-slate-500">
                Complete the signup on the partner site — your entries are
                credited automatically once the partner confirms (usually within
                minutes).
              </p>
            )}

            {started && task.verification === "MANUAL" && (
              <div className="flex gap-2">
                <input
                  value={proof}
                  onChange={(e) => setProof(e.target.value)}
                  placeholder="Proof: your username or profile link"
                  className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  onClick={claim}
                  disabled={busy || !proof.trim()}
                  className="rounded-md border border-slate-700 px-4 py-2 text-sm text-white disabled:opacity-50 hover:border-indigo-500"
                >
                  Submit
                </button>
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
