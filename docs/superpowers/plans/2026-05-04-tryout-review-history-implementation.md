# Tryout Review History Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the tryout catalog hero and split review into a history hub plus attempt-specific review detail pages.

**Architecture:** Keep the current tryout attempt/result pipeline, add one small API for submitted-attempt history, retarget `/app/review` into a history page, and move the existing detail renderer onto `/app/review/:attemptId`. This keeps review data isolated per attempt while minimizing changes to scoring and submission flows.

**Tech Stack:** React 19, TypeScript, Vite, React Router v7, TanStack Query, Supabase, Vitest, React Testing Library

---

## File Structure

- Modify: `src/lib/api/tryout-api.ts`
- Modify: `src/lib/api/tryout-api.test.ts`
- Modify: `src/pages/app/tryout-catalog-page.tsx`
- Modify: `src/pages/app/review-page.tsx`
- Modify: `src/pages/app/review-page.test.tsx`
- Modify: `src/router/app-router.tsx`
- Modify: `src/router/app-router.test.tsx`

## Chunk 1: Review History Data Contract

### Task 1: Add submitted-attempt history API

**Files:**
- Modify: `src/lib/api/tryout-api.ts`
- Modify: `src/lib/api/tryout-api.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test for `listSubmittedAttemptHistory` that expects:

- submitted attempts only
- newest-first ordering by `submitted_at`
- title from the related template
- score, correct answers, and wrong answers from `attempt_results`

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/lib/api/tryout-api.test.ts`
Expected: FAIL because `listSubmittedAttemptHistory` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Implement a compact query in `src/lib/api/tryout-api.ts` that reads submitted attempts joined with template and result data, then maps the records into a simple history contract.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run src/lib/api/tryout-api.test.ts`
Expected: PASS

## Chunk 2: Review Routes and Detail Surface

### Task 2: Split review hub from review detail

**Files:**
- Modify: `src/pages/app/review-page.tsx`
- Modify: `src/pages/app/review-page.test.tsx`
- Modify: `src/router/app-router.tsx`
- Modify: `src/router/app-router.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add tests that expect:

- `/app/review` renders history-oriented copy and attempt cards
- `/app/review/attempt-1` renders the detailed pembahasan UI
- wrong-only filter still works on detail route
- router supports `/app/review/attempt-1`

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- --run src/pages/app/review-page.test.tsx src/router/app-router.test.tsx`
Expected: FAIL because `/app/review` still auto-loads detail and the route does not exist.

- [ ] **Step 3: Write minimal implementation**

Update routing and page logic so:

- `/app/review` becomes the history hub
- `/app/review/:attemptId` becomes the detail route
- existing detailed review renderer is preserved for the detail route
- history cards link into the detail route

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- --run src/pages/app/review-page.test.tsx src/router/app-router.test.tsx`
Expected: PASS

## Chunk 3: Remove Tryout Catalog Hero

### Task 3: Simplify the catalog surface

**Files:**
- Modify: `src/pages/app/tryout-catalog-page.tsx`

- [ ] **Step 1: Write the failing test**

Add a test that confirms the removed hero copy no longer appears in the tryout catalog.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/pages/app/tryout-catalog-page.test.tsx`
Expected: FAIL because the hero is still rendered.

- [ ] **Step 3: Write minimal implementation**

Remove the hero card and collapse the layout so the template cards render directly under the section heading.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run src/pages/app/tryout-catalog-page.test.tsx`
Expected: PASS

## Chunk 4: Final Verification

### Task 4: Re-run impacted verification

**Files:**
- No new files

- [ ] **Step 1: Run focused impacted tests**

Run:

```bash
npm run test -- --run src/lib/api/tryout-api.test.ts src/pages/app/review-page.test.tsx src/pages/app/tryout-catalog-page.test.tsx src/router/app-router.test.tsx
```

Expected: PASS

- [ ] **Step 2: Run broader student-app verification**

Run:

```bash
npm run test -- --run src/pages/app/dashboard-page.test.tsx src/pages/app/tryout-session-page.test.tsx
```

Expected: PASS

- [ ] **Step 3: Manual checkpoint**

Record that the workspace is not a git repository if commit is still unavailable, and summarize touched files for handoff.
