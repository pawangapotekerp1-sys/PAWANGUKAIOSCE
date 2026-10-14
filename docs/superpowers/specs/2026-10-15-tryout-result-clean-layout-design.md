# Design Spec: Clean Tryout Result Page Layout

## 1. Problem Statement
Pengguna ingin menyederhanakan tampilan halaman hasil try out (`/app/tryout/result`):
1. Menghapus judul dan subjudul di bagian atas ("Hasil try out" dan "Skor akhir, hasil per blok, dan akses pembahasan.").
2. Menghapus seluruh kartu "Analisis Performa Per Blok" di bagian bawah.
3. Tetap mempertahankan tombol navigasi kembali `← Kembali ke Pilihan Try Out`, Hero Performance Card (Skor, Status Kelulusan, Insight, Tombol Review Jawaban & Coba Lagi), dan 4-Grid Metrik Cepat.

## 2. Layout & UI Specifications

### A. Komponen Target: `src/pages/app/tryout-result-page.tsx`
1. **Navigasi Atas**:
   - Menghapus `<SectionHeading title="Hasil try out" description="Skor akhir, hasil per blok, dan akses pembahasan." />`.
   - Mempertahankan `<Link data-testid="btn-back-to-tryout" to="/app/tryout-selection" ...><ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Pilihan Try Out</Link>`.
2. **Hero Performance Card**:
   - Status kelulusan berbasis skor (≥ 68).
   - Nilai skor akhir besar.
   - Ringkasan soal benar dari total soal.
   - Kotak insight materi terlemah.
   - Tombol utama "Review jawaban" (high contrast primary button) dan tombol sekunder "Coba Try Out Baru" (outline button).
3. **4-Grid Metrik Cepat**:
   - 4 Card statistik: `Jawaban Benar`, `Jawaban Salah`, `Tidak Dijawab`, `Waktu Terpakai`.
4. **Penghapusan Bagian Bawah**:
   - Menghapus blok `{/* 3. Block Performance Analysis */}` dan seluruh Card `Analisis Performa Per Blok`.
   - Membersihkan import yang tidak terpakai lagi (seperti `SectionHeading`).

### B. Testing: `src/pages/app/tryout-result-page.test.tsx`
- Menghapus assertion yang mencari teks "Hasil try out", "Skor akhir, hasil per blok, dan akses pembahasan.", dan "Analisis Performa Per Blok".
- Memastikan pengujian tetap memvalidasi tombol kembali, skor akhir, status kelulusan, tombol CTA review jawaban, 4-grid metrik, serta penanganan kasus edge case (tied wrong counts, all correct, loading, error, empty).

## 3. Verification
- `npm test -- src/pages/app/tryout-result-page.test.tsx --run`
- `npx tsc --noEmit`
- `npm run build`
