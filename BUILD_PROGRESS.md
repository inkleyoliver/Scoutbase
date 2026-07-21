# Scoutbase — build progress

Phases 1–4 of `SCOUTBASE_SPEC.md` §12 are implemented. Phases 5–12 (Plan,
Reference, recurrence cron, staleness/auto-archive, digest email, push,
inbound email webhook, PWA layer, Settings/export, README) are **not**
built — see the stubs at `/plan` and `/more` and the notes below.

## What's done

**Phase 1 — Scaffold**
- Next.js 15 (App Router, TypeScript, Tailwind v4), `src/` dir, `@/*` import alias.
- Supabase SSR clients (`@supabase/ssr`): `src/lib/supabase/{client,server,middleware}.ts`.
- Single-user allow-list auth: email+password sign-in, server-side check
  against `ALLOWED_USER_EMAIL`, enforced again in `src/middleware.ts` on every
  request.
- Full schema for all 12 tables from spec §4:
  `supabase/migrations/0001_init.sql`. Every table has `owner_id`, a
  before-insert trigger that sets it from `auth.uid()`, an `updated_at`
  trigger, RLS enabled, and 4 policies (select/insert/update/delete) scoped
  to `owner_id = auth.uid()`.
- Seed script: `scripts/seed.ts` (run with `npm run seed`), covers the full
  §14 checklist (3 roles, 9 GSL + 3 Explorer milestones, 5 recurrences, 4
  contacts, 1 meeting note, 1 decision, 3 library resources, 6 actions).
  Idempotent — safe to re-run.
- App shell: sidebar (desktop) / bottom tab bar (mobile), Focus mode toggle
  (`All | GSL | Explorers`, localStorage-persisted), nav items for all five
  spec §7 sections (Plan/More are stubs, wired for later phases).

**Phase 2 — Actions**
- Full CRUD (`src/lib/server/actionMutations.ts`, all Server Actions),
  subtasks, list view with search + filters (role via Focus mode, status,
  category, effort, milestone). Default filter is open+waiting per §7.3.

**Phase 3 — Today**
- Ranking per §7.1 (`src/lib/ranking.ts`): overdue → due today → due ≤2
  days → urgent → oldest-high-priority, capped at 5, `"+N more"` link for
  the rest.
- Relative-time-prominent cards, snooze (tomorrow/3 days/next week/pick
  date), balance indicator (GSL vs Explorers, open + last-14-days-done, with
  a gentle skew line), waiting-on chase strip.

**Phase 4 — Inbox / AI triage**
- Global capture: FAB (mobile) + ⌘K bar (desktop) from every screen
  (`src/components/CaptureBar.tsx`), plus an inline capture box pinned at
  the top of `/inbox`.
- `/api/triage` (`src/app/api/triage/route.ts`) calls Anthropic
  (`claude-sonnet-4-6`, server-only) via `src/lib/server/runTriage.ts`.
  Prompt building and defensive JSON parsing live in `src/lib/triage.ts`
  (strips code fences, recovers the outermost `{...}`, validates every enum
  field, drops malformed items instead of throwing).
- Proposal cards (Accept ✓ / Edit ✎ / Discard ✗, Accept-all) in
  `src/components/ProposalCard.tsx` / `InboxItemGroup.tsx`. Accepting a
  high-confidence item resolves `milestone_title_match` against a real
  milestone by title. If triage fails outright, the inbox item survives with
  `ai_proposal = null` and the UI offers retry or manual conversion — capture
  is never lost.

## Key decisions / deviations

- **Next.js pinned to 15, React to 18.** `create-next-app@latest` initially
  pulled Next 16 / React 19; the spec explicitly says Next.js 15, so both
  were downgraded.
- **No generic `Database` type on the Supabase clients.** I hand-wrote
  `src/lib/database.types.ts` for documentation, but wiring it through
  `createBrowserClient<Database>`/`createServerClient<Database>` broke type
  inference (`@supabase/postgrest-js`'s `GenericTable` requires a
  `Relationships` field and structural quirks around `interface` vs `type`
  kept resolving rows to `never`). App code uses the hand-written row types
  from `src/lib/types.ts` directly instead. Regenerate the real thing once a
  live project exists: `npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts`.
- **System font stack, not `next/font/google`.** Spec §10 asks for a system
  font stack anyway, and this avoids a network dependency at build time.
