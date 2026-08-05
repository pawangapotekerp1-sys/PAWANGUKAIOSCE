# Tryout Topic Catalog And Question Counts Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 15 topic-level tryout options grouped by block and enforce dynamic question counts of `50/30/20` for full, block, and topic sessions.

**Architecture:** Extend the tryout runtime so `exam_templates` can describe `full`, `block`, or `topic` scope, then move `start_attempt_from_template` away from static `exam_template_items` and toward random selection from published questions by tag. Keep the student routing unchanged, but update the API contract, mapper layer, seed data, and catalog UI so the frontend can render one full section, one block section, and grouped topic sections from the live template list.

**Tech Stack:** Supabase Postgres, SQL migrations, React 19, TypeScript, TanStack Query, React Router v7, Vitest, React Testing Library

---

## File Structure

### Database and Seed

- Create: `supabase/migrations/20260505000013_tryout_topic_catalog.sql`
- Create: `supabase/migrations/20260505000013_tryout_topic_catalog.test.ts`
- Modify: `supabase/seed.sql`
- Reference: `supabase/migrations/20260501000004_tryout_runtime.sql`

### Tryout API and Mapping

- Modify: `src/lib/api/tryout-api.ts`
- Modify: `src/lib/api/tryout-api.test.ts`
- Modify: `src/lib/mappers/tryout-mappers.ts`
- Create: `src/lib/mappers/tryout-mappers.test.ts`

### Student UI

- Modify: `src/pages/app/tryout-catalog-page.tsx`
- Modify: `src/pages/app/tryout-catalog-page.test.tsx`
- Modify: `src/pages/app/tryout-session-page.tsx`
- Modify: `src/pages/app/tryout-session-page.test.tsx`

### Existing docs

- Reference: `docs/superpowers/specs/2026-05-05-tryout-topic-catalog-and-counts-design.md`

Notes:

- The current local seed does not contain enough published questions for real `50/30/20` sessions. This plan assumes seed expansion is part of the implementation, not a follow-up.
- `exam_template_items` may remain in schema for backward compatibility, but new runtime behavior must not depend on it for `full`, `block`, or `topic` attempts.

## Chunk 1: Extend Template Schema And Dynamic Runtime

### Task 1: Add `topic` mode and dynamic random-question attempt generation

**Files:**
- Create: `supabase/migrations/20260505000013_tryout_topic_catalog.sql`
- Create: `supabase/migrations/20260505000013_tryout_topic_catalog.test.ts`
- Reference: `supabase/migrations/20260501000004_tryout_runtime.sql`

- [ ] **Step 1: Write the failing migration test**

In `supabase/migrations/20260505000013_tryout_topic_catalog.test.ts`, add assertions that the new migration:

- adds nullable `topic_id uuid references public.topics(id)` to `public.exam_templates`
- extends `exam_templates_mode_check` so `mode in ('full', 'block', 'topic')`
- updates `start_attempt_from_template` to filter published questions by scope instead of counting `exam_template_items`
- checks availability against exact thresholds `50`, `30`, and `20`
- raises a clear exception when published question supply is insufficient

Example assertion snippet:

```ts
expect(migration).toContain("add column if not exists topic_id uuid references public.topics");
expect(migration).toContain("check (mode in ('full', 'block', 'topic'))");
expect(migration).toContain("order by random()");
expect(migration).toContain("Template try out ini belum memiliki cukup soal published.");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run supabase/migrations/20260505000013_tryout_topic_catalog.test.ts`

Expected: FAIL because the migration file does not exist yet.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260505000013_tryout_topic_catalog.sql` with these changes:

- alter `public.exam_templates`
- drop and recreate the `mode` check constraint
- add `topic_id`
- replace `start_attempt_from_template(uuid)` with dynamic selection logic

Recommended SQL skeleton:

```sql
alter table public.exam_templates
  add column if not exists topic_id uuid references public.topics (id) on delete set null;

alter table public.exam_templates
  drop constraint if exists exam_templates_mode_check;

alter table public.exam_templates
  add constraint exam_templates_mode_check
  check (mode in ('full', 'block', 'topic'));
