# Manual Question Authoring Without AI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all AI-driven authoring and admin AI surfaces, then replace them with a simple manual question bank flow that supports fixed blok/materi tagging plus question and explanation images.

**Architecture:** Keep the existing React + Supabase app, but move admin question authoring back onto the final academic content tables: `questions`, `question_options`, `question_explanations`, `blocks`, and `topics`. Add a small schema extension for media paths and storage, rewrite the question authoring API away from batch/enrichment models, then simplify admin routes and UI to a list-plus-form workflow. Student tryout pages remain on the same attempt/result pipeline, with small extensions so question images and explanation images render correctly.

**Tech Stack:** React 19, TypeScript, Vite, React Router v7, TanStack Query, Supabase Postgres, Supabase Storage, SQL migrations, Vitest, React Testing Library

---

## File Structure

### Backend and Database

- Create: `supabase/migrations/20260503000012_manual_question_media.sql`
- Create: `supabase/migrations/20260503000012_manual_question_media.test.ts`
- Modify: `supabase/seed.sql`

### Admin App

- Modify: `src/router/app-router.tsx`
- Modify: `src/router/app-router.test.tsx`
- Modify: `src/mocks/admin-content.ts`
- Modify: `src/pages/admin/admin-dashboard-page.tsx`
- Modify: `src/pages/admin/admin-dashboard-page.test.tsx`
- Modify: `src/lib/api/admin-api.ts`
- Modify: `src/lib/api/admin-api.test.ts`
- Modify: `src/lib/mappers/admin-mappers.ts`
- Modify: `src/pages/admin/questions-page.tsx`
- Modify: `src/pages/admin/questions-page.test.tsx`
- Modify: `src/pages/admin/question-editor-page.tsx`
- Modify: `src/pages/admin/question-editor-page.test.tsx`
- Modify: `src/lib/api/question-authoring-api.ts`
- Modify: `src/lib/api/question-authoring-api.test.ts`
- Modify: `src/lib/mappers/question-authoring-mappers.ts`
- Modify: `src/lib/mappers/question-authoring-mappers.test.ts`

### Student App

- Modify: `src/lib/api/tryout-api.ts`
- Modify: `src/lib/api/tryout-api.test.ts`
- Modify: `src/lib/mappers/tryout-mappers.ts`
- Modify: `src/pages/app/tryout-session-page.tsx`
- Modify: `src/pages/app/tryout-session-page.test.tsx`
- Modify: `src/pages/app/review-page.tsx`
- Create: `src/pages/app/review-page.test.tsx`

### Remove From Frontend Codebase

- Delete: `src/lib/api/ai-api.ts`
- Delete: `src/lib/api/ai-api.test.ts`
- Delete: `src/pages/admin/ai-settings-page.tsx`
- Delete: `src/pages/admin/ai-settings-page.test.tsx`
- Delete: `src/pages/admin/question-upload-page.tsx`
- Delete: `src/pages/admin/question-upload-page.test.tsx`
- Delete: `src/pages/admin/question-batch-page.tsx`
- Delete: `src/pages/admin/question-batch-page.test.tsx`
- Delete: `src/pages/admin/question-enrichment-page.tsx`
- Delete: `src/pages/admin/question-enrichment-page.test.tsx`

### Candidate Cleanup If No Longer Needed By Any Route

- Delete: `src/pages/admin/reference-library-page.tsx`
- Delete: `src/pages/admin/reference-library-page.test.tsx`
- Delete: `src/pages/admin/review-queue-page.tsx`
- Delete: `src/pages/admin/review-queue-page.test.tsx`

Notes:

- The active authoring flow should no longer depend on `question_upload_*`, `question_draft_*`, `review_queue`, `ingestion_jobs`, `reference_documents`, or any AI helper.
- Legacy backend AI tables may remain temporarily if removing them immediately would create migration risk. The frontend must stop referencing them entirely.

## Chunk 1: Remove AI Routes, Nav, and Dashboard Surfaces

### Task 1: Strip AI-specific routes and navigation from the admin app

