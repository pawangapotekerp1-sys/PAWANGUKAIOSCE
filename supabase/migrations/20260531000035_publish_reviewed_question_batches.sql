begin;

-- Imported from reviewed local batches on 2026-05-31.
-- Keep this import self-contained because migrations run before seed.sql.

insert into public.blocks (id, slug, name, sort_order)
values (
  '44444444-4444-4444-4444-444444444441',
  'clinical-science',
  'Clinical Science',
  1
)
on conflict (id) do update
set
  slug = excluded.slug,
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into public.topics (id, block_id, slug, name, sort_order)
values
  (
    '55555555-5555-5555-5555-555555555552',
    '44444444-4444-4444-4444-444444444441',
    'antiinfeksi-antivirus-antiparasit',
    'Antiinfeksi, Antivirus dan Antiparasit',
    1
  ),
  (
    '55555555-5555-5555-5555-555555555554',
    '44444444-4444-4444-4444-444444444441',
    'mata-kulit-tulang-dan-sendi',
    'Mata, Kulit, Tulang dan Sendi',
    6
  )
on conflict (id) do update
set
  block_id = excluded.block_id,
  slug = excluded.slug,
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into public.question_sources (id, title, source_type, reference_label, metadata)
values (
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'Import infeksi.docx',
  'manual',
  'E:/soal/infeksi.docx',
  jsonb_build_object(
    'source_file', 'infeksi.docx',
    'import_mode', 'direct_published_import',
    'block', 'Clinical Science',
    'topic', 'Antiinfeksi, Antivirus dan Antiparasit'
  )
)
on conflict (id) do update
set title = excluded.title,
    source_type = excluded.source_type,
    reference_label = excluded.reference_label,
    metadata = excluded.metadata;

insert into public.question_sources (id, title, source_type, reference_label, metadata)
values (
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'Import tulang dan sendi.docx',
  'manual',
  'E:/soal/tulang dan sendi.docx',
  jsonb_build_object(
    'source_file', 'tulang dan sendi.docx',
    'import_mode', 'direct_published_import',
    'block', 'Clinical Science',
    'topic', 'Mata, Kulit, Tulang dan Sendi'
  )
)
on conflict (id) do update
set title = excluded.title,
    source_type = excluded.source_type,
    reference_label = excluded.reference_label,
    metadata = excluded.metadata;

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '008cbac6-1c6d-493b-92ea-d5e27a1bcd56',
  'Seorang pasien berusia 25 tahun didiagnosa TB kambuhan dan saat ini sedang mengkonsumsi OAT. Beberapa bulan kemudian, pasien hamil, sehingga dokter mengubah regimentasi terapinya menjadi tanpa Streptomisin. Apa efek Streptomisin pada janin pasien?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '037f1f82-dedb-4aea-8870-a890b20bae95',
  'Seorang perempuan usia 18 tahun masuk rumah sakit dengan keluhan demam selama 7 hari. Dari hasil pemeriksaan darah ditemukan adanya bakteri Enterobacteriaceaea. Dokter mendiagnosis pasien mengalami meningitis. Bagaimana tatalaksana terapi antibiotik yang dapat anda sarankan pada dokter untuk mengatasi gejala tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '0719270b-9c1b-4329-8898-3ab4dd1c9639',
  'Seorang ibu hamil (trimester 3, 37 minggu) didiagnosa menderita Malaria Falciparum. Dokter harus memberikan obat antimalaria yang aman untuk ibu dan janin menjelang persalinan. Terapi antimalaria yang paling sesuai untuk kasus ini adalah?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '0832acfb-84a9-4c9d-ad34-7839eb5032e2',
  'Ny. T berusia 26 tahun dengan usia kehamilan 20 minggu, datang ke klinik dengan keluhan sering berkemih disertai nyeri saat berkemih sejak 3 hari terakhir. Berdasarkan hasil penelusuran, diketahui bahwa pasien mengalami demam maupun nyeri pinggang. Hasil urinalisis menunjukkan leukosituria dan nitrit positif. Pasien didiagnosis dokter mengalami sistitis akut pada kehamilan. Terapi antibiotik apakah yang dapat direkomendasikan untuk pasien ini?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '0920a65e-dd77-4296-87a9-87a65916b8ec',
  'Tn. Y berusia 44 tahun dengan riwayat PPOK kategori sedang, datang ke IGD dengan keluhan demam, sesak napas, batuk, dan peningkatan produksi sputum purulen sejak 3 hari terakhir. Berdasarkan hasil pemeriksaan diketahui TD 130/80 mmHg, Nadi 97x/menit, RR 26x/menit, Suhu 37,8??C, SpO2 91%. Dokter mendiagnosis pasien mengalami eksaserbasi akut PPOK dengan indikasi pemberian antibiotik. Antibiotik yang paling tepat diberikan pada kasus ini adalah?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '1660ab5b-0959-4e63-a072-7c763c9eb437',
  'Pasien dengan infeksi cacing menggunakan obat yang direkomendasikan oleh dokter yaitu pirantel pamoat. Pasien tersebut dalam masa kehamilan 7 minggu. Pada resep yang diberikan kepada apoteker terdapat asam folat. Apa kegunaan asam folat pada pasien tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '1c3d3c4e-9258-4910-b0ea-f9096d7256e7',
  'Seorang perempuan berusia 31 tahun dengan HIV baru terdiagnosis akan memulai terapi antiretroviral (ARV). Regimen awal yang direncanakan adalah Tenofovir + Lamivudin + Efavirenz (TDF + 3TC + EFV). Namun, setelah pemberian pertama, pasien mengalami reaksi alergi berat terhadap lamivudin (3TC) berupa ruam generalisata dan sesak napas. Sebagai apoteker, obat pengganti yang paling tepat diberikan untuk menggantikan lamivudin dalam regimen ini adalah?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '296c326b-d83a-4222-9981-219167ead1e8',
  'Seorang anak berusia 7 tahun dibawa orangtuanya ke rumah sakit dengan keluhan sakit pada telinganya, mengalami gangguan pendengaran, demam, dan disertai keluarnya cairan dari telinga. Berdasarkan hasil pemeriksaan, dokter mendiagnosa pasien tersebut mengalami otitis media akut (OMA). Diketahui bahwa pasien tersebut memiliki riwayat alergi penisilin tetapi bukan termasuk reaksi hipersensitivitas tipe I. Terapi antibiotik apakah yang dapat direkomendasikan untuk pasien tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '2be97c2e-525e-42ad-89bc-d95688f87f20',
  'Seorang perempuan dengan masa kehamilan 4 minggu datang konsultasi ke dokter. Hasil pemeriksaan laboratorium menunjukkan adanya parasit Toxoplasma gondii. Apakah obat yang direkomendasikan untuk pasien pada kasus di atas?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '2cd85620-c335-493a-a238-c3ff4f66e9a3',
  'Seorang pasien didiagnosa TB kambuhan sehingga direkomendasikan regimentasi TB kategori 2. Setelah menggunakan obat selama 2 bulan, pasien mengalami nyeri pada kaki. Dokter kemudian mendiagnosa pasien mengalami nyeri neuropati. Apa obat yang dapat ditambahkan untuk mengatasi hal tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '339cf93f-b360-4c62-9574-8c69410da09e',
  'Seorang laki-laki berusia 25 tahun datang ke RS dengan keluhan diare berat, konsistensi cair seperti air cucian beras, muntah, hipotensi, dan dehidrasi. Hasil kultur tinja menyatakan adanya infeksi bakteri Vibrio cholera. Apakah antibiotik yang tepat untuk pasien ?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '35baf05c-113b-4ce2-a5ba-d3fa1f577f80',
  'Seorang bayi baru lahir dari ibu yang didiagnosis gonore saat kehamilan. Dokter ingin memberikan profilaksis untuk mencegah terjadinya konjungtivitis gonore pada bayi tersebut. Obat apakah yang paling tepat diberikan sebagai profilaksis untuk mencegah infeksi mata pada bayi ini?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '35e760f3-ea29-42be-aaed-8102d6a35b08',
  'Seorang pria datang ke IGD dengan keluhan nyeri ketika berkemih. Pasien mengaku bahwa akhir-akhir ini dia jarang minum air putih, banyak mengkonsumsi kopi, dan sering menahan pipis karena pekerjaannya. Dokter melakukan pemeriksaan dan mendiagnosis pasien dengan Cystitis. Pasien kemudian akan diberikan antibiotik lini pertama. Antibiotik apa yang bisa direkomendasikan?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '37c1bc4e-13e6-4008-b374-0d2aa306c88e',
  'Seorang pasien berusia 27 tahun mengalami rasa gatal dan nyeri di daerah kemaluannya. Setelah dilakukan pemeriksaan, pasien didiagnosa mengalami Gonorea. Pasien tersebut diketahui hamil dan akan segera melahirkan. Terapi apakah yang direkomendasikan untuk mencegah infeksi pada bayinya?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '38a5114c-dfc8-441e-9c6e-d77d0a32728f',
  'Tn. K berusia 52 tahun dirawat di ICU karena pneumonia berat. Setelah 5 hari menggunakan ventilator, pasien mengalami demam 39??C, batuk purulen, dan penurunan saturasi oksigen. Hasil kultur sputum menunjukkan pertumbuhan Methicillin-Resistant Staphylococcus aureus (MRSA). Sebagai apoteker klinis, anda diminta memberikan rekomendasi antibiotik yang paling tepat untuk terapi kasus ini. Antibiotik yang menjadi pilihan utama untuk terapi MRSA adalah?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '3af238b5-fdbd-4ab6-92ad-07c9545e9336',
  'Seorang wanita berusia 43 tahun dengan diagnosis kanker liver akan menjalani operasi hepatobiliary. Dokter bedah merekomendasikan pemberian antibiotik pra-operasi untuk menurunkan resiko terjadinya infeksi dan kontaminasi bakteri. Antibiotik profilaksis apa yang direkomendasikan untuk mengatasi kondisi pasien tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '3dd5b644-c8f6-4efb-8025-1d4abfcd9ab0',
  'Seorang pasien PPOK (Penyakit Paru Obstruktif Kronis) dengan keparahan sedang. Pasien mengeluhkan dadanya yang sesak dan pasien batuk dengan dahak. Saat diperiksa, FEV1/FVC mengalami peningkatan 50%. Pasien mengeluarkan dahak berwarna kuning kehijauan. Selama 3 bulan ini, pasien meminum prednisolone 0.5 mg 2 kali sehari. Antibiotik apa yang tepat untuk pasien?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '40acc85e-7b0d-46be-9781-4770b182e6ba',
  'Tn. C berusia 30 tahun didiagnosis dokter menderita pielonefritis akut. Hasil kultur urin menunjukkan hasil positif terhadap infeksi Escherichia coli. Berdasarkan hasil penelusuran, diketahui bahwa pasien memiliki riwayat alergi berat terhadap antibiotik golongan B-laktam. Terapi antibiotik apa yang dapat direkomendasikan untuk pasien?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '40f39f40-241a-4a97-ab13-0f554aaa71e8',
  'Ibu C pergi ke dokter dan mengeluhkan selulitis, diketahui bahwa selulitis tersebut terjadi akibat infeksi Staphylococcus. Apakah antibiotik yang dapat dimanfaatkan untuk mengobati gejala Ibu C?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '41e88977-b4f4-4082-9bfb-9e20e769bfaf',
  'Contoh dari obat antimikobakterial oral adalah obat-obatan antimikroba yang efektif menangani penyakit TB dan lepra. Manakah obat yang bersifat antimikroba bakterisid yang efektif baik terhadap M. tuberculosis dan M. Leprae?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '469c5fc6-0180-473c-b05d-55a4831b8bd4',
  'Seorang pasien (40 tahun) diketahui mengalami TB-MDR. Hasil pemeriksaan mikrobiologis, pasien masih dinyatakan sensitif terhadap obat-obat TB di lini kedua hingga kelima. Pasien mengalami peningkatan SGOT dan SGPT tiga kali lipat. Antibiotik apakah yang penggunaannya harus hati-hati untuk pasien tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '4f28f733-ed6c-4de1-9360-03bf9fd9d3ca',
  'Seorang bapak membawa anaknya yang berusia 9 tahun ke klinik dengan keluhan gatal hebat terutama pada malam hari. Berdasarkan hasil pemeriksaan, dokter mendiagnosis pasien anak tersebut mengalami skabies dan meresepkan krim permethrin 5%. Sebagai apoteker, Anda harus memberikan KIE cara pemakaian yang benar. Bagaimana tatacara pemakaian krim permethrin yang tepat?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '5d2b76b5-41a1-4e7f-8785-8dc824ddca3b',
  'Tn. B berusia 49 tahun datang ke klinik dengan keluhan nyeri seperti terbakar, tertusuk-tusuk, dan sensasi kesemutan pada daerah punggung kanan. Dua bulan sebelumnya, pasien mengalami ruam melepuh khas herpes zoster yang kini sudah sembuh. Berdasarkan hasil pemeriksaan, dokter mendiagnosis pasien mengalami post-herpetic neuralgia. Terapi apakah yang anda rekomendasikan untuk mengatasi kondisi pasien tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '6763ba4b-5e16-4fe2-9302-4a4c11a778b6',
  'Seorang pria (40 thn) penderita HIV rutin mengonsumsi kombinasi ARV: Zidovudine (AZT), Lamivudine (3TC), dan Nevirapine (NVP). Ia mengeluh mata kuning dan hasil lab menunjukkan peningkatan ALT/AST yang signifikan. Obat yang paling mungkin menyebabkan keluhan pasien dan tindakan yang harus dilakukan adalah?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '695cd52f-d1bc-4125-9fea-881e040547c9',
  'Anak laki-laki 8 tahun, didiagnosis oleh dokter terkena Entamoeba hystolitica. Dokter meminta rekomendasi antibiotik dari apoteker. Rekomendasi obat dari apoteker adalah...',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '6c199872-b14b-4047-98aa-5a10689d09a0',
  'Ny. F (42 thn) menderita HIV (CD4 = 180 sel/??L). Selain itu, ia juga terinfeksi Hepatitis B kronis (HBsAg positif). Dokter akan memulai terapi ARV (antiretroviral). Obat ARV apakah yang kontraindikasi pada pasien HIV dengan Hepatitis B?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '76f1ba81-b714-48e2-bfad-58929a01d3ee',
  'Seorang pasien berumur 55 tahun didiagnosis mengalami ISPA dengan riwayat penyakit hepatitis C, asites, sirosis. Dari hasil kultur menunjukkan pasien terinfeksi spontaneus bacterial peritontis. Obat apa yang direkomendasikan ?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '77d34a1c-2c22-42df-97cd-77b045ba9d21',
  'Seorang pasien dewasa mendapatkan terapi ARV lini pertama karena diagnosa HIVnya. Diketahui CD4 pasien saat ini 150 sel/mm3. Setelah menggunakan ARV selama 3 bulan, pasien masuk rumah sakit kembali karena mengalami fracture. Setelah dilakukan pengecekan, T-score pasien mengalami penurunan. ARV mana yang kemungkinan menyebabkan hal tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '787bd638-7cda-4001-afb9-95d1dd07d620',
  'Seorang pasien didiagnosis dengan infeksi cacing nematoda yang disebabkan oleh nyamuk Mansonia, yaitu Wuchereria bancrofti. Sebagai apoteker, Anda perlu mengetahui terapi yang tepat untuk infeksi ini. Obat manakah yang merupakan terapi utama untuk infeksi tersebut ?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '7ad02156-de8d-426a-8f6d-2e6ce52b326e',
  'Ny. T berusia 28 tahun akan melakukan perjalanan dinas selama 3 bulan ke daerah pedalaman Papua yang diketahui sebagai daerah endemis malaria Plasmodium falciparum resisten klorokuin. Ia meminta saran kepada apoteker mengenai obat yang dapat digunakan untuk pencegahan (profilaksis) malaria. Obat profilaksis yang paling tepat untuk pasien ini adalah?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '7bc856fa-a766-49d3-bae3-ad57bbd577d3',
  'Seorang pria datang ke dokter untuk memeriksakan keadaannya. Pasien merupakan seorang ODHA, dan saat ini merasakan sariawan di mulutnya. Dokter mendiagnosis pasien dengan candidiasis oral, akan tetapi nistatin sebagai pilihan pertama terapi sedang kosong. Obat apakah yang dapat digunakan sebagai pengganti Nistatin?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '7c6c40e8-6774-48f0-885b-eb801a1cee85',
  'Seorang pria berusia 35 tahun didiagnosis dokter mengalami tuberkulosis paru BTA positif dan memulai terapi dengan regimen OAT kategori I (2HRZE/4HR). Dokter merekomendasikan dilakukannya monitoring laboratorium secara terjadwal untuk meminimalkan efek yang tidak diinginkan dari penggunaan regimen obat tersebut. Parameter laboratorium utama yang wajib dimonitor secara rutin selama terapi?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '7daa6640-2c73-4516-837b-26b0802cb4b9',
  'Seorang bayi baru lahir dari ibu yang HIV positif memerlukan terapi profilaksis untuk mengurangi risiko penularan HIV. Terapi profilaksis apa yang harus diberikan kepada bayi ini?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '824f4a41-bcc8-453f-a8c8-fa1a3df086f7',
  'Seorang perempuan 22 tahun datang ke dokter dengan keluhan diare. Saat dilakukan pemeriksaan laboratorium didapati bakteri E.Coli. Dokter akan memberikan antibiotik levofloxacin dengan mekanisme kerja menghambat suatu enzim untuk mengatasi keluhan tersebut. Enzim apakah yang dihambat oleh antibiotik Levofloxacin?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '9181b94c-c83f-4b06-bc9b-5623097b72ad',
  'Seorang wanita datang ke rumah sakit memeriksakan kondisinya. Setelah diperiksa oleh dokter, wanita tersebut terinfeksi Tricomonas vaginalis. Dokter meminta saran kepada apoteker terkait terapi yang sesuai untuk kondisi wanita tersebut. Apakah saran yang tepat diberikan untuk pasien ?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '95800482-8ca6-4f7e-ab08-6775dd1afd6a',
  'Seorang anak usia 5 tahun diantarkan ibunya ke rumah sakit karena mengeluh gatal pada kepalanya walaupun sudah keramas dan tidak berkeringat, kulit kepala terasa bersisik, rambut rontok, dan adanya bitnik hitam. Dokter mendiagnosa anak tersebut terkena tinea capitis Obat apa yang tepat diberikan kepada pasien?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'aa1f47cb-631d-4353-bf48-09dde9b547af',
  'Seorang pria usia 40 tahun, masuk rumah sakit dengan keluhan demam tinggi diikuti dengan penurunan nafsu makan. Pasien memiliki riwayat diabetes melitus 1 tahun terakhir. Pria tersebut didiagnosa dokter menderita community acquired pneumonia. Hasil kultur sputum menunjukkan adanya bakteri Streptococcus pneumoniae. Diketahui pasien memiliki riwayat alergi dengan golongan beta laktam. Apa rekomendasi obat yang dapat anda sarankan?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'acf4b247-3abf-4668-a2bc-c41e463c90ce',
  'Seorang anak (10 thn) menderita diare berdarah dan berlendir (disentri) serta demam. Pengobatan dengan Cotrimoxazole selama 3 hari gagal (tidak membaik). Hasil kultur tinja memastikan adanya bakteri Shigella sp. yang sudah resisten terhadap obat sebelumnya. Terapi antibiotik apakah yang dapat direkomendasikan untuk kasus tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'ad441df8-afd5-440f-b705-8697ac686376',
  'Seorang ibu hamil (22 minggu) mengalami demam tinggi, nyeri pinggang kanan, dan nyeri saat punggung bawah diketuk (nyeri CVA). Hasil urine menunjukkan adanya bakteri dan sel darah putih. Pasien didiagnosis pielonefritis akut non komplikasi pada kehamilan. Terapi antibiotik apakah yang dapat direkomendasikan untuk pasien ini?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'af0928ff-e1fb-490b-84b3-292b729f073c',
  'Seorang anak usia 6 tahun mengalami gatal pada duburnya. Dokter mendiagnosa anak tersebut terinfeksi cacing kremi. Obat manakah yang tepat diberikan untuk anak tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'afb80e1e-31d8-46ef-9ea2-8168544ef776',
  'Tn. G (48 thn) dirawat karena infeksi jamur berat (kandidiasis sistemik) dan diberikan terapi Amfoterisin B intravena. Dua hari kemudian, pasien mengalami demam, menggigil, kadar kalium rendah (2,8 mEq/L), dan kreatinin naik. Efek samping utama yang paling mungkin disebabkan oleh penggunaan amfoterisin B pada pasien ini adalah?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'b651f97d-dac2-4f5e-ba2c-7aefa3e37f68',
  'Seorang ibu membawa anaknya ke puskesmas yang berusia 3 bulan, dan melakukan imunisasi yang bertujuan untuk mencegah penyakit batuk rejan. Jenis imunisasi apakah yang dimaksud..',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'b75d39de-c4d9-4132-880e-98e9f970d99a',
  'Seorang pasien anak didiagnosa tifoid. Diketahui anak ini pernah mengalami syok anafilaksis akibat beta-laktam. Antibiotik yang dapat diberikan untuk menangani tifoid tersebut adalah?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'c3782443-1574-477f-a8c4-fdadf68915bc',
  'Seorang ibu membawa anaknya yang berusia 1.5 tahun datang ke dokter dengan gejala mual, muntah, batuk, sakit leher, dan suara serak. Hasil pemeriksaan feses menunjukkan adanya telur Ancylostoma duodenal. Dokter mendiagnosis anak tersebut mengalami penyakit infeksi nekatoriasis. Apakah obat yang direkomendasikan untuk anak pada kasus di atas?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'c6ea23f9-0c36-43f4-875f-7924870c4e0d',
  'Pasien laki-laki 27 tahun menderita sifilis. Dokter meresepkan antibiotik yang dapat menghambat mukopeptida dinding sel. Obat yang dimaksud adalah?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'ca7e73c3-15d0-4a86-9c66-07391397b726',
  'Ny. F berusia 52 tahun dirawat di rumah sakit dengan diagnosis sepsis akibat infeksi saluran kemih. Pasien mendapat terapi antibiotik kombinasi, termasuk amikasin secara intravena. Setelah 5 hari terapi, pasien mengeluh berkurangnya frekuensi buang air kecil, bengkak pada tungkai, dan lemas. Dokter mencurigai adanya efek samping dari terapi amikasin. Parameter laboratorium yang harus dimonitor dari penggunaan amikasin adalah?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'd022d1aa-e47d-4ebd-92e3-4735f1d51200',
  'Tn. Y, berusia 38 tahun dengan diagnosis TB-MDR, menerima regimen pengobatan TB-RO jangka pendek. Setelah 2 bulan pengobatan, pasien tersebut mengeluhkan perubahan warna kulitnya menjadi kemerahan dan kecoklatan (Diskromia). Efek samping ini disebabkan oleh akumulasi salah satu jenis obat TB-RO jangka pendek pada jaringan lemak dan kulit. Obat pada regimen TB-RO jangka pendek apakah yang menyebabkan efek samping tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'd2857e8a-9d6e-473f-aa7a-4cc7c2909df2',
  'Seorang wanita 28 tahun diketahui hamil trimester II terdiagnosis mengalami malaria, diketahui bahwa wanita tersebut baru pulang dari bulan madu di Papua. Hasil pemeriksaan laboratorium menunjukkan bahwa wanita tersebut mengalami malaria vivaks. Bagaimana pengobatan untuk wanita tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'd2e0c61a-f867-455c-b1e3-491e2808639d',
  'Ny. F berusia 28 tahun dengan kondisi kehamilan 12 minggu, didiagnosis oleh dokter mengalami tuberkulosis paru BTA positif. Dokter merencanakan pengobatan dengan regimen standar OAT lini pertama. Dokter kemudian berdiskusi dengan apoteker terkait obat TBC tertentu yang harus dihindari pada ibu hamil karena kontraindikasi menyebabkan risiko teratogenic. Obat TBC yang kontraindikasi pada kehamilan adalah?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'd44cc838-faec-43d5-beb7-ab9c535b256d',
  'Seorang pasien laki laki dengan umur 41 tahun didiagnosis HIV dan saat ini mengkonsumsi ARV namun dokter memberi tambahan obat yaitu kotrimoxasol sebagai profilaksis terhadap infeksi sekunder. Dokter bertanya pada anda sebagai apoteker, bagaimana mekanisme kerja dari kotrimoxasol?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'd4796c7b-56f0-43c9-933d-d069d959d818',
  'Seorang pasien menerima obat Rotavirus salah satunya yaitu RV zidovudin. Mekanisme dari ARV tersebut adalah?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'd690af58-03ec-4b8c-9fa5-b40da2d14e5d',
  'Ny. B, seorang wanita berusia 34 tahun, baru-baru ini didiagnosis menderita tuberkulosis (TB) dan HIV puskesmas. Riwayat medis menunjukkan bahwa dia adalah mantan pekerja seks komersial. Pemeriksa laboratorium menunjukkan bahwa jumlah CD4 sel adalah 40 sel/mm3. Beliau bertanya pada anda sebagai apoteker di puskesmas, bagaimana aturan pakai obat obatan tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'd80c1b42-b62b-4e8e-9c82-d3e5bda60663',
  'Seorang pasien Perempuan berusia 29 tahun sedang menjalani pengobatan tuberkulosis paru. Saat ini pasien sudah memasuki bulan ke-4 pengobatan (fase lanjutan) dengan regimen Isoniazid dan Rifampisin. Pasien mengaku lupa minum obat selama 3 minggu berturut-turut. Berdasarkan hasil pemeriksaan BTA terakhir pasien adalah negatif. Sebagai apoteker, saran paling tepat yang harus diberikan kepada pasien tersebut adalah?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'dad3c5ac-5c97-45d5-a88c-c72eb99af433',
  'Seorang anak laki-laki usia 2 tahun dibawa ke puskesmas dengan keluhan diare cair lebih dari 6 kali per hari selama 3 hari, disertai demam ringan dan muntah. Hasil pemeriksaan feses menunjukkan infeksi bakteri Escherichia coli. Pasien tampak lemas dan mengalami dehidrasi ringan. Sebagai apoteker, Anda diminta memberikan rekomendasi terapi antibiotik yang paling tepat untuk pasien tersebut. Antibiotik yang paling sesuai adalah:',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'dbb3bccb-c2ec-4897-8132-82ef2f3a87b4',
  'Anak lelaki 11 tahun mengeluh diare akut, kram perut, distensi, kembung, dan penurunan berat badan. Kemudian dilakukan uji ELISA pada feses padat dan tropozoid pada feses cair. Terapi yang tepat untuk pasien tersebut adalah?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'de9c687f-6bc2-4252-9e59-ecf5f60dccd9',
  'Seorang pasien berumur 22 tahun datang ke klinik dengan keluhan nyeri saat menelan, pusing, demam (40oC) dan muntah dua kali. Hasil laboratorium menunjukkan leukositosis dan neutrofilia. Dokter mendiagnosis pasien menderita akut faringitis. Diketahui pasien alergi terhadap penisilin. Antibiotik apakah yang tepat diberikan untuk pasien tersebut ?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'ec83b096-4591-4180-81bf-595387b36cc7',
  'Seorang perempuan usia 30 tahun didiagnosis oleh dokter mengalami sifilis. Pasien menyampaikan pada dokter bahwa memiliki riwayat alergi bibir terasa tebal dan timbul bintik bintik merah saat mengkonsumsi obat amoksisilin. Dokter menghendaki pemberian tetrasiklin untuk menangani pasien tersebut. Dokter bertanya pada anda sebagai apoteker. Bagaimana mekanisme kerja dari obat ?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'f2f7ea03-681b-43dd-bce1-fa04a02ff128',
  'Seorang pria berusia 28 tahun datang ke klinik dengan keluhan diare yang sudah berlangsung selama lebih dari dua minggu disertai perut kembung, dan merasa mual. Berdasarkan pemeriksaan feses yang dilakukan, menunjukkan adanya kista dan trofozoit Giardia lamblia. Terapi apakah yang direkomendasikan untuk mengatasi kondisi pasien tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'f8270336-b7e7-40a0-b6f8-d2e2b421a56e',
  'Seorang ibu berusia 22 tahun dengan usia kehamilan 9 minggu, datang ke klinik dengan keluhan demam tinggi, menggigil, nyeri kepala, dan lemas. Berdasarkan pemeriksaan laboratorium, diketahui bahwa hapusan darah tepi pasien menunjukkan adanya Plasmodium falciparum. Dokter berencana memberikan terapi antimalaria. Terapi antimalaria yang paling sesuai untuk kasus ini adalah?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'f8849106-e767-4abf-bdb8-8cae1e62c594',
  'Seorang anak usia 7 tahun didiagnosis faringitis. Ibu pasien menyatakan bahwa anaknya memiliki alergi terhadap antibiotik golongan beta laktam. Pilihan terapi apa yang tepat bagi pasien anak tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'antiinfeksi-antivirus-antiparasit'),
  '6772ac8a-ffd2-4a5a-83f4-adaff97f1898',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '04743142-87c2-45c5-9037-2672b3b754bb',
  'Pasien wanita 50 tahun mengeluhkan nyeri dan bengkak pada jari kaki, pasien didiagnosis mengalami hiperurisemia setelah diperiksa lab kadar asam uratnya 7,3 mg/dL. Obat untuk mengobati inflamasi dan gout?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '07d330de-9007-4f38-b39a-b9b1c58de1fc',
  'Seorang wanita (65 thn) menjalani pemeriksaan kepadatan tulang (BMD) dengan hasil T-score -1.00. Dokter perlu menentukan kategori kesehatan tulang pasien dan rekomendasi terapi yang tepat. Sebagai seorang apoteker, obat atau suplemen apa yang paling tepat disarankan untuk pasien ini?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '085800a9-50f4-4064-9301-698bbde9c166',
  'Seorang wanita berumur 35 tahun menderita rheumatoid arthritis. Pasien membawa resep berisi asam folat, metotreksat, dan celecoxib. Apa fungsi dari pemberian asam folat ?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '0a91a5cd-4d11-46ab-8a91-a88f96ab2504',
  'Seorang pasien perempuan didiagnosa hiperurisemia oleh dokter. Saat datang ke dokter kadar asam urat darah mencapai 7 mg/dL. Pasien hanya merasakan nyeri ringan dan tidak mengalami gangguan pergerakan. Dokter ingin meresepkan obat yang berkhasiat urikosurik. Obat apa yang sesuai dengan tujuan pengobatan tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '0a958e2a-92e8-47f3-8cb7-4eab190163ae',
  'Seorang wanita berusia 50 tahun didiagnosis dengan osteoporosis dan diberikan suplemen kalsium oleh dokter untuk membantu mencegah pengeroposan tulang lebih lanjut. Dokter ingin memastikan bahwa pasien mendapatkan sediaan kalsium dengan kadar kalsium terbesar agar efeknya lebih optimal. Di antara pilihan berikut, sediaan kalsium manakah yang memiliki kadar kalsium terbesar?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '1061e326-b896-4c9c-a19c-13bc49edb275',
  'Terapi lanjutan untuk ibu dengan osteoporosis, yang diterapi dengan bifosfonat namun belum maksimal adalah?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '1ad5940c-d3bb-42ae-a869-1ffa4d7c6571',
  'Seorang pasien laki-laki usia 45 tahun melakukan pemeriksaan ke dokter dengan keluhan sulit berjalan dan sakit di persendian kaki dan ibu jari kaki serta terlihat ada inflamasi dan kemerahan pada sendi ibu jari kaki. Dia sudah mengalami 5 kali serangan nyeri tersebut dalam setahun terakhir. Hasil pemeriksaan laboratorium menunjukkan kadar asam urat 10 mg/dL, Dokter meresepkan obat allopurinol 300 mg 1x1 tab dan Natrium diklofenak 50 mg 2x1 tab. Berdasarkan gejala dan hasil pemeriksaan laboratorium tersebut di atas, pasien tersebut mengarah pada kondisi penyakit apakah?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '213b5c0d-faa9-4fbe-beca-edfe9a6df08f',
  'Seorang pria (49 thn) telah mengonsumsi Methotrexate (MTX) 15 mg/minggu selama 3 bulan untuk rheumatoid arthritis. Ia mengeluh sariawan, sangat lelah, sel darah putih (leukosit) turun, dan gangguan fungsi hati. Pasien hanya mengonsumsi MTX tanpa obat pendamping lainnya. Apa intervensi farmasi klinik yang paling tepat untuk kasus ini?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '2264b24b-341c-4ba2-bd5d-321bb41cc8d8',
  'Seorang pasien laki-laki 55 tahun didiagnosa hiperurisemia oleh dokter. Saat datang ke dokter kadar asam urat darah mencapai 7 mg/dL. Pasien hanya merasakan nyeri ringan dan tidak mengalami gangguan pergerakan sehingga dokter meresepkan probenesid. Efek samping apa yang mungkin timbul pada obat tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '2e76a658-2ebc-40d2-aade-b0a358933883',
  'Seorang pasien yang didiagnosis reumatoid artritis telah diberikan terapi obat metotreksat, tetapi tidak memberikan respons. Untuk mengurangi gejala dan mencegah kerusakan struktur, apakah obat yang dapat ditambahkan?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '2f0d82e6-476b-4413-ab2c-d024f55f7843',
  'Seorang pasien wanita berusia 55 tahun menderita penyakit gout. Pasien diberikan obat Allopurinol dan aspirin oleh dokter. Setelah mengkonsumsi obat yang diberikan oleh dokter, nyeri sendi pasien tidak berkurang. Setelah beberapa hari, timbul penyakit lain yaitu nyeri lambung. Diketahui penyebabnya karena mengonsumsi obat aspirin. Sebagai apoteker, obat apa yang akan digunakan sebagai pengganti aspirin',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '30b639c4-f1a3-4d9e-be3c-a1ce3a1eed1c',
  'Seorang wanita berusia 65 tahun baru saja didiagnosis osteoporosis dan diresepkan alendronat 70 mg sekali seminggu. Apoteker memberikan edukasi kepada pasien terkait cara penggunaan obat ini, termasuk anjuran untuk mengonsumsinya dengan segelas penuh air saat perut kosong di pagi hari, menunggu setidaknya 30 menit sebelum makan atau minum sesuatu selain air putih, serta tetap dalam posisi tegak (duduk atau berdiri) selama waktu tersebut. Mengapa pasien diminta untuk menunggu 30 menit setelah makan dan tetap tegak saat mengonsumsi alendronat?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '33e956ad-d069-458d-a5c6-c09e430b38b4',
  'Seorang wanita (48 thn) menderita Rheumatoid Arthritis dan juga mengalami gagal ginjal kronis hingga harus rutin cuci darah. Dokter perlu memilih obat DMARD yang aman bagi ginjalnya. Obat DMARD apa yang lebih aman untuk pasien RA dengan gangguan ginjal?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '3616f5c1-e945-4616-bc13-8a0472468dc1',
  'Seorang laki laki 40 tahun datang ke apotek mengeluhkan nyeri, inflamasi pada jari tangan dan kaki, tidak ada riwayat tukak lambung. kondisi ini sudah berulang 3 kali dalam 1 tahun. Obat untuk menghilangkan inflamasi dan nyeri akut yang di berikan adalah...',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '36a599ae-362d-450b-b8e9-4d141f9e265a',
  'Seorang nenek berusia 60 tahun didiagnosa dokter mengalami osteoporosis dengan nilai T-score -2,7. Dokter kemudian merekomendasikan penggunaan first line terapi osteoporosis untuk mengatasi kondisi nenek tersebut. Terapi apakah yang dimaksud?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '3c170ac9-b318-4bad-8249-73134362cd7c',
  'Seorang wanita datang ke apotek membawa resep calcitriol 2 x 0,5 mcg. Dari hasil konsultasi dengan pasien, diketahui bahwa ia sedang menjalani pengobatan untuk osteoporosis. Apoteker kemudian memberikan edukasi terkait mekanisme kerja obat tersebut. Apa mekanisme kerja dari calcitriol dalam pengobatan osteoporosis?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '412f97e5-8551-4275-948e-4a0956700570',
  'Seorang ibu berusia 70 tahun menderita hipertensi dan hipotiroid. Ibu tersebut mengeluh mengalami perburukan osteoporosis dan telah 6 bulan mengidap rheumatoid artritis. Obat-obatan yang diterima ibu tersebut adalah enalapril, asetosal, atenolol, levotiroksin dan salmeterol. Obat apa yang dianggap menimbulkan keluhan ibu tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '4ea81d0b-09d8-4445-950a-b105ad8bf8ef',
  'Seorang perempuan berusia 42 tahun pergi ke rumah sakit dan didiagnosis rheumatoid arthritis. Dokter meresepkan metotreksat dan asam folat untuk pengobatan pasien. Apa alasan dokter meresepkan asam folat?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '508de76a-e370-4a9c-9ed8-aa45b52911af',
  'Seorang ibu datang ke klinik karena mengalami nyeri dibagian sendi. Dokter meresepkan Natrium Diklofenak sebagai analgesik. Natrium diklofenak mempunyai efek analgesik karena menghambat pembentukan...',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '53004ba8-550e-472d-9917-8790eed06317',
  'Seorang bapak umur 49 tahun, berat 70 kg, datang ke dokter mengeluh nyeri sendi dan kesemutan di jari kaki dan tangan. Dokter memperkirakan asam urat, setelah pemeriksaan kadar asam urat 9.5 mg/dl. Obat yang diberikan adalah?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '556cd8bb-18e7-4763-9b41-729f5676ab19',
  'Seorang pasien laki-laki didiagnosa hiperurisemia oleh dokter. Saat datang ke dokter kadar asam urat darah mencapai 7 mg/dL. Pasien hanya merasakan nyeri ringan dan tidak mengalami gangguan pergerakan. Sehingga dokter meresepkan allopurinol dengan harapan mampu menekan produksi asam urat pasien. Enzim apa yang dihambat oleh obat tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '5697a85f-d1e7-46d9-9bd6-ef2c5970bfdb',
  'Seorang pria 55 tahun datang dengan nyeri hebat pada ibu jari kaki sejak 2 hari yang lalu. Hasil pemeriksaan menunjukkan gout akut. Pasien memiliki riwayat alergi berat terhadap kolkisin, sehingga obat tersebut tidak dapat digunakan. Dokter harus memilih terapi alternatif untuk mengatasi serangan akut gout. Obat apa yang tepat digunakan untuk terapi gout akut pada pasien ini?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '57f92581-5d3e-4190-94f8-6102031f71aa',
  'Seorang pasien datang ke apotek dengan keluhan dyspepsia. Berdasarkan informasi, pasien menggunakan AINS dan tidak bisa berhenti menggunakan karena sedang menjalani terapi osteoatritis. Obat apa yang apoteker sarankan untuk mengatasi keluhan pasien tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '5b38917b-402a-4e0a-8ae4-e074748fded7',
  'Seorang wanita (60 thn) telah menopause, mengalami nyeri punggung, perubahan postur, dan riwayat patah tulang. Hasil T-score -2,8. Pasien memiliki alergi terhadap golongan Bisfosfonat. Terapi apakah yang sesuai untuk mengatasi kondisi pasien tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '6e9cfa0f-856e-484f-86c4-eb2ce6564685',
  'Seorang wanita berumur 65 tahun menderita osteoporosis dan rutin mengkonsumsi obat. Belakangan ini sering pasien mengalami konstipasi padahal tetap makan-makanan berserat. Obat apa yang menyebabkan hal tersebut',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '749d090c-0077-4a90-b7f6-2a04a49efe73',
  'Seorang laki-laki berusia 45 tahun menderita gout kronis diberi allopurinol oleh dokter yang merawatnya. Satu minggu setelah menggunakan allopurinol, pasien justru mengalami nyeri seperti gout. Dokter tersebut menanyakan hal tersebut kepada apoteker. Bagaimana apoteker menerangkan kasus di atas?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '77662bce-7d3f-4793-a28f-9e72bff1c959',
  'Seorang pria (55 thn) mengalami nyeri punggung dan retak tulang lengan. Hasil pemeriksaan menunjukkan T-score -2,8, sehingga didiagnosis Osteoporosis. Dokter meresepkan Alendronate dan Kalsium. Interaksi apa yang dapat terjadi dari penggunaan alendronate bersama dengan kalsium?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '803ad642-b354-4108-ba29-68ae504ff04d',
  'Seorang pasien usia 54 tahun didiagnosis menderita rheumatoid arthritis. Pengobatan lini pertama dari DMARD adalah metotreksat. Namun saat ini stok metotreksat sedang kosong. Obat apa yang bisa apoteker sarankan sebagai alternatif pengobatan?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '82fefc3d-e923-40d7-83fa-41e14046037b',
  'Seorang siswa terjatuh saat sedang mengikuti kegiatan sekolah dan dibawa ke rumah sakit. Dokter memeriksanya dan mengatakan ia mengalami Open Long Bone Fracture. Antibiotik perlu diberikan sebagai salah satu penanganan atas fraktur siswa tersebut. Apakah obat yang diberikan?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '8d4c1f27-db6e-492b-aee9-826584aeb582',
  'Seorang kakek berusia 55 tahun didiagnosa dokter mengalami osteoporosis dengan nilai T-score - 2,7. Berdasarkan hasil penelusuran, diketahui pasien mengkonsumsi terapi antiepilepsi yang ternyata memperparah kondisi osteoporosisnya. Terapi apakah yang dimaksud?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '8e6d6a65-4edb-4243-a232-bde3396bce39',
  'Seorang pria berusia 53 tahun memiliki riwayat gout arthritis kronis dan rutin mengonsumsi allopurinol dan colchicine sesuai anjuran dokter. Pada suatu kunjungan, ia bertanya kepada apoteker tentang fungsi colchicine dalam terapi goutnya. Apa mekanisme utama colchicine dalam terapi gout?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '941d50be-5c32-419a-a7b8-55330d5ccd2d',
  'Seorang pasien wanita berusia 45 tahun didiagnosis menderita rheumatoid arthritis (RA) yang tidak membaik dengan terapi konvensional. Dokter mempertimbangkan penggunaan obat biologik yang bekerja dengan menargetkan antigen CD20 pada sel B untuk mengendalikan penyakitnya. Obat apakah yang dapat diberikan kepada pasien tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '9554c1e3-8ba1-48fc-b9b7-0d6c7fbdaf3c',
  'Seorang wanita berusia 35 tahun didiagnosis menderita rheumatoid arthritis (RA) dan memulai terapi dengan sulfasalazine. Setelah beberapa minggu, dokter menjelaskan kepada pasien mengenai mekanisme kerja obat ini dalam mengurangi peradangan pada penyakitnya. Manakah mekanisme kerja utama sulfasalazine dalam terapi rheumatoid arthritis?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '98a2671f-8e31-4f1e-8dd2-90bb9f924551',
  'Pasien osteoporosis diresepkan suplemen kalsium dan alendronate. Apoteker mengetahui bahwa kedua obat akan berinteraksi. Apakah Tindakan apoteker ?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '99a829bc-80b3-432b-abcc-08be5e25c334',
  'Seorang pria (65 thn) menderita Osteoartritis (nyeri dan bengkak sendi tangan). Pasien memiliki Riwayat Sindrom Koroner Akut dan rutin meminum Aspirin, Captopril, Bisoprolol, dan Simvastatin. Sebagai apoteker, apa obat yang anda rekomendasikan untuk pasien tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '9bf60a12-b6b8-43e9-8243-354e8124607e',
  'Seorang pria (45 thn) menderita Rheumatoid Arthritis (RA) dan menggunakan Infliximab (terapi biologis) selama 3 bulan. Saat ini ia mengeluh demam, kelelahan, dan batuk kronis. Dokter mencurigai adanya infeksi serius akibat efek samping obat tersebut. Manakah efek samping yang paling mungkin terjadi akibat terapi Infliximab?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  '9c2c33d2-023d-4892-9a61-2b1f0777358f',
  'Seorang pria 62 tahun dengan riwayat osteoartritis datang mengeluhkan nyeri lutut yang semakin parah. Pasien juga memiliki riwayat gastritis kronis dan sering kambuh bila minum obat penghilang nyeri tertentu. Dokter ingin memberikan obat yang lebih aman terhadap lambung. Obat analgesik apa yang lebih sesuai diberikan pada pasien osteoartritis dengan riwayat gastritis ini?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'a1755d51-6d19-4bcf-bb8e-6169f001d8ba',
  'Seorang pasien berusia 45 tahun datang dengan keluhan osteoartritis dia telah mengkonsumsi Antiinflamasi non steroid (AINS) selama tiga bulan. Akhir-akhir ini pasien mengeluh sakit pada bagian ulu hati disertai mual. Apa yang apoteker rekomendasikan?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'a196ef74-ed4e-42d6-8664-4e43decbc027',
  'Seorang pria (50 thn) menderita asam urat tinggi. Selain menyarankan diet rendah purin, dokter memberikan obat yang bekerja spesifik dengan cara meningkatkan ekskresi asam urat melalui ginjal. Obat apakah yang dimaksud oleh dokter tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'a7d8a45e-1312-4ebd-888e-3eaf71d73f87',
  'Seorang laki-laki berumur 25 tahun, mengeluhkan nyeri pada lambung, diare, dan terdapat lendir pada feses. Kemudian dia diberi dokter resep obat sulfasalazin 500 mg 4 kali sehari. Dari resep yang dituliskan dokter, apa kegunaan obat tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'ab7d305b-cc83-448b-8668-3d2fbdca6a4c',
  'Seorang wanita berusia 65 tahun datang ke apotek dengan membawa resep dari dokternya. Resep tersebut mencantumkan Alendronat, kalsium, dan vitamin D untuk pengelolaan osteoporosis yang telah didiagnosis sebelumnya. Saat melakukan konsultasi dengan apoteker, pasien bertanya tentang manfaat vitamin D dalam terapinya. Manakah pernyataan yang paling tepat mengenai peran utama vitamin D dalam pengelolaan osteoporosis?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'af926821-52e0-4e63-ad53-c218f961dc5d',
  'Seorang laki-laki berumur 73 tahun datang menemui dokter spesialis rheumatologi dengan keluhan nyeri pada persendiannya. Pasien tersebut didiagnosis mengalami osteoarthritis, dan pasien diresepkan suatu suplemen untuk tulangnya. Suplemen yang dimaksud adalah?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'b20886a5-15a3-4af0-8137-9af68c312410',
  'Seorang wanita berusia 65 tahun didiagnosis osteoporosis pascamenopause dan mendapatkan terapi kombinasi alendronat dan kalsium untuk meningkatkan kepadatan tulang. Dokter menjelaskan bahwa kedua obat ini bekerja dengan mekanisme yang berbeda dalam menangani osteoporosis. Manakah pernyataan yang paling benar mengenai mekanisme kerja dari alendronat dan kalsium dalam terapi osteoporosis?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'b2f3607c-43f3-4598-aa3b-52f7fb50943c',
  'Seorang pasien telah menjalani terapi Rheumatoid Arthritis menggunakan obat golongan DMARD selama 6 bulan. Saat kontrol, pasien mengeluhkan adanya gangguan atau penurunan penglihatan. Dokter mencurigai hal ini sebagai Efek Samping Obat. Terapi RA manakah yang bisa menyebabkan kondisi tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'b6289752-7d9c-4d76-813e-9ee8a4cc6756',
  'Seorang laki-laki berusia 53 tahun dengan riwayat gout datang ke apotek dengan kadar asam urat 8 mg/dL. Pasien memiliki riwayat gangguan ginjal kronis. Dokter ingin memberikan terapi jangka panjang untuk menurunkan kadar asam uratnya. Obat mana yang paling tepat direkomendasikan oleh apoteker untuk pasien ini?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'c18c7708-8c0e-4d2b-b2cc-5df466bdc66a',
  'Seorang laki-laki berusia 80 tahun menderita hipertensi sedang mendapatkan obat HCT 12,5 mg dan Losartan 50 mg sehari sekali. Dia juga mendapatkan Rofecoksib 50 mg sehari sekali untuk mengontrol osteoarthritis yang dideritanya. Setelah 3 bulan menjalani terapi tekanan darahnya mulai naik. Apakah penyebab kenaikan tekanan darah pasien tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'c4b18062-9001-4e15-846f-8024461892a1',
  'Seorang pasien laki-laki berumur 30 tahun menderita artritis rheumatoid. Dokter memberikan obat yang berfungsi dalam menghambat TNF alfa. Obat rheumatoid arthritis yang berperan sebagai TNF alfa blocking agent adalah...',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'c6786b84-1437-4f33-8355-e878462b65e9',
  'Seorang pria (55 thn) mengalami serangan Gout akut. Pasien sudah meminum Piroksikam selama sehari, namun nyeri tidak kunjung berkurang. Dokter perlu mengoptimalkan terapi untuk meredakan radang dan nyeri tersebut. Terapi manakah yang paling tepat diberikan pada pasien ini?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'c969b368-b398-407e-a5e6-4a8b3c0e4ed2',
  'Seorang ibu berusia 61 tahun semalam mengalami patah tulang panggul. Dokter mengatakan pasien mengalami osteoporosis. Pasien sudah mengalami osteoarthritis sejak 1 tahun lalu. Riwayat pengobatannya prednisone 1x5 mg. Sebagai apoteker saran apa yang dapat diberikan kepada dokter untuk pengobatan ibu tersebut?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'ddccae6b-309c-4e2c-8f48-52d9060cea03',
  'Seorang wanita (70 thn) menderita Osteoporosis dan rutin mengonsumsi Ibandronat. Karena risiko iritasi kerongkongan yang tinggi, apoteker menekankan tata cara minum obat yang spesifik. Sebagai seorang apoteker, bagaimana aturan pakai natrium ibandronat yang paling tepat untuk pasien ini?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'e5a0fa91-7df4-46ac-8876-f1dd8db80dfa',
  'Seorang pria berusia 65 tahun datang ke RS dan didiagnosis mengalami osteoarthritis. Dokter memberikan obat pelumas sendi untuk pengobatannya. Apa obat yang dimaksud?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'f04bd7e0-a658-4cef-9861-8569ab593b9f',
  'Seorang pria 60 tahun datang ke apotek dengan keluhan nyeri sendi lutut yang sudah lama dirasakannya. Pasien mengatakan saat ini nyerinya sangat mengganggu aktivitas sehari-hari, dengan skala nyeri 8 dari 10. Dokter sudah mendiagnosis pasien dengan osteoartritis. Apa pilihan terapi yang sesuai untuk mengatasi nyeri berat pada pasien osteoartritis ini?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'f19d0162-50e5-40e5-aee9-efd0b791e757',
  'Seorang ibu hamil datang ke dokter untuk berkonsultasi terkait nyeri pada sendinya. Setelah dilakukan pemeriksaan, ternyata nilai asam urat pasien > 9 mg/dL, sehingga dokter merekomendasikan pemberian urate lowering terapi pada pasien tersebut. ULT mana yang bisa direkomendasikan pada pasien?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'f51f0333-a334-4de8-8d4a-a9b946b357df',
  'Seorang wanita (45 thn) menderita Osteoartritis dan telah menggunakan Piroksikam selama 2 tahun. Ia kini mengeluh nyeri lambung dan BAB berdarah, yang menandakan adanya perdarahan saluran cerna akibat efek samping obat tersebut. Terapi apa yang bisa direkomendasikan bagi pasien?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'f940aeb5-f163-4f8c-8630-2dba757fe02d',
  'Pasien wanita 33 tahun datang ke apotek dengan keluhan nyeri dan bengkak pada jari manis kaki kirinya. Rasa nyeri sering timbul pada malam hari dan kadang disertai demam. Obat apakah yang disarankan apoteker di apotek?',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.questions (id, stem, block_id, topic_id, source_id, status, published_at)
