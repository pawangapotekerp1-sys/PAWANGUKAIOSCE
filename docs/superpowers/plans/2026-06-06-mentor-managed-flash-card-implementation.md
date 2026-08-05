# Mentor-Managed Flash Card Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mentor-managed `Flash Card` feature where mentors upload one transcript and one slide PDF, AI turns them into reviewable flash card drafts, mentors publish approved content, and all students consume published decks with guided recall ratings.

**Architecture:** Add a dedicated flash card domain across Supabase schema, Storage, and an Edge Function that handles transcript plus PDF extraction, OCR fallback, AI summarization, and draft persistence. Expose the domain through new mentor create/review routes and new student library/deck routes in the existing `/app` shell, while enforcing published-only visibility for students and cleaning up temporary source files after publish.

**Tech Stack:** React 19, React Router 7, TanStack React Query 5, TypeScript, Supabase Storage, Supabase Edge Functions on Deno, Supabase Postgres migrations, Vitest, Testing Library.

---

## File Structure

- Create: `supabase/migrations/20260606000040_flash_card_domain.sql`
  Responsibility: define flash card tables, indexes, RLS, and any helper RPCs needed for publish, cleanup, and student progress writes.
- Create: `supabase/migrations/20260606000040_flash_card_domain.test.ts`
  Responsibility: assert that the migration creates the expected tables, constraints, statuses, and access controls.
- Create: `supabase/functions/_shared/flash-card.ts`
  Responsibility: own transcript and PDF extraction helpers, OCR fallback wiring, AI prompt construction, output normalization, and schema validation helpers.
- Create: `supabase/functions/_shared/flash-card.test.ts`
  Responsibility: cover academic group mapping, output validation, file-type handling, and cleanup rules.
- Create: `supabase/functions/flash-card-generator/index.ts`
  Responsibility: implement mentor-only draft creation, processing, review fetch, review save, retry, publish, and source-file cleanup flows.
- Create: `supabase/functions/flash-card-generator/index.test.ts`
  Responsibility: cover role gating, input validation, processing success/failure, publish cleanup, and student-inaccessible draft behavior.
- Create: `src/lib/api/flash-card-api.ts`
  Responsibility: wrap browser calls to Storage and the `flash-card-generator` Edge Function.
- Create: `src/lib/api/flash-card-api.test.ts`
  Responsibility: verify request shapes, error normalization, and publish/progress action behavior.
- Create: `src/lib/mappers/flash-card-mappers.ts`
  Responsibility: map backend payloads into student library rows, student deck models, mentor list rows, and mentor review models.
- Create: `src/lib/mappers/flash-card-mappers.test.ts`
  Responsibility: verify status labels, academic grouping labels, card sorting, and difficulty mapping.
- Create: `src/components/flash-cards/flash-card-library-group.tsx`
  Responsibility: render one grouped student section for `Pharmaceutical Science`, `Clinical Science`, or `Social Behavioral and Administration`.
- Create: `src/components/flash-cards/flash-card-library-group.test.tsx`
  Responsibility: verify grouping and empty-state rendering.
- Create: `src/components/flash-cards/flash-card-viewer.tsx`
  Responsibility: render front/back card views, flip interaction, and previous/next navigation.
- Create: `src/components/flash-cards/flash-card-viewer.test.tsx`
  Responsibility: verify flip state, navigation, and card-boundary behavior.
- Create: `src/components/flash-cards/flash-card-recall-controls.tsx`
  Responsibility: render `mudah / sedang / sulit` actions and current saved state.
- Create: `src/components/flash-cards/flash-card-recall-controls.test.tsx`
  Responsibility: verify rating actions and selected-state rendering.
- Create: `src/components/flash-cards/flash-card-material-form.tsx`
  Responsibility: render mentor create form with title, academic group, transcript upload, and slide PDF upload.
- Create: `src/components/flash-cards/flash-card-material-form.test.tsx`
  Responsibility: verify required inputs and scan-PDF guidance text.
