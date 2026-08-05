# Area 1 SurfacePanel And MetricPill Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `SurfacePanel` feel lighter and more breathable on mobile, and make `MetricPill` cleaner and easier to scan, without changing component APIs, product logic, or page behavior.

**Architecture:** Keep the work inside the two shared UI primitives and drive it with TDD in the shared primitive test file first. After the primitives are updated, validate them against one representative student surface and one representative admin surface that already exercise stacked panels and grouped pills in realistic layouts.

**Tech Stack:** React, TypeScript, Tailwind utility classes, Vitest, React Testing Library

---

## File Structure

### Primary implementation files

- Modify: `src/components/ui/surface-panel.tsx`
  - Shared card-like surface used across student and admin pages.
- Modify: `src/components/ui/metric-pill.tsx`
  - Shared compact badge for status, metrics, and metadata.

### Primary test files

- Modify: `src/components/ui/ui-primitives.test.tsx`
  - Existing primitive contract file; extend it first to lock the new density and hierarchy behavior.

### Representative page verification files

- Verify through existing tests:
  - `src/pages/app/dashboard-page.test.tsx`
  - `src/pages/admin/users-page.test.tsx`
- Modify only if real compatibility issues appear:
  - `src/pages/app/dashboard-page.tsx`
  - `src/pages/admin/users-page.tsx`

### Reference documents

- Spec: `docs/superpowers/specs/2026-06-20-area1-surface-panel-metric-pill-design.md`

---

## Chunk 1: SurfacePanel Density Contract

### Task 1: Add failing tests for lighter SurfacePanel framing

**Files:**
- Modify: `src/components/ui/ui-primitives.test.tsx`
- Reference: `src/components/ui/surface-panel.tsx`

- [ ] **Step 1: Write the failing test for calmer panel density**

Add a test that renders the default `SurfacePanel` and asserts the panel keeps its shared identity while exposing the lighter spacing and transition contract required by the spec.

Suggested shape:

```tsx
test("keeps a calm shared panel frame with lighter density defaults", () => {
  render(
    <SurfacePanel as="section">
      Panel body
    </SurfacePanel>,
  );

  const panel = screen.getByText("Panel body").closest("section");

  expect(panel).toHaveClass("dashboard-panel");
  expect(panel).toHaveClass("ui-surface-panel");
  expect(panel).toHaveClass("p-[var(--dashboard-panel-padding)]");
  expect(panel).toHaveClass("duration-200");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx.cmd vitest run src/components/ui/ui-primitives.test.tsx
```

Expected:

- FAIL on at least one new `SurfacePanel` class assertion
- existing primitive tests still run

- [ ] **Step 3: Write the minimal `SurfacePanel` implementation**

Adjust `src/components/ui/surface-panel.tsx` so the panel frame feels lighter without changing its API:

- preserve the current `as`, `tone`, and `className` contract
- refine shared classes so the frame reads as calmer and more breathable
- keep transitions subtle and support-focused
- do not move product spacing responsibility into consuming pages

Possible target shape:

```tsx
className={[
  "dashboard-panel ui-surface-panel rounded-[var(--dashboard-panel-radius)] border p-[var(--dashboard-panel-padding)] transition-[transform,box-shadow,border-color,background-color] duration-200 ease-[var(--dashboard-ease)]",
  toneClasses[tone],
  className,
].join(" ")}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx.cmd vitest run src/components/ui/ui-primitives.test.tsx
```

Expected:

