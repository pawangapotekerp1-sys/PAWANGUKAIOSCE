# Tryout Catalog Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merapikan hierarchy `tryout-catalog-page` agar resume banner tetap paling prioritas, `Simulasi penuh` menjadi entry point utama, dan grup blok/materi turun menjadi pilihan sekunder tanpa mengubah logic data atau routing sesi.

**Architecture:** Perubahan dibatasi pada surface katalog tryout reguler di `src/pages/app/tryout-catalog-page.tsx` dan kontrak test-nya. Pendekatan dilakukan dengan TDD: kunci dulu contract hierarchy baru di test, lalu refactor halaman menjadi `resume-first` dan `hero-first catalog`, kemudian bedakan featured full simulation dari supporting block/topic groups lewat urutan DOM, spacing, dan visual weight yang tetap memakai primitive UI yang sudah ada.

**Tech Stack:** React, TypeScript, React Router, TanStack Query, Vitest, Testing Library, Tailwind utility classes, reusable UI primitives internal (`SurfacePanel`, `SectionHeading`, `MetricPill`, `Button`, `StatePanel`)

---

## Chunk 1: Scope, File Map, and Test Contract

### File Map

**Files:**
- Modify: `src/pages/app/tryout-catalog-page.tsx`
- Modify: `src/pages/app/tryout-catalog-page.test.tsx`
- Verify only unless route copy really changes: `src/router/app-router.test.tsx`
- Reference only: `docs/superpowers/specs/2026-06-23-tryout-catalog-hierarchy-design.md`
- Reference only: `src/components/ui/section-heading.tsx`
- Reference only: `src/components/ui/surface-panel.tsx`
- Reference only: `src/components/ui/metric-pill.tsx`
- Reference only: `src/components/ui/button.tsx`

**Responsibilities:**
- `src/pages/app/tryout-catalog-page.tsx`
  Menyusun ulang reading order halaman, memisahkan featured `Simulasi penuh`, mempertahankan resume banner di urutan teratas, dan menurunkan bobot visual grup blok/materi.
- `src/pages/app/tryout-catalog-page.test.tsx`
  Mengunci contract hierarchy baru tanpa mengubah data layer atau route target.
- `src/router/app-router.test.tsx`
  Hanya disentuh bila perubahan presentational di level route menyebabkan expectation lama tidak relevan.

### Task 1: Lock the new hierarchy contract in tests

**Files:**
- Modify: `src/pages/app/tryout-catalog-page.test.tsx`
- Reference: `docs/superpowers/specs/2026-06-23-tryout-catalog-hierarchy-design.md`

- [ ] **Step 1: Add a failing test for the active-attempt-first reading order**

Add a new test that renders an active attempt and asserts:
- `Lanjutkan sesi` panel is still present
- the active attempt banner appears before the catalog hero/featured full simulation block in DOM order
- the `Lanjutkan sesi` CTA remains `data-variant="primary"`

Example target:

```tsx
const resumeLink = await screen.findByRole("link", { name: /lanjutkan sesi/i });
const fullHeading = screen.getByRole("heading", { name: /simulasi penuh/i });

expect(resumeLink.compareDocumentPosition(fullHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
```

- [ ] **Step 2: Add a failing test for featured full simulation hierarchy**

Add expectations that:
- the catalog hero now contains presentational copy that recommends starting from a full simulation
- `Simulasi penuh` still renders, but now appears as the featured block before `Try out per blok`
- the featured full card still exposes a `Mulai sesi` primary CTA

Example targets:

```tsx
expect(screen.getByText(/mulai dari simulasi penuh/i)).toBeInTheDocument();
expect(fullHeading.compareDocumentPosition(blockHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
```

- [ ] **Step 3: Add a failing test for supporting block/topic hierarchy**

Add expectations that:
- `Try out per blok` remains available after the featured block
- `Try out per materi` still groups by block and still appears after the block section in DOM order
- block/topic start CTAs remain accessible and keep their current route targets

