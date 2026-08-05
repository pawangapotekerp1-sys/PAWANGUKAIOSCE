# Scheduled Tryout Catalog And Result Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merapikan `scheduled-tryout-catalog-page` dan `scheduled-tryout-result-page` agar katalog memakai hierarchy `resume-first`, CTA event aktif baru berubah menjadi `Mulai sekarang`, dan halaman hasil menjadikan `Review jawaban` sebagai aksi utama tanpa mengubah API, session runtime, leaderboard behavior, atau routing utama.

**Architecture:** Batch ini dibatasi pada dua halaman student-facing scheduled tryout dan kontrak test-nya. Pendekatan dilakukan dengan TDD: kunci dulu contract hierarchy baru di test katalog, lalu implementasikan katalog `resume-first` dengan filtering event yang identik dengan resume; setelah itu kunci contract result page dan implementasikan hero hasil yang decisive dengan CTA `Review jawaban` sebelum detail pendukung. Perubahan dilakukan terutama di level page composition, bukan dengan merombak primitive UI bersama.

**Tech Stack:** React, TypeScript, React Router, TanStack Query, Vitest, Testing Library, Tailwind utility classes, reusable UI primitives internal (`SectionHeading`, `SurfacePanel`, `MetricPill`, `StatePanel`, `Button`)

---

## Chunk 1: Scope, File Map, and Catalog Test Contract

### File Map

**Files:**
- Modify: `src/pages/app/scheduled-tryout-catalog-page.tsx`
- Modify: `src/pages/app/scheduled-tryout-catalog-page.test.tsx`
- Modify: `src/pages/app/scheduled-tryout-result-page.tsx`
- Modify: `src/pages/app/scheduled-tryout-result-page.test.tsx`
- Verify only unless route-level expectations actually change: `src/router/app-router.test.tsx`
- Reference only: `docs/superpowers/specs/2026-06-23-scheduled-tryout-catalog-result-hierarchy-design.md`
- Reference only: `src/components/ui/section-heading.tsx`
- Reference only: `src/components/ui/surface-panel.tsx`
- Reference only: `src/components/ui/metric-pill.tsx`
- Reference only: `src/components/ui/button.tsx`

**Responsibilities:**
- `src/pages/app/scheduled-tryout-catalog-page.tsx`
  Menyusun ulang hierarchy katalog menjadi `resume-first`, memfilter kartu event yang identik dengan resume, dan menguatkan CTA `Mulai sekarang` tanpa menyentuh logic API atau event ordering.
- `src/pages/app/scheduled-tryout-catalog-page.test.tsx`
  Mengunci contract katalog baru: resume hero paling dominan, CTA aktif baru berubah, kartu disabled tetap aman, dan state matrix utama tetap stabil.
- `src/pages/app/scheduled-tryout-result-page.tsx`
  Menjadikan result page sebagai halaman keputusan dengan hero hasil dan CTA utama `Review jawaban`, sambil menjaga leaderboard sekunder dan detail pendukung muncul setelah hero.
- `src/pages/app/scheduled-tryout-result-page.test.tsx`
  Mengunci contract result hero baru, CTA `Review jawaban`, DOM order terhadap detail pendukung, dan state matrix hasil.
- `src/router/app-router.test.tsx`
  Hanya disentuh bila wording route-level expectation memang harus menyesuaikan heading/copy hasil akhir.

### Task 1: Lock the scheduled catalog hierarchy contract in tests

**Files:**
- Modify: `src/pages/app/scheduled-tryout-catalog-page.test.tsx`
- Reference: `docs/superpowers/specs/2026-06-23-scheduled-tryout-catalog-result-hierarchy-design.md`

- [ ] **Step 1: Add a failing test for the active-event CTA rename**

Update the existing main catalog render test so it asserts:
- event-active primary CTA label is now `Mulai sekarang`
- event-active CTA still points to `/app/scheduled-tryout/session?event=<id>`
- leaderboard CTA remains `outline`

Example target:

```tsx
const startLinks = screen.getAllByRole("link", { name: /mulai sekarang/i });

expect(startLinks[0]).toHaveAttribute("href", "/app/scheduled-tryout/session?event=event-1");
expect(startLinks.every((link) => link.getAttribute("data-variant") === "primary")).toBe(true);
```

- [ ] **Step 2: Add a failing test for resume-first DOM order**

Expand the active-attempt test so it asserts:
- resume hero appears before the remaining event grid in DOM order
- `Lanjutkan sesi` remains the only top-priority action when a resume exists
- the `Lanjutkan sesi` CTA anchor appears before the first remaining event heading/card in the rendered document
- the resume copy still explains the user can continue without starting over