**Files:**
- Modify: `src/router/app-router.tsx`
- Modify: `src/router/app-router.test.tsx`
- Modify: `src/mocks/admin-content.ts`
- Modify: `src/pages/admin/admin-dashboard-page.tsx`
- Modify: `src/pages/admin/admin-dashboard-page.test.tsx`
- Modify: `src/lib/api/admin-api.ts`
- Modify: `src/lib/api/admin-api.test.ts`
- Modify: `src/lib/mappers/admin-mappers.ts`
- Delete: `src/pages/admin/ai-settings-page.tsx`
- Delete: `src/pages/admin/ai-settings-page.test.tsx`
- Delete: `src/pages/admin/question-upload-page.tsx`
- Delete: `src/pages/admin/question-upload-page.test.tsx`
- Delete: `src/pages/admin/question-batch-page.tsx`
- Delete: `src/pages/admin/question-batch-page.test.tsx`
- Delete: `src/pages/admin/question-enrichment-page.tsx`
- Delete: `src/pages/admin/question-enrichment-page.test.tsx`
- Candidate delete: `src/pages/admin/reference-library-page.tsx`
- Candidate delete: `src/pages/admin/review-queue-page.tsx`

- [ ] **Step 1: Write failing route tests for the simplified admin navigation**

Add assertions in `src/router/app-router.test.tsx` that:

- `/admin/questions` still renders
- `/admin/questions/new` still renders
- `/admin/questions/question-1/edit` renders the editor route
- `/admin/questions/upload` no longer renders an upload page
- `/admin/questions/enrichment` no longer renders an enrichment page
- `/admin/ai-settings` no longer renders an AI settings page
- the question workspace CTA points to `Tambah soal`, not `Unggah soal`

- [ ] **Step 2: Run the route test to verify it fails**

Run: `npm run test -- --run src/router/app-router.test.tsx`

Expected: FAIL because the current router and mocks still expose upload, enrichment, and AI settings.

- [ ] **Step 3: Write failing dashboard tests that remove AI metrics and AI-linked error CTAs**

Update `src/pages/admin/admin-dashboard-page.test.tsx` and `src/lib/api/admin-api.test.ts` to expect:

- no `Antrian AI`
- no `Job gagal`
- no `Candidate conflict_found`
- no links to `/admin/ai-settings`
- no copy mentioning AI review queues

- [ ] **Step 4: Run the dashboard tests to verify they fail**

Run: `npm run test -- --run src/pages/admin/admin-dashboard-page.test.tsx src/lib/api/admin-api.test.ts`

Expected: FAIL because the dashboard mapper and API still count AI jobs and still mention AI in the copy.

- [ ] **Step 5: Implement the route and nav cleanup**

Make these changes:

- remove imports and route entries for AI settings, upload, batch, and enrichment pages from `src/router/app-router.tsx`
- add `/admin/questions/:questionId/edit`
- simplify `createAdminNavItems` in `src/mocks/admin-content.ts` to remove `AI settings`
- remove any AI copy from `adminShellMeta`
- remove dead page imports after route cleanup

- [ ] **Step 6: Simplify the admin dashboard data model**

Update:

- `src/lib/api/admin-api.ts`
- `src/lib/mappers/admin-mappers.ts`
- `src/pages/admin/admin-dashboard-page.tsx`

Target behavior:

- dashboard metrics show only payment, user, and attempt data
- operational copy does not mention AI, candidate, ingestion, or review queues
- empty/error actions route to `/admin/payments` or `/admin/questions`, never `/admin/ai-settings`

- [ ] **Step 7: Re-run route and dashboard tests**

Run: `npm run test -- --run src/router/app-router.test.tsx src/pages/admin/admin-dashboard-page.test.tsx src/lib/api/admin-api.test.ts`

Expected: PASS

- [ ] **Step 8: Remove the obsolete AI frontend files**

Delete:

- `src/lib/api/ai-api.ts`
- `src/lib/api/ai-api.test.ts`
- `src/pages/admin/ai-settings-page.tsx`
- `src/pages/admin/ai-settings-page.test.tsx`
- `src/pages/admin/question-upload-page.tsx`
- `src/pages/admin/question-upload-page.test.tsx`
- `src/pages/admin/question-batch-page.tsx`
- `src/pages/admin/question-batch-page.test.tsx`
- `src/pages/admin/question-enrichment-page.tsx`
- `src/pages/admin/question-enrichment-page.test.tsx`

