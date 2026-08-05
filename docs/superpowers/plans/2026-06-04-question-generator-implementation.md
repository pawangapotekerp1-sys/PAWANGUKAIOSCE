# Question Generator Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin and mentor `Question Generator` feature powered by user-owned Gemini keys, where 1-3 reference questions produce reviewable A-E draft questions that stay close to the reference topic and can later be distributed to either bank soal or scheduled tryout events.

**Architecture:** Add a dedicated question-generator product surface while keeping legacy upload batch and enrichment workflows hidden. Persist generator-specific batch, reference, item, and delivery metadata in new Supabase tables; use a dedicated Edge Function for prompt construction, Gemini JSON generation, output validation, and topic-proximity guardrails; then expose review and delivery flows through new React pages and a dedicated frontend API module. Reuse existing final-question and scheduled-event persistence paths only at delivery time so generated content never becomes live before human review.

**Tech Stack:** React 19, React Router 7, TanStack React Query 5, TypeScript, Zod, Supabase Edge Functions on Deno, Supabase Postgres migrations, Vitest, Testing Library.

---

## File Structure

- Create: `supabase/migrations/20260604000036_question_generator.sql`
  Responsibility: define generator BYOK settings, batch/reference/item/delivery tables, RLS, helper views or functions, and any indexes needed for batch review and delivery history.
- Create: `supabase/migrations/20260604000036_question_generator.test.ts`
  Responsibility: assert that the migration creates the generator tables, expected constraints, and permissions.
- Modify: `supabase/functions/_shared/gemini-client.ts`
  Responsibility: add structured JSON response support and higher-output generation config support while preserving existing text-generation callers.
- Create: `supabase/functions/_shared/question-generator.ts`
  Responsibility: own prompt building, target mode split calculation, topic-closeness instructions, output schema parsing, and generator-specific validation helpers.
- Create: `supabase/functions/_shared/question-generator.test.ts`
  Responsibility: cover split calculation, prompt guardrails, and output validation rules for malformed or topic-drifting responses.
- Create: `supabase/functions/question-generator/index.ts`
  Responsibility: implement generator credential actions, batch generation, draft save, review fetch, and delivery endpoints using the new generator tables plus existing final-question and scheduled-event persistence paths.
- Create: `supabase/functions/question-generator/index.test.ts`
  Responsibility: cover role gating, BYOK action handling, generation failure paths, and delivery action behavior at the function layer.
- Create: `src/lib/api/question-generator-api.ts`
  Responsibility: wrap frontend calls to the new `question-generator` Edge Function and normalize payloads for BYOK, generation, review, and distribution flows.
- Create: `src/lib/api/question-generator-api.test.ts`
  Responsibility: test API request shapes, response mapping, and error propagation.
- Create: `src/lib/mappers/question-generator-mappers.ts`
  Responsibility: map raw backend payloads into page-friendly view models for batch lists, review items, and delivery history summaries.
- Create: `src/lib/mappers/question-generator-mappers.test.ts`
  Responsibility: verify mode labels, status labels, and delivery summary mapping.
- Create: `src/components/question-generator/reference-question-form.tsx`
  Responsibility: render one reference question editor with A-E fields, correct answer selector, and explanation.
- Create: `src/components/question-generator/reference-question-form.test.tsx`
  Responsibility: verify required fields, option rendering, and one-reference validity messaging.
- Create: `src/components/question-generator/generated-draft-editor.tsx`
  Responsibility: render editable generated draft content with stem, A-E options, answer key, explanation, and mode badge.
- Create: `src/components/question-generator/generated-draft-editor.test.tsx`
  Responsibility: verify manual edit behavior and edited state signaling.
- Create: `src/components/question-generator/delivery-dialog.tsx`
  Responsibility: render manual metadata collection for either bank soal delivery or scheduled event delivery.
- Create: `src/components/question-generator/delivery-dialog.test.tsx`
  Responsibility: verify blok and materi are required for bank soal and event selection is required for scheduled-event delivery.
- Create: `src/pages/admin/question-generator-page.tsx`
  Responsibility: admin wrapper page for generator create flow.
- Create: `src/pages/admin/question-generator-review-page.tsx`
  Responsibility: admin wrapper page for generator review flow.
- Create: `src/pages/app/question-generator-page.tsx`
  Responsibility: mentor wrapper page for generator create flow.
