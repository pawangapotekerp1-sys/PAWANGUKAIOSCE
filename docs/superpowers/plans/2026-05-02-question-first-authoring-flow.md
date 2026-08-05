# Question-First Authoring Flow Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current admin question overview into a working question-first authoring system where admins upload questions first, get AI topic suggestions, enrich missing answers/explanations from internal references or curated AI fallback, review the result, and publish by topic.

**Architecture:** Keep the current single Vite + React admin app and Supabase backend, but move ingestion ownership from `Reference library -> review queue` to `Question bank -> upload batch -> editor/review`. Preserve `Reference library` as the internal source corpus for enrichment, and add question-batch, question-draft, enrichment, and OCR metadata as first-class data instead of overloading the current review candidate tables. Build the flow incrementally: schema and taxonomy APIs first, then admin workspace, then structured uploads, then OCR/doc ingestion, then editor/review/publish.

**Tech Stack:** React 19, TypeScript, Vite, React Router v7, TanStack Query, Supabase Postgres, Supabase Storage, Supabase Edge Functions, SQL migrations, Vitest, React Testing Library, Playwright

---

## Scope and Constraints

- The finalized taxonomy is fixed to the existing `blocks` plus the 15 newly seeded `topics`.
- Topic assignment uses AI **suggestion** only; admin remains the final editor.
- Question uploads support `PDF/DOCX`, `Excel/CSV`, and manual form entry.
- `Reference library` remains a separate source corpus used for enrichment, not the primary question upload module.
- OCR is required for scan/image-based PDFs; low-confidence OCR results must stay reviewable and never auto-publish.
- Questions should be testable by topic later, so `topic_id` must be a first-class field in the authoring workflow.

## Current Files to Extend

- Modify: `src/router/app-router.tsx`
- Modify: `src/pages/admin/questions-page.tsx`
- Modify: `src/pages/admin/reference-library-page.tsx`
- Modify: `src/pages/admin/review-queue-page.tsx`
- Modify: `src/lib/api/admin-api.ts`
- Modify: `src/lib/mappers/admin-mappers.ts`
- Modify: `src/mocks/admin-content.ts`
- Modify: `supabase/seed.sql`

## New Frontend Files

- Create: `src/lib/api/question-authoring-api.ts`
- Create: `src/lib/api/question-authoring-api.test.ts`
- Create: `src/lib/mappers/question-authoring-mappers.ts`
- Create: `src/lib/mappers/question-authoring-mappers.test.ts`
- Create: `src/pages/admin/question-batch-page.tsx`
- Create: `src/pages/admin/question-editor-page.tsx`
- Create: `src/pages/admin/question-upload-page.tsx`
- Create: `src/pages/admin/question-enrichment-page.tsx`
- Create: `src/pages/admin/questions-page.test.tsx`
- Create: `src/pages/admin/question-upload-page.test.tsx`
- Create: `src/pages/admin/question-batch-page.test.tsx`
- Create: `src/pages/admin/question-editor-page.test.tsx`
- Create: `src/pages/admin/question-enrichment-page.test.tsx`

## New Backend Files

- Create: `supabase/migrations/20260502000010_question_authoring_batches.sql`
- Create: `supabase/migrations/20260502000011_question_authoring_enrichment.sql`
- Create: `supabase/functions/upload-question-batch/index.ts`
- Create: `supabase/functions/enrich-question-draft/index.ts`
- Create: `supabase/functions/ocr-question-pdf/index.ts`
- Create: `supabase/functions/review-question-draft/index.ts`
- Create: `supabase/functions/publish-question-draft/index.ts`
- Create: `supabase/functions/_shared/question-authoring.ts`
- Create: `supabase/functions/_shared/taxonomy.ts`

## New E2E Files

- Create: `tests/e2e/admin-question-upload-and-review.spec.ts`

## Domain Model to Introduce

- `question_upload_batches`
  - one admin upload event (csv/xlsx/pdf/docx/manual session)
- `question_upload_items`
  - one parsed question candidate from a batch
- `question_draft_references`
  - references used during enrichment or explanation generation
- `question_draft_reviews`
  - editorial actions before approval/publish

Key question-draft states:

