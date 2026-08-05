# Tryout Result And Review Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merapikan `tryout-result-page` dan `review-page` agar hasil tryout menjadi halaman keputusan utama dengan satu CTA review yang dominan, lalu review detail menjadi halaman tindak lanjut yang lebih mudah dibaca tanpa mengubah scoring, API, atau routing utama.

**Architecture:** Batch ini dibatasi pada dua halaman student flow: `src/pages/app/tryout-result-page.tsx` dan `src/pages/app/review-page.tsx`, plus kontrak test-nya. Pendekatan dilakukan dengan TDD: kunci dulu hierarchy baru di test, lalu refactor result page menjadi `result-first` dengan CTA review yang tegas, setelah itu rapikan review detail menjadi `question -> status -> user answer -> correct answer -> explanation` sambil menjaga history list, wrong-only filter, source scheduled, dan route target tetap stabil.

**Tech Stack:** React, TypeScript, React Router, TanStack Query, Vitest, Testing Library, Tailwind utility classes, reusable UI primitives internal (`SectionHeading`, `SurfacePanel`, `MetricPill`, `StatePanel`, `Button`)

---

## Chunk 1: Scope, File Map, and Result-Page Test Contract

### File Map

**Files:**
- Modify: `src/pages/app/tryout-result-page.tsx`
- Modify: `src/pages/app/tryout-result-page.test.tsx`
- Modify: `src/pages/app/review-page.tsx`
- Modify: `src/pages/app/review-page.test.tsx`
- Create only if the detail branch becomes too large to reason about: `src/pages/app/review-detail-item.tsx`
- Verify only unless route-level expectations actually change: `src/router/app-router.test.tsx`
- Reference only: `docs/superpowers/specs/2026-06-23-tryout-result-review-hierarchy-design.md`
- Reference only: `src/components/ui/section-heading.tsx`
- Reference only: `src/components/ui/surface-panel.tsx`
- Reference only: `src/components/ui/metric-pill.tsx`
- Reference only: `src/components/ui/button.tsx`

**Responsibilities:**
- `src/pages/app/tryout-result-page.tsx`
  Menjadikan skor, insight singkat, dan CTA `Review jawaban` sebagai hierarchy utama di halaman hasil tanpa menyentuh query, mapper, atau route target.
- `src/pages/app/tryout-result-page.test.tsx`
  Mengunci contract result page baru: satu CTA primary ke review, urutan DOM yang mendukung CTA sebagai next step utama, dan state loading/error/empty tetap stabil.
- `src/pages/app/review-page.tsx`
  Merapikan review detail agar urutan baca per item lebih jelas, sambil menjaga list mode tetap ringan dan tidak menjadi target redesign besar.
- `src/pages/app/review-page.test.tsx`
  Mengunci contract review detail baru tanpa mengubah behavior `source=scheduled`, wrong-only filter, atau riwayat review.
- `src/router/app-router.test.tsx`
  Hanya disentuh bila wording heading route-level memang berubah dan membuat expectation lama tidak relevan.

### Task 1: Lock the result-page hierarchy contract in tests

**Files:**
- Modify: `src/pages/app/tryout-result-page.test.tsx`
- Reference: `docs/superpowers/specs/2026-06-23-tryout-result-review-hierarchy-design.md`

- [ ] **Step 1: Add a failing test for the single primary review CTA**

Update the existing main render test so it asserts:
- the dominant CTA label is now `Review jawaban`
- exactly one primary-styled action exists in the success state overall
- that single primary action points to `/app/review/attempt-1`
- the old `Buka pembahasan` wording is no longer the primary action on this page

Example target:

```tsx
const { container } = renderTryoutResult();
const reviewCtas = screen.getAllByRole("link", { name: /review jawaban/i });
const primaryActions = container.querySelectorAll('[data-variant="primary"]');

expect(reviewCtas).toHaveLength(1);
expect(primaryActions).toHaveLength(1);
expect(reviewCtas[0]).toHaveAttribute("href", "/app/review/attempt-1");
expect(reviewCtas[0]).toHaveAttribute("data-variant", "primary");
```

- [ ] **Step 2: Add a failing test for result-first reading order**

Add assertions that the result hero content comes before supporting detail sections in DOM order:
- score anchor appears before `Distribusi hasil`
- primary CTA appears before the supporting block heading
- the contract does not require a separate `Langkah berikutnya` panel, only that the hero-first order is preserved

