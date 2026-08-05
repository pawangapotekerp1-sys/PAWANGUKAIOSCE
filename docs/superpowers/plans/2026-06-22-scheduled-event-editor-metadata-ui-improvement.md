# Scheduled Event Editor Metadata UI Improvement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Meringankan dan memperjelas area metadata atas pada `scheduled-event-editor-page` agar pengguna lebih cepat memahami urutan pengisian event tanpa mengubah autosave, API, draft recovery, upload media, atau flow simpan.

**Architecture:** Perubahan dibatasi pada area metadata atas `src/pages/scheduled-ops/scheduled-event-editor-page.tsx` dan test terkait. Pendekatan `step-first editor header` akan menambahkan intro ringan, mengelompokkan field menjadi identitas, status tayang, dan jadwal akses, serta menurunkan autosave dan durasi otomatis menjadi informasi pendukung tanpa mengubah state management yang sudah ada.

**Tech Stack:** React, TypeScript, React Router, TanStack Query, Vitest, Testing Library, reusable UI components project (`Button`, `MetricPill`, `StatePanel`, `SurfacePanel`)

---

## Chunk 1: Lock The Metadata Hierarchy In Tests

### Task 1: Expand editor tests to describe the new top-of-form hierarchy

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`
- Reference: `docs/superpowers/specs/2026-06-20-scheduled-event-editor-metadata-design.md`

- [ ] **Step 1: Add failing assertions for the lighter shell copy and intro context**

Add expectations that the editor shows:
- a shorter shell description
- a visible top intro area or metadata context copy
- autosave copy still present as supporting information

Example targets:

```tsx
expect(screen.getByText(/siapkan detail event dan jadwal akses sebelum menyusun soal/i)).toBeInTheDocument();
expect(screen.getByText(/perubahan di perangkat ini tersimpan/i)).toBeInTheDocument();
```

- [ ] **Step 2: Add failing assertions for metadata group headings and supporting hierarchy**

Add expectations for grouped sections such as:
- `Identitas event`
- `Status tayang`
- `Jadwal akses`
- duration summary still present but visually treated as supporting content

Example targets:

```tsx
expect(screen.getByRole("heading", { name: /identitas event/i })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: /status tayang/i })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: /jadwal akses/i })).toBeInTheDocument();
expect(screen.getByText(/durasi otomatis 1 menit/i)).toBeInTheDocument();
```

- [ ] **Step 3: Preserve behavior assertions for autosave, restore, upload, and save**

Do not remove or weaken tests that prove:
- draft recovery still works
- edit hydration precedence still works
- autosave still persists and reuses event ids
- save still navigates back to the list
- media upload flow still works

- [ ] **Step 4: Run the targeted editor test to confirm it fails for hierarchy reasons only**

Run:

```bash
npx.cmd vitest run src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx
```

Expected:
- new hierarchy assertions fail
- existing behavior assertions remain valid

---

## Chunk 2: Add The Intro Strip And Reframe Metadata Context

### Task 2: Introduce a lighter top context above the metadata card

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
- Reference: `src/pages/scheduled-ops/scheduled-ops-shell.tsx`
- Reference: `src/components/ui/surface-panel.tsx`
- Reference: `src/components/ui/metric-pill.tsx`

- [ ] **Step 1: Shorten the shell description copy**

Replace the current shell description with a shorter operational sentence that fits the approved design.

Suggested direction:

```tsx
description="Siapkan detail event dan jadwal akses sebelum menyusun soal."
```

- [ ] **Step 2: Add a compact intro strip above the main metadata surface**

Render a small top section that includes:
- a small label such as `Atur event`
- a short helper sentence
- the current autosave copy as supporting information

Keep it lightweight and avoid making it a second hero section.

- [ ] **Step 3: Keep autosave state logic exactly as-is**

Do not move or rewrite:
- `autosaveStatus`
- `lastServerSavedAt`
- `autosaveLabel`
- mutation callbacks

Only change presentation and placement.

- [ ] **Step 4: Re-run the targeted editor test**

Run:

```bash
npx.cmd vitest run src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx
```

Expected:
- intro-related assertions pass
- remaining failures point to group hierarchy inside the metadata card

---

## Chunk 3: Split The Metadata Card Into Clear Grouped Sections

### Task 3: Reorganize fields into identity, visibility, and access groups

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
- Reference: `src/components/ui/surface-panel.tsx`

- [ ] **Step 1: Group `Judul event` and `Deskripsi singkat` under an identity section**

Restructure the metadata card so the title field is the strongest entry point and the description field becomes a lower-weight companion.

Suggested structure:

```tsx
<section aria-labelledby="event-identity-heading">
  <h2 id="event-identity-heading">Identitas event</h2>
  ...
</section>
```

- [ ] **Step 2: Group `Status tayang` into its own compact section**

Move the select field into a separate section with its own heading and optional short helper copy.

Do not alter the select value, options, or update behavior.

- [ ] **Step 3: Group `Akses mulai` and `Akses selesai` into a paired schedule section**

Render the datetime-local inputs together under `Jadwal akses`, keeping them paired visually on desktop and stacked cleanly on mobile.

- [ ] **Step 4: Reposition the duration summary as a supporting footer inside the schedule section**

Keep the text `Durasi otomatis X menit`, but stop presenting it like a competing standalone block.

Use a smaller inset or supporting row inside the grouped metadata area.

- [ ] **Step 5: Re-run the targeted editor test and confirm hierarchy assertions pass**

Run:

```bash
npx.cmd vitest run src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx
```

Expected:
- metadata hierarchy assertions pass
- behavior tests still pass

---

## Chunk 4: Preserve Accessibility And Non-Metadata Stability

### Task 4: Verify that the metadata redesign does not break labels or question flows

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`

- [ ] **Step 1: Confirm every existing input keeps its explicit label and id pairing**

Do not replace:
- `htmlFor` and `id` pairing on metadata inputs
- question field labels
- image upload aria labels

- [ ] **Step 2: Confirm the redesign does not move or weaken the question section contract**

Question cards should stay functionally identical:
- same labels
- same autosave button area behavior
- same image input ordering

- [ ] **Step 3: Re-run the targeted editor test after final accessibility and layout cleanup**

Run:

```bash
npx.cmd vitest run src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx
```

Expected:
- all editor page tests pass

---

## Chunk 5: Broader Verification And Safe Integration

### Task 5: Verify integration and keep the batch isolated

**Files:**
- Verify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
- Verify: `src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`
- Verify: `src/router/app-router.test.tsx`

- [ ] **Step 1: Run the editor page test together with router coverage**

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
- no mutation payload changes
- no question block redesign beyond unavoidable spacing inheritance
- no scheduled-events list files touched
- no payment or subscription files touched

- [ ] **Step 4: Commit the batch once verification is green**

Run:

```bash
git add src/pages/scheduled-ops/scheduled-event-editor-page.tsx src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx
git commit -m "feat: improve scheduled event editor metadata hierarchy"
```

## Notes For Execution

- Keep `autosaveLabel` as the single source of truth for status text.
- Reuse existing `SurfacePanel` and `MetricPill` before inventing a new metadata component.
- Keep question-card structure functionally untouched in this batch.
- If helper copy is added under `Status tayang`, make it short and non-technical.
- Do not introduce wizard steps, accordions, or routing changes in this pass.
