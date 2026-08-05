# Questions Batch 2 UI Improvement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperkuat visual hierarchy, mengurangi density kerja, dan memperjelas action flow pada `questions` dan `question-editor` tanpa mengubah API, business logic, routing, atau behavior fitur.

**Architecture:** Batch ini hanya menyentuh surface bank soal dan editor soal yang dipakai admin dan mentor melalui file implementasi yang sama. Pendekatan dilakukan dalam dua blok: pertama, rapikan listing/filter/action di `questions-page`; kedua, rapikan hierarchy form dan action bar di `question-editor-page`, sambil menjaga semua kontrak route dan save behavior tetap sama.

**Tech Stack:** React, TypeScript, React Router, TanStack Query, Vitest, Testing Library, reusable UI primitives internal, Tailwind utility classes.

---

## Chunk 1: Scope dan Struktur File

### File Map

**Files:**
- Modify: `src/pages/admin/questions-page.tsx`
- Modify: `src/pages/admin/questions-page.test.tsx`
- Modify: `src/pages/admin/question-editor-page.tsx`
- Modify: `src/pages/admin/question-editor-page.test.tsx`
- Reference only: `src/router/app-router.test.tsx`
- Reference only: `src/components/ui/button.tsx`
- Reference only: `src/components/ui/state-panel.tsx`
- Reference only: `src/components/ui/surface-panel.tsx`

**Responsibilities:**
- `src/pages/admin/questions-page.tsx`
  Surface daftar soal lintas admin/mentor: heading, filter, bulk action, action hierarchy, dan kartu soal.
- `src/pages/admin/questions-page.test.tsx`
  Kontrak UX listing bank soal: filter, delete flow, CTA utama, dan state empty/error/loading.
- `src/pages/admin/question-editor-page.tsx`
  Surface form editor soal: grouping, hierarchy form, density mobile, preview media, dan action bar.
- `src/pages/admin/question-editor-page.test.tsx`
  Kontrak UX editor: heading, back link, hierarchy field utama, dan save behavior yang tetap sama.

---

## Chunk 2: Target UX Batch 2

### Masalah yang Diselesaikan

- Halaman `Bank Soal` masih terasa administratif dan datar; heading, filter, dan action utama terlalu setara.
- Bulk delete, add question, dan row actions belum membentuk hierarchy yang cukup jelas.
- Card soal cukup padat, terutama saat metadata, stem, dan action tampil bersamaan.
- `Question Editor` masih terasa seperti satu form panjang tanpa penekanan area utama vs sekunder.
- Area media upload, taxonomy, status, dan explanation belum cukup terkelompok sehingga alur input kurang ringan.
- Action bar editor masih fungsional, tetapi belum terasa decisive dan rapi.

### Hasil yang Diinginkan

- `Bank Soal` terasa lebih mudah discan: header jelas, filter terasa sebagai control bar, dan kartu soal lebih ringan.
- `Tambah soal` tetap menjadi CTA paling dominan di listing.
- Bulk delete tetap jelas destructive, tetapi tidak mendominasi halaman saat belum ada selection.
- `Editor Soal` punya hierarchy input yang lebih jelas:
  1. stem soal
  2. opsi jawaban
  3. blok/materi + kunci/status
  4. pembahasan + media
  5. action save/back
- Mobile form lebih enak dipakai dan tidak terasa seperti satu dinding input.

---

## Chunk 3: Task Breakdown

### Task 1: Kunci kontrak hierarchy baru untuk `questions-page`

**Files:**
- Modify: `src/pages/admin/questions-page.test.tsx`
- Test: `src/pages/admin/questions-page.test.tsx`

- [ ] **Step 1: Tambahkan ekspektasi hierarchy listing**

Tambahkan kontrak untuk:
- CTA `Tambah soal` tetap primary
- bulk delete hanya destructive secondary state, bukan action utama halaman
- heading filter dan heading daftar tetap terbaca jelas
- empty state tetap ada dan copy penting tetap dipertahankan

- [ ] **Step 2: Jalankan test untuk memastikan kontrak baru gagal sebelum implementasi**

Run:
```bash
npx vitest run src/pages/admin/questions-page.test.tsx
```

Expected:
- ada failure yang menandakan layout/action hierarchy baru belum terpenuhi

- [ ] **Step 3: Commit kontrak test bila sudah tepat**

```bash
git add src/pages/admin/questions-page.test.tsx
git commit -m "test: lock questions page hierarchy contract"
```

### Task 2: Rapikan hierarchy dan control bar `questions-page`

**Files:**
- Modify: `src/pages/admin/questions-page.tsx`
- Test: `src/pages/admin/questions-page.test.tsx`

- [ ] **Step 1: Rapikan header halaman**

Implementasi minimum:
- heading utama lebih tegas
- deskripsi lebih ringkas
- `Tambah soal` jelas sebagai CTA utama

- [ ] **Step 2: Jadikan filter sebagai control bar yang lebih ringan**

Fokus:
- filter block/topic terasa satu grup
- info selection lebih jelas
- bulk delete tidak terasa mendominasi saat tidak aktif

