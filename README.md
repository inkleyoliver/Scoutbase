# Scoutbase

A personal action-management PWA for two concurrent Scouting volunteer
roles (GSL and Explorers), built around ADHD-friendly capture, AI triage,
and nudging. Single-user app — see `SCOUTBASE_SPEC.md` for the full brief.

This README covers everything needed to run it locally and take it live.

## Tech stack

Next.js 15 (App Router, TypeScript) · Supabase (Postgres, Auth, RLS) ·
Vercel (hosting + Cron) · Anthropic API (`claude-sonnet-4-6`, triage) ·
Resend (digest email) · Web Push / VAPID (push notifications) · Serwist
(PWA service worker).

## 1. Local development setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in real values (see
   "Environment variables" below). Placeholder values are enough for
   `npm run build` / `npm run dev` to run, but nothing that talks to
   Supabase/Anthropic/Resend will actually work until they're real.
3. Create a Supabase project (see §2 below), apply the migrations, disable
   public sign-ups, and create the one allow-listed user.
4. `npm run seed` — populates roles, placeholder milestones, sample
   recurrences, contacts, a meeting note, a decision, library links and a
   handful of sample actions (idempotent, safe to re-run).
5. `npm run dev`, sign in at `/login`.

`npm run build` and `npx tsc --noEmit` both pass clean as of the latest
commit — run both after any change before pushing.

## 2. Supabase project setup

1. Create a new project at [supabase.com](https://supabase.com) (free tier
   is enough).
2. **Project Settings → API**: copy the Project URL, `anon` public key, and
   `service_role` secret key into `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`). The service role key is also needed as a
   Vercel env var for cron jobs and the inbound-email webhook — treat it as
   a secret, never expose it to the client.
