# Review Detail Score Summary Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan ringkasan mini `Skor`, `Jawaban benar`, `Jawaban salah`, dan `Tanggal submit` pada halaman detail pembahasan untuk `tryout` dan `try out terjadwal`, tanpa mengubah scoring, route, atau flow hasil yang sudah ada.

**Architecture:** Implementasi dibatasi pada kontrak data review detail dan rendering `review-page`. Pendekatannya adalah menambahkan `summary` langsung ke payload review detail di dua source API (`tryout` dan `scheduled`), menjaga `review-api` sebagai facade tunggal, lalu merender panel ringkasan di detail page sebelum filter `Hanya jawaban salah`. Semua perubahan dikunci dengan TDD dari mapper/API/page sebelum implementasi UI.

**Tech Stack:** React, TypeScript, React Router, TanStack Query, Vitest, Testing Library, reusable UI primitives internal (`SectionHeading`, `SurfacePanel`, `MetricPill`, `StatePanel`)

---

## Chunk 1: Shared Review-Detail Contract

### File Map

**Files:**
- Modify: `src/lib/mappers/tryout-mappers.ts`
- Modify: `src/lib/mappers/scheduled-tryout-mappers.ts`
- Modify: `src/lib/api/tryout-api.ts`
- Modify: `src/lib/api/scheduled-tryout-api.ts`
- Modify: `src/lib/api/review-api.ts`
- Modify: `src/lib/api/tryout-api.test.ts`
- Modify: `src/lib/api/scheduled-tryout-api.test.ts`
- Modify: `src/lib/api/review-api.test.ts`
- Modify: `src/pages/app/review-page.tsx`
- Modify: `src/pages/app/review-page.test.tsx`
- Reference: `docs/superpowers/specs/2026-06-26-review-detail-score-summary-design.md`

**Responsibilities:**
- `src/lib/mappers/tryout-mappers.ts`
  Menetapkan bentuk `TryoutReviewPageData` baru yang memuat `summary` dan `items`.
- `src/lib/mappers/scheduled-tryout-mappers.ts`
  Menetapkan bentuk `ScheduledTryoutReviewPageData` yang sejajar dengan source `tryout`.
- `src/lib/api/tryout-api.ts`
  Mengambil metadata hasil submit dan membangun summary review untuk source `tryout`.
- `src/lib/api/scheduled-tryout-api.ts`
  Mengambil metadata hasil submit dan membangun summary review untuk source `scheduled`.
- `src/lib/api/review-api.ts`
  Menjaga facade tunggal tanpa query tambahan di page layer.
- `src/pages/app/review-page.tsx`
  Merender panel summary di mode detail sebelum filter dan daftar item pembahasan.
- `src/pages/app/review-page.test.tsx`
  Mengunci bahwa summary muncul untuk dua source dan filter wrong-only tetap stabil.

### Task 1: Lock the shared detail-review shape in tests first

**Files:**
- Modify: `src/lib/api/review-api.test.ts`
- Modify: `src/lib/api/tryout-api.test.ts`
- Modify: `src/lib/api/scheduled-tryout-api.test.ts`

- [ ] **Step 1: Add a failing review-api test for the enriched detail payload**

Update `src/lib/api/review-api.test.ts` so `getReviewDetailData(...)` expects:
- `summary.title`
- `summary.submittedAt`
- `summary.score`
- `summary.correctAnswers`
- `summary.wrongAnswers`
- `summary.source`
- existing `items`

Use the scheduled-detail branch first because it already has a dedicated source test.

- [ ] **Step 2: Add a failing tryout-api test for summary plus items**

Expand the existing `getAttemptReviewPageData()` contract test in `src/lib/api/tryout-api.test.ts` so it expects:
- a `summary` block with `title`, `submittedAt`, `score`, `correctAnswers`, `wrongAnswers`, `source: "tryout"`
- the existing `items` array unchanged

Use submitted attempt/result metadata that is already realistic for the existing tryout mocks.

- [ ] **Step 3: Add a failing scheduled-tryout-api test for summary plus items**

Add or expand a test in `src/lib/api/scheduled-tryout-api.test.ts` so `getScheduledAttemptReviewPageData()` returns:
- `summary.title`
- `summary.submittedAt`
- `summary.score`
- `summary.correctAnswers`
- `summary.wrongAnswers`
- `summary.source: "scheduled"`
- existing `items`

Keep the existing guard test that rejects non-submitted scheduled attempts.

- [ ] **Step 4: Run the three focused API test files and confirm they fail for the new contract**

Run:

```bash
npx.cmd vitest run src/lib/api/review-api.test.ts src/lib/api/tryout-api.test.ts src/lib/api/scheduled-tryout-api.test.ts
```

Expected:
- the new assertions fail because `summary` does not exist yet
- current review-item behavior still passes where unaffected

- [ ] **Step 5: Commit the failing contract tests**