- `draft_ready`
- `needs_enrichment`
- `needs_review`
- `approved`
- `published`
- `rejected`
- `enrichment_failed`

Key batch states:

- `processing`
- `completed`
- `completed_with_issues`
- `failed`

Key parse metadata:

- `input_format`
- `text_extraction_mode` (`direct_text`, `ocr`)
- `ocr_confidence`
- `parse_confidence`
- `topic_suggestion_confidence`

## Chunk 1: Schema and Taxonomy Foundation

### Task 1: Add database support for question-first batches, enrichment, and review metadata

**Files:**
- Create: `supabase/migrations/20260502000010_question_authoring_batches.sql`
- Create: `supabase/migrations/20260502000011_question_authoring_enrichment.sql`
- Modify: `supabase/seed.sql`
- Test: `supabase/migrations/20260502000010_question_authoring_batches.test.ts`
- Test: `supabase/migrations/20260502000011_question_authoring_enrichment.test.ts`

- [ ] **Step 1: Write migration tests for the new schema contract**

Test for:
- `question_upload_batches` exists with format/status columns
- `question_upload_items` stores topic suggestion metadata and parse diagnostics
- review and enrichment tables exist with referential integrity
- question states accept `draft_ready`, `needs_enrichment`, `needs_review`, `approved`, `published`, `rejected`, `enrichment_failed`

- [ ] **Step 2: Run the migration tests and confirm they fail**

Run: `npm run test -- --run supabase/migrations/20260502000010_question_authoring_batches.test.ts supabase/migrations/20260502000011_question_authoring_enrichment.test.ts`
Expected: FAIL because the migration files and schema changes do not exist yet

- [ ] **Step 3: Create `20260502000010_question_authoring_batches.sql`**

Add:
- `question_upload_batches`
- `question_upload_items`
- new question/editorial status checks
- indexes on batch status, item status, topic suggestion confidence, created_by
- RLS policies for admin-only write/read

- [ ] **Step 4: Create `20260502000011_question_authoring_enrichment.sql`**

Add:
- `question_draft_references`
- `question_draft_reviews`
- optional `question_enrichment_jobs` if enrichment needs separate tracking
- views for `admin_question_batch_overview` and `admin_question_enrichment_queue`

- [ ] **Step 5: Extend `supabase/seed.sql` with one realistic upload batch**

Seed:
- one completed CSV-style batch
- one completed-with-issues PDF batch
- one OCR low-confidence upload item
- several items in `draft_ready`, `needs_enrichment`, and `needs_review`

- [ ] **Step 6: Re-run the migration tests**

Run: `npm run test -- --run supabase/migrations/20260502000010_question_authoring_batches.test.ts supabase/migrations/20260502000011_question_authoring_enrichment.test.ts`
Expected: PASS

- [ ] **Step 7: Reset local Supabase to verify the schema and seed end-to-end**

