-- Scoutbase schema — migration 0005: "Personal" focus mode.
--
-- The 'both' role (§3, roles.key = 'both') is now surfaced in the UI as
-- "Personal" and gets its own Focus mode toggle option, alongside All/GSL/
-- Explorers. This only touches user_settings.focus_default's check
-- constraint — the roles.label value is cosmetic and already updated by
-- the app/seed script, not by migration.

alter table public.user_settings
  drop constraint if exists user_settings_focus_default_check;

alter table public.user_settings
  add constraint user_settings_focus_default_check
  check (focus_default in ('All', 'GSL', 'Explorers', 'Personal'));

update public.roles set label = 'Personal' where key = 'both';