If `reference-library` and `review-queue` are confirmed to be AI-only after code search, delete their pages and tests in this same step.

- [ ] **Step 9: Commit**

```bash
git add src/router/app-router.tsx src/router/app-router.test.tsx src/mocks/admin-content.ts src/pages/admin/admin-dashboard-page.tsx src/pages/admin/admin-dashboard-page.test.tsx src/lib/api/admin-api.ts src/lib/api/admin-api.test.ts src/lib/mappers/admin-mappers.ts
git commit -m "refactor: remove admin ai routes and dashboard surfaces"
```

If `git` is still unavailable in this workspace, record a manual checkpoint instead of committing.

## Chunk 2: Add Media Support to the Final Question Schema

### Task 2: Extend the final academic content model for question and explanation images

**Files:**
- Create: `supabase/migrations/20260503000012_manual_question_media.sql`
- Create: `supabase/migrations/20260503000012_manual_question_media.test.ts`
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Write failing migration tests for manual question media support**

Add tests that assert:

- `questions.question_image_path` exists
- `question_explanations.explanation_image_path` exists
- `question_explanations.explanation` allows `NULL` so image-only pembahasan is valid
- `attempt_items.question_image_path` exists so the student session can snapshot the image path
- a `question-media` storage bucket exists with image-safe MIME types

- [ ] **Step 2: Run the migration test to verify it fails**

Run: `npm run test -- --run supabase/migrations/20260503000012_manual_question_media.test.ts`

Expected: FAIL because the migration file does not exist yet.

- [ ] **Step 3: Create `20260503000012_manual_question_media.sql`**

Add SQL that:

- alters `public.questions` with `question_image_path text`
- alters `public.question_explanations` with `explanation_image_path text`
- drops and recreates the `question_explanations.explanation` constraint so text may be nullable
- alters `public.attempt_items` with `question_image_path text`
- inserts the `question-media` storage bucket
- adds storage policies for admin uploads and authenticated reads through signed URLs

- [ ] **Step 4: Seed minimal manual-authoring-compatible example data**

Update `supabase/seed.sql` so at least one published question and one draft question remain valid under the new schema.

Recommended seed behavior:

- keep existing seeded questions
- add `NULL` image paths by default
- optionally seed one non-null `question_image_path` and one non-null `explanation_image_path` string for future smoke tests

- [ ] **Step 5: Re-run the migration test**

Run: `npm run test -- --run supabase/migrations/20260503000012_manual_question_media.test.ts`

Expected: PASS

- [ ] **Step 6: Reset local Supabase to verify migration + seed compatibility**

Run: `npm run supabase:reset`