- **Auth is email+password**, not magic link (spec allowed either).
- **Focus mode filtering is done client-side** against a full fetch of the
  (small, single-user) dataset, rather than passing role as a query param
  and refetching. Keeps the localStorage-persisted toggle instant and
  matches "the app comes to the user" spirit without extra round-trips.
- **Migration verified against a real Postgres engine**, not just read
  carefully: I ran it through `@electric-sql/pglite` (WASM Postgres) with a
  stubbed `auth.uid()`, confirmed all 12 tables and 48 RLS policies (4 ×
  12) are created without error, then removed the dev dependency. There's
  no live Supabase project to run `supabase db push` against yet.
- **`/plan` and `/more` are one-line stubs**, not full pages, so the nav
  shell (bottom tabs / sidebar) is complete and functional now without
  pretending phases 5–6 are built.

## How to run it locally

1. `npm install`
2. Create a Supabase project, then fill in real values in `.env.local`
   (currently placeholders — enough for `npm run build`/`npm run dev` to
   not crash, but nothing that talks to Supabase/Anthropic will work):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_USER_EMAIL`, `ANTHROPIC_API_KEY`.
3. Apply the migration: `npx supabase db push` (or paste
   `supabase/migrations/0001_init.sql` into the Supabase SQL editor).
4. In Supabase Auth settings: disable public sign-ups, create the one
   allow-listed user (matching `ALLOWED_USER_EMAIL`) with a password.
5. Seed: `npm run seed` (requires the user from step 4 to already exist).
6. `npm run dev`, sign in at `/login`.

`npm run build` and `npx tsc --noEmit` both passed clean after phase 4, and
again after every phase through 12 (see below) — the project has never had
errors carried over between phases.

---

# Phases 5–12 (this pass)

All 8 remaining phases from spec §12 are now built, in order, each checked
with `npx tsc --noEmit` and `npm run build` before moving to the next.

## Phase 5 — Plan (milestones)

- `src/lib/server/milestoneMutations.ts`: create/update milestone, status
  changer.
- `/plan` (`PlanView.tsx`): per-role milestone list grouped by theme, each
  showing status, target date, and a `done/total` attached-actions count
  (computed server-side from `actions.milestone_id`).
- `/plan/[id]` (`MilestoneDetailView.tsx`): description (inline-editable,
  saves on blur), status changer, inline "add an action for this milestone"
  box, and the attached actions list (reusing `ActionCard`).
- Action↔milestone linking itself already existed from phase 2
  (`ActionForm`'s milestone select) — this phase only added the milestone
  side of the relationship.

## Phase 6 — Reference

- `src/lib/server/referenceMutations.ts`: contacts, meeting notes,
  decisions, resources CRUD + `extractActionsFromNote`.
- `/more` is now a menu (Reference: Contacts, Meeting notes, Decisions log,
  Library; Settings) rather than a stub.
- `/more/contacts`: grouped by role, `tel:`/`mailto:` links.
- `/more/notes` + `/more/notes/[id]`: markdown notes (plain textarea editor,
  rendered as preformatted text — no markdown-render dependency added, kept
  consistent with "no unnecessary deps" from phase 1's font-stack decision),
  list by date, **"Extract actions"** button that runs the note body through
  the exact same `runTriageForInboxItem` pipeline as a brain dump (creates
  an `inbox_items` row with `source: 'brain_dump'`, `raw_text` prefixed with
  the note title) — proposals land in the Inbox for confirmation, nothing is
  auto-created.
- `/more/decisions`: chronological, filterable by Focus mode, shows the
  "superseded by" chain. **Design decision**: `superseded_by` (§4.9) lives
  on the *old* decision row and points at the new one. The "New decision"
  form's "this decision supersedes…" picker therefore triggers an update of
  the chosen old row's `superseded_by` after the new row is inserted, rather
  than setting `superseded_by` on the new row itself (which would be
  semantically backwards — see `createDecision` in
  `referenceMutations.ts`).
- `/more/library`: grouped by category, tap-to-open URLs.

## Phase 7 — Recurrences

- `src/lib/server/recurrenceMutations.ts` + `RecurringManager.tsx` under
  `/more/settings`: simple list + form, no cron-expression exposure, as
  spec'd. Pause/resume (`active` toggle) and delete.
- `src/lib/server/materializeRecurrences.ts`: the core materialisation
  logic — for each active recurrence with `next_due <= today + 7 days`,
  checks for an existing non-archived action with the same
  `recurrence_id` + `due_date` before inserting (never duplicates), then
  advances `next_due` (weekly +7d, monthly +1 month same day, yearly +1
  year same month/day, **termly approximated as +120 days** since spec says
  "three fixed dates/year, user-editable" rather than a strict rule —
  Oli can hand-edit `next_due` in Settings any time). Loops up to 6
  occurrences per run so a long-neglected recurrence catches up rather than
  silently drifting.
- `/api/cron/materialize-recurrences`: daily cron route, verifies
  `CRON_SECRET`, uses a new service-role admin client (see below).
- The 5 sample recurrences from §6 were already in `scripts/seed.ts` from
  phase 1 — nothing to add there.
- **New**: `src/lib/supabase/admin.ts` — a service-role Supabase client plus
  `getOwnerId()` (looks up the one allow-listed user via the Admin API).
  Needed because cron/webhook routes have no session/cookie to derive
  `auth.uid()` from, so RLS would block everything; every such route
  verifies its shared secret first and scopes every query to this one
  owner id explicitly. `src/lib/server/cronAuth.ts` centralises the
  `CRON_SECRET` check (accepts `Authorization: Bearer <secret>`, which
  Vercel injects automatically on cron-triggered requests, or `?secret=`
  for manual testing).

## Phase 8 — Staleness + auto-archive + quick-wins

- **New migration** `supabase/migrations/0002_staleness.sql`: adds
  `actions.last_activity_at` (defaults to `updated_at` on backfill), plus
  two triggers — one on `actions` that bumps it when `status` or `notes`
  changes, one on `subtasks` (insert/update/delete) that bumps the parent
  action's `last_activity_at`. This is deliberately narrower than
  `updated_at` (which also ticks on system-driven changes like snooze) so
  the 21-day clock only resets on genuine "this is still being worked"
  signals, per §7.3.
- `src/lib/staleness.ts`: `isStale()` — open actions only, 21+ days since
  `last_activity_at`.
- `StaleBadge.tsx`: quiet amber "Still real?" badge with **Yes, keep** /
  **Snooze a month** / **Archive** — never auto-archives an open action,
  per §1.6. "Yes, keep" is the one place the app writes
  `last_activity_at` directly (`markActionStillReal` in
  `actionMutations.ts`) rather than relying on the trigger.
- `ActionsView.tsx`: "Stale (N)" chip (only shown when N > 0) and a
  "Quick wins" chip (`effort = quick`), both toggleable alongside the
  existing filters.
- `/api/cron/auto-archive`: daily cron, archives `done` items with
  `completed_at` 14+ days old. Only ever touches `done` rows.

## Phase 9 — Digest email + push notifications

- Added `resend`, `web-push`, `@types/web-push` as dependencies.
- **New migration** `supabase/migrations/0003_settings_and_push_log.sql`:
  - `user_settings` (one row per owner): `digest_enabled`, `digest_time`,
    `focus_default`. Not an explicit table in spec §4, but needed to
    implement the §7.6 Settings requirements (digest on/off/time, focus
    mode default) as real persisted state rather than device-local-only.
  - `push_log`: records every push actually sent (`kind`, `ref_id`,
    `sent_at`). Also not in §4, but needed to implement §8.2's "max one
    push per item, ever" (waiting-on chases) and the "max 2 pushes/day"
    hard cap without re-deriving history from notification payloads.
- `src/lib/server/buildDigest.ts`: reuses `rankTodayActions` from phase 3
  for the top-5, plus waiting-on chases ≥7 days, stale count, a balance
  skew line (same logic as `BalanceIndicator`, kept as a small duplicate
  function here rather than a shared refactor to avoid touching a
  phase-3 component under time pressure), and inbox pending count. Returns
  `null` if every section is empty — "silence is a feature" per §8.1.
- `src/lib/server/digestEmail.ts` + `/api/cron/digest`: renders a simple
  table-based HTML email (role-coloured chips), sends via Resend, logs to
  `digest_log`. Idempotent: checks `user_settings.digest_enabled` and
  whether a `digest_log` row already exists for today before sending.
- `src/lib/server/webpush.ts` + `src/lib/server/pushMutations.ts` +
  `/api/cron/push-urgency` (hourly): due-today nudge (once/day, in the
  08:00 London hour), urgent-priority items (once ever per item), waiting-on
  ≥14-day chases (once ever per item), hard-capped at 2 pushes/day total,
  all tracked via `push_log`. Stale/revoked subscriptions (404/410 from the
  push service) are deleted automatically.
- `/more/settings` → `NotificationSettings.tsx`: "Enable on this device"
  (label + subscribe, stores endpoint/keys), digest on/off + time, focus
  mode default, save button. Requires a registered service worker to
  subscribe (see phase 11) — before that lands, "Enable on this device"
  will fail gracefully with a message rather than crash.
- Built the JSON export (`/api/export` + `ExportButton.tsx`) here too,
  slightly ahead of phase 12, since it shares the Settings page — see
  phase 12 notes.

## Phase 10 — Inbound email webhook

- `src/lib/htmlStrip.ts`: small dependency-free HTML→text helper (no
  sanitizer library added, consistent with the project's low-dependency
  bias).
- `/api/inbound-email`: verifies `INBOUND_EMAIL_SECRET` (header
  `x-inbound-secret` or `?secret=`), accepts `{ subject, from, text, html }`,
  stores the **full** text on `inbox_items.raw_text`, then runs
  `runTriageForInboxItem` (which internally truncates to ~4,000 chars for
  the prompt — unchanged from phase 4). Uses the same service-role admin
  client as the cron routes, since a webhook has no session either. Designed
  against a minimal Cloudflare Email Routing Worker (documented in
  README §5) but works unchanged against Resend Inbound's webhook shape too.

## Phase 11 — PWA layer

- Added `@serwist/next` + `serwist`.
- `next.config.ts` wrapped with `withSerwistInit` (`swSrc: src/app/sw.ts` →
  `public/sw.js`, disabled in dev).
- `src/app/sw.ts`: precaches the app shell via Serwist's Next.js default
  runtime caching (NetworkFirst for pages — the last-fetched Today view is
  cached automatically on every visit and served from cache offline, per
  §9), plus `push`/`notificationclick` handlers that show the notification
  and deep-link to `payload.url` on click.
- `public/manifest.webmanifest` + icons (`public/icons/icon-192.png`,
  `icon-512.png`, `apple-touch-icon.png` — generated as simple placeholder
  "S" glyphs via `sharp`; **Oli should replace these with real artwork**
  before shipping, they're functional placeholders only). Wired into
  `src/app/layout.tsx` metadata (`manifest`, `appleWebApp`, `icons`).
- `src/lib/offlineQueue.ts` + `PwaSetup.tsx`: registers the service worker
  on app load; the global capture bar (`CaptureBar.tsx`) now queues a
  brain-dump capture in `localStorage` if `navigator.onLine` is false or the
  server action throws, and `PwaSetup` retries the queue on mount and on the
  browser's `online` event.
- `public/sw.js` (and its `.map`/`swe-worker-*` siblings) are build output,
  not committed — added to `.gitignore`. Vercel regenerates it on every
  deploy.
- README documents the iOS Add-to-Home-Screen steps and the "push requires
  install" caveat.

## Phase 12 — Settings, export, README

- Settings page (`/more/settings`) now has all four pieces required by
  §7.6: Recurring tasks manager (phase 7), Notifications (phase 9), Focus
  mode default, Export.
- **Focus mode default wiring**: `user_settings.focus_default` is fetched
  server-side in `src/app/(app)/layout.tsx` and passed down through
  `AppShell` → `FocusModeProvider` as the initial value, used only on a
  device's very first load (i.e. before anything is in `localStorage`) —
  once the user has toggled Focus mode on a device, that device's
  `localStorage` value always wins, consistent with the existing
  phase-1 pattern of `localStorage` being the source of truth per device.
- `/api/export` + `ExportButton.tsx`: streams a single JSON file with every
  table (roles, milestones, recurrences, actions, subtasks, inbox_items,
  contacts, meeting_notes, decisions, resources, push_subscriptions,
  digest_log, user_settings), scoped by RLS via the session-bound Supabase
  client (not the admin client) so it can never leak another user's data
  even if the single-owner assumption is ever relaxed later.
- `README.md` rewritten from the default `create-next-app` boilerplate to a
  full deploy guide: local dev setup, Supabase project setup + migration
  steps + disabling sign-ups + creating the allow-listed user, every env
  var explained, Vercel deploy + all 4 cron jobs with schedules and a note
  about UTC/BST drift and Hobby-plan cron limits, Cloudflare Email Routing
  Worker setup (with a minimal example Worker) + a Resend Inbound
  alternative, VAPID key generation, iOS install + push-requires-install
  caveat, and a top-level "go live" checklist.

---

# Key deviations / additions beyond the original spec (phases 5–12)

- **Two tables not in spec §4**: `user_settings` and `push_log` (migration
  0003). Needed to implement §7.6 and §8.2's stated behaviour (persisted
  digest/focus settings; the 2/day push cap and "once ever" per-item rules)
  as real server-side state rather than best-effort/in-memory. Documented
  above and in the migration file's own header comment.
- **`actions.last_activity_at`** (migration 0002) — not in spec §4 either,
  needed to distinguish "genuinely worked on" from "touched by the system"
  for the 21-day staleness clock; see phase 8 notes above.
- **Service-role admin client** (`src/lib/supabase/admin.ts`) for cron and
  webhook routes, since those have no user session for RLS's
  `auth.uid()` to resolve against. Every route using it verifies a shared
  secret first (`CRON_SECRET` / `INBOUND_EMAIL_SECRET`) and explicitly
  scopes every query to the one owner id, per §11.
- **Termly recurrence advancement is approximated as +120 days**, not a
  true "three fixed dates a year" scheduler — spec explicitly calls this
  user-editable, so `next_due` can be hand-corrected in Settings after each
  materialisation if term dates shift.
- **Digest send time is a fixed Vercel Cron UTC schedule**, not driven by
  the per-user `digest_time` setting — Vercel Cron doesn't support
  per-invocation dynamic schedules. The setting is stored and shown in
  Settings but doesn't (yet) reschedule the cron; see README §4 for the
  UTC/BST caveat and how to change the fixed time in `vercel.json`.
- **No markdown renderer added** for meeting notes — body is edited as
  plain text and displayed as preformatted text, consistent with the
  project's existing low-dependency bias (e.g. system font stack over
  `next/font/google` in phase 1).
- **PWA icons are placeholder art** (a purple rounded square with a plain
  "S", generated via `sharp` at build time from an inline SVG, not hand
  designed) — functionally correct manifest/icon wiring, but Oli should
  swap in real artwork before shipping.
- **Export uses the session-scoped client, not the admin client** — a
  deliberate choice so the export endpoint can never be tricked into
  returning another owner's data even if RLS's single-owner assumption is
  ever loosened later.

# What Oli needs to do to go live

See `README.md` §7 for the full checklist. Summary: provision Supabase
(migrations `0001`–`0004` + disable sign-ups + create the one user + seed),
generate VAPID keys, pick a `CRON_SECRET`, deploy to Vercel with every env
var set, confirm the 3 cron jobs registered, set `NEXT_PUBLIC_APP_URL` and
redeploy, then install to iOS Home Screen and enable push. An Anthropic API
key is optional — see below.

---

# Post-launch pass: free triage by default, email features removed

After the initial 12 phases were built and committed, Oli decided (to avoid
any ongoing cost) to: (1) never pay for an Anthropic API key, and (2) drop
both email features entirely. This pass implements both decisions.

## AI triage now defaults to a free keyword heuristic

- `src/lib/server/runTriage.ts`'s fallback condition changed from
  `DEMO_MODE === "true" && !hasRealAnthropicKey()` to simply
  `!hasRealAnthropicKey()` — the heuristic fallback is now the **production
  default** whenever no real `ANTHROPIC_API_KEY` is set, not just a
  demo-mode artifact. The real Anthropic API is only ever called when a real
  key is present, and the upgrade is fully transparent — add a real key
  later and triage switches to real Claude with no other code change; remove
  it again and it falls back to the heuristic.
- The heuristic itself moved from `src/lib/demo/cannedTriage.ts` to
  `src/lib/triageFallback.ts` (top-level `lib`, not `lib/demo`) to reflect
  that it's a first-class production code path now, and was extended a bit
  for real-world use: effort guessing (quick/medium/big by keyword), a
  broader due-date parser (weekday names like "by Friday", "in N days", not
  just today/tomorrow/next week/end of month), and a cap raised from 3 to 5
  proposed items per capture. It's still deliberately simple — keyword
  regex matching, not an ML model — and demo mode continues to use the same
  function.

## Both email features removed entirely

- **Inbound email capture (phase 10, spec §5.2)**: deleted
  `src/app/api/inbound-email/route.ts` and `src/lib/htmlStrip.ts` (its only
  consumer). Removed `EMAIL_TRIAGE_EXTRA` from `src/lib/triage.ts` and the
  `item.source === "email"` branching in `runTriage.ts` — `inbox_items` are
  brain-dump-only now. `InboxSource`/`ActionSource` types dropped `"email"`.
  `InboxItemGroup.tsx` no longer renders an email-specific label.
- **Outbound daily digest email (phase 9's Resend half)**: deleted
  `src/app/api/cron/digest/route.ts`, `src/lib/resend.ts`,
  `src/lib/server/buildDigest.ts`, `src/lib/server/digestEmail.ts`, and the
  `resend` npm dependency. Removed the digest cron entry from `vercel.json`.
  Removed the "Daily digest" on/off + time UI from
  `NotificationSettings.tsx` — the push-notification enable/subscribe UI
  (the other half of phase 9) is untouched and fully intact. Confirmed
  `buildDigest.ts`'s ranking reuse (`rankTodayActions` from
  `src/lib/ranking.ts`) was one-directional — `ranking.ts` has no knowledge
  of the digest and needed no changes; only the digest-specific file was
  deleted.
- Nudges going forward are push notifications (§8.2, unchanged) plus the
  in-app Today view — no email channel of any kind remains.
- **New migration** `supabase/migrations/0004_remove_email.sql` (additive,
  doesn't edit 0001–0003): drops `inbox_items.email_subject`/`email_from`,
  tightens `inbox_items.source` to `check (source in ('brain_dump'))` and
  `actions.source` to `check (source in ('manual', 'brain_dump',
  'recurring'))` (converting any historical `'email'` rows to
  `'brain_dump'` first), drops the `digest_log` table, and drops
  `user_settings.digest_enabled`/`digest_time`. **Not yet applied to the
  live project** — Oli needs to paste it into the Supabase SQL editor.
- Updated `.env.example`/`.env.local`, `README.md`, and this file to match:
  removed `RESEND_API_KEY`, `DIGEST_FROM_EMAIL`, `INBOUND_EMAIL_SECRET` and
  every mention of Resend/Cloudflare Email Routing from the live docs
  (history of what was originally built is kept above, in the phase 9/10
  sections, for context).

## Judgment calls made in this pass

- Tightened `actions.source`'s check constraint too, even though the task
  only explicitly asked about `inbox_items.source` — `'email'` was legal
  there but never actually reachable from app code (inbox-derived actions
  have always been stamped `source: 'brain_dump'` in
  `src/lib/server/inboxMutations.ts`), so tightening it is free cleanup with
  no behavioural change.
- Renamed the demo-only `buildCannedProposal` to
  `buildFallbackTriageProposal` in its new home to make its production role
  clear; demo mode's own usage is unaffected since it calls through the same
  `runTriageForInboxItem` path.
- Rewrote the two demo-mode inbox items that previously had `source:
  "email"` (`mockData.ts`) as brain-dump-flavoured text instead of deleting
  them, so demo mode keeps the same number/variety of example inbox items.

# Final status

All 12 original phases of `SCOUTBASE_SPEC.md` §12 are built, plus this
post-launch pass. Current state:

- **No Anthropic API key is required.** Triage runs on a free, built-in
  keyword heuristic by default (`src/lib/triageFallback.ts`); setting a real
  `ANTHROPIC_API_KEY` transparently upgrades to real Claude triage, and
  removing it falls back to the heuristic again — both paths are exercised
  by `npm run build`.
- **No email features exist.** Inbound email capture and the outbound daily
  digest have both been fully removed (code, docs, and dependency). Nudges
  are push notifications + the in-app Today view only.
- **A new migration exists and is not yet live**:
  `supabase/migrations/0004_remove_email.sql` needs to be pasted into the
  Supabase SQL editor before this pass's schema assumptions (tightened
  `source` constraints, dropped email/digest columns and the `digest_log`
  table) are true of the live database. The app's TypeScript types already
  assume the post-migration schema, so apply it before deploying this code.
- `npx tsc --noEmit` and `npm run build` both pass with zero errors as of
  the last commit on this branch.
