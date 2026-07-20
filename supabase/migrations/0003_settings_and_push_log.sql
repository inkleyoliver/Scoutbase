-- Scoutbase schema — phase 9 (digest email + push notifications)
-- Two additions not explicitly named as tables in spec §4 but required to
-- implement §7.6 (digest on/off, digest time, focus default) and §8.2 (push
-- hard cap of 2/day, "max one push per item ever" for waiting-on chases):
--   - user_settings: one row per owner, simple key/value-ish settings.
--   - push_log: a record of every push actually sent, so cron runs can
--     enforce the daily cap and the once-ever-per-item rule without
--     re-deriving it from push payload history.

create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique,
  digest_enabled boolean not null default true,
  digest_time text not null default '07:00',
  focus_default text not null default 'All' check (focus_default in ('All', 'GSL', 'Explorers')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.push_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  kind text not null check (kind in ('due_today', 'urgent', 'waiting_chase')),
  ref_id uuid,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_log_owner_sent_idx on public.push_log (owner_id, sent_at);
create index push_log_owner_kind_ref_idx on public.push_log (owner_id, kind, ref_id);

do $$
declare
  t text;
begin
  foreach t in array array['user_settings', 'push_log']
  loop
    execute format(
      'create trigger %I_set_owner_id before insert on public.%I
         for each row execute function public.set_owner_id();', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t, t);
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy %I_owner_select on public.%I
         for select using (owner_id = auth.uid());', t, t);
    execute format(
      'create policy %I_owner_insert on public.%I
         for insert with check (owner_id = auth.uid() or owner_id is null);', t, t);
    execute format(
      'create policy %I_owner_update on public.%I
         for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());', t, t);
    execute format(
      'create policy %I_owner_delete on public.%I
         for delete using (owner_id = auth.uid());', t, t);
  end loop;
end $$;