```

RPC behavior to implement:

- resolve `required_question_count` from `template_row.mode`
- select candidate questions from `public.questions`
- filter `status = 'published'`
- for `block`, add `and block_id = template_row.block_id`
- for `topic`, add `and topic_id = template_row.topic_id`
- randomize with `order by random()`
- `limit required_question_count`
- raise if selected count is below target
- insert `attempt_items` from the selected question rows and live `question_options`
- set `attempts.total_questions = required_question_count`

- [ ] **Step 4: Run migration test to verify it passes**

Run: `npm run test -- --run supabase/migrations/20260505000013_tryout_topic_catalog.test.ts`

Expected: PASS

- [ ] **Step 5: Reset local Supabase to catch SQL/runtime breakage early**

Run: `npm run supabase:reset`

Expected: FAIL at this point because the seed still does not match the new template model and question-count requirements.

- [ ] **Step 6: Record checkpoint**

If this workspace still is not a git repository, record a manual checkpoint instead of committing.

Suggested note:

```text
Checkpoint: schema supports topic mode and dynamic runtime, seed update still pending.
```

## Chunk 2: Expand Seed Data To Support `50/30/20`

### Task 2: Seed enough published questions and publish 19 templates

**Files:**
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Write the failing seed/runtime expectation in API tests**

In `src/lib/api/tryout-api.test.ts`, add or update tests so the live template list expects:

- 1 `full` template
- 3 `block` templates
- 15 `topic` templates
- `question_count` values `50`, `30`, and `20`

Expected shapes should include `topicId` and `topicName` for topic templates.

- [ ] **Step 2: Run the API test to verify it fails**

Run: `npm run test -- --run src/lib/api/tryout-api.test.ts`

Expected: FAIL because the API type and seed assumptions still only support `full` and `block`.

- [ ] **Step 3: Expand `supabase/seed.sql` published question supply**

Add enough published questions to satisfy:

- at least 50 published questions total
- at least 30 published questions in each of the 3 blocks
- at least 20 published questions in each of the 15 topics

Do not hand-author 300 completely different stems if the repo does not need realistic editorial depth for local development. Prefer deterministic seed generation blocks that still respect:

- unique IDs
- valid `block_id`
- valid `topic_id`
- four `question_options` per question
- one correct answer
- optional explanation rows

Recommended pattern:

```sql
insert into public.questions (...)
select
  gen_random_uuid(),
  format('Seed %s soal %s', topic.name, series.n),
  topic.block_id,
  topic.id,
  ...
