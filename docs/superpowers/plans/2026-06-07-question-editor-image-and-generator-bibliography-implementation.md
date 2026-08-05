# Question Editor Image Placement And Generator Bibliography Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memindahkan input gambar pertanyaan ke bawah stem soal di dua editor, dan mengubah Question Generator agar input referensi bebas pustaka sementara output tetap traceable.

**Architecture:** Perubahan dibagi menjadi dua jalur. Jalur pertama hanya menyentuh urutan render UI di editor soal. Jalur kedua memisahkan aturan validasi pustaka input referensi dari aturan validasi pustaka output generator, supaya kebutuhan bisnis baru tercermin tanpa mengendurkan kualitas hasil generate.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Supabase Edge Function helpers

---

## Chunk 1: UI order and generator contracts

### Task 1: Capture editor field order in tests

**Files:**
- Modify: `src/pages/admin/question-editor-page.test.tsx`
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add assertions that `Gambar pertanyaan` appears in DOM order after `Pertanyaan` and before `Opsi A`.

- [ ] **Step 2: Run tests to verify they fail**

Run:
`npm test -- src/pages/admin/question-editor-page.test.tsx src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`

Expected: order assertions fail on current layout.

- [ ] **Step 3: Write minimal implementation**

Reorder the question-image block in both editor pages without changing upload logic.

- [ ] **Step 4: Run tests to verify they pass**

Run the same command and confirm both suites pass.

### Task 2: Capture new bibliography behavior in tests

**Files:**
- Modify: `src/components/question-generator/reference-question-form.test.tsx`
- Modify: `supabase/functions/question-generator/index.test.ts`
- Modify: `supabase/functions/_shared/question-generator.test.ts`

- [ ] **Step 1: Write the failing tests**

Add coverage for:
- relaxed input guidance text,
- accepting reference input without bibliography,
- accepting reference input with non-traceable book-style bibliography,
- still rejecting generated output without traceable bibliography,
- allowing paraphrase output to pass with its own traceable bibliography when references have none.

- [ ] **Step 2: Run tests to verify they fail**

Run:
`npm test -- src/components/question-generator/reference-question-form.test.tsx supabase/functions/question-generator/index.test.ts supabase/functions/_shared/question-generator.test.ts`

Expected: assertions fail because current logic still requires traceable bibliography on input.

- [ ] **Step 3: Write minimal implementation**

Adjust UI copy and backend/shared validation logic to separate input and output requirements.

- [ ] **Step 4: Run tests to verify they pass**

Run the same command and confirm all updated suites pass.

## Chunk 2: Final verification

### Task 3: Run targeted regression verification

**Files:**
- Modify: `src/pages/admin/question-editor-page.tsx`
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
- Modify: `src/components/question-generator/reference-question-form.tsx`
- Modify: `supabase/functions/question-generator/handler.ts`
- Modify: `supabase/functions/_shared/question-generator.ts`

- [ ] **Step 1: Run all touched targeted tests**

Run:
`npm test -- src/pages/admin/question-editor-page.test.tsx src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx src/components/question-generator/reference-question-form.test.tsx supabase/functions/question-generator/index.test.ts supabase/functions/_shared/question-generator.test.ts`

- [ ] **Step 2: Run build-level sanity check**

Run:
`npm run build`

- [ ] **Step 3: Summarize diffs and residual risks**

Document whether any untouched generator review flows still assume bibliography presence.