- Create: `src/components/flash-cards/flash-card-review-editor.tsx`
  Responsibility: render editable material summary, subtopic summaries, and card add/delete/edit controls.
- Create: `src/components/flash-cards/flash-card-review-editor.test.tsx`
  Responsibility: verify editing, add-card, delete-card, and status rendering behavior.
- Create: `src/pages/app/flash-cards-page.tsx`
  Responsibility: student library page grouped by the three academic clusters.
- Create: `src/pages/app/flash-card-deck-page.tsx`
  Responsibility: student deck page for one published subtopic.
- Create: `src/pages/app/flash-card-generator-page.tsx`
  Responsibility: mentor list page for flash card materials.
- Create: `src/pages/app/flash-card-generator-create-page.tsx`
  Responsibility: mentor create page for new draft uploads.
- Create: `src/pages/app/flash-card-generator-review-page.tsx`
  Responsibility: mentor review and publish page.
- Create: `src/pages/app/flash-cards-page.test.tsx`
  Responsibility: verify grouped student library rendering and published-only states.
- Create: `src/pages/app/flash-card-deck-page.test.tsx`
  Responsibility: verify viewer rendering and guided recall persistence hooks.
- Create: `src/pages/app/flash-card-generator-page.test.tsx`
  Responsibility: verify mentor list states and retry visibility.
- Create: `src/pages/app/flash-card-generator-create-page.test.tsx`
  Responsibility: verify create flow validation, upload CTA, and submit behavior.
- Create: `src/pages/app/flash-card-generator-review-page.test.tsx`
  Responsibility: verify mentor review editing and publish flow.
- Modify: `src/router/app-router.tsx`
  Responsibility: register student and mentor flash card routes.
- Modify: `src/router/route-guards.tsx`
  Responsibility: add a dedicated mentor flash card guard or extend the existing mentor-only pattern safely.
- Modify: `src/router/app-router.test.tsx`
  Responsibility: cover route visibility for mentor, student, admin, and anonymous users.
- Modify: `src/mocks/student-dashboard.ts`
  Responsibility: add `Flash Card` for student surfaces and `Flash Card Creator` for mentors.
- Optional create if local draft persistence becomes necessary: `src/lib/flash-card-review-draft.ts`
  Responsibility: hold unsaved mentor review edits in local storage without affecting published content.

## Chunk 1: Persistence and Domain Guardrails

### Task 1: Write failing migration tests for the flash card domain

**Files:**
- Create: `supabase/migrations/20260606000040_flash_card_domain.test.ts`

- [ ] Add a failing migration test that expects `flashcard_materials`, `flashcard_source_files`, `flashcard_subtopics`, `flashcard_cards`, and `student_flashcard_progress` to exist.
- [ ] Add a failing migration test that expects the material status enum or status constraint to allow only `draft`, `processing`, `ready_for_review`, `published`, and `failed`.
- [ ] Add a failing migration test that expects student progress difficulty values to allow only `easy`, `medium`, and `hard`.
- [ ] Add a failing migration test that expects students to read only published material records.
- [ ] Run: `npx vitest run supabase/migrations/20260606000040_flash_card_domain.test.ts`
- [ ] Confirm the suite fails because the migration does not exist yet.

### Task 2: Implement the flash card schema and RLS

**Files:**
- Create: `supabase/migrations/20260606000040_flash_card_domain.sql`
- Test: `supabase/migrations/20260606000040_flash_card_domain.test.ts`

- [ ] Define `flashcard_materials` with title, academic group, status, summary, processing error, creator, publish timestamp, and audit timestamps.
- [ ] Define `flashcard_source_files` with material linkage, source type, storage bucket/path, metadata, extraction status, and `delete_after_publish`.
- [ ] Define `flashcard_subtopics` with title, summary, sort order, and material linkage.
- [ ] Define `flashcard_cards` with front/back text, sort order, and subtopic linkage.
- [ ] Define `student_flashcard_progress` with `(user_id, card_id)` uniqueness, latest difficulty, and last reviewed timestamp.
- [ ] Add indexes for material lookup by creator and status, subtopic lookup by material, card lookup by subtopic, and progress lookup by user.
- [ ] Add RLS so mentors can manage their own draft materials, students can read only published materials, and students can write only their own progress rows.
- [ ] Re-run: `npx vitest run supabase/migrations/20260606000040_flash_card_domain.test.ts`
- [ ] Confirm the migration suite passes.

