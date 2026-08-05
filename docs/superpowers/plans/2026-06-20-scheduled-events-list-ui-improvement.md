# Scheduled Events List UI Improvement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Meningkatkan scanability, hierarchy visual, dan kejelasan aksi pada halaman daftar event terjadwal tanpa mengubah logic event, API, routing, atau destructive flow yang sudah ada.

**Architecture:** Perubahan dibatasi pada `scheduled-events-page.tsx` dan test terkait dengan pendekatan `status-first control board`. UI baru menambahkan ringkasan status di atas daftar, memperjelas struktur event card, dan mengunci hierarchy tombol melalui test sebelum implementasi visual dirapikan.

**Tech Stack:** React, TypeScript, React Router, TanStack Query, Vitest, Testing Library, reusable UI components project (`Button`, `MetricPill`, `StatePanel`, `SurfacePanel`)

---

## Chunk 1: Lock The New UI Contract In Tests

### Task 1: Expand scheduled events page tests for the new summary and hierarchy

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-events-page.test.tsx`
- Reference: `docs/superpowers/specs/2026-06-20-scheduled-events-list-design.md`

- [ ] **Step 1: Add failing assertions for the new top-of-page hierarchy**

Add expectations for:
- a shorter shell description
- a visible `Daftar event` section heading
- a summary strip with 3-4 status labels or counts
- a stronger `Event baru` CTA treatment if exposed through accessible text or variant markers

Example assertion targets:

```tsx
expect(screen.getByText(/pantau event aktif, draft, dan yang sudah selesai/i)).toBeInTheDocument();
expect(screen.getByRole("heading", { name: /daftar event/i })).toBeInTheDocument();
expect(screen.getByText(/event aktif/i)).toBeInTheDocument();
expect(screen.getByText(/siap diatur lagi/i)).toBeInTheDocument();
```

- [ ] **Step 2: Add failing assertions for event card hierarchy and action variants**

Assert that:
- each expired event still shows `Aktifkan lagi` and `Hapus event`
- `Ubah event` becomes the stable primary action for card navigation
- `Aktifkan lagi` becomes secondary or outline based on the reusable button system
- `Hapus event` remains destructive

Example:

```tsx
expect(screen.getByRole("link", { name: /ubah event/i })).toHaveAttribute("data-variant", "primary");
expect(screen.getByRole("button", { name: /aktifkan lagi/i })).toHaveAttribute("data-variant", "secondary");
expect(screen.getByRole("button", { name: /hapus event/i })).toHaveAttribute("data-variant", "destructive");
```

- [ ] **Step 3: Keep behavior tests for prompt reactivation and delete confirmation intact**

Preserve the current behavior checks:
- `window.prompt` still called twice for reactivation
- delete still goes through `ConfirmDialog`

- [ ] **Step 4: Run the targeted test to confirm it fails for the expected reasons**

Run:

```bash
npx.cmd vitest run src/pages/scheduled-ops/scheduled-events-page.test.tsx
```

Expected:
- failures around new heading/summary/action hierarchy assertions
- no failures caused by unrelated pages

---

## Chunk 2: Strengthen The Page Header And Summary Strip

### Task 2: Build the status-first top section in the scheduled events page

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-events-page.tsx`
- Reference: `src/pages/scheduled-ops/scheduled-ops-shell.tsx`
- Reference: `src/components/ui/surface-panel.tsx`
- Reference: `src/components/ui/metric-pill.tsx`

- [ ] **Step 1: Shorten the shell description copy**

Replace the current long description with one concise operational sentence aligned with the approved spec.

Suggested direction:

```tsx
description="Pantau event aktif, draft, dan yang sudah selesai dari satu halaman kerja."
```

- [ ] **Step 2: Add derived summary metrics from the existing `eventsQuery.data` array**

Compute counts only from the existing fetched data:
- active count
- draft/upcoming count if both are relevant
- expired/completed count
- optional “siap diatur lagi” count derived from expired items

Use local derived constants only. Do not alter API shape.

- [ ] **Step 3: Render a compact summary strip above the list**

Build a small responsive grid using existing surface tokens. Each block should include:
- short label
- count or supporting text
- restrained but readable contrast

Keep it mobile-friendly:

```tsx
<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">...</div>
```

- [ ] **Step 4: Run the scheduled events page test again**