- [ ] **Step 4: Preserve loading, error, empty, and disabled-state assertions**

Do not weaken the existing tests that cover:
- loading state copy
- error state copy
- empty state copy
- disabled `Mulai sesi` buttons when templates are not startable

- [ ] **Step 5: Run the focused catalog test and confirm it fails for hierarchy reasons only**

Run:

```bash
npx.cmd vitest run src/pages/app/tryout-catalog-page.test.tsx
```

Expected:
- new hierarchy assertions fail
- existing state and route behavior assertions remain valid

- [ ] **Step 6: Commit the test contract**

```bash
git add src/pages/app/tryout-catalog-page.test.tsx
git commit -m "test: lock tryout catalog hierarchy contract"
```

---

## Chunk 2: Resume Banner and Hero-First Catalog

### Task 2: Keep resume first and add the new catalog hero

**Files:**
- Modify: `src/pages/app/tryout-catalog-page.tsx`
- Test: `src/pages/app/tryout-catalog-page.test.tsx`

- [ ] **Step 1: Keep the active attempt banner as the first content block**

Maintain the existing banner behavior:
- status label
- title
- mode label
- answered count
- timer
- `Lanjutkan sesi` route target

Only adjust layout and spacing so it clearly reads as the top-priority action when present.

- [ ] **Step 2: Reframe the page header into a stronger catalog hero**

Update the existing `SectionHeading` usage so the top-of-page copy:
- stays concise
- explains the three session types
- explicitly recommends starting from a full simulation

Do not turn the hero into a new route or wizard. Keep it presentational.

- [ ] **Step 3: Ensure DOM order matches visual priority**

The order in the rendered page should be:
1. active attempt banner when present
2. catalog hero
3. featured full simulation section
4. block section
5. topic section

Do not solve this only with CSS reordering.

- [ ] **Step 4: Run the catalog test to verify hero/resume assertions pass**

Run:

```bash
npx.cmd vitest run src/pages/app/tryout-catalog-page.test.tsx
```

Expected:
- active attempt and hero hierarchy assertions pass
- any remaining failures should point to the featured/supporting section treatment

- [ ] **Step 5: Commit the resume and hero work**

```bash
git add src/pages/app/tryout-catalog-page.tsx src/pages/app/tryout-catalog-page.test.tsx
git commit -m "feat: strengthen tryout catalog hero hierarchy"
```

---

## Chunk 3: Feature Full Simulation as the Primary Entry Point

### Task 3: Separate `Simulasi penuh` from the rest of the catalog

**Files:**
- Modify: `src/pages/app/tryout-catalog-page.tsx`
- Test: `src/pages/app/tryout-catalog-page.test.tsx`

- [ ] **Step 1: Create a featured treatment for the full simulation section**

Refactor the full-template section so it no longer reads like just another section header plus normal card.

Keep:
- same data source
- same heading label `Simulasi penuh`
- same `TryoutCatalogCardView` inputs unless a tiny prop extension is needed
- same session route target

Change:
- spacing
- section framing
- featured emphasis around the full-template card

- [ ] **Step 2: If needed, extend `TryoutCatalogCardView` with a small presentation-only variant**

If the current card component cannot express the featured treatment cleanly, introduce a minimal presentational prop such as:
- `layout="featured" | "default"`
- or a boolean such as `isFeatured`

Do not alter:
- CTA enable/disable logic
- route construction
- card data mapping

- [ ] **Step 3: Keep the featured `Mulai sesi` CTA primary**

The featured full-simulation CTA should remain:
- a `Link`
- `data-variant="primary"`
- pointed to `/app/tryout/session?template=<id>`

- [ ] **Step 4: Re-run the catalog test**

Run:

```bash
npx.cmd vitest run src/pages/app/tryout-catalog-page.test.tsx
```

Expected:
- featured full-simulation hierarchy assertions pass
- any remaining failures point to block/topic section weighting only

- [ ] **Step 5: Commit the featured full-simulation work**