Do not require a new route or wizard.

- [ ] **Step 3: Add a failing test for filtering the event tied to the resume**

Add a focused test where:
- `activeAttempt.eventId === "event-1"`
- catalog data still includes `event-1`, `event-2`, and `event-3` in that source order

Assert that:
- resume hero shows `TO Klinik Juni`
- the event list no longer renders a `Mulai sekarang` CTA for `event-1`
- `event-2` and `event-3` still remain available as new active events
- the rendered remaining-event order stays `event-2` before `event-3`, proving no client-side reordering beyond filtering

- [ ] **Step 4: Preserve disabled-card, loading, error, and empty-state coverage**

Keep or expand the current tests so they still verify:
- disabled start button when attempts are exhausted
- exhausted-attempt disabled CTA label stays `Mulai sesi`
- leaderboard stays accessible in the disabled card
- page heading remains visible in loading, error, and empty states
- loading state title and description
- error state title and description
- empty state title and description
- resume-only state does not force an extra empty grid assertion

- [ ] **Step 5: Run the focused catalog test and confirm it fails for hierarchy reasons only**

Run:

```bash
npx.cmd vitest run src/pages/app/scheduled-tryout-catalog-page.test.tsx
```

Expected:
- new CTA/hierarchy assertions fail
- source/query behavior remains intact
- state tests remain otherwise valid

- [ ] **Step 6: Commit the catalog test contract**

```bash
git add src/pages/app/scheduled-tryout-catalog-page.test.tsx
git commit -m "test: lock scheduled tryout catalog hierarchy contract"
```

---

## Chunk 2: Resume-First Scheduled Catalog

### Task 2: Make the scheduled catalog action-first

**Files:**
- Modify: `src/pages/app/scheduled-tryout-catalog-page.tsx`
- Test: `src/pages/app/scheduled-tryout-catalog-page.test.tsx`

- [ ] **Step 1: Keep the existing query flow and data ordering**

Do not change:
- `listScheduledTryoutCatalogEntries`
- `findActiveScheduledAttemptForUser`
- query keys
- event ordering from the mapped catalog source
- resume route target

Only filter out the card whose `item.id === activeAttempt.eventId` when a resume hero exists.

- [ ] **Step 2: Rebuild the success path around a stronger resume hero**

When `activeAttempt` exists:
- make the resume panel the most dominant content block
- keep `Lanjutkan sesi` as primary
- keep the copy concise and operational
- ensure the hero appears before the remaining event grid in DOM order

When `activeAttempt` does not exist:
- do not render a placeholder resume block
- let the active event grid become the primary surface

- [ ] **Step 3: Reframe event cards around `Mulai sekarang`**

Update the active event card treatment so:
- the primary CTA label becomes `Mulai sekarang`
- title and CTA read faster than the supporting metrics
- subtitle/status, description, question count, duration, attempts remaining, active window, and secondary leaderboard CTA all remain rendered for the surviving event cards
- leaderboard remains available but quieter than the start CTA
- disabled cards still show the disabled button and reason copy

Do not change route targets or disabled logic.

- [ ] **Step 4: Preserve catalog state matrix behavior**

Keep behavior consistent with the spec matrix:
- heading remains visible in all states
- loading state must not render the resume hero or stale resume CTA while data is still unresolved
- loading/error/empty states still replace the grid
- resume-only state shows the hero and does not require an extra empty grid
- disabled events still keep leaderboard active

- [ ] **Step 5: Re-run the focused catalog test**

Run:

```bash
npx.cmd vitest run src/pages/app/scheduled-tryout-catalog-page.test.tsx
```

Expected:
- all catalog tests pass
- no new failures appear in query/data behavior

- [ ] **Step 6: Commit the catalog implementation**

```bash
git add src/pages/app/scheduled-tryout-catalog-page.tsx src/pages/app/scheduled-tryout-catalog-page.test.tsx
git commit -m "feat: strengthen scheduled tryout catalog hierarchy"
```

---

## Chunk 3: Scheduled Result Test Contract

### Task 3: Lock the scheduled result hierarchy contract in tests

**Files:**
- Modify: `src/pages/app/scheduled-tryout-result-page.test.tsx`
- Reference: `docs/superpowers/specs/2026-06-23-scheduled-tryout-catalog-result-hierarchy-design.md`

- [ ] **Step 1: Add a failing test for the primary review CTA**

