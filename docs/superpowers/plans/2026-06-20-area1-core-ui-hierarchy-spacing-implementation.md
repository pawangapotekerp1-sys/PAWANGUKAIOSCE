# Area 1 Core UI Hierarchy And Spacing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve mobile-first hierarchy and spacing for `SectionHeading` and `StatePanel` so the app feels lighter and clearer without changing component behavior or API contracts.

**Architecture:** Keep the existing component APIs intact and apply only light internal markup refinements where needed. Drive the work with TDD in the shared primitive test file first, then validate the changes in one representative student page and one representative admin page that already exercise the components in realistic layouts.

**Tech Stack:** React, TypeScript, Tailwind utility classes, Vitest, React Testing Library

---

## File Structure

### Primary implementation files

- Modify: `src/components/ui/section-heading.tsx`
  - Shared section intro component used across student and admin pages.
- Modify: `src/components/ui/state-panel.tsx`
  - Shared loading, empty, and error state component.

### Primary test files

- Modify: `src/components/ui/ui-primitives.test.tsx`
  - Existing shared primitive styling contract test file. Extend this first for both components.

### Representative page verification files

- Modify if needed for compatibility only: `src/pages/app/dashboard-page.tsx`
- Modify if needed for compatibility only: `src/pages/admin/admin-dashboard-page.tsx`
- Verify through existing tests:
  - `src/pages/app/dashboard-page.test.tsx`
  - `src/pages/admin/admin-dashboard-page.test.tsx`

### Reference documents

- Spec: `docs/superpowers/specs/2026-06-20-area1-core-ui-hierarchy-spacing-design.md`

---

## Chunk 1: SectionHeading Hierarchy Refinement

### Task 1: Expand SectionHeading primitive tests

**Files:**
- Modify: `src/components/ui/ui-primitives.test.tsx`
- Reference: `src/components/ui/section-heading.tsx`

- [ ] **Step 1: Write the failing test for mobile-first action stacking**

Add a test that renders `SectionHeading` with `eyebrow`, `description`, and `actions`, then asserts the wrapper and action container expose the intended mobile-first structure.

```tsx
test("keeps actions below the text block while preserving shared heading hierarchy", () => {
  render(
    <SectionHeading
      eyebrow="Prioritas"
      title="Ringkasan Hari Ini"
      description="Skor, prioritas, dan pintu masuk ke sesi berikutnya."
      actions={<button type="button">Lihat detail</button>}
    />,
  );

  const root = screen.getByRole("heading", { name: /ringkasan hari ini/i }).closest(".ui-section-heading");
  const actionWrap = screen.getByRole("button", { name: /lihat detail/i }).parentElement;

  expect(root).toHaveClass("gap-4");
  expect(actionWrap).toHaveClass("w-full");
  expect(actionWrap).toHaveClass("sm:w-auto");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx.cmd vitest run src/components/ui/ui-primitives.test.tsx
```

Expected:

- FAIL on the new `SectionHeading` spacing or action-wrapper assertions
- existing tests still execute

- [ ] **Step 3: Write the minimal SectionHeading implementation**

Update `src/components/ui/section-heading.tsx` to:

- increase vertical spacing slightly on mobile
- give the text block a tighter readable width
- wrap `actions` in a full-width container on mobile and shrink-to-fit on `sm+`
- preserve the current props and semantic order

Target shape:

```tsx
<div className="ui-section-heading flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
  <div className="max-w-3xl">
    ...
  </div>
  {actions ? <div className="w-full shrink-0 sm:w-auto">{actions}</div> : null}
</div>
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx.cmd vitest run src/components/ui/ui-primitives.test.tsx
```

Expected:

- PASS for the new SectionHeading test
- no regressions in other primitive tests

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/section-heading.tsx src/components/ui/ui-primitives.test.tsx
git commit -m "feat: refine section heading hierarchy spacing"
```

### Task 2: Strengthen SectionHeading readability constraints

**Files:**
- Modify: `src/components/ui/ui-primitives.test.tsx`
- Modify: `src/components/ui/section-heading.tsx`

- [ ] **Step 1: Write the failing test for description rhythm**

Add a test that asserts the description keeps the calmer reading width and the title/description spacing reflects the spec.

```tsx
test("keeps supporting copy secondary and readable on compact screens", () => {
  render(
    <SectionHeading
      title="Ringkasan Hari Ini"
      description="Skor, prioritas, dan pintu masuk ke sesi berikutnya."
    />,
  );

  const description = screen.getByText(/skor, prioritas, dan pintu masuk ke sesi berikutnya\./i);

  expect(description).toHaveClass("mt-3");
  expect(description).toHaveClass("max-w-2xl");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx.cmd vitest run src/components/ui/ui-primitives.test.tsx
```

Expected:

- FAIL on at least one updated description spacing or width assertion

- [ ] **Step 3: Write the minimal implementation**

Adjust `SectionHeading` classes only as needed:

- slightly roomier title-to-description spacing
- slightly narrower description width
- keep the title as the dominant visual element without enlarging it further

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx.cmd vitest run src/components/ui/ui-primitives.test.tsx
```

Expected:

- PASS for all `SectionHeading` tests

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/section-heading.tsx src/components/ui/ui-primitives.test.tsx
git commit -m "feat: tune section heading copy rhythm"
```

---

## Chunk 2: StatePanel Hierarchy Refinement

### Task 3: Expand StatePanel primitive tests for action rhythm

**Files:**
- Modify: `src/components/ui/ui-primitives.test.tsx`
- Reference: `src/components/ui/state-panel.tsx`

- [ ] **Step 1: Write the failing test for mobile action placement**

Add a test that renders a `StatePanel` with an action and asserts the panel uses the intended spacing and stacking contract.

```tsx
test("keeps state panel action clearly separated after the description", () => {
  render(
    <StatePanel
      variant="empty"
      title="Belum ada data"
      description="Coba filter lain untuk melihat data yang tersedia."
      action={<button type="button">Coba lagi</button>}
    />,
  );

  const panel = screen.getByRole("status");
  const actionWrap = screen.getByRole("button", { name: /coba lagi/i }).parentElement;

  expect(panel).toHaveClass("ui-state-panel");
  expect(actionWrap).toHaveClass("mt-5");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx.cmd vitest run src/components/ui/ui-primitives.test.tsx
```

Expected:

- FAIL on the new `StatePanel` spacing expectation

- [ ] **Step 3: Write the minimal StatePanel implementation**

Update `src/components/ui/state-panel.tsx` to:

- make the content stack a little calmer on mobile
- separate `description` and `action` more clearly
- keep icon, title, description, and action in the same semantic order
- preserve `role` and `aria-live`

Possible target changes:

```tsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
...
{description ? <p className="mt-3 max-w-2xl ...">...</p> : null}
{action ? <div className="mt-5">{action}</div> : null}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx.cmd vitest run src/components/ui/ui-primitives.test.tsx
```

Expected:

- PASS for the new `StatePanel` action-spacing test

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/state-panel.tsx src/components/ui/ui-primitives.test.tsx
git commit -m "feat: refine state panel action hierarchy"
```

### Task 4: Simplify loading skeleton rhythm

**Files:**
- Modify: `src/components/ui/ui-primitives.test.tsx`
- Modify: `src/components/ui/state-panel.tsx`

- [ ] **Step 1: Write the failing test for loading skeleton contract**

Add a test that renders `StatePanel` in `loading` mode and asserts the skeleton group still exists but uses the intended simplified structure.

```tsx
test("renders a lighter loading skeleton without removing the loading state structure", () => {
  render(
    <StatePanel
      variant="loading"
      title="Sedang dimuat"
      description="Menyiapkan data."
    />,
  );

  const panel = screen.getByRole("status");
  const skeletonGroup = panel.querySelector(".ui-state-panel-skeleton-group");

  expect(skeletonGroup).not.toBeNull();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx.cmd vitest run src/components/ui/ui-primitives.test.tsx
```

Expected:

- FAIL because the new skeleton wrapper class does not exist yet

- [ ] **Step 3: Write the minimal implementation**

Refactor the loading-only skeleton block in `StatePanel` so it:

- uses a named wrapper such as `.ui-state-panel-skeleton-group`
- reduces visual clutter slightly
- preserves the loading placeholder intent

Example target:

```tsx
<div aria-hidden="true" className="ui-state-panel-skeleton-group mt-5 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
  ...
</div>
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx.cmd vitest run src/components/ui/ui-primitives.test.tsx
```

Expected:

- PASS for the loading skeleton test
- prior primitive tests remain green

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/state-panel.tsx src/components/ui/ui-primitives.test.tsx
git commit -m "feat: simplify state panel loading rhythm"
```

---

## Chunk 3: Representative Page Verification

### Task 5: Verify student dashboard compatibility

**Files:**
- Test: `src/pages/app/dashboard-page.test.tsx`
- Modify only if required for compatibility: `src/pages/app/dashboard-page.tsx`

- [ ] **Step 1: Write or tighten one representative assertion**

Add one targeted assertion if needed to reflect the new heading/state hierarchy without coupling the test to fragile style details. Prefer checking that existing actions still remain accessible and headings still render in the expected order.

Possible example:

```tsx
expect(screen.getByRole("heading", { name: /ringkasan hari ini/i })).toBeInTheDocument();
expect(screen.getByRole("link", { name: /mulai sesi baru/i })).toBeInTheDocument();
```

- [ ] **Step 2: Run the dashboard test to verify the current state**

Run:

```bash
npx.cmd vitest run src/pages/app/dashboard-page.test.tsx
```

Expected:

- PASS if no compatibility updates are needed
- otherwise FAIL in a way that points to a real layout/structure regression

- [ ] **Step 3: Apply the minimal compatibility fix if needed**

Only change `src/pages/app/dashboard-page.tsx` if the redesigned primitives expose a real compatibility issue such as:

- action container width assumption
- spacing wrapper expectation
- heading action alignment breakage

- [ ] **Step 4: Re-run the dashboard test**

Run:

```bash
npx.cmd vitest run src/pages/app/dashboard-page.test.tsx
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/app/dashboard-page.tsx src/pages/app/dashboard-page.test.tsx
git commit -m "test: verify student dashboard with refined ui hierarchy"
```

### Task 6: Verify admin dashboard compatibility

**Files:**
- Test: `src/pages/admin/admin-dashboard-page.test.tsx`
- Modify only if required for compatibility: `src/pages/admin/admin-dashboard-page.tsx`

- [ ] **Step 1: Add or tighten one representative assertion**

Ensure the admin dashboard still renders the key heading and payment CTA after the primitive redesign.

Example:

```tsx
expect(await screen.findByRole("heading", { name: /ringkasan admin hari ini/i })).toBeInTheDocument();
expect(screen.getByRole("link", { name: /lihat pembayaran/i })).toBeInTheDocument();
```

- [ ] **Step 2: Run the admin dashboard test**

Run:

```bash
npx.cmd vitest run src/pages/admin/admin-dashboard-page.test.tsx
```

Expected:

- PASS if primitives remain compatible
- otherwise FAIL due to a real structural regression

- [ ] **Step 3: Apply the minimal compatibility fix if needed**

Only adjust `src/pages/admin/admin-dashboard-page.tsx` if the refined primitives require a local compatibility correction.

- [ ] **Step 4: Re-run the admin dashboard test**

Run:

```bash
npx.cmd vitest run src/pages/admin/admin-dashboard-page.test.tsx
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/admin-dashboard-page.tsx src/pages/admin/admin-dashboard-page.test.tsx
git commit -m "test: verify admin dashboard with refined ui hierarchy"
```

---

## Chunk 4: Final Verification

### Task 7: Run the focused UI test set

**Files:**
- Test:
  - `src/components/ui/ui-primitives.test.tsx`
  - `src/pages/app/dashboard-page.test.tsx`
  - `src/pages/admin/admin-dashboard-page.test.tsx`

- [ ] **Step 1: Run the focused verification suite**

Run:

```bash
npx.cmd vitest run src/components/ui/ui-primitives.test.tsx src/pages/app/dashboard-page.test.tsx src/pages/admin/admin-dashboard-page.test.tsx
```

Expected:

- all targeted tests PASS
- no new warnings or regressions in the changed UI slice

- [ ] **Step 2: Commit the verification checkpoint**

```bash
git add src/components/ui/ui-primitives.test.tsx src/components/ui/section-heading.tsx src/components/ui/state-panel.tsx src/pages/app/dashboard-page.tsx src/pages/app/dashboard-page.test.tsx src/pages/admin/admin-dashboard-page.tsx src/pages/admin/admin-dashboard-page.test.tsx
git commit -m "feat: polish core ui hierarchy and spacing area 1"
```

### Task 8: Run the production build

**Files:**
- Verify only

- [ ] **Step 1: Run the build**

Run:

```bash
npm.cmd run build
```

Expected:

- exit code `0`
- production bundle builds successfully

- [ ] **Step 2: Document any unexpected fallout immediately**

If the build fails:

- stop and record the exact failing file or type error
- do not continue to the next redesign area

---

## Notes For Execution

- Keep this pass strictly limited to `SectionHeading` and `StatePanel`.
- Do not redesign `SurfacePanel`, `MetricPill`, or shell layouts in the same implementation run.
- Prefer class and markup adjustments over new props.
- If a planned test turns out to be too style-coupled, rewrite it to assert the structural contract instead of brittle CSS details.
- Preserve accessibility semantics, especially:
  - heading levels
  - `role="status"` and `role="alert"`
  - `aria-live`

---

Plan complete and saved to `docs/superpowers/plans/2026-06-20-area1-core-ui-hierarchy-spacing-implementation.md`. Ready to execute?