- Create: `src/pages/app/question-generator-review-page.tsx`
  Responsibility: mentor wrapper page for generator review flow.
- Create: `src/pages/admin/question-generator-page.test.tsx`
  Responsibility: page-level tests for generation form, BYOK status, and submission flow.
- Create: `src/pages/admin/question-generator-review-page.test.tsx`
  Responsibility: page-level tests for review editing, delivery actions, and delivery history rendering.
- Modify: `src/router/app-router.tsx`
  Responsibility: register the new admin and mentor routes.
- Modify: `src/router/route-guards.tsx`
  Responsibility: add or generalize route protection so admin and mentor can access the generator surface without reusing the bank-soal redirect behavior incorrectly.
- Modify: `src/router/app-router.test.tsx`
  Responsibility: cover route visibility and protection for admin, mentor, pro, and anonymous users.
- Modify: `src/mocks/admin-content.ts`
  Responsibility: add `Question Generator` to admin navigation.
- Modify: `src/mocks/student-dashboard.ts`
  Responsibility: add `Question Generator` to mentor navigation only.
- Optional modify if delivery code reuse is extracted cleanly: `src/lib/api/question-authoring-api.ts`
  Responsibility: expose a small reusable final-question insert helper if it reduces duplication in the new generator API contract without surfacing old batch concepts.
- Optional modify if scheduled event insert reuse is extracted cleanly: `src/lib/api/scheduled-tryout-api.ts`
  Responsibility: expose a small reusable event-question insert helper if it keeps delivery logic focused and avoids repeating payload rules.

## Chunk 1: Persistence and Generator Rules

### Task 1: Write failing migration tests for generator tables and policies

**Files:**
- Create: `supabase/migrations/20260604000036_question_generator.test.ts`

- [ ] Add a failing migration test that expects `generator_user_settings`, `question_generation_batches`, `question_generation_references`, `question_generation_items`, and `question_generation_deliveries` to exist.
- [ ] Add a failing migration test that expects role-appropriate RLS to protect BYOK secrets and generator records from unrelated users.
- [ ] Add a failing migration test that expects delivery history and batch status fields required by the spec.
- [ ] Run: `npx vitest run supabase/migrations/20260604000036_question_generator.test.ts`
- [ ] Confirm the suite fails because the migration does not yet exist.

### Task 2: Implement the generator schema

**Files:**
- Create: `supabase/migrations/20260604000036_question_generator.sql`
- Test: `supabase/migrations/20260604000036_question_generator.test.ts`

- [ ] Define `generator_user_settings` with `user_id`, `provider`, `model`, `secret_id`, validation metadata, and timestamps.
- [ ] Define `question_generation_batches` with model, target count, reference count, status, generated count, failed reason, and creator metadata.
- [ ] Define `question_generation_references` with full source snapshots including A-E options, correct answer, and explanation text.
- [ ] Define `question_generation_items` with batch linkage, generation mode, editable draft linkage, status, and timestamps.
- [ ] Define `question_generation_deliveries` with destination type, final-question or event-question linkage, manual taxonomy metadata, and actor metadata.
- [ ] Add RLS policies so only the owning admin or mentor can access their BYOK settings and generator batches unless broader admin visibility is intentionally added.
- [ ] Add helpful indexes for `created_by`, `batch_id`, `generation_item_id`, and delivery lookups.
- [ ] Re-run: `npx vitest run supabase/migrations/20260604000036_question_generator.test.ts`
- [ ] Confirm the migration suite passes.

### Task 3: Write failing helper tests for generation rules and topic guardrails

**Files:**
- Create: `supabase/functions/_shared/question-generator.test.ts`

- [ ] Add a failing test that calculates even target counts as an exact 50-50 split between `copy_concept` and `paraphrase`.
- [ ] Add a failing test that calculates odd target counts with the extra item assigned to `copy_concept`.
- [ ] Add a failing test that rejects generated items missing exactly five options A-E.
- [ ] Add a failing test that rejects generated items when the explanation is empty or the correct option key is absent from the options.
- [ ] Add a failing test that checks the prompt instructions explicitly require the generated topic to stay close to the references and forbid unrelated materi drift.
- [ ] Run: `npx vitest run supabase/functions/_shared/question-generator.test.ts`
- [ ] Confirm the suite fails until the shared helper exists.