Expected: PASS with no SQL errors.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260503000012_manual_question_media.sql supabase/migrations/20260503000012_manual_question_media.test.ts supabase/seed.sql
git commit -m "feat: add manual question media schema"
```

If `git` is still unavailable in this workspace, record a manual checkpoint instead of committing.

## Chunk 3: Rewrite the Question Authoring API Around Final Questions

### Task 3: Replace batch/enrichment helpers with direct question CRUD and taxonomy helpers

**Files:**
- Modify: `src/lib/api/question-authoring-api.ts`
- Modify: `src/lib/api/question-authoring-api.test.ts`
- Modify: `src/lib/mappers/question-authoring-mappers.ts`
- Modify: `src/lib/mappers/question-authoring-mappers.test.ts`

- [ ] **Step 1: Write failing mapper tests for the new question bank and editor view-models**

Replace batch-oriented mapper tests with tests that expect:

- a question list card exposing `stem`, `blok`, `materi`, `status`, and image presence flags
- an editor payload exposing `questionImageUrl`, `explanationImageUrl`, `options`, `correctOptionKey`, and fixed taxonomy selections
- no `topicSuggestion`, `extractionLabel`, `batchTitle`, or `workflowLabel`

- [ ] **Step 2: Run the mapper tests to verify they fail**

Run: `npm run test -- --run src/lib/mappers/question-authoring-mappers.test.ts`

Expected: FAIL because the existing mapper module is still batch/enrichment-driven.

- [ ] **Step 3: Write failing API tests for direct question management**

Replace the current `question-authoring-api.test.ts` coverage with tests for:

- `listQuestionTaxonomy`
- `listQuestionBank`
- `getQuestionEditorData`
- `createQuestion`
- `updateQuestion`
- `archiveQuestion` or `deleteQuestion` according to the chosen deletion strategy
- `uploadQuestionMedia`
- `removeQuestionMedia`

The tests should expect reads from:

- `questions`
- `question_options`
- `question_explanations`
- `blocks`
- `topics`

and should reject any dependency on:

- `question_upload_batches`
- `question_upload_items`
- `question_draft_references`
- `admin_question_batch_overview`
- `admin_question_enrichment_queue`

- [ ] **Step 4: Run the API tests to verify they fail**

Run: `npm run test -- --run src/lib/api/question-authoring-api.test.ts`

Expected: FAIL because the API still uses batch/enrichment tables and edge functions.

- [ ] **Step 5: Implement the new mapper layer**

In `src/lib/mappers/question-authoring-mappers.ts`, add focused mappers such as:

- `mapQuestionBankItem`
- `mapQuestionEditorData`
- `mapQuestionStatusLabel`

Remove or rewrite types that only exist for:

- batch cards
- enrichment queue items
- topic suggestion confidence
- OCR or parse diagnostics

- [ ] **Step 6: Implement the direct question authoring API**

In `src/lib/api/question-authoring-api.ts`:

- keep `listQuestionTaxonomy`
- add direct `listQuestionBank`
- add `getQuestionEditorData(questionId)`
- add `createQuestion`
- add `updateQuestion`
- add `archiveQuestion` or `deleteQuestion`
- add `uploadQuestionMedia`
- add `removeQuestionMedia`

Implementation guidance:

- write to `questions`, `question_options`, and `question_explanations`
- use `question-media` storage for image uploads
- use signed URLs for previews instead of public buckets
- preserve the existing `draft` / `published` / `archived` status model

- [ ] **Step 7: Re-run mapper and API tests**

Run: `npm run test -- --run src/lib/mappers/question-authoring-mappers.test.ts src/lib/api/question-authoring-api.test.ts`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/lib/api/question-authoring-api.ts src/lib/api/question-authoring-api.test.ts src/lib/mappers/question-authoring-mappers.ts src/lib/mappers/question-authoring-mappers.test.ts
git commit -m "refactor: rewrite question authoring api to direct question model"
```

If `git` is still unavailable in this workspace, record a manual checkpoint instead of committing.

## Chunk 4: Rebuild the Admin Question Bank and Manual Editor

### Task 4: Turn the admin question area into a simple list and manual form workflow

**Files:**
- Modify: `src/pages/admin/questions-page.tsx`
- Modify: `src/pages/admin/questions-page.test.tsx`
- Modify: `src/pages/admin/question-editor-page.tsx`
- Modify: `src/pages/admin/question-editor-page.test.tsx`
- Modify: `src/router/app-router.tsx`
- Modify: `src/router/app-router.test.tsx`

- [ ] **Step 1: Write failing tests for the new question bank page**

Update `src/pages/admin/questions-page.test.tsx` to expect:

- heading still says `Question bank` or `Bank soal`
- list of existing saved questions, not batch cards
- filters for `blok`, `materi`, and optional `status`
- CTA `Tambah soal`
- edit action linking to `/admin/questions/:questionId/edit`
- no `Unggah soal`
- no `Review enrichment`

- [ ] **Step 2: Run the question bank test to verify it fails**

Run: `npm run test -- --run src/pages/admin/questions-page.test.tsx`

Expected: FAIL because the page still renders overview cards and batch summaries.

- [ ] **Step 3: Write failing tests for the manual question editor**

Update `src/pages/admin/question-editor-page.test.tsx` to cover:

- create mode requires pertanyaan, minimal 2 opsi, kunci, blok, dan materi
- materi options react to the selected blok
- save payload includes text fields, taxonomy IDs, and status
- image file inputs render preview state when upload data exists
- edit mode loads existing question data from the API
- no AI placeholder panel appears anywhere

- [ ] **Step 4: Run the editor test to verify it fails**

