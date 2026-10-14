# Design Spec: Tryout Result Page Redesign

## 1. Problem Statement
Halaman hasil try out (`/app/tryout/result`) saat ini memiliki beberapa masalah desain dan fungsionalitas yang mengurangi kegunaan:
1. **Card Distribusi Hasil Tidak Berguna**: Hanya menampilkan daftar teks nama blok dengan angka benar/salah tanpa persentase akurasi, tanpa visual progress bar, dan tanpa evaluasi performa belajar.
2. **Tombol "Review Jawaban" Tidak Terbaca**: Teks tombol dan warna latar tombol bentrok menjadi putih di atas putih sehingga tombol tampak kosong.
3. **Layout & Komposisi Tidak Proporsional**: Menggunakan kartu cyan masif di sisi kiri yang menyisakan ruang kosong besar di bawahnya, kartu metrik kecil terpisah di kanan atas, serta tidak ada navigasi kembali atau tombol aksi sekunder ("Coba Lagi").

## 2. Solusi Desain (/better-ui, /better-colors, /better-layout, /better-interface)

### A. Layout & Struktur Halaman (/better-layout)
- **Top Navigation & Header**:
  - Tombol kembali: `<Link to="/app/tryout-selection" data-testid="btn-back-to-tryout"> ← Kembali ke Pilihan Try Out </Link>`.
  - Judul halaman: `<SectionHeading title="Hasil Try Out" description="Ringkasan skor akhir, analisis performa per blok materi, dan akses pembahasan." />`.
- **Hierarki Konten (Grid Responsif)**:
  - **Baris 1**: **Hero Performance Card** (Skor Akhir, Status Kelulusan, Insight Materi Terlemah, dan Tombol Aksi Utama).
  - **Baris 2**: **4-Grid Metrik Cepat** (Jawaban Benar, Jawaban Salah, Tidak Dijawab, Waktu Pengerjaan & Rata-rata per Soal).
  - **Baris 3**: **Analisis Performa Per Blok Materi** (Visual multi-segment progress bar, persentase akurasi, badge performa, dan statistik soal).

### B. Warna & Kontras (/better-colors)
- **Perbaikan Tombol Review Jawaban**:
  - Menggunakan komponen `Button` / `getButtonStyleProps` dengan varian `primary` yang benar pada kartu berlatar belakang standar `bg-card`, memastikan teks `text-primary-foreground` memiliki kontras rasio WCAG AAA terhadap latar belakangnya.
  - Tombol sekunder: `variant="outline"` untuk aksi "Coba Try Out Baru" (`to="/app/tryout-selection"`).
- **Semantic Status Colors**:
  - Hijau / Emerald (`emerald-600` / `bg-emerald-500/10`): Jawaban Benar, Tingkat Akurasi Baik (≥ 75%), Status Lulus (≥ 68).
  - Merah / Rose (`rose-600` / `bg-rose-500/10`): Jawaban Salah, Perlu Perhatian (< 50%).
  - Amber (`amber-600` / `bg-amber-500/10`): Status Belum Mencapai Target (< 68), Akurasi Cukup (50–74%).
  - Netral Slate (`slate-500` / `bg-muted`): Soal Dilewati / Tidak Dijawab.

### C. Komponen UI Detail (/better-ui)
1. **Hero Performance Card**:
   - Menampilkan skor akhir: `Math.round(resultData.score)`.
   - Badge kelulusan berbasis skor (Passing grade UKMPPAI standar: 68):
     - Skor ≥ 68: `Memenuhi Target Kelulusan (≥ 68)` dengan ikon `CheckCircle2`.
     - Skor < 68: `Belum Mencapai Target Kelulusan (Target ≥ 68)` dengan ikon `AlertCircle`.
   - Ringkasan teks: `{resultData.correctAnswers} dari {totalQuestions} soal terjawab benar pada sesi ini.`
   - Highlight box insight kelemahan: `weakestBlockInsight`.
   - Action buttons bar:
     - `Review Jawaban` (Primary button dengan icon `ArrowRight`, `data-variant="primary"`).
     - `Coba Try Out Baru` (Outline button).
2. **4-Grid Metrik Cepat**:
   - Card 1: **Jawaban Benar** (`resultData.correctAnswers` soal).
   - Card 2: **Jawaban Salah** (`resultData.wrongAnswers` soal).
   - Card 3: **Dilewati / Kosong** (`resultData.unansweredCount` soal).
   - Card 4: **Waktu Pengerjaan** (`formatDurationAsClock(resultData.timeUsedSeconds)` + rata-rata waktu/soal).
3. **Analisis Performa Per Blok Materi**:
   - Menghitung akurasi per blok: `Math.round((item.correct / totalBlock) * 100)%`.
   - Progress bar horizontal 2-warna (atau 3-warna jika ada data kosong):
     - Lebar hijau: `(item.correct / totalBlock) * 100%`.
     - Lebar merah: `(item.wrong / totalBlock) * 100%`.
   - Badge performa:
     - Akurasi ≥ 75%: `Kuasai Baik` (hijau).
     - Akurasi 50–74%: `Cukup` (kuning/amber).
     - Akurasi < 50%: `Perlu Latihan` (merah).
   - Keterangan statistik lengkap: `{item.correct} Benar • {item.wrong} Salah ({totalBlock} Soal)`.

## 3. Kompatibilitas Data & Kontrak API
- Menggunakan data yang sudah disediakan oleh `getAttemptResultPageData({ attemptId })`:
  - `score`, `correctAnswers`, `wrongAnswers`, `unansweredCount`, `timeUsedSeconds`, `blocks` (`blockLabel`, `correct`, `wrong`).
  - Tidak memerlukan perubahan pada skema database atau API endpoint.

## 4. Rencana Pengujian
- File test: `src/pages/app/tryout-result-page.test.tsx`.
- Memastikan semua pengujian existing tetap terpenuhi:
  - Header halaman dan deskripsi tampil.
  - Skor, jawaban benar, waktu, dan insight terlemah terverifikasi.
  - CTA Review jawaban memiliki `data-variant="primary"` dan mengarah ke `/app/review/[attemptId]`.
  - Hierarchy test (Hero panel muncul sebelum detail blok).
- Menambahkan pengujian untuk:
  - Tombol kembali ke `/app/tryout-selection`.
  - 4 kartu metrik (Benar, Salah, Dilewati, Waktu).
  - Visual evaluasi blok materi (badge akurasi dan progress bar).