### Task 3: Write failing shared helper tests for extraction and AI normalization

**Files:**
- Create: `supabase/functions/_shared/flash-card.test.ts`

- [ ] Add a failing test that normalizes academic group input into the three supported internal values.
- [ ] Add a failing test that rejects AI output missing a global summary, subtopic title, subtopic summary, or card front/back text.
- [ ] Add a failing test that rejects empty subtopic lists or subtopics without cards.
- [ ] Add a failing test that distinguishes a text PDF path from a scan/photo PDF path so OCR fallback can be selected.
- [ ] Add a failing test that marks source files for deletion after successful publish.
- [ ] Run: `npx vitest run supabase/functions/_shared/flash-card.test.ts`
- [ ] Confirm the suite fails until the helper exists.

### Task 4: Implement shared flash card helpers

**Files:**
- Create: `supabase/functions/_shared/flash-card.ts`
- Test: `supabase/functions/_shared/flash-card.test.ts`

- [ ] Add academic group normalization helpers with user-facing and storage-safe values.
- [ ] Add AI response parsing and validation helpers for `global_summary`, `subtopics[]`, and `cards[]`.
- [ ] Add transcript and PDF source classification helpers so the function can choose text extraction first and OCR/vision fallback second.
- [ ] Add source-file cleanup helpers that produce the storage paths to delete after publish.
- [ ] Re-run: `npx vitest run supabase/functions/_shared/flash-card.test.ts`
- [ ] Confirm the helper suite passes.

### Task 5: Checkpoint the persistence slice

**Files:**
- No new files.

- [ ] Stage only the migration and shared flash card helper files.
- [ ] Commit:

```bash
git add supabase/migrations/20260606000040_flash_card_domain.sql supabase/migrations/20260606000040_flash_card_domain.test.ts supabase/functions/_shared/flash-card.ts supabase/functions/_shared/flash-card.test.ts
git commit -m "feat: add flash card domain schema"
```

## Chunk 2: Edge Function Processing and Publish Cleanup

### Task 6: Write failing function tests for mentor processing and publish

**Files:**
- Create: `supabase/functions/flash-card-generator/index.test.ts`

- [ ] Add a failing test that rejects anonymous users and non-mentor roles from create, retry, save, and publish actions.
- [ ] Add a failing test that creates a material draft with one transcript source and one slide PDF source.
- [ ] Add a failing test that accepts a scan/photo PDF and routes it through the OCR/vision extraction path.
- [ ] Add a failing test that persists `ready_for_review` output with material summary, subtopics, and cards.
- [ ] Add a failing test that stores `failed` status with a practical error message if processing fails.
- [ ] Add a failing test that deletes source files after publish but preserves content tables.
- [ ] Run: `npx vitest run supabase/functions/flash-card-generator/index.test.ts`
- [ ] Confirm the suite fails because the function does not exist yet.

### Task 7: Implement the flash card Edge Function actions

**Files:**
- Create: `supabase/functions/flash-card-generator/index.ts`
- Modify: `supabase/functions/_shared/flash-card.ts`
- Test: `supabase/functions/flash-card-generator/index.test.ts`

- [ ] Implement a `create-material` action that validates title, academic group, and the presence of both source file records.
- [ ] Implement a `process-material` action that loads transcript and PDF sources, runs text extraction or OCR fallback, constructs the AI prompt, and persists a reviewable draft.
- [ ] Implement a `get-material` action that returns mentor review data with nested subtopics and cards.
- [ ] Implement an `update-material` action that saves mentor edits to material summary, subtopic summaries, and card content.
- [ ] Implement a `publish-material` action that marks the material published and deletes temporary Storage sources after successful state transition.
- [ ] Implement a `retry-processing` action that resets `failed` material state back through `processing`.
- [ ] Re-run: `npx vitest run supabase/functions/flash-card-generator/index.test.ts`
- [ ] Confirm the function suite passes.