Run:

```bash
npx.cmd vitest run src/pages/scheduled-ops/scheduled-events-page.test.tsx
```

Expected:
- summary-related assertions pass
- remaining failures point to card/action hierarchy still pending

---

## Chunk 3: Rebuild Event Card Reading Order And Action Hierarchy

### Task 3: Refine each event card for faster scanning

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-events-page.tsx`
- Reference: `src/components/ui/button.tsx`
- Reference: `src/components/ui/metric-pill.tsx`
- Reference: `src/components/ui/surface-panel.tsx`

- [ ] **Step 1: Reorder card content into clear information groups**

Restructure each card into:
- status row
- title and short description
- schedule/window block
- supporting metadata pills
- participant visibility note
- action group

Do not remove important information, but reduce the sense that all lines have equal weight.

- [ ] **Step 2: Separate the schedule block from lower-priority metadata**

Use a distinct visual row or inset section for `windowLabel` so the access timing is easier to scan than the descriptive note.

- [ ] **Step 3: Apply stronger button hierarchy**

Use the reusable button styling system rather than raw link classes where possible.

Target hierarchy:
- `Ubah event` → primary
- `Aktifkan lagi` → secondary or outline
- `Hapus event` → destructive

If `Link` needs button visuals, align it through the same button utility or a shared variant helper.

- [ ] **Step 4: Keep destructive and reactivation logic unchanged**

Do not change:
- the `handleReactivate` prompt flow
- mutation payloads
- invalidation behavior
- delete confirmation wiring

- [ ] **Step 5: Run the targeted test and confirm the UI contract now passes**

Run:

```bash
npx.cmd vitest run src/pages/scheduled-ops/scheduled-events-page.test.tsx
```

Expected:
- hierarchy and action assertions pass
- behavior tests still pass

---

## Chunk 4: Polish Loading, Empty, And Error States

### Task 4: Lightly refine supporting states without touching logic

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-events-page.tsx`
- Modify: `src/pages/scheduled-ops/scheduled-events-page.test.tsx`
- Reference: `src/components/ui/state-panel.tsx`

- [ ] **Step 1: Shorten the state copy where needed**

Keep the same state meanings, but align copy with the lighter operational tone from the spec.

Examples of acceptable direction:
- loading: concise and active
- empty: helpful and calm
- error: informative without sounding technical

- [ ] **Step 2: Verify state panels still expose accessible headings and descriptions**

Do not remove the semantic heading/description pattern already covered by `StatePanel`.

- [ ] **Step 3: Re-run the targeted page test**

Run:

```bash
npx.cmd vitest run src/pages/scheduled-ops/scheduled-events-page.test.tsx
```

Expected:
- all scheduled events page tests pass

---

## Chunk 5: Broader Verification And Safe Integration

### Task 5: Verify page-level integration and keep the branch stable

**Files:**
- Verify: `src/pages/scheduled-ops/scheduled-events-page.tsx`
- Verify: `src/pages/scheduled-ops/scheduled-events-page.test.tsx`
- Verify: router or shell tests only if impacted by changed visible copy

- [ ] **Step 1: Run the local scheduled-ops test slice**

Run:

```bash
npx.cmd vitest run --maxWorkers=1 src/pages/scheduled-ops/scheduled-events-page.test.tsx src/router/app-router.test.tsx
```

Expected:
- scheduled events tests pass
- route wiring stays green

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
git diff -- src/pages/scheduled-ops/scheduled-events-page.tsx src/pages/scheduled-ops/scheduled-events-page.test.tsx
```

Confirm:
- no API payload changes
- no routing changes
- no editor-page changes
- no subscription or payment files touched

- [ ] **Step 4: Commit the batch once verification is green**

Run:

```bash
git add src/pages/scheduled-ops/scheduled-events-page.tsx src/pages/scheduled-ops/scheduled-events-page.test.tsx
git commit -m "feat: improve scheduled events list hierarchy"
```

## Notes For Execution

- Keep all calculations local to the page component.
- Reuse existing UI primitives before adding any new component.
- If a tiny helper is needed for button variants on links, prefer colocating it with the existing button system rather than inventing a one-off class string.
- Do not touch `scheduled-event-editor-page.tsx` in this batch.
- Do not replace `window.prompt` in this batch; that belongs to a different scope if revisited later.
