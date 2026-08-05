do $$
declare
  admin_user_id constant uuid := '11111111-1111-1111-1111-111111111111';
  pro_user_id constant uuid := '22222222-2222-2222-2222-222222222222';
  mentor_user_id constant uuid := '44444444-4444-4444-4444-444444444444';
  pendaftar_user_id constant uuid := '33333333-3333-3333-3333-333333333333';
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
  )
  values
    (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      'admin@pawang.test',
      crypt('Admin12345!', gen_salt('bf')),
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      '',
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Admin Pawang"}'::jsonb,
      false,
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      pro_user_id,
      'authenticated',
      'authenticated',
      'pro@pawang.test',
      crypt('Pro12345!', gen_salt('bf')),
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      '',
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Siswa Pro"}'::jsonb,
      false,
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      mentor_user_id,
      'authenticated',
      'authenticated',
      'mentor@pawang.test',
      crypt('Mentor12345!', gen_salt('bf')),
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      '',
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Mentor Pawang"}'::jsonb,
      false,
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      pendaftar_user_id,
      'authenticated',
      'authenticated',
      'baru@pawang.test',
      crypt('Baru12345!', gen_salt('bf')),
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      '',
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Pendaftar Baru"}'::jsonb,
      false,
      timezone('utc', now()),
      timezone('utc', now())
    )
  on conflict (id) do update
  set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = excluded.updated_at;

  insert into auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values
    (
      admin_user_id,
      admin_user_id::text,
      admin_user_id,
      format('{"sub":"%s","email":"%s"}', admin_user_id, 'admin@pawang.test')::jsonb,
      'email',
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      pro_user_id,
      pro_user_id::text,
      pro_user_id,
      format('{"sub":"%s","email":"%s"}', pro_user_id, 'pro@pawang.test')::jsonb,
      'email',
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      mentor_user_id,
      mentor_user_id::text,
      mentor_user_id,
      format('{"sub":"%s","email":"%s"}', mentor_user_id, 'mentor@pawang.test')::jsonb,
      'email',
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      pendaftar_user_id,
      pendaftar_user_id::text,
      pendaftar_user_id,
      format('{"sub":"%s","email":"%s"}', pendaftar_user_id, 'baru@pawang.test')::jsonb,
      'email',
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    )
  on conflict (provider, provider_id) do update
  set
    identity_data = excluded.identity_data,
    updated_at = excluded.updated_at,
    last_sign_in_at = excluded.last_sign_in_at;

  update public.profiles
  set role = 'admin'
  where id = admin_user_id;

  update public.profiles
  set role = 'pro'
  where id = pro_user_id;

  update public.profiles
  set role = 'mentor'
  where id = mentor_user_id;

  update public.profiles
  set role = 'pendaftar_baru'
  where id = pendaftar_user_id;
end
$$;

insert into public.blocks (id, slug, name, sort_order)
values
  ('44444444-4444-4444-4444-444444444441', 'clinical-science', 'Clinical Science', 1),
  ('44444444-4444-4444-4444-444444444442', 'pharmaceutical-science', 'Pharmaceutical Science', 2),
  ('44444444-4444-4444-4444-444444444443', 'social-behavior-administrative', 'Social, Behavioral, and Administrative', 3)
on conflict (id) do update
set
  slug = excluded.slug,
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into public.topics (id, block_id, slug, name, sort_order)
values
  ('55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444441', 'antiinfeksi-antivirus-antiparasit', 'Antiinfeksi, Antivirus dan Antiparasit', 1),
  ('55555555-5555-5555-5555-555555555562', '44444444-4444-4444-4444-444444444441', 'biologi-sel', 'Biologi Sel', 2),
  ('55555555-5555-5555-5555-555555555553', '44444444-4444-4444-4444-444444444441', 'endokrin-dan-tiroid', 'Endokrin dan Tiroid', 3),
  ('55555555-5555-5555-5555-555555555566', '44444444-4444-4444-4444-444444444441', 'farmakokinetik-interaksi-obat-dan-antidotum', 'Farmakokinetik, Interaksi Obat dan Antidotum', 4),
  ('55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', 'kardiologi', 'Kardiologi', 5),
  ('55555555-5555-5555-5555-555555555554', '44444444-4444-4444-4444-444444444441', 'mata-kulit-tulang-dan-sendi', 'Mata, Kulit, Tulang dan Sendi', 6),
  ('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444441', 'pernafasan-dan-pencernaan', 'Pernafasan dan Pencernaan', 7),
  ('55555555-5555-5555-5555-555555555556', '44444444-4444-4444-4444-444444444442', 'konsep-dasar-perhitungan-dan-konsentrasi', 'Konsep Dasar Perhitungan & Konsentrasi', 1),
  ('55555555-5555-5555-5555-555555555557', '44444444-4444-4444-4444-444444444442', 'sediaan-solid', 'Sediaan Solid', 2),
  ('55555555-5555-5555-5555-555555555558', '44444444-4444-4444-4444-444444444442', 'sediaan-semi-solid', 'Sediaan Semi Solid', 3),
  ('55555555-5555-5555-5555-555555555559', '44444444-4444-4444-4444-444444444442', 'sediaan-liquid-dan-sediaan-steril', 'Sediaan Liquid dan Sediaan steril', 4),
  ('55555555-5555-5555-5555-555555555560', '44444444-4444-4444-4444-444444444442', 'kimia-dasar-dan-kimia-analisis', 'Kimia Dasar dan Kimia Analisis', 5),
  ('55555555-5555-5555-5555-555555555563', '44444444-4444-4444-4444-444444444443', 'standar-pelayanan-kefarmasian', 'Standar Pelayanan Kefarmasian', 1),
  ('55555555-5555-5555-5555-555555555564', '44444444-4444-4444-4444-444444444443', 'farmakoekonomi', 'Farmakoekonomi', 2),
  ('55555555-5555-5555-5555-555555555565', '44444444-4444-4444-4444-444444444443', 'pelayanan-farmasi-klinis', 'Pelayanan Farmasi Klinis', 3),
  ('55555555-5555-5555-5555-555555555561', '44444444-4444-4444-4444-444444444442', 'bahan-alam-farmasi', 'Bahan Alam Farmasi', 6)