### Task 8: Add output-quality guardrails stronger than prompt wording alone

**Files:**
- Modify: `supabase/functions/_shared/flash-card.ts`
- Modify: `supabase/functions/flash-card-generator/index.ts`
- Test: `supabase/functions/flash-card-generator/index.test.ts`

- [ ] Add a lightweight validation rule that rejects obviously thin AI output such as one-word summaries, duplicate card fronts, or subtopics with no usable distinction.
- [ ] Add a failing test first for a malformed-but-JSON-valid response, then implement the rejection.
- [ ] Return a practical mentor-facing message such as `Hasil AI belum cukup rapi untuk direview. Coba ulang proses atau gunakan file sumber yang lebih jelas.`
- [ ] Re-run: `npx vitest run supabase/functions/_shared/flash-card.test.ts supabase/functions/flash-card-generator/index.test.ts`
- [ ] Confirm both suites pass.

### Task 9: Checkpoint the backend processing slice

**Files:**
- No new files.

- [ ] Stage only the flash card function files.
- [ ] Commit:

```bash
git add supabase/functions/flash-card-generator/index.ts supabase/functions/flash-card-generator/index.test.ts supabase/functions/_shared/flash-card.ts supabase/functions/_shared/flash-card.test.ts
git commit -m "feat: add flash card processing function"
```

## Chunk 3: Frontend API, Routing, and Navigation

### Task 10: Write failing tests for API wrappers and route visibility

**Files:**
- Create: `src/lib/api/flash-card-api.test.ts`
- Create: `src/lib/mappers/flash-card-mappers.test.ts`
- Modify: `src/router/app-router.test.tsx`

- [ ] Add a failing API test for draft creation, mentor review fetch, mentor publish, student library fetch, student deck fetch, and student difficulty save.
- [ ] Add a failing mapper test for academic grouping labels and published-only student payload mapping.
- [ ] Add a failing route test that exposes `/app/flash-cards` to student-capable roles.
- [ ] Add a failing route test that exposes `/app/flash-card-generator/*` only to mentors and redirects disallowed users safely.
- [ ] Run: `npx vitest run src/lib/api/flash-card-api.test.ts src/lib/mappers/flash-card-mappers.test.ts src/router/app-router.test.tsx`
- [ ] Confirm the new cases fail because the API and routes are missing.

### Task 11: Implement the frontend API client and mappers

**Files:**
- Create: `src/lib/api/flash-card-api.ts`
- Create: `src/lib/mappers/flash-card-mappers.ts`
- Test: `src/lib/api/flash-card-api.test.ts`
- Test: `src/lib/mappers/flash-card-mappers.test.ts`

- [ ] Add API helpers for mentor actions: create material metadata, upload source file metadata, process material, fetch review data, save edits, retry processing, and publish.
- [ ] Add API helpers for student actions: list published subtopics by academic group, fetch one deck, and save difficulty rating.
- [ ] Normalize backend payloads into page-focused view models so pages do not need to understand raw nested Supabase output.
- [ ] Re-run: `npx vitest run src/lib/api/flash-card-api.test.ts src/lib/mappers/flash-card-mappers.test.ts`
- [ ] Confirm the API and mapper suites pass.

### Task 12: Register routes and navigation

**Files:**
- Modify: `src/router/app-router.tsx`
- Modify: `src/router/route-guards.tsx`
- Modify: `src/router/app-router.test.tsx`
- Modify: `src/mocks/student-dashboard.ts`

