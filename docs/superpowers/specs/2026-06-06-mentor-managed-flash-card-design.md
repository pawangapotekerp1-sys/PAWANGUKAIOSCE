# Mentor-Managed Flash Card Design

Date: 2026-06-06
Status: Draft for user review

## 1. Summary

This design adds a new mentor-managed feature called `Flash Card`.

The feature allows a mentor to:

1. create one flash card material from a class transcript and one slide PDF
2. choose one academic grouping:
   - `Pharmaceutical Science`
   - `Clinical Science`
   - `Social Behavioral and Administration`
3. run AI analysis across both uploaded sources
4. receive one reviewable draft containing:
   - a global material summary
   - several AI-suggested subtopics
   - one summary per subtopic
   - one flash card deck per subtopic
5. manually review and edit the generated output before publish
6. publish the material so it becomes available to all students

Students do not generate flash cards themselves. They only consume published decks from a new student-facing sidebar item called `Flash Card`.

The student experience is a grouped subtopic library. Students browse published subtopics inside the three academic groupings above, open one deck, flip cards, and mark each card as `mudah`, `sedang`, or `sulit` for guided recall.

Uploaded source files are temporary processing assets. They are stored only long enough to support AI analysis and review, then deleted after publish or draft removal so long-term storage remains light.

## 2. Goals

### Primary Goals

- add a dedicated mentor-managed flash card workflow
- make AI-generated recall content available to all students after mentor review
- combine transcript and slide PDF analysis into one material draft
- support PDFs with either text layers or scanned/photo content through OCR or vision extraction
- group student-visible content by:
  - `Pharmaceutical Science`
  - `Clinical Science`
  - `Social Behavioral and Administration`
- require human review before any generated flash card content becomes public
- support student guided recall with per-card `mudah / sedang / sulit` progress
- delete source upload files after publish to avoid unnecessary long-term storage growth

### Non-Goals

- student self-service flash card generation
- automatic publish without mentor review
- spaced repetition scheduling in the first iteration
- per-cohort, per-class, or per-enrollment access restrictions
- long-term archival of raw uploaded transcript and slide files
- turning flash cards into a full note-taking or annotation system

## 3. Locked Product Decisions

- all published flash card content is visible to all students on the platform
- students only consume flash cards and do not create them
- creation belongs to the mentor surface, similar in spirit to scheduled event creation
- the student library shows subtopics directly, not only top-level materials
- student subtopics are grouped under exactly three academic groupings:
  - `Pharmaceutical Science`
  - `Clinical Science`
  - `Social Behavioral and Administration`
- each material is created from exactly:
  - one transcript source
  - one slide PDF source
- the AI output must include:
  - one material summary
  - multiple subtopics
  - one subtopic summary per subtopic
  - one card deck per subtopic
- mentor review is mandatory before publish
- mentor editing scope for v1 is:
  - edit material title
  - edit subtopic title
  - edit summaries
  - edit card content
  - add cards
  - delete cards
- mentor may not split or merge AI-generated subtopics in v1
- the student recall interaction is `guided recall`, not spaced repetition
- PDF slide sources may be plain text PDFs or scan/photo PDFs
- source upload files are temporary and should be deleted after publish

## 4. Current State

### 4.1 Routing and shells

The app already separates student-style and admin-style surfaces in [app-router.tsx](</E:/Projek TRY OYT/src/router/app-router.tsx:1>).

The student and mentor sidebar is driven from [student-dashboard.ts](</E:/Projek TRY OYT/src/mocks/student-dashboard.ts:1>) and rendered through [product-shell.tsx](</E:/Projek TRY OYT/src/components/layout/product-shell.tsx:1>).

This is the correct place to add:

- a student-facing `Flash Card` entry
- a mentor-facing `Flash Card Creator` entry

### 4.2 Existing mentor-managed authoring patterns

The current codebase already has mentor-managed content workflows that are close to the desired behavior:

- `Question Generator` for AI-assisted content generation
- `Scheduled Event Manager` for mentor-managed creation and later student consumption

This matters because the flash card feature should follow the same product philosophy:

- mentor creates
- system drafts
- mentor reviews
- student consumes only published output

### 4.3 Existing backend shape

The backend uses Supabase for:

- relational persistence
- Storage
- Edge Functions
- authenticated browser clients

The repository also already contains OCR- and AI-related function patterns under `supabase/functions`, which makes an OCR or vision-assisted PDF path realistic for scan-based documents.

## 5. Documentation Context Checked

Two external patterns were verified through Context7 before locking this design:

- Supabase supports the exact workflow this feature needs:
  - upload files to Storage
  - invoke an Edge Function for server-side processing
  - use private buckets and privileged server-side access when needed
- React Router 7 route organization already matches the project's current use of nested routes and lazy-loaded pages, so adding dedicated route families for student and mentor flash card surfaces fits the existing architecture cleanly

These findings support a design where the browser uploads temporary files, a dedicated Edge Function performs OCR plus AI analysis, and the frontend consumes persisted summaries and card decks through route-specific pages.

## 6. Design Decision

### 6.1 Recommended approach

Use a **mentor-managed AI pipeline inside the existing `/app` surface**:

- mentor routes live under `/app/flash-card-generator/*`
- student routes live under `/app/flash-cards/*`
- source files upload to a private Storage bucket
- a dedicated Edge Function processes transcript and slide content
- AI output persists to flash card domain tables
- mentor reviews and edits the draft
- publish makes the output globally visible to all students
- publish also triggers source file cleanup

This is the recommended approach because it matches the current product direction better than a detached ops lane:

- it feels like a learning-content creation surface, not an operational runtime tool
- it is structurally similar to `Question Generator`
- it still preserves review and publication control like `Scheduled Event Manager`

### 6.2 Alternatives considered

#### A. Put flash card management in a separate operational route family

Kelebihan:

- stronger admin-style separation
- cleaner lane boundaries if the feature later grows into a broader content-ops domain

Kekurangan:

- heavier UX for a feature that ultimately behaves like a learning content library
- feels less native beside the existing mentor `/app` creation surfaces

This is not preferred for v1.

#### B. Let students generate flash cards on demand

Kelebihan:

- highly personalized
- no mentor review bottleneck

Kekurangan:

- directly conflicts with the locked product decision
- much higher AI cost and abuse surface
- much weaker content quality control

This is rejected.

#### C. Generate and publish immediately with no review state

Kelebihan:

- smaller initial workflow

Kekurangan:

- too risky because output becomes visible to all students
- gives no quality checkpoint for OCR mistakes, summary drift, or low-quality cards

This is rejected.

## 7. User Experience

### 7.1 Student library

Add a new student-facing route:

- `/app/flash-cards`

Add a new sidebar entry:

- `Flash Card`

The page should:

- present the three academic groupings as the top-level structure
- show published subtopics directly inside each grouping
- let students jump straight to the deck they want
- emphasize that the page is for review and recall, not long-form reading

Each subtopic card should show:

- subtopic title
- parent material title
- short subtopic summary
- card count
- last student activity if available

### 7.2 Student deck page

Add:

- `/app/flash-cards/:subtopicId`

The page should include:

- subtopic title
- parent material title and grouping
- short summary for context
- one flash card viewer
- `mudah / sedang / sulit` controls
- next and previous navigation

The deck should behave like a lightweight guided recall tool:

- front of card prompts recall
- back of card reveals the answer or explanation
- the student marks perceived difficulty after review

### 7.3 Mentor list page

Add:

- `/app/flash-card-generator`

This page should list flash card materials created through the mentor workflow, with status labels such as:

- `Draft`
- `Processing`
- `Ready for review`
- `Published`
- `Failed`

The page should make it easy to:

- create a new material
- reopen an existing draft
- retry failed processing
- see whether content is already student-visible

### 7.4 Mentor create page

Add:

- `/app/flash-card-generator/new`

The page should contain:

- material title
- academic grouping selector
- transcript upload
- slide PDF upload
- guidance that scan/photo PDFs are supported but may need closer review
- a primary CTA such as `Buat draft flash card`

The page should clearly state:

- students cannot see the draft yet
- AI will summarize and split the material into subtopics
- mentor review is required before publish

### 7.5 Mentor review page

Add:

- `/app/flash-card-generator/:materialId`

This page should show:

- material metadata
- processing status
- global material summary
- subtopic list
- flash cards for each subtopic
- publish action

Editable fields for v1:

- material title
- subtopic title
- material summary
- subtopic summary
- card front text
- card back text

Mentor controls for v1:

- add a card
- delete a card
- reorder cards if the implementation can do so cheaply

Mentor controls excluded from v1:

- split one subtopic into two
- merge multiple subtopics
- regenerate only one subtopic from the UI

## 8. Route And Access Design

### 8.1 Student routes

Recommended student routes:

- `/app/flash-cards`
- `/app/flash-cards/:subtopicId`

Access:

- same student-style route family as the rest of `/app`
- published content only