```bash
git add src/lib/api/review-api.test.ts src/lib/api/tryout-api.test.ts src/lib/api/scheduled-tryout-api.test.ts
git commit -m "test: lock review detail summary contract"
```

---

## Chunk 2: Tryout Review Summary Data

### Task 2: Implement the tryout review-detail summary

**Files:**
- Modify: `src/lib/mappers/tryout-mappers.ts`
- Modify: `src/lib/api/tryout-api.ts`
- Test: `src/lib/api/tryout-api.test.ts`

- [ ] **Step 1: Extend the tryout review-page data type with `summary`**

Update `TryoutReviewPageData` in `src/lib/mappers/tryout-mappers.ts` so it includes:

```ts
summary: {
  title: string;
  submittedAt: string | null;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  source: "tryout";
}
```

Keep `items` exactly as they are today.

- [ ] **Step 2: Update the tryout review mapper to accept the summary input**

Modify `mapAttemptReviewPageData(...)` so it accepts a `summary` input object and returns it unchanged except for the enforced `source: "tryout"` contract.

Do not add formatting logic in the mapper. Keep it data-only.

- [ ] **Step 3: Read the submitted attempt metadata needed for summary**

In `src/lib/api/tryout-api.ts`, update `getAttemptReviewPageData(...)` to load:
- attempt title
- attempt submitted timestamp
- attempt result score
- attempt result correct count
- attempt result wrong count

Prefer existing tables/joins already used elsewhere in the same file:
- `attempts`
- `exam_templates`
- `attempt_results`

Do not add a new RPC for this.

- [ ] **Step 4: Build fallback-safe summary values**

In `getAttemptReviewPageData(...)`, ensure the returned summary falls back safely to:
- `title: "Try out"`
- `submittedAt: null`
- `score: 0`
- `correctAnswers: 0`
- `wrongAnswers: 0`

only when the backing data is missing.

- [ ] **Step 5: Re-run the focused tryout API test file**

Run:

```bash
npx.cmd vitest run src/lib/api/tryout-api.test.ts
```

Expected:
- the review-detail summary test passes
- unrelated tryout API tests remain green

- [ ] **Step 6: Commit the tryout review summary implementation**

```bash
git add src/lib/mappers/tryout-mappers.ts src/lib/api/tryout-api.ts src/lib/api/tryout-api.test.ts
git commit -m "feat: add tryout review detail summary"
```

---

## Chunk 3: Scheduled Review Summary Data

### Task 3: Implement the scheduled review-detail summary

**Files:**
- Modify: `src/lib/mappers/scheduled-tryout-mappers.ts`
- Modify: `src/lib/api/scheduled-tryout-api.ts`
- Test: `src/lib/api/scheduled-tryout-api.test.ts`

- [ ] **Step 1: Extend the scheduled review-page data type with `summary`**

Update `ScheduledTryoutReviewPageData` so it includes:

```ts
summary: {
  title: string;
  submittedAt: string | null;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  source: "scheduled";
}
```

Keep `items` unchanged.

- [ ] **Step 2: Update the scheduled review mapper to accept summary input**

Modify `mapScheduledAttemptReviewPageData(...)` so it returns:
- `summary`
- `items`

without moving formatting logic into the mapper.

- [ ] **Step 3: Load scheduled submitted metadata alongside review items**

In `src/lib/api/scheduled-tryout-api.ts`, update `getScheduledAttemptReviewPageData(...)` to fetch:
- attempt submit timestamp
- event title
- attempt result score percentage
- attempt result correct count
- attempt result wrong count

Do this using existing scheduled tables already used in the file:
- `scheduled_tryout_attempts`
- `scheduled_tryout_events`
- `scheduled_tryout_attempt_results`

Do not change the current guard that blocks non-submitted attempts.

- [ ] **Step 4: Build fallback-safe scheduled summary values**

Ensure summary defaults to:
- `title: "Try Out Terjadwal"`
- `submittedAt: null`
- `score: 0`
- `correctAnswers: 0`
- `wrongAnswers: 0`

only when the backing data is missing.

- [ ] **Step 5: Re-run the focused scheduled API test file**

Run:

```bash
npx.cmd vitest run src/lib/api/scheduled-tryout-api.test.ts
```

Expected:
- summary contract passes
- non-submitted guard test still passes
- session/result/editor tests stay green

- [ ] **Step 6: Commit the scheduled review summary implementation**

```bash
git add src/lib/mappers/scheduled-tryout-mappers.ts src/lib/api/scheduled-tryout-api.ts src/lib/api/scheduled-tryout-api.test.ts
git commit -m "feat: add scheduled review detail summary"
```

---

## Chunk 4: Review API Facade and Detail Page UI

### Task 4: Keep review-api simple and render the new summary in detail mode

**Files:**
- Modify: `src/lib/api/review-api.ts`
- Modify: `src/lib/api/review-api.test.ts`
- Modify: `src/pages/app/review-page.tsx`
- Modify: `src/pages/app/review-page.test.tsx`