on conflict (id) do update
set
  block_id = excluded.block_id,
  slug = excluded.slug,
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into public.question_sources (
  id,
  title,
  source_type,
  reference_label,
  metadata
)
values
  (
    '99999999-9999-9999-9999-999999999901',
    'Kurasi editorial internal',
    'manual',
    'bank-soal-awal',
    '{"owner":"editorial"}'::jsonb
  )
on conflict (id) do update
set
  title = excluded.title,
  source_type = excluded.source_type,
  reference_label = excluded.reference_label,
  metadata = excluded.metadata;

insert into public.questions (
  id,
  stem,
  block_id,
  topic_id,
  source_id,
  difficulty_level,
  status,
  published_at,
  created_by,
  updated_by
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'Pasien hipertensi dengan edema perifer datang untuk evaluasi ulang. Intervensi terapi awal mana yang paling rasional untuk ditinjau lebih dulu sebelum kombinasi lanjutan diberikan?',
    '44444444-4444-4444-4444-444444444441',
    '55555555-5555-5555-5555-555555555551',
    '99999999-9999-9999-9999-999999999901',
    2,
    'published',
    timezone('utc', now()) - interval '7 days',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'Pada evaluasi sediaan steril, indikator apa yang paling langsung menunjukkan kemungkinan masalah pada proses aseptik?',
    '44444444-4444-4444-4444-444444444442',
    '55555555-5555-5555-5555-555555555559',
    '99999999-9999-9999-9999-999999999901',
    2,
    'published',
    timezone('utc', now()) - interval '7 days',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'Dokumentasi intervensi farmasis akan paling berguna bila rekomendasi obat ditautkan dengan elemen apa?',
    '44444444-4444-4444-4444-444444444443',
    '55555555-5555-5555-5555-555555555563',
    '99999999-9999-9999-9999-999999999901',
    1,
    'published',
    timezone('utc', now()) - interval '7 days',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    'Pada review kasus gagal jantung, parameter apa yang perlu dipantau paling awal setelah optimasi terapi awal dimulai?',
    '44444444-4444-4444-4444-444444444441',
    '55555555-5555-5555-5555-555555555551',
    '99999999-9999-9999-9999-999999999901',
    2,
    'draft',
    null,
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111'
  )
on conflict (id) do update
set
  stem = excluded.stem,
  block_id = excluded.block_id,
  topic_id = excluded.topic_id,
  source_id = excluded.source_id,
  difficulty_level = excluded.difficulty_level,
  status = excluded.status,
  published_at = excluded.published_at,
  updated_by = excluded.updated_by,
  updated_at = timezone('utc', now());

insert into public.question_options (
  id,
  question_id,
  option_key,
  option_text,
  is_correct,
  sort_order
)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb101', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'A', 'Calcium channel blocker tunggal', false, 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb102', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'B', 'ACE inhibitor sebagai dasar titrasi awal', true, 2),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb103', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'C', 'Diuretik loop sebagai monoterapi jangka panjang', false, 3),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb104', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'D', 'Beta blocker dosis tinggi tanpa evaluasi fungsi ginjal', false, 4),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb201', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'A', 'Perubahan pH akhir sediaan', false, 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb202', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'B', 'Hasil media fill dan monitoring lingkungan proses', true, 2),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb203', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'C', 'Warna kemasan sekunder', false, 3),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb204', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'D', 'Tebal label produk', false, 4),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb301', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'A', 'Promo produk yang sedang berlaku', false, 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb302', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'B', 'Preferensi warna kemasan pasien', false, 2),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb303', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'C', 'Tujuan klinis dan hasil monitoring', true, 3),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb304', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'D', 'Jumlah stok gudang', false, 4),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb401', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'A', 'Frekuensi ganti kemasan obat', false, 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb402', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'B', 'Tekanan darah, gejala, dan toleransi terapi', true, 2),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb403', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'C', 'Desain poster edukasi pasien', false, 3),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb404', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'D', 'Warna kartu kontrol', false, 4)
on conflict (id) do update
set
  question_id = excluded.question_id,
  option_key = excluded.option_key,
  option_text = excluded.option_text,
  is_correct = excluded.is_correct,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

insert into public.question_explanations (
  id,
  question_id,
  explanation,
  explanation_source,
  created_by,
  updated_by
)
values
  (
    'cccccccc-cccc-cccc-cccc-ccccccccc101',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'ACE inhibitor layak ditinjau sebagai dasar titrasi karena memberi arah evaluasi yang lebih stabil sebelum terapi diperluas.',
    'manual',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccc102',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'Media fill dan monitoring lingkungan paling langsung membaca kualitas proses aseptik dibanding indikator kosmetik produk.',
    'manual',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccc103',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'Dokumentasi yang ditautkan ke tujuan klinis dan hasil monitoring lebih mudah dipakai untuk follow-up dan evaluasi mutu layanan.',
    'manual',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111'
  )
on conflict (id) do update
set
  question_id = excluded.question_id,
  explanation = excluded.explanation,
  explanation_source = excluded.explanation_source,
  updated_by = excluded.updated_by,
  updated_at = timezone('utc', now());

with generated_question_rows as (
  select
    (
      substr(question_hash, 1, 8)
      || '-' || substr(question_hash, 9, 4)
      || '-' || substr(question_hash, 13, 4)
      || '-' || substr(question_hash, 17, 4)
      || '-' || substr(question_hash, 21, 12)
    )::uuid as question_id,
    topic_rows.block_id,
    topic_rows.topic_id,
    topic_rows.topic_name,
    topic_rows.block_name,
    topic_rows.series_number,
    format(
      'Pada latihan %s nomor %s, langkah farmasis mana yang paling tepat diprioritaskan lebih dulu untuk menjaga keputusan tetap rasional?',
      topic_rows.topic_name,
      topic_rows.series_number
    ) as stem,
    ((topic_rows.series_number - 1) % 3 + 1)::smallint as difficulty_level
  from (
    select
      topics.id as topic_id,
      topics.name as topic_name,
      topics.block_id,
      blocks.name as block_name,
      series.number as series_number,
      md5(format('generated-question-%s-%s', topics.id, series.number)) as question_hash
    from public.topics
    join public.blocks on blocks.id = topics.block_id
    cross join generate_series(1, 20) as series(number)
  ) as topic_rows
)
insert into public.questions (
  id,
  stem,
  block_id,
  topic_id,
  source_id,
  difficulty_level,
  status,
  published_at,
  created_by,
  updated_by
)
select
  question_id,
  stem,
  block_id,
  topic_id,
  '99999999-9999-9999-9999-999999999901',
  difficulty_level,
  'published',
  timezone('utc', now()) - make_interval(days => series_number),
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111'
from generated_question_rows
on conflict (id) do update
set
  stem = excluded.stem,
  block_id = excluded.block_id,
  topic_id = excluded.topic_id,
  source_id = excluded.source_id,
  difficulty_level = excluded.difficulty_level,
  status = excluded.status,
  published_at = excluded.published_at,
  updated_by = excluded.updated_by,
  updated_at = timezone('utc', now());

