# Design Spec: Review Pembahasan Leaderboard-Style Filter & Uniform Card Redesign

## 1. Overview & Goals

Halaman **Review Pembahasan** (`/app/review`) saat ini menampilkan seluruh riwayat pengerjaan try out dalam satu daftar panjang tanpa opsi pemfilteran per kategori ujian. 

Tujuan dari pembaruan ini adalah:
1. Menyediakan filter per jenis ujian dengan gaya visual **Leaderboard** (pill buttons rounded berwarna cyan/teal untuk tab aktif dan outline untuk tab tidak aktif).
2. Menyediakan 5 kategori filter spesifik:
   - **Try Out All Blok** (default aktif)
   - **Try Out Blok CS** (Clinical Science)
   - **Try Out Blok PS** (Pharmaceutical Science)
   - **Try Out Blok SBA** (Social, Behavioral & Administrative Pharmacy)
   - **Try Out Terjadwal** (Scheduled Try Out)
3. Mengubah tampilan kartu (list card) riwayat pengerjaan agar mengadopsi layout horizontal mirip Leaderboard, namun dengan **warna kartu yang seragam** (tidak menggunakan gradien ranking emas/perak/perunggu seperti di leaderboard kompetitif).
4. Memastikan sesi ujian yang **paling baru dikerjakan selalu berada di urutan paling atas** (sort descending berdasarkan `submittedAt`).

---

## 2. User Experience & Visual Design

### 2.1 Filter Bar (Pill Tabs)
- Terletak tepat di atas daftar riwayat pengerjaan.
- Berada di dalam kontainer bergaris bawah halus (`border-b border-border/20 pb-3 flex flex-wrap items-center gap-2`).
- Terdiri dari 5 opsi tombol pil:
  ```ts
  export type ReviewFilterCategory =
    | "all_blok"
    | "blok_cs"
    | "blok_ps"
    | "blok_sba"
    | "terjadwal";

  export const REVIEW_CATEGORY_OPTIONS = [
    { id: "all_blok", label: "Try Out All Blok" },
    { id: "blok_cs", label: "Try Out Blok CS" },
    { id: "blok_ps", label: "Try Out Blok PS" },
    { id: "blok_sba", label: "Try Out Blok SBA" },
    { id: "terjadwal", label: "Try Out Terjadwal" },
  ] as const;
  ```
- **Styling tombol:**
  - Aktif: `rounded-full px-5 py-2 text-xs font-semibold variant="primary" shadow-md shadow-primary/20`
  - Inaktif: `rounded-full px-5 py-2 text-xs font-semibold variant="outline" hover:bg-accent`

### 2.2 List Card Riwayat Seragam (Uniform Leaderboard-Style)
Mengadopsi struktur grid horizontal ringkas yang mirip dengan baris Leaderboard (`Card` dengan `hover:-translate-y-0.5 hover:shadow-lg transition-all`):
- **Warna Card:** Seragam menggunakan `border-border/80 bg-card hover:border-primary/40`.
- **Kolom Kiri:**
  - Kotak ikon seragam berukuran `h-14 w-14 rounded-2xl border bg-primary/10 text-primary border-primary/20 shrink-0` dengan ikon `BookOpenCheck`.
  - Judul try out (`text-lg font-extrabold tracking-tight text-foreground`).
  - Waktu selesai pengerjaan dengan ikon `Calendar` (`text-xs font-semibold text-muted-foreground flex items-center gap-1.5`).
- **Kolom Kanan:**
  - Badge Skor: `variant="outline"` warna primary (`Skor {score}`).
  - Badge Benar/Salah: `33 Benar • 7 Salah`.
  - Tombol aksi: `Buka pembahasan` dengan ikon `ArrowRight`.

### 2.3 Empty State
Jika kategori yang dipilih belum memiliki riwayat:
- Menampilkan komponen `Alert` info:
  - Judul: `Belum ada hasil untuk {categoryLabel}`
  - Deskripsi: `Selesaikan try out pada kategori ini untuk melihat pembahasannya di sini.`

---

## 3. Data Architecture & Categorization Logic

### 3.1 Tryout History API Enriched
Dalam `src/lib/api/tryout-api.ts`:
- Perbarui query `listSubmittedAttemptHistory`:
  ```sql
  select
    id,
    submitted_at,
    exam_template:exam_templates(
      title,
      mode,
      block_id,
      block:blocks(name, slug)
    ),
    attempt_result:attempt_results(score, correct_answers, wrong_answers)
  ```
- Model `SubmittedAttemptHistoryItem` diperkaya dengan field:
  - `mode?: "full" | "block" | "topic" | null`
  - `blockSlug?: string | null`
  - `blockName?: string | null`

### 3.2 Review History Item Categorization
Dalam `src/lib/api/review-api.ts`:
Setiap item pada `ReviewHistoryItem` dipetakan ke field `category: ReviewFilterCategory`:
1. Jika `source === "scheduled"` $\rightarrow$ `"terjadwal"`
2. Jika `mode === "full"` atau judul memuat kata `"besar"` / `"all blok"` $\rightarrow$ `"all_blok"`
3. Jika blok adalah Clinical Science (`blockSlug === "clinical-science"` atau judul/nama blok memuat `"clinical science"`) $\rightarrow$ `"blok_cs"`
4. Jika blok adalah Pharmaceutical Science (`blockSlug === "pharmaceutical-science"` atau judul/nama blok memuat `"pharmaceutical science"`) $\rightarrow$ `"blok_ps"`
5. Jika blok adalah SBA (`blockSlug === "social-behavior-administrative-pharmacy"` atau judul/nama blok memuat `"social"` / `"sba"`) $\rightarrow$ `"blok_sba"`
6. Fallback: jika tidak masuk kategori di atas tapi tipe full, masuk ke `"all_blok"`.

### 3.3 Sorting: Terbaru di Paling Atas
Hasil gabungan seluruh riwayat diurutkan berdasarkan waktu pengerjaan terbaru (`submittedAt` descending):
```ts
items.sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime());
```
Sehingga saat filter kategori diaplikasikan, riwayat teranyar untuk kategori tersebut dijamin selalu berada di posisi paling atas.

---

## 4. Testing Strategy

1. **Unit Test API (`src/lib/api/review-api.test.ts`):**
   - Menguji pengelompokan kategori yang tepat (`all_blok`, `blok_cs`, `blok_ps`, `blok_sba`, `terjadwal`).
   - Menguji urutan pengembalian data selalu terbaru di paling atas (`submittedAt` descending).

2. **Component Test UI (`src/pages/app/review-page.test.tsx`):**
   - Memverifikasi render ke-5 tombol pill filter.
   - Memverifikasi default filter aktif adalah `"Try Out All Blok"`.
   - Menguji interaksi klik perpindahan tab filter (misal klik "Try Out Blok CS" menyaring hanya riwayat CS).
   - Memverifikasi riwayat yang tampil terurut dari yang paling baru ke yang lebih lama.
   - Menguji tampilan empty state saat filter tidak memiliki item yang sesuai.
