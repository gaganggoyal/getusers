"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Shared fetch helper for the admin/advertiser action components. */
export function useApi() {
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

export function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <p className={`text-sm ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>
      {msg.text}
    </p>
  );
}