### 8.2 Mentor routes

Recommended mentor routes:

- `/app/flash-card-generator`
- `/app/flash-card-generator/new`
- `/app/flash-card-generator/:materialId`

Access:

- `mentor`
- optionally `admin` if the current product wants admin visibility into the same surface

The implementation should follow the same route-guard pattern already used for mentor-only features like `Question Generator`.

### 8.3 Navigation behavior

Student nav should add:

- `Flash Card`

Mentor nav should add:

- `Flash Card Creator`

The mentor label should feel like a creation workflow, while the student label should feel like a study library.

## 9. Data Model Direction

### 9.1 `flashcard_materials`

Stores one top-level flash card material draft or published item.

Suggested fields:

- `id`
- `title`
- `academic_group`
- `status`
- `global_summary`
- `processing_error`
- `created_by`
- `published_at`
- `created_at`
- `updated_at`

Recommended `academic_group` values:

- `pharmaceutical_science`
- `clinical_science`
- `social_behavioral_and_administration`

Recommended `status` values:

- `draft`
- `processing`
- `ready_for_review`
- `published`
- `failed`

### 9.2 `flashcard_source_files`

Stores temporary metadata for uploaded source files.

Suggested fields:

- `id`
- `material_id`
- `file_kind`
- `storage_bucket`
- `storage_path`
- `original_file_name`
- `mime_type`
- `size_bytes`
- `extraction_status`
- `delete_after_publish`
- `created_at`
- `updated_at`

Recommended `file_kind` values:

- `transcript`
- `slide_pdf`

This table exists for processing and audit lightness, not for permanent content retention.

### 9.3 `flashcard_subtopics`

Stores one student-visible subtopic under a material.

Suggested fields:

- `id`
- `material_id`
- `title`
- `summary`
- `sort_order`
- `created_at`
- `updated_at`

### 9.4 `flashcard_cards`

Stores one flash card under a subtopic.

Suggested fields:

- `id`
- `subtopic_id`
- `front_text`
- `back_text`
- `sort_order`
- `created_at`
- `updated_at`

### 9.5 `student_flashcard_progress`

Stores the student's latest guided recall rating per card.

Suggested fields:

- `id`
- `user_id`
- `card_id`
- `difficulty`
- `last_reviewed_at`
- `created_at`
- `updated_at`

Recommended `difficulty` values:

- `easy`
- `medium`
- `hard`

## 10. Backend Processing Pipeline

### 10.1 Upload phase

The browser should:

1. create the draft material record
2. upload transcript and slide PDF to a private Storage bucket
3. store source metadata
4. invoke a dedicated Edge Function, for example `flashcard-generator`

The bucket should be private because source files are temporary internal processing assets.

### 10.2 Extraction phase

The Edge Function should:

- verify the authenticated user and role
- fetch the source files from Storage
- extract transcript text
- inspect the slide PDF

For the PDF path:

- if the PDF has readable text, use direct text extraction
- if the PDF is scan- or photo-based, use OCR or vision extraction

The implementation should not assume every slide PDF has a clean text layer.

### 10.3 Analysis phase

The AI pipeline should combine both sources and produce:

- material summary
- subtopic breakdown
- subtopic summaries
- flash cards per subtopic

The prompt should encourage:

- high factual closeness to the uploaded material
- concise recall-oriented cards
- natural grouping into a few coherent subtopics
- no unnecessary expansion outside the source material

### 10.4 Persistence phase

After successful analysis, the function should:

- save the material summary
- insert subtopics
- insert cards
- set material status to `ready_for_review`

If processing fails, the function should:

- preserve the draft shell
- set status to `failed`
- save a practical error message for retry and diagnosis

## 11. Source File Lifecycle

### 11.1 Storage policy

Source files should be treated as temporary processing inputs, not long-lived content.

Recommended behavior:

- keep source files while the material is still in draft, processing, failed, or ready-for-review states
- delete source files automatically after publish succeeds
- delete source files if the draft material is deleted

### 11.2 Why cleanup happens after publish

This timing preserves a safe review window:

- the mentor can still retry processing if needed before publish
- the system does not retain raw class source files indefinitely

### 11.3 Post-cleanup persistence

After cleanup, the system should still retain:

- material metadata
- summaries
- subtopics
- cards
- lightweight source metadata if needed

The system should not depend on the raw files remaining available after publish.

## 12. Guided Recall Behavior

### 12.1 Student interaction

Each student should be able to:

- flip a card
- move to the next or previous card
- rate that card as:
  - `mudah`
  - `sedang`
  - `sulit`