### Task 4: Implement prompt building, split logic, and strict output validation

**Files:**
- Create: `supabase/functions/_shared/question-generator.ts`
- Modify: `supabase/functions/_shared/gemini-client.ts`
- Test: `supabase/functions/_shared/question-generator.test.ts`

- [ ] Add a generator helper that computes the requested count per mode using the product rule that odd counts bias toward `copy_concept`.
- [ ] Add a prompt builder that embeds all reference questions and explicitly instructs Gemini to stay in the same topic neighborhood, concept family, and difficulty band.
- [ ] Include a dedicated prompt section that says the output must not move into unrelated materi, disease families, therapeutic targets, or concept domains outside the references.
- [ ] Extend the shared Gemini client so generator callers can request structured JSON responses instead of free-form text only.
- [ ] Parse the Gemini JSON into a schema-validated structure and reject malformed, incomplete, or count-mismatched outputs before persistence.
- [ ] Re-run: `npx vitest run supabase/functions/_shared/question-generator.test.ts`
- [ ] Confirm the helper suite passes.

### Task 5: Checkpoint persistence and rule helpers

**Files:**
- No new files.

- [ ] Stage only the new migration and shared generator helper files.
- [ ] Commit:

```bash
git add supabase/migrations/20260604000036_question_generator.sql supabase/migrations/20260604000036_question_generator.test.ts supabase/functions/_shared/gemini-client.ts supabase/functions/_shared/question-generator.ts supabase/functions/_shared/question-generator.test.ts
git commit -m "feat: add question generator persistence and validation"
```

## Chunk 2: Edge Function and Delivery Backend

### Task 6: Write failing function tests for BYOK, generation, and delivery

**Files:**
- Create: `supabase/functions/question-generator/index.test.ts`

- [ ] Add a failing test that rejects anonymous users and non-admin or non-mentor roles from generator actions.
- [ ] Add a failing test that saves and tests a personal Gemini key using Vault-backed secret patterns.
- [ ] Add a failing test that accepts exactly one valid reference question and starts generation successfully.
- [ ] Add a failing test that rejects references which do not include full A-E options, correct answer, or explanation.
- [ ] Add a failing test that persists a generated batch with draft items and mode metadata.
- [ ] Add a failing test that delivers one item to bank soal only when blok and materi are provided.
- [ ] Add a failing test that delivers one item to a scheduled event only when event id is provided.
- [ ] Run: `npx vitest run supabase/functions/question-generator/index.test.ts`
- [ ] Confirm the suite fails because the function does not exist yet.

### Task 7: Implement question-generator Edge Function actions

**Files:**
- Create: `supabase/functions/question-generator/index.ts`
- Modify: `supabase/functions/_shared/question-generator.ts`
- Test: `supabase/functions/question-generator/index.test.ts`

- [ ] Implement BYOK actions for `get-status`, `save-credential`, `delete-credential`, and `test-credential` using `generator_user_settings`.
- [ ] Reuse the existing Vault write and read pattern from other Gemini-backed functions, but keep generator credentials isolated from student insight credentials.
- [ ] Implement a `generate` action that validates reference input, calls Gemini with structured JSON, enforces topic-proximity instructions, and persists the batch, references, and items.
- [ ] Implement a `get-batch` action that returns the batch summary, references, generated items, and delivery history for the review page.
- [ ] Implement an `update-item` action that saves manual edits to the generated draft item.
- [ ] Implement a `deliver-to-question-bank` action that creates final question records plus delivery logs.
- [ ] Implement a `deliver-to-scheduled-event` action that creates scheduled event question snapshots plus delivery logs.
- [ ] Re-run: `npx vitest run supabase/functions/question-generator/index.test.ts`
- [ ] Confirm the function suite passes.

### Task 8: Add backend topic-nearness assertions that are stronger than prompt wording alone

**Files:**
- Modify: `supabase/functions/_shared/question-generator.ts`
- Modify: `supabase/functions/question-generator/index.ts`
- Test: `supabase/functions/question-generator/index.test.ts`

