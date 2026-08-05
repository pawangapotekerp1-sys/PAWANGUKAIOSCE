# Dashboard Batch 1 UI Improvement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperkuat visual hierarchy, meringankan density mobile, dan memperjelas next action pada dashboard utama tanpa mengubah logic, API, routing, atau behavior fitur.

**Architecture:** Fokus perubahan hanya pada surface UI dashboard student app yang saat ini diekspor melalui `src/pages/dashboard-page.tsx` dan diimplementasikan di `src/pages/app/dashboard-page.tsx`. Pendekatan dilakukan bertahap: kunci dulu kontrak test untuk hierarchy baru, lalu rapikan header, section grouping, CTA priority, dan density kartu dengan tetap memakai primitive UI yang sudah ada (`SurfacePanel`, `SectionHeading`, `MetricPill`, `Button`).

**Tech Stack:** React, TypeScript, React Router, TanStack Query, Vitest, Testing Library, Tailwind utility classes, reusable UI primitives internal.

---

## Chunk 1: Scope dan Struktur File

### File Map

**Files:**
- Modify: `src/pages/app/dashboard-page.tsx`
- Modify: `src/pages/app/dashboard-page.test.tsx`
- Reference only: `src/pages/dashboard-page.tsx`
- Reference only: `src/pages/dashboard-page.test.tsx`
- Reference only: `src/components/ui/section-heading.tsx`
- Reference only: `src/components/ui/surface-panel.tsx`
- Reference only: `src/components/ui/metric-pill.tsx`
- Reference only: `src/components/ui/button.tsx`

**Responsibilities:**
- `src/pages/app/dashboard-page.tsx`
  Halaman utama yang akan diringankan hierarchy-nya, dipadatkan ulang untuk mobile, dan diperjelas CTA utamanya.
- `src/pages/app/dashboard-page.test.tsx`
  Kontrak perilaku UI utama dashboard app. Di file ini kita tambahkan/ubah ekspektasi untuk hierarchy, CTA, dan layout copy yang baru.
- `src/pages/dashboard-page.tsx`
  Hanya re-export. Tidak perlu diubah kecuali struktur export berubah, yang tidak direncanakan pada batch ini.
- `src/pages/dashboard-page.test.tsx`
  Kontrak compat lama untuk wrapper route. Hanya disentuh bila perubahan copy/heading membuat kontrak route-level ikut berubah.

---

## Chunk 2: Target UX Batch 1

### Masalah yang Diselesaikan

- Header dashboard masih cukup datar; judul, eyebrow, dan CTA belum terasa bertingkat kuat.
- Terlalu banyak section dengan bobot visual setara sehingga sulit tahu “mulai dari mana”.
- Grid awal berisi kartu metrik + insight belum cukup ringan di mobile.
- Section “Try Out Besar”, “Blok terlemah”, “Target hari ini”, “Tren”, “Riwayat”, dan “Antrian” masih terasa sama pentingnya secara visual.
- CTA penting tersebar; “Mulai sesi baru” sudah benar jadi primary, tapi section lain masih belum cukup memandu prioritas alur belajar.
- Copy sudah lebih baik dari sebelumnya, tetapi masih bisa dipadatkan tanpa menghilangkan informasi penting.

### Hasil yang Diinginkan

- Hero/header terasa lebih jelas: konteks, headline, dan 2 CTA utama langsung terbaca.
- Urutan baca dashboard menjadi:
  1. ringkasan utama
  2. insight prioritas
  3. next action belajar
  4. supporting history/trend
- Mobile lebih ringan dengan density kartu yang lebih terkendali.
- Hanya 1 CTA paling dominan per blok besar.
- Section sekunder seperti riwayat dan antrean terasa pendukung, bukan pesaing hero.

---

## Chunk 3: Task Breakdown

### Task 1: Kunci kontrak hierarchy dashboard lewat test

