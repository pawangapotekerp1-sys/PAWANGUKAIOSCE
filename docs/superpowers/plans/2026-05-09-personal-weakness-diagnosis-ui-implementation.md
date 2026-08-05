# Personal Weakness Diagnosis UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy analytics page with a diagnosis-first UI that consumes the new personal weakness diagnosis backend, defaults to the last 7 user-local days, and clearly renders `empty`, `basic`, and `full` diagnosis modes.

**Architecture:** Keep the existing `/app/analytics` route and `ProductShell`, but replace the old block/topic analytics query with the backend-owned `getPersonalWeaknessDiagnosis()` flow. Add a small date-range helper layer, page-level applied-range state, focused diagnosis components, and tests that verify both the range interactions and the mode-specific rendering without reintroducing the legacy analytics model.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, React Router, Vitest, React Testing Library

---

## File Structure

### Route And Page Orchestration

- Modify: `src/pages/app/analytics-page.tsx`
- Modify: `src/pages/app/analytics-page.test.tsx`

Responsibilities:

- `analytics-page.tsx` becomes the route orchestrator only:
  - resolve session and timezone
  - own draft/applied diagnosis range state
  - call `getPersonalWeaknessDiagnosis()`
  - switch between `loading`, `error`, `empty`, `basic`, and `full`
  - pass already-mapped backend data into focused presentational components

### Date Range Helpers

- Create: `src/lib/diagnosis-date-range.ts`
- Create: `src/lib/diagnosis-date-range.test.ts`

Responsibilities:

- compute the default last-7-days range
- derive preset ranges for `7 hari`, `14 hari`, and `30 hari`
- normalize a custom range into the query payload shape
- expose a safe browser-timezone resolver with a sane fallback
- keep date math out of the page component

### Diagnosis Components

- Create: `src/components/diagnosis/diagnosis-range-controls.tsx`
- Create: `src/components/diagnosis/diagnosis-hero-card.tsx`
- Create: `src/components/diagnosis/global-behavior-panel.tsx`
- Create: `src/components/diagnosis/subtopic-ranking-list.tsx`
- Create: `src/components/diagnosis/subtopic-ranking-list.test.tsx`

Responsibilities:

- `diagnosis-range-controls.tsx`
  - render preset chips/buttons
  - render custom `date` inputs
  - expose an apply action for custom input
  - surface the active range label clearly

- `diagnosis-hero-card.tsx`
  - render the full-mode weakest subtopic hero
  - show supporting metrics and compact behavior chips

- `global-behavior-panel.tsx`
  - render global behavior patterns for `basic` and `full`
  - show severity, evidence, and description in a dedicated card

- `subtopic-ranking-list.tsx`
  - render top 5 by default
  - inline-expand the remainder below the first section
  - inline-expand individual cards for narrative and supporting metrics

### Existing Contracts

- Reference: `src/lib/api/analytics-api.ts`
- Reference: `src/lib/mappers/analytics-mappers.ts`
- Reference: `src/components/ui/section-heading.tsx`
- Reference: `src/components/ui/state-panel.tsx`
- Reference: `src/components/ui/surface-panel.tsx`
- Reference: `docs/superpowers/specs/2026-05-08-personal-weakness-diagnosis-design.md`
- Reference: `docs/superpowers/specs/2026-05-09-personal-weakness-diagnosis-ui-design.md`

Notes:

- Follow `@test-driven-development`: every behavior change starts with a failing test.
- Use `@verification-before-completion` before claiming the page is done.
- Keep the main route file focused. Push rendering detail into `src/components/diagnosis/*`.
- Preserve the existing route path and app navigation. Only the content model changes.
- Match the TanStack Query patterns already called out in the UI spec:
  - filtered query key includes `userId`, `dateFrom`, `dateTo`, and `timezone`
  - `enabled` gates the query until session and range inputs are ready
  - `placeholderData: (previous) => previous` preserves visible content during refetch

## Chunk 1: Date Range And Query Foundations

### Task 1: Add deterministic diagnosis date-range helpers