Run: `npm run test -- --run src/pages/admin/question-editor-page.test.tsx`

Expected: FAIL because the current editor still shows AI suggestion copy and does not support blok/materi filters or images.

- [ ] **Step 5: Rewrite `questions-page.tsx`**

Target behavior:

- query direct question list data
- render rows or cards for final questions
- expose `Tambah soal`
- expose `Edit`
- optionally expose `Arsipkan` or `Hapus`
- filter by `blok`, `materi`, and `status`

- [ ] **Step 6: Rewrite `question-editor-page.tsx`**

Target behavior:

- support both `/new` and `/:questionId/edit`
- use direct API helpers instead of `createManualQuestionDraft`
- include fields for:
  - pertanyaan
  - gambar pertanyaan
  - opsi A-D or dynamic options
  - kunci jawaban
  - blok
  - materi
  - pembahasan teks
  - gambar pembahasan
  - status
- remove the AI suggestion side panel entirely

- [ ] **Step 7: Re-run the page and route tests**

Run: `npm run test -- --run src/pages/admin/questions-page.test.tsx src/pages/admin/question-editor-page.test.tsx src/router/app-router.test.tsx`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/pages/admin/questions-page.tsx src/pages/admin/questions-page.test.tsx src/pages/admin/question-editor-page.tsx src/pages/admin/question-editor-page.test.tsx src/router/app-router.tsx src/router/app-router.test.tsx
git commit -m "feat: add manual question bank and editor flow"
```

If `git` is still unavailable in this workspace, record a manual checkpoint instead of committing.

## Chunk 5: Support Question and Explanation Images in Student Review Surfaces

### Task 5: Extend tryout session and review pipelines to display question and explanation media

**Files:**
- Modify: `src/lib/api/tryout-api.ts`
- Modify: `src/lib/api/tryout-api.test.ts`
- Modify: `src/lib/mappers/tryout-mappers.ts`
- Modify: `src/pages/app/tryout-session-page.tsx`
- Modify: `src/pages/app/tryout-session-page.test.tsx`
- Modify: `src/pages/app/review-page.tsx`
- Create: `src/pages/app/review-page.test.tsx`

- [ ] **Step 1: Write failing API tests for tryout media support**

Add coverage in `src/lib/api/tryout-api.test.ts` that expects:

- `getAttemptSessionPageData` returns `questionImageUrl` when an attempt item has an image path
- `getAttemptReviewPageData` returns:
  - `questionImageUrl`
  - `explanationImageUrl`
  - `explanationText`

Use signed URL stubs for media resolution rather than public URLs.

- [ ] **Step 2: Run the tryout API tests to verify they fail**

Run: `npm run test -- --run src/lib/api/tryout-api.test.ts`

Expected: FAIL because the current API returns text-only question and explanation data.

- [ ] **Step 3: Write failing UI tests for session and review rendering**

Update:

- `src/pages/app/tryout-session-page.test.tsx`
- `src/pages/app/review-page.test.tsx`

Expected coverage:

- question image renders in the session page when present
- explanation image renders in the review page when present
- explanation text still renders when present
- review page tolerates text-only, image-only, and mixed explanations

- [ ] **Step 4: Run the student page tests to verify they fail**

Run: `npm run test -- --run src/pages/app/tryout-session-page.test.tsx src/pages/app/review-page.test.tsx`

Expected: FAIL because the pages do not yet render media.

- [ ] **Step 5: Extend the tryout API and mapper pipeline**

Implementation guidance:

- widen the `TryoutClient` type to include `storage`
- fetch `question_image_path` from `attempt_items`
- fetch `question_image_path` from `questions` when building review data if needed
- fetch `explanation_image_path` from `question_explanations`
- resolve any non-null media path into a signed URL
- update the mapper contracts so pages receive ready-to-render media URLs

- [ ] **Step 6: Render media in the student pages**

In `tryout-session-page.tsx`:

- render the question image above or below the stem

In `review-page.tsx`:

- render question image if present
- render explanation text if present
- render explanation image if present

- [ ] **Step 7: Re-run the student tests**

Run: `npm run test -- --run src/lib/api/tryout-api.test.ts src/pages/app/tryout-session-page.test.tsx src/pages/app/review-page.test.tsx`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/lib/api/tryout-api.ts src/lib/api/tryout-api.test.ts src/lib/mappers/tryout-mappers.ts src/pages/app/tryout-session-page.tsx src/pages/app/tryout-session-page.test.tsx src/pages/app/review-page.tsx src/pages/app/review-page.test.tsx
git commit -m "feat: support question and explanation images in tryout review"
```