- [ ] Add a lightweight lexical guard that compares generated stems and explanations against reference-domain terms so obviously off-topic outputs are rejected even if the JSON shape is valid.
- [ ] Keep the heuristic narrow and understandable: it should catch clear drift, not try to replace academic review.
- [ ] Return a practical error message such as `Hasil generator terlalu jauh dari topik referensi. Coba kurangi jumlah soal atau perjelas referensi.` when this guard trips.
- [ ] Add a failing test first for an off-topic generated payload, then make it pass.
- [ ] Re-run: `npx vitest run supabase/functions/question-generator/index.test.ts supabase/functions/_shared/question-generator.test.ts`
- [ ] Confirm both suites pass with the new guardrail.

### Task 9: Checkpoint the backend feature slice

**Files:**
- No new files.

- [ ] Stage only the `question-generator` function files.
- [ ] Commit:

```bash
git add supabase/functions/question-generator/index.ts supabase/functions/question-generator/index.test.ts supabase/functions/_shared/question-generator.ts supabase/functions/_shared/question-generator.test.ts
git commit -m "feat: add question generator edge function"
```

## Chunk 3: Frontend API, Routing, and Navigation

### Task 10: Write failing tests for API wrappers and route visibility

**Files:**
- Create: `src/lib/api/question-generator-api.test.ts`
- Modify: `src/router/app-router.test.tsx`

- [ ] Add a failing API test that maps generator function responses for BYOK status, batch generation, batch fetch, item update, and both delivery actions.
- [ ] Add a failing route test that exposes `/admin/question-generator` only to admin.
- [ ] Add a failing route test that exposes `/app/question-generator` only to mentor under the app surface.
- [ ] Add a failing route test that rejects pro and anonymous users from both generator routes.
- [ ] Add a failing route test that verifies the navigation labels render on the correct surfaces.
- [ ] Run: `npx vitest run src/lib/api/question-generator-api.test.ts src/router/app-router.test.tsx`
- [ ] Confirm the new cases fail because the frontend API and routes are missing.

### Task 11: Implement the frontend API client

**Files:**
- Create: `src/lib/api/question-generator-api.ts`
- Create: `src/lib/mappers/question-generator-mappers.ts`
- Create: `src/lib/mappers/question-generator-mappers.test.ts`
- Test: `src/lib/api/question-generator-api.test.ts`

- [ ] Add a dedicated API module that calls `client.functions.invoke("question-generator", ...)` with typed payloads.
- [ ] Normalize backend payloads into focused view models for:
  - generator status
  - batch create result
  - review page batch detail
  - edited item updates
  - delivery results
- [ ] Map mode labels and delivery history into user-facing strings without surfacing legacy batch or enrichment wording.
- [ ] Re-run: `npx vitest run src/lib/api/question-generator-api.test.ts src/lib/mappers/question-generator-mappers.test.ts`
- [ ] Confirm the API and mapper suites pass.

### Task 12: Register routes and nav entries

**Files:**
- Modify: `src/router/app-router.tsx`
- Modify: `src/router/route-guards.tsx`
- Modify: `src/router/app-router.test.tsx`
- Modify: `src/mocks/admin-content.ts`
- Modify: `src/mocks/student-dashboard.ts`

- [ ] Add the admin routes `/admin/question-generator` and `/admin/question-generator/:batchId`.
- [ ] Add the mentor routes `/app/question-generator` and `/app/question-generator/:batchId`.
- [ ] Add a guard that allows admin and mentor access but does not force admin users back to `/admin/questions`, which makes the existing question-bank guard unsuitable as-is.
- [ ] Add `Question Generator` to the admin navigation.
- [ ] Add `Question Generator` to the mentor navigation only.
- [ ] Re-run: `npx vitest run src/router/app-router.test.tsx`
- [ ] Confirm route protection and nav visibility now pass.

### Task 13: Checkpoint routes and API plumbing

**Files:**
- No new files.

- [ ] Stage only the route, navigation, and frontend API files touched in this chunk.
- [ ] Commit:

```bash
git add src/lib/api/question-generator-api.ts src/lib/api/question-generator-api.test.ts src/lib/mappers/question-generator-mappers.ts src/lib/mappers/question-generator-mappers.test.ts src/router/app-router.tsx src/router/route-guards.tsx src/router/app-router.test.tsx src/mocks/admin-content.ts src/mocks/student-dashboard.ts
git commit -m "feat: wire question generator routes and api"
```

## Chunk 4: Generator Create Flow UI

### Task 14: Write failing component and page tests for the create flow

