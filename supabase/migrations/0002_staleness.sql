-- Scoutbase schema — phase 8 (staleness flags + auto-archive)
-- Adds `last_activity_at` to actions so we can detect "untouched for 21+
-- days" (§7.3) independently of `updated_at`, which also ticks on rows the
-- system itself modifies (e.g. snooze). last_activity_at only advances on
-- status change, notes edit, or a subtask change — the "is this still
-- real" signal, not "was this row touched at all".

alter table public.actions
  add column last_activity_at timestamptz not null default now();

update public.actions set last_activity_at = updated_at;

create index actions_owner_status_activity_idx
  on public.actions (owner_id, status, last_activity_at);

-- ---------------------------------------------------------------------------
-- Touch last_activity_at when status or notes change on the action itself.
-- ---------------------------------------------------------------------------

create or replace function public.touch_action_activity()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'UPDATE') and (new.status is distinct from old.status or new.notes is distinct from old.notes) then
    new.last_activity_at := now();
  end if;
  return new;
end;
$$;

create trigger actions_touch_activity
  before update on public.actions
  for each row execute function public.touch_action_activity();

-- ---------------------------------------------------------------------------
-- Touch the parent action's last_activity_at when a subtask changes.
-- ---------------------------------------------------------------------------

create or replace function public.touch_action_activity_from_subtask()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'DELETE') then
    update public.actions set last_activity_at = now() where id = old.action_id;
    return old;
  else
    update public.actions set last_activity_at = now() where id = new.action_id;
    return new;
  end if;
end;
$$;

create trigger subtasks_touch_action_activity
  after insert or update or delete on public.subtasks
  for each row execute function public.touch_action_activity_from_subtask();
