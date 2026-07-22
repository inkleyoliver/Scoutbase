# Scoutbase

A personal action-management PWA for two concurrent Scouting volunteer
roles (GSL and Explorers), built around ADHD-friendly capture, automatic
sorting, and nudging. Single-user app — see `SCOUTBASE_SPEC.md` for the
full brief.

This README covers everything needed to run it locally and take it live.

## Tech stack

Next.js 15 (App Router, TypeScript) · Supabase (Postgres, Auth, RLS) ·
Vercel (hosting + Cron) · Web Push / VAPID (push notifications) · Serwist
(PWA service worker).

**Capture sorting is free and runs entirely locally.** Brain-dump captures
are pre-filled with best-guess fields via a deterministic, keyword-based
parser (`src/lib/triageFallback.ts`) — no network call, no cost, no
external API — and always land in the Inbox as an editable form so every
field can be adjusted before anything is saved.

**No email features.** Inbound email capture and the outbound daily digest
email have both been removed. Nudges are push notifications (§8.2) plus the
in-app Today view — see `BUILD_PROGRESS.md` for the history.

## 1. Local development setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in real values (see
   "Environment variables" below). Placeholder values are enough for
   `npm run build` / `npm run dev` to run, and the app is fully functional
   without a real `ANTHROPIC_API_KEY` (see above) — only Supabase and VAPID
   need real values for the core app + push to work.
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
   Vercel env var for cron jobs — treat it as a secret, never expose it to
   the client.
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
   - `0004_remove_email.sql` — removes the now-dead email-only columns/table
     (`inbox_items.email_subject`/`email_from`, `digest_log`,
     `user_settings.digest_enabled`/`digest_time`) and tightens the
     `inbox_items`/`actions` `source` check constraints now that email
     capture no longer exists. **Not yet applied to the live project** — see
     the checklist in §8.
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
| `ANTHROPIC_API_KEY` | server only | **Optional.** `/api/triage` upgrades to real Claude only if this is set to a real key; otherwise triage runs on the free built-in heuristic fallback (`src/lib/triageFallback.ts`) automatically — no cost, no setup required |
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
| `/api/cron/push-urgency` | `0 * * * *` (hourly) | Due-today nudge (once/day, ~08:00 London), urgent items (once ever per item), waiting-on ≥14-day chases (once ever per item). Hard cap: 2 pushes/day total. |

**Vercel plan limits**: the Hobby (free) plan historically limits cron
frequency/count more than Pro. If `push-urgency`'s hourly schedule isn't
available on your plan, either upgrade or reduce it to a few times/day —
the route is idempotent either way (it never sends more than 2/day and
never repeats a "once ever" push).

## 5. VAPID keys (push notifications)

```bash
npx web-push generate-vapid-keys
```

Copy the public/private key pair into `VAPID_PUBLIC_KEY` /
`VAPID_PRIVATE_KEY`. The public key is also read at runtime by the
Settings → Notifications "Enable on this device" button (via a server
action, never hard-coded into client bundles) to create the browser push
subscription.

## 6. iOS install & push caveat

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

## 7. What Oli needs to do to go live (checklist)

- [ ] Create a Supabase project, apply migrations `0001`–`0004` in order
      (via the SQL editor — `0004_remove_email.sql` is new and hasn't been
      applied to the live project yet), disable public sign-ups, create the
      one allow-listed user, run `npm run seed`.
- [ ] (Optional) Get an Anthropic API key (`ANTHROPIC_API_KEY`) if you want
      real Claude triage instead of the free built-in heuristic — not
      required to use the app.
- [ ] Generate VAPID keys (`npx web-push generate-vapid-keys`).
- [ ] Pick a `CRON_SECRET` (any long random string).
- [ ] Deploy to Vercel, add every env var from §3, confirm the 3 cron jobs
      show up under Project → Cron Jobs.
- [ ] Set `NEXT_PUBLIC_APP_URL` to the real Vercel URL, redeploy.
- [ ] Sign in, add the Home Screen shortcut on iOS (§6), enable push in
      Settings.

## Project structure notes

See `BUILD_PROGRESS.md` for the full build log, phase-by-phase decisions,
and deviations from the original spec.