3. **Apply the migrations**, in order, either via the SQL editor (paste each
   file's contents and run) or the CLI:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   Migrations live in `supabase/migrations/`:
   - `0001_init.sql` — all 12 core tables (§4), RLS, owner_id triggers.
   - `0002_staleness.sql` — `last_activity_at` on actions + triggers that
     advance it on status/notes/subtask changes (powers the 21-day "Still
     real?" badge).
   - `0003_settings_and_push_log.sql` — `user_settings` (digest on/off,
     digest time, focus default) and `push_log` (push notification history,
     used to enforce the 2/day cap and "once ever" rules).
4. **Disable public sign-ups**: Authentication → Providers → Email → turn
   off "Allow new users to sign up" (or Authentication → Settings depending
   on your Supabase dashboard version). This app allow-lists exactly one
   email server-side (`ALLOWED_USER_EMAIL`), but disabling sign-ups at the
   Supabase level is defence in depth.
5. **Create the one allow-listed user**: Authentication → Users → Add user
   → enter the email matching `ALLOWED_USER_EMAIL` and a password. (You can
   also do this by visiting `/login` once with sign-ups still enabled and
   then disabling them — either works.)
6. Run `npm run seed` (step 4 above) once the user exists.

## 3. Environment variables

All of these are documented with inline comments in `.env.example`.

| Variable | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Bypasses RLS — used by cron/webhook routes and `scripts/seed.ts` |
| `ALLOWED_USER_EMAIL` | server only | The one email allowed to sign in |
| `ANTHROPIC_API_KEY` | server only | `/api/triage` |
| `RESEND_API_KEY` | server only | Daily digest email |
| `DIGEST_FROM_EMAIL` | server only | Must be on a domain verified in Resend, e.g. `"Scoutbase <digest@yourdomain.com>"`. Falls back to Resend's shared sandbox sender if unset (fine for testing, not for real delivery) |
| `INBOUND_EMAIL_SECRET` | server only | Shared secret checked by `/api/inbound-email` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | server (+ public key sent to client at runtime) | Generate with `npx web-push generate-vapid-keys` |
| `CRON_SECRET` | server only | Checked by every `/api/cron/*` route |
| `NEXT_PUBLIC_APP_URL` | server only (despite the prefix) | Used to build the deep-link URL inside push notification payloads, e.g. `https://scoutbase.vercel.app` |

Set all of these as Vercel **Production** environment variables before
deploying (Project Settings → Environment Variables).

## 4. Deploying to Vercel

1. Push this repo to GitHub, then "Import Project" in Vercel and select it.
2. Add all the environment variables from §3 above.
3. Deploy. Vercel will pick up `vercel.json` automatically and register the
   cron jobs listed below — no extra configuration needed.
4. Set `NEXT_PUBLIC_APP_URL` to the real deployed URL once you know it
   (redeploy after changing it, since it's baked in at build/runtime).

### Vercel Cron jobs (`vercel.json`)

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/materialize-recurrences` | `0 3 * * *` (03:00 UTC daily) | Creates `actions` rows from active recurrences due within 7 days, advances `next_due`. Never duplicates. |
| `/api/cron/auto-archive` | `0 3 * * *` | Archives `done` actions whose `completed_at` is 14+ days old. Never touches `open` items. |
| `/api/cron/digest` | `0 6 * * *` (06:00 UTC ≈ 07:00 Europe/London) | Daily digest email via Resend. Skips the send if there's nothing to say, or if already sent today (`digest_log`), or if the user has digest disabled in Settings. |
| `/api/cron/push-urgency` | `0 * * * *` (hourly) | Due-today nudge (once/day, ~08:00 London), urgent items (once ever per item), waiting-on ≥14-day chases (once ever per item). Hard cap: 2 pushes/day total. |

**Note on 06:00 UTC for the digest**: the schedule is a fixed UTC cron
expression, so it drifts an hour relative to Europe/London across the
BST/GMT boundary (07:00 local in winter, 06:00 local in summer under this
setting — adjust to `0 5 * * *` if you'd rather it stay at 07:00 during
BST and accept 06:00 in winter, or just nudge it twice a year). The
`digest_time` field in Settings is stored for future use / display purposes
but doesn't currently reschedule the cron — Vercel Cron has one fixed
schedule per job, not a per-user one. If you want a different fixed time,
edit `vercel.json`.

**Vercel plan limits**: the Hobby (free) plan historically limits cron
frequency/count more than Pro. If `push-urgency`'s hourly schedule isn't
available on your plan, either upgrade or reduce it to a few times/day —
the route is idempotent either way (it never sends more than 2/day and
never repeats a "once ever" push).

## 5. Cloudflare Email Routing → Worker (inbound email capture)

Used for §5.2: emailing Scoutbase forwards the email into the Inbox for
AI triage (never auto-creates actions).

1. In Cloudflare, add the domain you want to receive mail on (or a
   subdomain) and enable **Email Routing**.
2. Create a **Worker** with roughly this logic (adjust to taste — this is
   deliberately minimal):

   ```js
   export default {
     async email(message, env, ctx) {
       const rawText = await new Response(message.raw).text();
       // For a quick MVP, just forward subject/from and a naive text body.
       // For proper MIME parsing, use a library like postal-mime in the Worker.
       const body = {
         subject: message.headers.get("subject") || "",
         from: message.from,
         text: rawText.slice(0, 20000),
       };
       await fetch("https://<your-app>.vercel.app/api/inbound-email", {
         method: "POST",
         headers: {
           "content-type": "application/json",
           "x-inbound-secret": env.INBOUND_EMAIL_SECRET,
         },
         body: JSON.stringify(body),
       });
     },
   };
   ```
3. Set `INBOUND_EMAIL_SECRET` as a Worker secret matching the app's env var:
   `npx wrangler secret put INBOUND_EMAIL_SECRET`.
4. In Cloudflare Email Routing, route your chosen address (e.g.
   `scoutbase@yourdomain.com`) to this Worker.
5. `/api/inbound-email` strips HTML if only an HTML body is sent, truncates
   to ~4,000 characters for the AI prompt, but stores the full text on the
   `inbox_items` row.

**Alternative**: if your Resend account has Inbound email available, that's
less code (no Worker to write) — just point its webhook at
`/api/inbound-email` with the same `{ subject, from, text, html }` shape and
an `x-inbound-secret` header or `?secret=` query param.

## 6. VAPID keys (push notifications)

```bash
npx web-push generate-vapid-keys
```

Copy the public/private key pair into `VAPID_PUBLIC_KEY` /
`VAPID_PRIVATE_KEY`. The public key is also read at runtime by the
Settings → Notifications "Enable on this device" button (via a server
action, never hard-coded into client bundles) to create the browser push
subscription.

## 7. iOS install & push caveat

Push notifications on iOS Safari **only work if the app has been added to
the Home Screen** — Safari does not support Web Push for regular browser
tabs. To install:

1. Open the deployed app URL in Safari on iPhone/iPad.
2. Tap the Share icon → **Add to Home Screen** → Add.
3. Open Scoutbase from the Home Screen icon (not from Safari) — it now runs
   standalone.
4. Go to Settings → Notifications → "Enable on this device" to subscribe.

If you open the deployed app in regular Safari (not installed), the
"Enable on this device" button will fail with a permission/support error —
that's expected iOS behaviour, not a bug.

## 8. What Oli needs to do to go live (checklist)

- [ ] Create a Supabase project, apply the 3 migrations, disable public
      sign-ups, create the one allow-listed user, run `npm run seed`.
- [ ] Get an Anthropic API key (`ANTHROPIC_API_KEY`).
- [ ] Get a Resend API key and verify a sending domain; set
      `DIGEST_FROM_EMAIL` to an address on it.
- [ ] Generate VAPID keys (`npx web-push generate-vapid-keys`).
- [ ] Pick an `INBOUND_EMAIL_SECRET` and a `CRON_SECRET` (any long random
      strings).
- [ ] Set up Cloudflare Email Routing → Worker (§5 above), or Resend
      Inbound if simpler.
- [ ] Deploy to Vercel, add every env var from §3, confirm the 4 cron jobs
      show up under Project → Cron Jobs.
- [ ] Set `NEXT_PUBLIC_APP_URL` to the real Vercel URL, redeploy.
- [ ] Sign in, add the Home Screen shortcut on iOS (§7), enable push in
      Settings.

## Project structure notes

See `BUILD_PROGRESS.md` for the full build log, phase-by-phase decisions,
and deviations from the original spec.
