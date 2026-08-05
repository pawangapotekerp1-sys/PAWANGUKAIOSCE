# Review Detail Score Summary Design

## Ringkasan

Batch ini menambahkan ringkasan hasil mini pada halaman detail pembahasan di `review-page`, agar mahasiswa tetap melihat konteks performa saat membuka pembahasan sesi lampau. Ringkasan ini berlaku untuk dua sumber review yang sudah ada, yaitu `tryout` biasa dan `try out terjadwal`.

Perubahan yang diinginkan hanya mencakup penambahan context summary di halaman detail review. Tidak ada perubahan pada perhitungan skor, submit flow, route, atau hierarchy daftar riwayat pembahasan.

## Masalah Saat Ini

- Daftar `Riwayat pembahasan` sudah menampilkan skor, benar, dan salah per sesi.
- Saat user membuka detail pembahasan, konteks hasil sesi hilang.
- User bisa membaca soal dan pembahasan, tetapi tidak lagi melihat skor sesi, jumlah benar, jumlah salah, atau waktu submit.
- Akibatnya pembahasan lama terasa terlepas dari performa asli sesi tersebut.

## Tujuan

- Menampilkan ringkasan hasil mini pada halaman detail pembahasan.
- Menjaga agar mahasiswa tetap melihat konteks skor sesi lampau saat membuka review.
- Menerapkan kontrak data yang konsisten untuk `tryout` dan `scheduled`.
- Menambahkan perubahan ini tanpa membuat halaman detail review bergantung pada query riwayat terpisah.

## Di Luar Scope

- Mengubah scoring logic untuk tryout atau scheduled tryout.
- Mengubah halaman result utama (`tryout-result-page` atau `scheduled-tryout-result-page`).
- Mengubah daftar `Riwayat pembahasan` selain penyesuaian test yang diperlukan.
- Menambah metrik baru seperti `unanswered`, `waktu`, atau distribusi blok di halaman detail review.
- Mengubah route review atau source resolution.

## Perilaku Yang Diinginkan

Pada route detail pembahasan:

- `/app/review/:attemptId`
- `/app/review/:attemptId?source=scheduled`

halaman harus menampilkan satu ringkasan mini di atas daftar pembahasan yang memuat:

- `Skor`
- `Jawaban benar`
- `Jawaban salah`
- `Tanggal submit`

Ringkasan ini harus muncul untuk dua sumber:

- review `tryout`
- review `scheduled`

Ringkasan ini tidak menggantikan daftar item pembahasan, hanya memberi konteks sesi sebelum user membaca detail soal.

## Arah Arsitektur

Ringkasan harus menjadi bagian dari kontrak data `review detail`, bukan dihitung di halaman dari query lain.

Alurnya:

1. `review-page` meminta data detail ke `review-api`.
2. `review-api` meneruskan permintaan ke API source yang sesuai (`tryout-api` atau `scheduled-tryout-api`).
3. API source mengembalikan payload detail review yang sudah lengkap:
   - `summary`
   - `items`
4. `review-page` hanya merender payload tersebut.

Pendekatan ini menjaga satu sumber kebenaran untuk detail review dan mencegah mismatch antara daftar riwayat dan halaman detail.

## Kontrak Data

### Review Detail Summary

Kontrak detail review perlu diperluas dengan bentuk summary bersama:

- `title`
- `submittedAt`
- `score`
- `correctAnswers`
- `wrongAnswers`
- `source`

`items` tetap dipertahankan seperti sekarang agar filter dan rendering pembahasan tidak perlu dirombak besar.

### Tryout Review Detail

`getAttemptReviewPageData()` harus mengembalikan:

- metadata attempt/result yang diperlukan untuk summary
- daftar item review yang sudah ada saat ini

Data sumber summary untuk tryout diambil dari data yang memang sudah tersimpan untuk attempt submit, bukan dari hasil turunan di UI.

### Scheduled Review Detail

`getScheduledAttemptReviewPageData()` harus mengembalikan struktur yang sama dengan source `scheduled`.

Kontrak akhir untuk source `scheduled` harus sejajar dengan source `tryout`, supaya `review-page` tidak perlu bercabang dalam merender summary.

## UI Detail Review

### Posisi Ringkasan

Ringkasan mini ditampilkan:

1. di bawah `SectionHeading`
2. di atas filter `Hanya jawaban salah`
3. di atas daftar item pembahasan

Posisi ini menjaga urutan baca:

1. identitas halaman
2. konteks hasil sesi
3. opsi filter
4. detail pembahasan

### Isi Ringkasan

Ringkasan cukup padat dan tidak boleh terasa seperti hero page hasil penuh.

Yang ingin ditegaskan:

- skor sesi berapa
- berapa jawaban benar
- berapa jawaban salah
- kapan sesi itu disubmit

UI ini harus terasa seperti context strip atau mini summary panel, bukan halaman result kedua.

### Formatting

- `score` ditampilkan sebagai angka bulat yang konsisten dengan daftar riwayat.
- `submittedAt` memakai formatter lokal yang sejalan dengan tampilan riwayat pembahasan.
- Jika timestamp tidak valid, fallback text netral harus dipakai tanpa memblokir halaman.

## Error Handling dan Fallback

Perubahan ini tidak boleh membuat halaman detail review gagal total hanya karena field ringkasan tertentu kosong.

Fallback minimum:

- `score`: `0`
- `correctAnswers`: `0`
- `wrongAnswers`: `0`
- `submittedAt`: teks netral seperti `Waktu submit belum tersedia`
- `title`: fallback title yang sudah sesuai source

Jika seluruh detail review memang tidak tersedia, behavior loading/error/empty yang ada sekarang tetap dipertahankan.

## Dampak Ke File

File utama yang direncanakan berubah:

- `src/lib/mappers/tryout-mappers.ts`
- `src/lib/mappers/scheduled-tryout-mappers.ts`
- `src/lib/api/tryout-api.ts`
- `src/lib/api/scheduled-tryout-api.ts`
- `src/lib/api/review-api.ts`
- `src/pages/app/review-page.tsx`

File test yang kemungkinan berubah:

- `src/lib/api/review-api.test.ts`
- `src/lib/api/tryout-api.test.ts`
- `src/lib/api/scheduled-tryout-api.test.ts`
- `src/pages/app/review-page.test.tsx`
- mapper tests terkait bila kontraknya sudah dikunci di sana

## Strategi Testing

Perubahan harus dikunci dari bawah ke atas.

### Mapper Tests

- kontrak `TryoutReviewPageData` memuat `summary` dan `items`
- kontrak `ScheduledTryoutReviewPageData` memuat `summary` dan `items`

### API Tests

- detail review `tryout` mengembalikan summary yang benar
- detail review `scheduled` mengembalikan summary yang benar
- `review-api` tetap memilih source yang benar dan meneruskan payload lengkap

### Page Tests

- halaman detail review `tryout` menampilkan `Skor`, `Jawaban benar`, `Jawaban salah`, dan `Tanggal submit`
- halaman detail review `scheduled` menampilkan ringkasan yang sama
- filter `Hanya jawaban salah` tetap bekerja dan tidak menyembunyikan panel summary
- state loading, error, dan empty tidak berubah behavior-nya

## Kriteria Selesai

Batch ini dianggap selesai jika:

- halaman detail pembahasan menampilkan ringkasan mini hasil sesi
- ringkasan itu muncul untuk `tryout` dan `scheduled`
- kontrak data detail review punya struktur yang konsisten lintas source
- `review-page` tidak perlu mengambil query riwayat tambahan untuk merender ringkasan
- filter wrong-only tetap stabil
- test terkait pass
- build tetap hijau