Run: `npx supabase db reset`
Expected: migrations and seed complete with no SQL errors

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260502000010_question_authoring_batches.sql supabase/migrations/20260502000011_question_authoring_enrichment.sql supabase/seed.sql
git commit -m "feat: add question authoring schema foundation"
```

## Chunk 2: Authoring API and Mapper Layer

### Task 2: Add typed frontend APIs and mappers for taxonomy, batches, upload results, editor data, and enrichment queues

**Files:**
- Create: `src/lib/api/question-authoring-api.ts`
- Create: `src/lib/api/question-authoring-api.test.ts`
- Create: `src/lib/mappers/question-authoring-mappers.ts`
- Create: `src/lib/mappers/question-authoring-mappers.test.ts`
- Modify: `src/lib/api/admin-api.ts`

- [ ] **Step 1: Write failing mapper tests for admin authoring view-models**

Test for:
- topic suggestion confidence becomes a badge-ready label
- OCR and direct-text parse modes map to explicit UI status
- batch counters map cleanly to dashboard cards
- question editor payload surfaces source/explanation provenance

- [ ] **Step 2: Run the mapper tests and confirm they fail**

Run: `npm run test -- --run src/lib/mappers/question-authoring-mappers.test.ts`
Expected: FAIL because the mapper module does not exist yet

- [ ] **Step 3: Write failing API tests for the authoring data contract**

Test for:
- list taxonomy blocks/topics
- list question batches
- get question batch detail
- get question draft detail
- submit manual question draft
- update topic suggestion review
- list enrichment queue

- [ ] **Step 4: Run the API tests and confirm they fail**

Run: `npm run test -- --run src/lib/api/question-authoring-api.test.ts`
Expected: FAIL because the API module does not exist yet

- [ ] **Step 5: Implement `src/lib/mappers/question-authoring-mappers.ts`**

Add:
- `mapQuestionBatchCard`
- `mapQuestionBatchDetail`
- `mapQuestionDraftEditorViewModel`
- `mapEnrichmentQueueItem`
- `mapTopicSuggestion`

- [ ] **Step 6: Implement `src/lib/api/question-authoring-api.ts`**

Add typed helpers for:
- taxonomy reads from `blocks` and `topics`
- batch and item reads from new admin views/tables
- manual question draft create/update
- editor save
- enrichment queue reads
- review and publish mutations via edge functions

- [ ] **Step 7: Move question-overview-only helpers out of `tryout-api`**

Keep `tryout-api` focused on student/runtime concerns and move authoring concerns into the new module.

- [ ] **Step 8: Re-run the mapper and API tests**

Run: `npm run test -- --run src/lib/mappers/question-authoring-mappers.test.ts src/lib/api/question-authoring-api.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/lib/api/question-authoring-api.ts src/lib/api/question-authoring-api.test.ts src/lib/mappers/question-authoring-mappers.ts src/lib/mappers/question-authoring-mappers.test.ts src/lib/api/admin-api.ts
git commit -m "feat: add question authoring api layer"
```

## Chunk 3: Admin Workspace, Routing, and Batch Result UI

### Task 3: Replace the admin question overview with a real authoring workspace and batch result screens

**Files:**
- Modify: `src/router/app-router.tsx`
- Modify: `src/pages/admin/questions-page.tsx`
- Create: `src/pages/admin/question-upload-page.tsx`
- Create: `src/pages/admin/question-batch-page.tsx`
- Create: `src/pages/admin/question-enrichment-page.tsx`
- Create: `src/pages/admin/questions-page.test.tsx`
- Create: `src/pages/admin/question-upload-page.test.tsx`
- Create: `src/pages/admin/question-batch-page.test.tsx`
- Create: `src/pages/admin/question-enrichment-page.test.tsx`
- Modify: `src/mocks/admin-content.ts`

- [ ] **Step 1: Write failing route tests for the new admin question authoring routes**

Test for:
- `/admin/questions` shows batch workspace
- `/admin/questions/upload` renders upload entry point
- `/admin/questions/batches/:batchId` renders batch results
- `/admin/questions/enrichment` renders queue filters

- [ ] **Step 2: Run the route tests and confirm they fail**

Run: `npm run test -- --run src/router/app-router.test.tsx src/pages/admin/questions-page.test.tsx`
Expected: FAIL because the routes and pages do not exist yet

- [ ] **Step 3: Implement the route changes**

Update router to add:
- `/admin/questions`
- `/admin/questions/upload`
- `/admin/questions/batches/:batchId`
- `/admin/questions/enrichment`
- preserve existing admin nav language

- [ ] **Step 4: Replace `questions-page.tsx` with a workspace shell**

Render:
- batch summary cards
- recent batches list
- CTA buttons for upload and enrichment review
- filters by batch status and source format

- [ ] **Step 5: Build `question-upload-page.tsx`**

Support:
- format selector (`pdf`, `docx`, `csv`, `xlsx`, `manual`)
- upload hints
- manual entry CTA
- batch submission status

- [ ] **Step 6: Build `question-batch-page.tsx`**

Render:
- batch summary
- per-item table
- filters for `draft_ready`, `needs_enrichment`, `needs_review`, `failed`
- badges for `direct_text`, `ocr`, low-confidence topic suggestion

- [ ] **Step 7: Build `question-enrichment-page.tsx`**

Render:
- pending queue
- failed queue
- actions to open editor, retry enrichment, or reject

- [ ] **Step 8: Re-run the route and page tests**

Run: `npm run test -- --run src/router/app-router.test.tsx src/pages/admin/questions-page.test.tsx src/pages/admin/question-upload-page.test.tsx src/pages/admin/question-batch-page.test.tsx src/pages/admin/question-enrichment-page.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/router/app-router.tsx src/pages/admin/questions-page.tsx src/pages/admin/question-upload-page.tsx src/pages/admin/question-batch-page.tsx src/pages/admin/question-enrichment-page.tsx src/mocks/admin-content.ts
git commit -m "feat: add admin question authoring workspace"
```

## Chunk 4: Structured Uploads (CSV/XLSX and Manual Entry)

### Task 4: Deliver the first fully working authoring path using manual and structured tabular uploads

**Files:**
- Create: `supabase/functions/upload-question-batch/index.ts`
- Create: `supabase/functions/_shared/question-authoring.ts`
- Create: `supabase/functions/_shared/taxonomy.ts`
- Modify: `src/lib/api/question-authoring-api.ts`
- Modify: `src/pages/admin/question-upload-page.tsx`
- Create: `src/pages/admin/question-editor-page.tsx`
- Create: `src/pages/admin/question-editor-page.test.tsx`

- [ ] **Step 1: Write failing tests for manual question creation**

Test for:
- manual form can save a draft-ready question when answer and explanation exist
- missing explanation defaults to `needs_enrichment`
- empty block/topic uses AI suggestion placeholder state instead of crashing

- [ ] **Step 2: Run the manual authoring tests and confirm they fail**

Run: `npm run test -- --run src/pages/admin/question-editor-page.test.tsx`
Expected: FAIL because the editor page and related mutation logic do not exist yet

- [ ] **Step 3: Write failing tests for structured batch import**

Test for:
- CSV/XLSX rows with valid topic names map to existing taxonomy
- rows with blank topic values receive topic suggestion placeholders
- rows with answer+explanation become `draft_ready`
- rows missing explanation become `needs_enrichment`

- [ ] **Step 4: Run the structured upload tests and confirm they fail**

Run: `npm run test -- --run src/lib/api/question-authoring-api.test.ts`
Expected: FAIL for new import paths

- [ ] **Step 5: Implement the `upload-question-batch` edge function for `csv`, `xlsx`, and `manual`**

Responsibilities:
- normalize rows into batch items
- validate block/topic against taxonomy when provided
- attach `topic_suggestion_status = pending` when missing
- determine per-item workflow status

- [ ] **Step 6: Implement `question-editor-page.tsx`**

Include:
- editable stem/options/answer/explanation
- block/topic selector
- AI suggestion display
- source provenance panel
- save draft action

- [ ] **Step 7: Re-run the manual and structured upload tests**

Run: `npm run test -- --run src/pages/admin/question-editor-page.test.tsx src/lib/api/question-authoring-api.test.ts`
Expected: PASS

- [ ] **Step 8: Smoke-test the first working authoring path locally**

Run:
- `npm run dev`
- upload a seeded CSV/XLSX sample
- create one manual draft
Expected: one item lands in `draft_ready` and one item lands in `needs_enrichment`

- [ ] **Step 9: Commit**

```bash
git add supabase/functions/upload-question-batch/index.ts supabase/functions/_shared/question-authoring.ts supabase/functions/_shared/taxonomy.ts src/pages/admin/question-upload-page.tsx src/pages/admin/question-editor-page.tsx src/lib/api/question-authoring-api.ts
git commit -m "feat: add manual and structured question uploads"
```

## Chunk 5: PDF/DOCX Parsing and OCR Support

### Task 5: Add doc ingestion with OCR-aware diagnostics and reviewable parse output

**Files:**
- Create: `supabase/functions/ocr-question-pdf/index.ts`
- Modify: `supabase/functions/upload-question-batch/index.ts`
- Modify: `src/pages/admin/question-batch-page.tsx`
- Modify: `src/lib/api/question-authoring-api.ts`
- Test: `supabase/functions/upload-question-batch/index.test.ts`
- Test: `supabase/functions/ocr-question-pdf/index.test.ts`

- [ ] **Step 1: Write failing tests for text-based PDF parsing**

Test for:
- direct-text PDFs mark `text_extraction_mode = direct_text`
- parser can create batch items with parse diagnostics

- [ ] **Step 2: Write failing tests for scan/OCR PDFs**

Test for:
- scan PDFs route through OCR
- OCR confidence is persisted
- low-confidence OCR results land in `needs_review`

- [ ] **Step 3: Run the PDF/OCR tests and confirm they fail**

Run: `npm run test -- --run supabase/functions/upload-question-batch/index.test.ts supabase/functions/ocr-question-pdf/index.test.ts`
Expected: FAIL because OCR and parse logic do not exist yet

- [ ] **Step 4: Implement OCR boundary logic**

Add:
- direct-text detection
- OCR fallback
- parse diagnostics payload
- `ocr_low_confidence` warning state

- [ ] **Step 5: Surface OCR and parse warnings in the batch result UI**

Display:
- `direct text` badge
- `ocr` badge
- low-confidence warning
- parse warning badge

- [ ] **Step 6: Re-run the PDF/OCR tests**

Run: `npm run test -- --run supabase/functions/upload-question-batch/index.test.ts supabase/functions/ocr-question-pdf/index.test.ts src/pages/admin/question-batch-page.test.tsx`
Expected: PASS

- [ ] **Step 7: Verify with one real local PDF and one scan-like fixture**

Run:
- `npm run dev`
- upload one text PDF
- upload one scan-like PDF fixture
Expected: text PDF parses directly, scan fixture shows OCR-origin diagnostics

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/ocr-question-pdf/index.ts supabase/functions/upload-question-batch/index.ts src/pages/admin/question-batch-page.tsx src/lib/api/question-authoring-api.ts
git commit -m "feat: add pdf and ocr question ingestion"
```

