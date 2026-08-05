# Question Editor Image Placement And Generator Bibliography Design

**Context**

Admin dan mentor memakai dua editor soal berbeda: bank soal manual dan event try out terjadwal. Keduanya saat ini menaruh input `Gambar pertanyaan` di bawah `Pembahasan teks`, padahal pengguna ingin media pertanyaan berada dekat dengan stem soal, sebelum area opsi.

Question Generator juga masih memperlakukan referensi input seolah-olah wajib membawa pustaka yang bisa ditelusuri. Kebutuhan yang disetujui adalah pendekatan C:
- referensi input boleh tanpa pustaka,
- referensi input boleh membawa pustaka buku atau sitasi non-link,
- output hasil generate tetap wajib punya pustaka yang traceable,
- bila referensi memang punya pustaka traceable, output parafrase boleh mewarisinya.

**Approved Behavior**

1. Bank soal manual:
- `Gambar pertanyaan` dipindah ke bawah textarea `Pertanyaan`.
- Posisi baru berada sebelum blok `Opsi A-E`.
- Alur upload, preview, dan simpan tidak berubah.

2. Event try out terjadwal:
- Untuk setiap soal, `Gambar pertanyaan` dipindah ke bawah textarea stem soal.
- Posisi baru berada sebelum blok `Opsi A-E`.
- Alur upload, preview, autosave, dan simpan tidak berubah.

3. Question Generator input:
- Referensi tetap wajib punya stem, opsi lengkap, correct option, dan pembahasan.
- `Pustaka` pada input menjadi opsional.
- Bila input menyertakan pustaka non-traceable seperti buku atau sitasi bebas, input tetap diterima.

4. Question Generator output:
- Semua output generated item tetap wajib punya pustaka traceable.
- `copy_concept` tetap harus mengandung pustaka traceable.
- `paraphrase` boleh memakai ulang pustaka traceable dari referensi bila tersedia.
- Bila referensi tidak punya pustaka traceable, `paraphrase` tetap valid selama output-nya sendiri memiliki pustaka traceable.

**Implementation Shape**

- Ubah urutan layout di editor bank soal manual pada `src/pages/admin/question-editor-page.tsx`.
- Ubah urutan layout di editor scheduled event pada `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`.
- Longgarkan copy UI referensi generator pada `src/components/question-generator/reference-question-form.tsx`.
- Longgarkan validasi input referensi di `supabase/functions/question-generator/handler.ts`.
- Sesuaikan validasi output generated item di `supabase/functions/_shared/question-generator.ts`.
- Update test unit/UI untuk menangkap urutan field baru dan aturan pustaka yang baru.

**Risk Notes**

- Reorder DOM dapat memecahkan test yang mengandalkan urutan node.
- Relaksasi validasi input tidak boleh ikut melonggarkan validasi output.
- Aturan reuse pustaka parafrase harus tetap kompatibel dengan referensi lama yang sudah memiliki DOI/URL/ISBN.
