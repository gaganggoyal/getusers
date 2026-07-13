import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Public, self-contained giveaway widget rendered inside an <iframe> on an
 * advertiser's own site. No app chrome, no global CSS — everything is inlined
 * so it renders identically on any host page. `frame-ancestors *` lets it be
 * embedded anywhere; every other route stays frame-protected (see next.config).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Behind a reverse proxy, req.url reflects the internal bind address, so
  // anchor public links to the canonical site URL when configured.
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    new URL(_req.url).origin;

  const giveaway = await db.giveaway.findUnique({
    where: { id },
    include: {
      tasks: { where: { active: true }, select: { id: true, entries: true } },
      winner: { select: { name: true } },
    },
  });

  if (!giveaway) {
    return html(unavailableCard(origin, id), 404);
  }

  const taskIds = giveaway.tasks.map((t) => t.id);
  const approved = taskIds.length
    ? await db.completion.findMany({
        where: { taskId: { in: taskIds }, status: "APPROVED" },
        include: { task: { select: { entries: true } } },
      })
    : [];
  const totalEntries = approved.reduce((s, c) => s + c.task.entries, 0);
  const maxEntries = giveaway.tasks.reduce((s, t) => s + t.entries, 0);

  return html(
    giveawayCard(origin, id, {
      title: giveaway.title,
      prize: giveaway.prize,
      description: giveaway.description,
      status: giveaway.status,
      endsAt: giveaway.endsAt,
      taskCount: giveaway.tasks.length,
      totalEntries,
      maxEntries,
      winner: giveaway.winner?.name ?? null,
    })
  );
}

// ── HTML helpers ────────────────────────────────────────────────────────────

function html(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Allow this widget — and only this widget — to be framed anywhere.
      "content-security-policy": "frame-ancestors *",
      "cache-control": "public, max-age=30, stale-while-revalidate=300",
    },
  });
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type CardData = {
  title: string;
  prize: string;
  description: string;
  status: "DRAFT" | "ACTIVE" | "ENDED";
  endsAt: Date;
  taskCount: number;
  totalEntries: number;
  maxEntries: number;
  winner: string | null;
};