Example target:

```tsx
const reviewLink = screen.getByRole("link", { name: /review jawaban/i });
const distributionHeading = screen.getByText(/distribusi hasil/i);

expect(reviewLink.compareDocumentPosition(distributionHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
```

- [ ] **Step 3: Add a failing test for short actionable insight copy**

Replace assertions tied to the current passive copy with expectations that the result page now renders:
- one concise summary sentence about the finished session
- one insight block or sentence that points toward review
- no dependency on new API fields

Lock a concrete fallback rule in the test contract:
- when one block has the highest `wrong` count, the rendered insight must mention that block label
- otherwise, the rendered insight must fall back to a generic review prompt such as `Review jawaban yang masih salah lebih dulu.`

With the current mock payload, the test should assert that the rendered insight mentions `Clinical Science`.

- [ ] **Step 4: Preserve loading, error, and empty-state coverage**

Keep the existing loading-state test and add or retain explicit expectations for:
- loading title and description
- error title and description
- empty title and description

The plan does not allow behavior changes to these states; only hierarchy and copy in the success path should move.

- [ ] **Step 5: Run the focused result-page test and confirm it fails for hierarchy reasons only**

Run:

```bash
npx.cmd vitest run src/pages/app/tryout-result-page.test.tsx
```

Expected:
- new CTA/hierarchy assertions fail
- existing query behavior still works
- state tests remain otherwise valid

- [ ] **Step 6: Commit the result-page test contract**

```bash
git add src/pages/app/tryout-result-page.test.tsx
git commit -m "test: lock tryout result hierarchy contract"
```

---

## Chunk 2: Result Hero, Insight, and Primary Review CTA

### Task 2: Make the result page decisive and action-first

**Files:**
- Modify: `src/pages/app/tryout-result-page.tsx`
- Test: `src/pages/app/tryout-result-page.test.tsx`

- [ ] **Step 1: Keep the existing query flow and derive any insight locally only**

Do not change:
- `findLatestSubmittedAttemptId`
- `getAttemptResultPageData`
- the `attempt` query-param behavior
- loading/error/empty branching

If an insight about the weakest block is shown, compute it inside the page from `resultData.blocks` only. Do not add a mapper, query field, helper API, or ranking contract.
If `resultData.blocks` is empty or tied for the highest `wrong` count, fall back to a generic review prompt instead of making a weak-block claim.

- [ ] **Step 2: Rebuild the success-path layout around a single result hero**

Refactor the successful render branch so the top-priority content block contains:
- session-finished status pill
- score anchor
- concise result summary
- concise next-step insight
- primary CTA `Review jawaban`

The hero should visually and semantically answer:
1. bagaimana hasil sesi ini
2. apa yang paling layak dilakukan setelah submit

- [ ] **Step 3: Move supporting stats below or beside the hero without competing with it**

Keep:
- `Jawaban benar`
- `Waktu terpakai`
- `Distribusi hasil`

Change:
- DOM order so score, summary, insight, and CTA all appear before every supporting detail block
- spacing and section framing so stats feel secondary
- copy length so supporting panels stay ringkas

For this batch, supporting detail means:
- `Jawaban benar`
- `Waktu terpakai`
- `Distribusi hasil`

These supporting blocks may sit beside the hero on wide screens, but in DOM/read order they must all come after the hero's score, summary, insight, and primary `Review jawaban` CTA.

Do not remove any existing numeric information from the payload.

- [ ] **Step 4: Rename the CTA without changing its route target**

Ensure the main CTA:
- uses label `Review jawaban`
- keeps `variant: "primary"`
- still links to `/app/review/${resultData.attemptId}`

Any secondary action or supportive instruction must remain visually quieter than this CTA.

- [ ] **Step 5: Re-run the focused result-page test**

Run:

```bash
npx.cmd vitest run src/pages/app/tryout-result-page.test.tsx
```

Expected:
- all result-page hierarchy tests pass
- no new failures appear from data-loading behavior

- [ ] **Step 6: Commit the result-page implementation**

```bash
git add src/pages/app/tryout-result-page.tsx src/pages/app/tryout-result-page.test.tsx
git commit -m "feat: strengthen tryout result hierarchy"
```

