# Tryout Topic Catalog And Question Counts Design

Date: 2026-05-05
Status: Draft for user review

## 1. Summary

This design expands the `pro` tryout catalog in two ways:

1. add `try out per materi` for all 15 topics
2. standardize question counts by tryout type:
   - full tryout: 50 random questions from the full published bank
   - block tryout: 30 random questions from the selected block
   - topic tryout: 20 random questions from the selected topic

The catalog should remain simple to scan by grouping topic tryouts under their parent blocks.

## 2. Goals

### Primary Goals

- expose 15 topic-level tryout options in the student catalog
- keep catalog structure readable by grouping topics under each block
- make question counts consistent and explicit across tryout types
- ensure runtime question selection follows tags, not hand-curated static lists

### Non-Goals

- changing scoring rules
- changing the review flow
- adding advanced filtering or search to the tryout catalog
- redesigning analytics or dashboard surfaces

## 3. Scope

### In Scope

- add topic-level tryout entries to the catalog
- support `topic` as a first-class tryout mode
- update template metadata and runtime selection logic
- update seed data to produce:
  - 1 full template
  - 3 block templates
  - 15 topic templates
- enforce question-count rules `50/30/20`
- update frontend catalog grouping and labels
- update tests for migration, runtime API, and catalog rendering

### Out of Scope

- per-user adaptive difficulty
- custom question counts chosen by the student
- pagination for the topic catalog
- manual curation of question order inside generated attempts

## 4. Product Decisions Locked

- topic tryouts are displayed in the same catalog page as full and block tryouts
- topic tryouts are grouped under their parent block headings
- full tryout always targets 50 random published questions
- block tryout always targets 30 random published questions from the block
- topic tryout always targets 20 random published questions from the topic
- if a bank does not contain enough published questions for the requested scope, the app should fail clearly instead of silently creating a shorter attempt

## 5. Experience Design

### Catalog Structure

`/app/tryout` should render three sections:

1. `Simulasi penuh`
   - one card
   - fixed count label `50 soal`

2. `Try out per blok`
   - three cards, one per block
   - fixed count label `30 soal`

3. `Try out per materi`
   - grouped by block
   - each group has a block heading
   - each topic card in that group shows `20 soal`

### Visual Scanning Rules

- full tryout remains the primary card
- block cards remain one level below full tryout
- topic cards are visually subordinate to the block grouping they belong to
- topic names should use the saved `topics.name` values directly

### Failure States

If a user starts a tryout whose published bank is smaller than the required target:

- the start RPC should reject the request
- the UI should show a clear error stating that the bank for that tryout is not sufficient yet

## 6. Data Model Direction

The current `exam_templates` model is not sufficient because it only supports `full` and `block`.

Recommended changes:

- extend `exam_templates.mode` to allow `topic`
- add nullable `topic_id` to `exam_templates`
- keep `block_id` for block templates
- keep `block_id` nullable for full templates
- keep `topic_id` nullable for full and block templates

Recommended template contract:

- `full`
  - `block_id = null`
  - `topic_id = null`
- `block`
  - `block_id = required`
  - `topic_id = null`
- `topic`
  - `block_id = required` or derivable from topic join
  - `topic_id = required`

## 7. Runtime Selection

The current runtime relies on `exam_template_items`, which implies a static prebuilt question list. That conflicts with the new requirement for random question generation by scope.

Recommended runtime behavior:

- `start_attempt_from_template` should resolve template mode and target scope
- it should select random published questions directly from `questions`
- selected questions must join to `question_options` exactly as today when building `attempt_items`

Selection rules:

- `full`
  - source: all published questions
  - count: 50
- `block`
  - source: published questions where `block_id = template.block_id`
  - count: 30
- `topic`
  - source: published questions where `topic_id = template.topic_id`
  - count: 20

Validation rules:

- if available published question count is below the target, raise a domain error
- do not create partial attempts

## 8. Seed Direction

Seed data should define:

- 1 published full template
- 3 published block templates
- 15 published topic templates

Template labels should match the product language:

- full: `Try Out Besar`
- block: block names from `blocks.name`
- topic: topic names from `topics.name`

Question counts in seed metadata should match the business rules:

- full: 50
- block: 30
- topic: 20

## 9. Frontend Changes

Frontend mapper and page changes should:

- recognize `topic` mode
- group topic templates by block
- label cards correctly:
  - `Simulasi penuh`
  - `Try out per blok`
  - `Try out per materi`
- render fixed count labels from template metadata

The catalog page should not flatten 15 topic cards into one undifferentiated list.

## 10. Testing Strategy

Tests should cover:

- migration extends `exam_templates` for `topic` mode and `topic_id`
- runtime RPC can build attempts from `full`, `block`, and `topic`
- runtime rejects insufficient published bank sizes
- published template listing returns topic metadata needed by the catalog
- catalog renders:
  - one full section
  - one block section
  - topic groups under the correct blocks
  - correct `50/30/20` count labels

## 11. Risks And Constraints

- current local seed data does not contain enough published questions to satisfy `50/30/20`; this will need additional seed expansion or a deliberate local-only compromise during development
- switching from static template items to runtime random selection affects both database logic and tests
- if `exam_template_items` remains in schema for compatibility, the app should stop depending on it for these dynamic tryout modes