**Files:**
- Create: `src/components/question-generator/reference-question-form.test.tsx`
- Create: `src/pages/admin/question-generator-page.test.tsx`

- [ ] Add a failing component test that renders a single reference form with A-E fields, correct answer selector, and explanation input.
- [ ] Add a failing page test that verifies the generator page starts valid with one reference slot available and allows adding up to three reference cards only.
- [ ] Add a failing page test that verifies one fully completed reference question is enough to submit.
- [ ] Add a failing page test that verifies BYOK status is shown and blocks generation when no valid key is available.
- [ ] Add a failing page test that verifies odd target counts communicate that the extra output will become `copy konsep`.
- [ ] Run: `npx vitest run src/components/question-generator/reference-question-form.test.tsx src/pages/admin/question-generator-page.test.tsx`
- [ ] Confirm the create-flow tests fail.

### Task 15: Implement the create flow UI

**Files:**
- Create: `src/components/question-generator/reference-question-form.tsx`
- Create: `src/pages/admin/question-generator-page.tsx`
- Create: `src/pages/app/question-generator-page.tsx`
- Test: `src/components/question-generator/reference-question-form.test.tsx`
- Test: `src/pages/admin/question-generator-page.test.tsx`

- [ ] Build a reusable reference editor component with full A-E inputs, answer key selector, explanation field, and local validation messaging.
- [ ] Build the generator page around a controlled list of one to three references with add and remove actions.
- [ ] Show explicit copy that the generated topic must stay close to the references and that output will first become editable drafts.
- [ ] Show model copy using `gemini-2.5-flash` as the default.
- [ ] Add a target-count input and live copy explaining the split between copy concept and paraphrase, including the odd-count rule.
- [ ] Wire the submit action to the generator API and navigate to the review page after success.
- [ ] Re-run: `npx vitest run src/components/question-generator/reference-question-form.test.tsx src/pages/admin/question-generator-page.test.tsx`
- [ ] Confirm the create-flow suites pass.

### Task 16: Checkpoint the create flow

**Files:**
- No new files.

- [ ] Stage only the create-flow UI files.
- [ ] Commit:

```bash
git add src/components/question-generator/reference-question-form.tsx src/components/question-generator/reference-question-form.test.tsx src/pages/admin/question-generator-page.tsx src/pages/admin/question-generator-page.test.tsx src/pages/app/question-generator-page.tsx
git commit -m "feat: add question generator create flow"
```

## Chunk 5: Review, Editing, and Distribution UI

### Task 17: Write failing tests for review and delivery interactions

**Files:**
- Create: `src/components/question-generator/generated-draft-editor.test.tsx`
- Create: `src/components/question-generator/delivery-dialog.test.tsx`
- Create: `src/pages/admin/question-generator-review-page.test.tsx`

- [ ] Add a failing editor test that loads a generated item and persists manual changes to stem, options, correct answer, and explanation.
- [ ] Add a failing delivery-dialog test that requires blok and materi before allowing bank soal delivery.
- [ ] Add a failing delivery-dialog test that requires event selection before allowing scheduled-event delivery.
- [ ] Add a failing review-page test that displays generation mode labels and delivery history badges.
- [ ] Add a failing review-page test that proves an item can still be edited after one successful delivery.
- [ ] Add a failing review-page test that delivers the same item once to bank soal and once to a scheduled event.
- [ ] Run: `npx vitest run src/components/question-generator/generated-draft-editor.test.tsx src/components/question-generator/delivery-dialog.test.tsx src/pages/admin/question-generator-review-page.test.tsx`
- [ ] Confirm the review and delivery suites fail.

### Task 18: Implement review editing and delivery dialogs

**Files:**
- Create: `src/components/question-generator/generated-draft-editor.tsx`
- Create: `src/components/question-generator/delivery-dialog.tsx`
- Create: `src/pages/admin/question-generator-review-page.tsx`
- Create: `src/pages/app/question-generator-review-page.tsx`
- Test: `src/components/question-generator/generated-draft-editor.test.tsx`
- Test: `src/components/question-generator/delivery-dialog.test.tsx`
- Test: `src/pages/admin/question-generator-review-page.test.tsx`