## Chunk 6: Topic Suggestion, Enrichment, Review, and Publish

### Task 6: Add AI topic suggestion, reference-first enrichment, curated-AI fallback, and editorial review/publish actions

**Files:**
- Create: `supabase/functions/enrich-question-draft/index.ts`
- Create: `supabase/functions/review-question-draft/index.ts`
- Create: `supabase/functions/publish-question-draft/index.ts`
- Modify: `supabase/functions/_shared/question-authoring.ts`
- Modify: `src/lib/api/question-authoring-api.ts`
- Modify: `src/pages/admin/question-editor-page.tsx`
- Modify: `src/pages/admin/question-enrichment-page.tsx`
- Modify: `src/pages/admin/review-queue-page.tsx`
- Test: `src/lib/api/question-authoring-api.test.ts`
- Test: `src/pages/admin/question-editor-page.test.tsx`
- Test: `src/pages/admin/question-enrichment-page.test.tsx`

- [ ] **Step 1: Write failing tests for topic suggestion behavior**

Test for:
- uploads with missing topic receive a suggestion and confidence
- AI can only choose from seeded internal topics
- admin can override the topic suggestion without losing provenance

- [ ] **Step 2: Write failing tests for enrichment behavior**

Test for:
- missing explanation tries `reference library` first
- fallback curated AI stores references and source provenance
- no-sufficient-source case becomes `enrichment_failed`

