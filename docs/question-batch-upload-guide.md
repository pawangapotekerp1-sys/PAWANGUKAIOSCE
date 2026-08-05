# Panduan Upload Batch Soal

Reset domain soal dummy di production sudah selesai pada 15 Mei 2026. Bank soal, template try out, dan riwayat try out dummy sekarang kosong sehingga kamu bisa mulai mengisi soal asli dari nol tanpa tercampur data lama.

## Format CSV yang diterima backend

Gunakan template ini sebagai titik awal:

- [question-batch-template.csv](/E:/Projek TRY OYT/docs/question-batch-template.csv)

Kolom yang dikenali parser production:

- `question_text` atau `stem`
- `option_a`
- `option_b`
- `option_c`
- `option_d`
- `option_e`
- `correct_answer`
- `explanation`
- `block`
- `topic`

## Aturan penting

- `correct_answer` harus memakai huruf `A`, `B`, `C`, `D`, atau `E`.
- `explanation` sebaiknya selalu diisi. Kalau `correct_answer` dan `explanation` terisi, item masuk sebagai `draft_ready`.
- Kalau `explanation` atau `correct_answer` kosong, item tetap bisa masuk tetapi statusnya menjadi `needs_enrichment`.
- `block` dan `topic` harus cocok dengan nama taxonomy aktif di production. Kalau `topic` tidak cocok, item tetap bisa masuk tetapi akan menunggu enrichment/review.
- Parser menerima 2 nama kolom stem: `question_text` dan `stem`. Saya sarankan tetap pakai `question_text` agar konsisten.

## Nama blok yang valid di production

- `Clinical Science`
- `Pharmaceutical Science`
- `Social, Behavioral, and Administrative`

## Nama topic yang valid di production

### Clinical Science

- `Antiinfeksi, Antivirus dan Antiparasit`
- `Biologi Sel`
- `Endokrin dan Tiroid`
- `Farmakokinetik, Interaksi Obat dan Antidotum`
- `Kardiologi`
- `Mata, Kulit, Tulang dan Sendi`
- `Pernafasan dan Pencernaan`

### Pharmaceutical Science

- `Kimia Dasar dan Kimia Analisis`
- `Konsep Dasar Perhitungan & Konsentrasi`
- `Sediaan Liquid dan Sediaan steril`
- `Sediaan Semi Solid`
- `Sediaan Solid`

### Social, Behavioral, and Administrative

- `Bahan Alam Farmasi`
- `Farmakoekonomi`
- `Pelayanan Farmasi Klinis`
- `Standar Pelayanan Kefarmasian`

## Status sistem setelah reset

Verifikasi terakhir pada 15 Mei 2026 menunjukkan tabel domain dummy sudah kosong:

- `questions`: 0
- `question_options`: 0
- `question_explanations`: 0
- `question_upload_batches`: 0
- `question_upload_items`: 0
- `exam_templates`: 0
- `exam_template_items`: 0
- `attempts`: 0
- `attempt_items`: 0
- `attempt_results`: 0
- `answers`: 0

## Catatan operasional

- Frontend admin yang aktif saat ini belum membuka layar upload batch secara penuh, tetapi backend production untuk `upload-question-batch` sudah aktif.
- Katalog try out student tetap menampilkan Try Out Besar, sesi per blok, dan sesi per materi dari taxonomy aktif meski belum ada sesi yang siap dimulai.
- Tombol `Mulai sesi` baru aktif kalau jumlah soal `published` untuk scope itu sudah cukup dan template try out terkait sudah dipublikasikan.
- Upload soal tidak otomatis membuat template try out baru. Setelah soal siap, admin atau mentor tetap perlu memastikan template scope terkait sudah dipublikasikan.