- [ ] Build a reusable draft editor that reflects `Copy konsep` and `Parafrase` mode badges while keeping all content editable.
- [ ] Build a delivery dialog that switches between bank soal metadata collection and scheduled-event selection.
- [ ] Load batch detail, references, generated items, and delivery history into the review page.
- [ ] Wire item save actions to the generator API so manual edits update generator draft records without pushing directly into final question tables.
- [ ] Wire bank soal delivery and scheduled-event delivery actions to their dedicated API calls.
- [ ] Show clear status summaries such as `Belum didistribusikan`, `Bank soal 1x`, or `Event 2x` without encoding delivery state as a single exclusive item status.
- [ ] Re-run: `npx vitest run src/components/question-generator/generated-draft-editor.test.tsx src/components/question-generator/delivery-dialog.test.tsx src/pages/admin/question-generator-review-page.test.tsx`
- [ ] Confirm the review and delivery suites pass.

### Task 19: Checkpoint review and delivery UI

**Files:**
- No new files.

- [ ] Stage only the review and delivery UI files.
- [ ] Commit:

```bash
git add src/components/question-generator/generated-draft-editor.tsx src/components/question-generator/generated-draft-editor.test.tsx src/components/question-generator/delivery-dialog.tsx src/components/question-generator/delivery-dialog.test.tsx src/pages/admin/question-generator-review-page.tsx src/pages/admin/question-generator-review-page.test.tsx src/pages/app/question-generator-review-page.tsx
git commit -m "feat: add question generator review and delivery flow"
```

## Chunk 6: Full Verification and Launch Readiness

### Task 20: Run focused automated verification

**Files:**
- No new files.

- [ ] Run: `npx vitest run supabase/migrations/20260604000036_question_generator.test.ts supabase/functions/_shared/question-generator.test.ts supabase/functions/question-generator/index.test.ts src/lib/api/question-generator-api.test.ts src/lib/mappers/question-generator-mappers.test.ts src/router/app-router.test.tsx src/components/question-generator/reference-question-form.test.tsx src/components/question-generator/generated-draft-editor.test.tsx src/components/question-generator/delivery-dialog.test.tsx src/pages/admin/question-generator-page.test.tsx src/pages/admin/question-generator-review-page.test.tsx`
- [ ] Confirm all focused generator tests pass.

### Task 21: Run project build verification

**Files:**
- No new files.

- [ ] Run: `npm run build`
- [ ] Confirm there are no TypeScript or bundling regressions.

### Task 22: Perform manual product checks

**Files:**
- No new files.

- [ ] Start the app with `npm run dev`.
- [ ] Verify admin can open `/admin/question-generator` and mentor can open `/app/question-generator`.
- [ ] Verify one complete reference question is enough to generate a batch.
- [ ] Verify the page clearly states that generated topic coverage must stay close to the references.
- [ ] Verify a generated batch opens in review mode and can be edited before any delivery action.
- [ ] Verify one item can be delivered to bank soal with manual blok and materi.
- [ ] Verify the same item can then be delivered to one scheduled event.
- [ ] Verify the legacy upload batch and enrichment UI does not reappear in admin or mentor navigation.

### Task 23: Capture residual risks and handoff notes

**Files:**
- No new files.

- [ ] Summarize any residual risks around topic-drift heuristics, duplicate near-clones across repeated delivery, and Gemini rate-limit behavior for personal keys.
- [ ] Confirm in the implementation summary that topic closeness is enforced in three layers:
  - prompt instructions
  - backend output validation
  - human review before delivery

## Notes For Execution

- Use @test-driven-development throughout this plan. The generator should be built red-green slice by slice instead of landing the entire feature and then trying to retrofit tests.
- Keep the generator as a new product surface. Do not expose old `question upload batches`, `enrichment`, `OCR`, or legacy AI workspace terminology while executing this plan.
- Treat topic closeness as a non-negotiable acceptance criterion. If there is a trade-off between output variety and staying near the reference topic, choose closeness.
- Prefer small extraction helpers over broad refactors if reuse is needed from question bank or scheduled event persistence code.
- Respect the dirty worktree. Do not revert or reformat unrelated user changes while implementing this plan.
- A dedicated plan-review subagent step is intentionally omitted here because this session did not request delegation; if delegation becomes explicitly approved later, review each chunk before execution.

Plan complete and saved to `docs/superpowers/plans/2026-06-04-question-generator-implementation.md`. Ready to execute?