with generated_question_rows as (
  select
    (
      substr(question_hash, 1, 8)
      || '-' || substr(question_hash, 9, 4)
      || '-' || substr(question_hash, 13, 4)
      || '-' || substr(question_hash, 17, 4)
      || '-' || substr(question_hash, 21, 12)
    )::uuid as question_id,
    topic_rows.topic_name
  from (
    select
      topics.id as topic_id,
      topics.name as topic_name,
      series.number as series_number,
      md5(format('generated-question-%s-%s', topics.id, series.number)) as question_hash
    from public.topics
    cross join generate_series(1, 20) as series(number)
  ) as topic_rows
),
generated_option_rows as (
  select
    (
      substr(option_hash, 1, 8)
      || '-' || substr(option_hash, 9, 4)
      || '-' || substr(option_hash, 13, 4)
      || '-' || substr(option_hash, 17, 4)
      || '-' || substr(option_hash, 21, 12)
    )::uuid as option_id,
    question_id,
    option_key,
    case option_key
      when 'A' then format('Meninjau tujuan terapi dan data klinis utama pada materi %s.', topic_name)
      when 'B' then format('Mengubah keputusan pada materi %s tanpa memeriksa parameter inti.', topic_name)
      when 'C' then format('Menunda evaluasi %s sampai seluruh aspek nonklinis selesai dibahas.', topic_name)
      when 'D' then format('Memilih intervensi %s hanya berdasarkan kebiasaan tanpa verifikasi data.', topic_name)
      else format('Menetapkan langkah %s sebelum menilai kecocokan kondisi pasien secara menyeluruh.', topic_name)
    end as option_text,
    option_key = 'A' as is_correct,
    sort_order
  from (
    select
      generated_question_rows.question_id,
      generated_question_rows.topic_name,
      option_values.option_key,
      option_values.sort_order,
      md5(format('generated-question-option-%s-%s', generated_question_rows.question_id, option_values.option_key)) as option_hash
    from generated_question_rows
    cross join (
      values
        ('A', 1),
        ('B', 2),
        ('C', 3),
        ('D', 4),
        ('E', 5)
    ) as option_values(option_key, sort_order)
  ) as option_rows
)
insert into public.question_options (
  id,
  question_id,
  option_key,
  option_text,
  is_correct,
  sort_order
)
select
  option_id,
  question_id,
  option_key,
  option_text,
  is_correct,
  sort_order
from generated_option_rows
on conflict (id) do update
set
  question_id = excluded.question_id,
  option_key = excluded.option_key,
  option_text = excluded.option_text,
  is_correct = excluded.is_correct,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

with generated_question_rows as (
  select
    (
      substr(question_hash, 1, 8)
      || '-' || substr(question_hash, 9, 4)
      || '-' || substr(question_hash, 13, 4)
      || '-' || substr(question_hash, 17, 4)
      || '-' || substr(question_hash, 21, 12)
    )::uuid as question_id,
    topic_rows.topic_name,
    topic_rows.series_number
  from (
    select
      topics.id as topic_id,
      topics.name as topic_name,
      series.number as series_number,
      md5(format('generated-question-%s-%s', topics.id, series.number)) as question_hash
    from public.topics
    cross join generate_series(1, 20) as series(number)
  ) as topic_rows
),
generated_explanation_rows as (
  select
    (
      substr(explanation_hash, 1, 8)
      || '-' || substr(explanation_hash, 9, 4)
      || '-' || substr(explanation_hash, 13, 4)
      || '-' || substr(explanation_hash, 17, 4)
      || '-' || substr(explanation_hash, 21, 12)
    )::uuid as explanation_id,
    question_id,
    format(
      'Pembahasan %s seri %s menekankan bahwa tujuan terapi dan data klinis inti perlu dibaca lebih dulu sebelum intervensi diperluas.',
      topic_name,
      series_number
    ) as explanation
  from (
    select
      generated_question_rows.question_id,
      generated_question_rows.topic_name,
      generated_question_rows.series_number,
      md5(format('generated-question-explanation-%s', generated_question_rows.question_id)) as explanation_hash
    from generated_question_rows
  ) as explanation_rows
)
insert into public.question_explanations (
  id,
  question_id,
  explanation,
  explanation_source,
  created_by,
  updated_by
)
select
  explanation_id,
  question_id,
  explanation,
  'manual',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111'
from generated_explanation_rows
on conflict (id) do update
set
  question_id = excluded.question_id,
  explanation = excluded.explanation,
  explanation_source = excluded.explanation_source,
  updated_by = excluded.updated_by,
  updated_at = timezone('utc', now());

insert into public.question_upload_batches (
  id,
  title,
  input_format,
  source_file_name,
  status,
  total_items,
  created_by,
  created_at,
  updated_at
)
values
  (
    '17171717-1717-1717-1717-171717171701',
    'Upload bank soal farmasi klinis Mei 2026',
    'csv',
    'bank-soal-farmasi-klinis-mei-2026.csv',
    'completed',
    2,
    '11111111-1111-1111-1111-111111111111',
    timezone('utc', now()) - interval '8 hours',
    timezone('utc', now()) - interval '7 hours'
  ),
  (
    '17171717-1717-1717-1717-171717171702',
    'Upload scan PDF topik pelayanan farmasi',
    'pdf',
    'scan-soal-pelayanan-farmasi.pdf',
    'completed_with_issues',
    2,
    '11111111-1111-1111-1111-111111111111',
    timezone('utc', now()) - interval '6 hours',
    timezone('utc', now()) - interval '5 hours'
  )
on conflict (id) do update
set
  title = excluded.title,
  input_format = excluded.input_format,
  source_file_name = excluded.source_file_name,
  status = excluded.status,
  total_items = excluded.total_items,
  updated_at = excluded.updated_at;

