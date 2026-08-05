# Tryout Review History Design

Date: 2026-05-04
Status: Draft for user review

## 1. Summary

This design simplifies the `pro` tryout experience in two places:

1. remove the large simulation-first hero from the tryout catalog
2. change review from an auto-opened latest-attempt surface into a two-step flow:
   - user first sees submitted tryout history
   - user then opens review for one specific tryout attempt

The goal is to stop mixing review context across sessions and make each review page clearly belong to a single tryout.

## 2. Goals

### Primary Goals

- remove the oversized introductory panel from the tryout catalog
- make review and tryout history start from a list of submitted attempts
- keep each review page scoped to one tryout attempt
- preserve the existing detailed pembahasan UI once an attempt is opened

### Non-Goals

- changing scoring logic
- changing the tryout session engine
- redesigning analytics
- changing attempt submission or result generation

## 3. Scope

### In Scope

- remove the left hero card in the tryout catalog
- add a review history listing surface for submitted attempts
- add a dedicated review detail route for one attempt
- keep `Tampilkan salah saja` on the detail page
- update existing links so they target the right history or detail surface
- update tests for routing, API, and review behavior

### Out of Scope

- introducing pagination or advanced filtering for history
- merging analytics and review into one surface
- adding delete/archive behavior for attempts

## 4. Product Decisions Locked

- the tryout catalog should open directly into available tryout cards without a hero explainer
- `Review` in navigation should open a history hub, not the latest attempt automatically
- review detail should be one-attempt-only
- dashboard and result-page shortcuts may still deep-link to a specific attempt

## 5. Experience Design

### Tryout Catalog

`/app/tryout` should:

- keep the existing section heading
- remove the accent hero card with `Mulai dari simulasi`
- show the tryout cards immediately

### Review History Hub

`/app/review` becomes the history hub.

It should show:

- a list of submitted tryout attempts ordered from newest to oldest
- attempt title
- submitted time
- score summary
- correct and wrong counts
- a `Buka review` CTA per attempt

If no submitted attempts exist:

- show an empty state telling the user there is no tryout result to review yet

If loading or error happens:

- show dedicated history-focused loading and error states

### Review Detail

`/app/review/:attemptId` becomes the attempt-specific review detail page.

It should:

- keep the existing jawaban, jawaban benar, and pembahasan layout
- keep image support for soal and pembahasan
- keep the wrong-only filter
- make the heading clearly reflect that this is one submitted tryout

## 6. Routing Changes

### Keep

- `/app/tryout`
- `/app/tryout/session`
- `/app/tryout/result`

### Change

- `/app/review` changes from detail view to history hub

### Add

- `/app/review/:attemptId`

## 7. Data Model Direction

The current app already has enough core entities:

- `attempts`
- `attempt_results`
- `attempt_items`
- `answers`
- `exam_templates`

The new history hub needs a compact query that joins submitted attempts to:

- template title
- result snapshot

Recommended response shape:

- `attemptId`
- `title`
- `submittedAt`
- `score`
- `correctAnswers`
- `wrongAnswers`

The existing review-detail API can stay mostly intact and continue using `attemptId`.

## 8. Navigation and Link Behavior

- Product nav item `Review` should point to `/app/review`
- Result page CTA should point to `/app/review/:attemptId`
- Dashboard shortcut to latest result may keep pointing to the latest attempt detail when available
- Any generic review CTA without a known attempt should point to `/app/review`

## 9. Testing Strategy

Tests should cover:

- tryout catalog no longer renders the removed hero copy
- review history hub renders submitted attempts
- history hub empty/error/loading states
- review detail still renders mixed media pembahasan
- wrong-only filter still works on detail page
- routing supports `/app/review/:attemptId`
- API contract for submitted attempt history is stable