---

## Chunk 3: Review-Detail Test Contract

### Task 3: Lock the review-detail reading order without redesigning history list

**Files:**
- Modify: `src/pages/app/review-page.test.tsx`
- Reference: `docs/superpowers/specs/2026-06-23-tryout-result-review-hierarchy-design.md`

- [ ] **Step 1: Keep the review-history contract focused on route/source stability**

Retain the existing history-list test coverage for:
- mixed `scheduled` and `tryout` labels
- scheduled detail link with `?source=scheduled`
- outline CTA behavior in list mode

Do not expand this batch into a major history-list redesign contract.

- [ ] **Step 2: Add a failing test for review-detail item reading order**

In detail mode, assert that each rendered item presents content in this logical order:
1. question
2. correctness status
3. `Jawabanmu`
4. `Jawaban benar`
5. `Penjelasan`

Use DOM order assertions within a single rendered review item rather than only text presence checks.
Scope the assertions to one rendered review item with `within(...)` so repeated labels do not create ambiguous matches.

Example target:

```tsx
const reviewItem = (await screen.findByRole("heading", { name: /apa target tekanan darah pada ckd/i })).closest("article");
const scoped = within(reviewItem as HTMLElement);
const question = scoped.getByRole("heading", { name: /apa target tekanan darah pada ckd/i });
const status = scoped.getByText(/^perlu diulang$/i);
const userAnswerLabel = scoped.getByText(/^jawabanmu$/i);
const correctAnswerLabel = scoped.getByText(/^jawaban benar$/i);
const explanationLabel = scoped.getByText(/^penjelasan$/i);

expect(question.compareDocumentPosition(status)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
expect(status.compareDocumentPosition(userAnswerLabel)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
expect(userAnswerLabel.compareDocumentPosition(correctAnswerLabel)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
expect(correctAnswerLabel.compareDocumentPosition(explanationLabel)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
```

- [ ] **Step 3: Add a failing test for correctness status visibility**

Expand the scheduled-detail test so it verifies:
- wrong items show the exact text status `Perlu diulang`
- correct items show the exact text status `Sudah benar`
- status remains readable without relying on icon color alone

- [ ] **Step 4: Preserve wrong-only filter and mixed-media coverage**

Keep the existing filter test and ensure it still verifies:
- wrong-only filter hides correct items
- question images still render when present
- explanation images still render when present
- unanswered or null `userAnswer` content renders the exact fallback copy `Belum dijawab` if the item remains visible

- [ ] **Step 5: Preserve loading, error, and empty-state coverage for review mode**

Keep the existing tests for:
- history loading
- detail loading
- history error
- history empty
- detail error
- detail empty

- [ ] **Step 6: Run the focused review-page test and confirm it fails for hierarchy reasons only**

Run:

```bash
npx.cmd vitest run src/pages/app/review-page.test.tsx
```

Expected:
- new hierarchy assertions fail
- source routing and wrong-only behavior remain intact

- [ ] **Step 7: Commit the review-page test contract**

```bash
git add src/pages/app/review-page.test.tsx
git commit -m "test: lock review detail hierarchy contract"
```

---

## Chunk 4: Review Detail Readability and Stable Filtering

### Task 4: Rebuild review detail into a clearer study flow

**Files:**
- Modify: `src/pages/app/review-page.tsx`
- Test: `src/pages/app/review-page.test.tsx`

- [ ] **Step 1: Keep route mode branching and data-source behavior unchanged**

Do not change:
- `/app/review` list mode versus `/app/review/:attemptId` detail mode
- `source=scheduled` handling
- `listReviewHistory` call behavior
- `getReviewDetailData` call shape
- `showWrongOnly` filter semantics

- [ ] **Step 2: Keep list mode visually stable with only minor consistency cleanup if needed**

List mode may receive only small supporting adjustments if required for consistency, such as:
- shorter helper copy
- spacing cleanup

Do not turn list mode into the main redesign surface for this batch.
Keep the list-mode CTA label unchanged unless an existing test contract forces a minimal wording adjustment.

- [ ] **Step 3: Refactor each review item to follow the target reading order**

Adjust the detail-mode item layout so the DOM and visual hierarchy clearly present:
1. block label
2. question
3. text status
4. user answer panel
5. correct answer panel
6. explanation panel