insert into public.question_upload_items (
  id,
  batch_id,
  question_id,
  source_row_number,
  stem,
  options_snapshot,
  correct_option_key,
  explanation,
  explanation_source,
  block_id,
  topic_id,
  suggested_topic_id,
  topic_suggestion_confidence,
  topic_suggestion_reason,
  text_extraction_mode,
  ocr_confidence,
  parse_confidence,
  raw_payload,
  parse_error,
  workflow_status,
  created_by,
  updated_by,
  created_at,
  updated_at
)
values
  (
    '18181818-1818-1818-1818-181818181801',
    '17171717-1717-1717-1717-171717171701',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    2,
    'Pasien hipertensi dengan edema perifer datang untuk evaluasi ulang. Intervensi terapi awal mana yang paling rasional untuk ditinjau lebih dulu sebelum kombinasi lanjutan diberikan?',
    '[{"key":"A","text":"Calcium channel blocker tunggal"},{"key":"B","text":"ACE inhibitor sebagai dasar titrasi awal"},{"key":"C","text":"Diuretik loop sebagai monoterapi jangka panjang"},{"key":"D","text":"Beta blocker dosis tinggi tanpa evaluasi fungsi ginjal"}]'::jsonb,
    'B',
    'ACE inhibitor layak ditinjau sebagai dasar titrasi karena memberi arah evaluasi yang lebih stabil sebelum terapi diperluas.',
    'upload_original',
    '44444444-4444-4444-4444-444444444441',
    '55555555-5555-5555-5555-555555555551',
    '55555555-5555-5555-5555-555555555551',
    0.9600,
    'Istilah hipertensi, edema perifer, dan terapi awal paling dekat dengan topik Kardiologi.',
    null,
    null,
    0.9900,
    '{"source":"csv","rowLabel":"soal-2"}'::jsonb,
    null,
    'draft_ready',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    timezone('utc', now()) - interval '8 hours',
    timezone('utc', now()) - interval '7 hours'
  ),
  (
    '18181818-1818-1818-1818-181818181802',
    '17171717-1717-1717-1717-171717171701',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    3,
    'Pasien dengan hipertiroid dan palpitasi datang untuk kontrol ulang. Parameter klinis apa yang perlu dipantau setelah terapi awal diberikan?',
    '[{"key":"A","text":"Warna kartu kontrol"},{"key":"B","text":"Frekuensi ganti kemasan"},{"key":"C","text":"Gejala, nadi, dan toleransi terapi"},{"key":"D","text":"Nomor antrean klinik"}]'::jsonb,
    'C',
    null,
    null,
    '44444444-4444-4444-4444-444444444441',
    null,
    '55555555-5555-5555-5555-555555555553',
    0.7300,
    'Kata kunci hipertiroid, palpitasi, dan terapi awal mengarah ke Endokrin dan Tiroid.',
    null,
    null,
    0.9100,
    '{"source":"csv","rowLabel":"soal-3"}'::jsonb,
    null,
    'needs_enrichment',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    timezone('utc', now()) - interval '8 hours',
    timezone('utc', now()) - interval '7 hours'
  ),
  (
    '18181818-1818-1818-1818-181818181803',
    '17171717-1717-1717-1717-171717171702',
    null,
    1,
    'Pada pelayanan farmasi klinis rawat inap, langkah dokumentasi mana yang paling penting untuk menjamin kesinambungan intervensi?',
    '[{"key":"A","text":"Catat tujuan klinis dan rencana monitoring"},{"key":"B","text":"Ganti warna map pasien"},{"key":"C","text":"Pisahkan resep berdasarkan hari genap"},{"key":"D","text":"Kurangi jumlah tanda tangan"}]'::jsonb,
    'A',
    null,
    null,
    '44444444-4444-4444-4444-444444444443',
    null,
    '55555555-5555-5555-5555-555555555565',
    0.8400,
    'Frasa pelayanan farmasi klinis, intervensi, dan monitoring paling cocok dengan topik Pelayanan Farmasi Klinis.',
    'direct_text',
    null,
    0.8200,
    '{"source":"pdf","page":4}'::jsonb,
    null,
    'needs_review',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    timezone('utc', now()) - interval '6 hours',
    timezone('utc', now()) - interval '5 hours'
  ),
  (
    '18181818-1818-1818-1818-181818181804',
    '17171717-1717-1717-1717-171717171702',
    null,
    2,
    '...hasil OCR belum stabil untuk nomor soal berikut...',
    '[{"key":"A","text":"Teks OCR tidak utuh"},{"key":"B","text":"Pilihan terpotong"},{"key":"C","text":"Baris ganda"},{"key":"D","text":"Nomor soal hilang"}]'::jsonb,
    null,
    null,
    null,
    '44444444-4444-4444-4444-444444444443',
    null,
    '55555555-5555-5555-5555-555555555563',
    0.4100,
    'OCR hanya menemukan istilah layanan dan standar secara parsial, sehingga topic suggestion confidence rendah.',
    'ocr',
    0.4300,
    0.3900,
    '{"source":"pdf","page":7}'::jsonb,
    'OCR confidence rendah dan struktur opsi tidak konsisten.',
    'needs_review',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    timezone('utc', now()) - interval '6 hours',
    timezone('utc', now()) - interval '5 hours'
  )
on conflict (id) do update
set
  batch_id = excluded.batch_id,
  question_id = excluded.question_id,
  source_row_number = excluded.source_row_number,
  stem = excluded.stem,
  options_snapshot = excluded.options_snapshot,
  correct_option_key = excluded.correct_option_key,
  explanation = excluded.explanation,
  explanation_source = excluded.explanation_source,
  block_id = excluded.block_id,
  topic_id = excluded.topic_id,
  suggested_topic_id = excluded.suggested_topic_id,
  topic_suggestion_confidence = excluded.topic_suggestion_confidence,
  topic_suggestion_reason = excluded.topic_suggestion_reason,
  text_extraction_mode = excluded.text_extraction_mode,
  ocr_confidence = excluded.ocr_confidence,
  parse_confidence = excluded.parse_confidence,
  raw_payload = excluded.raw_payload,
  parse_error = excluded.parse_error,
  workflow_status = excluded.workflow_status,
  updated_by = excluded.updated_by,
  updated_at = excluded.updated_at;