- [ ] **Step 3: Write failing tests for review and publish**

Test for:
- enriched draft defaults to `needs_review`
- approved draft can become `published`
- rejected draft remains visible in admin queues

- [ ] **Step 4: Run the tests and confirm they fail**

Run: `npm run test -- --run src/lib/api/question-authoring-api.test.ts src/pages/admin/question-editor-page.test.tsx src/pages/admin/question-enrichment-page.test.tsx`
Expected: FAIL because enrichment/review/publish flows do not exist yet

- [ ] **Step 5: Implement topic suggestion + enrichment functions**

Rules:
- suggestion only up to `topic`
- internal taxonomy choices only
- enrichment order: reference library -> curated external AI
- references must be stored for every AI-assisted answer/explanation

- [ ] **Step 6: Implement editor review controls**

Support:
- accept/change suggested topic
- trigger enrichment
- approve
- reject
- publish

- [ ] **Step 7: Re-run the tests**

Run: `npm run test -- --run src/lib/api/question-authoring-api.test.ts src/pages/admin/question-editor-page.test.tsx src/pages/admin/question-enrichment-page.test.tsx`
Expected: PASS

- [ ] **Step 8: Manually verify one end-to-end path**

Scenario:
- upload one incomplete question
- confirm topic suggestion appears
- trigger enrichment
- review references
- approve and publish
Expected: the question ends in `published` with topic and provenance intact