from public.topics as topic
cross join generate_series(1, 20) as series(n);
```

- [ ] **Step 4: Update template seed definitions**

Replace the current published tryout template seed with:

- `Try Out Besar` (`mode = 'full'`, `question_count = 50`)
- 3 block templates (`mode = 'block'`, `question_count = 30`, `block_id` set)
- 15 topic templates (`mode = 'topic'`, `question_count = 20`, `topic_id` set, `block_id` aligned to the topic’s parent block)

Keep `duration_minutes` coherent. Suggested defaults:

- full: `50` or `60`
- block: `30` or `35`
- topic: `20` or `25`

Pick one set and use it consistently across seed and tests.

- [ ] **Step 5: Remove dependence on seeded `exam_template_items` for active templates**

If the old seed inserts `exam_template_items` for the active templates, either:

- stop inserting them for the new templates, or
- keep them only for legacy data fixtures not used by the current runtime

The active runtime must succeed without needing those rows.

- [ ] **Step 6: Re-run Supabase reset**

Run: `npm run supabase:reset`

Expected: PASS

- [ ] **Step 7: Record checkpoint**

Suggested note:

```text
Checkpoint: seed now publishes 1 full, 3 block, and 15 topic templates with enough questions for 50/30/20.
```

## Chunk 3: Extend Tryout API And Mapper Contracts

### Task 3: Return topic-aware template metadata and grouping helpers

**Files:**
- Modify: `src/lib/api/tryout-api.ts`
- Modify: `src/lib/api/tryout-api.test.ts`
- Modify: `src/lib/mappers/tryout-mappers.ts`
- Create: `src/lib/mappers/tryout-mappers.test.ts`

- [ ] **Step 1: Write the failing mapper and API tests**

Add tests that expect:

- `TryoutTemplate.mode` supports `"topic"`
- `listPublishedExamTemplates()` returns `topicId` and `topicName`
- catalog helpers can split the template list into:
  - `fullTemplate`
  - `blockTemplates`
  - `topicGroups` keyed by block
- count labels render exactly `50 soal`, `30 soal`, and `20 soal`

Example mapper test target:

```ts
expect(grouped.topicGroups[0]).toMatchObject({
  blockName: "Clinical Science",
  topics: [{ title: "Kardiologi", questionCountLabel: "20 soal" }],
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- --run src/lib/api/tryout-api.test.ts src/lib/mappers/tryout-mappers.test.ts`

Expected: FAIL because the current types and mapper only understand `full` and `block`.

- [ ] **Step 3: Update the API contract**

In `src/lib/api/tryout-api.ts`:

- extend `ExamTemplateRow.mode`
- extend `TryoutTemplate.mode`
- add `topic_id`
- join `topic:topics(name)`
- keep the existing `block:blocks(name)` join

Recommended select shape:

```ts
.select("id, slug, title, description, mode, question_count, duration_minutes, block_id, topic_id, block:blocks(name), topic:topics(name)")
```

Add mapped fields:

- `topicId`
- `topicName`

- [ ] **Step 4: Add focused catalog mapper helpers**

In `src/lib/mappers/tryout-mappers.ts`, keep `mapTemplatesToCatalogCards()` only if still useful. Prefer introducing a new helper dedicated to the page:

```ts
export function groupTemplatesForCatalog(templates: TryoutTemplate[]) {
  return {
    fullTemplate,
    blockTemplates,
    topicGroups,
  };
}
```

Each topic group should include:

- `blockId`
- `blockName`
- `topics: TryoutCatalogCard[]`

- [ ] **Step 5: Re-run API and mapper tests**

Run: `npm run test -- --run src/lib/api/tryout-api.test.ts src/lib/mappers/tryout-mappers.test.ts`

Expected: PASS

- [ ] **Step 6: Record checkpoint**

Suggested note:

```text
Checkpoint: tryout API and mappers now expose topic templates and catalog grouping.
```

## Chunk 4: Render Grouped Catalog UI

### Task 4: Update the catalog page to show full, block, and grouped topic sections

**Files:**
- Modify: `src/pages/app/tryout-catalog-page.tsx`
- Modify: `src/pages/app/tryout-catalog-page.test.tsx`
- Modify: `src/lib/mappers/tryout-mappers.ts`

- [ ] **Step 1: Write the failing catalog UI tests**

Extend `src/pages/app/tryout-catalog-page.test.tsx` to expect:

- a `Simulasi penuh` section with `Try Out Besar`
- a `Try out per blok` section with 3 block cards
- a `Try out per materi` section
- topic cards grouped beneath their parent block headings
- visible labels `50 soal`, `30 soal`, and `20 soal`

Include at least one representative topic from each block in the mock data.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/pages/app/tryout-catalog-page.test.tsx`

Expected: FAIL because the page still renders one flat grid.

- [ ] **Step 3: Implement the grouped catalog**

Update `src/pages/app/tryout-catalog-page.tsx` so it:

- calls the new grouping helper
- renders three sections in order
- uses existing card styles where possible
- groups topic cards under block headings

Keep one rendering helper for the card body so the page does not duplicate the CTA/count block three times.

Recommended local helper:

```tsx
function TemplateCard({ item }: { item: TryoutCatalogCard }) {
  return (...)
}
```

- [ ] **Step 4: Re-run catalog test**

Run: `npm run test -- --run src/pages/app/tryout-catalog-page.test.tsx`

Expected: PASS

### Task 5: Show insufficient-bank startup errors clearly in the session page

**Files:**
- Modify: `src/pages/app/tryout-session-page.tsx`
- Modify: `src/pages/app/tryout-session-page.test.tsx`

- [ ] **Step 1: Write the failing error-state test**

Add a test where `createAttempt()` rejects with:

```ts
new Error("Template try out ini belum memiliki cukup soal published.")
```

Expect the error state to show that exact message or a close UI-specific variant, not only the generic template-incomplete copy.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/pages/app/tryout-session-page.test.tsx`

Expected: FAIL because the current create-attempt error panel uses generic copy.

- [ ] **Step 3: Implement minimal error-surface improvement**

In `src/pages/app/tryout-session-page.tsx`:

- store `createAttemptMutation.error`
- surface the backend message inside the error state description or alert block
- keep the fallback copy for unknown failures

- [ ] **Step 4: Re-run the session page test**

Run: `npm run test -- --run src/pages/app/tryout-session-page.test.tsx`

Expected: PASS

- [ ] **Step 5: Record checkpoint**

Suggested note:

```text
Checkpoint: catalog renders grouped topic tryouts and start-session failures show stock-related errors clearly.
```

## Chunk 5: Final Verification

### Task 6: Run targeted verification for the whole feature

**Files:**
- No new files

- [ ] **Step 1: Run database migration tests**

Run:

```bash
npm run test -- --run supabase/migrations/20260505000013_tryout_topic_catalog.test.ts
```

Expected: PASS

- [ ] **Step 2: Run tryout API, mapper, and page tests**

Run:

```bash
npm run test -- --run src/lib/api/tryout-api.test.ts src/lib/mappers/tryout-mappers.test.ts src/pages/app/tryout-catalog-page.test.tsx src/pages/app/tryout-session-page.test.tsx
```

Expected: PASS

- [ ] **Step 3: Run impacted routing and adjacent student tests**

Run:

```bash
npm run test -- --run src/router/app-router.test.tsx src/pages/app/dashboard-page.test.tsx src/pages/app/review-page.test.tsx
```

Expected: PASS

- [ ] **Step 4: Reset local Supabase and smoke-check**

Run:

```bash
npm run supabase:reset
```

Expected: PASS

Then manually verify:

- `/app/tryout` shows 1 full section, 3 block cards, and grouped topic cards
- starting a full tryout creates a 50-question attempt
- starting a block tryout creates a 30-question attempt
- starting a topic tryout creates a 20-question attempt

- [ ] **Step 5: Manual checkpoint**

If `git` is still unavailable in this workspace, record the final touched files and verification commands instead of committing.

Suggested note:

```text
Final checkpoint: topic-level catalog and dynamic 50/30/20 runtime verified locally; workspace still not under git.
```