If images are present:
- question images stay attached to the question block
- explanation images stay inside the explanation block after any explanation text

If the detail branch becomes too dense inside `src/pages/app/review-page.tsx`, extract a small presentational helper or local subcomponent such as `src/pages/app/review-detail-item.tsx` rather than growing the page component unchecked.

- [ ] **Step 4: Make null or missing answer content explicit without changing data**

If `item.userAnswer` is `null`, `undefined`, or an empty string, render the exact fallback copy `Belum dijawab` in the answer panel. This is a presentational fallback only; do not mutate the underlying data or filter behavior.

- [ ] **Step 5: Keep the wrong-only filter lightweight and accessible**

Maintain the current checkbox-based interaction, but ensure the label and layout still read as supporting controls rather than the page's dominant element. Keep the checkbox label accessible, preserve semantic heading order in the detail view, and do not move filter behavior into URL state or add new actions.

- [ ] **Step 6: Re-run the focused review-page test**

Run:

```bash
npx.cmd vitest run src/pages/app/review-page.test.tsx
```

Expected:
- all review-page tests pass
- scheduled source and wrong-only behavior stay green

- [ ] **Step 7: Commit the review-page implementation**

```bash
git add src/pages/app/review-page.tsx src/pages/app/review-page.test.tsx
git commit -m "feat: improve review detail readability"
```

---

## Chunk 5: Verification and Safe Integration

### Task 5: Verify the batch stays inside result/review UI scope

**Files:**
- Verify: `src/pages/app/tryout-result-page.tsx`
- Verify: `src/pages/app/tryout-result-page.test.tsx`
- Verify: `src/pages/app/review-page.tsx`
- Verify: `src/pages/app/review-page.test.tsx`
- Verify only if needed: `src/router/app-router.test.tsx`

- [ ] **Step 1: Run the focused page test suites**

Run:

```bash
npx.cmd vitest run --maxWorkers=1 src/pages/app/tryout-result-page.test.tsx src/pages/app/review-page.test.tsx
```

Expected:
- both page-level suites pass

- [ ] **Step 2: Run route coverage only if route-level wording or expectations changed**

Run:

```bash
npx.cmd vitest run --maxWorkers=1 src/pages/app/tryout-result-page.test.tsx src/pages/app/review-page.test.tsx src/router/app-router.test.tsx
```

Expected:
- page tests remain green
- route tests stay green without route behavior changes

- [ ] **Step 3: Run production build verification**

Run:

```bash
corepack pnpm build
```

Expected:
- successful production build

- [ ] **Step 4: Review diff scope**

Run:

```bash
git log --oneline -n 8
git diff --stat HEAD~4..HEAD
git diff HEAD~4..HEAD -- src/pages/app/tryout-result-page.tsx src/pages/app/tryout-result-page.test.tsx src/pages/app/review-page.tsx src/pages/app/review-page.test.tsx src/router/app-router.test.tsx
```

Confirm:
- the last four implementation commits belong to this batch
- only the two page files and their tests appear in the batch diff, plus `src/router/app-router.test.tsx` only if needed
- no subscription-page changes
- no payment-flow changes
- no query/helper/API contract changes
- no routing target changes for review CTA
- no scheduled result-page redesign sneaks into the diff

- [ ] **Step 5: Run a short manual accessibility smoke check**

Verify in the browser or a local rendered session that:
- the primary `Review jawaban` CTA receives a clear keyboard focus state
- heading order on the result page and review detail page stays semantik
- the `Hanya jawaban salah` checkbox can be focused and toggled with keyboard input

Expected:
- focus indicator is visible
- heading navigation remains logical
- filter interaction still works without a mouse

- [ ] **Step 6: Capture the final verification state**

```bash
git status --short
```

Expected:
- no unexpected files are modified
- any remaining changes are intentional follow-up fixes from verification only

## Notes for Execution

- Use `@superpowers:executing-plans` if staying in one session, or `@superpowers:subagent-driven-development` if the harness supports task workers.
- Keep copy short and actionable. Result page is decisive; review page is readable.
- Favor DOM order and section structure over decorative styling tricks.
- Reuse existing primitives before introducing new presentation helpers.
- Do not broaden this batch into subscription, payments, dashboard, or scheduled-result redesign work.
