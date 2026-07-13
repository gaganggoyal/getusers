"use client";

import { useState } from "react";
import { useApi, Msg } from "./useApi";
import {
  TASK_TYPE_GROUPS,
  TASK_TYPES,
  VERIFICATION_LABELS,
  type TaskTypeKey,
  type VerificationKey,
} from "@/lib/taskTypes";

export type GiveawayShape = {
  id: string;
  title: string;
  description: string;
  prize: string;
  imageUrl: string | null;
  endsAt: string; // ISO
  signupGoal: number | null;
  status: string;
};

export type OfferShape = {
  id: string;
  type: string;
  title: string;
  description: string;
  targetUrl: string;
  entries: number;
  verification: VerificationKey;
  timerSeconds: number;
  status: string;
  active: boolean;
};

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

// ── Giveaway create / edit ──────────────────────────────────────────────────

function GiveawayFields({ g }: { g?: GiveawayShape }) {
  return (
    <>
      <input
        name="title"
        placeholder="Giveaway title (e.g. Win a PS5)"
        defaultValue={g?.title}
        required
        className="field"
      />
      <input
        name="prize"
        placeholder="Prize (e.g. Sony PlayStation 5)"
        defaultValue={g?.prize}
        required
        className="field"
      />
      <textarea
        name="description"
        placeholder="Describe the giveaway and any rules"
        rows={3}
        defaultValue={g?.description}
        className="field"
      />
      <input
        name="imageUrl"
        placeholder="Prize image URL (optional)"
        defaultValue={g?.imageUrl ?? ""}
        className="field"
      />
      <div className="grid grid-cols-2 gap-3">
        <label className="label">
          Ends at (deadline)
          <input
            name="endsAt"
            type="datetime-local"
            defaultValue={g ? toDatetimeLocal(g.endsAt) : undefined}
            required
            className="field mt-1"
          />
        </label>
        <label className="label">
          Sign-up goal (optional)
          <input
            name="signupGoal"
            type="number"
            min={1}
            placeholder="e.g. 500"
            defaultValue={g?.signupGoal ?? undefined}
            className="field mt-1"
          />
        </label>
      </div>
      <p className="text-xs text-slate-500">
        With a goal set, entries close as soon as you hit that many sign-ups (or
        the deadline) — so your prize isn&apos;t drawn before you reach your
        target.
      </p>
    </>
  );
}

export function CreateGiveawayForm() {
  const { call, busy, msg } = useApi();
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = await call(
          "/api/advertiser/giveaways",
          Object.fromEntries(new FormData(form))
        );
        if (data) form.reset();
      }}
    >
      <GiveawayFields />
      <button disabled={busy} className="btn">
        Submit giveaway for review
      </button>
      <Msg msg={msg} />
      <p className="text-xs text-slate-500">
        We review new giveaways before they go live — usually within a day.
      </p>
    </form>
  );
}

export function GiveawayManage({ giveaway }: { giveaway: GiveawayShape }) {
  const { call, busy, msg } = useApi();
  const [editing, setEditing] = useState(false);
  const editable = ["DRAFT", "PENDING", "REJECTED"].includes(giveaway.status);
  const deletable = giveaway.status !== "ACTIVE";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {editable && (
          <button className="btn-ghost" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Edit"}
          </button>
        )}
        {deletable && (
          <button
            disabled={busy}
            onClick={() => {
              if (confirm(`Delete “${giveaway.title}” and all its offers?`)) {
                call(`/api/advertiser/giveaways/${giveaway.id}`, undefined, "DELETE");
              }
            }}
            className="btn-ghost text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </div>
      {editing && (
        <form
          className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const data = await call(
              `/api/advertiser/giveaways/${giveaway.id}`,
              Object.fromEntries(new FormData(e.currentTarget)),
              "PATCH"
            );
            if (data) setEditing(false);
          }}
        >
          <GiveawayFields g={giveaway} />
          <button disabled={busy} className="btn btn-sm">
            Save changes
          </button>
        </form>
      )}
      <Msg msg={msg} />
    </div>
  );
}

// ── Offer create / edit ─────────────────────────────────────────────────────