function shell(inner: string, extraScript = "") {
  // A tiny script reports the content height to the parent so embed.js can
  // resize the iframe, and runs an optional per-card script (e.g. countdown).
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:transparent}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
  #gu{max-width:420px;margin:0 auto;border:1px solid #1e293b;border-radius:16px;
      background:linear-gradient(160deg,#131a2e,#0b0f1a);color:#e5e9f0;padding:20px;
      box-shadow:0 10px 30px rgba(0,0,0,.25)}
  .gu-badge{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#818cf8}
  .gu-prize{margin-top:8px;font-size:20px;font-weight:700;line-height:1.25;color:#fff}
  .gu-prize .gu-emoji{margin-right:6px}
  .gu-title{margin-top:4px;font-size:13px;color:#94a3b8}
  .gu-desc{margin-top:12px;font-size:13px;line-height:1.5;color:#cbd5e1;
      display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .gu-meta{margin-top:16px;display:flex;gap:8px;flex-wrap:wrap}
  .gu-chip{flex:1 1 auto;min-width:96px;border:1px solid #1e293b;border-radius:10px;
      background:rgba(2,6,23,.5);padding:8px 10px}
  .gu-chip .k{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#64748b}
  .gu-chip .v{margin-top:2px;font-size:15px;font-weight:700;color:#fff}
  .gu-cta{display:block;margin-top:16px;text-align:center;text-decoration:none;
      background:#4f46e5;color:#fff;font-weight:600;font-size:15px;padding:12px 16px;border-radius:10px}
  .gu-cta:hover{background:#6366f1}
  .gu-ended{margin-top:14px;border:1px solid rgba(245,158,11,.3);background:rgba(245,158,11,.08);
      color:#fcd34d;border-radius:10px;padding:10px 12px;font-size:13px}
  .gu-foot{margin-top:14px;text-align:center;font-size:11px;color:#64748b}
  .gu-foot a{color:#818cf8;text-decoration:none}
  .gu-foot a:hover{text-decoration:underline}
</style>
</head>
<body>
${inner}
<script>
(function(){
  function report(){
    var el=document.getElementById('gu');
    if(!el)return;
    var h=Math.ceil(el.getBoundingClientRect().height)+2;
    try{parent.postMessage({type:'getusers:embed',event:'size',id:el.dataset.gid,height:h},'*');}catch(e){}
  }
  window.report=report;
  window.addEventListener('load',report);
  window.addEventListener('resize',report);
  if(document.readyState==='complete')report();
  ${extraScript}
})();
</script>
</body>
</html>`;
}

function giveawayCard(origin: string, id: string, d: CardData) {
  const ended = d.status === "ENDED";
  const gaUrl = `${origin}/giveaways/${encodeURIComponent(id)}`;
  const endsLabel = d.endsAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const cta = ended
    ? `<div class="gu-ended">🏁 This giveaway has ended.${
        d.winner ? ` Winner: <strong>${esc(d.winner)}</strong> 🎉` : ""
      }</div>`
    : `<a class="gu-cta" href="${gaUrl}" target="_blank" rel="noopener noreferrer">Enter to win →</a>`;

  const inner = `
  <div id="gu" data-gid="${esc(id)}">
    <div class="gu-badge">🎁 GetUsers Giveaway</div>
    <div class="gu-prize"><span class="gu-emoji">🏆</span>${esc(d.prize)}</div>
    <div class="gu-title">${esc(d.title)}</div>
    <div class="gu-desc">${esc(d.description)}</div>
    <div class="gu-meta">
      <div class="gu-chip"><div class="k">Entries</div><div class="v">${d.totalEntries.toLocaleString()}</div></div>
      <div class="gu-chip"><div class="k">${
        ended ? "Ended" : "Ends in"
      }</div><div class="v" id="gu-countdown">${endsLabel}</div></div>
      <div class="gu-chip"><div class="k">Up to</div><div class="v">${d.maxEntries} 🎟</div></div>
    </div>
    ${cta}
    <div class="gu-foot">Powered by <a href="${origin}" target="_blank" rel="noopener noreferrer">GetUsers</a></div>
  </div>`;

  // Live countdown for active giveaways, degrades to the date on completion.
  const countdown = ended
    ? ""
    : `
  (function(){
    var end=${JSON.stringify(d.endsAt.toISOString())};
    var node=document.getElementById('gu-countdown');
    function tick(){
      var diff=new Date(end).getTime()-Date.now();
      if(diff<=0){node.textContent='Ended';return;}
      var day=86400000,hr=3600000,min=60000;
      var dd=Math.floor(diff/day),hh=Math.floor((diff%day)/hr),mm=Math.floor((diff%hr)/min);
      node.textContent=dd>0?dd+'d '+hh+'h':(hh>0?hh+'h '+mm+'m':mm+'m');
      report();
    }
    tick();setInterval(tick,60000);
  })();`;

  return shell(inner, countdown);
}

function unavailableCard(origin: string, id: string) {
  const inner = `
  <div id="gu" data-gid="${esc(id)}">
    <div class="gu-badge">🎁 GetUsers Giveaway</div>
    <div class="gu-prize"><span class="gu-emoji">🔒</span>Giveaway unavailable</div>
    <div class="gu-title">This giveaway doesn't exist or is no longer available.</div>
    <a class="gu-cta" href="${origin}" target="_blank" rel="noopener noreferrer">Browse live giveaways →</a>
    <div class="gu-foot">Powered by <a href="${origin}" target="_blank" rel="noopener noreferrer">GetUsers</a></div>
  </div>`;
  return shell(inner);
}