- [ ] **Step 9: Commit**

```bash
git add supabase/functions/enrich-question-draft/index.ts supabase/functions/review-question-draft/index.ts supabase/functions/publish-question-draft/index.ts src/pages/admin/question-editor-page.tsx src/pages/admin/question-enrichment-page.tsx src/lib/api/question-authoring-api.ts
git commit -m "feat: add topic suggestion and enrichment review flow"
```

## Chunk 7: Verification, Reference Module Re-scope, and E2E Coverage

### Task 7: Align `Reference library` with the new flow and add regression coverage

**Files:**
- Modify: `src/pages/admin/reference-library-page.tsx`
- Modify: `src/pages/admin/review-queue-page.tsx`
- Create: `tests/e2e/admin-question-upload-and-review.spec.ts`
- Modify: `docs/superpowers/handoff/2026-05-01-pawang-masuk-apoteker-phase1-backend-notes.md`

- [ ] **Step 1: Write failing page tests for the rescaled reference module**

Test for:
- `Reference library` copy describes internal source enrichment instead of primary question upload
- review queue copy matches editorial review of question drafts

- [ ] **Step 2: Run the page tests and confirm they fail**

Run: `npm run test -- --run src/pages/admin/reference-library-page.test.tsx src/pages/admin/review-queue-page.test.tsx`
Expected: FAIL because the copy and flow assumptions are outdated

- [ ] **Step 3: Update `Reference library` semantics**

Make the page clearly represent:
- internal source uploads
- active/inactive source docs
- source docs used by enrichment

- [ ] **Step 4: Add the E2E spec**

Cover:
- admin login
- upload structured question batch
- inspect batch result
- open draft editor
- approve/publish one question

- [ ] **Step 5: Run targeted unit and E2E checks**

Run:
- `npm run test -- --run src/pages/admin/reference-library-page.test.tsx src/pages/admin/review-queue-page.test.tsx`
- `npx playwright test tests/e2e/admin-question-upload-and-review.spec.ts`
Expected: unit tests PASS; E2E passes when local runtime credentials are available or skips cleanly when they are not

- [ ] **Step 6: Run final verification**

Run:
- `npm run test -- --run`
- `npm run build`
Expected: all tests pass and build succeeds

- [ ] **Step 7: Update handoff docs**

Document:
- new question-first upload flow
- supported file formats
- OCR behavior
- topic suggestion rules
- enrichment precedence

- [ ] **Step 8: Commit**

```bash
git add src/pages/admin/reference-library-page.tsx src/pages/admin/review-queue-page.tsx tests/e2e/admin-question-upload-and-review.spec.ts docs/superpowers/handoff/2026-05-01-pawang-masuk-apoteker-phase1-backend-notes.md
git commit -m "docs: align admin authoring and reference workflows"
```

## Verification Checklist for Execution

- [ ] Local Supabase reset completes with new migrations and seed
- [ ] Admin can upload `csv/xlsx`
- [ ] Admin can create a manual question
- [ ] Admin can upload a text PDF
- [ ] Admin can upload a scan-like PDF and see OCR diagnostics
- [ ] Missing explanation can be enriched from reference library
- [ ] Curated AI fallback stores references
- [ ] Topic suggestion is editable and limited to seeded topics
- [ ] Approved drafts can be published
- [ ] Topic-filtered question inventory is queryable for future exam-template work
- [ ] `npm run test -- --run` passes
- [ ] `npm run build` passes

## Risks to Watch During Execution

- OCR providers and curated external AI may require separate environment setup; build mocks and low-fidelity fallbacks early.
- `xlsx` parsing may need an additional browser-safe or edge-safe dependency; prefer `csv` working first, then `xlsx`.
- Existing `questions.status` semantics (`draft`, `published`, `archived`) will need a migration path into the richer workflow states; avoid layering new states only in the UI.
- Current reference-ingestion tables and new authoring tables overlap conceptually. Keep responsibilities distinct:
  - `reference_*` for source documents
  - `question_upload_*` for question-first ingestion
  - `questions` for final editorial assets

Plan complete and saved to `docs/superpowers/plans/2026-05-02-question-first-authoring-flow.md`. Ready to execute?
