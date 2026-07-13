"use client";

import { useApi, Msg } from "./useApi";
import {
  TASK_TYPE_GROUPS,
  TASK_TYPES,
  VERIFICATION_LABELS,
  type VerificationKey,
} from "@/lib/taskTypes";

// ── Completion review (manual proof queue) ──────────────────────────────────

export function ReviewButtons({ completionId }: { completionId: string }) {
  const { call, busy } = useApi();
  return (
    <div className="flex gap-2">
      <button
        disabled={busy}
        onClick={() => call(`/api/admin/completions/${completionId}`, { action: "approve" })}
        className="btn btn-sm bg-emerald-600 hover:bg-emerald-700"
      >
        Approve
      </button>
      <button
        disabled={busy}
        onClick={() => call(`/api/admin/completions/${completionId}`, { action: "reject" })}
        className="btn btn-sm bg-red-600 hover:bg-red-700"
      >
        Reject
      </button>
    </div>
  );
}

// ── Approve / reject queue (giveaways + tasks share this) ───────────────────

export function ModerationButtons({ url }: { url: string }) {
  const { call, busy } = useApi();
  return (
    <div className="flex gap-2">
      <button
        disabled={busy}
        onClick={() => call(url, { action: "approve" }, "PATCH")}
        className="btn btn-sm bg-emerald-600 hover:bg-emerald-700"
      >
        Approve
      </button>
      <button
        disabled={busy}
        onClick={() => {
          const note = prompt("Reason for rejection (shown to the advertiser):");
          if (note === null) return;
          call(url, { action: "reject", note }, "PATCH");
        }}
        className="btn-outline btn-sm border-red-300 text-red-600 hover:bg-red-50"
      >
        Reject
      </button>
    </div>
  );
}

// ── Full giveaway lifecycle controls ────────────────────────────────────────

export function GiveawayControls({
  giveaway,
}: {
  giveaway: { id: string; title: string; status: string };
}) {
  const { call, busy, msg, setMsg } = useApi();
  const url = `/api/admin/giveaways/${giveaway.id}`;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {(giveaway.status === "PENDING" ||
          giveaway.status === "DRAFT" ||
          giveaway.status === "REJECTED") && (
          <button
            disabled={busy}
            onClick={() => call(url, { action: "approve" }, "PATCH")}
            className="btn btn-sm bg-emerald-600 hover:bg-emerald-700"
          >
            Approve → live
          </button>
        )}
        {giveaway.status === "PENDING" && (
          <button
            disabled={busy}
            onClick={() => {
              const note = prompt("Reason for rejection (shown to the advertiser):");
              if (note === null) return;
              call(url, { action: "reject", note }, "PATCH");
            }}
            className="btn-outline btn-sm border-red-300 text-red-600 hover:bg-red-50"
          >
            Reject
          </button>
        )}
        {giveaway.status === "ACTIVE" && (
          <>
            <button
              disabled={busy}
              onClick={async () => {
                const data = await call(`${url}/draw`);
                if (data?.winner) {
                  setMsg({
                    ok: true,
                    text: `Winner: ${data.winner.name} (${data.winner.email})`,
                  });
                }
              }}
              className="btn btn-sm bg-amber-500 hover:bg-amber-600"
            >
              🎲 Draw winner
            </button>
            <button
              disabled={busy}
              onClick={() => call(url, { action: "pause" }, "PATCH")}
              className="btn-outline btn-sm"
            >
              Pause
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (confirm("End this giveaway now without drawing a winner?")) {
                  call(url, { action: "end" }, "PATCH");
                }
              }}
              className="btn-outline btn-sm"
            >
              End
            </button>
          </>
        )}
        {giveaway.status === "PAUSED" && (
          <button
            disabled={busy}
            onClick={() => call(url, { action: "resume" }, "PATCH")}
            className="btn btn-sm bg-emerald-600 hover:bg-emerald-700"
          >
            Resume
          </button>
        )}
        <button
          disabled={busy}
          onClick={() => {
            if (
              confirm(
                `Delete “${giveaway.title}” and all its tasks, clicks and entries?\n\nThis cannot be undone.`
              )
            ) {
              call(url, undefined, "DELETE");
            }
          }}
          className="btn-ghost text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
      <Msg msg={msg} />
    </div>
  );
}

// ── Task controls (moderation + pause) ──────────────────────────────────────