```bash
git add src/pages/app/tryout-catalog-page.tsx src/pages/app/tryout-catalog-page.test.tsx
git commit -m "feat: feature full simulation in tryout catalog"
```

---

## Chunk 4: Rebalance Block and Topic Groups as Supporting Sections

### Task 4: Lower the visual weight of block/topic sections without changing access

**Files:**
- Modify: `src/pages/app/tryout-catalog-page.tsx`
- Test: `src/pages/app/tryout-catalog-page.test.tsx`

- [ ] **Step 1: Reframe `Try out per blok` as the secondary section**

Keep:
- same section heading
- same grid semantics
- same `Mulai sesi` route targets

Adjust:
- spacing above and below the group
- supporting copy length
- card density and visual competition against the featured full section

- [ ] **Step 2: Reframe `Try out per materi` as the lightest section**

Keep:
- grouping by block
- topic card count copy
- topic route targets

Adjust:
- section header scale
- subgroup heading treatment
- vertical density so the topic area does not overpower the page

- [ ] **Step 3: Preserve disabled-card behavior across all three levels**

Make sure disabled templates still render:
- disabled `Mulai sesi` buttons
- `data-variant="secondary"`
- disabled reason text

This must still work for featured full, block, and topic cards.

- [ ] **Step 4: Re-run the focused catalog test**

Run:

```bash
npx.cmd vitest run src/pages/app/tryout-catalog-page.test.tsx
```

Expected:
- all catalog hierarchy and state tests pass

- [ ] **Step 5: Commit the supporting-section rebalance**

```bash
git add src/pages/app/tryout-catalog-page.tsx src/pages/app/tryout-catalog-page.test.tsx
git commit -m "feat: rebalance tryout catalog supporting sections"
```

---

## Chunk 5: Verification and Safe Integration

### Task 5: Verify the batch without leaking into scheduled catalog or routing logic

**Files:**
- Verify: `src/pages/app/tryout-catalog-page.tsx`
- Verify: `src/pages/app/tryout-catalog-page.test.tsx`
- Verify only if needed: `src/router/app-router.test.tsx`

- [ ] **Step 1: Run the focused catalog test suite**

Run:

```bash
npx.cmd vitest run --maxWorkers=1 src/pages/app/tryout-catalog-page.test.tsx
```

Expected:
- all tests pass

- [ ] **Step 2: Run route coverage only if route-level expectations changed**

Run:

```bash
npx.cmd vitest run --maxWorkers=1 src/pages/app/tryout-catalog-page.test.tsx src/router/app-router.test.tsx
```

Expected:
- catalog tests pass
- route tests stay green without changing route behavior

- [ ] **Step 3: Run build verification**

Run:

```bash
corepack pnpm build
```

Expected:
- successful production build

- [ ] **Step 4: Review diff scope**

Run:

```bash
git diff --stat
git diff -- src/pages/app/tryout-catalog-page.tsx src/pages/app/tryout-catalog-page.test.tsx src/router/app-router.test.tsx
```

Confirm:
- only `src/pages/app/tryout-catalog-page.tsx`, `src/pages/app/tryout-catalog-page.test.tsx`, and optionally `src/router/app-router.test.tsx` appear in the repo-wide diff for this batch
- no `scheduled-tryout-catalog-page` edits
- no API contract changes
- no mapper changes
- no route target changes for `Mulai sesi` or `Lanjutkan sesi`
- no subscription or payment files touched

- [ ] **Step 5: Commit the final batch**

```bash
git add src/pages/app/tryout-catalog-page.tsx src/pages/app/tryout-catalog-page.test.tsx src/router/app-router.test.tsx
git commit -m "feat: improve tryout catalog hierarchy"
```

## Notes for Execution

- Keep the page as one catalog surface. Do not introduce a detail-page detour.
- Reuse existing primitives before inventing new ones.
- If the featured full-template treatment needs a small card prop, keep it presentation-only and local to this page.
- Favor DOM order and section structure over decorative styling tricks.
- Keep copy short. This batch should reduce cognitive load, not add more instructions.