function OfferFields({ offer }: { offer?: OfferShape }) {
  const [type, setType] = useState<TaskTypeKey>(
    (offer?.type as TaskTypeKey) ?? "PARTNER_SIGNUP"
  );
  const [verification, setVerification] = useState<VerificationKey>(
    offer?.verification ?? TASK_TYPES[type].suggested
  );
  const meta = TASK_TYPES[type];

  return (
    <>
      <input
        name="title"
        placeholder="Offer title (e.g. Sign up on Acme)"
        defaultValue={offer?.title}
        required
        className="field"
      />
      <input
        name="description"
        placeholder="Short instructions for the user"
        defaultValue={offer?.description}
        className="field"
      />
      <div className="grid grid-cols-2 gap-3">
        <select
          name="type"
          value={type}
          onChange={(e) => {
            const t = e.target.value as TaskTypeKey;
            setType(t);
            setVerification(TASK_TYPES[t].suggested);
          }}
          className="field"
        >
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
        <select
          name="verification"
          value={verification}
          onChange={(e) => setVerification(e.target.value as VerificationKey)}
          className="field"
        >
          {(Object.keys(VERIFICATION_LABELS) as VerificationKey[]).map((v) => (
            <option key={v} value={v}>
              {VERIFICATION_LABELS[v]}
            </option>
          ))}
        </select>
      </div>
      <input
        name="targetUrl"
        placeholder={meta.urlHint}
        defaultValue={offer?.targetUrl}
        required
        className="field"
      />
      <div className="grid grid-cols-2 gap-3">
        <label className="label">
          Entries awarded
          <input
            name="entries"
            type="number"
            min={1}
            max={50}
            defaultValue={offer?.entries ?? 1}
            className="field mt-1"
          />
        </label>
        <label className="label">
          Timer seconds (timer only)
          <input
            name="timerSeconds"
            type="number"
            min={5}
            max={600}
            defaultValue={offer?.timerSeconds ?? 30}
            className="field mt-1"
          />
        </label>
      </div>
      {verification === "POSTBACK" && (
        <p className="text-xs text-slate-500">
          Use <code className="text-violet-700">{"{click_id}"}</code> in your URL
          — we replace it, and credit the entry when your server posts back.
        </p>
      )}
    </>
  );
}

export function CreateOfferForm({
  giveaways,
}: {
  giveaways: { id: string; title: string }[];
}) {
  const { call, busy, msg } = useApi();

  if (giveaways.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Create a giveaway first, then add offers to it.
      </p>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = await call(
          "/api/advertiser/tasks",
          Object.fromEntries(new FormData(form))
        );
        if (data) form.reset();
      }}
    >
      <select name="giveawayId" required className="field">
        <option value="">— Add to which giveaway? —</option>
        {giveaways.map((g) => (
          <option key={g.id} value={g.id}>
            {g.title}
          </option>
        ))}
      </select>
      <OfferFields />
      <button disabled={busy} className="btn">
        Submit offer for review
      </button>
      <Msg msg={msg} />
    </form>
  );
}

export function OfferManage({ offer }: { offer: OfferShape }) {
  const { call, busy, msg } = useApi();
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {offer.status === "APPROVED" && (
          <button
            disabled={busy}
            onClick={() =>
              call(`/api/advertiser/tasks/${offer.id}`, { active: !offer.active }, "PATCH")
            }
            className="btn-ghost"
          >
            {offer.active ? "Pause" : "Resume"}
          </button>
        )}
        <button className="btn-ghost" onClick={() => setEditing((v) => !v)}>
          {editing ? "Cancel" : "Edit"}
        </button>
        <button
          disabled={busy}
          onClick={() => {
            if (confirm(`Delete offer “${offer.title}”?`)) {
              call(`/api/advertiser/tasks/${offer.id}`, undefined, "DELETE");
            }
          }}
          className="btn-ghost text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
      {editing && (
        <form
          className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const data = await call(
              `/api/advertiser/tasks/${offer.id}`,
              Object.fromEntries(new FormData(e.currentTarget)),
              "PATCH"
            );
            if (data) setEditing(false);
          }}
        >
          <OfferFields offer={offer} />
          <p className="text-xs text-amber-600">
            Editing sends this offer back for review.
          </p>
          <button disabled={busy} className="btn btn-sm">
            Save changes
          </button>
        </form>
      )}
      <Msg msg={msg} />
    </div>
  );
}
