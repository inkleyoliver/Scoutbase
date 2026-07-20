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

`npm run build` and `npx tsc --noEmit` both pass clean as of this commit.

## What's left (phases 5–12, not built)

- Milestones/Plan screen, action↔milestone linking UI (the DB column and
  triage matching already work; there's just no milestone management UI yet).
- Reference: contacts, meeting notes (+ extract-actions), decisions log,
  library — tables exist, no UI.
- Recurrence materialisation cron.
- Staleness flags (21-day "Still real?") + auto-archive (14-day) cron +
  quick-wins chip.
- Digest email (Resend + Vercel Cron) + push notifications (VAPID).
- Inbound email webhook (`/api/inbound-email`) — `runTriageForInboxItem` in
  `src/lib/server/runTriage.ts` already handles `source: 'email'`, so the
  webhook mainly needs to create the `inbox_items` row and verify
  `INBOUND_EMAIL_SECRET`.
- PWA layer (manifest, service worker, offline Today, retry queue).
- Settings UI, JSON export, README with full deploy steps.
