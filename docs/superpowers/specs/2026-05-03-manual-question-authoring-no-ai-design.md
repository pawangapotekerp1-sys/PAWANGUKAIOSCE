# Manual Question Authoring Without AI Design

Date: 2026-05-03
Status: Draft for user review

## 1. Summary

This design removes all AI-related workflows from the web application and replaces the current question authoring flow with a simple manual authoring system.

The product should no longer expose:

- AI settings
- AI upload, parsing, enrichment, or suggestion flows
- AI review queues
- student-facing AI insight

The new authoring model is direct:

1. admin opens question bank
2. admin creates or edits a question manually
3. admin assigns one of 3 blocks and one of 15 materi
4. admin saves the question
5. the question becomes immediately available in the bank according to its status

## 2. Goals

### Primary Goals

- make the admin question workflow easy to understand
- remove operational complexity caused by AI-assisted authoring
- keep academic organization through fixed block and materi tagging
- support question explanations in text, image, or both
- preserve student scoring and review flows without AI dependencies

### Non-Goals

- automatic tagging or suggestion
- bulk upload from PDF, DOCX, CSV, or XLSX
- OCR-based ingestion
- AI-generated explanations
- AI-based student insight or recommendation

## 3. Scope

### In Scope

- remove all AI routes, UI copy, and frontend dependencies
- replace upload flow with a manual question form
- keep mandatory tagging for 3 blocks and 15 materi
- support question image upload
- support explanation text and explanation image
- support question listing, filtering, create, edit, and delete workflows
- keep result and review pages focused on score, answer comparison, and pembahasan
- update tests to reflect the simplified flow

### Out of Scope

- redesigning the student tryout engine
- changing scoring rules
- schema-wide cleanup of every legacy AI table if they are no longer referenced by the app
- introducing a new moderation workflow beyond simple draft and publish states

## 4. Product Decisions Locked

- AI is removed completely from the active product surface
- upload soal is renamed in behavior to manual question entry
- question import by file is removed from the active admin flow
- each question must be tagged to one block and one materi
- blok and materi selection are manual only
- pembahasan may be text only, image only, or both
- the admin should not need to think in terms of batch, draft candidate, enrichment, confidence, or suggestion

## 5. Admin Experience

### Question Bank

`/admin/questions` becomes the main question management page.

It should show:

- list of saved questions
- filter by blok
- filter by materi
- status filter if draft/published is retained
- search by question text if already supported or easy to add
- primary CTA: `Tambah soal`

It should not show:

- batch summary cards
- upload format selection
- enrichment queue entry points
- AI-related operational counters

### Add Question

`/admin/questions/new` becomes the primary creation page.

Required fields:

- pertanyaan
- minimal 2 pilihan jawaban
- kunci jawaban
- blok
- materi

Optional fields:

- gambar pertanyaan
- pembahasan teks
- gambar pembahasan
- status if editorial publishing state is kept

Behavior rules:

- materi options are filtered by the chosen blok
- form may save only when required fields are valid
- image fields should show existing preview when available
- save returns the admin to the question bank or stays in edit mode with a success message

### Edit Question

`/admin/questions/:questionId/edit` uses the same form structure as create.

It should support:

- editing all visible fields
- replacing or removing uploaded images
- changing blok and materi
- updating answer options and correct answer
- updating pembahasan text and image

### Delete Question

Question deletion may be:

- hard delete if current data model already expects that, or
- soft delete/archive if existing product behavior depends on historical references

Recommendation:

- prefer soft delete or archive if questions may be referenced by existing attempts
- otherwise use hard delete only for drafts that were never published to students

## 6. Routing Changes

### Keep

- `/admin/questions`
- `/admin/questions/new`
- `/app/tryout/result`
- `/app/review`

### Add

- `/admin/questions/:questionId/edit`

### Remove From Active Flow

- `/admin/questions/upload`
- `/admin/questions/batches/:batchId`
- `/admin/questions/enrichment`
- `/admin/ai-settings`

### Candidate Removal Or Simplification

- `/admin/review-queue`
- `/admin/references`

Recommended handling:

- remove `AI settings` entirely
- remove `question upload`, `batch`, and `enrichment` pages entirely
- simplify or remove `review queue` and `reference library` if their only purpose was AI support

## 7. Navigation Changes

Admin navigation should become simpler and reflect only active workflows.

Recommended admin nav:

- Dashboard
- Payments
- Question bank

Optional admin nav entries only if still needed for non-AI reasons:

- Reference library
- Review queue

Must be removed:

- AI settings
- labels that imply AI-assisted review

## 8. Data Model Direction

The application should read and write directly against final question records rather than authoring batches or AI draft candidates.

Recommended question shape:

- `id`
- `question_text`
- `question_image_url`
- `options`
- `correct_answer`
- `explanation_text`
- `explanation_image_url`
- `block_id`
- `topic_id`
- `status`
- `created_at`
- `updated_at`

If the current schema splits some of these concerns across related tables, implementation may preserve that structure as long as the UI behaves like a single simple form.

### Tagging Model

- 3 blok remain fixed and manually selectable
- 15 materi remain fixed and manually selectable
- each materi belongs to one blok
- each question belongs to exactly one blok and one materi

### Status Model

Recommended minimal status set:

- `draft`
- `published`

If needed for safe deletion:

- `archived`

The new UI must not expose workflow states such as:

- `needs_enrichment`
- `needs_review`
- `enrichment_failed`
- `draft_ready`

## 9. Media Handling

Two media fields are required at the product level:

- question image
- explanation image

Design rules:

- both are optional
- both should support preview in the form
- uploaded files should be stored in normal storage and referenced by URL or storage path
- the admin should be able to keep text-only, image-only, or mixed explanations

Validation guidance:

- reject unsupported file types
- apply reasonable file size limits
- keep error messages practical and action-oriented

## 10. Frontend Changes

### Pages To Remove or Rewrite

- `src/pages/admin/ai-settings-page.tsx`
- `src/pages/admin/question-upload-page.tsx`
- `src/pages/admin/question-batch-page.tsx`
- `src/pages/admin/question-enrichment-page.tsx`

### Pages To Simplify

- `src/pages/admin/questions-page.tsx`
- `src/pages/admin/question-editor-page.tsx`
- `src/pages/app/tryout-result-page.tsx`
- `src/pages/app/review-page.tsx`

### Supporting Modules To Simplify or Remove

- `src/lib/api/ai-api.ts`
- AI-specific parts of `src/lib/api/question-authoring-api.ts`
- AI-specific mappers
- AI-specific mocks in `src/mocks/admin-content.ts`
- routes in `src/router/app-router.tsx`

### UI Language Direction

Remove terms such as:

- AI
- enrichment
- confidence
- suggestion
- batch
- parsing
- OCR
- candidate

Replace with simple wording such as:

- tambah soal
- edit soal
- bank soal
- pembahasan
- blok
- materi

## 11. Backend Direction

### Required Behavior

- create question manually
- update question manually
- list questions with blok and materi filters
- upload and attach question image
- upload and attach explanation image

### Remove From Active App Usage

- AI function invocation
- batch upload functions
- enrichment functions
- topic suggestion functions
- AI configuration functions

Legacy backend tables or functions may remain temporarily if removing them immediately creates risk, but the frontend must no longer depend on them.

## 12. Student Experience Impact

Student-facing tryout behavior should remain stable.

### Result Page

Should continue to show:

- final score
- total correct answers
- block-level distribution
- next step to review

Must not refer to AI-generated analysis.

### Review Page

Should continue to show:

- question
- student answer
- correct answer
- pembahasan

Pembahasan should render correctly whether it contains:

- text only
- image only
- text and image

## 13. Error Handling

### Admin Form Errors

- missing pertanyaan
- fewer than 2 valid options
- missing correct answer
- missing blok
- missing materi
- image upload failure
- save failure

### UX Rules

- errors should be short and specific
- validation should point to the missing field directly
- failures should not mention internal AI or removed workflow concepts

## 14. Testing Strategy

### Unit and Component Tests

- question list renders without AI workspace assumptions
- add question form validates required fields
- materi list reacts to chosen blok
- save success state is shown correctly
- edit flow loads existing values
- image preview rendering works when data exists

### Integration Tests

- admin can list questions
- admin can filter by blok and materi
- admin can create a question manually
- admin can edit a question manually
- removed routes no longer appear in navigation

### Regression Checks

- result page still renders submitted results
- review page still renders answer comparison and pembahasan
- no page still imports removed AI API modules

## 15. Migration Strategy

Implementation should prioritize product simplification first, deep schema cleanup second.

Recommended order:

1. remove AI routes and navigation
2. replace question bank UI with manual list and form flow
3. update question API layer to read and write direct question data
4. add image handling for question and explanation
5. remove frontend AI dependencies and tests
6. run regression checks on student result and review flows

Optional later cleanup:

- remove unused AI tables
- remove unused edge functions
- remove unused reference-library concepts if no longer needed

## 16. Risks

- current app code may still expect batch-oriented authoring data
- image upload support may need storage integration not yet present in the simplified form
- old tests will fail until AI assumptions are removed
- historical attempt data may limit how aggressively questions can be deleted

## 17. Success Criteria

This redesign is successful when:

- the admin no longer sees any AI-related workflow
- question creation is manual and straightforward
- each question is tagged with blok and materi
- pembahasan supports text and image
- the bank soal page is understandable without training
- student results and review still work
- the codebase no longer relies on AI authoring modules for core question management