- [ ] **Step 3: Ringankan kartu daftar soal**

Fokus:
- metadata tidak mengalahkan stem
- action `Edit` dan `Hapus` lebih jelas peran masing-masing
- spacing mobile lebih rapi

- [ ] **Step 4: Jalankan test listing**

Run:
```bash
npx vitest run src/pages/admin/questions-page.test.tsx
```

Expected:
- seluruh test halaman lolos

- [ ] **Step 5: Commit perubahan listing**

```bash
git add src/pages/admin/questions-page.tsx src/pages/admin/questions-page.test.tsx
git commit -m "feat: improve question bank hierarchy and controls"
```

### Task 3: Kunci kontrak hierarchy baru untuk `question-editor-page`

**Files:**
- Modify: `src/pages/admin/question-editor-page.test.tsx`
- Test: `src/pages/admin/question-editor-page.test.tsx`

- [ ] **Step 1: Tambahkan ekspektasi hierarchy editor**

Tambahkan kontrak untuk:
- heading editor tetap jelas
- stem tetap field paling dominan
- action `Simpan soal` tetap primary
- `Kembali ke bank soal` menjadi action sekunder yang lebih tenang
- grouping field media/taxonomy tetap terbaca

- [ ] **Step 2: Jalankan test editor untuk memastikan kontrak baru gagal dulu**

Run:
```bash
npx vitest run src/pages/admin/question-editor-page.test.tsx
```

Expected:
- ada failure sebelum implementasi layout

- [ ] **Step 3: Commit kontrak test editor**

```bash
git add src/pages/admin/question-editor-page.test.tsx
git commit -m "test: lock question editor hierarchy contract"
```

### Task 4: Rapikan form hierarchy dan action bar `question-editor-page`

**Files:**
- Modify: `src/pages/admin/question-editor-page.tsx`
- Test: `src/pages/admin/question-editor-page.test.tsx`

- [ ] **Step 1: Kelompokkan ulang field editor**

Fokus:
- stem soal jadi hero input
- opsi jawaban lebih mudah discan
- taxonomy/status/kunci jadi grup utilitas yang kompak
- pembahasan dan media jadi area pendukung, bukan pesaing stem

- [ ] **Step 2: Rapikan density dan action bar**

Fokus:
- padding field
- ritme antar grup form
- `Simpan soal` tetap primary
- `Kembali ke bank soal` jadi action sekunder yang konsisten dengan button system

- [ ] **Step 3: Pertahankan seluruh behavior save/upload**

Jangan ubah:
- validasi input
- upload media flow
- redirect setelah save
- route admin/mentor

- [ ] **Step 4: Jalankan test editor**

Run:
```bash
npx vitest run src/pages/admin/question-editor-page.test.tsx
```

Expected:
- seluruh test editor pass

- [ ] **Step 5: Commit perubahan editor**

```bash
git add src/pages/admin/question-editor-page.tsx src/pages/admin/question-editor-page.test.tsx
git commit -m "feat: improve question editor hierarchy"
```

### Task 5: Verifikasi akhir Batch 2

**Files:**
- Modify: none expected
- Test: `src/pages/admin/questions-page.test.tsx`

- [ ] **Step 1: Jalankan suite fokus batch 2**

Run:
```bash
npx vitest run --maxWorkers=1 src/pages/admin/questions-page.test.tsx src/pages/admin/question-editor-page.test.tsx src/router/app-router.test.tsx
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
- belum menyentuh `payments-page`
- tidak mengubah API/data/business logic
- hanya memperbaiki UI/UX `questions` dan `question-editor`

- [ ] **Step 4: Commit final batch**

```bash
git add src/pages/admin/questions-page.tsx src/pages/admin/questions-page.test.tsx src/pages/admin/question-editor-page.tsx src/pages/admin/question-editor-page.test.tsx src/router/app-router.test.tsx
git commit -m "feat: improve questions and editor hierarchy"
```

---

## Chunk 4: Guardrails

### Jangan Diubah

- contract `listQuestionBank`, `deleteQuestion`, `deleteQuestions`
- contract `createQuestion`, `updateQuestion`, `uploadQuestionMedia`
- route admin/mentor
- destructive delete behavior
- validation dan redirect setelah save
- area `payments` dan `subscription`

### Boleh Diubah

- hierarchy heading/description
- grouping control bar/filter
- padding, gap, card density
- button variant untuk action yang sama
- copy presentational di surface halaman
- grouping visual field editor

---

## Chunk 5: Verification Notes

- Jika batch terasa berat saat test paralel, ulang dengan `--maxWorkers=1`.
- Jika route-level test ikut gagal karena copy halaman berubah, update hanya expectation presentational yang relevan, jangan ubah behavior routing.
- Jangan membuat primitive baru kecuali benar-benar kecil dan reusable; utamakan menyusun ulang surface dengan komponen yang sudah ada.

Plan complete and saved to `docs/superpowers/plans/2026-06-20-questions-batch2-ui-improvement.md`. Ready to execute?