- [ ] Add student routes `/app/flash-cards` and `/app/flash-cards/:subtopicId`.
- [ ] Add mentor routes `/app/flash-card-generator`, `/app/flash-card-generator/new`, and `/app/flash-card-generator/:materialId`.
- [ ] Add a dedicated mentor flash card route guard or extend `QuestionGeneratorRouteGuard` logic into a reusable mentor-content guard if that is cleaner.
- [ ] Add `Flash Card` to the student-facing navigation.
- [ ] Add `Flash Card Creator` only for mentor navigation.
- [ ] Re-run: `npx vitest run src/router/app-router.test.tsx`
- [ ] Confirm route and nav tests pass.

### Task 13: Checkpoint routes and API plumbing

**Files:**
- No new files.

- [ ] Stage only the route, navigation, API, and mapper files.
- [ ] Commit:

```bash
git add src/lib/api/flash-card-api.ts src/lib/api/flash-card-api.test.ts src/lib/mappers/flash-card-mappers.ts src/lib/mappers/flash-card-mappers.test.ts src/router/app-router.tsx src/router/route-guards.tsx src/router/app-router.test.tsx src/mocks/student-dashboard.ts
git commit -m "feat: wire flash card routes and api"
```

## Chunk 4: Mentor Create and Review Surfaces

### Task 14: Write failing tests for mentor create and review UI

**Files:**
- Create: `src/components/flash-cards/flash-card-material-form.test.tsx`
- Create: `src/components/flash-cards/flash-card-review-editor.test.tsx`
- Create: `src/pages/app/flash-card-generator-create-page.test.tsx`
- Create: `src/pages/app/flash-card-generator-page.test.tsx`
- Create: `src/pages/app/flash-card-generator-review-page.test.tsx`

- [ ] Add a failing form test that requires title, academic group, transcript file, and slide PDF file.
- [ ] Add a failing form test that shows guidance that scan/photo PDFs are supported but need closer mentor review.
- [ ] Add a failing review-editor test that allows editing material summary, subtopic summary, card front, and card back.
- [ ] Add a failing review-editor test that allows adding and deleting cards.
- [ ] Add a failing page test that shows mentor material list statuses `Draft`, `Processing`, `Ready for review`, `Published`, and `Failed`.
- [ ] Add a failing review-page test that shows a `Publish` action only when the material is review-ready.
- [ ] Run: `npx vitest run src/components/flash-cards/flash-card-material-form.test.tsx src/components/flash-cards/flash-card-review-editor.test.tsx src/pages/app/flash-card-generator-page.test.tsx src/pages/app/flash-card-generator-create-page.test.tsx src/pages/app/flash-card-generator-review-page.test.tsx`
- [ ] Confirm the mentor UI suites fail.

### Task 15: Implement mentor material list and create form

**Files:**
- Create: `src/components/flash-cards/flash-card-material-form.tsx`
- Create: `src/pages/app/flash-card-generator-page.tsx`
- Create: `src/pages/app/flash-card-generator-create-page.tsx`
- Test: `src/components/flash-cards/flash-card-material-form.test.tsx`
- Test: `src/pages/app/flash-card-generator-page.test.tsx`
- Test: `src/pages/app/flash-card-generator-create-page.test.tsx`

- [ ] Build the mentor material list page with loading, empty, error, and status-rich rows.
- [ ] Build the create page with upload inputs, academic group selection, and submit CTA.
- [ ] Save draft metadata first, then hand off source upload and processing to the API layer.
- [ ] Show clear copy that the result is draft-first and invisible to students until publish.
- [ ] Re-run: `npx vitest run src/components/flash-cards/flash-card-material-form.test.tsx src/pages/app/flash-card-generator-page.test.tsx src/pages/app/flash-card-generator-create-page.test.tsx`
- [ ] Confirm the create/list suites pass.

### Task 16: Implement mentor review editing and publish flow

**Files:**
- Create: `src/components/flash-cards/flash-card-review-editor.tsx`
- Create: `src/pages/app/flash-card-generator-review-page.tsx`
- Test: `src/components/flash-cards/flash-card-review-editor.test.tsx`
- Test: `src/pages/app/flash-card-generator-review-page.test.tsx`

