alter table public.attempt_item_behavior_metrics enable row level security;
alter table public.attempt_answer_change_events enable row level security;
alter table public.attempt_diagnostic_snapshots enable row level security;
alter table public.attempt_diagnostic_topic_snapshots enable row level security;

drop policy if exists "attempt_item_behavior_metrics_select_own_or_admin" on public.attempt_item_behavior_metrics;
create policy "attempt_item_behavior_metrics_select_own_or_admin"
on public.attempt_item_behavior_metrics
for select
using (
  exists (
    select 1
    from public.attempts
    where attempts.id = attempt_item_behavior_metrics.attempt_id
      and (
        attempts.user_id = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists "attempt_item_behavior_metrics_write_admin" on public.attempt_item_behavior_metrics;
create policy "attempt_item_behavior_metrics_write_admin"
on public.attempt_item_behavior_metrics
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "attempt_answer_change_events_select_own_or_admin" on public.attempt_answer_change_events;
create policy "attempt_answer_change_events_select_own_or_admin"
on public.attempt_answer_change_events
for select
using (
  exists (
    select 1
    from public.attempts
    where attempts.id = attempt_answer_change_events.attempt_id
      and (
        attempts.user_id = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists "attempt_answer_change_events_write_admin" on public.attempt_answer_change_events;
create policy "attempt_answer_change_events_write_admin"
on public.attempt_answer_change_events
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "attempt_diagnostic_snapshots_select_own_or_admin" on public.attempt_diagnostic_snapshots;
create policy "attempt_diagnostic_snapshots_select_own_or_admin"
on public.attempt_diagnostic_snapshots
for select
using (
  user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "attempt_diagnostic_snapshots_write_admin" on public.attempt_diagnostic_snapshots;
create policy "attempt_diagnostic_snapshots_write_admin"
on public.attempt_diagnostic_snapshots
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

drop policy if exists "attempt_diagnostic_topic_snapshots_select_own_or_admin" on public.attempt_diagnostic_topic_snapshots;
create policy "attempt_diagnostic_topic_snapshots_select_own_or_admin"
on public.attempt_diagnostic_topic_snapshots
for select
using (
  exists (
    select 1
    from public.attempts
    where attempts.id = attempt_diagnostic_topic_snapshots.attempt_id
      and (
        attempts.user_id = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists "attempt_diagnostic_topic_snapshots_write_admin" on public.attempt_diagnostic_topic_snapshots;
create policy "attempt_diagnostic_topic_snapshots_write_admin"
on public.attempt_diagnostic_topic_snapshots
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);
