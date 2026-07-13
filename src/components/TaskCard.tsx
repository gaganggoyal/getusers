"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { taskLabel, taskCta } from "@/lib/taskTypes";

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
    <div className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs text-slate-500">{taskLabel(task.type)}</span>
          <h3 className="font-medium text-slate-900">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-slate-600 mt-1">{task.description}</p>
          )}
        </div>
        <span className="pill shrink-0 bg-violet-100 text-violet-700">
          +{task.entries} {task.entries === 1 ? "entry" : "entries"}
        </span>
      </div>

      <div className="mt-4">
        {status === "APPROVED" ? (
          <p className="text-sm font-medium text-emerald-600">
            ✓ Completed — entries credited
          </p>
        ) : status === "PENDING" ? (
          <p className="text-sm font-medium text-amber-600">
            ⏳ Submitted — under review
          </p>
        ) : !task.loggedIn ? (
          <a href="/login" className="text-sm text-violet-600 hover:underline">
            Log in to complete this task
          </a>
        ) : (
          <div className="space-y-3">
            {status === "REJECTED" && (
              <p className="text-sm text-red-600">✗ Rejected — you can try again</p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={`/go/${task.id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setStarted(true)}
                className="btn btn-sm"
              >
                {started ? "Open again" : `${taskCta(task.type)} ↗`}
              </a>

              {started && task.verification === "TIMER" && (
                <button
                  onClick={claim}
                  disabled={busy || secondsLeft > 0}
                  className="btn-outline btn-sm"
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
                  className="field flex-1"
                />
                <button
                  onClick={claim}
                  disabled={busy || !proof.trim()}
                  className="btn-outline btn-sm"
                >
                  Submit
                </button>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
