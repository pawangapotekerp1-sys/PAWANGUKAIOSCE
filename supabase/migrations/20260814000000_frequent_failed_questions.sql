create or replace function public.get_frequent_failed_questions(
  date_from date,
  date_to date,
  user_timezone text
)
returns table (
  question_stem text,
  topic_name text,
  fail_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid := auth.uid();
  safe_timezone text := coalesce(nullif(user_timezone, ''), 'UTC');
  range_start_utc timestamptz;
  range_end_utc timestamptz;
begin
  if target_user_id is null then
    raise exception 'Silakan login terlebih dahulu sebelum melihat diagnosis.'
      using errcode = '42501';
  end if;

  if date_from is null or date_to is null then
    raise exception 'Rentang tanggal diagnosis harus lengkap.'
      using errcode = '22004';
  end if;

  if date_to < date_from then
    raise exception 'Tanggal akhir diagnosis tidak boleh lebih awal dari tanggal mulai.'
      using errcode = '22007';
  end if;

  range_start_utc := (date_from::timestamp at time zone safe_timezone);
  range_end_utc := ((date_to + 1)::timestamp at time zone safe_timezone);

  return query
  select
    item.question_stem,
    topic.name as topic_name,
    count(*) as fail_count
  from public.attempts a
  join public.exam_templates et on et.id = a.exam_template_id
  join public.attempt_items item on item.attempt_id = a.id
  join public.answers ans on ans.attempt_item_id = item.id
  left join public.topics topic on topic.id = item.topic_id
  where a.user_id = target_user_id
    and et.diagnostic_source = true
    and a.submitted_at >= range_start_utc
    and a.submitted_at < range_end_utc
    and (ans.selected_option_key is null or ans.selected_option_key != item.correct_option_key)
  group by item.question_stem, topic.name
  order by count(*) desc
  limit 15;
end;
$$;

revoke all on function public.get_frequent_failed_questions(date, date, text) from public, anon;
grant execute on function public.get_frequent_failed_questions(date, date, text) to authenticated;
grant execute on function public.get_frequent_failed_questions(date, date, text) to service_role;