Update the main result render test so it asserts:
- the dominant CTA label is now `Review jawaban`
- that CTA still points to `/app/review/scheduled-attempt-1?source=scheduled`
- it remains the single primary action in the result success state
- leaderboard remains `outline`

- [ ] **Step 2: Add a failing test for result-hero reading order**

Add assertions that:
- score anchor appears before supporting detail labels/sections
- `Review jawaban` appears before `Waktu terpakai`
- `Review jawaban` appears before `Jawaban benar`
- `Review jawaban` appears before `Distribusi hasil`
- `Review jawaban` appears before `Lihat leaderboard` when the secondary action is rendered
- the contract does not require a separate `Langkah berikutnya` panel, only a hero-first order

- [ ] **Step 3: Add a failing test for concise result hero copy**

Replace passive-copy assertions with expectations that the result page now renders:
- the exact hero summary `Hasil tryout sudah siap ditinjau`
- the exact short next-step line `Tinjau jawaban untuk melihat bagian yang perlu diperbaiki`
- no dependency on new API fields or leaderboard data
- a success-state variant where `eventId` is absent and `Lihat leaderboard` does not render

Keep the test focused on rendered behavior, not helper functions.

- [ ] **Step 4: Preserve loading, error, and empty-state coverage**

Keep or expand the current tests so they still verify:
- missing-attempt empty state
- loading state title and description
- error state title and description
- empty result state when the attempt exists but no result data is returned
- `Review jawaban` and `Lihat leaderboard` are absent in missing-attempt, loading, error, and no-result states

- [ ] **Step 5: Run the focused scheduled-result test and confirm it fails for hierarchy reasons only**

Run:

```bash
npx.cmd vitest run src/pages/app/scheduled-tryout-result-page.test.tsx
```

Expected:
- new CTA/hierarchy assertions fail
- state tests remain otherwise valid

- [ ] **Step 6: Commit the scheduled-result test contract**

```bash
git add src/pages/app/scheduled-tryout-result-page.test.tsx
git commit -m "test: lock scheduled tryout result hierarchy contract"
```

---

## Chunk 4: Scheduled Result Hero And Supporting Detail

### Task 4: Make the scheduled result page decisive and review-first

**Files:**
- Modify: `src/pages/app/scheduled-tryout-result-page.tsx`
- Test: `src/pages/app/scheduled-tryout-result-page.test.tsx`

- [ ] **Step 1: Keep the existing result query behavior unchanged**

Do not change:
- `getScheduledAttemptResultPageData`
- `attempt` query-param handling
- scheduled review route target semantics
- leaderboard URL parameters
- loading/error/empty branching

- [ ] **Step 2: Rebuild the success path around a single result hero**

Refactor the success render branch so the top-priority block contains:
- `Event selesai` pill
- score anchor
- required concise result summary
- required short CTA-oriented next-step copy that supports review
- primary CTA `Review jawaban`

The hero must answer:
1. bagaimana hasil event ini
2. tindakan terbaik setelah submit

- [ ] **Step 3: Move supporting detail after the hero**

Keep:
- `Jawaban benar`
- `Waktu terpakai`
- `Distribusi hasil`

Change:
- DOM order so these blocks come after score/summary/CTA
- leaderboard remains secondary, only appears if `eventId` exists, and sits after the supporting detail blocks instead of competing inside the hero
- no large competing warm panel should outrank the review CTA

- [ ] **Step 4: Preserve result state matrix behavior**

Keep the UI aligned with the spec matrix:
- no-attempt empty state should stay distinct from no-result-data empty state
- error state should not render the main CTAs
- success state should always prioritize `Review jawaban`

- [ ] **Step 5: Re-run the focused scheduled-result test**

Run:

```bash
npx.cmd vitest run src/pages/app/scheduled-tryout-result-page.test.tsx
```

Expected:
- all scheduled-result tests pass
- no new failures appear from state handling

- [ ] **Step 6: Commit the scheduled-result implementation**

```bash
git add src/pages/app/scheduled-tryout-result-page.tsx src/pages/app/scheduled-tryout-result-page.test.tsx
git commit -m "feat: strengthen scheduled tryout result hierarchy"
```

---

## Chunk 5: Verification And Safe Integration

### Task 5: Verify the batch stays inside scheduled catalog/result UI scope

**Files:**
- Verify: `src/pages/app/scheduled-tryout-catalog-page.tsx`
- Verify: `src/pages/app/scheduled-tryout-catalog-page.test.tsx`
- Verify: `src/pages/app/scheduled-tryout-result-page.tsx`
- Verify: `src/pages/app/scheduled-tryout-result-page.test.tsx`
- Verify only if needed: `src/router/app-router.test.tsx`