- [ ] Build the review editor with nested editing for material summary, subtopic summaries, and cards.
- [ ] Add card add/delete controls and any simple local reorder control only if it remains small and testable.
- [ ] Wire save actions to the mentor update API.
- [ ] Wire publish to the mentor publish API and redirect back to the mentor list page after success.
- [ ] Re-run: `npx vitest run src/components/flash-cards/flash-card-review-editor.test.tsx src/pages/app/flash-card-generator-review-page.test.tsx`
- [ ] Confirm the mentor review suites pass.

### Task 17: Checkpoint mentor surfaces

**Files:**
- No new files.

- [ ] Stage only the mentor UI files.
- [ ] Commit:

```bash
git add src/components/flash-cards/flash-card-material-form.tsx src/components/flash-cards/flash-card-material-form.test.tsx src/components/flash-cards/flash-card-review-editor.tsx src/components/flash-cards/flash-card-review-editor.test.tsx src/pages/app/flash-card-generator-page.tsx src/pages/app/flash-card-generator-page.test.tsx src/pages/app/flash-card-generator-create-page.tsx src/pages/app/flash-card-generator-create-page.test.tsx src/pages/app/flash-card-generator-review-page.tsx src/pages/app/flash-card-generator-review-page.test.tsx
git commit -m "feat: add mentor flash card workflow"
```

## Chunk 5: Student Library and Guided Recall

### Task 18: Write failing tests for student library and deck behavior

**Files:**
- Create: `src/components/flash-cards/flash-card-library-group.test.tsx`
- Create: `src/components/flash-cards/flash-card-viewer.test.tsx`
- Create: `src/components/flash-cards/flash-card-recall-controls.test.tsx`
- Create: `src/pages/app/flash-cards-page.test.tsx`
- Create: `src/pages/app/flash-card-deck-page.test.tsx`

- [ ] Add a failing group-component test that renders grouped subtopics under the expected academic heading.
- [ ] Add a failing viewer test that flips card front/back and handles first/last navigation safely.
- [ ] Add a failing recall-controls test that renders and updates `mudah / sedang / sulit`.
- [ ] Add a failing page test that renders published subtopics grouped by all three academic clusters.
- [ ] Add a failing deck-page test that loads one published subtopic deck and saves a difficulty rating through the API.
- [ ] Run: `npx vitest run src/components/flash-cards/flash-card-library-group.test.tsx src/components/flash-cards/flash-card-viewer.test.tsx src/components/flash-cards/flash-card-recall-controls.test.tsx src/pages/app/flash-cards-page.test.tsx src/pages/app/flash-card-deck-page.test.tsx`
- [ ] Confirm the student experience suites fail.

### Task 19: Implement student library and deck pages

**Files:**
- Create: `src/components/flash-cards/flash-card-library-group.tsx`
- Create: `src/components/flash-cards/flash-card-viewer.tsx`
- Create: `src/components/flash-cards/flash-card-recall-controls.tsx`
- Create: `src/pages/app/flash-cards-page.tsx`
- Create: `src/pages/app/flash-card-deck-page.tsx`
- Test: `src/components/flash-cards/flash-card-library-group.test.tsx`
- Test: `src/components/flash-cards/flash-card-viewer.test.tsx`
- Test: `src/components/flash-cards/flash-card-recall-controls.test.tsx`
- Test: `src/pages/app/flash-cards-page.test.tsx`
- Test: `src/pages/app/flash-card-deck-page.test.tsx`

- [ ] Build the grouped student library using the existing `ProductShell`, `SurfacePanel`, and `StatePanel` visual language.
- [ ] Build the deck viewer with card flip, next/previous navigation, and context summary for the current subtopic.
- [ ] Build the guided recall controls and persist the latest selected difficulty per student.
- [ ] Ensure unpublished or failed materials never appear in the student data model.
- [ ] Re-run: `npx vitest run src/components/flash-cards/flash-card-library-group.test.tsx src/components/flash-cards/flash-card-viewer.test.tsx src/components/flash-cards/flash-card-recall-controls.test.tsx src/pages/app/flash-cards-page.test.tsx src/pages/app/flash-card-deck-page.test.tsx`
- [ ] Confirm the student suites pass.

