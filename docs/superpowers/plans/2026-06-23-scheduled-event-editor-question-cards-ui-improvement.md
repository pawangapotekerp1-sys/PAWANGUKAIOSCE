# Scheduled Event Editor Question Cards UI Improvement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merapikan hierarchy dan urutan baca card soal pada `scheduled-event-editor-page` agar proses authoring lebih terarah tanpa mengubah autosave, upload media, API, draft recovery, atau behavior save yang sudah ada.

**Architecture:** Perubahan dibatasi pada area question cards di `src/pages/scheduled-ops/scheduled-event-editor-page.tsx` dan test terkait. Pendekatan `reading-order first card` akan memperjelas blok stem, media pertanyaan, grup opsi + kunci jawaban, pembahasan, media pembahasan, dan footer action, sambil menjaga urutan DOM serta seluruh behavior editor tetap sama.

**Tech Stack:** React, TypeScript, React Router, TanStack Query, Vitest, Testing Library, reusable UI components project (`Button`, `MetricPill`, `ConfirmDialog`, `StatePanel`, `SurfacePanel`)

---

## Chunk 1: Lock The New Question Card Contract In Tests

### Task 1: Expand editor tests for question-card hierarchy and footer actions

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`
- Reference: `docs/superpowers/specs/2026-06-23-scheduled-event-editor-question-cards-design.md`

- [ ] **Step 1: Add failing assertions for clearer reading-order grouping inside a question card**

Add expectations that the question card exposes:
- `Soal N` heading as the card anchor
- `Pertanyaan N` as the main field
- media pertanyaan still after stem
- options grouped before `Kunci jawaban`
- `Pembahasan` and `Gambar pembahasan` after the answer group

Example targets:

```tsx
expect(screen.getByRole("heading", { name: /soal 1/i })).toBeInTheDocument();
expect(screen.getByLabelText(/^pertanyaan 1$/i)).toBeInTheDocument();
expect(screen.getByLabelText(/kunci jawaban soal 1/i)).toBeInTheDocument();
expect(screen.getByLabelText(/pembahasan soal 1/i)).toBeInTheDocument();
```

- [ ] **Step 2: Add failing assertions for footer action behavior and hierarchy**

Add expectations that:
- `Tambah soal` remains visible only on the last card
- `Tambah soal` stays in a distinct footer area
- delete action remains per-card and destructive when more than one question exists

If delete behavior is already present in the current file, keep it and assert the footer remains structurally correct.

- [ ] **Step 3: Preserve behavior assertions for autosave, restore, upload, delete confirmation, and save**

Do not remove or weaken tests covering:
- autosave interval behavior
- persisted event id reuse
- draft restore precedence
- image upload flow
- delete confirmation flow
- save navigation behavior

- [ ] **Step 4: Run the targeted editor test to confirm it fails for card-hierarchy reasons only**

Run:

```bash
npx.cmd vitest run src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx
```

Expected:
- new hierarchy assertions fail
- existing behavior assertions stay valid

---

## Chunk 2: Strengthen The Question Card Reading Order

### Task 2: Reframe each card around stem first, then supporting media

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
- Reference: `src/components/ui/surface-panel.tsx`
- Reference: `src/components/ui/metric-pill.tsx`

- [ ] **Step 1: Keep the card header lightweight and explicit**

Maintain:
- `Soal N` as the heading
- answer-key badge as supporting information

Do not let the badge dominate over the heading.

- [ ] **Step 2: Make the stem block the strongest visual section**

Restructure the beginning of each card so:
- `Pertanyaan N` is clearly the main section
- its textarea gets the strongest spacing and prominence

- [ ] **Step 3: Keep `Gambar pertanyaan` directly after the stem, but reduce its visual weight**

Preserve:
- file label
- upload input
- preview image when present

Only change presentation so this block reads as support, not as a competing primary section.

- [ ] **Step 4: Re-run the targeted editor test**

Run:

```bash
npx.cmd vitest run src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx
```

Expected:
- stem/media hierarchy assertions pass
- remaining failures point to answer grouping or footer layout

---

## Chunk 3: Group Answers And Key Selection As One Decision Area

### Task 3: Merge option entry and answer-key choice into one coherent section

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`

- [ ] **Step 1: Wrap options `A-E` in a dedicated answer section**

Create a visible question-answer group with a section heading such as `Jawaban` or equivalent supporting copy if needed.

Keep the existing input ids, labels, values, and update logic exactly the same.

- [ ] **Step 2: Move `Kunci jawaban` to read as part of the answer group, not a detached block**

The select field should remain after the option grid, acting as the closing decision for the answer group.

Do not change the options or the value handling.

- [ ] **Step 3: Re-run the targeted editor test and confirm answer-group assertions pass**

Run:

```bash
npx.cmd vitest run src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx
```

Expected:
- answer-group hierarchy assertions pass
- behavior tests still pass

---

## Chunk 4: Separate Explanation And Footer Actions Cleanly

### Task 4: Reframe explanation/media as the closing section and keep footer actions distinct

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`
- Reference: `src/components/ui/confirm-dialog.tsx`

- [ ] **Step 1: Move `Pembahasan` into a dedicated closing section**

Place:
- explanation textarea
- explanation image uploader and preview

after the answer group, so this part reads as the final explanation step.

- [ ] **Step 2: Keep the footer action block visually separate from the content sections**

Preserve:
- `Tambah soal` only on the last card
- delete button behavior and confirmation flow

Ensure the footer clearly reads as actions rather than part of the form body.

- [ ] **Step 3: Verify delete controls remain accessible and logically placed**

If delete actions are present:
- destructive variant stays intact
- confirm dialog still opens and closes correctly
- action labels remain explicit (`Hapus soal N`)

- [ ] **Step 4: Re-run the targeted editor test**

Run:

```bash
npx.cmd vitest run src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx
```

Expected:
- all question-card hierarchy assertions pass
- delete/save/autosave/upload tests still pass

---

## Chunk 5: Broader Verification And Safe Integration

### Task 5: Verify integration and keep the batch isolated

**Files:**
- Verify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
- Verify: `src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`
- Verify: `src/router/app-router.test.tsx`

- [ ] **Step 1: Run the editor test with router coverage**

Run:

```bash
npx.cmd vitest run --maxWorkers=1 src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx src/router/app-router.test.tsx
```

Expected:
- editor tests pass
- route wiring remains green

- [ ] **Step 2: Run build verification**

Run:

```bash
corepack pnpm build
```

Expected:
- successful production build

- [ ] **Step 3: Review the diff for scope control**

Run:

```bash
git diff -- src/pages/scheduled-ops/scheduled-event-editor-page.tsx src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx
```

Confirm:
- no autosave logic changes
- no upload payload changes
- no metadata-top redesign changes beyond incidental spacing inheritance
- no scheduled-events list files touched
- no payment or subscription files touched

- [ ] **Step 4: Commit the batch once verification is green**

Run:

```bash
git add src/pages/scheduled-ops/scheduled-event-editor-page.tsx src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx
git commit -m "feat: improve scheduled event editor question cards hierarchy"
```

## Notes For Execution

- Keep DOM order aligned with reading order; do not solve hierarchy only with CSS.
- Reuse existing `SurfacePanel`, `MetricPill`, `Button`, and `ConfirmDialog`.
- Keep all existing field labels and ids stable unless a test explicitly proves an accessible improvement.
- Do not introduce accordions, collapsible sections, or wizard behavior in this batch.
- If card sections need helper copy, keep it short and purely editorial.