insert into public.exam_templates (
  id,
  slug,
  title,
  description,
  mode,
  block_id,
  topic_id,
  question_count,
  duration_minutes,
  diagnostic_source,
  status,
  created_by,
  updated_by
)
values
  (
    'dddddddd-dddd-dddd-dddd-ddddddddd101',
    'tryout-besar',
    'Try Out Besar',
    'Simulasi penuh untuk membaca stamina, fokus, dan pola salah sebelum review dipersempit.',
    'full',
    null,
    null,
    50,
    60,
    true,
    'published',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'dddddddd-dddd-dddd-dddd-ddddddddd102',
    'clinical-science',
    'Clinical Science',
    'Prioritaskan farmakoterapi dan interpretasi kasus klinis saat skor blok ini masih tertahan.',
    'block',
    '44444444-4444-4444-4444-444444444441',
    null,
    30,
    40,
    false,
    'published',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'dddddddd-dddd-dddd-dddd-ddddddddd103',
    'pharmaceutical-science',
    'Pharmaceutical Science',
    'Fokus ke sediaan, evaluasi steril, dan konsep farmasetika yang sering menahan akurasi.',
    'block',
    '44444444-4444-4444-4444-444444444442',
    null,
    30,
    40,
    false,
    'published',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'dddddddd-dddd-dddd-dddd-ddddddddd104',
    'social-behavior-administrative',
    'Social, Behavioral & Administrative Pharmacy',
    'Rapikan pemahaman layanan, dokumentasi, dan kebijakan yang sering terlihat sederhana tetapi memakan skor.',
    'block',
    '44444444-4444-4444-4444-444444444443',
    null,
    30,
    40,
    false,
    'published',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111'
  )
on conflict (slug) do update
set
  slug = excluded.slug,
  title = excluded.title,
  description = excluded.description,
  mode = excluded.mode,
  block_id = excluded.block_id,
  topic_id = excluded.topic_id,
  question_count = excluded.question_count,
  duration_minutes = excluded.duration_minutes,
  diagnostic_source = excluded.diagnostic_source,
  status = excluded.status,
  updated_by = excluded.updated_by,
  updated_at = timezone('utc', now());

insert into public.exam_templates (
  id,
  slug,
  title,
  description,
  mode,
  block_id,
  topic_id,
  question_count,
  duration_minutes,
  diagnostic_source,
  status,
  created_by,
  updated_by
)
select
  (
    substr(template_hash, 1, 8)
    || '-' || substr(template_hash, 9, 4)
    || '-' || substr(template_hash, 13, 4)
    || '-' || substr(template_hash, 17, 4)
    || '-' || substr(template_hash, 21, 12)
  )::uuid,
  format('materi-%s', topics.slug),
  topics.name,
  format('Latihan fokus %s dengan 20 soal acak dari materi ini.', topics.name),
  'topic',
  topics.block_id,
  topics.id,
  20,
  30,
  false,
  'published',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111'
from (
  select
    topics.*,
    md5(format('generated-topic-template-%s', topics.id)) as template_hash
  from public.topics
) as topics
on conflict (id) do update
set
  slug = excluded.slug,
  title = excluded.title,
  description = excluded.description,
  mode = excluded.mode,
  block_id = excluded.block_id,
  topic_id = excluded.topic_id,
  question_count = excluded.question_count,
  duration_minutes = excluded.duration_minutes,
  diagnostic_source = excluded.diagnostic_source,
  status = excluded.status,
  updated_by = excluded.updated_by,
  updated_at = timezone('utc', now());

insert into public.exam_template_items (
  id,
  exam_template_id,
  question_id,
  sort_order
)
select
  item.id::uuid,
  template.id,
  item.question_id::uuid,
  item.sort_order
from (
  values
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee101', 'tryout-besar', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 1),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee102', 'tryout-besar', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 2),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee103', 'tryout-besar', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 3),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee104', 'clinical-science', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 1),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee105', 'pharmaceutical-science', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 1),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee106', 'social-behavior-administrative', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 1)
) as item(id, template_slug, question_id, sort_order)
join public.exam_templates as template
  on template.slug = item.template_slug
on conflict (id) do update
set
  exam_template_id = excluded.exam_template_id,
  question_id = excluded.question_id,
  sort_order = excluded.sort_order;

insert into public.payment_submissions (
  id,
  user_id,
  package_code,
  payment_proof_path,
  proof_file_name,
  status,
  reviewer_id,
  reviewed_at,
  reviewer_notes,
  created_at,
  updated_at
)
values
  (
    '66666666-6666-6666-6666-666666666661',
    '33333333-3333-3333-3333-333333333333',
    'pro_30_hari',
    '33333333-3333-3333-3333-333333333333/sample-proof-baru.png',
    'sample-proof-baru.png',
    'pending_review',
    null,
    null,
    null,
    timezone('utc', now()) - interval '2 hours',
    timezone('utc', now()) - interval '2 hours'
  ),
  (
    '66666666-6666-6666-6666-666666666662',
    '22222222-2222-2222-2222-222222222222',
    'pro_30_hari',
    '22222222-2222-2222-2222-222222222222/sample-proof-pro.png',
    'sample-proof-pro.png',
    'active',
    '11111111-1111-1111-1111-111111111111',
    timezone('utc', now()) - interval '25 days',
    'Pembayaran valid.',
    timezone('utc', now()) - interval '26 days',
    timezone('utc', now()) - interval '25 days'
  ),
  (
    '66666666-6666-6666-6666-666666666663',
    '33333333-3333-3333-3333-333333333333',
    'sprint_14_hari',
    '33333333-3333-3333-3333-333333333333/sample-proof-rejected.png',
    'sample-proof-rejected.png',
    'rejected',
    '11111111-1111-1111-1111-111111111111',
    timezone('utc', now()) - interval '20 days',
    'Nominal belum terlihat jelas.',
    timezone('utc', now()) - interval '21 days',
    timezone('utc', now()) - interval '20 days'
  )
on conflict (id) do update
set
  package_code = excluded.package_code,
  payment_proof_path = excluded.payment_proof_path,
  proof_file_name = excluded.proof_file_name,
  status = excluded.status,
  reviewer_id = excluded.reviewer_id,
  reviewed_at = excluded.reviewed_at,
  reviewer_notes = excluded.reviewer_notes,
  updated_at = excluded.updated_at;

