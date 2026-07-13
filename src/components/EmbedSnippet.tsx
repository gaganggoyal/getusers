"use client";

import { useState } from "react";

export default function EmbedSnippet({
  siteUrl,
  giveawayId,
  title,
}: {
  siteUrl: string;
  giveawayId: string;
  title: string;
}) {
  const scriptSnippet = `<script async src="${siteUrl}/embed.js" data-giveaway="${giveawayId}"></script>`;
  const iframeSnippet = `<iframe src="${siteUrl}/embed/${giveawayId}" width="440" height="360" style="border:0;max-width:100%" title="GetUsers giveaway" loading="lazy"></iframe>`;

  const [copied, setCopied] = useState<"script" | "iframe" | null>(null);

  async function copy(text: string, which: "script" | "iframe") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied((c) => (c === which ? null : c)), 1800);
    } catch {
      /* clipboard unavailable — user can select manually */
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-sm font-medium text-white">{title}</p>

      <p className="mt-3 text-xs text-slate-500">
        Paste this one line where you want the giveaway to appear:
      </p>
      <div className="mt-1 flex items-stretch gap-2">
        <pre className="flex-1 overflow-x-auto rounded-md bg-slate-950 border border-slate-800 p-3 text-xs text-emerald-300">
          {scriptSnippet}
        </pre>
        <button
          onClick={() => copy(scriptSnippet, "script")}
          className="shrink-0 rounded-md border border-slate-700 hover:border-indigo-500 px-3 text-xs text-slate-200"
        >
          {copied === "script" ? "Copied ✓" : "Copy"}
        </button>
      </div>

      <details className="mt-3 group">
        <summary className="cursor-pointer list-none text-xs text-slate-500 hover:text-slate-300">
          No-JavaScript version (plain iframe)
        </summary>
        <div className="mt-2 flex items-stretch gap-2">
          <pre className="flex-1 overflow-x-auto rounded-md bg-slate-950 border border-slate-800 p-3 text-xs text-slate-300">
            {iframeSnippet}
          </pre>
          <button
            onClick={() => copy(iframeSnippet, "iframe")}
            className="shrink-0 rounded-md border border-slate-700 hover:border-indigo-500 px-3 text-xs text-slate-200"
          >
            {copied === "iframe" ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </details>
    </div>
  );
}
