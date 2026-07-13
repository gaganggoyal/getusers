import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import PrizeImage from "@/components/PrizeImage";
import GoalProgress from "@/components/GoalProgress";
import { approvedSignupsByGiveaway, isOpenForEntries } from "@/lib/giveaway";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [user, activeGiveaways] = await Promise.all([
    getSessionUser(),
    db.giveaway.findMany({
      where: { status: "ACTIVE" },
      orderBy: { endsAt: "asc" },
      include: { tasks: { where: { active: true, status: "APPROVED" } } },
    }),
  ]);

  // Only list giveaways still open for entries (before their deadline and under
  // their sign-up goal).
  const signupCounts = await approvedSignupsByGiveaway(activeGiveaways);
  const giveaways = activeGiveaways.filter((g) =>
    isOpenForEntries(g, signupCounts.get(g.id) ?? 0)
  );

  return (
    <div className="space-y-24">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="text-center pt-14 pb-4">
        <p className="eyebrow">The giveaway network that pays for itself</p>
        <h1 className="mt-4 text-4xl sm:text-5xl font-bold text-slate-900 leading-tight">
          Real prizes for users.
          <br />
          <span className="text-violet-600">Verified customers</span> for
          advertisers.
        </h1>
        <p className="mt-5 text-slate-600 max-w-2xl mx-auto text-lg">
          Users win giveaways by completing partner offers. Advertisers pay only
          for conversions their own server confirms. Everyone sees exactly what
          they get.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {!user && (
            <Link href="/register" className="btn px-6 py-3 text-base">
              🎁 Start winning — it&apos;s free
            </Link>
          )}
          <Link
            href={user ? "#giveaways" : "/advertiser/register"}
            className="btn-outline px-6 py-3 text-base"
          >
            {user ? "Browse giveaways" : "📈 I'm an advertiser"}
          </Link>
        </div>
      </section>

      {/* ── For users: how it works ──────────────────────────── */}
      <section>
        <p className="eyebrow text-center">For users</p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 text-center">
          Win real prizes in three steps
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              n: "1",
              t: "Join free",
              d: "Create your account in 30 seconds. No fees, no credit card, no purchase — ever. Prizes are funded by our partner sponsors, not by you.",
            },
            {
              n: "2",
              t: "Complete simple tasks",
              d: "Sign up on a partner site, try a new app, check out an offer. Every task shows exactly how many entries it's worth before you start.",
            },
            {
              n: "3",
              t: "Collect entries & win",
              d: "Each entry is a ticket in the draw. Finish more tasks, hold more tickets, raise your odds. When the countdown hits zero, one ticket wins.",
            },
          ].map((s) => (
            <div key={s.n} className="card p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold">
                {s.n}
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{s.t}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What you can win right now ───────────────────────── */}
      <section id="giveaways">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center">
          What you can win right now
        </h2>
        {giveaways.length === 0 ? (
          <p className="mt-6 text-slate-600 text-center">
            No active giveaways at this moment — new prizes drop regularly, check
            back soon!
          </p>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {giveaways.map((g) => {
              const maxEntries = g.tasks.reduce((s, t) => s + t.entries, 0);
              return (
                <Link
                  key={g.id}
                  href={`/giveaways/${g.id}`}
                  className="card card-hover block overflow-hidden"
                >
                  {g.imageUrl && (
                    <div className="flex h-44 items-center justify-center bg-linear-to-br from-violet-50 to-slate-100">
                      <PrizeImage
                        src={g.imageUrl}
                        alt={g.prize}
                        className="max-h-40 max-w-[80%] object-contain"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {g.title}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-amber-600">
                      🏆 {g.prize}
                    </p>
                    <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                      {g.description}
                    </p>
                    {g.signupGoal != null && (
                      <GoalProgress
                        current={signupCounts.get(g.id) ?? 0}
                        goal={g.signupGoal}
                        className="mt-3"
                      />
                    )}
                    <div className="mt-4 flex justify-between text-xs text-slate-500">
                      <span>
                        {g.tasks.length} task{g.tasks.length === 1 ? "" : "s"} · up
                        to {maxEntries} entries
                      </span>
                      <span>Ends {g.endsAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── How winning works / fairness ─────────────────────── */}
      <section className="rounded-3xl border border-violet-100 bg-linear-to-br from-violet-50 to-white p-8 sm:p-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center">
          How winners are picked —{" "}
          <span className="text-violet-600">and why it&apos;s fair</span>
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              i: "🎟️",
              t: "Every entry is one ticket",
              d: "A 5-entry task puts 5 tickets with your name in the drum. Nothing is hidden — each task shows its entry value up front.",
            },
            {
              i: "🎲",
              t: "Random draw, no favorites",
              d: "When a giveaway ends, one ticket is drawn using cryptographically secure randomness. More tickets means better odds — that's the only advantage anyone can have.",
            },
            {
              i: "👁️",
              t: "See your odds live",
              d: "Every giveaway page shows the total entries and your entries, updated in real time. You always know exactly where you stand.",
            },
            {
              i: "📣",
              t: "Winners announced publicly",
              d: "The winner's name is published right on the giveaway page, and we contact them at their registered email to arrange prize delivery.",
            },
          ].map((c) => (
            <div key={c.t} className="card p-5">
              <span className="text-2xl">{c.i}</span>
              <h3 className="mt-3 font-semibold text-slate-900">{c.t}</h3>
              <p className="mt-2 text-sm text-slate-600">{c.d}</p>
            </div>
          ))}
        </div>
        {!user && (
          <div className="mt-8 text-center">
            <Link href="/register" className="btn px-6 py-3 text-base">
              Create my free account →
            </Link>
          </div>
        )}
      </section>

      {/* ── User FAQ ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center">
          Questions users ask us
        </h2>
        <div className="mt-8 mx-auto max-w-2xl space-y-3">
          {[
            {
              q: "Is it really free? What's the catch?",
              a: "Completely free — you never pay to enter and never need a credit card. Our partner sponsors fund the prizes: when you sign up for their offer, they support the giveaway. That's the whole business model, in the open.",
            },
            {
              q: "When do my entries get credited?",
              a: "Partner signups are credited automatically the moment the partner confirms — usually within minutes. Timer tasks credit instantly when you claim. Social tasks are reviewed by our team, normally within 24–48 hours. Your dashboard shows the live status of every task.",
            },
            {
              q: "How do I know the draw isn't rigged?",
              a: "The draw is a weighted random pick: every entry is one ticket, and a winning ticket is selected with cryptographically secure randomness. Total entries are visible on each giveaway page before the draw, and the winner is announced publicly on that same page.",
            },
            {
              q: "How do I receive my prize if I win?",
              a: "The winner's name appears on the giveaway page, and we email you at your registered address to arrange delivery. Make sure your email is one you actually check!",
            },
            {
              q: "Can I enter with multiple accounts?",
              a: "No — one account per person. Duplicate accounts are detected (we track signup patterns) and disqualified from draws. It keeps the odds honest for everyone.",
            },
            {
              q: "Do I have to complete every task?",
              a: "Not at all. Complete only the tasks you want — each one adds its own entries. More tasks simply mean more tickets in the draw.",
            },
          ].map((f) => (
            <details key={f.q} className="group card p-5">
              <summary className="cursor-pointer list-none font-medium text-slate-900 flex items-center justify-between">
                {f.q}
                <span className="ml-4 text-violet-500 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── For advertisers ──────────────────────────────────── */}
      <section
        id="advertisers"
        className="rounded-3xl border border-violet-100 bg-linear-to-br from-white to-violet-50 p-8 sm:p-12"
      >
        <p className="eyebrow text-center">For advertisers</p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 text-center">
          Pay only for conversions{" "}
          <span className="text-violet-600">you confirm yourself</span>
        </h2>
        <p className="mt-4 text-slate-600 text-center max-w-2xl mx-auto">
          No pixels to trust, no inflated click reports. A conversion counts only
          when <em>your</em> server tells ours it happened.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              i: "🚀",
              t: "Launch in minutes",
              d: "Create your own giveaway and add offers yourself — sign-ups, installs, follows, and more. We review it, then it goes live.",
            },
            {
              i: "🎯",
              t: "True CPA pricing",
              d: "Users are motivated to finish your funnel, and you credit only completed signups, installs or purchases.",
            },
            {
              i: "🛡️",
              t: "Fraud protection built in",
              d: "One completion per user per offer, IP & device capture, duplicate-account flags — and you can reverse any conversion.",
            },
            {
              i: "📊",
              t: "Live dashboard",
              d: "Clicks, confirmed conversions and conversion rate per offer, in real time. Your numbers always match ours.",
            },
          ].map((c) => (
            <div key={c.t} className="card p-5">
              <span className="text-2xl">{c.i}</span>
              <h3 className="mt-3 font-semibold text-slate-900">{c.t}</h3>
              <p className="mt-2 text-sm text-slate-600">{c.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href="/advertiser/register" className="btn px-6 py-3 text-base">
            Create advertiser account →
          </Link>
          <p className="mt-3 text-sm text-slate-500">
            Your tracking key is issued instantly.{" "}
            <Link
              href="/advertiser/login"
              className="text-violet-600 hover:underline"
            >
              Already have an account? Sign in
            </Link>
          </p>
        </div>
      </section>

      {/* ── Tracking / integration ───────────────────────────── */}
      <section>
        <p className="eyebrow text-center">Tracking that just works</p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 text-center">
          Integrate in minutes — one call from your server
        </h2>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <div className="card p-6">
            <h3 className="font-semibold text-slate-900">
              1 · We tag every visitor
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Users reach your site with a unique{" "}
              <code className="rounded bg-slate-100 px-1 text-violet-700">
                click_id
              </code>{" "}
              attached to the URL. Store it with the signup — that&apos;s the only
              change to your funnel.
            </p>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold text-slate-900">
              2 · You confirm the conversion
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              When the signup is genuine — account created, email verified,
              whatever <em>you</em> define as success — your backend calls one
              URL:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-emerald-300">
{`GET /api/postback
    ?click_id={click_id}
    &key=YOUR_SECRET_KEY`}
            </pre>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold text-slate-900">
              3 · Entries credited, stats updated
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              The user gets their giveaway entries instantly, and the conversion
              appears on your dashboard. Change your mind later?{" "}
              <code className="rounded bg-slate-100 px-1 text-violet-700">
                status=rejected
              </code>{" "}
              reverses it.
            </p>
          </div>
        </div>

        <div className="mt-6 card p-6">
          <h3 className="font-semibold text-slate-900">Why it&apos;s safe</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-sm text-slate-600">
            <li>
              🔒 <strong className="text-slate-800">Server-to-server</strong> —
              the postback fires from your backend, never from the browser, so
              users can&apos;t see or forge it.
            </li>
            <li>
              🗝️ <strong className="text-slate-800">Secret key</strong> — each
              advertiser gets a private key; only you can credit your offers.
            </li>
            <li>
              ♻️ <strong className="text-slate-800">Idempotent</strong> —
              duplicate or retried postbacks are acknowledged, never
              double-counted.
            </li>
            <li>
              ↩️ <strong className="text-slate-800">Reversible</strong> —
              detected fraud or chargebacks can be rolled back any time, and the
              user&apos;s entries are pulled.
            </li>
          </ul>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────── */}
      {!user && (
        <section className="text-center card p-10">
          <h2 className="text-2xl font-bold text-slate-900">
            Two sides. One honest deal.
          </h2>
          <p className="mt-3 text-slate-600 max-w-xl mx-auto">
            Join as a user and start earning entries today, or launch an offer
            and watch verified customers roll in.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/register" className="btn px-6 py-3 text-base">
              Sign up as a user
            </Link>
            <Link
              href="/advertiser/register"
              className="btn-outline px-6 py-3 text-base"
            >
              Sign up as an advertiser
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