insert into public.subscriptions (
  id,
  user_id,
  package_code,
  state,
  starts_at,
  ends_at,
  payment_submission_id,
  reviewed_by,
  created_at,
  updated_at
)
values
  (
    '77777777-7777-7777-7777-777777777771',
    '22222222-2222-2222-2222-222222222222',
    'pro_30_hari',
    'active',
    timezone('utc', now()) - interval '25 days',
    timezone('utc', now()) + interval '5 days',
    '66666666-6666-6666-6666-666666666662',
    '11111111-1111-1111-1111-111111111111',
    timezone('utc', now()) - interval '25 days',
    timezone('utc', now()) - interval '25 days'
  ),
  (
    '77777777-7777-7777-7777-777777777772',
    '33333333-3333-3333-3333-333333333333',
    'pro_30_hari',
    'pending_review',
    null,
    null,
    '66666666-6666-6666-6666-666666666661',
    null,
    timezone('utc', now()) - interval '2 hours',
    timezone('utc', now()) - interval '2 hours'
  ),
  (
    '77777777-7777-7777-7777-777777777773',
    '22222222-2222-2222-2222-222222222222',
    'sprint_14_hari',
    'expired',
    timezone('utc', now()) - interval '60 days',
    timezone('utc', now()) - interval '46 days',
    null,
    '11111111-1111-1111-1111-111111111111',
    timezone('utc', now()) - interval '60 days',
    timezone('utc', now()) - interval '46 days'
  )
on conflict (id) do update
set
  package_code = excluded.package_code,
  state = excluded.state,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  payment_submission_id = excluded.payment_submission_id,
  reviewed_by = excluded.reviewed_by,
  updated_at = excluded.updated_at;

insert into public.audit_logs (
  id,
  actor_user_id,
  action,
  entity_type,
  entity_id,
  metadata,
  created_at
)
values
  (
    '88888888-8888-8888-8888-888888888881',
    '11111111-1111-1111-1111-111111111111',
    'payment_submission.approved',
    'payment_submission',
    '66666666-6666-6666-6666-666666666662',
    '{"package_code":"pro_30_hari","decision":"approve"}'::jsonb,
    timezone('utc', now()) - interval '25 days'
  ),
  (
    '88888888-8888-8888-8888-888888888882',
    '11111111-1111-1111-1111-111111111111',
    'payment_submission.rejected',
    'payment_submission',
    '66666666-6666-6666-6666-666666666663',
    '{"package_code":"sprint_14_hari","decision":"reject"}'::jsonb,
    timezone('utc', now()) - interval '20 days'
  )
on conflict (id) do update
set
  action = excluded.action,
  metadata = excluded.metadata,
  created_at = excluded.created_at;

insert into public.attempts (
  id,
  user_id,
  exam_template_id,
  status,
  started_at,
  submitted_at,
  time_limit_seconds,
  total_questions,
  created_at,
  updated_at
)
select
  'ffffffff-ffff-ffff-ffff-fffffffff101'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  template.id,
  'submitted',
  timezone('utc', now()) - interval '1 day' - interval '2 hours 41 minutes 12 seconds',
  timezone('utc', now()) - interval '1 day',
  10800,
  3,
  timezone('utc', now()) - interval '1 day' - interval '2 hours 41 minutes 12 seconds',
  timezone('utc', now()) - interval '1 day'
from public.exam_templates as template
where template.slug = 'tryout-besar'
on conflict (id) do update
set
  user_id = excluded.user_id,
  exam_template_id = excluded.exam_template_id,
  status = excluded.status,
  started_at = excluded.started_at,
  submitted_at = excluded.submitted_at,
  time_limit_seconds = excluded.time_limit_seconds,
  total_questions = excluded.total_questions,
  updated_at = excluded.updated_at;

insert into public.attempt_items (
  id,
  attempt_id,
  question_id,
  block_id,
  block_name,
  topic_id,
  question_stem,
  options_snapshot,
  correct_option_key,
  sort_order
)
values
  (
    'abababab-abab-abab-abab-ababababa101',
    'ffffffff-ffff-ffff-ffff-fffffffff101',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '44444444-4444-4444-4444-444444444441',
    'Clinical Science',
    '55555555-5555-5555-5555-555555555551',
    'Pasien hipertensi dengan edema perifer datang untuk evaluasi ulang. Intervensi terapi awal mana yang paling rasional untuk ditinjau lebih dulu sebelum kombinasi lanjutan diberikan?',
    '[{"key":"A","text":"Calcium channel blocker tunggal"},{"key":"B","text":"ACE inhibitor sebagai dasar titrasi awal"},{"key":"C","text":"Diuretik loop sebagai monoterapi jangka panjang"},{"key":"D","text":"Beta blocker dosis tinggi tanpa evaluasi fungsi ginjal"}]'::jsonb,
    'B',
    1
  ),
  (
    'abababab-abab-abab-abab-ababababa102',
    'ffffffff-ffff-ffff-ffff-fffffffff101',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '44444444-4444-4444-4444-444444444442',
    'Pharmaceutical Science',
    '55555555-5555-5555-5555-555555555559',
    'Pada evaluasi sediaan steril, indikator apa yang paling langsung menunjukkan kemungkinan masalah pada proses aseptik?',
    '[{"key":"A","text":"Perubahan pH akhir sediaan"},{"key":"B","text":"Hasil media fill dan monitoring lingkungan proses"},{"key":"C","text":"Warna kemasan sekunder"},{"key":"D","text":"Tebal label produk"}]'::jsonb,
    'B',
    2
  ),
  (
    'abababab-abab-abab-abab-ababababa103',
    'ffffffff-ffff-ffff-ffff-fffffffff101',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '44444444-4444-4444-4444-444444444443',
    'Social, Behavioral & Administrative Pharmacy',
    '55555555-5555-5555-5555-555555555563',
    'Dokumentasi intervensi farmasis akan paling berguna bila rekomendasi obat ditautkan dengan elemen apa?',
    '[{"key":"A","text":"Promo produk yang sedang berlaku"},{"key":"B","text":"Preferensi warna kemasan pasien"},{"key":"C","text":"Tujuan klinis dan hasil monitoring"},{"key":"D","text":"Jumlah stok gudang"}]'::jsonb,
    'C',
    3
  )
