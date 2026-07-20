-- Scoutbase schema — phase 1
-- Single-user app. Every table carries owner_id uuid, set automatically to
-- auth.uid() on insert via a trigger, and every table has RLS restricting
-- all access to rows where owner_id = auth.uid(). See spec §4 and §11.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared helper functions
-- ---------------------------------------------------------------------------

create or replace function public.set_owner_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is null then
    new.owner_id := auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4.1 roles
-- ---------------------------------------------------------------------------

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  key text not null unique check (key in ('gsl', 'explorers', 'both')),
  label text not null,
  color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4.2 milestones
-- ---------------------------------------------------------------------------

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  role_key text not null references public.roles (key),
  title text not null,
  description text,
  theme text,
  target_date date,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'complete', 'parked')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4.5 recurrences (created before actions, which reference it)
-- ---------------------------------------------------------------------------

create table public.recurrences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  role_key text not null references public.roles (key),
  title text not null,
  category text not null default 'other'
    check (category in ('governance', 'people', 'comms', 'programme', 'admin', 'other')),
  effort text not null default 'medium'
    check (effort in ('quick', 'medium', 'big')),
  notes text,
  rule text not null check (rule in ('weekly', 'monthly', 'termly', 'yearly')),
  byweekday int,
  bymonthday int,
  month int,
  day int,
  next_due date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4.3 actions
-- ---------------------------------------------------------------------------

create table public.actions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  role_key text not null references public.roles (key),
  milestone_id uuid references public.milestones (id) on delete set null,
  title text not null,
  notes text,
  category text not null default 'other'
    check (category in ('governance', 'people', 'comms', 'programme', 'admin', 'other')),
  priority text not null default 'normal'
    check (priority in ('urgent', 'high', 'normal', 'low')),
  effort text not null default 'medium'
    check (effort in ('quick', 'medium', 'big')),
  status text not null default 'open'
    check (status in ('open', 'waiting', 'done', 'archived')),
  due_date date,
  waiting_on text,
  waiting_since date,
  source text not null default 'manual'
    check (source in ('manual', 'brain_dump', 'email', 'recurring')),
  source_ref text,
  completed_at timestamptz,
  snoozed_until date,
  recurrence_id uuid references public.recurrences (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index actions_owner_status_idx on public.actions (owner_id, status);
create index actions_owner_role_idx on public.actions (owner_id, role_key);
create index actions_milestone_idx on public.actions (milestone_id);

-- ---------------------------------------------------------------------------
-- 4.4 subtasks
-- ---------------------------------------------------------------------------

create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  action_id uuid not null references public.actions (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subtasks_action_idx on public.subtasks (action_id);

-- ---------------------------------------------------------------------------
-- 4.6 inbox_items
-- ---------------------------------------------------------------------------

create table public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  raw_text text not null,
  source text not null default 'brain_dump' check (source in ('brain_dump', 'email')),
  email_subject text,
  email_from text,
  ai_proposal jsonb,
  status text not null default 'pending' check (status in ('pending', 'processed', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inbox_items_owner_status_idx on public.inbox_items (owner_id, status);

-- ---------------------------------------------------------------------------
-- 4.7 contacts
-- ---------------------------------------------------------------------------

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  role_key text not null references public.roles (key),
  name text not null,
  role_title text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4.8 meeting_notes
-- ---------------------------------------------------------------------------

create table public.meeting_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  role_key text not null references public.roles (key),
  title text not null,
  meeting_date date,
  body text,
  attendees text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4.9 decisions
-- ---------------------------------------------------------------------------

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  role_key text not null references public.roles (key),
  title text not null,
  decided_on date,
  decided_by text,
  detail text,
  meeting_note_id uuid references public.meeting_notes (id) on delete set null,
  superseded_by uuid references public.decisions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4.10 resources
-- ---------------------------------------------------------------------------

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  role_key text not null references public.roles (key),
  title text not null,
  url text,
  category text not null default 'other'
    check (category in ('policy', 'osm', 'risk-assessment', 'template', 'other')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4.11 push_subscriptions
-- ---------------------------------------------------------------------------

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  endpoint text not null unique,
  keys jsonb not null,
  device_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4.12 digest_log
-- ---------------------------------------------------------------------------

create table public.digest_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  sent_at timestamptz not null default now(),
  summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Triggers: owner_id + updated_at on every table
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'roles', 'milestones', 'recurrences', 'actions', 'subtasks',
    'inbox_items', 'contacts', 'meeting_notes', 'decisions', 'resources',
    'push_subscriptions', 'digest_log'
  ]
  loop
    execute format(
      'create trigger %I_set_owner_id before insert on public.%I
         for each row execute function public.set_owner_id();', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security — every table restricted to owner_id = auth.uid()
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'roles', 'milestones', 'recurrences', 'actions', 'subtasks',
    'inbox_items', 'contacts', 'meeting_notes', 'decisions', 'resources',
    'push_subscriptions', 'digest_log'
  ]
  loop
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
