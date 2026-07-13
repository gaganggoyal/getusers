"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const input =
  "w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none";
const btn =
  "rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white";

function useApi() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function call(url: string, body?: unknown, method: string = "POST") {
    setBusy(true);
    setMsg(null);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data?.error ?? "Request failed." });
      return null;
    }
    router.refresh();
    return data;
  }
  return { call, busy, msg, setMsg };
}

function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>
      {msg.text}
    </p>
  );
}

export function ReviewButtons({ completionId }: { completionId: string }) {
  const { call, busy } = useApi();
  return (
    <div className="flex gap-2">
      <button
        disabled={busy}
        onClick={() => call(`/api/admin/completions/${completionId}`, { action: "approve" })}
        className="rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-white"
      >
        Approve
      </button>
      <button
        disabled={busy}
        onClick={() => call(`/api/admin/completions/${completionId}`, { action: "reject" })}
        className="rounded-md bg-red-600 hover:bg-red-500 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-white"
      >
        Reject
      </button>
    </div>
  );
}

export function DrawWinnerButton({ giveawayId }: { giveawayId: string }) {
  const { call, busy, msg, setMsg } = useApi();
  return (
    <div className="flex items-center gap-3">
      <button
        disabled={busy}
        onClick={async () => {
          const data = await call(`/api/admin/giveaways/${giveawayId}/draw`);
          if (data?.winner) {
            setMsg({ ok: true, text: `Winner: ${data.winner.name} (${data.winner.email})` });
          }
        }}
        className="rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-white"
      >
        🎲 Draw winner
      </button>
      <Msg msg={msg} />
    </div>
  );
}

export function DeleteGiveawayButton({
  giveawayId,
  title,
}: {
  giveawayId: string;
  title: string;
}) {
  const { call, busy } = useApi();
  return (
    <button
      disabled={busy}
      onClick={() => {
        if (
          confirm(
            `Delete “${title}” and all its tasks, clicks and entries?\n\nThis cannot be undone.`
          )
        ) {
          call(`/api/admin/giveaways/${giveawayId}`, undefined, "DELETE");
        }
      }}
      className="rounded-md border border-red-700 text-red-300 hover:bg-red-600/20 disabled:opacity-50 px-3 py-1.5 text-xs font-medium"
    >
      Delete
    </button>
  );
}

export function CreateGiveawayForm() {
  const { call, busy, msg } = useApi();
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const data = await call("/api/admin/giveaways", Object.fromEntries(f));
        if (data) (e.target as HTMLFormElement).reset?.();
      }}
    >
      <input name="title" placeholder="Title (e.g. iPhone 17 Giveaway)" required className={input} />
      <input name="prize" placeholder="Prize (e.g. iPhone 17 Pro 256GB)" required className={input} />
      <textarea name="description" placeholder="Description / rules" rows={3} className={input} />
      <label className="block text-xs text-slate-400">
        Ends at
        <input name="endsAt" type="datetime-local" required className={`${input} mt-1`} />
      </label>
      <button disabled={busy} className={btn}>Create giveaway</button>
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
        const f = new FormData(e.currentTarget);
        const data = await call("/api/admin/tasks", Object.fromEntries(f));
        if (data) (e.target as HTMLFormElement).reset?.();
      }}
    >
      <select name="giveawayId" required className={input}>
        <option value="">— Giveaway —</option>
        {giveaways.map((g) => (
          <option key={g.id} value={g.id}>{g.title}</option>
        ))}
      </select>
      <input name="title" placeholder="Task title (e.g. Sign up on Acme)" required className={input} />
      <input name="description" placeholder="Short instructions for the user" className={input} />
      <input
        name="targetUrl"
        placeholder="Target URL — use {click_id} placeholder or we append ?click_id="
        required
        className={input}
      />
      <div className="grid grid-cols-2 gap-3">
        <select name="type" required className={input}>
          <option value="PARTNER_SIGNUP">Partner signup</option>
          <option value="APP_INSTALL">App install</option>
          <option value="NEWSLETTER_SIGNUP">Newsletter signup</option>
          <option value="YOUTUBE_SUBSCRIBE">YouTube subscribe</option>
          <option value="YOUTUBE_LIKE">YouTube like</option>
          <option value="INSTAGRAM_FOLLOW">Instagram follow</option>
          <option value="X_FOLLOW">X follow</option>
          <option value="CUSTOM">Custom</option>
        </select>
        <select name="verification" required className={input}>
          <option value="POSTBACK">Postback (S2S, best quality)</option>
          <option value="MANUAL">Manual review (proof)</option>
          <option value="TIMER">Timer (auto-credit)</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <input name="entries" type="number" min={1} defaultValue={1} title="Entries" className={input} />
        <input name="timerSeconds" type="number" min={5} defaultValue={30} title="Timer seconds" className={input} />
        <input name="advertiserEmail" placeholder="Advertiser email" className={input} />
      </div>
      <button disabled={busy} className={btn}>Add task</button>
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
        const f = new FormData(e.currentTarget);
        const data = await call("/api/admin/advertisers", Object.fromEntries(f));
        if (data?.postbackKey) {
          setMsg({ ok: true, text: `Advertiser enabled. Postback key: ${data.postbackKey}` });
        }
      }}
    >
      <input name="email" type="email" placeholder="Registered user's email" required className={`${input} max-w-xs`} />
      <button disabled={busy} className={btn}>Make advertiser</button>
      <div className="w-full"><Msg msg={msg} /></div>
    </form>
  );
}