- [ ] **Step 1: Run the focused scheduled page test suites**

Run:

```powershell
npx.cmd vitest run --maxWorkers=1 src/pages/app/scheduled-tryout-catalog-page.test.tsx src/pages/app/scheduled-tryout-result-page.test.tsx
```

Expected:
- both scheduled page suites pass

- [ ] **Step 2: Run route coverage only if route-level expectations changed**

Only run this step if route-level assertions or route-visible copy actually changed. If no route test snapshots/assertions need adjustment, skip this step and note that the batch stayed page-local.

Run:

```powershell
npx.cmd vitest run --maxWorkers=1 src/pages/app/scheduled-tryout-catalog-page.test.tsx src/pages/app/scheduled-tryout-result-page.test.tsx src/router/app-router.test.tsx
```

Expected:
- page tests remain green
- route tests stay green without changing route behavior

- [ ] **Step 3: Run project-wide regression and build verification**

Run:

```powershell
npm.cmd test -- --run
npm.cmd run build
```

Expected:
- full test suite passes
- production build succeeds

- [ ] **Step 4: Review batch diff scope**

Run:

```powershell
git log --oneline -n 10
$BaseRef = git symbolic-ref --quiet refs/remotes/origin/HEAD 2>$null
if (-not $BaseRef) {
  foreach ($Candidate in @("origin/main", "origin/master")) {
    git rev-parse --verify $Candidate *> $null
    if ($LASTEXITCODE -eq 0) {
      $BaseRef = $Candidate
      break
    }
  }
}
if (-not $BaseRef) { throw "Set `$BaseRef to the shared integration branch before continuing this scope check." }
$BATCH_BASE_SHA = git merge-base HEAD $BaseRef
git diff --stat $BATCH_BASE_SHA..HEAD
git diff $BATCH_BASE_SHA..HEAD -- src/pages/app/scheduled-tryout-catalog-page.tsx src/pages/app/scheduled-tryout-catalog-page.test.tsx src/pages/app/scheduled-tryout-result-page.tsx src/pages/app/scheduled-tryout-result-page.test.tsx src/router/app-router.test.tsx
```

Confirm:
- the diff is reviewed against the batch base SHA instead of assuming a fixed commit count
- only scheduled catalog/result page files and their tests appear, plus `src/router/app-router.test.tsx` only if needed
- no session-page edits
- no leaderboard behavior changes
- no API or mapper changes
- no result/review branch regressions

- [ ] **Step 5: Run a short manual accessibility smoke check**

Start the local app first:

```powershell
npm.cmd run dev
```

Then verify in the browser or a local rendered session at:
- `/app/scheduled-tryout`
- open any completed scheduled-tryout result entry from `/app/scheduled-tryout`, then reuse the resulting URL in the form `/app/scheduled-tryout/result?attempt=<valid-attempt-id>`
- if the catalog page does not expose a completed-result entry but you are running against the same seeded local mock data used by the page tests, use `/app/scheduled-tryout/result?attempt=scheduled-attempt-1` as the direct verification URL

Use a local account or seeded dataset that exposes all of these states before marking this step complete:
- one resumeable scheduled attempt for `Lanjutkan sesi`
- one active event that still shows `Mulai sekarang`
- one exhausted event card with the disabled CTA
- one completed scheduled attempt that opens the result page

Use at least these viewport sizes:
- `390x844`
- `1440x900`

Verify that:
- resume hero CTA `Lanjutkan sesi` has a visible focus state
- event-active CTA `Mulai sekarang` has a visible focus state
- result-page CTA `Review jawaban` has a visible focus state
- disabled event cards still expose their explanatory text

Expected:
- focus indicator is visible on primary CTAs
- hierarchy remains readable on mobile and desktop widths
- disabled explanation remains readable
- if the required local data states are unavailable, record the exact missing state and keep this step open instead of silently skipping it

- [ ] **Step 6: Capture final verification state**

Run:

```powershell
git status --short
```

Expected:
- no unexpected files are modified
- any remaining changes are intentional verification follow-ups only

## Notes for Execution

- Use `@superpowers:subagent-driven-development` because the harness supports subagents.
- Keep implementation page-composition first; avoid modifying shared primitives unless a tiny accessibility/hierarchy adjustment is truly unavoidable.
- Do not add new client-side sorting logic for active events; only filter the event that matches `activeAttempt.eventId`.
- Keep CTA copy short and operational: `Lanjutkan sesi`, `Mulai sekarang`, `Review jawaban`.