- PASS for the new `SurfacePanel` contract test
- no regressions in existing primitive tests

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/surface-panel.tsx src/components/ui/ui-primitives.test.tsx
git commit -m "feat: lighten surface panel framing"
```

### Task 2: Add failing tests for accent and warm tone restraint

**Files:**
- Modify: `src/components/ui/ui-primitives.test.tsx`
- Modify: `src/components/ui/surface-panel.tsx`

- [ ] **Step 1: Write the failing test for tone readability**

Add a test that renders the `accent` tone and asserts the panel still exposes semantic tone state while keeping the readable shared panel class contract.

Suggested shape:

```tsx
test("keeps accent panels readable without dropping the shared surface contract", () => {
  render(
    <SurfacePanel as="aside" tone="accent">
      Accent panel
    </SurfacePanel>,
  );

  const panel = screen.getByText("Accent panel").closest("aside");

  expect(panel).toHaveAttribute("data-tone", "accent");
  expect(panel).toHaveClass("dashboard-panel");
  expect(panel?.className).toContain("var(--dashboard-surface-accent)");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx.cmd vitest run src/components/ui/ui-primitives.test.tsx
```

Expected:

- FAIL if the new tone restraint expectations are not yet reflected

- [ ] **Step 3: Write the minimal implementation**

Tune `toneClasses` only as needed so:

- `accent` and `warm` still differentiate importance
- surface readability stays strong
- the panel frame does not overpower nearby content
- no API changes are introduced

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx.cmd vitest run src/components/ui/ui-primitives.test.tsx
```

Expected:

- PASS for all `SurfacePanel` tests

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/surface-panel.tsx src/components/ui/ui-primitives.test.tsx
git commit -m "feat: tune surface panel tone restraint"
```

---

## Chunk 2: MetricPill Scanability Contract

### Task 3: Add failing tests for cleaner MetricPill density

**Files:**
- Modify: `src/components/ui/ui-primitives.test.tsx`
- Reference: `src/components/ui/metric-pill.tsx`

- [ ] **Step 1: Write the failing test for compact visual weight**

Add a test that renders a pill and asserts the new compact rhythm contract.

Suggested shape:

```tsx
test("keeps metric pills compact and easy to scan", () => {
  render(<MetricPill tone="teal">Stabil</MetricPill>);

  const pill = screen.getByText("Stabil").closest("span[data-tone]");

  expect(pill).toHaveClass("ui-metric-pill");
  expect(pill).toHaveClass("min-h-9");
  expect(pill).toHaveClass("px-3");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx.cmd vitest run src/components/ui/ui-primitives.test.tsx
```

Expected:

- FAIL on at least one new density assertion

- [ ] **Step 3: Write the minimal `MetricPill` implementation**

Adjust `src/components/ui/metric-pill.tsx` so pills feel cleaner but stay legible:

- reduce perceived bulk slightly
- keep uppercase utility styling, but tone down visual shouting
- preserve icon support and semantic `data-tone`
- avoid making pills so small that they lose clarity

Possible target shape:

```tsx
"ui-metric-pill inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.14em] ..."
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx.cmd vitest run src/components/ui/ui-primitives.test.tsx
```

Expected:

- PASS for the new compact `MetricPill` contract test

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/metric-pill.tsx src/components/ui/ui-primitives.test.tsx
git commit -m "feat: compact metric pill density"
```

### Task 4: Add failing tests for icon-and-label rhythm

**Files:**
- Modify: `src/components/ui/ui-primitives.test.tsx`
- Modify: `src/components/ui/metric-pill.tsx`

- [ ] **Step 1: Write the failing test for icon spacing and token-backed tone**

Add a test that renders an icon pill and asserts the icon slot stays tidy while tone styles still come from CSS tokens.

Suggested shape:

```tsx
test("keeps icon pills tidy while preserving token-backed tone styling", () => {
  render(
    <MetricPill tone="gold" icon={<CircleNotch aria-hidden="true" size={14} />}>
      200 soal
    </MetricPill>,
  );

  const pill = screen.getByText("200 soal").closest("span[data-tone]");
  const iconWrap = pill?.querySelector("span");

  expect(pill).toHaveAttribute("data-tone", "gold");
  expect(pill?.className).toContain("var(--");
  expect(iconWrap).toHaveClass("shrink-0");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx.cmd vitest run src/components/ui/ui-primitives.test.tsx
```

Expected:

- FAIL if icon rhythm or token-backed styling no longer matches the intended contract

- [ ] **Step 3: Write the minimal implementation**

Refine `MetricPill` classes only as needed so:

- icon and label spacing stay balanced
- pills remain clearly secondary to nearby headings
- tone styling still depends on existing CSS variables
- interaction states stay subtle

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx.cmd vitest run src/components/ui/ui-primitives.test.tsx
```

Expected:

- PASS for all `MetricPill` tests

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/metric-pill.tsx src/components/ui/ui-primitives.test.tsx
git commit -m "feat: refine metric pill scan rhythm"
```

---

## Chunk 3: Representative Page Verification

### Task 5: Verify student dashboard compatibility

**Files:**
- Test: `src/pages/app/dashboard-page.test.tsx`
- Modify only if required for compatibility: `src/pages/app/dashboard-page.tsx`

- [ ] **Step 1: Add or tighten one representative assertion**

Use the existing dashboard test file to confirm the redesigned primitives still support:

- stacked panel sections
- quick action entry points
- grouped metric pills inside cards

Suggested low-fragility assertion:

```tsx
expect(await screen.findByRole("heading", { name: /ringkasan hari ini/i })).toBeInTheDocument();
expect(screen.getByText(/siap mulai/i)).toBeInTheDocument();
```

- [ ] **Step 2: Run the student dashboard test**

Run:

```bash
npx.cmd vitest run src/pages/app/dashboard-page.test.tsx
```

Expected:

- PASS if the primitive redesign remains compatible
- otherwise FAIL due to a real structure or rendering regression

- [ ] **Step 3: Apply the minimal compatibility fix if needed**

Only change `src/pages/app/dashboard-page.tsx` if the updated primitives expose a real compatibility issue, such as:

- pill grouping becoming awkward in one card
- a panel wrapper requiring a local spacing override
- a heading-and-metadata region becoming visually unstable

- [ ] **Step 4: Re-run the student dashboard test**

Run:

```bash
npx.cmd vitest run src/pages/app/dashboard-page.test.tsx
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/app/dashboard-page.tsx src/pages/app/dashboard-page.test.tsx
git commit -m "test: verify app dashboard with updated shared surfaces"
```

### Task 6: Verify admin users compatibility

**Files:**
- Test: `src/pages/admin/users-page.test.tsx`
- Modify only if required for compatibility: `src/pages/admin/users-page.tsx`

- [ ] **Step 1: Add or tighten one representative assertion**

Use the existing users-page test file to confirm the redesigned primitives still support:

- stacked admin panels
- grouped summary pills
- readable role/status badges inside repeated cards

Suggested low-fragility assertion:

```tsx
expect(screen.getByText(/aktif/i)).toBeInTheDocument();
expect(screen.getByText(/belum bayar/i)).toBeInTheDocument();
expect(screen.getByText(/admin/i)).toBeInTheDocument();
```

- [ ] **Step 2: Run the admin users test**

Run:

```bash
npx.cmd vitest run src/pages/admin/users-page.test.tsx
```

Expected:

- PASS if the shared primitive redesign stays compatible
- otherwise FAIL due to a real layout or rendering issue

- [ ] **Step 3: Apply the minimal compatibility fix if needed**

Only adjust `src/pages/admin/users-page.tsx` if the primitive redesign reveals a genuine local issue, such as:

- summary pill wrapping becoming too cramped
- repeated warm cards needing a small local spacing override
- metric grouping conflicting with card content hierarchy

- [ ] **Step 4: Re-run the admin users test**

Run:

```bash
npx.cmd vitest run src/pages/admin/users-page.test.tsx
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/users-page.tsx src/pages/admin/users-page.test.tsx
git commit -m "test: verify admin users surface with updated shared primitives"
```

---

## Chunk 4: Final Verification

### Task 7: Run the focused UI verification suite

**Files:**
- Test:
  - `src/components/ui/ui-primitives.test.tsx`
  - `src/pages/app/dashboard-page.test.tsx`
  - `src/pages/admin/users-page.test.tsx`

- [ ] **Step 1: Run the focused verification suite**

Run:

```bash
npx.cmd vitest run src/components/ui/ui-primitives.test.tsx src/pages/app/dashboard-page.test.tsx src/pages/admin/users-page.test.tsx
```

Expected:

- all targeted tests PASS
- no regressions in the redesigned primitive slice

- [ ] **Step 2: Commit the verification checkpoint**

```bash
git add src/components/ui/ui-primitives.test.tsx src/components/ui/surface-panel.tsx src/components/ui/metric-pill.tsx src/pages/app/dashboard-page.tsx src/pages/app/dashboard-page.test.tsx src/pages/admin/users-page.tsx src/pages/admin/users-page.test.tsx
git commit -m "feat: polish area 1 shared surfaces and metric pills"
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

- [ ] **Step 2: Stop immediately on any unexpected fallout**

If the build fails:

- capture the exact error and file
- fix only issues introduced by this slice
- do not continue into the next redesign area yet

---

## Notes For Execution

- Keep the slice limited to `SurfacePanel` and `MetricPill`.
- Do not redesign page layouts in the same run.
- Prefer class-level refinements over API expansion.
- If a test becomes too brittle, rewrite it to assert structural contracts rather than exact visual trivia.
- Preserve accessibility-safe behavior, especially:
  - readable tone contrast
  - semantic `data-tone`
  - legible compact text
  - stable icon labeling behavior

---

Plan complete and saved to `docs/superpowers/plans/2026-06-20-area1-surface-panel-metric-pill-implementation.md`. Ready to execute?
