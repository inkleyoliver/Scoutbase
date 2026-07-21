-- Scoutbase schema — migration 0004: remove email features.
--
-- Context: both email features (inbound email capture via a Cloudflare
-- Email Routing webhook, and the outbound Resend daily digest) have been
-- removed from the app entirely. Nudges are push-notifications-only (§8.2)
-- plus the in-app Today view. AI triage now defaults to a free, built-in
-- keyword heuristic (no Anthropic key required) and transparently upgrades
-- to real Claude only if ANTHROPIC_API_KEY is set — that upgrade path is
-- unaffected by this migration, it's app code only.
--
-- This migration is additive/cleanup-only on top of 0001-0003 — it does not
-- edit them. Apply it in the Supabase SQL editor after reviewing.

-- ---------------------------------------------------------------------------
-- inbox_items: tighten source to 'brain_dump' only, drop email-only columns.
-- Any historical rows with source = 'email' are converted to 'brain_dump'
-- first so the new, stricter check constraint doesn't fail on existing data.
-- ---------------------------------------------------------------------------

update public.inbox_items set source = 'brain_dump' where source = 'email';

alter table public.inbox_items
  drop constraint if exists inbox_items_source_check;

alter table public.inbox_items
  add constraint inbox_items_source_check check (source in ('brain_dump'));

alter table public.inbox_items
  drop column if exists email_subject,
  drop column if exists email_from;

-- ---------------------------------------------------------------------------
-- actions: 'email' was a legal source value (in case an action originated
-- from an emailed inbox item) but was never actually reachable from app
-- code — inbox-derived actions have always been stamped source =
-- 'brain_dump'. Tighten the constraint to match reality now that inbound
-- email is gone entirely.
-- ---------------------------------------------------------------------------

update public.actions set source = 'brain_dump' where source = 'email';

alter table public.actions
  drop constraint if exists actions_source_check;

alter table public.actions
  add constraint actions_source_check check (source in ('manual', 'brain_dump', 'recurring'));

-- ---------------------------------------------------------------------------
-- digest_log: only ever written to by the (now-deleted) digest cron route.
-- ---------------------------------------------------------------------------

drop table if exists public.digest_log;

-- ---------------------------------------------------------------------------
-- user_settings: digest on/off + digest time no longer have any UI or cron
-- reading/writing them.
-- ---------------------------------------------------------------------------

alter table public.user_settings
  drop column if exists digest_enabled,
  drop column if exists digest_time;