**Files:**
- Modify: `src/pages/app/dashboard-page.test.tsx`
- Test: `src/pages/app/dashboard-page.test.tsx`

- [ ] **Step 1: Tambahkan ekspektasi test untuk hierarchy baru**

Tambahkan kontrak untuk:
- heading hero utama tetap terlihat jelas
- CTA primary utama tetap hanya `Mulai sesi baru`
- section “Ringkasan Hari Ini” tetap muncul sebagai blok awal
- section pendukung seperti riwayat/antrian tetap ada tetapi tidak menjadi heading pertama

- [ ] **Step 2: Jalankan test dashboard untuk memastikan ekspektasi baru gagal bila UI belum diubah**

Run:
```bash
npx vitest run src/pages/app/dashboard-page.test.tsx
```

Expected:
- ada assertion gagal yang menunjukkan hierarchy baru belum terpenuhi

- [ ] **Step 3: Update test copy yang memang perlu dipadatkan**

Pertahankan hanya copy yang memang bagian dari kontrak UX penting:
- hero title
- CTA utama
- heading section besar
- state loading/empty/error

- [ ] **Step 4: Jalankan ulang test dashboard**

Run:
```bash
npx vitest run src/pages/app/dashboard-page.test.tsx
```

Expected:
- masih ada failure sampai implementasi UI selesai

- [ ] **Step 5: Commit setelah kontrak test siap**

```bash
git add src/pages/app/dashboard-page.test.tsx
git commit -m "test: lock dashboard hierarchy contract"
```

### Task 2: Rapikan hero dashboard dan prioritas CTA

**Files:**
- Modify: `src/pages/app/dashboard-page.tsx`
- Test: `src/pages/app/dashboard-page.test.tsx`

- [ ] **Step 1: Susun ulang header hero agar hierarchy lebih tegas**

Implementasi minimum:
- pertahankan eyebrow
- perjelas jarak antara eyebrow, title, dan action row
- jaga `Mulai sesi baru` tetap paling dominan
- `Lihat hasil terakhir` tetap secondary/outline
- cek agar mobile tidak terasa penuh

- [ ] **Step 2: Jalankan test dashboard**

Run:
```bash
npx vitest run src/pages/app/dashboard-page.test.tsx
```

Expected:
- test terkait CTA dan heading pass

- [ ] **Step 3: Cek build lokal area ini**

Run:
```bash
npx vitest run src/pages/app/dashboard-page.test.tsx src/pages/dashboard-page.test.tsx
```

Expected:
- kedua file pass

- [ ] **Step 4: Commit perubahan hero**

```bash
git add src/pages/app/dashboard-page.tsx src/pages/app/dashboard-page.test.tsx src/pages/dashboard-page.test.tsx
git commit -m "feat: strengthen dashboard hero hierarchy"
```

### Task 3: Ringankan blok ringkasan utama dan insight

**Files:**
- Modify: `src/pages/app/dashboard-page.tsx`
- Test: `src/pages/app/dashboard-page.test.tsx`

- [ ] **Step 1: Kurangi persaingan visual antara progress cards dan insight panel**

Implementasi minimum:
- pertahankan 3 progress cards
- buat insight panel terasa sebagai ringkasan prioritas, bukan sekadar kartu keempat
- periksa ukuran teks/value agar tidak terlalu berat di mobile
- rapikan spacing internal kartu

- [ ] **Step 2: Pendekkan copy deskriptif yang terlalu panjang bila perlu**

Hanya ubah copy lokal di halaman bila memang hardcoded di file ini.
Jangan ubah data model, API, atau mapper.

- [ ] **Step 3: Jalankan test dashboard**

Run:
```bash
npx vitest run src/pages/app/dashboard-page.test.tsx
```

Expected:
- seluruh kontrak dashboard utama pass

- [ ] **Step 4: Commit perubahan section ringkasan**

