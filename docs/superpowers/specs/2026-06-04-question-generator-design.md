# Question Generator With Gemini Design

Date: 2026-06-04
Status: Draft for user review

## 1. Summary

This design adds a new admin and mentor feature called `Question Generator`.

The feature allows a user to:

1. enter 1 to 3 reference questions
2. provide each reference in full multiple-choice format
3. choose how many new questions to generate
4. run Gemini using the user's own API key
5. review and manually edit the generated drafts
6. distribute selected drafts to either:
   - the regular tryout question bank with manual blok and materi selection
   - a scheduled tryout event with manual event selection

The generator must keep generated material close to the reference questions. It should not drift too far in topic, concept, or difficulty.

The user-approved default Gemini model is `gemini-2.5-flash`.

## 2. Goals

### Primary Goals

- add a dedicated AI-assisted question generator for admin and mentor
- keep generated questions close to the user-provided reference material
- support two generation behaviors in one batch:
  - copy concept
  - paraphrase
- force output into the current production-ready multiple-choice format
- require human review before any generated content becomes usable
- allow one draft to be distributed multiple times to different destinations

### Non-Goals

- automatic blok or materi classification
- automatic scheduled event selection
- public student access to question generation
- direct publish to live tryout content without review
- reviving old upload batch, enrichment, OCR, or AI review product surfaces

## 3. Locked Product Decisions

- access is limited to `admin` and `mentor`
- the generator accepts `1 to 3` reference questions
- `1` reference question is valid and must work
- each reference must include:
  - question stem
  - options A-E
  - one correct answer
  - explanation
- generated output must also include:
  - question stem
  - options A-E
  - one correct answer
  - explanation
- generation composition is fixed at `50% copy concept` and `50% paraphrase`
- for an odd target count, the extra item goes to `copy concept`
- generated results enter a reviewable draft state first
- drafts are manually editable before distribution
- distribution metadata is manual:
  - bank soal requires manual blok and materi choice
  - scheduled tryout requires manual event choice
- one generated draft may be distributed more than once
- the UI must not re-expose `question upload batches`, `enrichment queue`, or similar legacy AI authoring surfaces
- each admin or mentor uses their own Gemini BYOK credential for this feature
- default model is `gemini-2.5-flash`

## 4. User Experience

### 4.1 Entry Points

Add a new dedicated feature surface for both admin and mentor:

- `/admin/question-generator`
- `/app/question-generator`

This should appear as a distinct feature and not be framed as part of the old batch upload workflow.

### 4.2 Generate Batch Page

The generator page should contain:

- a form for `1 to 3` reference questions
- full A-E answer fields for each reference
- correct answer selector for each reference
- explanation field for each reference
- target generated count
- BYOK Gemini API key configuration or connection status
- model display showing default `gemini-2.5-flash`
- a primary CTA such as `Generate draft`

The page should make these constraints visible:

- minimum reference count is 1
- maximum reference count is 3
- output is always draft first
- generated material stays close to the references
- composition is fixed to copy concept plus paraphrase

### 4.3 Review Batch Page

After generation completes, the user lands in a dedicated review surface for that batch.

This page should show:

- batch summary
- generation status
- each draft item with mode label:
  - `Copy konsep`
  - `Parafrase`
- draft distribution history summary
- full manual editing controls
- bulk and per-item distribution actions

### 4.4 Draft Editing

Each generated draft must be editable in place before distribution.

Editable fields:

- stem
- options A-E
- correct answer
- explanation

Recommended behavior:

- preserve the generation mode metadata for audit
- mark the item as edited once the user changes any content
- keep the draft editable even after it has already been distributed once

### 4.5 Distribution Actions

Two separate distribution flows are required.

#### Send To Bank Soal

The user selects:

- blok
- materi

The system then creates a new final question in the regular tryout question bank.

#### Send To Scheduled Event

The user selects:

- target scheduled tryout event

The system then creates a new event question snapshot in that event.

### 4.6 Distribution Reuse

Drafts are reusable.

Examples:

- one draft can be sent to bank soal and later to one scheduled event
- one draft can be sent to multiple scheduled events
- one draft can be sent to bank soal multiple times only if product intentionally allows duplicate final questions

Implementation should at minimum log every delivery so the UI can clearly show where a draft has already been used.

## 5. Generation Behavior

### 5.1 Core Prompting Rules