values (
  'fa618424-5ed0-4cf6-b8bc-71759ea62bd3',
  'Pasien 55 tahun mengeluhkan nyeri sendi dan lutut. Diagnosis dokter osteoartritis untuk pertama kalinya. Dokter meminta saran terkait terapi untuk mengatasi nyeri pasien.',
  (select id from public.blocks where slug = 'clinical-science'),
  (select id from public.topics where slug = 'mata-kulit-tulang-dan-sendi'),
  '494ae80f-f947-4e8f-ab40-6bddd7a4466e',
  'published',
  timezone('utc', now())
)
on conflict (id) do update
set stem = excluded.stem,
    block_id = excluded.block_id,
    topic_id = excluded.topic_id,
    source_id = excluded.source_id,
    status = excluded.status,
    published_at = coalesce(public.questions.published_at, excluded.published_at);

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e60a0391-22fa-4a5b-a1b2-84d8a0b87b16', '008cbac6-1c6d-493b-92ea-d5e27a1bcd56', 'A', 'Ototoksisitas', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('16374d7a-5256-4a11-a2d8-a00bb0914bec', '008cbac6-1c6d-493b-92ea-d5e27a1bcd56', 'B', 'Neurotoksisitas', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f15b811d-eb5b-4cdc-8f2c-f583e0b5a275', '008cbac6-1c6d-493b-92ea-d5e27a1bcd56', 'C', 'Gangguan GI', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c1b65e6a-9ca7-44a0-82c1-b64355034992', '008cbac6-1c6d-493b-92ea-d5e27a1bcd56', 'D', 'Nefrotoksisitas', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b43aac4e-db8e-462f-9d95-5b13df247296', '008cbac6-1c6d-493b-92ea-d5e27a1bcd56', 'E', 'Spina bifida', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c04ba407-01fa-405b-a8d9-f58c1e3d6fab', '037f1f82-dedb-4aea-8870-a890b20bae95', 'A', 'Ampicilin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5eeab26e-00b7-4d2c-b2cd-01fc9b3e6973', '037f1f82-dedb-4aea-8870-a890b20bae95', 'B', 'Cefotaxime', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('81271882-95b9-4833-a801-f4062182b9df', '037f1f82-dedb-4aea-8870-a890b20bae95', 'C', 'Vancomycin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('4c1cb6e6-e9d2-48c3-9623-d8422d817ff3', '037f1f82-dedb-4aea-8870-a890b20bae95', 'D', 'Kotrimoksasol', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f4f41e0f-6e7e-43cb-a267-92333b7d1c2c', '037f1f82-dedb-4aea-8870-a890b20bae95', 'E', 'Linezolid', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('cc532d3d-bf47-4c83-9685-7095a713e6a1', '0719270b-9c1b-4329-8898-3ab4dd1c9639', 'A', 'DHP', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('fa3146d0-892c-4263-96ea-ca0246e15509', '0719270b-9c1b-4329-8898-3ab4dd1c9639', 'B', 'Primakuin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('21073f9b-fd4f-46de-858c-8524d530f3c9', '0719270b-9c1b-4329-8898-3ab4dd1c9639', 'C', 'Artesunat', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('faa3f015-806e-4207-a5b4-7bcf4104f988', '0719270b-9c1b-4329-8898-3ab4dd1c9639', 'D', 'Doksisiklin', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('4c392c5a-3e94-4f4e-9d30-c613340250de', '0719270b-9c1b-4329-8898-3ab4dd1c9639', 'E', 'Meflokuin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('9b81450b-ea80-49a1-a497-efce32ba6575', '0832acfb-84a9-4c9d-ad34-7839eb5032e2', 'A', 'Levofloksasin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('dea3bf87-a026-4cfd-9a46-00cb7f6141dd', '0832acfb-84a9-4c9d-ad34-7839eb5032e2', 'B', 'Gentamisin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('aa5a8747-3477-4da7-84e9-c404f4b6ad40', '0832acfb-84a9-4c9d-ad34-7839eb5032e2', 'C', 'Amoksisilin-klavulanat', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('6b16ca60-3a11-4647-8272-c175c838de30', '0832acfb-84a9-4c9d-ad34-7839eb5032e2', 'D', 'Doksisiklin', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('48b9dd61-e7cc-4615-93d8-3490e18e8082', '0832acfb-84a9-4c9d-ad34-7839eb5032e2', 'E', 'Tetrasiklin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e8ebe9f5-913b-4381-9dc0-b0c1292a2672', '0920a65e-dd77-4296-87a9-87a65916b8ec', 'A', 'Cefixime', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('35db7959-1cdd-42b4-91c6-1519ffbb162d', '0920a65e-dd77-4296-87a9-87a65916b8ec', 'B', 'Meropenem', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('6200b7c4-b49f-4372-b511-73e07a369b0b', '0920a65e-dd77-4296-87a9-87a65916b8ec', 'C', 'Doksisiklin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('22949b8e-23fa-4312-81ab-cea05bd369ec', '0920a65e-dd77-4296-87a9-87a65916b8ec', 'D', 'Azitromisin', true, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c8e11678-fd50-4ca4-8e3d-08db5d259796', '0920a65e-dd77-4296-87a9-87a65916b8ec', 'E', 'Gentamisin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('6c6bdde5-e2d5-4ed0-976b-e23b233dffa8', '1660ab5b-0959-4e63-a072-7c763c9eb437', 'A', 'Mencegah anemia', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('78baae95-ba55-43f6-aa21-b197b6af7022', '1660ab5b-0959-4e63-a072-7c763c9eb437', 'B', 'Menanggulangi efek samping pirantel pamoat', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('ecea6b17-f250-4aca-9770-0e3ddecd9258', '1660ab5b-0959-4e63-a072-7c763c9eb437', 'C', 'Vitamin untuk ibu hamil', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1c7f0e25-36fa-4417-886f-90f08b95eae2', '1660ab5b-0959-4e63-a072-7c763c9eb437', 'D', 'Meningkatkan efek pirantel pamoat', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('7072e322-c4a5-420d-ac0d-5aabd9618fac', '1660ab5b-0959-4e63-a072-7c763c9eb437', 'E', 'Mengurangi efek samping mual', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('af6c1a14-088e-4556-9c91-5082eb3d8f87', '1c3d3c4e-9258-4910-b0ea-f9096d7256e7', 'A', 'Emtrisitabin (FTC)', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e3ab64b9-18c1-497e-a214-2a3a91ff78a6', '1c3d3c4e-9258-4910-b0ea-f9096d7256e7', 'B', 'Abakavir (ABC)', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d0b8ff86-55be-4675-bd23-9914ae907b62', '1c3d3c4e-9258-4910-b0ea-f9096d7256e7', 'C', 'Zidovudin (AZT)', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b740a940-c647-4bb6-af27-ea2cc0642922', '1c3d3c4e-9258-4910-b0ea-f9096d7256e7', 'D', 'Lopinavir/ ritonavir (LPV/r)', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b32813cf-967a-405f-849b-60d1c4810fb9', '1c3d3c4e-9258-4910-b0ea-f9096d7256e7', 'E', 'Stavudin (d4T)', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('757ffbb5-8687-4869-9009-8e4fa10111c3', '296c326b-d83a-4222-9981-219167ead1e8', 'A', 'Ciprofloksasin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('868ea6af-f346-417a-9dc5-35de1d162ef7', '296c326b-d83a-4222-9981-219167ead1e8', 'B', 'Cefuroksim', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('9e1bde3e-b479-4bbc-a879-453830ccebd5', '296c326b-d83a-4222-9981-219167ead1e8', 'C', 'Meropenem', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('32956505-79d5-4865-9220-4741904c9ec6', '296c326b-d83a-4222-9981-219167ead1e8', 'D', 'Linezolid', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('bfcbe474-56c2-4350-a16b-560375810924', '296c326b-d83a-4222-9981-219167ead1e8', 'E', 'Vancomisin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('084c5316-ec58-4a6f-9838-79a794418cad', '2be97c2e-525e-42ad-89bc-d95688f87f20', 'A', 'Ciprofloxacin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('24803e2c-375f-408c-b7ca-5a7fedcae752', '2be97c2e-525e-42ad-89bc-d95688f87f20', 'B', 'Eritromisin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('bade0d30-01e1-449a-9bd0-ef682d479aa0', '2be97c2e-525e-42ad-89bc-d95688f87f20', 'C', 'Clindamycin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('dea0114c-8703-4e9c-b077-a923cc1e0966', '2be97c2e-525e-42ad-89bc-d95688f87f20', 'D', 'Spiramisin', true, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('3d073912-e86f-4547-abb9-6b352f6e3583', '2be97c2e-525e-42ad-89bc-d95688f87f20', 'E', 'Azitromycin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('20bac51f-4428-4384-ba59-ea8bde77c6f1', '2cd85620-c335-493a-a238-c3ff4f66e9a3', 'A', 'Piridoksin', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('630240bf-c280-4258-befc-4f3973be2362', '2cd85620-c335-493a-a238-c3ff4f66e9a3', 'B', 'Asam folat', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('bc45a78b-0d83-48fe-bdd4-41e2ba005b72', '2cd85620-c335-493a-a238-c3ff4f66e9a3', 'C', 'Thiamin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('81dd1492-791b-44c7-8171-1886a85a1d80', '2cd85620-c335-493a-a238-c3ff4f66e9a3', 'D', 'Cyanocobalamin', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5043fa17-045a-4e41-8f46-a2373ac1ca59', '2cd85620-c335-493a-a238-c3ff4f66e9a3', 'E', 'Aspirin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('9c7334f0-e4ab-4e68-bb1e-6ad940bc1732', '339cf93f-b360-4c62-9574-8c69410da09e', 'A', 'Metronidazol', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f9a88e63-fb86-45e4-9afc-95a0cff3f09f', '339cf93f-b360-4c62-9574-8c69410da09e', 'B', 'Doksisiklin', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('38489263-d9d7-4931-a22b-7ca956326ac7', '339cf93f-b360-4c62-9574-8c69410da09e', 'C', 'Gentamisin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('8752b15f-d08a-40e0-9728-a7464b32963a', '339cf93f-b360-4c62-9574-8c69410da09e', 'D', 'Amoksisilin', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('31c34656-822d-4cee-8c5f-37e29755f9f7', '339cf93f-b360-4c62-9574-8c69410da09e', 'E', 'Eritromisin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('29ea8019-8170-4c7d-8950-1b6d0c8a2197', '35baf05c-113b-4ce2-a5ba-d3fa1f577f80', 'A', 'Tetrasiklin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a64b59c2-59e4-47b5-982d-7482a3cb077e', '35baf05c-113b-4ce2-a5ba-d3fa1f577f80', 'B', 'Ciprofloxacin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c9b7b3ab-e0cb-45b2-b064-303c3b3416f3', '35baf05c-113b-4ce2-a5ba-d3fa1f577f80', 'C', 'Eritromisin', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('09a18aaf-3fa4-4a7a-8890-5b98ee62fa0c', '35baf05c-113b-4ce2-a5ba-d3fa1f577f80', 'D', 'Gentamisin', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('908798d9-9dc6-47a2-ab80-13c7c360e67d', '35baf05c-113b-4ce2-a5ba-d3fa1f577f80', 'E', 'Mupirosin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('807648fd-e5a6-4eb2-808d-cf6c8a3e1651', '35e760f3-ea29-42be-aaed-8102d6a35b08', 'A', 'Kotrimoksazol', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e2afcd46-e3e2-49d9-a3aa-3727ef506187', '35e760f3-ea29-42be-aaed-8102d6a35b08', 'B', 'Ciprofloxacin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('70756d44-d356-4137-b93a-ac8acba9a589', '35e760f3-ea29-42be-aaed-8102d6a35b08', 'C', 'Doksisiklin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('aacf06ce-b5c8-4dc8-918e-e25058fd5ef4', '35e760f3-ea29-42be-aaed-8102d6a35b08', 'D', 'Cefotaxim', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1463c5b4-b367-4bc3-9da9-f82b10819750', '35e760f3-ea29-42be-aaed-8102d6a35b08', 'E', 'Cefuroxim', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('0b0a9cb9-699c-47bf-9ed7-39d390443673', '37c1bc4e-13e6-4008-b374-0d2aa306c88e', 'A', 'Cefixim', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('61387acc-3e60-491f-8906-832e84883ef1', '37c1bc4e-13e6-4008-b374-0d2aa306c88e', 'B', 'Ceftriaxone', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d3cc71ad-9d0e-44bd-ad9c-a55242b79b30', '37c1bc4e-13e6-4008-b374-0d2aa306c88e', 'C', 'Eritromisin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('da027a2e-94ad-416a-a0e0-69a60f3d1544', '37c1bc4e-13e6-4008-b374-0d2aa306c88e', 'D', 'Doksisiklin', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('6c893ab8-275b-4a0f-98ea-bc0a966929c1', '37c1bc4e-13e6-4008-b374-0d2aa306c88e', 'E', 'Azithromisin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1e1bddc7-2d4a-47e5-8d7d-5dc36b65f806', '38a5114c-dfc8-441e-9c6e-d77d0a32728f', 'A', 'Amoxicillin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1cead07e-ec12-4c0c-b448-fc8d2e451908', '38a5114c-dfc8-441e-9c6e-d77d0a32728f', 'B', 'Vancomisin', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('42a3e940-f1e5-4a0f-918d-91d66a23f6d1', '38a5114c-dfc8-441e-9c6e-d77d0a32728f', 'C', 'Metronidazol', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5307c291-4bd9-4ef9-b4d9-0724d86fa49e', '38a5114c-dfc8-441e-9c6e-d77d0a32728f', 'D', 'Ciprofloksasin', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('6ad0bb95-ddf4-4812-8db9-87e98bde876b', '38a5114c-dfc8-441e-9c6e-d77d0a32728f', 'E', 'Cotrimoksazol', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('4773b2a2-d689-4d8e-b5ad-6bc9000ae57e', '3af238b5-fdbd-4ab6-92ad-07c9545e9336', 'A', 'Neomisin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('414886c7-4550-4a27-b271-c2cf836b23c0', '3af238b5-fdbd-4ab6-92ad-07c9545e9336', 'B', 'Eritromisin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5a94d4fa-0d5a-4c93-8850-d9079973b013', '3af238b5-fdbd-4ab6-92ad-07c9545e9336', 'C', 'Cefazolin', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('2a0dca19-2d4d-4291-af08-50b1d030253c', '3af238b5-fdbd-4ab6-92ad-07c9545e9336', 'D', 'Metronidazol', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('021af97b-d1a4-49ef-ba57-0eff210220d6', '3af238b5-fdbd-4ab6-92ad-07c9545e9336', 'E', 'Doksisiklin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('731cac5f-eac4-4ed1-95f2-37daf08618cf', '3dd5b644-c8f6-4efb-8025-1d4abfcd9ab0', 'A', 'Levofloksacin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('4d6af1c8-05d2-4ddf-a28b-4a8638dedc0d', '3dd5b644-c8f6-4efb-8025-1d4abfcd9ab0', 'B', 'Amoksisilin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('688ac5e5-0d78-45cc-993f-024effd24ca7', '3dd5b644-c8f6-4efb-8025-1d4abfcd9ab0', 'C', 'Klaritromisin', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('87b849e4-ca54-424c-86ec-afebeee5dbfb', '3dd5b644-c8f6-4efb-8025-1d4abfcd9ab0', 'D', 'Gentamisin', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('6d9bdf02-be8c-492a-8156-626c3aff9c55', '3dd5b644-c8f6-4efb-8025-1d4abfcd9ab0', 'E', 'Seftriakson', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c4c0ad4c-70be-4f7f-902c-22d39f05b4cb', '40acc85e-7b0d-46be-9781-4770b182e6ba', 'A', 'Ampisilin-sulbaktam', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b36cc940-67e5-44a1-a651-a2255689913a', '40acc85e-7b0d-46be-9781-4770b182e6ba', 'B', 'Sefepim', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('ad0d473d-391e-48c7-9bdc-9cf61f258ad4', '40acc85e-7b0d-46be-9781-4770b182e6ba', 'C', 'Cefixime', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('474dea3c-4747-4010-b76c-734e39607605', '40acc85e-7b0d-46be-9781-4770b182e6ba', 'D', 'Ciprofloksasin', true, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f4842b3d-e75f-4d6a-bc0c-93b981105bd1', '40acc85e-7b0d-46be-9781-4770b182e6ba', 'E', 'Meropenem', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('62b95cfc-bbec-4911-bc62-971ffff33dae', '40f39f40-241a-4a97-ab13-0f554aaa71e8', 'A', 'Tetrasiklin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('36618393-7369-44fe-aa3a-97106a7021d8', '40f39f40-241a-4a97-ab13-0f554aaa71e8', 'B', 'Vancomycin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('90d30ba3-50d5-419b-8284-437a9a4bb209', '40f39f40-241a-4a97-ab13-0f554aaa71e8', 'C', 'Fluorokinolon', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('055825cd-0a5d-4540-8d66-d1e51a80c5ac', '40f39f40-241a-4a97-ab13-0f554aaa71e8', 'D', 'Kloramfenikol', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b89bb9e4-0f7c-40a3-bcd0-b8e3f9342891', '40f39f40-241a-4a97-ab13-0f554aaa71e8', 'E', 'Dicloxacillin', true, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('38c7719b-655b-45c7-8cd0-e8faf173c1dd', '41e88977-b4f4-4082-9bfb-9e20e769bfaf', 'A', 'INH/isoniazid', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('af616674-0924-4454-b222-4bf21eea3e29', '41e88977-b4f4-4082-9bfb-9e20e769bfaf', 'B', 'Rifampin/rifampicin', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('4e35b7f5-a090-4826-83f8-57a88b327e2d', '41e88977-b4f4-4082-9bfb-9e20e769bfaf', 'C', 'Ethambutol', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('642fc279-03cf-4a56-86d6-8ee29161084d', '41e88977-b4f4-4082-9bfb-9e20e769bfaf', 'D', 'Pyrazinamid', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('8909c4d8-dd12-4e3d-b098-842653fd8267', '41e88977-b4f4-4082-9bfb-9e20e769bfaf', 'E', 'Streptomycin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('374db9b4-e77e-4def-a42d-7b419688e850', '469c5fc6-0180-473c-b05d-55a4831b8bd4', 'A', 'Kanamisin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('19983905-b03d-48f6-9a71-2fa17b63f9f7', '469c5fc6-0180-473c-b05d-55a4831b8bd4', 'B', 'Amikasin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b95ae1a3-39e3-43af-ad28-2fb08ff48a6f', '469c5fc6-0180-473c-b05d-55a4831b8bd4', 'C', 'Gentamicin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f3530362-4c3d-4006-ab04-275646996e2e', '469c5fc6-0180-473c-b05d-55a4831b8bd4', 'D', 'Amoxicillin', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('53433aaf-5714-4f29-995c-db032e5f538d', '469c5fc6-0180-473c-b05d-55a4831b8bd4', 'E', 'Moksifloksasin', true, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('dd55bb29-3602-4adb-8305-68a504c49b32', '4f28f733-ed6c-4de1-9360-03bf9fd9d3ca', 'A', 'Oleskan ke seluruh tubuh hingga leher, wajah, dan telinga dan dibiarkan selama 8-12 jam serta dapat diulang setelah satu pekan.', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('81483279-3286-49d0-9aed-6679f8132b7d', '4f28f733-ed6c-4de1-9360-03bf9fd9d3ca', 'B', 'Oleskan tipis hanya pada area yang gatal, biarkan selama 2 jam.', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('67c3c468-14d5-4d38-9206-663273034fbf', '4f28f733-ed6c-4de1-9360-03bf9fd9d3ca', 'C', 'Oleskan hanya pada area lipatan kulit, lalu bilas setelah 20 jam', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5bba4af7-fea4-40be-b75b-a4eee021e2b5', '4f28f733-ed6c-4de1-9360-03bf9fd9d3ca', 'D', 'Oleskan sekali sehari selama 3 hari berturut-turut tanpa perlu dibilas.', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('bf87832a-0a9c-4de3-9f44-ad01a1d5c627', '4f28f733-ed6c-4de1-9360-03bf9fd9d3ca', 'E', 'Oleskan ke wajah dan kulit kepala saja, lalu bilas setelah 10 jam.', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('51148bd4-5b0f-42e4-8dfb-0f91e5d704ae', '5d2b76b5-41a1-4e7f-8785-8dc824ddca3b', 'A', 'Pregabalin', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('98852eb6-a4e3-4110-9c1f-d19a547cd1b2', '5d2b76b5-41a1-4e7f-8785-8dc824ddca3b', 'B', 'Aspirin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('4b4d5a57-37e8-4455-bb59-d79184cbfec5', '5d2b76b5-41a1-4e7f-8785-8dc824ddca3b', 'C', 'Na diklofenak', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b50cd9af-f917-48cd-9d3b-9e1e5eb580fa', '5d2b76b5-41a1-4e7f-8785-8dc824ddca3b', 'D', 'Paracetamol', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f789b340-16c5-4e79-b2c0-6360585fb8d0', '5d2b76b5-41a1-4e7f-8785-8dc824ddca3b', 'E', 'Indometasin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('4759d3bc-c227-4143-aaed-53a353cfeddf', '6763ba4b-5e16-4fe2-9302-4a4c11a778b6', 'A', 'Nevirapine; hentikan NVP dan ganti dengan efavirenz (EFV) atau dolutegravir (DTG)', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1bad7666-b8b4-412d-8370-840491542d9f', '6763ba4b-5e16-4fe2-9302-4a4c11a778b6', 'B', 'Zidovudine; hentikan AZT dan ganti dengan tenofovir disoproxil fumarate (TDF)', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('ebe7d024-8b16-4a35-a393-27ff1913072f', '6763ba4b-5e16-4fe2-9302-4a4c11a778b6', 'C', 'Lamivudine; hentikan 3TC dan ganti dengan emtricitabine (FTC)', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('785c5a8a-87a5-4dd5-87fd-00e89a2721b9', '6763ba4b-5e16-4fe2-9302-4a4c11a778b6', 'D', 'Nevirapine; lanjutkan terapi karena efek samping ini bersifat sementara', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('6e1597ad-6c4c-4eeb-b0e6-c582d3e201f9', '6763ba4b-5e16-4fe2-9302-4a4c11a778b6', 'E', 'Zidovudine; hentikan AZT dan tidak perlu mengganti dengan obat lain', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('42842396-1224-45fc-9b08-60b1c83ded83', '695cd52f-d1bc-4125-9fea-881e040547c9', 'A', 'Sefiksim', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('0914c455-c623-4856-90f5-9fd60bbfa5f5', '695cd52f-d1bc-4125-9fea-881e040547c9', 'B', 'Metronidazole', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a70eb2b3-393c-4ac9-9133-ef3da45a9c9f', '695cd52f-d1bc-4125-9fea-881e040547c9', 'C', 'Amoksisilin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('2eae808a-4d30-4645-af16-f5f11f0328e6', '695cd52f-d1bc-4125-9fea-881e040547c9', 'D', 'Tetrasiklin', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('8171cbbb-1344-4d6d-b7a3-f08cb8269a66', '695cd52f-d1bc-4125-9fea-881e040547c9', 'E', 'Seftriakson', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('862e163e-1a65-4e66-a302-09a0677dfbda', '6c199872-b14b-4047-98aa-5a10689d09a0', 'A', 'Efavirenz (EFV)', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('36cb6556-e67a-4856-a3d1-e2b1706ec790', '6c199872-b14b-4047-98aa-5a10689d09a0', 'B', 'Emtrisitabin (FTC)', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f96368cc-bec3-4698-9527-e9a371ea4fdd', '6c199872-b14b-4047-98aa-5a10689d09a0', 'C', 'Tenofovir disoproxil fumarate (TDF)', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f287d7fe-8dd6-484c-9182-f7c0c092deb4', '6c199872-b14b-4047-98aa-5a10689d09a0', 'D', 'Lamivudin (3TC)', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c6e5d627-7b60-4e74-b1a0-64448746d485', '6c199872-b14b-4047-98aa-5a10689d09a0', 'E', 'Nevirapine (NVP)', true, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('eef4e740-5224-4f07-8e24-6f8fcba49941', '76f1ba81-b714-48e2-bfad-58929a01d3ee', 'A', 'Amoksisilin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5bf8b252-3854-4b89-8ff1-6713269c1279', '76f1ba81-b714-48e2-bfad-58929a01d3ee', 'B', 'Eritromisin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f6a94736-d1f4-4a64-b016-96a11c8ce3a9', '76f1ba81-b714-48e2-bfad-58929a01d3ee', 'C', 'Kotrimoksazol', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('bd838b74-c63d-45ce-a78f-54ab595f6185', '76f1ba81-b714-48e2-bfad-58929a01d3ee', 'D', 'Cefotaksim', true, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a39cbe8b-79b3-43ac-aa47-03d81d87da12', '76f1ba81-b714-48e2-bfad-58929a01d3ee', 'E', 'Albumin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('2515a581-c3a4-480a-af07-e2b30ba0a6d0', '77d34a1c-2c22-42df-97cd-77b045ba9d21', 'A', 'Tenofovir', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('7ea4382b-6c7e-4193-b357-2c05fa0088bb', '77d34a1c-2c22-42df-97cd-77b045ba9d21', 'B', 'Efavirenz', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('4c6408bf-9846-4e05-901e-75ed073f115c', '77d34a1c-2c22-42df-97cd-77b045ba9d21', 'C', 'Lamivudine', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d2559f42-3827-4e47-9b8d-316c27fa9c53', '77d34a1c-2c22-42df-97cd-77b045ba9d21', 'D', 'Emtricitabine', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c093d9a2-ddc7-499b-b8f2-285c1e9257ad', '77d34a1c-2c22-42df-97cd-77b045ba9d21', 'E', 'Zidovudin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1263d25b-c5bb-45cf-acb5-33cbada7f260', '787bd638-7cda-4001-afb9-95d1dd07d620', 'A', 'Ivermectin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('12c12fd9-f830-4d6b-80b8-648d1a6714c9', '787bd638-7cda-4001-afb9-95d1dd07d620', 'B', 'Albendazole', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('41fdd581-1f6d-48eb-8057-a1aa5dca5912', '787bd638-7cda-4001-afb9-95d1dd07d620', 'C', 'Diethylcarbamazine (DEC)', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('16af3fb4-5354-4544-b769-076e53a97fd8', '787bd638-7cda-4001-afb9-95d1dd07d620', 'D', 'Mebendazole', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a402fe1d-f51d-4bbc-a56e-85f10b841c65', '787bd638-7cda-4001-afb9-95d1dd07d620', 'E', 'Praziquantel', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('0962ef15-a3b7-4cb9-a06d-14e77af7b9c5', '7ad02156-de8d-426a-8f6d-2e6ce52b326e', 'A', 'Klorokuin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('9ec57086-02c8-4362-b66f-cad2f306d90a', '7ad02156-de8d-426a-8f6d-2e6ce52b326e', 'B', 'Doksisiklin', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('77a85e77-1da9-40d3-a60c-f25ca3094793', '7ad02156-de8d-426a-8f6d-2e6ce52b326e', 'C', 'DHP', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('09f174eb-a55d-49be-b079-a24581149671', '7ad02156-de8d-426a-8f6d-2e6ce52b326e', 'D', 'Artesunat', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('92e27fe2-8611-4b47-aabc-8bedeb7c9bc3', '7ad02156-de8d-426a-8f6d-2e6ce52b326e', 'E', 'Cotrimoksazol', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('bb117334-359a-49f0-8fe7-09f36b1e29b7', '7bc856fa-a766-49d3-bae3-ad57bbd577d3', 'A', 'Nistatin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('681df381-524e-4fa0-bcf0-693da450e367', '7bc856fa-a766-49d3-bae3-ad57bbd577d3', 'B', 'Flukonazole', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d024724d-5637-40e8-8a17-50253fb53895', '7bc856fa-a766-49d3-bae3-ad57bbd577d3', 'C', 'Ketokonazole', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('deda518f-6026-4414-8bee-32269e9a8491', '7bc856fa-a766-49d3-bae3-ad57bbd577d3', 'D', 'Terbinafine', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('64c5df92-660f-408e-9c27-2ce5a802dc88', '7bc856fa-a766-49d3-bae3-ad57bbd577d3', 'E', 'Itrakonazole', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('425ea241-6bb8-4239-bbf9-ba7826198f33', '7c6c40e8-6774-48f0-885b-eb801a1cee85', 'A', 'Pemeriksaan kadar Hb', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d2c5631d-db79-41f1-aacc-07de8eb7e757', '7c6c40e8-6774-48f0-885b-eb801a1cee85', 'B', 'Pemeriksaan kada gula darah sewaktu', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('2e62669d-addc-444e-96ec-56c6673efb6a', '7c6c40e8-6774-48f0-885b-eb801a1cee85', 'C', 'Pemeriksaan fungsi hati (SGOT/AST, SGPT/ALT)', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('7e233dd6-3cf2-4db5-9ec5-0340eb3c6109', '7c6c40e8-6774-48f0-885b-eb801a1cee85', 'D', 'Pemeriksaan fungsi jantung', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b3a83f4d-a9c0-4b97-8081-f2b2d3fcb2b8', '7c6c40e8-6774-48f0-885b-eb801a1cee85', 'E', 'Pemeriksaan elektrolit serum (Na, K, Cl)', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c1361ecd-1f71-401c-bde5-5fe7fea8134a', '7daa6640-2c73-4516-837b-26b0802cb4b9', 'A', 'Zidovudine (AZT)', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('8dbf5221-24d3-46bf-9c71-44aa736cc58e', '7daa6640-2c73-4516-837b-26b0802cb4b9', 'B', 'Lamivudine (3TC)', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('12fb3b30-30f7-45df-820c-b2a426c28d31', '7daa6640-2c73-4516-837b-26b0802cb4b9', 'C', 'Nevirapine (NVP)', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('4595aeec-861c-4662-9961-9926f86b060a', '7daa6640-2c73-4516-837b-26b0802cb4b9', 'D', 'Tenofovir (TDF)', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d1f4e3d0-d8cf-4976-9538-e5e9490b5db6', '7daa6640-2c73-4516-837b-26b0802cb4b9', 'E', 'Efavirenz (EFV)', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('52599175-016a-469f-b2de-3172a456ea15', '824f4a41-bcc8-453f-a8c8-fa1a3df086f7', 'A', 'Beta lactamase', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('ab5c9dd7-7d60-4bdf-a4e8-0c6b4a856d70', '824f4a41-bcc8-453f-a8c8-fa1a3df086f7', 'B', 'DNA gyrase', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('308312e5-2e16-4df0-9196-182995634680', '824f4a41-bcc8-453f-a8c8-fa1a3df086f7', 'C', 'DNA dependent RNA polymerase', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('aeeee599-eb4e-4561-ac3e-55e2730c2a46', '824f4a41-bcc8-453f-a8c8-fa1a3df086f7', 'D', 'Transpeptidase', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('4f8d8c10-8401-491f-8aa4-fd24450afd93', '824f4a41-bcc8-453f-a8c8-fa1a3df086f7', 'E', 'Dihydrofolate reductase', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('48ebef60-a81b-46c8-b552-8c1847cf989b', '9181b94c-c83f-4b06-bc9b-5623097b72ad', 'A', 'Metronidazole', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('8f6ec040-ff72-4345-9b57-5c69c0724755', '9181b94c-c83f-4b06-bc9b-5623097b72ad', 'B', 'Asiklovir', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('43b34bc2-4f17-4452-aa2b-7f3b6b1b5599', '9181b94c-c83f-4b06-bc9b-5623097b72ad', 'C', 'Cefixime', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('01586bd5-1514-4d67-a4d0-41c5430a0b16', '9181b94c-c83f-4b06-bc9b-5623097b72ad', 'D', 'Myconazole', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('cd87217f-3e01-42c9-81be-cb9bb02d99dc', '9181b94c-c83f-4b06-bc9b-5623097b72ad', 'E', 'Klotrimazole', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('dc737152-3165-472a-a392-d084a9cb5017', '95800482-8ca6-4f7e-ab08-6775dd1afd6a', 'A', 'Grisiofulvin', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f63c0997-b047-4dc5-a452-c2df3dcc873a', '95800482-8ca6-4f7e-ab08-6775dd1afd6a', 'B', 'Kotromoksazol', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1cc0a217-0cbd-44fa-8b68-48bb89583ab9', '95800482-8ca6-4f7e-ab08-6775dd1afd6a', 'C', 'Amfoterisin B', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a64beb74-3e66-43c9-8683-eebfd70f8aff', '95800482-8ca6-4f7e-ab08-6775dd1afd6a', 'D', 'Eritromisin', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('961ce199-5abd-45c6-b71b-af1534d4db35', '95800482-8ca6-4f7e-ab08-6775dd1afd6a', 'E', 'Ampisilin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a85b5763-e41a-402e-a978-c5f35ef409b7', 'aa1f47cb-631d-4353-bf48-09dde9b547af', 'A', 'Amoksisilin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('87b3f57d-a7b4-4737-aea4-670cfc59360f', 'aa1f47cb-631d-4353-bf48-09dde9b547af', 'B', 'Levofloxacin', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('29d1c6cb-dcc0-4212-8d8b-301a5566d2b2', 'aa1f47cb-631d-4353-bf48-09dde9b547af', 'C', 'Amikacin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('702143e0-4616-439a-8666-ccf71b53405a', 'aa1f47cb-631d-4353-bf48-09dde9b547af', 'D', 'Ampisilin', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('93822e98-ddfb-441f-ae3c-9062e99b2221', 'aa1f47cb-631d-4353-bf48-09dde9b547af', 'E', 'Streptomisin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('69dcbe3b-3acf-4db9-8d0f-1c756d26638c', 'acf4b247-3abf-4668-a2bc-c41e463c90ce', 'A', 'Eritromisin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a88e632b-7657-4544-9d44-6a91cddb3333', 'acf4b247-3abf-4668-a2bc-c41e463c90ce', 'B', 'Linezolid', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('fdd9726c-89c4-4770-8a7c-367e18534578', 'acf4b247-3abf-4668-a2bc-c41e463c90ce', 'C', 'Vankomisin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('57f03aca-03dd-4ddb-8920-d7438ab6496f', 'acf4b247-3abf-4668-a2bc-c41e463c90ce', 'D', 'Metronidazol', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('41548b85-f987-4378-b940-6e23aa12dea7', 'acf4b247-3abf-4668-a2bc-c41e463c90ce', 'E', 'Seftriakson', true, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('41c1dc71-8b0c-434d-8d88-a3c8d017a5c9', 'ad441df8-afd5-440f-b705-8697ac686376', 'A', 'Ciprofloksasin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('3f1c2066-5c17-4828-bf08-32a03e4080b0', 'ad441df8-afd5-440f-b705-8697ac686376', 'B', 'Amikasin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d3b5acf3-fcc2-4fde-9661-6d4d65a75478', 'ad441df8-afd5-440f-b705-8697ac686376', 'C', 'Doksisiklin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('79a14393-852a-4d7f-9258-fc8b57f1484d', 'ad441df8-afd5-440f-b705-8697ac686376', 'D', 'Gentamisin', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('eecca3d9-57f2-4338-a05b-338efb8ac667', 'ad441df8-afd5-440f-b705-8697ac686376', 'E', 'Seftriakson', true, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('00f7dc86-fcdf-4046-91de-25df2485571b', 'af0928ff-e1fb-490b-84b3-292b729f073c', 'A', 'Mebendazol', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('8259ec33-c6ef-4ffb-9efc-b4ecfa642225', 'af0928ff-e1fb-490b-84b3-292b729f073c', 'B', 'Dietilkarbamazin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('292d5f01-a9ae-4a15-a3ab-c90576433802', 'af0928ff-e1fb-490b-84b3-292b729f073c', 'C', 'Pirantel pamoat', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('bfa70222-3c43-47a1-a225-a6dab07bc984', 'af0928ff-e1fb-490b-84b3-292b729f073c', 'D', 'Hidrokortison', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c4a1d67a-e2ed-4132-9950-9ad25229e93b', 'af0928ff-e1fb-490b-84b3-292b729f073c', 'E', 'Mikonazol', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('ff686698-e4c0-4539-982b-eb5d56257be3', 'afb80e1e-31d8-46ef-9ea2-8168544ef776', 'A', 'Hepatotoksisitas', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5a70e286-a7cd-45e9-a4eb-70d8448477df', 'afb80e1e-31d8-46ef-9ea2-8168544ef776', 'B', 'Ototoksisitas', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c5909762-9fd5-4cd8-a2ea-94901a6dcfce', 'afb80e1e-31d8-46ef-9ea2-8168544ef776', 'C', 'Neurotoksisitas', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('517c88f2-ce30-4a9b-927c-9cd99e632975', 'afb80e1e-31d8-46ef-9ea2-8168544ef776', 'D', 'Nefrotoksisitas', true, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d001a5a0-5291-4c2c-b50f-6b550b9242ec', 'afb80e1e-31d8-46ef-9ea2-8168544ef776', 'E', 'Hematotoksisitas', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c4c219c1-7c84-4bd1-bbfb-1c9f9b2e58db', 'b651f97d-dac2-4f5e-ba2c-7aefa3e37f68', 'A', 'BCG', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5ac376cb-ef94-4834-a84c-a80d8530906f', 'b651f97d-dac2-4f5e-ba2c-7aefa3e37f68', 'B', 'DT', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('31d92f52-9c7b-4367-a0a1-18680e7a7a04', 'b651f97d-dac2-4f5e-ba2c-7aefa3e37f68', 'C', 'TD', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('25a4a4e3-54e5-4a34-bb05-68620bf8273a', 'b651f97d-dac2-4f5e-ba2c-7aefa3e37f68', 'D', 'DPT', true, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b6e00f9e-1d09-4eb1-a0d8-c67e0990e946', 'b651f97d-dac2-4f5e-ba2c-7aefa3e37f68', 'E', 'TT', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('8b80bc9b-57e7-446e-ba39-7b62007a5f94', 'b75d39de-c4d9-4132-880e-98e9f970d99a', 'A', 'Cefixime', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a13f1639-97d1-42e6-bd4e-0bf4d12cac2c', 'b75d39de-c4d9-4132-880e-98e9f970d99a', 'B', 'Cefadroksil', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f99c35d9-4e0c-4c2e-891f-8fee417229cb', 'b75d39de-c4d9-4132-880e-98e9f970d99a', 'C', 'Kloramfenikol', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('91a1d171-ae05-4c2c-bc3b-00d9f0080459', 'b75d39de-c4d9-4132-880e-98e9f970d99a', 'D', 'Kotrimoxazole', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e40e8e49-b30d-497a-af5b-5c2a6cc87531', 'b75d39de-c4d9-4132-880e-98e9f970d99a', 'E', 'Ciprofloxacin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('26d36816-4c06-46c0-b600-98616f1e713e', 'c3782443-1574-477f-a8c4-fdadf68915bc', 'A', 'Prazikuantel', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('fb1d70f3-1bda-4f32-902f-d795f7be7711', 'c3782443-1574-477f-a8c4-fdadf68915bc', 'B', 'Pirantel pamoat', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a0ef636c-ce69-4a91-9a91-9a7fcdb716b9', 'c3782443-1574-477f-a8c4-fdadf68915bc', 'C', 'Dietilkarbamazin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5d73e421-72fc-46be-a6a7-3fe9a8cf5ce4', 'c3782443-1574-477f-a8c4-fdadf68915bc', 'D', 'Metronidazo', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1f9dff52-d548-4b7c-a565-9b3d11502d86', 'c3782443-1574-477f-a8c4-fdadf68915bc', 'E', 'Albendazole', true, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('db5bc100-5e2f-4354-a424-6824ccef79cf', 'c6ea23f9-0c36-43f4-875f-7924870c4e0d', 'A', 'Azitromisin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b0b7af35-f6d5-49d9-b997-9a6d8f1a4016', 'c6ea23f9-0c36-43f4-875f-7924870c4e0d', 'B', 'Benzatin penisilin g', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('7bd4ee03-19ec-4aae-a77c-c4d8b9b7f51e', 'c6ea23f9-0c36-43f4-875f-7924870c4e0d', 'C', 'Ciprofloxacin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('3cde6151-4e70-4337-95f0-05f4bc1d167b', 'c6ea23f9-0c36-43f4-875f-7924870c4e0d', 'D', 'Kloramfenikol', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a904223d-8ce5-4fb5-bea5-fea85f5dc3a6', 'c6ea23f9-0c36-43f4-875f-7924870c4e0d', 'E', 'Tetrasiklin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5fa22922-701a-4a6d-8a77-524460d30870', 'ca7e73c3-15d0-4a86-9c66-07391397b726', 'A', 'SGPT dan SGOT', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('9d9bc61d-2931-4ad8-96c2-c9a432da195d', 'ca7e73c3-15d0-4a86-9c66-07391397b726', 'B', 'Kreatinin serum', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('735b8a4a-548f-4de9-b38e-9c1be447f72b', 'ca7e73c3-15d0-4a86-9c66-07391397b726', 'C', 'Trombosit', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('801bbaec-9831-4a14-9288-972f61b2e5b0', 'ca7e73c3-15d0-4a86-9c66-07391397b726', 'D', 'LDL dan HDL', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('216db368-84be-4f1e-8393-a39ff2fbdd88', 'ca7e73c3-15d0-4a86-9c66-07391397b726', 'E', 'Elektrolit', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('ee0fb5d9-e3a3-48e9-a565-886c2fec7c71', 'd022d1aa-e47d-4ebd-92e3-4735f1d51200', 'A', 'Linezolid', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f3314eff-47d1-4a44-b529-f12956a58e16', 'd022d1aa-e47d-4ebd-92e3-4735f1d51200', 'B', 'Moxifloxacin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a4e01d0d-1a82-4d3a-9acb-e85f6460476a', 'd022d1aa-e47d-4ebd-92e3-4735f1d51200', 'C', 'Clofazimine', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('387a57c9-4bd4-4b0f-8ee0-b3dc22e94bcc', 'd022d1aa-e47d-4ebd-92e3-4735f1d51200', 'D', 'Pirazinamid', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('db588165-bdab-47ab-8dde-d8f1e4e1f907', 'd022d1aa-e47d-4ebd-92e3-4735f1d51200', 'E', 'Etambutol', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('bdae40c7-bd4b-452b-bc47-b4810b5e3978', 'd2857e8a-9d6e-473f-aa7a-4cc7c2909df2', 'A', 'ACT tablet selama 3 hari', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1ed4f7e4-535c-42ab-b80e-fb033de92054', 'd2857e8a-9d6e-473f-aa7a-4cc7c2909df2', 'B', 'Doksisiklin 100 mg/hari selama 1 minggu', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f09c75d6-1bdf-4c22-8c5c-c375f7fe9f31', 'd2857e8a-9d6e-473f-aa7a-4cc7c2909df2', 'C', 'Kina 3 x 2 tablet + Klindamisin 2 x 300 mg selama 7 hari', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('cb50cc1a-b922-4ebb-9305-56ffa61254d2', 'd2857e8a-9d6e-473f-aa7a-4cc7c2909df2', 'D', 'Kina 3 x 2 tablet selama 7 hari', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('bf30cafd-9c49-4be9-980d-9131482fbcd0', 'd2857e8a-9d6e-473f-aa7a-4cc7c2909df2', 'E', 'Kina + Klorokuin + Amodiakuin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('32700223-48c7-4900-9b9a-845248459a97', 'd2e0c61a-f867-455c-b1e3-491e2808639d', 'A', 'Isoniazid', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1c7ab9e5-cbcf-4c8e-bf07-52a511af44f0', 'd2e0c61a-f867-455c-b1e3-491e2808639d', 'B', 'Streptomisin', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('862c614d-0b10-4aa3-9937-7141e52e73d1', 'd2e0c61a-f867-455c-b1e3-491e2808639d', 'C', 'Rifampisin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f736eed9-1633-4471-990f-f963ded334da', 'd2e0c61a-f867-455c-b1e3-491e2808639d', 'D', 'Etambutol', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('3e1404b4-ebc8-417f-aea6-05441659af8c', 'd2e0c61a-f867-455c-b1e3-491e2808639d', 'E', 'Pirazinamid', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a0e41f91-65e0-4fde-a907-f3c88cd9e72a', 'd44cc838-faec-43d5-beb7-ab9c535b256d', 'A', 'Menghambat sintesis asam folat dan menghambat reduksi asam dihydrofolat menjadi tetrahydrofolat sehingga menghambat enzim pada alur sintesis asam folat', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('213b61a1-de64-4d44-a6f5-df194842d6db', 'd44cc838-faec-43d5-beb7-ab9c535b256d', 'B', 'Blokade terikatnya asam amino ke ribosom bakteri (sub unit 30S).', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b1d5f96e-cbca-4b2a-80e1-ac0524b3bf87', 'd44cc838-faec-43d5-beb7-ab9c535b256d', 'C', 'Berikatan dengan penicilin protein binding (PBP) yang terletak di dalam maupun permukaan membran sel sehingga menghambat sintesis mukopeptida di dinding sel bakteri', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('52d3c30c-7e80-4979-825b-240ea8cd63a8', 'd44cc838-faec-43d5-beb7-ab9c535b256d', 'D', 'Menghambat DNA-gyrase', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('fe365326-fce9-4348-bdcf-fed207d6a094', 'd44cc838-faec-43d5-beb7-ab9c535b256d', 'E', 'Berikatan dengan rRNA dari subunit ribosom 50S bakteri. Sehingga sintesis protein bakteri terhambat.', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('fdd44ea8-0ca9-49fb-a7ce-3ed4f89034be', 'd4796c7b-56f0-43c9-933d-d069d959d818', 'A', 'Menghambat nukleotida ribosom transferase', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e14826a8-da80-412d-bfe5-8116d64e8389', 'd4796c7b-56f0-43c9-933d-d069d959d818', 'B', 'Menghambat non nukleotida ribosom transferase', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b4a3cf8d-63d3-4647-925d-cf713f2b9cd2', 'd4796c7b-56f0-43c9-933d-d069d959d818', 'C', 'Menghambat sintesis DNA', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d0029f0c-5c7f-4985-82b3-dcb390aa81ef', 'd4796c7b-56f0-43c9-933d-d069d959d818', 'D', 'Menghambat dinding sel', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('3ecd7a26-40be-4c2f-948b-64c57f8902b2', 'd4796c7b-56f0-43c9-933d-d069d959d818', 'E', 'Menghambat sintesis protein', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('3080210e-d7b4-4f31-af0f-7f4d0c85e65a', 'd690af58-03ec-4b8c-9fa5-b40da2d14e5d', 'A', 'Pengobatan TB dan ARV dimulai bersamaan', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c403355d-5370-40ce-bcb5-f8ffe5b6b326', 'd690af58-03ec-4b8c-9fa5-b40da2d14e5d', 'B', 'Pengobatan ARV dimulai terlebih dahulu karena CD4 <250 sel/mm3', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('173ddb2b-bfd9-4be7-ad4b-90f6d1c904f0', 'd690af58-03ec-4b8c-9fa5-b40da2d14e5d', 'C', 'Pengobatan ARV dalam 2 minggu pertama setelah pengobatan TB.', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('85f5a807-4608-4944-8cb7-e10da4de7ab4', 'd690af58-03ec-4b8c-9fa5-b40da2d14e5d', 'D', 'Pengobatan ARV dimulai terlebih dahulu, kemudian dilanjutkan dengan pengobatan TB sesegera mungkin dalam 8 minggu pertama pengobatan ARV', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('0ade36fb-4ad7-4421-af0e-f3f368b50fe3', 'd690af58-03ec-4b8c-9fa5-b40da2d14e5d', 'E', 'pengobatan TB dimulai terlebih dahulu, kemudian dilanjutkan dengan pengobatan ARV sesegera mungkin dalam 2 minggu pertama pengobatan TB', true, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('eb9134e0-b759-4880-9eb7-d192e33c806e', 'd80c1b42-b62b-4e8e-9c82-d3e5bda60663', 'A', 'Melanjutkan pengobatan dosis yang tersisa sampai seluruh dosis pengobatan terpenuhi', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('77035831-d36b-45e1-ace6-ac46b0b48311', 'd80c1b42-b62b-4e8e-9c82-d3e5bda60663', 'B', 'Menghentikan pengobatan TB karena hasil BTA sudah negative', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5835d147-5e12-4e33-9eea-24075b389bd2', 'd80c1b42-b62b-4e8e-9c82-d3e5bda60663', 'C', 'Mengulang pengobatan TB dari fase intensif awal (HRZE) selama 2 bulan', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('919349f0-7959-44e7-baf9-7ffabe2119f3', 'd80c1b42-b62b-4e8e-9c82-d3e5bda60663', 'D', 'Mengganti regimen OAT dengan regimen TB-XDR', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b63fbaca-9df0-4821-a046-291ac5f10db5', 'd80c1b42-b62b-4e8e-9c82-d3e5bda60663', 'E', 'Menambah lama pengobatan fase lanjutan menjadi 9 bulan tanpa evaluasi', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b9e3e41d-1a1e-40df-84d7-8e6def14214a', 'dad3c5ac-5c97-45d5-a88c-c72eb99af433', 'A', 'Kloramfenikol', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('86c96daa-c7e0-497b-90e7-10eab59242f8', 'dad3c5ac-5c97-45d5-a88c-c72eb99af433', 'B', 'Klindamisin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('61279d46-d7c6-4b1f-bb15-1a253e9f22c2', 'dad3c5ac-5c97-45d5-a88c-c72eb99af433', 'C', 'Gentamisin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('4d926c85-ca7b-4aaf-837b-0784e2b8ee17', 'dad3c5ac-5c97-45d5-a88c-c72eb99af433', 'D', 'Siprofloksasin', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('71f17e0c-ca18-468c-84f2-1965513a144a', 'dad3c5ac-5c97-45d5-a88c-c72eb99af433', 'E', 'Kotrimoksazol', true, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('fa5a1940-0d3e-4b4d-9052-05ff5f92ec43', 'dbb3bccb-c2ec-4897-8132-82ef2f3a87b4', 'A', 'Nistatin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('2ab0e2d4-0209-4a2e-84f2-9d9283ffff16', 'dbb3bccb-c2ec-4897-8132-82ef2f3a87b4', 'B', 'Ekonazol', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('2042a854-8fb3-45af-a770-155ca4527303', 'dbb3bccb-c2ec-4897-8132-82ef2f3a87b4', 'C', 'Terfenadin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('6413f34e-cd03-43c3-adda-a20d92d4cfa2', 'dbb3bccb-c2ec-4897-8132-82ef2f3a87b4', 'D', 'Metronidazole', true, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e8f46c8a-417f-4bc4-a41c-b6d35766435e', 'dbb3bccb-c2ec-4897-8132-82ef2f3a87b4', 'E', 'Ketokonazole', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b68fc244-a994-4cb6-8e7e-18d13a1cbda3', 'de9c687f-6bc2-4252-9e59-ecf5f60dccd9', 'A', 'Sefadroksil', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('2665be54-bca7-45ac-a066-1f700fe69d3c', 'de9c687f-6bc2-4252-9e59-ecf5f60dccd9', 'B', 'Ampisilin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('3620d1f3-3792-4ed1-b37e-524175cd84fe', 'de9c687f-6bc2-4252-9e59-ecf5f60dccd9', 'C', 'Metronidazol', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f3405547-bf64-43fd-bd2a-ee806db10060', 'de9c687f-6bc2-4252-9e59-ecf5f60dccd9', 'D', 'Sulfametoksazol', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('9a20385c-cfa0-45de-8fb8-2f0e5ada9965', 'de9c687f-6bc2-4252-9e59-ecf5f60dccd9', 'E', 'Ciprofloxacin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('fd6f7f5a-65ea-4042-8227-ec9abd714c97', 'ec83b096-4591-4180-81bf-595387b36cc7', 'A', 'Menghambat sintesis dinding sel bakteri', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e45ed33a-bd60-4aeb-a36a-a4d27e793bb9', 'ec83b096-4591-4180-81bf-595387b36cc7', 'B', 'Blokade terikatnya asam amino ke ribosom bakteri (sub unit 30S).', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('898ed9b5-33a4-414e-b7cf-062ddfe763af', 'ec83b096-4591-4180-81bf-595387b36cc7', 'C', 'Menghambat DNA-gyrase', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('ce6437f0-cb65-4121-9d84-807cf24cccc5', 'ec83b096-4591-4180-81bf-595387b36cc7', 'D', 'Menghambat sintesis asam folat', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('cc459fcc-9340-4790-8854-3347948aa29a', 'ec83b096-4591-4180-81bf-595387b36cc7', 'E', 'Menghambat reduksi asam dihydrofolat menjadi tetrahydrofolat sehingga menghambat enzim pada alur sintesis asam folat', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('13ccd019-fbae-499f-a95e-b88aa77df436', 'f2f7ea03-681b-43dd-bce1-fa04a02ff128', 'A', 'Metronidazole', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('95954a96-45df-46e6-badc-7a1bb98af1d4', 'f2f7ea03-681b-43dd-bce1-fa04a02ff128', 'B', 'Ciprofloxacin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e4255de7-70d6-42da-97ed-207102ce5634', 'f2f7ea03-681b-43dd-bce1-fa04a02ff128', 'C', 'Azitromycin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('dd6268f8-8460-4d48-b188-c140c5045bf9', 'f2f7ea03-681b-43dd-bce1-fa04a02ff128', 'D', 'Cefixime', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f95b788e-3ffb-490f-ae01-e68f749a95da', 'f2f7ea03-681b-43dd-bce1-fa04a02ff128', 'E', 'Cefadroxil', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('06929a1f-2f37-40d3-936c-29b4df723871', 'f8270336-b7e7-40a0-b6f8-d2e2b421a56e', 'A', 'Meflokuin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('7d70f5d3-b10d-487a-bc7d-2351c22ddb94', 'f8270336-b7e7-40a0-b6f8-d2e2b421a56e', 'B', 'Tetrasiklin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('edc209db-a5a2-48e1-a4d5-0a2ba0e70daa', 'f8270336-b7e7-40a0-b6f8-d2e2b421a56e', 'C', 'DHP', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('637dec72-9f06-49ae-84fe-bcd90ab9a519', 'f8270336-b7e7-40a0-b6f8-d2e2b421a56e', 'D', 'Cotrimoxazole', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d8285f50-4467-4006-9c14-05f30f405607', 'f8270336-b7e7-40a0-b6f8-d2e2b421a56e', 'E', 'Primakuin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e8c1db64-a2ee-4603-b492-291d5698c1dc', 'f8849106-e767-4abf-bdb8-8cae1e62c594', 'A', 'Amoksiklav', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('affb47a6-3761-4c06-b4fb-013fc827451b', 'f8849106-e767-4abf-bdb8-8cae1e62c594', 'B', 'Cefixime', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a25c2b45-bbd0-4f8f-aecf-c3f20162c6e3', 'f8849106-e767-4abf-bdb8-8cae1e62c594', 'C', 'Cefadroxil', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('8ac9b0a0-c6a8-47db-94e9-948d7bff3607', 'f8849106-e767-4abf-bdb8-8cae1e62c594', 'D', 'Eritromisin', true, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c7d5c84c-7b0b-46dc-b0b2-fb8869bb0a5f', 'f8849106-e767-4abf-bdb8-8cae1e62c594', 'E', 'Klindamisin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('510e42d5-c6d5-466b-81ab-92dd75a8f6dd', '04743142-87c2-45c5-9037-2672b3b754bb', 'A', 'Piroksikam dan allopurinol', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('2b9eb8ac-3ee0-41b9-beac-c9f4598e8ecb', '04743142-87c2-45c5-9037-2672b3b754bb', 'B', 'PCT dan allopurinol', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e2e1ff60-3390-4aa2-a5f1-6a130a49e72c', '04743142-87c2-45c5-9037-2672b3b754bb', 'C', 'Tramadol dan allopurinol', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d5af9de7-488e-425e-9861-d5fdc6cb1f75', '04743142-87c2-45c5-9037-2672b3b754bb', 'D', 'Kodein dan allopurinol', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('53f28484-826e-4a7e-ac47-ff573d77fcff', '04743142-87c2-45c5-9037-2672b3b754bb', 'E', 'Morfin dan allopurinol', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c4471495-362e-4ccc-b1b8-711b8169c89b', '07d330de-9007-4f38-b39a-b9b1c58de1fc', 'A', 'Kalsium dan vitamin D', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('4fab0db7-c3b6-4cce-913d-38d3d8fd876f', '07d330de-9007-4f38-b39a-b9b1c58de1fc', 'B', 'Alendronate', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('8c14b949-62fb-48a1-9b1c-6d664fbd20af', '07d330de-9007-4f38-b39a-b9b1c58de1fc', 'C', 'Raloxifene', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('52108670-dda8-4618-ae7f-e58635093614', '07d330de-9007-4f38-b39a-b9b1c58de1fc', 'D', 'Teriparatide', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b6df4673-8463-4e09-a071-e9b3521174f3', '07d330de-9007-4f38-b39a-b9b1c58de1fc', 'E', 'Denosumab', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b82da57c-750d-4064-9e23-1fb216a3b400', '085800a9-50f4-4064-9301-698bbde9c166', 'A', 'Meningkatkan efikasi dari Celecoxib', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('ae3730f8-0097-4d33-b608-0d7327d7461f', '085800a9-50f4-4064-9301-698bbde9c166', 'B', 'Mengurangi rasa nyeri', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('adf488a8-3761-4647-8b8c-b15546e1b7e0', '085800a9-50f4-4064-9301-698bbde9c166', 'C', 'Mengurangi efek samping dari Celecoxib', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a8816bc9-b2ef-439d-82e4-222bc655a37d', '085800a9-50f4-4064-9301-698bbde9c166', 'D', 'Mengurangi efek samping Metotreksat', true, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a2dc02f3-0cd2-47ea-98b8-250fb46e0c79', '085800a9-50f4-4064-9301-698bbde9c166', 'E', 'Mencegah peningkatan keparahan rheumatoid arthritis', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('8633d162-1619-44f8-b19b-ec4892d8f851', '0a91a5cd-4d11-46ab-8a91-a88f96ab2504', 'A', 'Celecoxib', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('15012901-e42f-451e-a26e-d728bdd694ab', '0a91a5cd-4d11-46ab-8a91-a88f96ab2504', 'B', 'Piroksikam', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e8d928f9-8428-45ca-897c-d3896311d0a5', '0a91a5cd-4d11-46ab-8a91-a88f96ab2504', 'C', 'Allopurinol', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('ef358e9e-c479-4110-b1ce-bac9cfeceb76', '0a91a5cd-4d11-46ab-8a91-a88f96ab2504', 'D', 'Probenesid', true, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5a068a0a-26c4-47c2-851e-a689679efda2', '0a91a5cd-4d11-46ab-8a91-a88f96ab2504', 'E', 'Kolkisin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f84df756-12a9-4971-9012-270e3a3e1734', '0a958e2a-92e8-47f3-8cb7-4eab190163ae', 'A', 'Kalsium karbonat', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('2b589965-7e18-4de3-a949-2d9d9932fb05', '0a958e2a-92e8-47f3-8cb7-4eab190163ae', 'B', 'Kalsium sitrat', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e04f5398-6a83-4252-9473-fc542c4bd0db', '0a958e2a-92e8-47f3-8cb7-4eab190163ae', 'C', 'Trikalsium fosfat', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('0f078c7e-6c3d-49e8-9b42-dfa791354e6e', '0a958e2a-92e8-47f3-8cb7-4eab190163ae', 'D', 'Kalsium laktat', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b1e8e4fc-08d1-40ea-9d5d-4646b2e23727', '0a958e2a-92e8-47f3-8cb7-4eab190163ae', 'E', 'Kalsium glukonat', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('41a8fa69-0d0a-471d-95f0-87291952a143', '1061e326-b896-4c9c-a19c-13bc49edb275', 'A', 'Vitamin D', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5d072306-3cbd-4ac6-9fe9-aca603c47281', '1061e326-b896-4c9c-a19c-13bc49edb275', 'B', 'Kalsitriol', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('ef384a78-745e-4104-aac6-7c545a9d1ee8', '1061e326-b896-4c9c-a19c-13bc49edb275', 'C', 'Kalsitonin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('3f22be69-f44b-4a8e-a7f3-39586abcce1d', '1061e326-b896-4c9c-a19c-13bc49edb275', 'D', 'Zoledronic acid', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('474316d9-d93e-41b8-acd1-fc5c5bd51198', '1061e326-b896-4c9c-a19c-13bc49edb275', 'E', 'Teriparatide', true, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c7d0a9a3-c991-4b2a-8e06-b95df0c9f734', '1ad5940c-d3bb-42ae-a869-1ffa4d7c6571', 'A', 'Hipertensi', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('2387c4b1-d165-401d-ac6f-192ed1c462da', '1ad5940c-d3bb-42ae-a869-1ffa4d7c6571', 'B', 'Hiperglikemia', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b5e3934c-28a9-414c-b0db-c8f575c237f9', '1ad5940c-d3bb-42ae-a869-1ffa4d7c6571', 'C', 'Hiperlipidemia', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('2187008d-876b-4770-8a98-347f43eb498e', '1ad5940c-d3bb-42ae-a869-1ffa4d7c6571', 'D', 'Hiperurisemia', true, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('62b35aa0-2173-4812-8881-d1be8f8ad436', '1ad5940c-d3bb-42ae-a869-1ffa4d7c6571', 'E', 'Arthritis', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c3f53d92-e270-4e09-8feb-70ea4d5e19bc', '213b5c0d-faa9-4fbe-beca-edfe9a6df08f', 'A', 'Menghentikan metotreksat secara langsung', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('ce31fb8c-85a5-492d-bc9b-476cb5d17b7b', '213b5c0d-faa9-4fbe-beca-edfe9a6df08f', 'B', 'Menambahkan vitamin B kompleks', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d8710558-fc84-492f-948c-edfae2672a61', '213b5c0d-faa9-4fbe-beca-edfe9a6df08f', 'C', 'Memberikan asam folat sebagai suplementasi', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('900a4b38-d5e7-468b-ab47-6fb529b72517', '213b5c0d-faa9-4fbe-beca-edfe9a6df08f', 'D', 'Mengganti metotreksat dengan prednisone', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('72844657-9ffb-4faa-b644-e473052a4a67', '213b5c0d-faa9-4fbe-beca-edfe9a6df08f', 'E', 'Menurunkan dosis metotreksat menjadi 5 mg/minggu', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b2aa8696-2109-455f-bed4-f4f74bbdd066', '2264b24b-341c-4ba2-bd5d-321bb41cc8d8', 'A', 'Peningkatan AST dan ALT', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f63e5f9b-9f14-493e-b24a-da7b9c8e98ea', '2264b24b-341c-4ba2-bd5d-321bb41cc8d8', 'B', 'Albuminuria', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('56638ebb-ee1c-48f9-92f4-500e5a4cd6de', '2264b24b-341c-4ba2-bd5d-321bb41cc8d8', 'C', 'Hematuria', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('02a8d062-4138-413e-94f8-f39c2e81ebd0', '2264b24b-341c-4ba2-bd5d-321bb41cc8d8', 'D', 'Pembentukan batu ginjal', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a85a80e5-60e4-4e4b-8a4c-dbe91a1510e3', '2264b24b-341c-4ba2-bd5d-321bb41cc8d8', 'E', 'Perlemakan hati', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('4ecc90f0-319e-4e6d-8b64-3626b86d42ac', '2e76a658-2ebc-40d2-aade-b0a358933883', 'A', 'Benzodiazepin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('6548346d-3af7-4ca2-a3df-fa781dcadc59', '2e76a658-2ebc-40d2-aade-b0a358933883', 'B', 'Litium', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('4c20c294-1592-4baa-90a1-e8a5b4522f57', '2e76a658-2ebc-40d2-aade-b0a358933883', 'C', 'Tramadol', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e2d862f2-f97e-48a1-88a9-7ef7209a6c02', '2e76a658-2ebc-40d2-aade-b0a358933883', 'D', 'Adalimumab', true, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('da6a7085-a7f9-4910-81eb-965aa94cab86', '2e76a658-2ebc-40d2-aade-b0a358933883', 'E', 'Amitriptilin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('6376482a-6687-408a-906a-eadfb8d7f772', '2f0d82e6-476b-4413-ab2c-d024f55f7843', 'A', 'Paracetamol', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('cbb32676-0465-4fc7-b1c0-c3e912faa905', '2f0d82e6-476b-4413-ab2c-d024f55f7843', 'B', 'Asam mefenamat', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f622673c-0041-409a-8217-ecfbd3daa062', '2f0d82e6-476b-4413-ab2c-d024f55f7843', 'C', 'Indometasin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c02a0464-b5a5-43c1-a2e3-a51a5f46c9dd', '2f0d82e6-476b-4413-ab2c-d024f55f7843', 'D', 'Ibuprofen', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b131765a-81de-4c0f-89af-06cee7a418ab', '2f0d82e6-476b-4413-ab2c-d024f55f7843', 'E', 'Asetosal', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d364583c-1d1c-4a86-8da7-835e10430188', '30b639c4-f1a3-4d9e-be3c-a1ce3a1eed1c', 'A', 'Untuk meningkatkan penyerapan obat dan mengurangi risiko iritasi esofagus', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1cd59ebe-526e-45a3-9d03-4b875a822287', '30b639c4-f1a3-4d9e-be3c-a1ce3a1eed1c', 'B', 'Untuk mencegah hipokalsemia yang disebabkan oleh alendronate', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('47fd2e4e-0792-4106-9f63-cb9f94ac275f', '30b639c4-f1a3-4d9e-be3c-a1ce3a1eed1c', 'C', 'Untuk mempercepat onset kerja alendronat dalam tubuh', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('486f7137-3b17-49b5-868b-10f3d9f75e92', '30b639c4-f1a3-4d9e-be3c-a1ce3a1eed1c', 'D', 'Untuk menghindari interaksi alendronat dengan makanan yang dapat meningkatkan efek sampingnya', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c9fbaa49-c82a-49fe-ad7f-05ca42ea18ce', '30b639c4-f1a3-4d9e-be3c-a1ce3a1eed1c', 'E', 'Untuk memastikan distribusi alendronat ke jaringan tulang lebih efektif', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('739c99ae-ee46-4801-a671-ddbe7d01d85b', '33e956ad-d069-458d-a5c6-c09e430b38b4', 'A', 'Metotreksat', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('20789126-f49c-4fd1-992b-f1ef4af68b69', '33e956ad-d069-458d-a5c6-c09e430b38b4', 'B', 'Leflunomide', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('965d617a-400f-4c08-9139-91b38139c4e8', '33e956ad-d069-458d-a5c6-c09e430b38b4', 'C', 'Hidroksiklorokuin', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('682742b6-aeb9-4cba-bf69-922784ff5340', '33e956ad-d069-458d-a5c6-c09e430b38b4', 'D', 'Tofacitinib', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('2c49c88a-92bf-4669-ba64-705bf62de281', '33e956ad-d069-458d-a5c6-c09e430b38b4', 'E', 'Etanercept', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('db2a9e83-0f1c-4b88-be6c-56febd25af7f', '3616f5c1-e945-4616-bc13-8a0472468dc1', 'A', 'Piroksikam', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1c24403f-5547-4b79-9e18-fbd612a753af', '3616f5c1-e945-4616-bc13-8a0472468dc1', 'B', 'Allopurinol', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('ef37e0c9-068a-4205-b1df-59db593d2be7', '3616f5c1-e945-4616-bc13-8a0472468dc1', 'C', 'Probenesid', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c0016cac-5af2-4c68-ae5b-f6ef25be60bd', '3616f5c1-e945-4616-bc13-8a0472468dc1', 'D', 'Kolkisin', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('bfc649f5-4fa6-4733-a10e-85bae52f12d1', '3616f5c1-e945-4616-bc13-8a0472468dc1', 'E', 'Pregabalin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e8a2193e-73d8-44cf-94c6-72158d1e35db', '36a599ae-362d-450b-b8e9-4d141f9e265a', 'A', 'Risedronate', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('da4ebd58-81c2-4b70-b56f-b3d9941a752d', '36a599ae-362d-450b-b8e9-4d141f9e265a', 'B', 'Ibandronate', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a31ae551-3195-4bcf-829a-b0bceeeb18a2', '36a599ae-362d-450b-b8e9-4d141f9e265a', 'C', 'Raloksifen', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('0c0162d9-9e95-44f3-9bee-fe2c386cfb5e', '36a599ae-362d-450b-b8e9-4d141f9e265a', 'D', 'Teriparatide', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('55d998a2-4aa9-4dc3-a76d-623a663e1ec5', '36a599ae-362d-450b-b8e9-4d141f9e265a', 'E', 'Calcitonin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('19c1c6aa-b167-41cc-bd73-5b015e0bd37e', '3c170ac9-b318-4bad-8249-73134362cd7c', 'A', 'Menghambat aktivitas osteoklas dan menginduksi apoptosis osteoklas', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('eed21b16-bd76-4064-973c-3f5db41c73af', '3c170ac9-b318-4bad-8249-73134362cd7c', 'B', 'Meningkatkan penyerapan kalsium di usus dan reabsorpsi kalsium di ginjal', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('9d475150-b825-45f3-a617-156d186a5203', '3c170ac9-b318-4bad-8249-73134362cd7c', 'C', 'Menghambat sekresi parathormon (PTH) dan mengurangi resorpsi tulang', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('24c65c10-df8b-44ef-8760-ef4a32f0d2b8', '3c170ac9-b318-4bad-8249-73134362cd7c', 'D', 'Menghambat diferensiasi osteoklas dari prekursor monosit-makrofag', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('70be100b-856a-4d54-9ca5-384fbaad4873', '3c170ac9-b318-4bad-8249-73134362cd7c', 'E', 'Meningkatkan sintesis kolagen tipe 1 dan mineralisasi tulang', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('0477d601-0a1f-4536-9a16-53d59c747f52', '412f97e5-8551-4275-948e-4a0956700570', 'A', 'Enalapril', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('fd92d0b1-c60d-4081-a440-249b90acb6ac', '412f97e5-8551-4275-948e-4a0956700570', 'B', 'Asetosal', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('0c8d8a6b-1f37-49c9-b62f-cf40f3cd8689', '412f97e5-8551-4275-948e-4a0956700570', 'C', 'Atenolol', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('21e31c59-b23b-49b0-a48d-045d93d60a4d', '412f97e5-8551-4275-948e-4a0956700570', 'D', 'Levotiroksin', true, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a1cf7a99-71c2-491d-8193-04325e4167cd', '412f97e5-8551-4275-948e-4a0956700570', 'E', 'Salmeterol', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('3b8d36e3-ab36-45c2-bdc6-c9925e172f65', '4ea81d0b-09d8-4445-950a-b105ad8bf8ef', 'A', 'Mencegah pembentukan kristaluria', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('3138712d-cf33-47cd-b3a8-b7ae65ed043e', '4ea81d0b-09d8-4445-950a-b105ad8bf8ef', 'B', 'Mencegah peningkatan alanine transferase', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('2993fe3a-d5a5-4a67-aa3e-74dc115a8725', '4ea81d0b-09d8-4445-950a-b105ad8bf8ef', 'C', 'Menurunkan sekresi asam urat', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('0a01149e-a9b2-4a86-a6d1-b3aab85808dc', '4ea81d0b-09d8-4445-950a-b105ad8bf8ef', 'D', 'Mencegah kerja xantin oksidase', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('dc586921-e06d-4387-9930-d47742824475', '4ea81d0b-09d8-4445-950a-b105ad8bf8ef', 'E', 'Mencegah reabsorpsi asam urat', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('2688af10-90d6-4329-aa22-ea577c0060f4', '508de76a-e370-4a9c-9ed8-aa45b52911af', 'A', 'Histamin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c766e2d9-cfb4-40f2-959f-d73e6f96848c', '508de76a-e370-4a9c-9ed8-aa45b52911af', 'B', 'Tromboksan', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('58a59f32-c043-4472-8fdd-ee310920021b', '508de76a-e370-4a9c-9ed8-aa45b52911af', 'C', 'Leukotriene', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('6168eb3e-042f-483a-9bc0-7075a45458e6', '508de76a-e370-4a9c-9ed8-aa45b52911af', 'D', 'Prostaglandin', true, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('99950035-aca2-4eff-b53e-aa4fa77a7354', '508de76a-e370-4a9c-9ed8-aa45b52911af', 'E', 'Prostasiklin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1ce14587-3f24-43ad-95fa-4b5d61e02cd1', '53004ba8-550e-472d-9917-8790eed06317', 'A', 'Glukosamin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('71146a49-d2e9-436e-89d1-1b5f0fde54d0', '53004ba8-550e-472d-9917-8790eed06317', 'B', 'Fenilalanin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('02359f00-f1b5-461e-9118-41b676523f90', '53004ba8-550e-472d-9917-8790eed06317', 'C', 'Allopurinol', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('cbf68283-5349-47e9-974c-18e1872ad697', '53004ba8-550e-472d-9917-8790eed06317', 'D', 'Metotreksat', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('debe408a-70e3-4401-8f44-1d666645af0d', '53004ba8-550e-472d-9917-8790eed06317', 'E', 'Suplemen kalsium', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('7b7c2cb1-0c5c-4de7-aaf1-7aa8c631deee', '556cd8bb-18e7-4763-9b41-729f5676ab19', 'A', 'Dipeptidyl peptidase IV', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('39cf81b8-34d5-4afb-b233-ec70087c580b', '556cd8bb-18e7-4763-9b41-729f5676ab19', 'B', 'Topoisomerase I', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a9bde233-813b-49c9-bd97-a8e081c32eb7', '556cd8bb-18e7-4763-9b41-729f5676ab19', 'C', 'Xanthine oksidase', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('84ac3756-750f-4fe4-8957-adbdf9cf9237', '556cd8bb-18e7-4763-9b41-729f5676ab19', 'D', 'HMG-CoA reductase', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e36e11e9-7ef3-46fb-a128-56afb5021191', '556cd8bb-18e7-4763-9b41-729f5676ab19', 'E', 'Adenilat siklase', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('6fc0e876-b07b-4f84-bb73-927a14ad1a63', '5697a85f-d1e7-46d9-9bd6-ef2c5970bfdb', 'A', 'Allopurinol', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('792e8a86-438e-4937-9d7c-b348b1d05a78', '5697a85f-d1e7-46d9-9bd6-ef2c5970bfdb', 'B', 'Probenesid', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('75292011-3c03-4e04-957e-a8db4b4c672c', '5697a85f-d1e7-46d9-9bd6-ef2c5970bfdb', 'C', 'Indometasin', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d20e9840-a18d-4d42-b483-4bf8507567d0', '5697a85f-d1e7-46d9-9bd6-ef2c5970bfdb', 'D', 'Febuxostat', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('9ab3743c-e8a4-4acf-8a61-6cf6388ae82b', '5697a85f-d1e7-46d9-9bd6-ef2c5970bfdb', 'E', 'Rasburicase', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1b0818f9-2cc8-4da0-b674-0e98e653e8f6', '57f92581-5d3e-4190-94f8-6102031f71aa', 'A', 'Mg trisilikat', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('349061fa-a172-4537-bdf3-72812b6afe90', '57f92581-5d3e-4190-94f8-6102031f71aa', 'B', 'Simetikon', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('571d279f-9137-4a98-8e1c-68b5ea91a3b9', '57f92581-5d3e-4190-94f8-6102031f71aa', 'C', 'Sukralfat', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('43fa7210-dc94-4743-bc2b-a2543ced32e7', '57f92581-5d3e-4190-94f8-6102031f71aa', 'D', 'Misoprostol', true, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('37156e1e-500d-48ff-b623-6236d4acd11b', '57f92581-5d3e-4190-94f8-6102031f71aa', 'E', 'Antasida', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('8c637ba9-0571-4f1f-be45-ada7e162416d', '5b38917b-402a-4e0a-8ae4-e074748fded7', 'A', 'Alendronate', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b235a0a0-717c-4dcf-946a-f2cb6da67381', '5b38917b-402a-4e0a-8ae4-e074748fded7', 'B', 'Raloksifen', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1d91b215-9471-428e-a5e5-abafb9783e62', '5b38917b-402a-4e0a-8ae4-e074748fded7', 'C', 'Risedronate', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d15cbb5a-5819-460f-8c1c-6d13c7299485', '5b38917b-402a-4e0a-8ae4-e074748fded7', 'D', 'Zoledronate', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('509c42ea-6bc2-4b3d-8e93-1be920be6d24', '5b38917b-402a-4e0a-8ae4-e074748fded7', 'E', 'Vitamin D', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('04d79972-6e8a-46fe-84e0-27bc58fcb1f1', '6e9cfa0f-856e-484f-86c4-eb2ce6564685', 'A', 'Vitamin D', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f0aef339-1f06-4729-8623-f7a6d57b3ead', '6e9cfa0f-856e-484f-86c4-eb2ce6564685', 'B', 'Kalsium', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a6087b27-1160-4f2b-8b94-5c459a150753', '6e9cfa0f-856e-484f-86c4-eb2ce6564685', 'C', 'Raloksifen', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('3bb08451-b20a-40fe-a8ee-f91197b8f83a', '6e9cfa0f-856e-484f-86c4-eb2ce6564685', 'D', 'Prokalsitonin', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('17b9eb3f-fc82-4a74-9f2b-c68870229ed1', '6e9cfa0f-856e-484f-86c4-eb2ce6564685', 'E', 'Vitamin K', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('9751d532-86a4-4101-a584-ea5948b41d31', '749d090c-0077-4a90-b7f6-2a04a49efe73', 'A', 'Pasien resisten terhadap allopurinol, sehingga obatnya perlu diganti', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('492d424c-087d-4c59-bb8c-35c561c4a785', '749d090c-0077-4a90-b7f6-2a04a49efe73', 'B', 'Pasien alergi terhadap allopurinol', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('20a24b62-3a06-4719-ac06-084b12a20634', '749d090c-0077-4a90-b7f6-2a04a49efe73', 'C', 'Pasien mengalami serangan gout karena mobilisasi asam urat dari persendian ke jaringan', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('eee56b3a-44a2-4b22-8c30-ecae0c43e292', '749d090c-0077-4a90-b7f6-2a04a49efe73', 'D', 'Terjadi interaksi antara obat, sehingga allopurinol perlu dihentikan', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('6ddb440f-6a4c-4fc2-af19-3f5350250d19', '749d090c-0077-4a90-b7f6-2a04a49efe73', 'E', 'Kadar asam urat meningkat setelah mendapatkan allopurinol', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('59050fad-c98c-4948-a32d-b070f00b4961', '77662bce-7d3f-4793-a28f-9e72bff1c959', 'A', 'Kalsium meningkatkan absorbs alendronate', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('06b2299b-e8e4-4094-a939-bd8d088f7547', '77662bce-7d3f-4793-a28f-9e72bff1c959', 'B', 'Alendronate menurunkan metabolisme kalsium', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('ead312be-0a5d-4c09-9f6c-1906e8048c33', '77662bce-7d3f-4793-a28f-9e72bff1c959', 'C', 'Kalsium meningkatkan distribusi alendronate dalam darah', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('0d97e285-f36c-487a-9a07-487bd6d38f92', '77662bce-7d3f-4793-a28f-9e72bff1c959', 'D', 'Kalsium menurunkan absorbsi alendronate', true, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5aca3f2d-ffe3-4b96-8dd1-eee0c553a6f5', '77662bce-7d3f-4793-a28f-9e72bff1c959', 'E', 'Alendronate meningkatkan metabolisme kalsium', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('6c2c5bc8-ff6c-4db9-8d00-b4017f933c63', '803ad642-b354-4108-ba29-68ae504ff04d', 'A', 'Etanercept', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('13d51bbf-c735-4686-993b-190abf7586f0', '803ad642-b354-4108-ba29-68ae504ff04d', 'B', 'Deksametason', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('41d1c49e-30f8-42eb-9832-5f637724c326', '803ad642-b354-4108-ba29-68ae504ff04d', 'C', 'Hidroksiklorokuin', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a43d3fdc-ebc2-409c-9edc-4656e06a8cbb', '803ad642-b354-4108-ba29-68ae504ff04d', 'D', 'Ketoprofen', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('0440cac3-7cad-40f9-b2f4-c6e98e09d2f3', '803ad642-b354-4108-ba29-68ae504ff04d', 'E', 'Infliksimab', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1e07372a-2e25-4e1d-a589-0050a69e3111', '82fefc3d-e923-40d7-83fa-41e14046037b', 'A', 'Kuinolon', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f2decb78-65ca-46e0-8ff4-aaacf8a8b07e', '82fefc3d-e923-40d7-83fa-41e14046037b', 'B', 'Kloramfenikol', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('dbe6f2b4-4673-4ccd-a9e9-eef459cd3251', '82fefc3d-e923-40d7-83fa-41e14046037b', 'C', 'Cefazolin', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('77756fdb-07dc-4f20-8b64-7dc9b48b1cb6', '82fefc3d-e923-40d7-83fa-41e14046037b', 'D', 'Carbapenem', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('08316573-083a-4450-8340-638410a72e3b', '82fefc3d-e923-40d7-83fa-41e14046037b', 'E', 'Amoxicillin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('183cc2af-9bc9-4336-91da-c156edbbf5dd', '8d4c1f27-db6e-492b-aee9-826584aeb582', 'A', 'Fenitoin', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('3eeca138-354c-4aa5-961c-dfc8980124e0', '8d4c1f27-db6e-492b-aee9-826584aeb582', 'B', 'Lamotrigin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('765654ec-8b53-4037-8f61-9faa7b4fed44', '8d4c1f27-db6e-492b-aee9-826584aeb582', 'C', 'Ethosuksimid', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('03a64821-895d-4661-afa0-f86dfb34af75', '8d4c1f27-db6e-492b-aee9-826584aeb582', 'D', 'Levetiracetam', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('40906e1d-e100-4fa0-b15e-e0567f0bff45', '8d4c1f27-db6e-492b-aee9-826584aeb582', 'E', 'Gabapentin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('9636e0a8-6650-4550-a82b-134673c0eab6', '8e6d6a65-4edb-4243-a232-bde3396bce39', 'A', 'Menghambat enzim xanthine oxidase untuk menurunkan produksi asam urat', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('2203c21a-9103-4c02-a072-e69a8ce2cc59', '8e6d6a65-4edb-4243-a232-bde3396bce39', 'B', 'Meningkatkan ekskresi asam urat melalui ginjal', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5793f7cb-aece-4d30-96e1-66c841fb9246', '8e6d6a65-4edb-4243-a232-bde3396bce39', 'C', 'Menghambat migrasi neutrofil dan respon inflamasi pada serangan gout', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f1225f47-805d-47b7-8c60-410dca534dec', '8e6d6a65-4edb-4243-a232-bde3396bce39', 'D', 'Memecah kristal monosodium urat di sendi untuk meredakan nyeri', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('503b6684-43d0-4f39-9f5e-3aa534a0baee', '8e6d6a65-4edb-4243-a232-bde3396bce39', 'E', 'Menghambat reabsorpsi asam urat di tubulus proksimal ginjal', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('aa13d42f-c695-4cd4-ad16-7fe04b1f31a9', '941d50be-5c32-419a-a7b8-55330d5ccd2d', 'A', 'Infliximab', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f5228cc5-85da-4aec-9595-d27d3fb339fb', '941d50be-5c32-419a-a7b8-55330d5ccd2d', 'B', 'Adalimumab', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('6e2dcd12-86ab-4104-a7e2-b551718d1d9a', '941d50be-5c32-419a-a7b8-55330d5ccd2d', 'C', 'Rituximab', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a4b217e4-d3f6-4548-87c2-bd879e910704', '941d50be-5c32-419a-a7b8-55330d5ccd2d', 'D', 'Etanercept', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('bbbea8a2-087a-4fb9-ba9f-32c218a98ae2', '941d50be-5c32-419a-a7b8-55330d5ccd2d', 'E', 'Tocilizumab', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a5be9ad0-1907-4a58-abd7-f512a118f735', '9554c1e3-8ba1-48fc-b9b7-0d6c7fbdaf3c', 'A', 'Menghambat interleukin-6 (IL-6) secara langsung', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('83089942-00f9-466b-bfec-21559887a13e', '9554c1e3-8ba1-48fc-b9b7-0d6c7fbdaf3c', 'B', 'Menekan produksi tumor necrosis factor-alpha (TNF-alpha) secara selektif', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('ef97237f-00d3-44f2-be47-70e28bcb94b6', '9554c1e3-8ba1-48fc-b9b7-0d6c7fbdaf3c', 'C', 'Menghambat sintesis prostaglandin dan leukotrien dengan menekan enzim lipoksigenase', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('da73eb00-6cd2-43ce-bda8-33dfb21ed19d', '9554c1e3-8ba1-48fc-b9b7-0d6c7fbdaf3c', 'D', 'Dimetabolisme menjadi 5-aminosalicylic acid (5-ASA) dan sulfapyridine yang memiliki efek antiinflamasi', true, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('af10bda4-7d8a-43de-bc19-784783c47ad3', '9554c1e3-8ba1-48fc-b9b7-0d6c7fbdaf3c', 'E', 'Menghambat aktivasi sel T dan menurunkan ekspresi molekul kostimulatorik', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('cb89c4dd-6a28-4852-994f-1c6f0044048b', '98a2671f-8e31-4f1e-8dd2-90bb9f924551', 'A', 'Menghentikan kalsium', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('92ac2d1b-548b-4740-be27-056e18a6b752', '98a2671f-8e31-4f1e-8dd2-90bb9f924551', 'B', 'Menghentikan alendronat', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('9b36fb4a-4504-40ba-976d-530bb317715e', '98a2671f-8e31-4f1e-8dd2-90bb9f924551', 'C', 'Memberika jeda pemberian', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('34c822d9-4a2d-4ab7-a1eb-89b58acccef9', '98a2671f-8e31-4f1e-8dd2-90bb9f924551', 'D', 'Memberikan tambahan kalsitriol', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f1ef3cc4-3da7-4f29-950e-5d20cb0e921f', '98a2671f-8e31-4f1e-8dd2-90bb9f924551', 'E', 'Menambahkan tambahan suplemen besi', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('84bf00b7-4a3b-4acc-9723-5f7fae50894d', '99a829bc-80b3-432b-abcc-08be5e25c334', 'A', 'Parasetamol', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('80e51317-eb42-4186-99eb-912d33b2d430', '99a829bc-80b3-432b-abcc-08be5e25c334', 'B', 'Ibuprofen oral', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('dcb21f4b-f93d-45be-9fc8-c66ee79d17ab', '99a829bc-80b3-432b-abcc-08be5e25c334', 'C', 'Celecoxib oral', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('3a68447d-9844-4d1e-a021-4bc6504f08f3', '99a829bc-80b3-432b-abcc-08be5e25c334', 'D', 'Na Diclofenak oral', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5c4d82bf-1599-4d6e-9825-988c3a3699f7', '99a829bc-80b3-432b-abcc-08be5e25c334', 'E', 'Na Diclofenak topikal', true, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('ba5b9d14-6d6a-4a44-a0ca-143263520de3', '9bf60a12-b6b8-43e9-8243-354e8124607e', 'A', 'Hipoglikemia', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d672f3b8-c789-48c3-9abb-ed62f4e899eb', '9bf60a12-b6b8-43e9-8243-354e8124607e', 'B', 'Infeksi tuberkulosis laten yang reaktivasi', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e775926b-38c0-4214-94ee-0fd55fe6a58c', '9bf60a12-b6b8-43e9-8243-354e8124607e', 'C', 'Gagal ginjal akut', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f7046a54-270e-42ac-8017-cbeb9d7df5dc', '9bf60a12-b6b8-43e9-8243-354e8124607e', 'D', 'Hipertensi berat', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('ab0e9ecd-87d8-41e8-8b7b-9a1ab5e1dd68', '9bf60a12-b6b8-43e9-8243-354e8124607e', 'E', 'Asidosis metabolik', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('de710854-22b3-4e5a-8e26-9fe9bb4b6422', '9c2c33d2-023d-4892-9a61-2b1f0777358f', 'A', 'Ibuprofen', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a9d5bf13-6afa-4569-9f3e-78cac875a4a1', '9c2c33d2-023d-4892-9a61-2b1f0777358f', 'B', 'Naproxen', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d127cd0e-c08f-46c6-b5a1-8f232f48ba14', '9c2c33d2-023d-4892-9a61-2b1f0777358f', 'C', 'Asam mefenamat', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a5dd69fc-b96a-4b49-95cb-8a1c4389b010', '9c2c33d2-023d-4892-9a61-2b1f0777358f', 'D', 'Celecoxib', true, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('4cb8fc0a-d9cc-4352-b0ae-8b870d391415', '9c2c33d2-023d-4892-9a61-2b1f0777358f', 'E', 'Ketoprofen', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('55702b48-cc88-464d-aa7e-fe500a27d26b', 'a1755d51-6d19-4bcf-bb8e-6169f001d8ba', 'A', 'Mengganti obat lain', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f540154a-edfa-4443-8d34-7e6375116bd0', 'a1755d51-6d19-4bcf-bb8e-6169f001d8ba', 'B', 'Menambahkan obat lain', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('162a8d87-6e67-473b-8f90-1390a6f376ba', 'a1755d51-6d19-4bcf-bb8e-6169f001d8ba', 'C', 'Mengubah rute pemberian', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('eec719be-3689-49ac-9b39-a7aab96b17ec', 'a1755d51-6d19-4bcf-bb8e-6169f001d8ba', 'D', 'Mengubah bentuk sediaan', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('9aec5dda-a924-426b-a74b-512cef8579c7', 'a1755d51-6d19-4bcf-bb8e-6169f001d8ba', 'E', 'Menghentikan pengobatan', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('ca3c62a3-876f-458c-9c0a-60fb42221f21', 'a196ef74-ed4e-42d6-8664-4e43decbc027', 'A', 'Probenecid', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d3da50ea-50a2-4588-a126-7029903edaa0', 'a196ef74-ed4e-42d6-8664-4e43decbc027', 'B', 'Allopurinol', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('84693030-4f1c-4fc4-927b-ac20530b311e', 'a196ef74-ed4e-42d6-8664-4e43decbc027', 'C', 'Sulfasalazin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('0f0c1239-3ba7-48c1-9875-1c38cac49112', 'a196ef74-ed4e-42d6-8664-4e43decbc027', 'D', 'Pirazinamid', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f7cfafe6-b30e-4735-bc7d-47a19d9b2af9', 'a196ef74-ed4e-42d6-8664-4e43decbc027', 'E', 'Kolkisin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('cc34d9da-a585-4213-99ff-8d7824c41da2', 'a7d8a45e-1312-4ebd-888e-3eaf71d73f87', 'A', 'Untuk mengobati colitis ulseratif ringan sampai sedang', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b99160eb-8f0c-415f-b018-3c198c255dbf', 'a7d8a45e-1312-4ebd-888e-3eaf71d73f87', 'B', 'Mengobati rheumatoid arthritis jika sudah intoleran dengan NSAID', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('82dccfaa-395b-4fd6-863d-0d83fcd6c847', 'a7d8a45e-1312-4ebd-888e-3eaf71d73f87', 'C', 'Off label pengobatan nyeri', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('11a322ed-8e11-4bec-9d7a-582c49c393c1', 'a7d8a45e-1312-4ebd-888e-3eaf71d73f87', 'D', 'Sebagai terapi utama colitis ulseratif berat', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('bb7ab868-b8dd-47a2-9a9b-f9b05c42a117', 'a7d8a45e-1312-4ebd-888e-3eaf71d73f87', 'E', 'Sebagai immunomodulator', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a528fa55-b4c8-4437-b5cc-694e95ef56f4', 'ab7d305b-cc83-448b-8668-3d2fbdca6a4c', 'A', 'Meningkatkan sekresi kalsium melalui urin untuk menjaga homeostasis', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b5844612-ea52-4b69-a20f-3a51c897c292', 'ab7d305b-cc83-448b-8668-3d2fbdca6a4c', 'B', 'Mempercepat resorpsi tulang oleh osteoklas untuk meningkatkan remodeling tulang', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('27c89f3e-49c6-4062-86b6-689668f0918d', 'ab7d305b-cc83-448b-8668-3d2fbdca6a4c', 'C', 'Meningkatkan absorpsi kalsium di usus untuk mendukung mineralisasi tulang', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('891c2cd1-a05f-4686-a384-64e29e2c75cf', 'ab7d305b-cc83-448b-8668-3d2fbdca6a4c', 'D', 'Menghambat sintesis osteokalsin sehingga mengurangi pembentukan tulang baru', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('68b5c9fc-20cd-4756-8f2f-378ce11a1786', 'ab7d305b-cc83-448b-8668-3d2fbdca6a4c', 'E', 'Menurunkan kadar fosfat serum untuk meningkatkan kekuatan tulang', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('9497ae0a-c611-4b83-9c66-5e4c96fd2491', 'af926821-52e0-4e63-ad53-c218f961dc5d', 'A', 'Glukosamin', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b35b4632-f418-4504-9ca2-171eeb221d59', 'af926821-52e0-4e63-ad53-c218f961dc5d', 'B', 'Kondroitin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a7101158-e346-407d-bf72-9e41913b6724', 'af926821-52e0-4e63-ad53-c218f961dc5d', 'C', 'Glukosamin+kondroitin', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('3648aa81-76ae-40b3-9aea-3625f9fcef50', 'af926821-52e0-4e63-ad53-c218f961dc5d', 'D', 'Glukosamin+kortikosteroid', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('90e6f58e-6f01-4c06-be20-24f8cb8eb641', 'af926821-52e0-4e63-ad53-c218f961dc5d', 'E', 'Glukosamin+kortikosteroid', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('74a6ccee-97b6-404f-81c3-91d22199dc20', 'b20886a5-15a3-4af0-8137-9af68c312410', 'A', 'Alendronat bekerja dengan meningkatkan aktivitas osteoklas, sedangkan kalsium meningkatkan resorpsi tulang.', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b5d3ac3a-1628-45c6-9435-1bb9bb2fe8a3', 'b20886a5-15a3-4af0-8137-9af68c312410', 'B', 'Alendronat menghambat aktivitas osteoklas, sedangkan kalsium merupakan komponen utama dalam mineralisasi tulang.', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('81734904-14bd-46c0-b6b8-261db3c25ce9', 'b20886a5-15a3-4af0-8137-9af68c312410', 'C', 'Alendronat merangsang pembentukan tulang oleh osteoblas, sedangkan kalsium menghambat aktivitas osteoklas.', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('93608f5d-07ad-4451-962b-a6efe7b47a69', 'b20886a5-15a3-4af0-8137-9af68c312410', 'D', 'Alendronat menghambat absorpsi kalsium di usus, sedangkan kalsium meningkatkan aktivitas osteoklas.', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('cfb3484f-b9f8-4f51-bba4-baa338574d8b', 'b20886a5-15a3-4af0-8137-9af68c312410', 'E', 'Alendronat meningkatkan pelepasan kalsium dari tulang, sedangkan kalsium meningkatkan kadar hormon paratiroid.', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a14e6dd6-67d9-4e76-be36-724bc0fbd014', 'b2f3607c-43f3-4598-aa3b-52f7fb50943c', 'A', 'Metotreksat', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1f6b6655-cd05-474e-a573-94c1cf7ceeb6', 'b2f3607c-43f3-4598-aa3b-52f7fb50943c', 'B', 'Hidroksiklorokuin', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('0e6d68b7-d442-4ed0-ae65-317c2fb3f9ed', 'b2f3607c-43f3-4598-aa3b-52f7fb50943c', 'C', 'Sulfasalazin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e2317eed-2d73-4961-8247-a893f782d82b', 'b2f3607c-43f3-4598-aa3b-52f7fb50943c', 'D', 'Leflunamid', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1e5cf790-786b-4b2e-8b25-f7b0fdc109be', 'b2f3607c-43f3-4598-aa3b-52f7fb50943c', 'E', 'Etanercept', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('4d2fb132-5824-46a4-bfba-6cc3082457a0', 'b6289752-7d9c-4d76-813e-9ee8a4cc6756', 'A', 'Probenesid', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('8e5446b3-ad5c-46eb-9184-b091ca916d0a', 'b6289752-7d9c-4d76-813e-9ee8a4cc6756', 'B', 'Allopurinol dengan penyesuaian dosis', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('24142cf7-a2c8-46cf-b96d-5bfa78c3ed56', 'b6289752-7d9c-4d76-813e-9ee8a4cc6756', 'C', 'Allopurinol dosis standar', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5d7ffd89-4df7-49a5-b162-8fca18d29ac9', 'b6289752-7d9c-4d76-813e-9ee8a4cc6756', 'D', 'Kolkisin dengan penyesuaian dosis', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d9044ca1-860e-4c43-ad4f-41316730f0dd', 'b6289752-7d9c-4d76-813e-9ee8a4cc6756', 'E', 'Indomethacin', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c4e43f15-d2c0-4f9c-89e8-751a91ee07cd', 'c18c7708-8c0e-4d2b-b2cc-5df466bdc66a', 'A', 'Peningkatan metabolisme Losartan oleh Rofecoksib', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('51e3935b-bdce-41dd-8fad-0625ff0a801c', 'c18c7708-8c0e-4d2b-b2cc-5df466bdc66a', 'B', 'Peningkatan ekskresi HCT oleh Rofecoksib', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('aae3e4df-395b-42a0-8cad-3d52aa113498', 'c18c7708-8c0e-4d2b-b2cc-5df466bdc66a', 'C', 'Peningkatan berat badan karena Rofecoksib memacu metabolisme basal', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('7c2c9c44-3a1b-4362-88cf-1b6a7a33f44f', 'c18c7708-8c0e-4d2b-b2cc-5df466bdc66a', 'D', 'Kontraksi arteri perifer karena Rofecoksib menghambat COX1', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1bcc82f3-efe3-4b71-8f64-51a79103fd85', 'c18c7708-8c0e-4d2b-b2cc-5df466bdc66a', 'E', 'Penghambatan COX2 oleh Rofecoksib menyebabkan aliran darah ke ginjal berkurang', true, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('0dc82a61-96a5-44cd-8a8c-046ca177c067', 'c4b18062-9001-4e15-846f-8024461892a1', 'A', 'Metotreksat', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('fb12b84d-b10b-4640-a703-32bb5a7b57f0', 'c4b18062-9001-4e15-846f-8024461892a1', 'B', 'Azathioprin', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a704c971-7492-4cff-b50c-39049181e897', 'c4b18062-9001-4e15-846f-8024461892a1', 'C', 'Siklosporin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b49bcc20-e1e7-4ca4-9679-6129a2705062', 'c4b18062-9001-4e15-846f-8024461892a1', 'D', 'Infliximab', true, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1e45dd0f-aae2-4574-841d-23ff09c7b9d2', 'c4b18062-9001-4e15-846f-8024461892a1', 'E', 'Diklofenak', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('799d02cf-6180-40a3-8889-686914e2a964', 'c6786b84-1437-4f33-8355-e878462b65e9', 'A', 'Menambahkan allopurinol', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5aed82ce-d748-472b-99f6-77c979fbd32f', 'c6786b84-1437-4f33-8355-e878462b65e9', 'B', 'Mengganti piroxicam dengan ibuprofen', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d2e7a86e-1798-4d83-847e-8ab298f3c683', 'c6786b84-1437-4f33-8355-e878462b65e9', 'C', 'Menambahkan kolkisin', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e4618a0c-3990-4344-a64d-da1c72871d8a', 'c6786b84-1437-4f33-8355-e878462b65e9', 'D', 'Memberikan probenecid', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('81280c64-02aa-4451-b4fe-facc50b8cd91', 'c6786b84-1437-4f33-8355-e878462b65e9', 'E', 'Menghentikan piroxicam dan memberikan febuxostat', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d2cd0313-b05f-425b-8f9f-10a813e51fcc', 'c969b368-b398-407e-a5e6-4a8b3c0e4ed2', 'A', 'Mengurangi dosis prednisone', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('df7c0642-cd20-4e50-9d66-08d02cefa1e3', 'c969b368-b398-407e-a5e6-4a8b3c0e4ed2', 'B', 'Menambah dosis prednisone', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('2bca3b5f-200d-449f-8dd1-afbb54318861', 'c969b368-b398-407e-a5e6-4a8b3c0e4ed2', 'C', 'Menghentikan penggunaan prednisone', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('e3279c6a-9f94-4e12-9f4b-1a7c7d7597e6', 'c969b368-b398-407e-a5e6-4a8b3c0e4ed2', 'D', 'Mengganti prednisone dengan kortikosteroid lain', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5fc657b6-c980-4c2e-b275-73dbf2a4fa98', 'c969b368-b398-407e-a5e6-4a8b3c0e4ed2', 'E', 'Menambahkan obat nyeri', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('0bbcf8ae-47a9-4302-a27b-f9e0e44cc654', 'ddccae6b-309c-4e2c-8f48-52d9060cea03', 'A', 'Dikonsumsi setelah makan dengan segelas air putih dalam posisi duduk', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('7a635168-9ff1-4885-8948-ac0c361a8de1', 'ddccae6b-309c-4e2c-8f48-52d9060cea03', 'B', 'Dikonsumsi sebelum tidur dengan segelas susu untuk mengurangi iritasi lambung', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('75324b23-c8a5-4e3a-b23d-5669f0a70d39', 'ddccae6b-309c-4e2c-8f48-52d9060cea03', 'C', 'Dikonsumsi sebelum makan, dengan segelas air putih, dan tetap dalam posisi tegak selama 30-60 menit', true, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('2663dc56-ce02-4e62-b0db-9c0ceb69a8b0', 'ddccae6b-309c-4e2c-8f48-52d9060cea03', 'D', 'Dikonsumsi bersama makanan tinggi kalsium untuk meningkatkan absorpsi', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('57197a50-689a-4bb9-bace-0fc2329a9c71', 'ddccae6b-309c-4e2c-8f48-52d9060cea03', 'E', 'Dikonsumsi kapan saja, karena tidak dipengaruhi oleh makanan dan posisi tubuh', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('379e6692-a808-41c7-a052-6ab33282ef4e', 'e5a0fa91-7df4-46ac-8876-f1dd8db80dfa', 'A', 'Asam hialuronat', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5827bcde-34e3-4f14-8351-e96027c9a1bf', 'e5a0fa91-7df4-46ac-8876-f1dd8db80dfa', 'B', 'Ibuprofen', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5b26c8de-b9fa-40aa-988d-576ec4c0dfa6', 'e5a0fa91-7df4-46ac-8876-f1dd8db80dfa', 'C', 'Kolkisin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('42dae903-e977-41d3-8e05-f0832f4d255a', 'e5a0fa91-7df4-46ac-8876-f1dd8db80dfa', 'D', 'Piroksikam', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('cc07f3dd-37df-4b61-97c7-43eaf09374ee', 'e5a0fa91-7df4-46ac-8876-f1dd8db80dfa', 'E', 'Deksametason', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('39249a21-5c63-4a88-94b0-9a982927ee54', 'f04bd7e0-a658-4cef-9861-8569ab593b9f', 'A', 'Paracetamol', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('ca0ebfa5-ab27-41e1-a9ce-0d2edb19e489', 'f04bd7e0-a658-4cef-9861-8569ab593b9f', 'B', 'Ibuprofen', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('1dbd117e-7230-4419-9bb3-def095ba1a0b', 'f04bd7e0-a658-4cef-9861-8569ab593b9f', 'C', 'Glukosamin', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('57a2e7d9-a88a-4d3b-a768-6fc85a057758', 'f04bd7e0-a658-4cef-9861-8569ab593b9f', 'D', 'Meloxicam', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('af0366fc-47cd-4f89-b035-6121ade5d3b5', 'f04bd7e0-a658-4cef-9861-8569ab593b9f', 'E', 'Tramadol', true, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a8ff7c3e-8e59-4a81-9abf-09c865ad0400', 'f19d0162-50e5-40e5-aee9-efd0b791e757', 'A', 'Allopurinol', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('286eeb3c-47cf-4507-a28e-7c5da34992fa', 'f19d0162-50e5-40e5-aee9-efd0b791e757', 'B', 'Probenecid', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('5a6aa2c1-bb3f-494c-98e3-c974f7262f76', 'f19d0162-50e5-40e5-aee9-efd0b791e757', 'C', 'Febuxostat', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('3ce12a31-3a65-4ea6-b464-e3a3394aa29b', 'f19d0162-50e5-40e5-aee9-efd0b791e757', 'D', 'Ibuprofen', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('216d7bff-2df7-4388-b258-83266b0a0827', 'f19d0162-50e5-40e5-aee9-efd0b791e757', 'E', 'Na diklofenak', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('22e4d322-4dfb-4431-9746-3b4a0508284e', 'f51f0333-a334-4de8-8d4a-a9b946b357df', 'A', 'Celecoxib', true, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('dab71d76-1ab7-4892-ba9f-a0dd9b8e1efb', 'f51f0333-a334-4de8-8d4a-a9b946b357df', 'B', 'Ibuprofen', false, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('ba2dd88f-354c-49fd-8b23-6fabc2083954', 'f51f0333-a334-4de8-8d4a-a9b946b357df', 'C', 'Meloksikam', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('c2b91ee8-314b-465d-8055-8aaa5d0b74d9', 'f51f0333-a334-4de8-8d4a-a9b946b357df', 'D', 'Morfin', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('b7a53d7d-8d1a-4ad2-b932-7033aecf8038', 'f51f0333-a334-4de8-8d4a-a9b946b357df', 'E', 'Antasida', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('bd1638e2-a43e-48d0-8fe3-ffaf8cc65357', 'f940aeb5-f163-4f8c-8630-2dba757fe02d', 'A', 'Aspirin 80 mg 3 x 1', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('61338cee-e18c-41f6-a894-da01578173ac', 'f940aeb5-f163-4f8c-8630-2dba757fe02d', 'B', 'Ibuprofen 400 mg 2 x 1', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('824fd480-e1b1-490a-91ed-b47d05d31b41', 'f940aeb5-f163-4f8c-8630-2dba757fe02d', 'C', 'Cotrimoxazole 100 mg 3 x 1', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('f5fa531d-bd47-467f-8e43-7fd6e8a2dbce', 'f940aeb5-f163-4f8c-8630-2dba757fe02d', 'D', 'Asam mefenamat 250 mg 1x1', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('11397bea-b729-4298-98a7-f9caa5ef28b1', 'f940aeb5-f163-4f8c-8630-2dba757fe02d', 'E', 'Ketokonazole 200 mg 2 x 1', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('544ac908-b2a8-403e-9d67-974d742d2be5', 'fa618424-5ed0-4cf6-b8bc-71759ea62bd3', 'A', 'Celecoxib', false, 1)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('a34fad00-c353-474a-b381-030460b27a0f', 'fa618424-5ed0-4cf6-b8bc-71759ea62bd3', 'B', 'Asetaminofen', true, 2)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('34221ab3-66ea-464e-ab3b-49f3bf562ce0', 'fa618424-5ed0-4cf6-b8bc-71759ea62bd3', 'C', 'Ketorolac', false, 3)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('d40946a5-e2da-4b5e-b8f5-8ecea9276335', 'fa618424-5ed0-4cf6-b8bc-71759ea62bd3', 'D', 'Metamizol', false, 4)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_options (id, question_id, option_key, option_text, is_correct, sort_order)
values ('28289cf5-dc7b-492c-99c0-9608718cffde', 'fa618424-5ed0-4cf6-b8bc-71759ea62bd3', 'E', 'Tramadol', false, 5)
on conflict (id) do update
set question_id = excluded.question_id,
    option_key = excluded.option_key,
    option_text = excluded.option_text,
    is_correct = excluded.is_correct,
    sort_order = excluded.sort_order;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('3ada945d-b700-4225-99a8-805128787324', '008cbac6-1c6d-493b-92ea-d5e27a1bcd56', 'Efek samping yang bisa terjadi akibat Streptomisin, yang merupakan golongan Aminoglikosida adalah Neurotoksik, Nefrotoksik, Ototoksik; namun alasan tidak direkomendasikannya Streptomisin pada ibu hamil adalah Streptomisin dapat menembus plasenta, dan menyebabkan ototoksik pada janin. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('1ec266e7-65ff-4d55-97e4-06884fcf8461', '037f1f82-dedb-4aea-8870-a890b20bae95', 'Cefotaxime (sefalosporin generasi III) adalah terapi lini utama karena: a. Spektrum luas terhadap Gram-negatif b. Efektif terhadap Enterobacteriaceae c. Penetrasi CSF sangat baik d. Aktivitas bakterisidal kuat Sehingga menjadi terapi standar meningitis Gram-negatif. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'manual')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('ff65babb-7b1f-4f51-b046-0d4e9e57198f', '0719270b-9c1b-4329-8898-3ab4dd1c9639', 'DHP. Pada prinsipnya pengobatan malaria pada ibu hamil sama dengan pengobatan pada orang dewasa lainnya. Pada ibu hamil tidak diberikan primakuin, tetrasiklin ataupun doksisiklin. Tatalaksana pengobatan pada ibu hamil trisemester I-III (0-9 bulan) yaitu menggunakan ACT (DHP tablet selama 3 hari). Referensi: KEMENKES RI. 2023. Buku saku tatalaksana kasus malaria', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('7ed98398-c904-4ca6-9e49-2f60776b0f45', '0832acfb-84a9-4c9d-ad34-7839eb5032e2', 'amoksisilin-klavulanat (kategori B). Pada ibu hamil yang mengalami Sistitis akut maka terapi yang direkomendasikan yaitu amoksisilin-klavulanat, golongan sefalosporin, dan kotrimoksazol (dihindari pada kehamilan trimester 3). Referensi: Dipiro 12th Ed (2023); PMK No 28 Tahun 2021 tentang Pedoman Penggunaan Antibiotik', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('132a8991-4261-4968-99ad-92790b9ad74e', '0920a65e-dd77-4296-87a9-87a65916b8ec', 'azitromisin. Antibiotik harus diberikan kepada pasien dengan eksaserbasi PPOK yang memiliki tiga gejala utama: peningkatan dispnea, volume sputum, dan purulensi sputum; memiliki dua gejala utama, jika peningkatan purulensi sputum merupakan salah satu dari dua gejala; atau memerlukan ventilasi mekanis. Pemilihan antibiotik harus didasarkan pada pola resistensi bakteri lokal. Biasanya, pengobatan empiris awal adalah aminopenisilin dengan asam klavulanat, makrolida, tetrasiklin, atau, pada pasien tertentu, kuinolon. Rekomendasi utama antibiotik yang diberikan pada pasien eksaserbasi PPOK yaitu azitromisin. Referensi : GOLD. 2025. Global Strategy for the Diagnosis, Management, and Prevention of Chronic Obstructive Pulmonary Disease', 'manual')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('f0f9d28f-0f1b-49ce-ba85-35abaedaa67a', '1660ab5b-0959-4e63-a072-7c763c9eb437', 'Jawabannya yaitu mencegah anemia. Pada kehamilan awal, asam folat rutin diberikan sebagai suplemen prenatal untuk mencegah kekurangan folat. Kekurangan folat dapat menyebabkan anemia megaloblastik, sehingga salah satu manfaat klinisnya adalah membantu mencegah anemia pada ibu hamil. Selain itu, folat juga penting untuk menurunkan risiko cacat tabung saraf pada janin. Referensi: CDC Folic Acid Clinical Overview; CDC Folic Acid Safety and Health Outcomes; WHO daily iron and folic acid supplementation in pregnancy.', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('4595f544-b87f-44dc-9dd3-dbda1ba7907b', '1c3d3c4e-9258-4910-b0ea-f9096d7256e7', 'emtricitabin (FTC). Emtrisitabin (FTC) adalah analog sitidin seperti 3TC, dengan mekanisme dan efektivitas yang setara, sehingga dapat langsung menggantikan lamivudin dalam kombinasi standar. Kedua obat tersebut masuk dalam golongan NRTI. Referensi: PERMENKES RI Nomor 23 tahun 2022 tentang penanggulangan human immunodeficiency virus, acquired immunodeficiency syndrome, dan infeksi menular seksual', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('9d9b3083-c1fe-4deb-947a-cf20214f002b', '296c326b-d83a-4222-9981-219167ead1e8', 'cefuroksim. Lini pertama OMA adalah amoksisilin. Pada pasien dengan penyakit berat dan bila mendapat infeksi ??-laktamase positif Haemophilus influenzae dan Moraxella catarrhalis terapi dimulai dengan amoksisilin-klavulanat. Jika pasien alergi amoksisilin dan reaksi alergi bukan reaksi hipersensitifitas (urtikaria atau anafilaksis), dapat diberi cefdinir, cefpodoksim atau cefuroksim. Pada kasus reaksi tipe I (hipersensitifitas) dapat diberikan azitromisin atau klaritromisin. Obat lain yang bisa digunakan eritromisin-sulfisoksazol atau sulfametoksazol-trimetoprim. Sumber : Dipiro 12th Ed (2023); Danishyar and ashurst. 2023. PMK No 28 Tahun 2021 tentang Pedoman Penggunaan Antibiotik. Acute otitis media', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('1882a400-7a71-4183-87e0-dfcec76194d2', '2be97c2e-525e-42ad-89bc-d95688f87f20', 'Pada ibu hamil digunakan spiramicin untuk mengurangi transmisi maternal pada janin Pilihan lain tidak dipilih karena : Bukan terapi pilihan yang direkomendasikan pada infeksi parasit Toxoplasma gondii Trisemester pertama : Spiramicin Setelah 18 minggu - melahirkan : Primetamin + Sulfadiazin + asam folinik Referensi: PIONAS POM (Anti-Toksoplasma)/Pendoman Antibiotik 2021', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('d1dac32d-7e13-4240-bfb0-69784dd0a62a', '2cd85620-c335-493a-a238-c3ff4f66e9a3', 'Obat TB memiliki beberapa efek samping yang khas, dimana : Isoniazid : Neuropati perifer (+ Vitamin B6) Rifampisin : urine berwarna merah Pirazinamid : peningkatan asam urat, nyeri pada sendi (+ NSAID seperti Aspirin) Etambutol : penurunan penglihatan, buta warna parsial Streptomisin : penurunan pendengaran, penurunan keseimbangan, ototoksik pada janin Karena keluhan pada pasien adalah neuropati perifer yang merupakan ESO khas dari Isoniazid, maka terapi yang bisa direkomendasikan adalah vitamin B6 atau Piridoksin. Referensi: PNPK TB (2020); Lexicomp (2023); PIONAS BPOM', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('d991429c-6b71-42ca-a91e-b3a5cbff57ca', '339cf93f-b360-4c62-9574-8c69410da09e', 'Pilihan yang paling benar adalah: doksisiklin 300 mg 1 kali sehari dengan alternatifnya menggunakan azitromisin, ciprofloksasin, dan ceftriakson IV. Referensi: Dipiro JT et al, 2023, pharmacotherapy: a pathophysiologic approach 12th edition, USA, McGraw-Hill Company', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('4964d0c3-5a90-4f59-9e43-ac18ca2326ca', '35baf05c-113b-4ce2-a5ba-d3fa1f577f80', 'Untuk mencegah konjungtivitis gonore pada bayi baru lahir, diberikan profilaksis dengan salep eritromisin ke mata bayi. Eritromisin adalah antibiotik yang aman untuk bayi dan efektif dalam mencegah infeksi mata akibat Neisseria gonorrhoeae. Referensi: Kemenkes RI. (2020). Buku Saku Pelayanan Kesehatan Neonatal Esensial; WHO (2016). Guidelines for the Treatment of Neisseria gonorrhoeae; CDC (2021). Sexually Transmitted Infections Treatment Guidelines', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('04c86fdc-7551-44c5-b3d9-264a76e1721f', '35e760f3-ea29-42be-aaed-8102d6a35b08', 'Pada ISK dibagi menjadi 2 jenis utama, yaitu Cystitis dan Pyelonefritis. Cystitis memiliki lini pertama : Kotrimoxazol Pyelonefritis memiliki lini pertama Ciprofloxacin (uncomplicated) atau Ampicillin-Sulbactam (complicated) Karena pada kasus ini pasien didiagnosa Cystitis, maka direkomendasikan Kotrimoxazol Referensi: PNPK Antibiotik (2021)', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('ae73b187-9bd0-447c-8e3a-9d6c80d4675a', '37c1bc4e-13e6-4008-b374-0d2aa306c88e', 'Terapi infeksi gonorea tanpa komplikasi direkomendasikan: 1st: Cefixime 2nd: Ceftriaxone + Doksisiklin Ceftriaxone adalah antibiotik pilihan untuk mengobati gonore pada ibu hamil dan mencegah penularan infeksi ke bayi selama persalinan. Ceftriaxone diberikan secara intramuskular (suntik) sebagai dosis tunggal. Bayi yang lahir dari ibu dengan gonore harus diberikan profilaksis mata dengan Eritromisin atau Tetrasiklin salep untuk mencegah konjungtivitis pada bayi baru lahir. Referensi: PNPK Antibiotik (2021)', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('fd6c9ae9-b3d2-4e8b-aff1-15a6f0f81212', '38a5114c-dfc8-441e-9c6e-d77d0a32728f', 'vankomisin. Antibiotik yang mencakup MRSA pada kasus pneumonia yaitu: Vankomisin (2 x 15 mg/kg, dosis disesuaikan kadar dalam darah) atau linezolid (2 x 600 mg). Referensi: Keputusan Menteri Kesehatan Republik Indonesia Nomor HK.01.07/MENKES/2147/2023 tentang pedoman nasional pelayanan kedokteran tata laksana pneumonia pada dewasa', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('ee170fc9-f170-47d9-ace8-269c8219f127', '3af238b5-fdbd-4ab6-92ad-07c9545e9336', 'cefazolin. Organisme yang paling sering ditemui dalam operasi termasuk E. coli, Klebsiella, dan Enterococci. Profilaksis dosis tunggal dengan cefazolin saat ini direkomendasikan. Ciprofloxacin dan levofloxacin merupakan alternatif bagi pasien hipersensitivitas B-laktam yang sedang menjalani pengobatan kolesistektomi terbuka. Referensi: Dipiro JT et al, 2023, pharmacotherapy handbook 12th edition, USA, McGraw-Hill Company', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('f0d68142-7cf4-4b05-b24c-b3e72a4204e1', '3dd5b644-c8f6-4efb-8025-1d4abfcd9ab0', 'Pada kasus ini pasien mengalami eksaserbasi, tidak diketahui pasien memiliki komorbid. Usia pasien tidak diketahui. Sehingga dianggap pasien tidak memiliki komorbid dengan usia non-geriatri. Berdasarkan Dipiro dkk. (2023) antibiotic yang direkomendasikan adalah Makrolida (Azitromisin, Klaritromisin). GOLD (2021) merekomendasikan aminopenicillin + asam klavulanat, makrolida, atau tetrasiklin. Sehingga yang dapat dipilih adalah Klaritromisin. Kondisi pasien tidak dengan komplikasi: Patogen bakteri yang mungkin adalah S.pneumoniae, H.influenzae, M.catarrhalis. Terapi yang direkomendasikan: Makrolida (azitromisin, klaritromisin). (Dipiro dkk., 2023) The choice of the antibiotic should be based on the local bacterial resistance pattern. Usually initial empirical treatment is an aminopenicillin with clavulanic acid, macrolide, or tetracycline. Referensi : Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed, GOLD. 2021', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('62e830b0-dd4e-4318-8d80-a4317e7920c2', '40acc85e-7b0d-46be-9781-4770b182e6ba', 'ciprofloksasin. Pada pasien yang mengalami Pielonefritis akut maka tatalaksana terapi pertama yang dapat direkomendasikan yaitu siprofloksasin dengan alternatifnya seftriakson. Karena pasien memiliki alergi pada golongan B-laktam, maka antibiotik yang dipilih yaitu ciprofloksasin (golongan quinolon). Sumber: Dipiro 12th Ed (2023); PMK No 28 Tahun 2021 tentang Pedoman Penggunaan Antibiotik', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('2ea2d02f-cffe-4f98-8c91-6491e7bb4954', '40f39f40-241a-4a97-ab13-0f554aaa71e8', 'Jawabannya yaitu dicloxacillin. Pada cellulitis yang diduga disebabkan oleh Staphylococcus aureus tanpa petunjuk kuat ke arah MRSA, antibiotik oral yang aktif terhadap stafilokokus dan streptokokus seperti dicloxacillin merupakan pilihan yang sesuai. CDC juga mencantumkan dicloxacillin sebagai salah satu opsi oral untuk cellulitis ringan, bersama cephalosporin, clindamycin, dan penicillin. Referensi: CDC Clinical Guidance for Cellulitis; Merck Manual Professional; IDSA Skin and Soft Tissue Infections guideline.', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('9a7e26bb-e02f-464d-8a9d-76054e87148d', '41e88977-b4f4-4082-9bfb-9e20e769bfaf', 'Infeksi yang disebabkan oleh mycobacterium leprae dapat diterapi dengan: Dapson (diaminodiphenylsulfone) 100 mg setiap hari Rifampin 600 mg setiap hari clofazimine 100-200 mg / hari per oral Referensi: Katzung BG et al, 2017, Basic and Clinical Pharmacology 14th ed, McGraw-Hill; WHO, 2018, Guidelines for the Diagnosis, Treatment and Prevention of Leprosy', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('85b93422-b5d8-47cf-ab8d-40424700bcbe', '469c5fc6-0180-473c-b05d-55a4831b8bd4', 'Moxi : < 2% Hepatic: GGTP Increased, liver function test abnormal. Moksifloksasin merupakan antibiotik golongan fluoroquinolone yang sering digunakan dalam regimen TB-MDR. Namun, obat ini memiliki potensi menyebabkan gangguan fungsi hati, antara lain: a. Peningkatan enzim hati (AST/ALT, SGOT/SGPT) b. Peningkatan ??-GGT c. Abnormalitas fungsi hati d. Hepatitis obat (jarang) Referensi: MIMS, LiverTox: Clinical and Research Information on Drug-Induced Liver Injury, Lexicomp, 2021', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('3cad5bfd-46bd-4375-b4dd-925f37100f8f', '4f28f733-ed6c-4de1-9360-03bf9fd9d3ca', 'Oleskan ke seluruh tubuh hingga leher, wajah, dan telinga (dari leher sampai kaki, termasuk sela jari, lipatan, dan bawah kuku) dan dibiarkan selama 8-12 jam serta dapat diulang setelah satu pekan. Referensi: MIMS. 2025. Permethrin', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('9c7ae4ed-dc6a-4264-8f07-206963322780', '5d2b76b5-41a1-4e7f-8785-8dc824ddca3b', 'pregabalin. American Academy of Neurology (AAN), Special Interest Group on Neuropathic Pain (NeuPSIG), dan European Federation of Neurological Societies (EFNS) semuanya merekomendasikan antidepresan trisiklik oral (TCA), pregabalin, dan patch lidokain 5% sebagai terapi lini pertama. Referensi: Gruver and Guthmiller. 2023. Postherpetic neuralgia', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('de0f6b0a-e0b2-4b35-a95a-d19303c30a9a', '6763ba4b-5e16-4fe2-9302-4a4c11a778b6', 'Nevirapine (NVP) adalah penyebab utama hepatotoksisitas yang dapat menyebabkan ikterus (mata kuning). Nevirapine dapat menyebabkan hepatitis idiosinkratik, yang biasanya terjadi dalam 6 minggu pertama, tetapi bisa juga terjadi setelah beberapa bulan pemakaian. Ditandai dengan peningkatan ALT/AST, bilirubin meningkat, dan dalam beberapa kasus bisa berkembang menjadi gagal hati. Risiko lebih tinggi pada wanita dengan CD4 >250 atau pria dengan CD4 >400. Tindakan yang direkomendasikan menurut Permenkes No. 23 Tahun 2022: Hentikan Nevirapine (NVP) segera jika terdapat tanda hepatotoksisitas. Substitusi dengan Efavirenz (EFV). Jika EFV tidak dapat digunakan, alternatifnya adalah Dolutegravir (DTG). Referensi: Peraturan Menteri Kesehatan Republik Indonesia Nomor 23 Tahun 2022 tentang Penanggulangan HIV/AIDS dan Infeksi Menular Seksual', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('dcffd245-f6b1-4208-b641-af6971d67b03', '695cd52f-d1bc-4125-9fea-881e040547c9', 'Terapi untuk mengatasi amebiasis yang disebabkan oleh entamoeba histolytica adalah Metronidazole 500-750 mg p.o Setiap 8j selama 7-10 hari (dewasa); 17 mg / kg oral atau iv setiap 8 jam selama 7-10 hari (maksimum 750 mg / dosis) (anak) Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('b0d25694-e25c-43fb-b6f5-bc8b2401bcb2', '6c199872-b14b-4047-98aa-5a10689d09a0', 'Nevirapine (NVP). Nevirapine dihindari pada pasien HIV dengan hepatitis B kronis karena menyebabkan hepatotoksisitas yang signifikan. Pasien dengan hepatitis B kronis sudah memiliki kerusakan atau peradangan pada hati. Pemberian Nevirapine pada kondisi ini dapat meningkatkan risiko kerusakan hati yang lebih parah, yang berpotensi menyebabkan gagal hati akut dan bahkan kematian. Referensi: PERMENKES RI Nomor 23 tahun 2022 tentang penanggulangan human immunodeficiency virus, acquired immunodeficiency syndrome, dan infeksi menular seksual', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('7cb0ff58-7d90-47df-9a39-e5fc714aa919', '76f1ba81-b714-48e2-bfad-58929a01d3ee', 'Peritonitis bakterial spontan merupakan infeksi bakterial akut pada cairan asites tanpa adanya sumber infeksi intraabdominal. Terapi PBS diberikan apabila diagnosis PBS telah ditegakkan baik dari parasentesis maupun dari hasil kultur. Regimen terapi yang diberikan meliputi pemberian albumin, antibiotik dan profilaksis. Cefotaxime, kelompok sefalosporin generasi ketiga, merupakan antibiotik pilihan yang sering digunakan. Sebagai alternatif, dapat digunakan beberapa antibiotik lain seperti amoksilin/asam klavulanat dan quinolon, seperti ciprofloxacin atau ofloxacin. Referensi: The 8th Liver Update and The 22nd Scientific Meeting of Ina ASL/PPHI 2015. ABDOMINAL INFECTION IN LIVER CIRRHOSIS', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('6fad0088-50cd-471d-84bd-efa25ec3b74e', '77d34a1c-2c22-42df-97cd-77b045ba9d21', 'ARV lini pertama yang direkomendasikan pada pasien dewasa adalah : Tenofovir + Lamivudine atau Emtricitabine + Efavirenz. Adanya penurunan densitas tulang yang ditunjukkan dengan adanya penurunan T-score dan kejadian fracture pada pasien merupakan efek samping khas dari Tenofovir. Referensi: PNPK HIV (2019); Dipiro 12th Ed (2023); Lexicomp (2023)', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('961cc8a2-fbd5-4502-81b1-f52e18afb797', '787bd638-7cda-4001-afb9-95d1dd07d620', 'Diethylcarbamazine (DEC) adalah terapi utama untuk filariasis limfatik yang disebabkan oleh Wuchereria bancrofti, dengan mekanisme kerja yang membunuh cacing dewasa dan larva. Ivermectin adalah obat utama untuk infeksi cacing lain seperti onchocerciasis (river blindness) tetapi tidak untuk filariasis limfatik. Albendazole sering digunakan dalam kombinasi dengan DEC dalam program pengobatan massal tetapi tidak digunakan sebagai terapi tunggal untuk filariasis. Mebendazole dan Praziquantel tidak efektif terhadap infeksi filaria. Mebendazole digunakan untuk infeksi cacing usus seperti cacing gelang, sedangkan Praziquantel digunakan untuk infeksi cacing pipih seperti schistosomiasis', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('0f2ddd14-3266-4e9e-8ffc-d60b35a2ff80', '7ad02156-de8d-426a-8f6d-2e6ce52b326e', 'doksisiklin. Obat yang digunakan untuk kemoprofilaksis adalah doksisiklin dengan dosis 100mg/hari. Obat ini diminum 1 hari sebelum bepergian, selama berada di daerah tersebut sampai 4 minggu setelah kembali. Tidak boleh diberikan pada ibu hamil dan anak dibawah umur 8 tahun. Sebaiknya konsumsi obat ini sebagai profilaksis tidak lebih dari 12 minggu. Terdapat beberapa alternatif obat lain yang dapat digunakan sebagai kemoprofilaksis yaitu atovaquono/proguanil, klorokuin (tidak bisa karena disoal resisten), meflokuin, primakuin, dan tafenoquine. Referensi: CDC. 2024. Choosing a Drug to Prevent Malaria; KEMENKES RI. 2023. Buku saku tatalaksana kasus malaria', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('eaa15a36-fb4f-4cb0-a92a-e29cdc3aef3b', '7bc856fa-a766-49d3-bae3-ad57bbd577d3', 'Pada pasien dengan infeksi HIV dan mengalami candidiasis oral dapat diberikan Flukonazole sebagai alternatif nistatin. Referensi: PNPK Tata Laksana HIV 2019', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('b1171cff-5b13-4d51-8f9a-59285a1e9302', '7c6c40e8-6774-48f0-885b-eb801a1cee85', 'pemeriksaan fungsi hati (SGOT/AST, SGPT/ALT). Rejimen OAT HRZE mengandung beberapa obat yang sangat potensial menyebabkan toksisitas. Isoniazid, Rifampisin, dan Pirazinamid semuanya bersifat hepatotoksik, menjadikannya alasan utama untuk memonitor fungsi hati (melalui kadar enzim SGOT dan SGPT) secara rutin. Referensi: PDPI. 2021. Tuberkulosis: Pedoman diagnosis dan penatalaksanaan di Indonesia', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('bd768a5b-b7e0-4ce3-be41-e087f2f19002', '7daa6640-2c73-4516-837b-26b0802cb4b9', 'Zidovudine (AZT) adalah obat antiretroviral yang direkomendasikan untuk profilaksis pada bayi yang lahir dari ibu yang HIV positif. Terapi ini harus dimulai dalam waktu 24 jam setelah lahir dan dilanjutkan selama 4-6 minggu. Referensi: Kementerian Kesehatan Republik Indonesia. (2022). Pedoman Nasional Penanggulangan HIV dan AIDS', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('57e1c63f-1dd8-4e6d-908f-3fb0305835e8', '824f4a41-bcc8-453f-a8c8-fa1a3df086f7', 'Mekanisme kerja golongan quinolon secara umum adalah dengan menghambat DNA-gyrase. Pilihan lain tidak dipilih karena : Beta laktamase (amoksisilin-klavulanat) DNA dependent RNA polymerase (Rifampisin) Dihydrofolate reductase (Sulfametoksasol) Referensi: Dirjen Bina Kefarmasian. Pharmaceutical Care untuk ISPA. Departemen Kesehatan RI, 2005;', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('0171ff69-0d58-4eb3-b302-8a0be0a1d400', '9181b94c-c83f-4b06-bc9b-5623097b72ad', 'Tatalaksana utama penyakit trikomoniasis yang disebabkan oleh Trichomonas Vaginalis adalah metronidazole. Obat ini bekerja dengan mengganggu DNA dan metabolisme sel parasit, sehingga menghentikan pertumbuhan dan reproduksi Trichomonas vaginalis. Referensi: Pedoman Ab No. 28 (2021)', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('2768ed6a-5103-4c40-8702-8121bf406f3e', '95800482-8ca6-4f7e-ab08-6775dd1afd6a', 'Pengobatan tinea capitis 1st : griseofulvin Alternatif : itraconazole atau terbinafine Referensi: Perdoski, 2017, Panduan Praktik Klinis bagi Dokter Spesialis Kulit dan Kelamin', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('e0c1e5b2-b4c8-437f-8f15-d017a0529c98', 'aa1f47cb-631d-4353-bf48-09dde9b547af', 'Rekomendasi terapi antibiotik empiris pada pasien pneumonia dengan komorbid DM adalah fluorokuinolon (ciprofloxacin, moxifloxacin) atau B lactam + makrolida. Pasien memiliki riwayat alergi beta laktam sehingga lebih dipilih fluoroquinolon. Referensi: Infectious Diseases Society of America/American Thoracic Society Consensus Guidelines on the Management of Community-Acquired Pneumonia in Adults, 2007, Guideline of the American Thoracic Society and Infectious Diseases Society of America.2019', 'manual')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('096ca227-e817-47ac-a4f7-b6d4feb22fea', 'acf4b247-3abf-4668-a2bc-c41e463c90ce', 'seftriakson. Pada kasus shigellosis, direkomendasikan penggunaan azitromisin, siprofloksasin, atau seftriakson. Referensi: Dipiro et al, 2023. PB PGI. 2024. Konsensus nasional penatalaksanaan diare pada pasien dewasa di Indonesia tahun 2024', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('b7791227-9b04-454a-8b8d-b3868af38d57', 'ad441df8-afd5-440f-b705-8697ac686376', 'seftriakson (kategori B). Pada pasien yang mengalami Pielonefritis non komplikasi maka tatalaksana terapi pertama yang dapat direkomendasikan yaitu siprofloksasin dengan alternatifnya seftriakson. Pada pasien hamil maka terapi yang aman yaitu menggunakan seftriakson. Referensi : Dipiro JT, 2023, Pharmacotherapy Handbook 12th Edition; PMK No 28 Tahun 2021 tentang Pedoman Penggunaan Antibiotik', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('645008e3-c5b9-43a7-8ab2-d54363344eb1', 'af0928ff-e1fb-490b-84b3-292b729f073c', 'Jawabannya yaitu pirantel pamoat. Pirantel pamoat merupakan salah satu obat yang digunakan untuk terapi infeksi cacing kremi (Enterobius vermicularis/pinworm). CDC menyebut tiga pilihan terapi yang lazim, yaitu mebendazole, pyrantel pamoate, atau albendazole. Pada soal ini, pirantel pamoat adalah opsi yang tepat dan biasanya diberikan sebagai dosis tunggal lalu diulang 2 minggu kemudian untuk membantu eradikasi cacing yang baru menetas. Referensi: CDC Clinical Overview of Pinworm Infection; DailyMed pyrantel pamoate suspension.', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('cae13c88-3b63-44bf-a11e-1cd135e153d2', 'afb80e1e-31d8-46ef-9ea2-8168544ef776', 'nefrotoksisitas. Toksisitas Ginjal (Nefrotoksisitas) adalah efek samping paling umum dan paling serius dari Amfoterisin B. Kerusakan ginjal terjadi pada sebagian besar pasien yang menerima obat ini. Mekanismenya melibatkan kerusakan langsung pada sel-sel tubulus ginjal. Gejala yang dapat muncul meliputi Peningkatan kreatinin dan BUN (Blood Urea Nitrogen); Indikasi penurunan fungsi ginjal; Ketidakseimbangan elektrolit; Terutama hipokalemia (kadar kalium rendah) dan hipomagnesemia (kadar magnesium rendah), yang dapat menyebabkan gangguan irama jantung atau kelemahan otot; dan Asidosis tubulus ginjal: Gangguan kemampuan ginjal untuk mempertahankan keseimbangan pH darah. Referensi: MIMS. 2024. Amphotericin B', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('c5cba235-8f02-4792-9a33-0954525ddb2b', 'b651f97d-dac2-4f5e-ba2c-7aefa3e37f68', 'Vaksin DPT adalah vaksin kombinasi yang diberikan untuk mencegah tiga penyakit, yakni difteri, pertusis (batuk rejan), dan tetanus. dapat diberikan mulai umur 6 minggu berupa vaksin DTwP atau DTaP. Vaksin DTaP diberikan pada umur 2, 3, 4 bulan atau 2, 4, 6 bulan. Booster pertama diberikan pada umur 18 bulan. Booster berikutnya diberikan pada umur 5 - 7 tahun atau pada program BIAS kelas 1. Umur 7 tahun atau lebih menggunakan vaksin Td atau Tdap. Booster selanjutnya pada umur 10 ??? 18 tahun atau pada program BIAS kelas 5. Booster Td diberikan setiap 10 tahun. Referensi: Informasi Vaksin Untuk Orang tua (IDAI, 2014), IDAI (2020)', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('e541f41a-f6bc-4ed6-b682-bbd071d0b8ab', 'b75d39de-c4d9-4132-880e-98e9f970d99a', 'Indonesia berdasarkan Kemenkes : Lini pertama pengobatan demam tifoid adalah kloramfenikol 50-100 mg/kgbb/hr selama 10-14 hari, ampicilin atau amoxicilin 100 mg/kgbb/hr, selama 10 hari. Pada kasus pasien alergi terhadap beta-laktam, sehingga mengikuti guideline Kemenkes, dan alternatif terapi dari BNFC 2021, yaitu Kloramfenikol. Referensi: KMK No. 364/MENKES/SK/V/2006 tentang pedoman pengendalian demam tifoid; BNF Children 2021', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('2abc78c3-9168-48d0-ae62-21f215a26b6d', 'c3782443-1574-477f-a8c4-fdadf68915bc', 'Pilihan yang paling benar adalah WHO merekomendasikan dosis albendazol yaitu 200 mg untuk anak usia 12 ??? 24 bulan. Referensi: PERATURAN MENTERI KESEHATAN REPUBLIK INDONESIA NOMOR 15 TAHUN 2017 TENTANG PENANGGULANGAN CACINGAN', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('60fb7bda-6c5c-432f-a092-4fd42815940c', 'c6ea23f9-0c36-43f4-875f-7924870c4e0d', 'Penisilin bekerja dengan menghambat pembentukan dinding sel bakteri, dengan menghambat digabungkannya asam N-asetilmuramat non esensial ke dalam struktur mukopeptida yang biasanya membuat sel menjadi kaku dan kuat. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('2eedb06b-07e0-4146-8566-395662942602', 'ca7e73c3-15d0-4a86-9c66-07391397b726', 'kreatinin serum. Parameter pemantauan dari penggunaan amikasin yaitu: lakukan uji kultur dan uji kerentanan. Pantau fungsi ginjal, urin (misalnya berat jenis, ekskresi protein, keberadaan sel atau silinder), BUN, kreatinin, konsentrasi puncak dan palung yang tepat waktu, fungsi saraf kranial kedelapan (terutama pada pasien dengan gangguan ginjal yang diketahui atau diduga). Lakukan tes pendengaran (audiogram) pada awal dan secara berkala. Kaji tanda dan gejala ototoksisitas, neurotoksisitas, dan nefrotoksisitas; tanda-tanda vital, suhu, berat badan, masukan dan keluaran. Referensi : MIMS. 2024. Amikacin', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('98077a2b-ffbe-4854-8405-21466bb073b7', 'd022d1aa-e47d-4ebd-92e3-4735f1d51200', 'clofazimine. Clofazimine dapat menyebabkan perubahan warna kulit menjadi jingga-merah muda atau coklat-kehitaman (diskromia). Diskromia atau diskolorasi kulit adalah efek samping yang paling khas dan umum dari Clofazimine akibat akumulasi obat di jaringan kulit dan lemak. Efek ini bersifat reversibel, tetapi memerlukan waktu lama untuk menghilang setelah pengobatan dihentikan. Selain pada kulit, clofazimine juga dapat berpengaruh pada warna konjungtiva, keringat, air mata, sputum, urine, dan feses pada 75???100% pasien. Clofazimine juga dapat menyebabkan kulit menjadi kering dan gatal. Referensi: Food and Drug Administration. 2016. Lamprene/Clofazimine; MIMS. 2025. Clofazimine-oral', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('a9d68858-8321-4e45-a983-5a0faf0812df', 'd2857e8a-9d6e-473f-aa7a-4cc7c2909df2', 'Pada prinsipnya pengobatan malaria pada ibu hamil sama dengan pengobatan pada orang dewasa lainnya. Pada ibu hamil tidak diberikan Primakuin, tetrasiklin ataupun doksisiklin. Trimester I-III (0-9 bulan) = DHP tablet selama 3 hari Referensi: Kemenkes. (2020). Buku Saku Tatalaksana Kasus Malaria', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('f8ccc117-e448-44bb-9960-2b7065cab7ac', 'd2e0c61a-f867-455c-b1e3-491e2808639d', 'streptomisin (kategori D). Streptomisin dapat menembus sawar plasenta sehingga tidak boleh diberikan pada perempuan hamil karena dapat merusak fungsi pendengaran janin. Semua obat TB lini pertama dengan pengecualian streptomisin aman digunakan selama kehamilan. Keempat obat lini pertama yaitu isoniazid, rifampisin, etambutol dan pirazinamid dapat digunakan pada wanita hamil dan dilaporkan tidak berhubungan dengan kejadian malformasi pada janin. Referensi: KEMENKES RI. 2020. Pedoman nasional pelayanan kedokteran tatalaksana tuberkulosis; PDPI. 2021. Tuberkulosis: Pedoman diagnosis dan penatalaksanaan di Indonesia', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('412af99e-9b9e-4fd1-95c7-a5360d2349fe', 'd44cc838-faec-43d5-beb7-ab9c535b256d', 'Pilihan yang paling benar adalah Kotrimoxasol terdiri dari trimethoprim dengan menghambat sintesis asam folat dan sulfamethixazole dengan menghambat reduksi asam dihydrofolat menjadi tetrahydrofolat sehingga menghambat enzim pada alur sintesis asam folat. Referensi: Dirjen Bina Kefarmasian. Pharmaceutical Care untuk ISPA. Departemen Kesehatan RI, 2005', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('9edf40ee-839b-48f7-b097-6750f91b819b', 'd4796c7b-56f0-43c9-933d-d069d959d818', 'Secara intraseluler, AZT difosforilasi menjadi metabolit aktif 5''-trifosfat, zidovudine triphosphate (ZDV-TP), kerja utama ZDV-TP adalah penghambatan reverse transcriptase (RT) melalui rantai DNA terminasi setelah penggabungan analog nukleotida.', 'manual')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('7b11f520-f389-46aa-a7f1-0fd95c3f6eb8', 'd690af58-03ec-4b8c-9fa5-b40da2d14e5d', 'ODHA dengan TB yang dalam keadaan imunosupresi berat (CD4<50 sel/mm3) harus mendapat terapi TB terlebih dahulu, kemudian dilanjutkan dengan pengobatan ARV sesegera mungkin dalam 2 minggu pertama pengobatan TBC tanpa memandang nilai CD4. Referensi: PERMENKES RI No. 23 Tahun 2022 tentang Penanggulangan HIV/AIDS dan IMS', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('169f9766-2111-4163-a797-e289d6f46dea', 'd80c1b42-b62b-4e8e-9c82-d3e5bda60663', 'melanjutkan pengobatan dosis yang tersisa sampai seluruh dosis pengobatan terpenuhi. Tindakan pada pasien yang putus berobat selama kurang dari 1 bulan pada berapapun lama pengobatan yang sudah dijalani: Dilakukan pelacakan pasien Diskusikan dengan pasien untuk mencari faktor penyebab putus berobat Lanjutkan pengobatan dosis yang tersisa sampai seluruh dosis pengobatan terpenuhi (Lanjutkan pengobatan dosis yang tersisa sampai seluruh dosis pengobatan terpenuhi dan dilakukan pemeriksaan ulang dahak kembali setelah menyelesaikan dosis pengobatan pada bulan ke 5 dan AP). Referensi: P2P Kementerian kesehatan RI. 2020. Petunjuk teknis penatalaksanaan tuberkulosis resistan obat di Indonesia; Permenkes RI Nomor 67 tahun 2016 tentang penanggulangan tuberkulosis', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('f14e7b46-517b-4c37-8983-9d0445c062c8', 'dad3c5ac-5c97-45d5-a88c-c72eb99af433', 'Pada anak usia 2 tahun dengan diare akibat Escherichia coli, pemberian antibiotik harus mempertimbangkan keamanan pada anak dan efektivitas terhadap bakteri Gram-negatif enterik. Fluoroquinolone seperti siprofloksasin tidak direkomendasikan rutin pada anak karena berisiko mengganggu pertumbuhan tulang rawan. Antibiotik yang lebih aman dan masih efektif adalah kotrimoksazol, sehingga menjadi pilihan terbaik dari opsi yang tersedia. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'manual')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('e3a329ce-508b-4d86-b3a2-6b2039649877', 'dbb3bccb-c2ec-4897-8132-82ef2f3a87b4', 'Metronidazole, sebuah nitroimidazole, adalah obat pilihan dalam pengobatan amebiasis ekstraluminal. Metronidazol membunuh trofozoit E histolytica dan secara efektif membunuh infeksi jaringan usus dan ekstraintestinal. Metronidazole 500-750 mg p.o Setiap 8j selama 7-10 hari (dewasa); 17 mg / kg oral atau iv setiap 8 jam selama 7-10 hari (maksimum 750 mg / dosis) (anak). Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('461a19b8-db69-4074-ad42-38e4bac8440a', 'de9c687f-6bc2-4252-9e59-ecf5f60dccd9', '1st: Amoxicilin/ Amoksiklav, kotrimoxazole,. 2nd: Sefalosporin, makrolida Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('c4c8e3bd-46ef-4283-abd4-64302d43138a', 'ec83b096-4591-4180-81bf-595387b36cc7', 'Tetrasiklin merupakan agen antimikrobial hasil biosintesis yang memiliki spektrum aktivitas luas. Mekanisme kerjanya yaitu blokade terikatnya asam amino ke ribosom bakteri (sub unit 30S). Aksi yang ditimbulkannya adalah bakteriostatik yang luas terhadap gram positif, gram negatif, chlamydia, mycoplasma, bahkan rickettsia. Pilihan lain tidak dipilih karena : menghambat sintesis dinding sel bakteri (penisilin) menghambat DNA-gyrase (fluoroquinolon) menghambat sintesis asam folat (Trimetophrim) menghambat reduksi asam dihydrofolat menjadi tetrahydrofolat sehingga menghambat enzim pada alur sintesis asam folat (Sulfametoksasol) Referensi: Dirjen Bina Kefarmasian. Pharmaceutical Care untuk ISPA. Departemen Kesehatan RI, 2005', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('5f5a2d18-3b9f-43e8-bd38-aae442410d91', 'f2f7ea03-681b-43dd-bce1-fa04a02ff128', 'metronidazole. Pengobatan standar untuk giardiasis melibatkan terapi antibiotik, dengan metronidazol menjadi pengobatan lini pertama untuk kondisi ini. Regimen pengobatan alternatif untuk giardiasis meliputi tinidazol, nitazoksanid, mebendazol, albendazol, dan paromomisin. Paromomisin, yang memiliki penyerapan sistemik yang buruk, dapat dipertimbangkan untuk pasien hamil selama trimester pertama. Sumber: Dunn and Juergens. 2024. Giardiasis; PMK No 28 Tahun 2021 tentang Pedoman Penggunaan Antibiotik', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('c2ab4938-0015-43f6-8bbf-244d19427b5f', 'f8270336-b7e7-40a0-b6f8-d2e2b421a56e', 'Pada prinsipnya pengobatan malaria pada ibu hamil sama dengan pengobatan pada orang dewasa lainnya. Pada ibu hamil tidak diberikan primakuin, tetrasiklin ataupun doksisiklin. Tatalaksana pengobatan pada ibu hamil trisemester I-III (0-9 bulan) yaitu menggunakan ACT (DHP tablet selama 3 hari). Referensi: KEMENKES RI. 2023. Buku saku tatalaksana kasus malaria.', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('6168ec1b-85fc-4e14-8c3c-b073bb818bfc', 'f8849106-e767-4abf-bdb8-8cae1e62c594', 'Terapi pada faringitis 1st: amoksilin.klavulanat 2nd:Makrolida (pilihan untuk alergi penisilin), sefalosporin 2 atau 3, quinolone (levofloxacin) Kasus gagal dan menetap: klindamisin 10 hari Referensi: PMK No 28 Tahun 2021 tentang Pedoman Penggunaan Antibiotik)', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('1b9d2f64-1de6-49fe-9d82-d25dd0e5e2b8', '04743142-87c2-45c5-9037-2672b3b754bb', 'Agen antiinflamasi yang tepat untuk derajat nyeri dan bengkak kasus proteinuria adalah golongan NSAID. Piroksikam adalah salah satu obat nyeri dan anti inflamasi golongan NSAID, allopurinol adalah agen yang berfungsi menghambat pembentukan asam urat. Referensi: Pionas', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('52f4a722-56d3-4093-b742-7ef4ce465cc7', '07d330de-9007-4f38-b39a-b9b1c58de1fc', 'Interpretasi Hasil DXA (T-score): T-score >= -1.0 = Normal T-score antara -1.0 hingga -2.5 = Osteopenia (penurunan kepadatan tulang) T-score <= -2.5 = Osteoporosis Pasien memiliki T-score -1.00, yang masih dalam kategori normal dan belum memerlukan terapi obat osteoporosis. Namun, pencegahan tetap penting untuk mempertahankan kepadatan tulang dan mencegah osteoporosis. A (Kalsium dan vitamin D) = BENAR Menurut DiPiro 2023, pasien dengan T-score normal atau osteopenia tanpa risiko fraktur tinggi tidak memerlukan obat osteoporosis. Kalsium dan vitamin D direkomendasikan sebagai langkah pencegahan untuk mempertahankan kepadatan tulang. Dosis yang disarankan: Kalsium: 1000-1200 mg/hari Vitamin D: 800-1000 IU/hari Sumber: DiPiro, J. T., et al. (2023). Pharmacotherapy: A Pathophysiologic Approach, 12th Edition. McGraw-Hill Education.', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('8ab06f79-7de8-4ea1-a5c9-50c833ed8ad4', '085800a9-50f4-4064-9301-698bbde9c166', 'Metotreksat adalah obat yang bekerja dengan menghambat enzim dihidrofolat reduktase, yang merupakan tahap awal dalam biosintesis asam folat aktif. Dengan menghambat enzim ini, metotreksat mengganggu produksi asam folat yang diperlukan untuk sintesis DNA dan pertumbuhan sel. Untuk mengurangi risiko efek samping dan komplikasi terkait defisiensi asam folat, seringkali dianjurkan untuk memberikan suplemen asam folat kepada pasien yang menjalani terapi metotreksat. Referensi: PIONAS', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('4db1c73a-1716-4049-bab3-763f1f653749', '0a91a5cd-4d11-46ab-8a91-a88f96ab2504', 'Urikostatik adalah obat yang digunakan untuk menurunkan asam urat dalam serum. Urikosurik adalah obat yang bekerja meningkatkan ekskresi urat di ginjal dengan menghambat reabsorbsi pada proksimal tubule. Urikolitik adalah obat yang bersifat menghancurkan deposit asam urat. Hiperurisemia dapat diobati menggunakan urikosurik untuk meningkatkan eliminasi asam urat. Obat-obat urikosurik adalah probenesid, sulfinpirazon, dan benzbromaron (Mutschler, 1986). Referensi: Mutschler, E., 1986, Dinamika Obat: Buku Ajar Farmakologi dan Toksikologi, diterjemahkan oleh Widianto, M.B., dan Ranti, A.S., Edisi Kelima, 157-158, Penerbit ITB, Bandung', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('84b53097-51bc-4365-b18f-e5066d7e523a', '0a958e2a-92e8-47f3-8cb7-4eab190163ae', 'Berdasarkan DiPiro (2023), kandungan kalsium dari berbagai sediaan adalah sebagai berikut: Kalsium karbonat = 40% kalsium elemental. Kalsium sitrat = 21% kalsium elemental. Trikalsium fosfat = 38% kalsium elemental. Kalsium laktat = 13% kalsium elemental. Kalsium glukonat = 9% kalsium elemental. Referensi: DiPiro, J. T., et al. (2023). Pharmacotherapy: A Pathophysiologic Approach, 12th Ed. McGraw-Hill', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('5f407a47-f989-4ad2-a3e9-2a794f4ac163', '1061e326-b896-4c9c-a19c-13bc49edb275', 'Teriparatide jadi salah satu alternatif memperbaiki densitas tulang pada penderita osteoporosis. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('7545dc9f-7b78-4338-bd43-70eba15651d7', '1ad5940c-d3bb-42ae-a869-1ffa4d7c6571', 'Kasus ini paling sesuai dengan gout arthritis berulang yang disertai hiperurisemia. Nyeri dan inflamasi pada sendi ibu jari kaki, serangan berulang, serta kadar asam urat 10 mg/dL sangat mendukung diagnosis gout terkait hiperurisemia. Namun dari opsi yang tersedia, jawaban yang paling mendekati adalah D. Hiperurisemia, karena opsi E. Arthritis terlalu umum dan tidak spesifik. Referensi: 2020 American College of Rheumatology Guideline for the Management of Gout; DiPiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed.', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('c4ed56dc-adf0-48f6-ab77-ad49ee251f9a', '213b5c0d-faa9-4fbe-beca-edfe9a6df08f', 'Metotreksat adalah DMARD (Disease Modifying Anti-Rheumatic Drug) lini pertama untuk RA. Obat ini bekerja dengan menghambat sintesis DNA, namun juga dapat menyebabkan efek samping seperti mielosupresi, stomatitis, dan hepatotoksisitas. Oleh karena itu, asam folat (folic acid) diberikan secara rutin (misalnya 1 mg/hari atau 5 mg/minggu) untuk mengurangi toksisitas metotreksat, tanpa mengganggu efektivitas antiinflamasinya. Pasien pada kasus ini mengalami gejala efek samping khas metotreksat yang dapat dicegah dengan suplementasi folat. Intervensi yang tepat adalah menambahkan asam folat, bukan menghentikan metotreksat atau langsung mengganti ke obat lain. Sumber: EULAR Recommendations for the Management of RA; AHFS Drug Information: Methotrexate; BNF', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('f0046e52-d539-41d0-af37-2936e5156162', '2264b24b-341c-4ba2-bd5d-321bb41cc8d8', 'Probenesid merupakan obat urikosurik yang bekerja dengan meningkatkan ekskresi asam urat melalui ginjal. Peningkatan kadar asam urat dalam tubulus ginjal dapat memicu pembentukan kristal asam urat yang menyebabkan iritasi saluran kemih. Kondisi ini dapat menimbulkan hematuria, kolik renal, dan nyeri pinggang, terutama pada awal terapi. Referensi: AHFS 2011 dan', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('1ed7d2fc-c0bc-41e5-9d9d-954b836c3a76', '2e76a658-2ebc-40d2-aade-b0a358933883', 'Adalimumab merupakan antiTNF alfa yang digunakan untuk mengurangi gejala dan mencegah kerusakan struktur pada pasien AR sedang-berat yang aktif dan tidak memberikan respons yang memadai pada pemberian satu atau lebih DMARD. Obat ini dapat diberikan dengan atau tanpa kombinasi dengan metotreksat atau DMARD lain. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('0fd09ec8-f9f3-40fe-b1aa-7f138b9f4bdf', '2f0d82e6-476b-4413-ab2c-d024f55f7843', 'Aspirin (asetosal) merupakan NSAID yang dapat mengiritasi mukosa lambung karena menghambat enzim COX-1 sehingga menurunkan produksi prostaglandin protektif lambung. Pada pasien yang sudah mengalami nyeri lambung akibat aspirin, penggunaan NSAID lain juga berisiko memperburuk iritasi saluran cerna. Oleh karena itu, obat analgesik yang lebih aman untuk lambung adalah paracetamol, karena tidak memiliki efek antiinflamasi perifer yang signifikan dan minimal mengiritasi mukosa lambung. Referensi: Medscape', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('2358f44b-210c-495b-9b90-27cff80bd4a1', '30b639c4-f1a3-4d9e-be3c-a1ce3a1eed1c', 'Alendronat adalah bifosfonat yang digunakan untuk mengobati osteoporosis dengan cara menghambat aktivitas osteoklas, sehingga mengurangi resorpsi tulang. Namun, obat ini memiliki bioavailabilitas yang sangat rendah ketika dikonsumsi bersamaan dengan makanan, terutama produk susu atau makanan tinggi kalsium. Oleh karena itu, pasien dianjurkan untuk mengonsumsinya dengan perut kosong dan menunggu setidaknya 30 menit sebelum makan atau minum selain air putih untuk memastikan penyerapan optimal. Selain itu, alendronat dapat menyebabkan iritasi mukosa esofagus dan meningkatkan risiko esofagitis atau ulkus esofagus jika tertahan terlalu lama di esofagus. Oleh karena itu, pasien harus tetap dalam posisi tegak (duduk atau berdiri) selama setidaknya 30 menit setelah mengonsumsi obat agar gravitasi membantu mencegah refluks atau paparan berkepanjangan pada esofagus. Referensi: Drug Information Handbook (DIH). Alendronate Sodium Monograph. Lexi-Comp, Inc.', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('b4069fb7-eafd-49c4-bab9-24a23f84d99b', '33e956ad-d069-458d-a5c6-c09e430b38b4', 'Rincian Obat DMARD: Sulfasalazin: Dosis: 2-3 g/hari dibagi menjadi 2-3 dosis Toksisitas: Mual, sakit kepala, leukopenia dan rash Persiapan: DPL, fungsi hati, kreatinin, HBV dan HCV. Vaksinasi influenza dan pneumococcus. Pemantauan: <3 bulan terapi (tiap 2-4 minggu); 3-6 bulan terapi (tiap 8-12 minggu); >6 bulan terapi (tiap 12 minggu). Kontraindikasi: Infeksi aktif, trombosit <50.000, fungsi liver >2 kali ULN, hepatitis B/C akut. Hidroksiklorokuin: Dosis: 200-400 mg/hari (maksimal 6.5 mg/kgBB/hari) Toksisitas: Mual, rash, neuromiopati dan retinopati Persiapan: DPL, fungsi hati, fungsi ginjal, pemeriksaan mata (retina) Pemantauan: Tiap 3 bulan. Pemeriksaan mata tiap tahun, setelah 5 tahun pemakaian. Kontraindikasi: Hipersensitivitas, riwayat gangguan penglihatan (>6.5 mg/kg dan durasi lebih dari 5 tahun), defisiensi G6PD. Sumber: Perhimpunan Reumatologi Indonesia. 2021. Tatalaksana RADisease. Kidney and Blood Pressure Research, 50(1), 249-258.', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('7e97c3f3-1dd8-42f0-9c2d-ae707bd7108f', '3616f5c1-e945-4616-bc13-8a0472468dc1', 'Tatalaksana inflamasi harus diassement tingkat inflamasi dan tingkat nyeri dengan menggunakan VAS (Visual Analog Scale). Dapat digunakan terapu tunggal atau kombinasi. Obat pilihan antara lain NSAID, Kortikosteroid, Kolkisin Referensi: Pionas', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('3ae06c0e-8572-4869-bd95-a17654a02740', '36a599ae-362d-450b-b8e9-4d141f9e265a', 'Terapi osteoporosis: 1st line: Alendronate, Risendronate, Zolendronic acid, dan denosumab. 2nd line: Raloksifen, Ibandronate, Teriparatide 3rd line: Kalsitonin Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('7df7cbda-e387-4129-87fc-fa3e4b43f87b', '3c170ac9-b318-4bad-8249-73134362cd7c', 'Calcitriol adalah bentuk aktif dari vitamin D3 yang berperan dalam homeostasis kalsium dan mineralisasi tulang. Obat ini bekerja dengan meningkatkan penyerapan kalsium di usus serta meningkatkan reabsorpsi kalsium di tubulus ginjal, sehingga meningkatkan kadar kalsium dalam darah. Efek ini membantu meningkatkan kepadatan mineral tulang dan mengurangi resorpsi tulang yang berlebihan pada osteoporosis. Referensi: DiPiro, J. T., et al. (2023). Pharmacotherapy: A Pathophysiologic Approach, 12th Ed. McGraw-Hill', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('f863368a-096d-4727-aa88-ba5d884120ae', '412f97e5-8551-4275-948e-4a0956700570', 'Levotiroksin merupakan hormon tiroid sintetik yang bila digunakan dalam dosis tinggi atau menyebabkan kondisi hipertiroid subklinis dapat meningkatkan resorpsi tulang sehingga menurunkan densitas mineral tulang. Pada pasien lansia dengan osteoporosis, penggunaan levotiroksin dapat memperburuk pengeroposan tulang dan meningkatkan risiko fraktur. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('97b4c309-0a2a-4802-b5c2-68f731141210', '4ea81d0b-09d8-4445-950a-b105ad8bf8ef', 'Asam folat diberikan bersama metotreksat untuk mengurangi toksisitas terapi, termasuk efek samping gastrointestinal, mukositis, mielosupresi, dan abnormalitas fungsi hati. Di antara opsi yang tersedia, jawaban yang paling mendekati adalah B karena folat dapat membantu menurunkan risiko peningkatan enzim hati (ALT) pada sebagian pasien yang menggunakan metotreksat. Referensi: Shea et al. Cochrane Review on folic acid and folinic acid for reducing methotrexate side effects in rheumatoid arthritis; NHS Specialist Pharmacy Service, Using folic acid with methotrexate in rheumatoid arthritis.', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('0d92f4e4-dbff-411b-a1a0-c3806919a364', '508de76a-e370-4a9c-9ed8-aa45b52911af', 'NSAIDs meredakan nyeri melalui penghambatan sintesis prostaglandin. Prostaglandin menumpuk pada tempat jaringan yang terluka, sehingga menyebabkan nyeri dan inflamasi. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('435ee365-6426-40d3-afe3-72916470a475', '53004ba8-550e-472d-9917-8790eed06317', 'Allopurinol merupakan obat golongan xantin oksidase yang merupakan agen urikostatik. Allopurinol dapat menurunkan kadar asam urat dalam serum dengan mencegah terbentuknya asam urat dari purin. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('b439af70-4814-45b1-8e7a-bb4093b64ee5', '556cd8bb-18e7-4763-9b41-729f5676ab19', 'Allopurinol merupakan salah satu obat yang telah digunakan sebagai obat asam urat dengan mekanisme penghambatan aktivitas enzim xantin oksidase dengan bekerja sebagai inhibitor kompetitif bagi enzim xantin oksidase yang bertindak sebagai substrat pada reaksi enzimatis. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('4cfc6460-8f68-4284-97cf-b16fe8507746', '5697a85f-d1e7-46d9-9bd6-ef2c5970bfdb', 'Terapi utama untuk serangan gout akut: kolkisin, OAINS (indometasin, naproksen), atau kortikosteroid. Allopurinol & febuxostat = untuk pencegahan jangka panjang, bukan akut. Probenesid = urikosurik, juga untuk terapi kronis. Rasburikase = digunakan pada hiperurisemia berat (misal tumor lysis syndrome). Referensi: DiPiro, J. T., Talbert, R. L., Yee, G. C., Matzke, G. R., Wells, B. G., & Posey, L. M. (Eds.). (2014). Pharmacotherapy: a pathophysiologic approach. Pedoman Diagnosis dan Pengelolaan Gout Akut. Perhimpunan Reumatologi Indonesia 2018', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('5f1a1dca-2946-4b0e-8878-7888fecc3664', '57f92581-5d3e-4190-94f8-6102031f71aa', '2nd line terapi pasien osteoarthritis adalah AINS (memberikan rasa tidak nyaman pada pasien yang memiliki masalah dengan GI yang serius). Pemberian agen PPI dan misoprostol mengatasi kejadian GI yang merugikan pada NSAID. 3rd line adalah penggantian dengan agen COX 2 selektif inhibitor tetapi kontraindikasi pada pasien dengan riwayat kardiovaskular. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('20880659-cbaa-448f-8fd2-ab6abbbc142a', '5b38917b-402a-4e0a-8ae4-e074748fded7', 'Raloxifene adalah agonis/antagonis estrogen yang merupakan agonis estrogen pada reseptor tulang tetapi antagonis pada reseptor payudara, dengan efek minimal pada rahim. Raloksifen disetujui untuk pencegahan dan pengobatan osteoporosis pascamenopause dan untuk mengurangi risiko kanker payudara invasif pada wanita pascamenopause dengan dan tanpa osteoporosis. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('bb024ed7-bbb8-456c-af70-bb81ed4bd687', '6e9cfa0f-856e-484f-86c4-eb2ce6564685', 'Pada pasien osteoporosis, suplemen kalsium sering diberikan untuk meningkatkan kepadatan tulang. Namun, salah satu efek samping utama kalsium adalah konstipasi, karena dapat memperlambat motilitas usus dan meningkatkan konsistensi feses. Oleh karena itu, meskipun pasien sudah mengonsumsi makanan berserat, konstipasi tetap dapat terjadi. Vitamin D umumnya berfungsi membantu absorpsi kalsium dan jarang menyebabkan konstipasi secara langsung. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('41f67fa2-fd65-4f15-92f9-6db6af523da0', '749d090c-0077-4a90-b7f6-2a04a49efe73', 'Allopurinol menurunkan produksi asam urat. Pada fase awal terapi, perubahan kadar urat dapat memobilisasi kristal urat dari jaringan sehingga memicu gout flare sementara. Kondisi ini bukan menandakan resistensi obat. Di antara pilihan yang tersedia, jawaban yang tepat adalah C, yaitu serangan gout akibat mobilisasi kristal urat pada awal terapi. Karena itu, saat memulai allopurinol sering diberikan profilaksis antiinflamasi seperti NSAID atau kolkisin. Referensi: 2020 American College of Rheumatology Guideline for the Management of Gout; DiPiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed.', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('150d2154-a69f-4402-ba55-96d86a5c2497', '77662bce-7d3f-4793-a28f-9e72bff1c959', 'Produk yang mengandung aluminium, kalsium, magnesium, dan kation polivalen lainnya seperti antasida atau suplemen vitamin dengan mineral cenderung mengganggu penyerapan bifosfonat oral melalui saluran cerna. Misalnya, bioavailabilitas tiludronat terbukti menurun hingga 80% selama pemberian bersamaan dengan kalsium, dan 60% ketika antasida yang mengandung aluminium atau magnesium diberikan satu jam sebelum tiludronat. Penanganan: Antasida atau obat oral lainnya yang mengandung aluminium, kalsium, magnesium, dan kation polivalen lainnya harus diberikan setidaknya 30 menit setelah dosis bifosfonat. Referensi', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('1b361f7d-1fc4-4d81-88c1-385b8f066a80', '803ad642-b354-4108-ba29-68ae504ff04d', 'Lini terapi RA: metotreksat. Jika stok kosong, maka diganti obat yang masih dalam 1 golongan (DMARD non biologis) yaitu Hidroksikloroquin. Referensi: Pionas', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('51d46032-7f7e-4283-a987-b6e26b59b858', '82fefc3d-e923-40d7-83fa-41e14046037b', 'Patah tulang (terbuka, open long bone fracture) bisa diberikan antibiotik cefazoline, dengan alternatif lain seperti clindamycin, gentamicin. Referensi: Children Hospital of Philadelphia, chop.edu; Cross III, W.W., and Swiontkowski. Treatment principles in the management of Open Fractures. 2008', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('af7fb971-f27c-4f43-9ece-ace1458a9be1', '8d4c1f27-db6e-492b-aee9-826584aeb582', 'Antiepilepsi seperti fenitoin, karbamazepin, fenobarbital, dan asam valproat telah terbukti dapat menyebabkan penurunan kepadatan mineral tulang (BMD) dan peningkatan risiko fraktur pada pasien yang mengonsumsinya. Mekanisme pasti belum sepenuhnya dipahami, namun, obat-obatan ini diyakini mengganggu metabolisme tulang dan penyerapan kalsium, yang menyebabkan efek samping tersebut. Referensi: DiPiro, 12th Ed (2023)', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('39b3b56e-9b01-4f62-a030-f18a522a1331', '8e6d6a65-4edb-4243-a232-bde3396bce39', 'Colchicine adalah obat antiinflamasi yang digunakan untuk mengobati serangan gout akut dan mencegah serangan berulang. Mekanisme utama colchicine adalah menghambat migrasi neutrofil ke sendi yang mengalami peradangan, sehingga mengurangi respon inflamasi akibat kristal monosodium urat. Obat ini tidak mempengaruhi kadar asam urat dalam darah, tetapi hanya meredakan inflamasi yang terjadi akibat akumulasi kristal asam urat di sendi. Sehingga jawaban yang benar adalah C. Menghambat migrasi neutrofil dan respon inflamasi pada serangan gout. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed. Guideline Pengelolaan Gout Arthritis Indonesia 2018, Perhimpunan Reumatologi Indonesia (IRA).', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('2ca93550-e707-42fa-ae13-7352f644f2d5', '941d50be-5c32-419a-a7b8-55330d5ccd2d', 'CD20-targeted DMARD bekerja dengan mengikat antigen CD20 pada permukaan sel B dan menyebabkan deplesi sel B, sehingga menekan respon autoimun pada RA. Contoh obat golongan ini yaitu Rituximab. Infliximab, Adalimumab, Etanercept = anti-TNF-alpha. Tocilizumab = anti-IL-6 receptor. Sumber: Katzung BG. Basic & Clinical Pharmacology, 15th Ed. McGraw-Hill, 2021.', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('a7b7af0d-19a4-4078-b642-d0d6d10534af', '9554c1e3-8ba1-48fc-b9b7-0d6c7fbdaf3c', 'Sulfasalazine adalah Disease-Modifying Antirheumatic Drug (DMARDs) yang sering digunakan untuk mengobati rheumatoid arthritis (RA). Menurut Dipiro (2023), mekanisme kerja utama sulfasalazine: Di dalam usus besar, sulfasalazine dipecah oleh bakteri menjadi dua metabolit utama yaitu 5-ASA dan Sulfapyridine: 5-Aminosalicylic acid (5-ASA) memiliki efek antiinflamasi dengan menghambat sintesis prostaglandin dan leukotrien. Sulfapyridine berperan dalam efek imunomodulator, menghambat aktivasi limfosit dan sitokin proinflamasi. Sulfasalazine juga mengurangi produksi radikal bebas dan sitokin inflamasi yang berkontribusi pada peradangan di RA. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed. Kelley''s Textbook of Rheumatology, 10th Edition (2020). Elsevier', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('162a8bd5-1032-49f5-941a-f43866993b3f', '98a2671f-8e31-4f1e-8dd2-90bb9f924551', 'Pemberian alendronate bersamaan dengan suplemen kalsium, antasida, dan pengobatan oral lainnya dapat memengaruhi absorpsi alendronate sehingga pasien harus menunggu sekurang-kurangnya setengah jam setelah minum alendronate untuk meminum obat lainnya. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('c070a477-995c-4f8b-935f-dda0d76181f1', '99a829bc-80b3-432b-abcc-08be5e25c334', 'NSAID oral dan topical memiliki efek yang sama. NSAID oral direkomendasikan apabila pasien tidak bisa menoleransi efeknya pada kulit. Namun, terdapat efek samping yang tidak dapat dihindari pada penggunaan NSAID oral ini yaitu efek samping pada gastrointestinal, ginjal dan kardiovaskular. Dikarenakan pasien memiliki Riwayat SKA maka direkomendasikan untuk pemberian NA diclofenac topical. Pasien merupakan pasien geriatri dengan penggunaan concomitant antikoagulan dan aspirin. Sehingga penggunaan oral tidak direkomendasikan karena peningkatan ESO bleeding. Celecoxib juga tidak dapat diberikan pada pasien dengan risiko kardiovaskular. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('0e8d8143-1f0c-4f02-a642-9c4d51e25e40', '9bf60a12-b6b8-43e9-8243-354e8124607e', 'Infliximab adalah inhibitor TNF-alpha (tumor necrosis factor-alpha) yang digunakan untuk pengobatan penyakit autoimun seperti rheumatoid arthritis. Efek samping utama infliximab: Reaksi imunologis: dapat menyebabkan reaksi infus dan pembentukan antibodi terhadap obat. Infeksi oportunistik: infliximab menekan sistem imun, sehingga meningkatkan risiko reaktivasi tuberkulosis laten, infeksi jamur, dan infeksi lainnya. Malignansi: terdapat risiko sedikit meningkat untuk limfoma dan keganasan lainnya. screening TB. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('bd4adeb7-4da9-4d73-856d-739d51403a08', '9c2c33d2-023d-4892-9a61-2b1f0777358f', 'Pasien dengan riwayat gastritis/ulkus peptikum sebaiknya menghindari OAINS non-selektif. Celecoxib merupakan COX-2 selective inhibitor yang lebih aman untuk lambung. Ibuprofen, naproxen, asam mefenamat, dan ketoprofen merupakan OAINS non-selektif yang meningkatkan risiko perdarahan GI.', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('8f005c62-915d-4a2a-9627-3b6109b4ab7e', 'a1755d51-6d19-4bcf-bb8e-6169f001d8ba', 'Penggunaan AINS (NSAID) oral jangka panjang dapat mengiritasi mukosa lambung karena menghambat enzim COX-1 sehingga menurunkan produksi prostaglandin pelindung lambung. Hal ini menyebabkan keluhan nyeri ulu hati dan mual. Untuk mengurangi efek samping gastrointestinal tanpa menghilangkan manfaat analgesik, terapi dapat dialihkan ke NSAID topikal yang memberikan efek lokal dengan risiko sistemik lebih rendah. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('aad63846-e529-4bae-a6e6-73659de30d2d', 'a196ef74-ed4e-42d6-8664-4e43decbc027', 'Obat terapi untuk menurunkan kadar asam urat terbagi menjadi 2 kelompok yaitu inhibitor xantin oksidase (allopurinol dan febuxostat) dan kelompok urikosurik (probenecid). Allopurinol bekerja dengan menurunkan pembentukkan asam urat sedangkan probenecid merupakan agen urikosurik yang bekerja meningkatkan ekskresi asam urat dalam tubuh. Sumber: Pedoman Diagnosis dan Tatalaksana Hiperurisemia & Artritis Gout. Perhimpunan Reumatologi Indonesia. 2024', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('381fb506-62d9-462f-8fa7-8d41eb9677a2', 'a7d8a45e-1312-4ebd-888e-3eaf71d73f87', 'Sulfasalazin merupakan turunan 5-aminosalisilat (5-ASA) yang bekerja dengan menekan inflamasi pada mukosa kolon. Obat ini digunakan sebagai terapi lini pertama pada colitis ulseratif ringan sampai sedang, serta sebagai terapi pemeliharaan remisi. Pada kasus berat, sulfasalazin hanya bersifat tambahan dan tidak menjadi terapi utama. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('72a9c160-48a4-4ed8-916b-011efa4b1398', 'ab7d305b-cc83-448b-8668-3d2fbdca6a4c', 'Vitamin D meningkatkan penyerapan kalsium di usus dan retensi di ginjal sehingga meningkatkan kadar kalsium dalam serum; menurunkan kadar fosfatase serum yang berlebihan, kadar hormon paratiroid, dan menurunkan resorpsi tulang; meningkatkan resorpsi fosfat tubulus ginjal. Sehingga kadar kalsium dalam darah tetap optimal untuk mineralisasi tulang. Mineralisasi yang baik mencegah kerapuhan tulang dan mendukung efek terapi Alendronat, yang bekerja menghambat resorpsi tulang oleh osteoklas. Referensi: DiPiro, J. T., et al. (2023). Pharmacotherapy: A Pathophysiologic Approach, 12th Edition. McGraw-Hill Education', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('763f2812-e81b-44d1-ba68-6eb770c41738', 'af926821-52e0-4e63-ad53-c218f961dc5d', 'Glukosamin dan chondroitin sulfate, merupakan nutraseutikal yang memberikan efek paling bermakna dalam terapi OA. Glukosamin merupakan suatu amino monosakarida larut air yang merupakan prekursor untuk sintesis protein terglikosilasi dan lemak (Sherman et al., 2012). Salah satu peran fisiologis utama dari glukosamin adalah stimulasi sintesis senyawa-senyawa yang dibutuhkan untuk fungsi persendian. Glukosamin mampu menstimulasi sintesis proteoglikan, menghambat degradasi proteoglikan, serta menstimulasi regenerasi tulang rawan setelah terjadi kerusakan (Kelly, 1998). Glucosamine sulphate, baik digunakan tunggal maupun kombinasi dengan chondroitin sulphate menunjukkan perbaikan bermakna pada regenerasi tulang rawan (Kamarul et al., 2011). Referensi: Kamarul, K., Ab-Rahim, S., Tumin, M., Selvaratnam, L. dan Ahmad, T.S., 2011. A preliminary study of the effects of glucosamine sulphate and chondroitin sulphate on surgically treated and untreated focal cartilage damage. European Cells and Materials, 21: 259-271.', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('5e1ef10a-e986-4ea3-8293-d38d7b1f0dc8', 'b20886a5-15a3-4af0-8137-9af68c312410', 'Alendronat (Bisfosfonat): Alendronat adalah bisfosfonat yang bekerja dengan menghambat aktivitas osteoklas, yaitu sel yang bertanggung jawab atas resorpsi (penghancuran) tulang. Dengan menurunnya aktivitas osteoklas, turnover tulang berkurang, sehingga kehilangan massa tulang melambat dan kepadatan mineral tulang (BMD) meningkat. Alendronat tidak meningkatkan aktivitas osteoblas, melainkan hanya mengurangi resorpsi tulang. Kalsium (Suplemen Mineral): Kalsium merupakan komponen utama dalam pembentukan dan mineralisasi tulang. Kalsium tidak memiliki efek langsung terhadap osteoklas, tetapi diperlukan untuk mendukung fungsi osteoblas dalam proses pembentukan tulang. Asupan kalsium yang cukup penting untuk efektivitas bisfosfonat, karena kekurangan kalsium dapat memicu sekresi hormon paratiroid (PTH) yang justru meningkatkan resorpsi tulang. Sumber : Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('c21b8078-ee16-44de-a325-16ad0922ea57', 'b2f3607c-43f3-4598-aa3b-52f7fb50943c', 'Pada soal pasien mengalami penurunan penglihatan, dimana salah satu DMARD yaitu Hidroksiklorokuin memiliki efek samping toksisitas pada retina, yang merupakan efek samping yang khas dari obat tersebut. Sehingga ESO disebabkan oleh Hidroksiklorokuin dan direkomendasikan penggantian DMARD lain pada pasien. Referensi: DiPiro, 12th Ed (2023)', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('f99f52c1-4dac-4652-80ba-4772f2409575', 'b6289752-7d9c-4d76-813e-9ee8a4cc6756', 'Pilihan terapi utama untuk menurunkan kadar asam urat pada pasien dengan gangguan ginjal. Dosis alopurinol harus disesuaikan berdasarkan bersihan kreatinin untuk mencegah toksisitas akibat akumulasi metabolitnya (oksipurinol). Referensi: Perhimpunan Reumatologi Indonesia, 2024', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('6bfbabef-ca07-400b-8732-3c6b7b402369', 'c18c7708-8c0e-4d2b-b2cc-5df466bdc66a', 'Penggunaan NSAID non selektif dan selektif berkaitan dengan peningkatan tekanan darah, kemungkinan disebabkan oleh penghambatan mekanisme kontraregulasi yang bergantung pada prostaglandin dalam pembuluh darah ginjal. Pada suatu penelitian yang membandingkan tekanan darah penggunaan rofecoxib, celecoxib, NSAID non selektif, dan tanpa NSAID, menunjukkan bahwa rofecoxib berkaitan dengan peningkatan risiko hipertensi yang memerlukan pengobatan. Risiko ini semakin meningkat pada pasien yang memiliki penyakit ginjal, penyakit hati, atau gagal jantung kongestif. Referensi: AHA Journal/ Solomon, D.H., dkk., Relationship between COX-2 spesific inhibitor and hypertension. 2004. Hypertension. Page: 140-145.', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('e0e1507e-41ce-44de-9259-58e6662e2abc', 'c4b18062-9001-4e15-846f-8024461892a1', 'Pada artritis reumatoid, salah satu terapi penyakit-modifying antirheumatic drugs (DMARDs) biologik adalah TNF-alpha inhibitor, yang bekerja dengan menghambat sitokin proinflamasi TNF-alpha sehingga menurunkan inflamasi sendi dan progresivitas penyakit. Infliximab merupakan antibodi monoklonal yang secara spesifik memblokir TNF-alpha, sehingga efektif sebagai terapi RA sedang-berat. Sumber: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('15f0d972-5eb2-44b9-b42d-ed8d9a669408', 'c6786b84-1437-4f33-8355-e878462b65e9', 'Pada gout akut yang tidak terkontrol dengan NSAID tunggal, pilihan selanjutnya adalah menambahkan kolkisin atau kortikosteroid, bukan mengganti NSAID dengan NSAID lain atau memulai terapi penurun asam urat. Oleh karena itu, jawaban yang paling tepat adalah C (Menambahkan kolkisin). C (Menambahkan kolkisin): Benar. Pedoman Gout Indonesia 2018 dan ACR 2020 merekomendasikan kombinasi NSAID + kolkisin atau NSAID + kortikosteroid jika monoterapi gagal mengontrol nyeri. Kolkisin dapat digunakan jika tidak ada kontraindikasi. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed. Perhimpunan Reumatologi Indonesia. (2018). Pedoman Diagnosis dan Pengelolaan Gout di Indonesia; FitzGerald, J. D., et al. (2020). "2020 American College of Rheumatology Guideline for the Management of Gout." Arthritis & Rheumatology, 72(6), 879-895', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('b43c5073-c2ae-4932-b1be-25f12324cc5f', 'c969b368-b398-407e-a5e6-4a8b3c0e4ed2', 'Prednison merupakan kortikosteroid sistemik yang bila digunakan jangka panjang dapat menyebabkan penurunan massa tulang, osteoporosis, dan peningkatan risiko fraktur patologis. Pada pasien usia lanjut yang sudah mengalami osteoporosis dan patah tulang panggul, penggunaan prednison justru memperberat kerusakan tulang sehingga perlu dihentikan bila tidak ada indikasi kuat. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('08111142-a8ca-4bad-920c-2b972424fb12', 'ddccae6b-309c-4e2c-8f48-52d9060cea03', 'Natrium ibandronat adalah bisfosfonat yang digunakan untuk mengobati osteoporosis pascamenopause. Seperti bisfosfonat lainnya, obat ini memiliki aturan penggunaan yang ketat untuk mengoptimalkan absorpsi dan mencegah efek samping seperti iritasi esofagus. C (Dikonsumsi sebelum makan dengan segelas air putih dan tetap tegak 30-60 menit) = BENAR Natrium ibandronat harus diminum di pagi hari saat perut kosong dengan segelas penuh air putih (minimal 180 mL). Pasien harus tetap dalam posisi tegak (duduk atau berdiri) selama 30-60 menit setelah minum obat untuk mencegah iritasi esofagus. Makanan dan minuman selain air putih tidak boleh dikonsumsi selama minimal 60 menit setelah minum obat untuk memastikan absorpsi optimal. Sumber: Drug Information Handbook (DIH). Ibandronate Sodium Monograph. Lexi-Comp, Inc.', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('04893127-4937-4931-bd73-ea6c111f8244', 'e5a0fa91-7df4-46ac-8876-f1dd8db80dfa', 'Pada pasien osteoarthritis, dapat mengalami kekurangan asam hyaluronat, maka dari itu membutuhkan obat lubrikan untuk sendi, yaitu Asam hyaluronat sebagai pelumas sendi. Asam hyaluronat bekerja dengan mengembalikan viskoelastisitas dan memberi perlindungan bagi articular cartilage dan jaringan pada permukaan sendi. Glukosamin dan kondroitin digunakan sebagai suplemen. Glukosamin bekerja dengan memperlambat progresivitas perubahan struktur sendi pada OA lutut. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('55a70837-28bd-4c85-b03f-3df1f7816093', 'f04bd7e0-a658-4cef-9861-8569ab593b9f', 'Tatalaksana antinyeri sesuai dengan skala berikut. Nyeri ringan: analgesik non-opioid seperti NSAID atau paracetamol + antinyeri adjuvan. Nyeri sedang: opioid ringan (kodein/tramadol) + analgesik non-opioid + antinyeri adjuvan. Nyeri berat: opioid kuat (morfin, metadon, fentanil) + analgesik non-opioid + antinyeri adjuvan. Treatment dengan atau tanpa antinyeri. Sumber: Anekar AA, Hendrix JM, Cascella M. WHO Analgesic Ladder. [Updated 2023 Apr 23]. In: StatPearls [Internet]. Treasure Island (FL): StatPearls Publishing; 2025 Jan-.', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('5e1c4a02-9599-4352-921f-ec7829964987', 'f19d0162-50e5-40e5-aee9-efd0b791e757', 'Data penggunaan urate-lowering therapy pada kehamilan memang terbatas. Allopurinol dan febuxostat umumnya dihindari atau hanya dipertimbangkan bila manfaat jelas melebihi risiko. Di antara opsi yang tersedia, probenecid adalah pilihan yang paling defensible karena ada laporan penggunaan pada kehamilan tanpa sinyal kuat toksisitas janin, walau keputusan tetap harus individual dan diawasi dokter. Referensi: NHS/BUMPS information on allopurinol in pregnancy; Drugs.com pregnancy monograph for probenecid.', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('9b8b9a35-d0f6-484d-9589-3b349e2f0ddc', 'f51f0333-a334-4de8-8d4a-a9b946b357df', 'Pada Pasien OA dengan PUD, direkomendasikan NSAID selektif seperti Celecoxib, dibandingkan dengan NSAID non selektif seperti Ibuprofen, Meloksikam. NSAID selektif menghambat COX 2 dan tidak menghambat pelindung mukosa lambung. Sumber: Dipiro 12th Ed (2023)', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('f65f7541-507c-400d-9789-8fb98b23a32d', 'f940aeb5-f163-4f8c-8630-2dba757fe02d', 'Ibuprofen merupakan NSAID yang memiliki efek sebagai analgesik dan antiinflamasi. Dosis 400 mg 2 kali sehari sudah tepat sesuai indikasi sebagai analgesik dan antiinflamasi. Penggunaan asam mefenamat 250 mg terlalu low dose pada pasien dewasa 33 tahun. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

insert into public.question_explanations (id, question_id, explanation, explanation_source)
values ('e073d1cb-949a-4703-acbb-e6682417790b', 'fa618424-5ed0-4cf6-b8bc-71759ea62bd3', 'Tatalaksana terapi untuk penanganan osteoatritis adalah paracetamol maks 4g/hari. Referensi: Dipiro et al, 2023, Pharmacotherapy a Pathophysiologic Approach 12th ed', 'upload_original')
on conflict (id) do update
set question_id = excluded.question_id,
    explanation = excluded.explanation,
    explanation_source = excluded.explanation_source;

commit;