### Task 20: Checkpoint the student experience

**Files:**
- No new files.

- [ ] Stage only the student UI files.
- [ ] Commit:

```bash
git add src/components/flash-cards/flash-card-library-group.tsx src/components/flash-cards/flash-card-library-group.test.tsx src/components/flash-cards/flash-card-viewer.tsx src/components/flash-cards/flash-card-viewer.test.tsx src/components/flash-cards/flash-card-recall-controls.tsx src/components/flash-cards/flash-card-recall-controls.test.tsx src/pages/app/flash-cards-page.tsx src/pages/app/flash-cards-page.test.tsx src/pages/app/flash-card-deck-page.tsx src/pages/app/flash-card-deck-page.test.tsx
git commit -m "feat: add student flash card library"
```

## Chunk 6: Full Verification and Launch Readiness

### Task 21: Run focused automated verification

**Files:**
- No new files.

- [ ] Run: `npx vitest run supabase/migrations/20260606000040_flash_card_domain.test.ts supabase/functions/_shared/flash-card.test.ts supabase/functions/flash-card-generator/index.test.ts src/lib/api/flash-card-api.test.ts src/lib/mappers/flash-card-mappers.test.ts src/router/app-router.test.tsx src/components/flash-cards/flash-card-material-form.test.tsx src/components/flash-cards/flash-card-review-editor.test.tsx src/components/flash-cards/flash-card-library-group.test.tsx src/components/flash-cards/flash-card-viewer.test.tsx src/components/flash-cards/flash-card-recall-controls.test.tsx src/pages/app/flash-card-generator-page.test.tsx src/pages/app/flash-card-generator-create-page.test.tsx src/pages/app/flash-card-generator-review-page.test.tsx src/pages/app/flash-cards-page.test.tsx src/pages/app/flash-card-deck-page.test.tsx`
- [ ] Confirm all focused flash card tests pass.

### Task 22: Run build verification

**Files:**
- No new files.

- [ ] Run: `npm run build`
- [ ] Confirm there are no TypeScript, routing, or bundling regressions.

### Task 23: Perform manual product checks

**Files:**
- No new files.

- [ ] Start the app with `npm run dev`.
- [ ] Verify a mentor can create a draft from one transcript and one slide PDF.
- [ ] Verify the UI warns that scan/photo PDFs may need closer review.
- [ ] Verify processing failure keeps the draft row and exposes retry.
- [ ] Verify the review page can edit summaries and cards before publish.
- [ ] Verify publish makes the material appear in `/app/flash-cards`.
- [ ] Verify source files are cleaned up after publish succeeds.
- [ ] Verify a student can open a published deck and save `mudah`, `sedang`, or `sulit`.

### Task 24: Capture residual risks and handoff notes

**Files:**
- No new files.

- [ ] Summarize residual risks around OCR quality, large-file prompt sizes, and the inability to reprocess published content without re-uploading files.
- [ ] Confirm in the execution summary that the product enforces quality in three layers:
  - AI output validation
  - mentor review before publish
  - published-only student visibility

## Notes For Execution

- Use @test-driven-development throughout this plan. Build the feature red-green slice by slice instead of landing the whole stack at once.
- Keep the domain focused. Do not add spaced repetition scheduling, subtopic merge/split tools, or student generation flows in this implementation.
- Prefer the existing UI primitives and shell patterns instead of introducing a new visual system for this feature.
- Keep Storage cleanup explicit and safe. Never delete source files until publish succeeds.
- Respect the dirty worktree. Do not revert unrelated files such as existing plan drafts or Supabase temp changes.
- The spec-review and plan-review subagent loops are intentionally omitted from execution instructions in this session because no explicit delegation request was made.

Plan complete and saved to `docs/superpowers/plans/2026-06-06-mentor-managed-flash-card-implementation.md`. Ready to execute?
