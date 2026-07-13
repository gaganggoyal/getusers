# GetUsers

A giveaway platform where registered users earn entries by completing advertiser tasks
(partner-site signups, app installs, social follows…), with conversion tracking so
advertisers can verify the traffic they pay for. Production domain:
[getusers.online](https://getusers.online).

## Quick start

```bash
npm install
npx prisma migrate dev   # creates prisma/dev.db
npm run db:seed          # demo accounts + sample giveaway
npm run dev              # http://localhost:3000
```

Seeded accounts:

| Role       | Email                     | Password      |
| ---------- | ------------------------- | ------------- |
| Admin      | admin@getusers.local      | `admin1234`   |
| Advertiser | advertiser@acme.test      | `advertiser1` |
| User       | user@test.local           | `user12345`   |

The seeded advertiser's postback key is `demo-postback-key-acme`.

## How tracking works

1. **Click** — every task link goes through `/go/<taskId>`, which records a `Click`
   (user, IP, user-agent) with a unique `click_id`, then redirects to the advertiser's
   URL with `click_id` attached (use a `{click_id}` placeholder in the target URL, or
   it's appended as `?click_id=`).
2. **Conversion** — when the referred user converts, the advertiser fires a
   server-to-server postback:

   ```
   GET /api/postback?click_id=<click_id>&key=<postback_key>&payout=1.50
   ```

   The `key` is the advertiser's secret (issued by admin), so only they can credit
   their own offers. `status=rejected` reverses a conversion (fraud/chargeback).
   The endpoint is idempotent.
3. **Entries** — an approved completion credits the task's `entries` into the
   giveaway. Winner is drawn by weighted random pick (each entry = one ticket) from
   the admin panel.

### Verification modes per task

| Mode       | How it's verified                                                  | Trust  |
| ---------- | ------------------------------------------------------------------ | ------ |
| `POSTBACK` | Advertiser's server confirms the conversion (S2S postback)         | High   |
| `MANUAL`   | User submits proof (username/link); admin reviews in queue         | Medium |
| `TIMER`    | User must have clicked through at least N seconds before claiming  | Low    |

### Anti-fraud (current)

- One completion per user per task (DB unique constraint).
- Claims require a recorded click; timer claims enforce minimum dwell time.
- IP + user-agent captured on click, completion, and signup.
- Admin panel surfaces signup IPs shared by multiple accounts.
- Postbacks authenticated by per-advertiser secret key; conversions reversible.

## Roles & pages

- **User** — sign up at `/register`, browse giveaways on `/`, complete tasks on
  `/giveaways/<id>`, track entries + history on `/dashboard`.
- **Advertiser** — separate self-service signup at `/advertiser/register` (issues the
  postback key instantly) and sign-in at `/advertiser/login`. Dashboard at
  `/advertiser`: clicks/conversions/conv-rate per offer + postback docs.
- **Admin** — `/admin` review manual submissions, create giveaways & tasks, promote
  existing users to advertisers, draw winners, fraud signals.

The home page is a dual-audience landing (Admitad-style): user benefits, advertiser
benefits, and the 3-step tracking integration pitch.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma 6 + SQLite (swap
`datasource` to Postgres for production) · JWT session cookies (`jose`).

## Compliance note

Rewarding users for **likes/subscribes/follows** violates YouTube/Instagram/X
fake-engagement policies and can get advertiser accounts penalized. Those task types
exist in the schema (with manual review), but the recommended positioning is
postback-verified partner signups, installs, and newsletter offers.

## Production TODO

- Real email verification for user signups (big quality win for advertisers).
- Move JWT_SECRET to a real secret; switch SQLite → Postgres.
- Rate limiting on auth + claim endpoints.
- Device fingerprinting / VPN detection for stronger fraud scoring.
- Payment/insertion-order flow for advertisers.