If `git` is still unavailable in this workspace, record a manual checkpoint instead of committing.

## Chunk 6: Final Cleanup and Verification

### Task 6: Remove stale AI assumptions and verify the simplified app end-to-end

**Files:**
- Modify: `src/mocks/admin-content.ts`
- Modify: any remaining tests that mention AI, batch, enrichment, OCR, suggestion, or candidate language
- Optional modify: `docs/superpowers/handoff/2026-05-01-pawang-masuk-apoteker-phase1-backend-notes.md`

- [ ] **Step 1: Search the frontend for stale AI language**

Run: `Get-ChildItem -Recurse -File src tests docs | Select-String -Pattern 'AI|ai settings|enrichment|OCR|candidate|batch soal|review queue|reference library'`

Expected: remaining matches should be intentional only. Remove or rewrite any stale user-facing copy in active pages and tests.

- [ ] **Step 2: Run the focused admin and authoring test suite**

Run: `npm run test -- --run src/router/app-router.test.tsx src/pages/admin/admin-dashboard-page.test.tsx src/pages/admin/questions-page.test.tsx src/pages/admin/question-editor-page.test.tsx src/lib/api/admin-api.test.ts src/lib/api/question-authoring-api.test.ts src/lib/mappers/question-authoring-mappers.test.ts`

Expected: PASS

- [ ] **Step 3: Run the focused student regression suite**

Run: `npm run test -- --run src/lib/api/tryout-api.test.ts src/pages/app/tryout-session-page.test.tsx src/pages/app/review-page.test.tsx`

Expected: PASS

- [ ] **Step 4: Run the full unit test suite**

Run: `npm run test -- --run`

Expected: PASS

- [ ] **Step 5: Run the production build**

Run: `npm run build`

Expected: PASS

- [ ] **Step 6: Manual smoke test**

Verify in the browser:

1. Admin can open `/admin/questions`
2. Admin can filter by blok and materi
3. Admin can create a draft question manually
4. Admin can upload a question image
5. Admin can add pembahasan teks
6. Admin can upload an explanation image
7. Admin can edit the saved question
8. Student tryout session shows question image when present
9. Student review page shows pembahasan text and image without errors
10. No active route or nav item still mentions AI

- [ ] **Step 7: Commit**

```bash
git add src docs supabase
git commit -m "refactor: simplify question authoring and remove ai web flows"
```

If `git` is still unavailable in this workspace, record a manual checkpoint instead of committing.

## Risks to Watch During Execution

- `question_explanations.explanation` is currently non-null, so image-only pembahasan requires a real schema change.
- `attempt_items` currently snapshot text and options only, so question images need a new snapshot field to appear during active tryout sessions.
- `question-media` must not be exposed through an accidental public bucket if premium content should stay protected.
- If `reference-library` and `review-queue` are still used by hidden routes or docs, deleting them too early can break imports or tests.
- The workspace is currently not a git repository, so commit steps may need to be deferred until the repo root is restored.

## Verification Checklist

- [ ] Admin nav has no AI settings entry
- [ ] Admin dashboard has no AI metrics or AI review copy
- [ ] Upload/batch/enrichment pages are gone from the active app
- [ ] Question bank lists final questions instead of authoring batches
- [ ] Admin can create and edit manual questions directly on final question tables
- [ ] Blok and materi tagging are required and filtered correctly
- [ ] Question images upload and preview correctly
- [ ] Explanation text and explanation images both work
- [ ] Student session can display question images
- [ ] Student review can display text-only, image-only, and mixed explanations
- [ ] `npm run test -- --run` passes
- [ ] `npm run build` passes

Plan complete and saved to `docs/superpowers/plans/2026-05-03-manual-question-authoring-no-ai-implementation.md`. Ready to execute?
