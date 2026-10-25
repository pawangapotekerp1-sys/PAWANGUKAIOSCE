drop function if exists public.get_personal_weakness_diagnosis(date, date, text);

create or replace function public.get_personal_weakness_diagnosis(
  date_from date default null,
  date_to date default null,
  user_timezone text default 'UTC',
  limit_attempts integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid := auth.uid();
  safe_timezone text := coalesce(nullif(user_timezone, ''), 'UTC');
  range_start_utc timestamptz;
  range_end_utc timestamptz;
  effective_date_from date := date_from;
  effective_date_to date := date_to;
  eligible_attempt_count integer := 0;
  overall_question_count integer := 0;
  overall_accuracy numeric(5,2) := 0;
  overall_average_time_per_question numeric(10,2) := 0;
  overall_ragu_rate numeric(6,4) := 0;
  overall_answer_change_rate numeric(6,4) := 0;
  overall_correct_to_wrong_rate numeric(6,4) := 0;
  diagnosis_mode text := 'empty';
  minimum_attempts_met boolean := false;
  has_eligible_subtopic boolean := false;
  global_behavior_patterns jsonb := '[]'::jsonb;
  subtopic_rankings jsonb := '[]'::jsonb;
  basic_summary jsonb := null;
  narrative jsonb := '{}'::jsonb;
  top_topic_name text;
  top_block_name text;
  top_behavior_flags jsonb := '[]'::jsonb;
  top_confidence text;
  top_is_indicative boolean := false;
begin
  if target_user_id is null then
    raise exception 'Silakan login terlebih dahulu sebelum melihat diagnosis.'
      using errcode = '42501';
  end if;

  if limit_attempts is null and (date_from is null or date_to is null) then
    raise exception 'Rentang tanggal diagnosis harus lengkap.'
      using errcode = '22004';
  end if;

  if date_from is not null and date_to is not null and date_to < date_from then
    raise exception 'Tanggal akhir diagnosis tidak boleh lebih awal dari tanggal mulai.'
      using errcode = '22007';
  end if;

  if date_from is not null then
    range_start_utc := (date_from::timestamp at time zone safe_timezone);
  end if;
  if date_to is not null then
    range_end_utc := ((date_to + 1)::timestamp at time zone safe_timezone);
  end if;

  -- Create temporary table for eligible snapshots in scope
  drop table if exists temp_eligible_snapshots;
  create temporary table temp_eligible_snapshots on commit drop as
  select snapshot.*
  from public.attempt_diagnostic_snapshots as snapshot
  join public.exam_templates as template
    on template.id = snapshot.exam_template_id
  where snapshot.user_id = target_user_id
    and template.diagnostic_source = true
    and (range_start_utc is null or snapshot.submitted_at >= range_start_utc)
    and (range_end_utc is null or snapshot.submitted_at < range_end_utc)
  order by snapshot.submitted_at desc
  limit coalesce(limit_attempts, 2147483647);

  select
    count(*)::integer,
    coalesce(sum(snapshot.question_count), 0)::integer,
    round(
      case
        when coalesce(sum(snapshot.question_count), 0) = 0 then 0
        else (coalesce(sum(snapshot.correct_count), 0)::numeric / sum(snapshot.question_count)::numeric) * 100
      end,
      2
    ),
    round(
      case
        when coalesce(sum(snapshot.question_count), 0) = 0 then 0
        else coalesce(sum(snapshot.overall_avg_time_per_question * snapshot.question_count), 0)::numeric
          / sum(snapshot.question_count)::numeric
      end,
      2
    ),
    round(
      case
        when coalesce(sum(snapshot.question_count), 0) = 0 then 0
        else coalesce(sum(snapshot.overall_ragu_rate * snapshot.question_count), 0)::numeric
          / sum(snapshot.question_count)::numeric
      end,
      4
    ),
    round(
      case
        when coalesce(sum(snapshot.question_count), 0) = 0 then 0
        else coalesce(sum(snapshot.overall_answer_change_rate * snapshot.question_count), 0)::numeric
          / sum(snapshot.question_count)::numeric
      end,
      4
    ),
    round(
      case
        when coalesce(sum(snapshot.question_count), 0) = 0 then 0
        else coalesce(sum(snapshot.overall_correct_to_wrong_rate * snapshot.question_count), 0)::numeric
          / sum(snapshot.question_count)::numeric
      end,
      4
    ),
    coalesce(effective_date_from, (min(snapshot.submitted_at at time zone safe_timezone))::date),
    coalesce(effective_date_to, (max(snapshot.submitted_at at time zone safe_timezone))::date)
  into
    eligible_attempt_count,
    overall_question_count,
    overall_accuracy,
    overall_average_time_per_question,
    overall_ragu_rate,
    overall_answer_change_rate,
    overall_correct_to_wrong_rate,
    effective_date_from,
    effective_date_to
  from temp_eligible_snapshots as snapshot;

  -- Determine if at least one subtopic has >= 10 answered questions
  select exists (
    select 1
    from public.attempt_diagnostic_topic_snapshots as topic_snapshot
    join temp_eligible_snapshots as snapshot
      on snapshot.id = topic_snapshot.attempt_snapshot_id
    group by topic_snapshot.topic_id
    having coalesce(sum(topic_snapshot.question_count), 0) >= 10
  )
  into has_eligible_subtopic;

  diagnosis_mode := case
    when eligible_attempt_count = 0 or overall_question_count = 0 then 'empty'
    when not has_eligible_subtopic then 'basic'
    else 'full'
  end;
  minimum_attempts_met := has_eligible_subtopic;

  -- Global behavior patterns REQUIRE at least 100 answered questions
  if overall_question_count >= 100 then
    with pattern_candidates as (
      select
        4 as sort_key,
        'correct_to_wrong_switches'::text as code,
        'Sering mengubah benar menjadi salah'::text as label,
        case
          when overall_correct_to_wrong_rate >= 0.12 then 'high'
          when overall_correct_to_wrong_rate >= 0.06 then 'medium'
          when overall_correct_to_wrong_rate >= 0.02 then 'low'
          else null
        end as severity,
        format(
          '%s%% perubahan jawaban berakhir dari benar ke salah.',
          round(overall_correct_to_wrong_rate * 100, 0)::text
        ) as evidence,
        'Perubahan dari benar ke salah menunjukkan keputusan akhir sering merusak jawaban yang sebenarnya sudah tepat.'::text
          as description
      union all
      select
        3,
        'frequent_answer_changes',
        'Sering ganti jawaban',
        case
          when overall_answer_change_rate >= 0.30 then 'high'
          when overall_answer_change_rate >= 0.15 then 'medium'
          when overall_answer_change_rate >= 0.05 then 'low'
          else null
        end,
        format(
          '%s%% soal mengalami perubahan jawaban berulang.',
          round(overall_answer_change_rate * 100, 0)::text
        ),
        'Perubahan jawaban yang sering menandakan stabilitas keputusan masih belum konsisten pada rentang ini.'
      union all
      select
        2,
        'frequent_ragu',
        'Sering ragu-ragu',
        case
          when overall_ragu_rate >= 0.35 then 'high'
          when overall_ragu_rate >= 0.20 then 'medium'
          when overall_ragu_rate >= 0.10 then 'low'
          else null
        end,
        format(
          '%s%% soal sempat ditandai ragu-ragu.',
          round(overall_ragu_rate * 100, 0)::text
        ),
        'Tanda ragu-ragu yang berulang menunjukkan keyakinan konsep belum stabil saat mengerjakan try out.'
      union all
      select
        1,
        'slow_pacing',
        'Terlalu lama',
        case
          when overall_average_time_per_question >= 120 then 'high'
          when overall_average_time_per_question >= 90 then 'medium'
          when overall_average_time_per_question >= 60 then 'low'
          else null
        end,
        format(
          'Rata-rata waktu per soal berada di %s detik.',
          round(overall_average_time_per_question, 0)::text
        ),
        'Tempo pengerjaan yang lambat membuat diagnosis ini membaca ada tekanan tambahan pada proses memilih jawaban.'
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'code', code,
          'label', label,
          'severity', severity,
          'evidence', evidence,
          'description', description
        )
        order by sort_key desc
      ),
      '[]'::jsonb
    )
    into global_behavior_patterns
    from pattern_candidates
    where severity is not null;
  else
    global_behavior_patterns := '[]'::jsonb;
  end if;

  if diagnosis_mode = 'full' then
    with topic_totals as (
      select
        topic_snapshot.topic_id,
        max(topic_snapshot.topic_name) as topic_name,
        max(topic_snapshot.block_id::text)::uuid as block_id,
        max(topic_snapshot.block_name) as block_name,
        count(distinct topic_snapshot.attempt_id)::integer as attempt_coverage_count,
        coalesce(sum(topic_snapshot.question_count), 0)::integer as question_count,
        coalesce(sum(topic_snapshot.correct_count), 0)::integer as correct_count,
        coalesce(sum(topic_snapshot.wrong_count), 0)::integer as wrong_count,
        coalesce(sum(topic_snapshot.unanswered_count), 0)::integer as unanswered_count,
        coalesce(sum(topic_snapshot.avg_time_seconds * topic_snapshot.question_count), 0)::numeric as total_time_seconds,
        coalesce(sum(topic_snapshot.ragu_count), 0)::integer as ragu_count,
        coalesce(sum(topic_snapshot.answer_change_count), 0)::integer as answer_change_count,
        coalesce(sum(topic_snapshot.correct_to_wrong_count), 0)::integer as correct_to_wrong_count
      from public.attempt_diagnostic_topic_snapshots as topic_snapshot
      join temp_eligible_snapshots as snapshot
        on snapshot.id = topic_snapshot.attempt_snapshot_id
      group by topic_snapshot.topic_id
      having coalesce(sum(topic_snapshot.question_count), 0) >= 10
    ),
    computed_rankings as (
      select
        topic_totals.topic_id,
        topic_totals.topic_name,
        topic_totals.block_id,
        topic_totals.block_name,
        topic_totals.attempt_coverage_count,
        topic_totals.question_count,
        round(
          case
            when topic_totals.question_count = 0 then 0
            else (topic_totals.correct_count::numeric / topic_totals.question_count::numeric) * 100
          end,
          2
        ) as raw_accuracy,
        -- Bayesian smoothing with k=5: (correct + 5*(overall_accuracy/100)) / (total + 5) * 100
        round(
          ((topic_totals.correct_count::numeric + 5.0 * (overall_accuracy / 100.0)) / (topic_totals.question_count::numeric + 5.0)) * 100.0,
          2
        ) as smoothed_accuracy,
        round(
          case
            when topic_totals.question_count = 0 then 0
            else topic_totals.total_time_seconds / topic_totals.question_count::numeric
          end,
          2
        ) as average_time_per_question,
        round(
          case
            when topic_totals.question_count = 0 then 0
            else topic_totals.ragu_count::numeric / topic_totals.question_count::numeric
          end,
          4
        ) as ragu_rate,
        round(
          case
            when topic_totals.question_count = 0 then 0
            else topic_totals.answer_change_count::numeric / topic_totals.question_count::numeric
          end,
          4
        ) as answer_change_rate,
        round(
          case
            when topic_totals.question_count = 0 then 0
            else topic_totals.correct_to_wrong_count::numeric / topic_totals.question_count::numeric
          end,
          4
        ) as correct_to_wrong_rate,
        case
          when topic_totals.question_count < 20 then true
          else false
        end as is_indicative
      from topic_totals
    ),
    ranked_topics as (
      select
        computed.topic_id,
        computed.topic_name,
        computed.block_id,
        computed.block_name,
        computed.attempt_coverage_count,
        computed.question_count,
        computed.raw_accuracy as accuracy,
        computed.smoothed_accuracy,
        computed.average_time_per_question,
        computed.ragu_rate,
        computed.answer_change_rate,
        computed.correct_to_wrong_rate,
        computed.is_indicative,
        array_remove(
          array[
            case when computed.ragu_rate >= 0.20 then 'frequent_ragu' end,
            case
              when overall_average_time_per_question > 0
                and computed.average_time_per_question >= overall_average_time_per_question * 1.15
                then 'slow_pacing'
            end,
            case when computed.answer_change_rate >= 0.15 then 'frequent_answer_changes' end,
            case when computed.correct_to_wrong_rate >= 0.06 then 'correct_to_wrong_switches' end
          ],
          null
        ) as behavior_flags,
        case
          when computed.question_count >= 20 and computed.attempt_coverage_count >= 3 then 'high'
          when computed.question_count >= 10 then 'medium'
          else 'low'
        end as confidence,
        -- Weakness score incorporates smoothed accuracy: (100 - smoothed_accuracy)*0.70 + behavior penalties
        round(
          ((100 - computed.smoothed_accuracy) * 0.70)
          + (
            least(
              greatest(
                case
                  when overall_average_time_per_question <= 0 then 0
                  else (computed.average_time_per_question / overall_average_time_per_question) - 1
                end,
                0
              ),
              1
            ) * 100 * 0.075
          )
          + (computed.ragu_rate * 100 * 0.075)
          + (least(computed.answer_change_rate, 1) * 100 * 0.06)
          + (least(computed.correct_to_wrong_rate, 1) * 100 * 0.09),
          2
        ) as weakness_score
      from computed_rankings as computed
    ),
    serialized_rankings as (
      select
        row_number() over (
          order by
            ranked.is_indicative asc, -- Primary (>=20 questions) first
            ranked.weakness_score desc,
            ranked.accuracy asc,
            ranked.question_count desc,
            ranked.topic_name asc
        )::integer as rank,
        ranked.*
      from ranked_topics as ranked
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'topicId', serialized.topic_id,
          'topicName', serialized.topic_name,
          'blockId', serialized.block_id,
          'blockName', serialized.block_name,
          'rank', serialized.rank,
          'weaknessScore', serialized.weakness_score,
          'confidence', serialized.confidence,
          'questionCount', serialized.question_count,
          'attemptCoverageCount', serialized.attempt_coverage_count,
          'accuracy', serialized.accuracy,
          'smoothedAccuracy', serialized.smoothed_accuracy,
          'isIndicative', serialized.is_indicative,
          'averageTimePerQuestion', serialized.average_time_per_question,
          'behaviorFlags', to_jsonb(serialized.behavior_flags),
          'summary',
            case
              when serialized.is_indicative then
                format(
                  '%s (indikatif - %s soal): akurasi %s%% (dihaluskan %s%%). Data masih terbatas untuk ranking utama.',
                  serialized.topic_name,
                  serialized.question_count,
                  round(serialized.accuracy, 0)::text,
                  round(serialized.smoothed_accuracy, 0)::text
                )
              when coalesce(array_length(serialized.behavior_flags, 1), 0) = 0 then
                format(
                  '%s menjadi subtopik lemah pada rentang ini terutama karena akurasi berada di %s%% (dihaluskan %s%%).',
                  serialized.topic_name,
                  round(serialized.accuracy, 0)::text,
                  round(serialized.smoothed_accuracy, 0)::text
                )
              else
                format(
                  '%s menjadi subtopik lemah pada rentang ini karena akurasi %s%% (dihaluskan %s%%) dan disertai pola %s.',
                  serialized.topic_name,
                  round(serialized.accuracy, 0)::text,
                  round(serialized.smoothed_accuracy, 0)::text,
                  array_to_string(
                    array_remove(
                      array[
                        case when 'frequent_ragu' = any(serialized.behavior_flags) then 'sering ragu-ragu' end,
                        case when 'slow_pacing' = any(serialized.behavior_flags) then 'terlalu lama' end,
                        case when 'frequent_answer_changes' = any(serialized.behavior_flags) then 'sering ganti jawaban' end,
                        case when 'correct_to_wrong_switches' = any(serialized.behavior_flags) then 'mengubah benar menjadi salah' end
                      ],
                      null
                    ),
                    ', '
                  )
                )
            end
        )
        order by serialized.rank
      ),
      '[]'::jsonb
    )
    into subtopic_rankings
    from serialized_rankings as serialized;
  end if;

  if diagnosis_mode = 'basic' then
    with observed_topics as (
      select
        topic_snapshot.topic_name,
        sum(topic_snapshot.question_count)::integer as question_count
      from public.attempt_diagnostic_topic_snapshots as topic_snapshot
      join temp_eligible_snapshots as snapshot
        on snapshot.id = topic_snapshot.attempt_snapshot_id
      group by topic_snapshot.topic_name
      order by question_count desc, topic_snapshot.topic_name asc
    )
    select jsonb_build_object(
      'message',
      format(
        'Diagnosis membutuhkan minimal 1 subtopik dengan minimal 10 soal terjawab. Rentang ini memiliki %s soal terjawab dari %s try out, namun belum ada subtopik yang memenuhi batas minimal.',
        overall_question_count,
        eligible_attempt_count
      ),
      'eligibleAttemptCount', eligible_attempt_count,
      'overallAccuracy', overall_accuracy,
      'observedTopics',
      coalesce((select jsonb_agg(observed.topic_name) from observed_topics as observed), '[]'::jsonb),
      'globalBehaviorPatterns', global_behavior_patterns
    )
    into basic_summary;
  end if;

  if diagnosis_mode = 'full' and jsonb_array_length(subtopic_rankings) > 0 then
    top_topic_name := subtopic_rankings -> 0 ->> 'topicName';
    top_block_name := coalesce(subtopic_rankings -> 0 ->> 'blockName', 'Tanpa blok');
    top_behavior_flags := coalesce(subtopic_rankings -> 0 -> 'behaviorFlags', '[]'::jsonb);
    top_confidence := coalesce(subtopic_rankings -> 0 ->> 'confidence', 'low');
    top_is_indicative := coalesce((subtopic_rankings -> 0 ->> 'isIndicative')::boolean, false);

    narrative := jsonb_build_object(
      'headline',
      format(
        'Kelemahan paling konsisten pada rentang ini muncul di %s, terutama %s%s.',
        top_block_name,
        top_topic_name,
        case when top_is_indicative then ' (indikatif)' else '' end
      ),
      'body',
      format(
        'Akurasi %s berada di %s%% dengan confidence %s (%s soal terjawab).',
        top_topic_name,
        round(coalesce((subtopic_rankings -> 0 ->> 'accuracy')::numeric, 0), 0)::text,
        top_confidence,
        subtopic_rankings -> 0 ->> 'questionCount'
      ),
      'nextReadiness',
      format(
        'Diagnosis ini disusun dari %s soal terjawab pada %s try out sumber diagnosis.',
        overall_question_count,
        eligible_attempt_count
      )
    );
  elsif diagnosis_mode = 'basic' then
    narrative := jsonb_build_object(
      'headline', 'Data diagnosis belum cukup untuk analisis kelemahan.',
      'body',
      format(
        'Rentang ini memiliki %s soal terjawab dari %s try out, namun belum ada subtopik yang mencapai minimal 10 soal.',
        overall_question_count,
        eligible_attempt_count
      ),
      'nextReadiness', 'Tambah pengerjaan try out besar lagi agar sampel subtopik mencapai batas minimal 10 soal untuk analisis kelemahan.'
    );
  else
    narrative := jsonb_build_object(
      'headline', 'Belum ada data diagnosis pada rentang ini.',
      'body', 'Tidak ada try out besar yang submitted dari template sumber diagnosis pada rentang tanggal yang dipilih.',
      'nextReadiness', 'Jalankan try out besar lalu pilih rentang yang memuat hasil submit tersebut untuk melihat diagnosis.'
    );
  end if;

  return jsonb_build_object(
    'summary',
    jsonb_build_object(
      'rangeStart', effective_date_from,
      'rangeEnd', effective_date_to,
      'timezone', safe_timezone,
      'eligibleAttemptCount', eligible_attempt_count,
      'minimumAttemptsMet', minimum_attempts_met,
      'diagnosisMode', diagnosis_mode,
      'overallAccuracy', overall_accuracy,
      'overallAverageTimePerQuestion', overall_average_time_per_question,
      'overallQuestionCount', overall_question_count
    ),
    'globalBehaviorPatterns', global_behavior_patterns,
    'subtopicRankings', subtopic_rankings,
    'basicSummary', basic_summary,
    'narrative', narrative
  );
end;
$$;

revoke all on function public.get_personal_weakness_diagnosis(date, date, text, integer) from public, anon;
grant execute on function public.get_personal_weakness_diagnosis(date, date, text, integer) to authenticated;
grant execute on function public.get_personal_weakness_diagnosis(date, date, text, integer) to service_role;