export function TaskControls({
  task,
}: {
  task: { id: string; status: string; active: boolean };
}) {
  const { call, busy } = useApi();
  const url = `/api/admin/tasks/${task.id}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {task.status === "PENDING" && <ModerationButtons url={url} />}
      {task.status === "APPROVED" && (
        <button
          disabled={busy}
          onClick={() => call(url, { active: !task.active }, "PATCH")}
          className="btn-ghost"
        >
          {task.active ? "Pause" : "Resume"}
        </button>
      )}
      <button
        disabled={busy}
        onClick={() => {
          if (confirm("Delete this task and its clicks/entries?")) {
            call(url, undefined, "DELETE");
          }
        }}
        className="btn-ghost text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  );
}

// ── Create forms ────────────────────────────────────────────────────────────

export function CreateGiveawayForm() {
  const { call, busy, msg } = useApi();
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = await call(
          "/api/admin/giveaways",
          Object.fromEntries(new FormData(form))
        );
        if (data) form.reset();
      }}
    >
      <input name="title" placeholder="Title (e.g. iPhone 17 Giveaway)" required className="field" />
      <input name="prize" placeholder="Prize (e.g. iPhone 17 Pro 256GB)" required className="field" />
      <textarea name="description" placeholder="Description / rules" rows={3} className="field" />
      <input name="imageUrl" placeholder="Prize image URL (optional)" className="field" />
      <div className="grid grid-cols-2 gap-3">
        <label className="label">
          Ends at (deadline)
          <input name="endsAt" type="datetime-local" required className="field mt-1" />
        </label>
        <label className="label">
          Sign-up goal (optional)
          <input name="signupGoal" type="number" min={1} placeholder="e.g. 500" className="field mt-1" />
        </label>
      </div>
      <button disabled={busy} className="btn">Create giveaway</button>
      <Msg msg={msg} />
    </form>
  );
}

export function CreateTaskForm({
  giveaways,
}: {
  giveaways: { id: string; title: string }[];
}) {
  const { call, busy, msg } = useApi();
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = await call(
          "/api/admin/tasks",
          Object.fromEntries(new FormData(form))
        );
        if (data) form.reset();
      }}
    >
      <select name="giveawayId" required className="field">
        <option value="">— Giveaway —</option>
        {giveaways.map((g) => (
          <option key={g.id} value={g.id}>{g.title}</option>
        ))}
      </select>
      <input name="title" placeholder="Task title (e.g. Sign up on Acme)" required className="field" />
      <input name="description" placeholder="Short instructions for the user" className="field" />
      <input
        name="targetUrl"
        placeholder="Target URL — use {click_id} placeholder or we append ?click_id="
        required
        className="field"
      />
      <div className="grid grid-cols-2 gap-3">
        <select name="type" required className="field" defaultValue="PARTNER_SIGNUP">
          {TASK_TYPE_GROUPS.map((grp) => (
            <optgroup key={grp.group} label={grp.group}>
              {grp.keys.map((k) => (
                <option key={k} value={k}>
                  {TASK_TYPES[k].emoji} {TASK_TYPES[k].label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select name="verification" required className="field" defaultValue="POSTBACK">
          {(Object.keys(VERIFICATION_LABELS) as VerificationKey[]).map((v) => (
            <option key={v} value={v}>{VERIFICATION_LABELS[v]}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <input name="entries" type="number" min={1} defaultValue={1} title="Entries" className="field" />
        <input name="timerSeconds" type="number" min={5} defaultValue={30} title="Timer seconds" className="field" />
        <input name="advertiserEmail" placeholder="Advertiser email" className="field" />
      </div>
      <button disabled={busy} className="btn">Add task</button>
      <Msg msg={msg} />
    </form>
  );
}

export function MakeAdvertiserForm() {
  const { call, busy, msg, setMsg } = useApi();
  return (
    <form
      className="flex flex-wrap items-start gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = await call(
          "/api/admin/advertisers",
          Object.fromEntries(new FormData(form))
        );
        if (data?.postbackKey) {
          setMsg({ ok: true, text: `Advertiser enabled. Postback key: ${data.postbackKey}` });
        }
      }}
    >
      <input name="email" type="email" placeholder="Registered user's email" required className="field max-w-xs" />
      <button disabled={busy} className="btn">Make advertiser</button>
      <div className="w-full"><Msg msg={msg} /></div>
    </form>
  );
}