**Files:**
- Create: `src/lib/diagnosis-date-range.ts`
- Create: `src/lib/diagnosis-date-range.test.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `src/lib/diagnosis-date-range.test.ts` to cover:

- default range returns the last 7 calendar days ending on `now`
- `7 hari`, `14 hari`, and `30 hari` presets return stable ISO `YYYY-MM-DD` values
- invalid custom input refuses to produce an applied range
- timezone resolution falls back to `"UTC"` if the browser value is missing

Example test shapes:

```ts
expect(
  createPresetDiagnosisRange("7d", new Date("2026-05-09T10:00:00+07:00")),
).toEqual({
  preset: "7d",
  dateFrom: "2026-05-03",
  dateTo: "2026-05-09",
});

expect(
  toAppliedDiagnosisRange({
    preset: "custom",
    dateFrom: "2026-05-10",
    dateTo: "2026-05-09",
  }),
).toBeNull();
```

- [ ] **Step 2: Run the helper test to verify it fails**

Run:

```bash
npm run test -- --run src/lib/diagnosis-date-range.test.ts
```

Expected: FAIL because the helper file does not exist yet.

- [ ] **Step 3: Write the minimal helper implementation**

Create `src/lib/diagnosis-date-range.ts` with focused utilities like:

```ts
export type DiagnosisRangePreset = "7d" | "14d" | "30d" | "custom";

export type DiagnosisRangeDraft = {
  preset: DiagnosisRangePreset;
  dateFrom: string;
  dateTo: string;
};

export function createPresetDiagnosisRange(
  preset: Exclude<DiagnosisRangePreset, "custom">,
  now = new Date(),
): DiagnosisRangeDraft {
  // subtract calendar days and return YYYY-MM-DD strings
}

export function createDefaultDiagnosisRange(now = new Date()): DiagnosisRangeDraft {
  return createPresetDiagnosisRange("7d", now);
}

export function toAppliedDiagnosisRange(input: DiagnosisRangeDraft): DiagnosisRangeDraft | null {
  if (!input.dateFrom || !input.dateTo || input.dateFrom > input.dateTo) {
    return null;
  }

  return input;
}

export function resolveUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
```

- [ ] **Step 4: Re-run the helper test**

Run:

```bash
npm run test -- --run src/lib/diagnosis-date-range.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/diagnosis-date-range.ts src/lib/diagnosis-date-range.test.ts
git commit -m "feat: add diagnosis date range helpers"
```

### Task 2: Replace the legacy analytics query with a diagnosis query skeleton

**Files:**
- Modify: `src/pages/app/analytics-page.tsx`
- Modify: `src/pages/app/analytics-page.test.tsx`
- Reference: `src/lib/api/analytics-api.ts`
- Reference: `src/lib/mappers/analytics-mappers.ts`

- [ ] **Step 1: Write the failing page test for default diagnosis loading**

Update `src/pages/app/analytics-page.test.tsx` so the route:

- calls `getPersonalWeaknessDiagnosis()`, not `getStudentAnalytics()`
- uses the default last-7-day range
- renders the new diagnosis heading copy

Example assertions:

```ts
expect(mockGetPersonalWeaknessDiagnosis).toHaveBeenCalledWith({
  dateFrom: "2026-05-03",
  dateTo: "2026-05-09",
  timezone: "Asia/Jakarta",
  userId: "user-1",
});

expect(
  await screen.findByRole("heading", { name: /diagnosis kelemahan/i }),
).toBeInTheDocument();

