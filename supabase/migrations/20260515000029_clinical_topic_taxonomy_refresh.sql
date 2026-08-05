with clinical_science_block as (
  select block.id
  from public.blocks as block
  where block.slug = 'clinical-science'
)
update public.topics as topic
set sort_order = topic.sort_order + 100
from clinical_science_block
where topic.block_id = clinical_science_block.id;

update public.topics
set
  slug = 'pernafasan-dan-pencernaan',
  name = 'Pernafasan dan Pencernaan'
where id = '55555555-5555-5555-5555-555555555555'::uuid;

with clinical_science_block as (
  select block.id
  from public.blocks as block
  where block.slug = 'clinical-science'
)
insert into public.topics (
  id,
  block_id,
  slug,
  name,
  sort_order
)
select
  '55555555-5555-5555-5555-555555555566'::uuid,
  clinical_science_block.id,
  'farmakokinetik-interaksi-obat-dan-antidotum',
  'Farmakokinetik, Interaksi Obat dan Antidotum',
  4
from clinical_science_block
on conflict (id) do update
set
  block_id = excluded.block_id,
  slug = excluded.slug,
  name = excluded.name,
  sort_order = excluded.sort_order;

with clinical_science_block as (
  select block.id
  from public.blocks as block
  where block.slug = 'clinical-science'
)
update public.topics
set sort_order = case
  when slug = 'antiinfeksi-antivirus-antiparasit' then 1
  when slug = 'biologi-sel' then 2
  when slug = 'endokrin-dan-tiroid' then 3
  when slug = 'farmakokinetik-interaksi-obat-dan-antidotum' then 4
  when slug = 'kardiologi' then 5
  when slug = 'mata-kulit-tulang-dan-sendi' then 6
  when slug = 'pernafasan-dan-pencernaan' then 7
  else sort_order
end
where block_id in (select id from clinical_science_block);

with clinical_science_block as (
  select block.id
  from public.blocks as block
  where block.slug = 'clinical-science'
)
update public.exam_templates
set
  title = 'Pernafasan dan Pencernaan',
  description = 'Latihan fokus Pernafasan dan Pencernaan dengan 20 soal acak dari materi ini.',
  block_id = clinical_science_block.id
from clinical_science_block
where mode = 'topic'
  and topic_id = '55555555-5555-5555-5555-555555555555'::uuid;

update public.attempt_diagnostic_topic_snapshots
set topic_name = 'Pernafasan dan Pencernaan'
where topic_id = '55555555-5555-5555-5555-555555555555'::uuid
  and topic_name is distinct from 'Pernafasan dan Pencernaan';