### 12.2 v1 storage behavior

The first version only needs the latest rating state per student per card.

This supports:

- lightweight progress memory
- future filtering such as `show difficult cards first`

It does not yet require:

- spaced repetition intervals
- daily review queues
- card scheduling algorithms

## 13. Permissions And Visibility

### 13.1 Mentor access

Create, edit, retry, and publish actions should be limited to mentor-authorized users.

Recommended allowed roles:

- `mentor`
- optionally `admin` if the same creation surface should be available there

### 13.2 Student access

Students should only be able to:

- list published subtopics
- open published decks
- write their own guided recall ratings

Students must not be able to:

- read draft materials
- read failed materials
- access source file metadata or raw uploaded files

### 13.3 RLS direction

Recommended database protection:

- public student reads limited to `published` content tables
- mentor writes limited by role-aware policies or privileged RPC/Edge Function paths
- `student_flashcard_progress` limited to `(select auth.uid()) = user_id`

## 14. Frontend API And Component Direction

### 14.1 Suggested API module

Add a dedicated API layer, for example:

- `src/lib/api/flash-card-api.ts`

Recommended responsibilities:

- create draft material metadata
- upload source files
- invoke flash card processing
- list mentor materials
- load mentor review data
- save review edits
- publish material
- list published student subtopics by grouping
- load one student deck
- save student difficulty rating

### 14.2 Suggested page modules

Recommended new pages:

- `src/pages/app/flash-cards-page.tsx`
- `src/pages/app/flash-card-deck-page.tsx`
- `src/pages/app/flash-card-generator-page.tsx`
- `src/pages/app/flash-card-generator-create-page.tsx`
- `src/pages/app/flash-card-generator-review-page.tsx`

### 14.3 Suggested supporting components

- flash card grouping section
- flash card library row or tile
- flash card deck viewer
- difficulty controls
- mentor material list
- mentor source upload form
- mentor subtopic review editor
- mentor card editor

The UI should reuse existing panel, shell, and state components where possible.

## 15. Error Handling

Expected failure classes:

- missing transcript upload
- missing PDF upload
- unsupported or unreadable file format
- OCR extraction weakness on scan/photo PDFs
- AI processing failure
- malformed AI output
- persistence failure
- publish failure

UX guidance:

- failed processing should preserve the draft record
- the mentor should be able to retry from the existing draft
- scan/photo PDF flows should surface a warning that human review is especially important
- publish failure should not delete source files
- student pages should never surface unpublished content due to partial backend state

## 16. Testing Strategy

### Unit and mapper tests

- academic grouping mapping
- status-to-label mapping
- student difficulty mapping
- AI response normalization into material, subtopics, and cards

### Component tests

- student sidebar shows `Flash Card`
- mentor sidebar shows `Flash Card Creator`
- student library groups subtopics under the three academic groupings
- deck viewer flips cards and saves `mudah / sedang / sulit`
- mentor review editor supports add and delete card actions
- mentor status panels render `processing`, `failed`, and `ready_for_review`

### API and integration tests

- mentor can create a draft material
- source file upload metadata persists correctly
- processing can move a material from `draft` to `ready_for_review`
- failed processing lands in `failed`
- publish exposes content to student routes only after status changes
- publish deletes source files and preserves content tables
- student progress writes remain user-owned only

### Regression tests

- existing student routes and mentor routes still render correctly with the new nav items
- `Question Generator` and `Scheduled Event Manager` remain unaffected
- deleting draft flash card materials does not remove unrelated Storage objects

## 17. Risks

- OCR quality on scan-based PDFs may produce imperfect summaries or weak cards
- AI may split subtopics in a way that is reviewable but not ideal, since v1 does not support merge or split editing
- deleting raw source files after publish prevents later reprocessing without a new upload
- globally visible content raises the cost of any review miss
- large transcript plus slide combinations may require careful prompt size management

## 18. Success Criteria

This feature is successful when:

- a mentor can upload transcript and slide PDF and generate a flash card draft
- scan/photo PDFs still produce reviewable output through OCR or vision extraction
- the draft contains one global summary, several subtopics, and flash cards
- the mentor can edit summaries and cards before publish
- students can browse published subtopics grouped by the three academic groupings
- students can use decks without generating content themselves
- students can rate cards as `mudah`, `sedang`, or `sulit`
- source upload files do not remain stored indefinitely after publish

## 19. Approval Gate

This spec is ready for user review. After the user approves it, the next step should be a dedicated implementation plan written from this design.