on conflict (id) do update
set
  attempt_id = excluded.attempt_id,
  question_id = excluded.question_id,
  block_id = excluded.block_id,
  block_name = excluded.block_name,
  topic_id = excluded.topic_id,
  question_stem = excluded.question_stem,
  options_snapshot = excluded.options_snapshot,
  correct_option_key = excluded.correct_option_key,
  sort_order = excluded.sort_order;

insert into public.answers (
  id,
  attempt_id,
  attempt_item_id,
  selected_option_key,
  answered_at,
  created_at,
  updated_at
)
values
  (
    'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdc101',
    'ffffffff-ffff-ffff-ffff-fffffffff101',
    'abababab-abab-abab-abab-ababababa101',
    'B',
    timezone('utc', now()) - interval '1 day' - interval '2 hours',
    timezone('utc', now()) - interval '1 day' - interval '2 hours',
    timezone('utc', now()) - interval '1 day' - interval '2 hours'
  ),
  (
    'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdc102',
    'ffffffff-ffff-ffff-ffff-fffffffff101',
    'abababab-abab-abab-abab-ababababa102',
    'A',
    timezone('utc', now()) - interval '1 day' - interval '90 minutes',
    timezone('utc', now()) - interval '1 day' - interval '90 minutes',
    timezone('utc', now()) - interval '1 day' - interval '90 minutes'
  ),
  (
    'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdc103',
    'ffffffff-ffff-ffff-ffff-fffffffff101',
    'abababab-abab-abab-abab-ababababa103',
    'C',
    timezone('utc', now()) - interval '1 day' - interval '45 minutes',
    timezone('utc', now()) - interval '1 day' - interval '45 minutes',
    timezone('utc', now()) - interval '1 day' - interval '45 minutes'
  )
on conflict (id) do update
set
  attempt_id = excluded.attempt_id,
  attempt_item_id = excluded.attempt_item_id,
  selected_option_key = excluded.selected_option_key,
  answered_at = excluded.answered_at,
  updated_at = excluded.updated_at;

insert into public.attempt_results (
  id,
  attempt_id,
  score,
  correct_answers,
  wrong_answers,
  unanswered_count,
  time_used_seconds,
  block_summary,
  generated_at
)
values
  (
    'edededed-eded-eded-eded-edededede101',
    'ffffffff-ffff-ffff-ffff-fffffffff101',
    66.67,
    2,
    1,
    0,
    9672,
    '[{"name":"Clinical Science","correct":1,"wrong":0},{"name":"Pharmaceutical Science","correct":0,"wrong":1},{"name":"Social, Behavioral & Administrative Pharmacy","correct":1,"wrong":0}]'::jsonb,
    timezone('utc', now()) - interval '1 day'
  )
on conflict (id) do update
set
  attempt_id = excluded.attempt_id,
  score = excluded.score,
  correct_answers = excluded.correct_answers,
  wrong_answers = excluded.wrong_answers,
  unanswered_count = excluded.unanswered_count,
  time_used_seconds = excluded.time_used_seconds,
  block_summary = excluded.block_summary,
  generated_at = excluded.generated_at;

insert into public.reference_documents (
  id,
  title,
  state,
  created_by,
  updated_by
)
values
  (
    '12121212-1212-1212-1212-121212121201',
    'Pedoman Farmasi Klinik 2024.pdf',
    'active',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '12121212-1212-1212-1212-121212121202',
    'Checklist Evaluasi Sterilitas.docx',
    'inactive',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111'
  )
on conflict (id) do update
set
  title = excluded.title,
  state = excluded.state,
  updated_by = excluded.updated_by,
  updated_at = timezone('utc', now());

insert into public.reference_document_versions (
  id,
  reference_document_id,
  version_label,
  file_name,
  storage_path,
  is_active,
  created_by
)
values
  (
    '13131313-1313-1313-1313-131313131301',
    '12121212-1212-1212-1212-121212121201',
    'v1',
    'Pedoman Farmasi Klinik 2024.pdf',
    'references/pedoman-farmasi-klinik-2024.pdf',
    true,
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '13131313-1313-1313-1313-131313131302',
    '12121212-1212-1212-1212-121212121202',
    'v2',
    'Checklist Evaluasi Sterilitas.docx',
    'references/checklist-evaluasi-sterilitas.docx',
    false,
    '11111111-1111-1111-1111-111111111111'
  )
on conflict (id) do update
set
  reference_document_id = excluded.reference_document_id,
  version_label = excluded.version_label,
  file_name = excluded.file_name,
  storage_path = excluded.storage_path,
  is_active = excluded.is_active,
  created_by = excluded.created_by;

insert into public.question_draft_references (
  id,
  upload_item_id,
  question_id,
  reference_document_id,
  reference_origin,
  reference_label,
  reference_url,
  reference_excerpt,
  confidence,
  metadata,
  created_at
)
values
  (
    '19191919-1919-1919-1919-191919191901',
    '18181818-1818-1818-1818-181818181802',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    '12121212-1212-1212-1212-121212121201',
    'reference_library',
    'Pedoman Farmasi Klinik 2024.pdf',
    null,
    'Bagian monitoring terapi awal gangguan endokrin masih menjadi kandidat sumber pembahasan.',
    0.6600,
    '{"stage":"pre-enrichment"}'::jsonb,
    timezone('utc', now()) - interval '7 hours'
  ),
  (
    '19191919-1919-1919-1919-191919191902',
    '18181818-1818-1818-1818-181818181803',
    null,
    '12121212-1212-1212-1212-121212121201',
    'reference_library',
    'Pedoman Farmasi Klinik 2024.pdf',
    null,
    'Dokumen referensi internal mendukung terminologi intervensi klinis dan continuity of care.',
    0.8100,
    '{"stage":"review-ready"}'::jsonb,
    timezone('utc', now()) - interval '5 hours'
  ),
  (
    '19191919-1919-1919-1919-191919191903',
    '18181818-1818-1818-1818-181818181804',
    null,
    null,
    'curated_external_ai',
    'Ringkasan sumber resmi farmasi layanan',
    'https://example.org/official-pharmacy-service-reference',
    'Fallback AI terkurasi mencoba mencocokkan istilah layanan, tetapi OCR terlalu lemah.',
    0.4200,
    '{"stage":"fallback-ai"}'::jsonb,
    timezone('utc', now()) - interval '5 hours'
  )
