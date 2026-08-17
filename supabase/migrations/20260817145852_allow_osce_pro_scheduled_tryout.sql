create or replace function public.start_scheduled_tryout_attempt(
  target_event_id uuid
)
returns public.scheduled_tryout_attempts
language plpgsql
security definer
set search_path = public
as $body$
declare
  event_row public.scheduled_tryout_events%rowtype;
  active_attempt public.scheduled_tryout_attempts%rowtype;
  created_attempt public.scheduled_tryout_attempts%rowtype;
  submitted_attempt_count integer;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum memulai try out terjadwal.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text in ('pro', 'mentor', 'osce_pro')
  ) then
    raise exception 'Akses mulai try out terjadwal hanya tersedia untuk pengguna pro, osce_pro, atau mentor.'
      using errcode = '42501';
  end if;

  select *
  into event_row
  from public.scheduled_tryout_events
  where id = target_event_id
    and editorial_status = 'published'
    and access_start_at <= timezone('utc', now())
    and access_end_at > timezone('utc', now());

  if not found then
    raise exception 'Event try out terjadwal tidak aktif atau belum dipublikasikan.'
      using errcode = 'P0002';
  end if;

  select *
  into active_attempt
  from public.scheduled_tryout_attempts
  where event_id = event_row.id
    and event_cycle = event_row.current_cycle
    and user_id = auth.uid()
    and status in ('in_progress', 'paused')
  order by created_at desc, id desc
  limit 1;

  if found then
    perform public.sync_scheduled_tryout_attempt(active_attempt.id);

    select *
    into active_attempt
    from public.scheduled_tryout_attempts
    where id = active_attempt.id;

    return active_attempt;
  end if;

  select count(*)
  into submitted_attempt_count
  from public.scheduled_tryout_attempts
  where event_id = event_row.id
    and event_cycle = event_row.current_cycle
    and user_id = auth.uid()
    and status = 'submitted';

  if submitted_attempt_count >= 5 then
    raise exception 'Batas attempt untuk event try out terjadwal ini sudah habis.'
      using errcode = 'P0001';
  end if;

  begin
    insert into public.scheduled_tryout_attempts (
      event_id,
      event_cycle,
      user_id,
      status,
      started_at,
      time_limit_seconds,
      elapsed_seconds,
      last_resumed_at,
      paused_at,
      total_questions
    )
    values (
      event_row.id,
      event_row.current_cycle,
      auth.uid(),
      'in_progress',
      timezone('utc', now()),
      0,
      0,
      timezone('utc', now()),
      null,
      0
    )
    returning *
    into created_attempt;
  exception
    when unique_violation then
      select *
      into active_attempt
      from public.scheduled_tryout_attempts
      where event_id = event_row.id
        and event_cycle = event_row.current_cycle
        and user_id = auth.uid()
        and status in ('in_progress', 'paused')
      order by created_at desc, id desc
      limit 1;

      if found then
        perform public.sync_scheduled_tryout_attempt(active_attempt.id);

        select *
        into active_attempt
        from public.scheduled_tryout_attempts
        where id = active_attempt.id;

        return active_attempt;
      end if;

      raise;
  end;

  perform public.sync_scheduled_tryout_attempt(created_attempt.id);

  select *
  into created_attempt
  from public.scheduled_tryout_attempts
  where id = created_attempt.id;

  return created_attempt;
end;
$body$;

revoke all on function public.start_scheduled_tryout_attempt(uuid) from public;
grant execute on function public.start_scheduled_tryout_attempt(uuid) to authenticated;
grant execute on function public.start_scheduled_tryout_attempt(uuid) to service_role;