expect(screen.queryByText(/analisis pola belajar/i)).not.toBeInTheDocument();
```

Mock the current date and browser timezone at the top of the test so the range stays deterministic.

- [ ] **Step 2: Run the page test to verify it fails**

Run:

```bash
npm run test -- --run src/pages/app/analytics-page.test.tsx
```

Expected: FAIL because the page still calls `getStudentAnalytics()` and renders the old copy.

- [ ] **Step 3: Swap the route to the diagnosis query**

In `src/pages/app/analytics-page.tsx`:

- replace the analytics import with `getPersonalWeaknessDiagnosis`
- initialize the range from `createDefaultDiagnosisRange()`
- resolve timezone through `resolveUserTimezone()`
- use a diagnosis query key shaped like:

```ts
["personal-weakness-diagnosis", user?.id, appliedRange.dateFrom, appliedRange.dateTo, timezone]
```

- gate the query with `enabled: analyticsView === "ready" && Boolean(user?.id)`
- preserve prior result during refetch:

```ts
placeholderData: (previous) => previous,
```

At this stage, render only a minimal heading and one neutral loading/loaded placeholder. Do not build the full diagnosis UI yet.

- [ ] **Step 4: Re-run the page test**

Run:

```bash
npm run test -- --run src/pages/app/analytics-page.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/app/analytics-page.tsx src/pages/app/analytics-page.test.tsx
git commit -m "feat: wire analytics route to diagnosis query"
```

## Chunk 2: Range Controls And Mode-Specific Page States

### Task 3: Add range controls with presets and custom apply behavior

**Files:**
- Create: `src/components/diagnosis/diagnosis-range-controls.tsx`
- Modify: `src/pages/app/analytics-page.tsx`
- Modify: `src/pages/app/analytics-page.test.tsx`
- Reference: `src/lib/diagnosis-date-range.ts`

- [ ] **Step 1: Extend the page test with range interactions**

Add tests that verify:

- the page shows preset controls `7 hari`, `14 hari`, `30 hari`
- clicking `14 hari` re-runs the query with the correct dates
- the custom range inputs do not apply automatically
- clicking `Terapkan rentang` updates the query only when both dates are valid

Example assertion shapes:

```ts
fireEvent.click(screen.getByRole("button", { name: /14 hari/i }));

await waitFor(() =>
  expect(mockGetPersonalWeaknessDiagnosis).toHaveBeenLastCalledWith(
    expect.objectContaining({
      dateFrom: "2026-04-26",
      dateTo: "2026-05-09",
    }),
  ),
);
```

```ts
fireEvent.change(screen.getByLabelText(/tanggal mulai/i), {
  target: { value: "2026-05-01" },
});
fireEvent.change(screen.getByLabelText(/tanggal akhir/i), {
  target: { value: "2026-05-07" },
});
fireEvent.click(screen.getByRole("button", { name: /terapkan rentang/i }));
```

- [ ] **Step 2: Run the page test to verify it fails**

Run:

```bash
npm run test -- --run src/pages/app/analytics-page.test.tsx
```

Expected: FAIL because no diagnosis range controls exist yet.

- [ ] **Step 3: Build the range-controls component**

Create `src/components/diagnosis/diagnosis-range-controls.tsx` with:

- three preset buttons
- two `<input type="date">` fields for custom input
- one apply button
- a compact active-range label

Recommended props:

```ts
type DiagnosisRangeControlsProps = {
  draftRange: DiagnosisRangeDraft;
  appliedRange: DiagnosisRangeDraft;
  onSelectPreset: (preset: "7d" | "14d" | "30d") => void;
  onDraftChange: (next: DiagnosisRangeDraft) => void;
  onApplyCustomRange: () => void;
  isApplying: boolean;
};
```

Use existing visual primitives such as `SurfacePanel` and the current button styling direction from the page.

- [ ] **Step 4: Integrate the range controls into the page**

In `src/pages/app/analytics-page.tsx`:

- keep both `draftRange` and `appliedRange` in local state
- presets should update both draft and applied state immediately
- custom input should only update draft state until the apply button is clicked
- disable the apply button when `toAppliedDiagnosisRange(draftRange)` returns `null`

- [ ] **Step 5: Re-run the page test**

Run:

```bash
npm run test -- --run src/pages/app/analytics-page.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/diagnosis/diagnosis-range-controls.tsx src/pages/app/analytics-page.tsx src/pages/app/analytics-page.test.tsx
git commit -m "feat: add diagnosis date range controls"
```

### Task 4: Implement diagnosis-specific loading, empty, basic, and error states

**Files:**
- Modify: `src/pages/app/analytics-page.tsx`
- Modify: `src/pages/app/analytics-page.test.tsx`
- Reference: `src/components/ui/state-panel.tsx`
- Reference: `src/components/ui/section-heading.tsx`

- [ ] **Step 1: Extend the page test for diagnosis modes**

Replace the old analytics-state assertions with diagnosis-specific expectations:

- loading state says the diagnosis is being prepared
- empty state explains there are no eligible large try outs in the selected range
- basic mode shows summary + global behavior patterns + readiness message, without subtopic ranking
- error state uses diagnosis-specific language

Example assertions:

```ts
expect(
  await screen.findByRole("heading", { name: /belum ada diagnosis untuk rentang ini/i }),
).toBeInTheDocument();