on conflict (id) do update
set
  upload_item_id = excluded.upload_item_id,
  question_id = excluded.question_id,
  reference_document_id = excluded.reference_document_id,
  reference_origin = excluded.reference_origin,
  reference_label = excluded.reference_label,
  reference_url = excluded.reference_url,
  reference_excerpt = excluded.reference_excerpt,
  confidence = excluded.confidence,
  metadata = excluded.metadata;

insert into public.question_draft_reviews (
  id,
  upload_item_id,
  reviewer_id,
  decision,
  notes,
  previous_workflow_status,
  next_workflow_status,
  created_at
)
values
  (
    '20202020-2020-2020-2020-202020202001',
    '18181818-1818-1818-1818-181818181803',
    '11111111-1111-1111-1111-111111111111',
    'request_changes',
    'Topic suggestion sudah tepat, tetapi pembahasan masih perlu ditajamkan sebelum publish.',
    'needs_review',
    'needs_review',
    timezone('utc', now()) - interval '4 hours'
  ),
  (
    '20202020-2020-2020-2020-202020202002',
    '18181818-1818-1818-1818-181818181804',
    '11111111-1111-1111-1111-111111111111',
    'request_changes',
    'OCR confidence terlalu rendah, perlu upload ulang atau koreksi manual.',
    'needs_review',
    'needs_review',
    timezone('utc', now()) - interval '4 hours'
  )
on conflict (id) do update
set
  upload_item_id = excluded.upload_item_id,
  reviewer_id = excluded.reviewer_id,
  decision = excluded.decision,
  notes = excluded.notes,
  previous_workflow_status = excluded.previous_workflow_status,
  next_workflow_status = excluded.next_workflow_status,
  created_at = excluded.created_at;

insert into public.ingestion_jobs (
  id,
  reference_document_id,
  job_mode,
  status,
  error_message,
  created_by,
  created_at,
  updated_at
)
values
  (
    '14141414-1414-1414-1414-141414141401',
    '12121212-1212-1212-1212-121212121201',
    'verification',
    'needs_review',
    null,
    '11111111-1111-1111-1111-111111111111',
    timezone('utc', now()) - interval '4 hours',
    timezone('utc', now()) - interval '2 hours'
  ),
  (
    '14141414-1414-1414-1414-141414141402',
    '12121212-1212-1212-1212-121212121202',
    'generation',
    'failed',
    'Chunk tabel referensi tidak konsisten saat ekstraksi.',
    '11111111-1111-1111-1111-111111111111',
    timezone('utc', now()) - interval '1 day',
    timezone('utc', now()) - interval '20 hours'
  ),
  (
    '14141414-1414-1414-1414-141414141403',
    '12121212-1212-1212-1212-121212121201',
    'verification',
    'queued',
    null,
    '11111111-1111-1111-1111-111111111111',
    timezone('utc', now()) - interval '1 hour',
    timezone('utc', now()) - interval '1 hour'
  )
on conflict (id) do update
set
  reference_document_id = excluded.reference_document_id,
  job_mode = excluded.job_mode,
  status = excluded.status,
  error_message = excluded.error_message,
  created_by = excluded.created_by,
  updated_at = excluded.updated_at;

insert into public.ingested_question_candidates (
  id,
  ingestion_job_id,
  title,
  block_label,
  topic_label,
  candidate_status,
  evidence_summary,
  created_at,
  updated_at
)
values
  (
    '15151515-1515-1515-1515-151515151501',
    '14141414-1414-1414-1414-141414141401',
    'Candidate conflict_found',
    'Clinical Science',
    'Kardiologi',
    'conflict_found',
    'Jawaban kandidat bertabrakan dengan referensi internal pada terapi awal hipertensi.',
    timezone('utc', now()) - interval '3 hours',
    timezone('utc', now()) - interval '2 hours'
  ),
  (
    '15151515-1515-1515-1515-151515151502',
    '14141414-1414-1414-1414-141414141401',
    'Candidate needs_review',
    'Pharmaceutical Science',
    'Sediaan Liquid dan Sediaan steril',
    'needs_review',
    'Tag blok dan topik sudah terisi, tetapi pembahasan masih terlalu tipis untuk publish.',
    timezone('utc', now()) - interval '2 hours',
    timezone('utc', now()) - interval '90 minutes'
  ),
  (
    '15151515-1515-1515-1515-151515151503',
    '14141414-1414-1414-1414-141414141402',
    'Candidate failed verification',
    'Social, Behavioral & Administrative Pharmacy',
    'Standar Pelayanan Kefarmasian',
    'failed',
    'Ekstraksi gagal mempertahankan struktur opsi jawaban dari dokumen sumber.',
    timezone('utc', now()) - interval '20 hours',
    timezone('utc', now()) - interval '20 hours'
  )
on conflict (id) do update
set
  ingestion_job_id = excluded.ingestion_job_id,
  title = excluded.title,
  block_label = excluded.block_label,
  topic_label = excluded.topic_label,
  candidate_status = excluded.candidate_status,
  evidence_summary = excluded.evidence_summary,
  updated_at = excluded.updated_at;

insert into public.candidate_verifications (
  id,
  candidate_id,
  reviewer_id,
  decision,
  notes,
  created_at
)
values
  (
    '16161616-1616-1616-1616-161616161601',
    '15151515-1515-1515-1515-151515151501',
    '11111111-1111-1111-1111-111111111111',
    'retry',
    'Perlu cek ulang terhadap referensi internal sebelum kandidat bisa diputuskan.',
    timezone('utc', now()) - interval '90 minutes'
  )
on conflict (id) do update
set
  candidate_id = excluded.candidate_id,
  reviewer_id = excluded.reviewer_id,
  decision = excluded.decision,
  notes = excluded.notes,
  created_at = excluded.created_at;

update public.questions
set question_image_path = 'seed/questions/hipertensi-cardiology.png'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';

update public.question_explanations
set explanation_image_path = 'seed/explanations/aseptik-media-fill.png'
where question_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';

insert into public.ai_provider_configs (
  provider,
  enabled,
  model,
  prompt_version,
  insight_mode,
  secret_hint
)
select
  'disabled',
  false,
  'gemini-2.5-flash',
  'phase1-v1',
  'rules',
  null
where not exists (
  select 1
  from public.ai_provider_configs
);