The Gemini prompt must enforce:

- close adherence to the reference material
- same topic neighborhood
- same answer format A-E
- one clear correct answer
- explanation that matches the chosen correct answer
- balanced split between `copy concept` and `paraphrase`

The prompt should explicitly forbid:

- moving into unrelated materi
- changing the question family too aggressively
- omitting explanations
- returning prose outside the requested JSON structure

### 5.2 One-Reference Behavior

When the user provides only one reference question:

- generation still proceeds
- prompt instructions must become stricter
- the generated questions should stay especially close in concept, scope, and distractor style

### 5.3 Multiple-Reference Behavior

When the user provides two or three reference questions:

- Gemini should infer the shared concept pattern
- it may vary surface wording and case detail
- it must still remain within the conceptual center of those references

### 5.4 Output Shape

The backend should request structured JSON output from Gemini and validate it before saving.

Required output fields per generated item:

- `stem`
- `options`
- `correctOptionKey`
- `explanationText`
- `generationMode`

The `options` field must contain keys A-E.

## 6. Validation Rules

### 6.1 Reference Input Validation

Generation must fail fast if any required reference field is missing:

- empty stem
- fewer than 5 answer options if product locks to full A-E
- missing correct option
- missing explanation

### 6.2 Generated Output Validation

The backend must reject generated items if:

- JSON is invalid
- any required field is missing
- there are not exactly five answer options A-E
- the correct option is missing from the options
- explanation is empty
- the item count does not match the request
- generation mode composition does not match the expected split closely enough

### 6.3 Safety and Quality Validation

Implementation should add lightweight guardrails before persistence:

- reject obviously duplicated items within the same batch
- reject explanation-answer mismatch when trivially detectable
- reject empty or near-empty distractors
- reject items that clearly escape the target subject domain

This does not replace human review. It only prevents low-quality persistence.

## 7. Permissions and Credentials

### 7.1 Access Control

The feature is available only to:

- `admin`
- `mentor`

It should follow the same route protection family already used for question bank and scheduled ops access.

### 7.2 BYOK Model

Each admin or mentor stores a personal Gemini key for this generator workflow.

Recommended settings data:

- `user_id`
- `provider`
- `model`
- `secret_id`
- `last_validated_at`
- `last_error`

The default model is:

- `gemini-2.5-flash`

The credential flow should support:

- save key
- test key
- replace key
- delete key
- show current validation status

## 8. Architecture Direction

This feature should be presented as a new product surface, but may reuse internal draft authoring storage behind the scenes.

Important constraint:

- internal reuse is allowed
- old `question upload batch` and `enrichment` product surfaces must stay hidden

Recommended split:

- dedicated generator pages and APIs for user-facing behavior
- internal reuse of existing draft/question storage only where it reduces duplication
- separate generator metadata tables for batch, reference, and delivery tracking

## 9. Data Model Direction

Recommended new tables:

### 9.1 `generator_user_settings`

Stores per-user generator credential metadata.

Suggested fields:

- `id`
- `user_id`
- `provider`
- `model`
- `secret_id`
- `last_validated_at`
- `last_error`
- `created_at`
- `updated_at`

### 9.2 `question_generation_batches`

Stores one generator run.

Suggested fields:

- `id`
- `created_by`
- `model`
- `target_question_count`
- `reference_count`
- `status`
- `generated_count`
- `failed_reason`
- `created_at`
- `updated_at`

### 9.3 `question_generation_references`

Stores the source questions the user entered.

Suggested fields:

- `id`
- `batch_id`
- `reference_order`
- `stem`
- `options_snapshot`
- `correct_option_key`
- `explanation_text`
- `created_at`

### 9.4 `question_generation_items`

Stores one generated draft item and connects it to its editable internal draft representation.

Suggested fields:

- `id`
- `batch_id`
- `draft_question_id` or internal draft linkage
- `item_order`
- `generation_mode`
- `status`
- `edited_at`
- `created_at`
- `updated_at`

### 9.5 `question_generation_deliveries`

Stores delivery history.

Suggested fields:

- `id`
- `generation_item_id`
- `destination_type`
- `destination_question_id`
- `destination_event_id`
- `destination_event_question_id`
- `block_id`
- `topic_id`
- `delivered_by`
- `created_at`

## 10. Status Model

### 10.1 Batch Status