expect(
  screen.getByRole("link", { name: /mulai try out besar/i }),
).toHaveAttribute("href", "/app/tryout");
```

```ts
expect(screen.getByText(/diagnosis penuh terbuka setelah minimal 3 try out/i)).toBeInTheDocument();
expect(screen.queryByRole("heading", { name: /5 subtopik/i })).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the page test to verify it fails**

Run:

```bash
npm run test -- --run src/pages/app/analytics-page.test.tsx
```

Expected: FAIL because the page still renders placeholders or legacy-state copy.

- [ ] **Step 3: Replace legacy state panels with diagnosis-state panels**

In `src/pages/app/analytics-page.tsx`:

- update the page heading to:
  - eyebrow: `Diagnosis hasil try out`
  - title: `Diagnosis Kelemahan`
  - description that explains eligible large try outs within the chosen range
- use `StatePanel` for:
  - `loading`
  - `error`
  - `empty`
- use inline section rendering for `basic`

For `basic` mode, render:

- a compact summary card
- the global behavior panel
- a readiness panel that says full diagnosis requires at least 3 eligible attempts

Do not render the subtopic ranking section in `basic`.

- [ ] **Step 4: Re-run the page test**

Run:

```bash
npm run test -- --run src/pages/app/analytics-page.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/app/analytics-page.tsx src/pages/app/analytics-page.test.tsx
git commit -m "feat: add diagnosis mode states"
```

## Chunk 3: Full Diagnosis Sections

### Task 5: Build the weakest-subtopic hero and global behavior detail panel

**Files:**
- Create: `src/components/diagnosis/diagnosis-hero-card.tsx`
- Create: `src/components/diagnosis/global-behavior-panel.tsx`
- Modify: `src/pages/app/analytics-page.tsx`
- Modify: `src/pages/app/analytics-page.test.tsx`

- [ ] **Step 1: Extend the page test for full-mode hero rendering**

Add a `full` diagnosis fixture and assert that the page renders:

- the weakest subtopic as the main hero
- accuracy and confidence in the hero
- compact global behavior chips in the hero
- the separate global behavior detail card below it

Example assertions:

```ts
expect(
  await screen.findByText(/subtopik paling lemah/i),
).toBeInTheDocument();

expect(screen.getByRole("heading", { name: /kardiologi/i })).toBeInTheDocument();
expect(screen.getByText(/akurasi 42%/i)).toBeInTheDocument();
expect(screen.getByText(/confidence tinggi/i)).toBeInTheDocument();
expect(screen.getAllByText(/sering ragu-ragu/i)).not.toHaveLength(0);
expect(screen.getByText(/pola yang paling sering muncul/i)).toBeInTheDocument();
```

- [ ] **Step 2: Run the page test to verify it fails**

Run:

```bash
npm run test -- --run src/pages/app/analytics-page.test.tsx
```

Expected: FAIL because the full-mode hero and behavior panel do not exist yet.

- [ ] **Step 3: Create the hero and behavior components**

Create `src/components/diagnosis/diagnosis-hero-card.tsx` that accepts:

```ts
type DiagnosisHeroCardProps = {
  weakestSubtopic: PersistedDiagnosisSubtopicRanking;
  narrative: PersistedDiagnosisNarrative;
  behaviorPatterns: PersistedDiagnosisBehaviorPattern[];
};
```

Render:

- hero label
- topic name as the largest text
- narrative headline/body
- supporting metric row with accuracy, confidence, and question count or attempt coverage
- compact chips from `behaviorPatterns.slice(0, 4)`

Create `src/components/diagnosis/global-behavior-panel.tsx` that accepts:

```ts
type GlobalBehaviorPanelProps = {
  title?: string;
  patterns: PersistedDiagnosisBehaviorPattern[];
};
```

Render each pattern's label, severity, evidence, and description in one analytical but readable card.

- [ ] **Step 4: Integrate the full-mode top section**

In `src/pages/app/analytics-page.tsx`:

- derive `const weakestSubtopic = diagnosis.subtopicRankings[0] ?? null`
- when `diagnosis.summary.diagnosisMode === "full"` and a weakest item exists:
  - render `DiagnosisHeroCard`
  - render `GlobalBehaviorPanel` directly beneath it

- [ ] **Step 5: Re-run the page test**

Run:

```bash
npm run test -- --run src/pages/app/analytics-page.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/diagnosis/diagnosis-hero-card.tsx src/components/diagnosis/global-behavior-panel.tsx src/pages/app/analytics-page.tsx src/pages/app/analytics-page.test.tsx
git commit -m "feat: add diagnosis hero and behavior panel"
```

### Task 6: Add top-5 rankings, "Lihat semua", and inline card expansion

**Files:**
- Create: `src/components/diagnosis/subtopic-ranking-list.tsx`
- Create: `src/components/diagnosis/subtopic-ranking-list.test.tsx`
- Modify: `src/pages/app/analytics-page.tsx`
- Modify: `src/pages/app/analytics-page.test.tsx`

- [ ] **Step 1: Write the failing ranking-list component test**

Create `src/components/diagnosis/subtopic-ranking-list.test.tsx` to verify:

- only the first 5 items are visible by default
- clicking `Lihat semua` reveals the remaining items inline
- clicking `Tampilkan lebih sedikit` collapses the remainder
- clicking a subtopic card toggle reveals the summary and supporting metrics inline

Example assertions:

```ts
expect(screen.getByText(/respirasi dan pernafasan/i)).toBeInTheDocument();
expect(screen.queryByText(/farmakoekonomi/i)).not.toBeInTheDocument();

fireEvent.click(screen.getByRole("button", { name: /lihat semua/i }));

expect(screen.getByText(/farmakoekonomi/i)).toBeInTheDocument();
expect(screen.getByRole("button", { name: /tampilkan lebih sedikit/i })).toBeInTheDocument();
```

```ts
fireEvent.click(screen.getByRole("button", { name: /lihat detail kardiologi/i }));
expect(screen.getByText(/akurasi paling rendah dan sering disertai pola terlalu lama/i)).toBeInTheDocument();
expect(screen.getByText(/rata-rata waktu 92 detik\\/soal/i)).toBeInTheDocument();
```

- [ ] **Step 2: Run the component test to verify it fails**

Run:

```bash
npm run test -- --run src/components/diagnosis/subtopic-ranking-list.test.tsx
```

Expected: FAIL because the component does not exist yet.

- [ ] **Step 3: Build the ranking-list component**

Create `src/components/diagnosis/subtopic-ranking-list.tsx` with:

- `const topFive = rankings.slice(0, 5)`
- `const remaining = rankings.slice(5)`
- local state for:
  - `isExpanded`
  - `expandedTopicIds`

Recommended props:

```ts
type SubtopicRankingListProps = {
  rankings: PersistedDiagnosisSubtopicRanking[];
};
```

Collapsed card content should always show:

- rank
- topic name
- block name
- accuracy
- behavior flag chips
- confidence badge

Expanded content should show:

- backend `summary`
- average time per question
- attempt coverage count
- question count

- [ ] **Step 4: Re-run the component test**

Run:

```bash
npm run test -- --run src/components/diagnosis/subtopic-ranking-list.test.tsx
```

Expected: PASS

- [ ] **Step 5: Wire the ranking section into the page**

In `src/pages/app/analytics-page.tsx`, render the ranking section only in `full` mode:

```tsx
<SubtopicRankingList rankings={diagnosis.subtopicRankings} />
```

Also extend the page test with one full-mode assertion:

```ts
expect(screen.getByRole("heading", { name: /5 subtopik paling perlu diperhatikan/i })).toBeInTheDocument();
```