```bash
git add src/pages/app/dashboard-page.tsx src/pages/app/dashboard-page.test.tsx
git commit -m "feat: refine dashboard summary hierarchy"
```

### Task 4: Turunkan bobot visual section sekunder

**Files:**
- Modify: `src/pages/app/dashboard-page.tsx`
- Test: `src/pages/app/dashboard-page.test.tsx`

- [ ] **Step 1: Bedakan blok primary vs supporting**

Fokus:
- `Try Out Besar` dan `Blok terlemah` tetap tinggi prioritas
- `Target hari ini` tetap penting tetapi lebih ringkas
- `Riwayat sesi terakhir` dan `Antrian belajar berikutnya` dibuat lebih tenang secara visual
- `Tren 7 sesi terakhir` tetap informatif tanpa mendominasi halaman

- [ ] **Step 2: Rapikan density mobile**

Fokus:
- jarak vertikal antar section
- ukuran heading section
- padding kartu
- jumlah copy pendukung per kartu

- [ ] **Step 3: Jalankan test dashboard dan shell contract**

Run:
```bash
npx vitest run src/pages/app/dashboard-page.test.tsx src/pages/dashboard-page.test.tsx src/router/app-router.test.tsx
```

Expected:
- semua pass

- [ ] **Step 4: Commit perubahan section sekunder**

```bash
git add src/pages/app/dashboard-page.tsx src/pages/app/dashboard-page.test.tsx src/pages/dashboard-page.test.tsx src/router/app-router.test.tsx
git commit -m "feat: rebalance dashboard supporting sections"
```

### Task 5: Verifikasi akhir Batch 1 dashboard

**Files:**
- Modify: none expected
- Test: `src/pages/app/dashboard-page.test.tsx`

- [ ] **Step 1: Jalankan suite fokus dashboard**

Run:
```bash
npx vitest run --maxWorkers=1 src/pages/app/dashboard-page.test.tsx src/pages/dashboard-page.test.tsx src/components/layout/product-shell.test.tsx src/router/app-router.test.tsx
```

Expected:
- semua pass

- [ ] **Step 2: Jalankan build produksi**

Run:
```bash
corepack pnpm build
```

Expected:
- build sukses

- [ ] **Step 3: Tinjau ulang scope**

Pastikan batch ini:
- tidak menyentuh `subscription-page`
- tidak menyentuh `payments-page`
- tidak mengubah API/data/business logic
- hanya mengubah UI/UX dashboard

- [ ] **Step 4: Commit final batch**

```bash
git add src/pages/app/dashboard-page.tsx src/pages/app/dashboard-page.test.tsx src/pages/dashboard-page.test.tsx src/router/app-router.test.tsx
git commit -m "feat: improve dashboard hierarchy and density"
```

---

## Chunk 4: Guardrails

### Jangan Diubah

- `getDashboardSummary` contract
- `useSession`, `useStudentShell`, `usePreviewRouteState`
- target routing CTA
- behavior loading / empty / error state
- export wrapper `src/pages/dashboard-page.tsx`
- area `payments` dan `subscription`

### Boleh Diubah

- urutan visual dalam section
- padding, gap, heading size, grouping
- emphasis CTA
- copy presentational yang hardcoded di dashboard
- treatment visual untuk kartu, panel, dan section heading

---

## Chunk 5: Verification Notes

- Jika batch besar dashboard terasa flaky saat dijalankan paralel, ulang dengan `--maxWorkers=1`.
- Bila `src/pages/dashboard-page.test.tsx` masih menyimpan kontrak copy lama yang tidak relevan, sederhanakan kontraknya agar hanya memverifikasi wrapper route dan surface utama.
- Jika perubahan visual memunculkan kebutuhan primitive baru, tunda ke batch design-system berikutnya kecuali benar-benar kecil dan reusable.

Plan complete and saved to `docs/superpowers/plans/2026-06-20-dashboard-batch1-ui-improvement.md`. Ready to execute?