Recommended statuses:

- `generating`
- `ready_for_review`
- `partially_distributed`
- `completed`
- `failed`

Meaning:

- `generating`: Gemini call and persistence still running
- `ready_for_review`: drafts are ready and editable
- `partially_distributed`: at least one item has been delivered but not all items have any delivery
- `completed`: all items have at least one delivery if product wants this derived state
- `failed`: generation could not complete

### 10.2 Item Status

Recommended statuses:

- `draft_generated`
- `draft_edited`
- `archived`

Distribution state should not be encoded directly on the item because one item may be delivered many times.

Distribution history should be read from `question_generation_deliveries`.

## 11. Backend Behavior

### 11.1 Edge Function

Create a dedicated Supabase Edge Function for question generation.

Responsibilities:

- verify authenticated user and role
- load BYOK secret
- validate input references
- build Gemini prompt
- request structured JSON
- validate output
- persist batch, references, and items
- log errors cleanly

### 11.2 Gemini Integration

Reuse the existing shared Gemini client if possible.

Enhancements needed:

- support structured JSON response configuration
- support larger response sizes for batch generation
- support prompt templates for generation mode control

### 11.3 Delivery Operations

Bank soal delivery should:

- create a new record in `questions`
- create matching `question_options`
- create matching `question_explanations`
- log the delivery

Scheduled event delivery should:

- create a new `scheduled_tryout_event_question`
- create matching `scheduled_tryout_event_question_options`
- include explanation text for review mode parity
- log the delivery

## 12. Frontend Changes

Recommended new pages:

- `src/pages/admin/question-generator-page.tsx`
- `src/pages/admin/question-generator-review-page.tsx`
- `src/pages/app/question-generator-page.tsx`
- `src/pages/app/question-generator-review-page.tsx`

Recommended new API modules:

- `src/lib/api/question-generator-api.ts`

Recommended supporting UI modules:

- reference question form section
- generated draft card/list
- inline/manual draft editor
- delivery modal for bank soal
- delivery modal for scheduled event
- BYOK status panel for this feature

Routing should add:

- `/admin/question-generator`
- `/admin/question-generator/:batchId`
- `/app/question-generator`
- `/app/question-generator/:batchId`

Navigation labels should be explicit, for example:

- `Question Generator`

The navigation must not resurrect labels such as:

- upload batch
- enrichment
- AI queue

## 13. Error Handling

User-facing errors should stay practical and not leak provider noise unless useful.

Expected error classes:

- missing or invalid Gemini key
- validation failure on reference input
- Gemini request failure
- malformed AI output
- persistence failure
- delivery failure to question bank
- delivery failure to scheduled event

UX guidance:

- generation failures should preserve reference input if possible
- review edits should not be lost on failed delivery
- delivery errors should report which item failed

## 14. Testing Strategy

### Unit Tests

- input validation for 1, 2, and 3 references
- composition logic for even and odd generated counts
- generated JSON parsing and validation
- delivery payload mapping to bank soal
- delivery payload mapping to scheduled event

### Component Tests

- generator form allows exactly 1 to 3 references
- one-reference submission is valid
- BYOK status renders correctly
- review editor loads generated drafts
- delivery modals require manual metadata selection

### Integration Tests

- admin can generate a draft batch
- mentor can generate a draft batch
- student cannot access the route
- generated items remain editable before and after one delivery
- one draft can be delivered to both bank soal and scheduled event

### Regression Tests

- question bank still works without exposing legacy batch UI
- scheduled event editor still works with manually added event questions
- old hidden draft storage changes do not leak into current user-facing routes

## 15. Risks

- reusing existing draft storage may accidentally reintroduce old authoring concepts in the UI
- Gemini may occasionally return structurally valid but conceptually weak distractors
- one-reference generation has higher drift risk than multi-reference generation
- duplicate delivery behavior may create too many similar final questions if the UX is unclear
- large generation requests may hit token or provider limits

## 16. Success Criteria

This feature is successful when:

- admin and mentor can generate drafts from 1 to 3 reference questions
- one-reference input works reliably
- output always lands in a reviewable draft workflow first
- drafts can be manually edited
- drafts can be distributed to both supported destinations
- manual blok, materi, and event selection happen at distribution time
- the generated content stays close to the reference topic
- legacy upload batch and enrichment surfaces remain hidden from the product