- [ ] **Step 6: Re-run the page and component tests**

Run:

```bash
npm run test -- --run src/pages/app/analytics-page.test.tsx src/components/diagnosis/subtopic-ranking-list.test.tsx
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/diagnosis/subtopic-ranking-list.tsx src/components/diagnosis/subtopic-ranking-list.test.tsx src/pages/app/analytics-page.tsx src/pages/app/analytics-page.test.tsx
git commit -m "feat: add diagnosis subtopic ranking interactions"
```

## Chunk 4: Cleanup And Verification

### Task 7: Remove all legacy analytics assumptions and verify the diagnosis page end to end

**Files:**
- Modify: `src/pages/app/analytics-page.tsx`
- Modify: `src/pages/app/analytics-page.test.tsx`
- Reference: `src/lib/api/analytics-api.test.ts`

- [ ] **Step 1: Add a final regression test against legacy sections**

Update `src/pages/app/analytics-page.test.tsx` with explicit negative assertions so the route no longer renders:

- `Analisis pola belajar`
- `Akurasi per blok`
- `Peringkat topik yang perlu diulang`
- `Cara pakai hasil ini`

Example assertions:

```ts
expect(screen.queryByRole("heading", { name: /akurasi per blok/i })).not.toBeInTheDocument();
expect(screen.queryByRole("heading", { name: /cara pakai hasil ini/i })).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the page test to verify it fails if any legacy section remains**

Run:

```bash
npm run test -- --run src/pages/app/analytics-page.test.tsx
```

Expected: FAIL if any old analytics content still leaks through, otherwise PASS and continue to implementation cleanup.

- [ ] **Step 3: Remove legacy imports, variables, and layout**

In `src/pages/app/analytics-page.tsx`:

- delete imports tied only to the old analytics page:
  - `ChartLineUp`
  - `Pulse`
  - `TrendDown`
  - `TrendUp`
  - `MetricPill`
  - `getStudentAnalytics`
- remove all old block-based and rules-insight sections
- keep the route visually coherent on desktop and mobile after the removals

- [ ] **Step 4: Run focused verification**

Run:

```bash
npm run test -- --run src/lib/diagnosis-date-range.test.ts src/components/diagnosis/subtopic-ranking-list.test.tsx src/pages/app/analytics-page.test.tsx
```

Expected: PASS

- [ ] **Step 5: Run broader frontend verification**

Run:

```bash
npm run test -- --run src/lib/api/analytics-api.test.ts src/lib/mappers/analytics-mappers.test.ts src/pages/app/analytics-page.test.tsx
```

Expected: PASS

- [ ] **Step 6: Optional browser smoke check**

Run the app:

```bash
npm run dev
```

Then open the route in the Codex in-app browser and verify:

- the page opens on `/app/analytics`
- default range is the last 7 days
- preset switching keeps the previous diagnosis visible while refetching
- `basic` mode hides the ranking
- `full` mode shows hero, behavior panel, top 5, and inline expansion

- [ ] **Step 7: Commit**

```bash
git add src/lib/diagnosis-date-range.ts src/lib/diagnosis-date-range.test.ts src/components/diagnosis/diagnosis-range-controls.tsx src/components/diagnosis/diagnosis-hero-card.tsx src/components/diagnosis/global-behavior-panel.tsx src/components/diagnosis/subtopic-ranking-list.tsx src/components/diagnosis/subtopic-ranking-list.test.tsx src/pages/app/analytics-page.tsx src/pages/app/analytics-page.test.tsx
git commit -m "feat: replace analytics page with diagnosis ui"
```

## Execution Notes

- Keep the backend contract authoritative. Do not recreate diagnosis scoring logic in the UI.
- Prefer page-level orchestration plus focused presentational components over a single oversized route file.
- If the component surface starts growing, split only where the interface boundary is obvious. Avoid premature abstraction.
- Use the TanStack Query patterns documented in the UI spec:
  - filtered query keys
  - `enabled` for session/range readiness
  - `placeholderData` to keep the previous visible result while a new date range is loading
- Preserve the current route path, shell, and navigation state. This iteration is a content replacement, not an information-architecture rewrite.