- [ ] **Step 1: Keep `review-api` as a thin facade**

Update `getReviewDetailData(...)` typings in `src/lib/api/review-api.ts` only as needed so it returns the enriched payload from both sources.

Do not:
- add a second query for history
- merge list data into detail data in this file
- add source-specific shaping beyond dispatch selection

- [ ] **Step 2: Add a failing page test for tryout detail summary rendering**

In `src/pages/app/review-page.test.tsx`, update the default detail mock to include `summary`, then add assertions that detail mode renders:
- `Skor`
- `Jawaban benar`
- `Jawaban salah`
- `Tanggal submit`
- the actual summary values

Scope the assertions to detail mode, not history list mode.

- [ ] **Step 3: Add a failing page test for scheduled detail summary rendering**

Use `/app/review/scheduled-attempt-1?source=scheduled` and assert the same summary panel appears for source `scheduled`.

Ensure the test still verifies `getReviewDetailData({ attemptId, source: "scheduled" })`.

- [ ] **Step 4: Add a failing page test that the summary survives wrong-only filtering**

Toggle `Hanya jawaban salah` and assert:
- the summary panel is still visible
- only the item list changes

- [ ] **Step 5: Implement the detail-mode summary panel in `review-page.tsx`**

Render the panel only in detail mode and only after review data has loaded.

Place it:
1. below `SectionHeading`
2. above the filter control
3. above the mapped review items

Keep it compact. This is not a second result hero.

- [ ] **Step 6: Reuse existing local date formatting**

Add or reuse one formatter in `src/pages/app/review-page.tsx` for `submittedAt` so the summary date presentation stays aligned with the existing history formatter.

If `submittedAt` is missing or invalid, render fallback text:

```text
Waktu submit belum tersedia
```

- [ ] **Step 7: Re-run the focused review API and page tests**

Run:

```bash
npx.cmd vitest run src/lib/api/review-api.test.ts src/pages/app/review-page.test.tsx
```

Expected:
- review-api routing tests pass
- detail summary renders for `tryout` and `scheduled`
- wrong-only filter still works
- loading/error/empty tests remain green

- [ ] **Step 8: Commit the facade and page changes**

```bash
git add src/lib/api/review-api.ts src/lib/api/review-api.test.ts src/pages/app/review-page.tsx src/pages/app/review-page.test.tsx
git commit -m "feat: show score summary in review detail"
```

---

## Chunk 5: Final Verification

### Task 5: Verify the batch stays inside review-detail summary scope

**Files:**
- Verify: `src/lib/mappers/tryout-mappers.ts`
- Verify: `src/lib/mappers/scheduled-tryout-mappers.ts`
- Verify: `src/lib/api/tryout-api.ts`
- Verify: `src/lib/api/scheduled-tryout-api.ts`
- Verify: `src/lib/api/review-api.ts`
- Verify: `src/pages/app/review-page.tsx`
- Verify: `src/lib/api/tryout-api.test.ts`
- Verify: `src/lib/api/scheduled-tryout-api.test.ts`
- Verify: `src/lib/api/review-api.test.ts`
- Verify: `src/pages/app/review-page.test.tsx`

- [ ] **Step 1: Run the focused verification suite**

Run:

```bash
npx.cmd vitest run src/lib/api/review-api.test.ts src/lib/api/tryout-api.test.ts src/lib/api/scheduled-tryout-api.test.ts src/pages/app/review-page.test.tsx
```

Expected:
- all review-detail summary tests pass
- no API regression appears in the touched files

- [ ] **Step 2: Run production build verification**

Run:

```bash
npm run build
```

Expected:
- successful production build

- [ ] **Step 3: Review diff scope**

Run:

```bash
git diff --stat HEAD~4..HEAD
git diff HEAD~4..HEAD -- src/lib/mappers/tryout-mappers.ts src/lib/mappers/scheduled-tryout-mappers.ts src/lib/api/tryout-api.ts src/lib/api/scheduled-tryout-api.ts src/lib/api/review-api.ts src/pages/app/review-page.tsx src/lib/api/tryout-api.test.ts src/lib/api/scheduled-tryout-api.test.ts src/lib/api/review-api.test.ts src/pages/app/review-page.test.tsx
```

Confirm:
- changes stay inside review-detail summary scope
- no result-page redesign sneaks in
- no submit/scoring logic changes sneak in
- no route target changes occur

- [ ] **Step 4: Capture the final workspace state**

Run:

```bash
git status --short
```

Expected:
- only intentional changes remain
- unrelated workspace edits are identified clearly before any merge or PR step

## Notes for Execution

- Use `@superpowers:executing-plans` if staying in one session.
- Keep all formatting logic in page/UI layer; keep mappers and APIs data-focused.
- Do not query review history from detail mode as a shortcut.
- Do not broaden this batch into result-page changes or new metrics beyond the approved mini summary.
