# Personal Weakness Diagnosis Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend pipeline for personal weakness diagnosis so submitted try outs from diagnosis-approved templates produce per-attempt snapshots, and custom submitted-date ranges can return `empty`, `basic`, or `full` diagnosis results with ranked subtopics and behavior signals.

**Architecture:** Extend the Supabase try out runtime with diagnosis-source template flags, per-question behavior capture, and normalized per-attempt diagnosis snapshots. Then expose one backend-owned range diagnosis RPC and a TypeScript browser-client contract that maps the RPC response into stable frontend-ready shapes without redesigning the analytics UI in this plan.

**Tech Stack:** Supabase Postgres, SQL migrations, React 19, TypeScript, TanStack Query, Supabase JS, Vitest, React Testing Library

---

## File Structure

### Database Schema And Diagnosis Pipeline

- Create: `supabase/migrations/20260508000019_personal_weakness_diagnosis.sql`
- Create: `supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts`
- Modify: `supabase/seed.sql`
- Reference: `supabase/migrations/20260501000004_tryout_runtime.sql`
- Reference: `supabase/migrations/20260501000005_analytics_and_ai.sql`
- Reference: `supabase/migrations/20260506000014_tryout_session_timer_ragu_ragu.sql`
- Reference: `supabase/migrations/20260508000018_tryout_pause_resume.sql`

### Runtime Persistence Contract

- Modify: `src/lib/api/tryout-api.ts`
- Modify: `src/lib/api/tryout-api.test.ts`
- Modify: `src/pages/app/tryout-session-page.tsx`
- Modify: `src/pages/app/tryout-session-page.test.tsx`

### Diagnosis Query Contract

- Modify: `src/lib/api/analytics-api.ts`
- Modify: `src/lib/api/analytics-api.test.ts`
- Modify: `src/lib/mappers/analytics-mappers.ts`
- Create: `src/lib/mappers/analytics-mappers.test.ts`

### Existing Docs

- Reference: `docs/superpowers/specs/2026-05-08-personal-weakness-diagnosis-design.md`

Notes:

- Follow `@test-driven-development`: every component change starts with a failing test.
- Use `@verification-before-completion` before claiming the feature is done.
- Keep this plan backend-first. Do not redesign `src/pages/app/analytics-page.tsx` or invent a date-picker UI in this iteration.
- Preserve existing analytics views and pages unless a contract change is required for the new diagnosis API.

## Chunk 1: Database Schema And Source Eligibility

### Task 1: Add diagnosis-source schema and snapshot tables

**Files:**
- Create: `supabase/migrations/20260508000019_personal_weakness_diagnosis.sql`
- Create: `supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts`
- Reference: `supabase/migrations/20260508000018_tryout_pause_resume.sql`

- [ ] **Step 1: Write the failing migration test**

Create `supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts` with assertions that the new migration:

- adds `diagnostic_source boolean not null default false` to `public.exam_templates`
- creates `public.attempt_item_behavior_metrics`
- creates `public.attempt_answer_change_events`
- creates `public.attempt_diagnostic_snapshots`
- creates `public.attempt_diagnostic_topic_snapshots`
- adds indexes for snapshot-by-user-and-submitted-date access

Example assertion shapes:

```ts
expect(migrationSql).toMatch(/alter table public\.exam_templates/i);
expect(migrationSql).toMatch(/add column if not exists diagnostic_source boolean not null default false/i);
expect(migrationSql).toMatch(/create table if not exists public\.attempt_item_behavior_metrics/i);
expect(migrationSql).toMatch(/create table if not exists public\.attempt_diagnostic_snapshots/i);
expect(migrationSql).toMatch(/attempt_diagnostic_snapshots_user_submitted_idx/i);
```

- [ ] **Step 2: Run the migration test to verify it fails**

Run:

```bash
npm run test -- --run supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts
```

Expected: FAIL because the migration file does not exist yet.

- [ ] **Step 3: Write the migration skeleton**

Create `supabase/migrations/20260508000019_personal_weakness_diagnosis.sql` with the minimum schema:

- extend templates:

```sql
alter table public.exam_templates
  add column if not exists diagnostic_source boolean not null default false;
```

- create `public.attempt_item_behavior_metrics`
- create `public.attempt_answer_change_events`
- create `public.attempt_diagnostic_snapshots`
- create `public.attempt_diagnostic_topic_snapshots`
- add updated-at triggers where needed
- add indexes such as:

```sql
create index if not exists attempt_diagnostic_snapshots_user_submitted_idx
  on public.attempt_diagnostic_snapshots (user_id, submitted_at desc);
```

```sql
create unique index if not exists attempt_diagnostic_topic_snapshots_attempt_topic_idx
  on public.attempt_diagnostic_topic_snapshots (attempt_snapshot_id, topic_id);
```

- [ ] **Step 4: Run the migration test again**

Run:

```bash
npm run test -- --run supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts
```

Expected: PASS

- [ ] **Step 5: Reset local Supabase to catch SQL syntax issues**

Run:

```bash
npm run supabase:reset
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260508000019_personal_weakness_diagnosis.sql supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts
git commit -m "feat: add diagnosis schema foundations"
```

### Task 2: Mark diagnosis-approved templates explicitly in seed data

**Files:**
- Modify: `supabase/seed.sql`
- Modify: `supabase/migrations/20260508000019_personal_weakness_diagnosis.sql`
- Modify: `supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts`

- [ ] **Step 1: Extend the failing migration test with seed-compatibility expectations**

Add assertions that the schema supports explicit template-level diagnosis selection and that the migration does not infer diagnosis eligibility from `mode` or `question_count` alone.

Example assertion:

```ts
expect(migrationSql).toMatch(/diagnostic_source boolean not null default false/i);
expect(migrationSql).not.toMatch(/question_count = 50.*diagnostic_source/i);
```

- [ ] **Step 2: Run the migration test to verify the new expectation fails or remains uncovered**

Run:

```bash
npm run test -- --run supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts
```

Expected: FAIL if the schema still implies diagnosis eligibility indirectly, or PASS with missing seed work still pending.

- [ ] **Step 3: Update seeded templates**

In `supabase/seed.sql`, update the seeded full try out row so:

- `Try Out Besar` sets `diagnostic_source = true`
- block and topic templates set `diagnostic_source = false`

Use explicit columns in both exam template insert blocks, for example:

```sql
insert into public.exam_templates (
  id,
  slug,
  title,
  description,
  mode,
  block_id,
  topic_id,
  question_count,
  duration_minutes,
  diagnostic_source,
  status,
  created_by,
  updated_by
)
```

- [ ] **Step 4: Reset Supabase to verify seed compatibility**

Run:

```bash
npm run supabase:reset
```

Expected: PASS with seeded `Try Out Besar` remaining published and diagnosis-approved.

- [ ] **Step 5: Commit**

```bash
git add supabase/seed.sql supabase/migrations/20260508000019_personal_weakness_diagnosis.sql supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts
git commit -m "feat: seed diagnosis-approved tryout templates"
```

## Chunk 2: Runtime Behavior Capture

### Task 3: Replace direct answer upserts with an RPC that records behavior metrics

**Files:**
- Modify: `supabase/migrations/20260508000019_personal_weakness_diagnosis.sql`
- Modify: `supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts`
- Modify: `src/lib/api/tryout-api.ts`
- Modify: `src/lib/api/tryout-api.test.ts`

- [ ] **Step 1: Write the failing migration and API tests**

Extend `supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts` to assert the migration creates a behavior-aware save RPC, for example `public.save_attempt_answer(...)`.

Add API tests in `src/lib/api/tryout-api.test.ts` that expect `saveAnswer()` to call the RPC instead of raw `.from("answers").upsert(...)`.

Example migration assertions:

```ts
expect(migrationSql).toMatch(/create or replace function public\.save_attempt_answer/i);
expect(migrationSql).toMatch(/time_spent_delta_seconds integer/i);
expect(migrationSql).toMatch(/attempt_answer_change_events/i);
```

Example API assertion:

```ts
expect(rpc).toHaveBeenCalledWith("save_attempt_answer", {
  target_attempt_id: "attempt-1",
  target_attempt_item_id: "item-1",
  selected_option_key: "B",
  is_doubtful: true,
  time_spent_delta_seconds: 12,
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run:

```bash
npm run test -- --run supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts src/lib/api/tryout-api.test.ts
```

Expected: FAIL because the RPC and API contract do not exist yet.

- [ ] **Step 3: Add `public.save_attempt_answer(...)`**

In `supabase/migrations/20260508000019_personal_weakness_diagnosis.sql`, create a `security definer` RPC that:

- validates ownership of the attempt
- rejects writes when the attempt is already submitted
- reads the existing answer row, if any
- increments `time_spent_seconds` on `attempt_item_behavior_metrics`
- updates `was_ever_flagged_ragu` and `is_flagged_ragu_final`
- inserts an `attempt_answer_change_events` row only when the selected option actually changes
- increments `answer_change_count`
- increments `changed_correct_to_wrong_count` when the previous answer was correct and the next answer is wrong
- upserts the answer row only when `selected_option_key` is not null
- clears `is_doubtful` when the answer becomes null

Recommended function signature:

```sql
create or replace function public.save_attempt_answer(
  target_attempt_id uuid,
  target_attempt_item_id uuid,
  selected_option_key text,
  is_doubtful boolean,
  time_spent_delta_seconds integer
)
returns public.answers
```

If no answer row should exist for a null answer, return the latest persisted row shape with null-safe fields by selecting from the updated state at the end.

- [ ] **Step 4: Update the browser client helper**

In `src/lib/api/tryout-api.ts`:

- extend `saveAnswer()` input with `timeSpentDeltaSeconds`
- replace the direct table upsert with:

```ts
const { data, error } = await client.rpc("save_attempt_answer", {
  target_attempt_id: attemptId,
  target_attempt_item_id: attemptItemId,
  selected_option_key: selectedOptionKey,
  is_doubtful: safeIsDoubtful,
  time_spent_delta_seconds: timeSpentDeltaSeconds,
});
```

- keep the returned `PersistedAnswer` shape stable for current consumers

- [ ] **Step 5: Re-run the targeted tests**

Run:

```bash
npm run test -- --run supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts src/lib/api/tryout-api.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260508000019_personal_weakness_diagnosis.sql supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts src/lib/api/tryout-api.ts src/lib/api/tryout-api.test.ts
git commit -m "feat: capture answer behavior through rpc"
```

### Task 4: Capture per-question time deltas from the session page

**Files:**
- Modify: `src/pages/app/tryout-session-page.tsx`
- Modify: `src/pages/app/tryout-session-page.test.tsx`
- Modify: `src/lib/api/tryout-api.ts`

- [ ] **Step 1: Write the failing session-page tests for timing persistence**

Update `src/pages/app/tryout-session-page.test.tsx` to cover:

- selecting an answer sends a non-negative `timeSpentDeltaSeconds`
- moving to another question flushes the viewed question's elapsed time before changing index
- toggling `ragu-ragu` preserves the same answer but still carries a time delta
- submitting the attempt flushes the current question's time before calling `submitAttempt()`

Example assertion shape:

```ts
expect(mockSaveAnswer).toHaveBeenCalledWith(
  expect.objectContaining({
    attemptItemId: "item-1",
    timeSpentDeltaSeconds: expect.any(Number),
  }),
);
```

- [ ] **Step 2: Run the session-page test to verify it fails**

Run:

```bash
npm run test -- --run src/pages/app/tryout-session-page.test.tsx
```

Expected: FAIL because the page does not measure or forward question dwell time yet.

- [ ] **Step 3: Add a per-question stopwatch ref**

In `src/pages/app/tryout-session-page.tsx`, add refs that track when the current question became active:

```ts
const questionActiveSinceRef = useRef<number | null>(null);
const activeQuestionIdRef = useRef<string | null>(null);
```

Whenever `currentQuestion?.id` changes, reset both refs to the new question and `Date.now()`.

- [ ] **Step 4: Add a helper that computes and resets elapsed question time**

In the same file, create a helper like:

```ts
function consumeQuestionTimeDeltaSeconds() {
  if (!currentQuestion || activeQuestionIdRef.current !== currentQuestion.id || questionActiveSinceRef.current === null) {
    return 0;
  }

  const deltaSeconds = Math.max(0, Math.floor((Date.now() - questionActiveSinceRef.current) / 1000));
  questionActiveSinceRef.current = Date.now();
  return deltaSeconds;
}
```

Use this helper inside:

- `persistAnswer()`
- question navigation before `setCurrentIndex(...)`
- manual submit before `submitMutation.mutate()`
- pause-on-exit flow before `pauseMutation.mutate()` if a final save is practical in the current design

- [ ] **Step 5: Thread the new field into `saveAnswer()` calls**

Update page calls so `saveAnswer()` always receives:

```ts
timeSpentDeltaSeconds: consumeQuestionTimeDeltaSeconds(),
```

Maintain the current optimistic question-state update pattern.

- [ ] **Step 6: Re-run the session-page test**

Run:

```bash
npm run test -- --run src/pages/app/tryout-session-page.test.tsx
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/pages/app/tryout-session-page.tsx src/pages/app/tryout-session-page.test.tsx src/lib/api/tryout-api.ts
git commit -m "feat: track per-question timing deltas"
```

## Chunk 3: Snapshot Generation On Submit

### Task 5: Build per-attempt diagnosis snapshots as part of submit

**Files:**
- Modify: `supabase/migrations/20260508000019_personal_weakness_diagnosis.sql`
- Modify: `supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts`
- Reference: `supabase/migrations/20260508000018_tryout_pause_resume.sql`

- [ ] **Step 1: Extend the failing migration test with snapshot function assertions**

Add assertions that the migration:

- creates `public.rebuild_attempt_diagnostic_snapshot(uuid)` or an equivalently named helper
- upserts `attempt_diagnostic_snapshots`
- upserts `attempt_diagnostic_topic_snapshots`
- invokes snapshot rebuilding from `public.submit_attempt(uuid)` when the template is diagnosis-approved

Example assertion shapes:

```ts
expect(migrationSql).toMatch(/create or replace function public\.rebuild_attempt_diagnostic_snapshot/i);
expect(migrationSql).toMatch(/insert into public\.attempt_diagnostic_snapshots/i);
expect(migrationSql).toMatch(/insert into public\.attempt_diagnostic_topic_snapshots/i);
expect(migrationSql).toMatch(/diagnostic_source = true/i);
expect(migrationSql).toMatch(/perform public\.rebuild_attempt_diagnostic_snapshot\(target_attempt\.id\)/i);
```

- [ ] **Step 2: Run the migration test to verify it fails**

Run:

```bash
npm run test -- --run supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts
```

Expected: FAIL because snapshot rebuilding is not implemented yet.

- [ ] **Step 3: Add the snapshot rebuild helper**

In `supabase/migrations/20260508000019_personal_weakness_diagnosis.sql`, create a helper that:

- loads the submitted attempt, template, items, answers, and behavior metrics
- exits early when the template is not `diagnostic_source = true`
- computes one global row for `attempt_diagnostic_snapshots`
- computes one row per `topic_id` for `attempt_diagnostic_topic_snapshots`
- upserts by `attempt_id` and by `(attempt_snapshot_id, topic_id)`

Recommended derived values:

```sql
overall_accuracy := round((correct_count::numeric / nullif(question_count, 0)) * 100, 2);
overall_avg_time_per_question := round(total_time_spent::numeric / nullif(question_count, 0), 2);
overall_ragu_rate := round(ragu_count::numeric / nullif(question_count, 0), 4);
```

Leave final range-level scoring to the diagnosis query. This helper should only compute per-attempt base metrics and `weakness_score_base`.

- [ ] **Step 4: Invoke snapshot rebuild from `submit_attempt()`**

Still in the migration, update `public.submit_attempt(uuid)` so after `attempt_results` is upserted:

```sql
perform public.rebuild_attempt_diagnostic_snapshot(target_attempt.id);
```

Keep this call idempotent by making the helper use upserts and snapshot-row replacement semantics.

- [ ] **Step 5: Re-run the migration test and reset Supabase**

Run:

```bash
npm run test -- --run supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts
```

Expected: PASS

Run:

```bash
npm run supabase:reset
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260508000019_personal_weakness_diagnosis.sql supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts
git commit -m "feat: build diagnosis snapshots on submit"
```

## Chunk 4: Range Diagnosis RPC And TypeScript Contract

### Task 6: Add the range diagnosis RPC with `empty`, `basic`, and `full` modes

**Files:**
- Modify: `supabase/migrations/20260508000019_personal_weakness_diagnosis.sql`
- Modify: `supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts`

- [ ] **Step 1: Extend the failing migration test for the diagnosis RPC**

Add assertions that the migration creates a backend-owned query function, for example:

```ts
expect(migrationSql).toMatch(/create or replace function public\.get_personal_weakness_diagnosis/i);
expect(migrationSql).toMatch(/date_from date/i);
expect(migrationSql).toMatch(/date_to date/i);
expect(migrationSql).toMatch(/user_timezone text/i);
expect(migrationSql).toMatch(/diagnosismode/i);
expect(migrationSql).toMatch(/globalbehaviorpatterns/i);
expect(migrationSql).toMatch(/subtopicrankings/i);
```

Also assert that the SQL filters on `submitted_at` and `diagnostic_source = true`.

- [ ] **Step 2: Run the migration test to verify it fails**

Run:

```bash
npm run test -- --run supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts
```

Expected: FAIL because the range diagnosis RPC does not exist yet.

- [ ] **Step 3: Implement `public.get_personal_weakness_diagnosis(...)`**

In the migration, add a `security definer` function that:

- uses `auth.uid()` as the user boundary
- converts `date_from`, `date_to`, and `user_timezone` into UTC day boundaries
- loads eligible snapshot rows by `submitted_at`
- returns:
  - `diagnosisMode = 'empty'` for 0 attempts
  - `diagnosisMode = 'basic'` for 1-2 attempts
  - `diagnosisMode = 'full'` for 3+ attempts
- aggregates topic metrics across all eligible attempts
- computes:
  - `summary`
  - `globalBehaviorPatterns`
  - `subtopicRankings`
  - `basicSummary`
  - `narrative`

Recommended function signature:

```sql
create or replace function public.get_personal_weakness_diagnosis(
  date_from date,
  date_to date,
  user_timezone text
)
returns jsonb
```

For v1, keep the output in one JSON payload rather than many record sets.

- [ ] **Step 4: Encode the scoring and confidence rules directly in SQL**

Implement the locked hierarchy:

- accuracy is dominant
- behavior penalties are secondary
- `correct_to_wrong_switches` is the strongest behavior amplifier

Recommended weight direction:

```sql
weakness_score :=
  (accuracy_penalty * 0.70)
  + (time_penalty * 0.075)
  + (ragu_penalty * 0.075)
  + (answer_change_penalty * 0.06)
  + (correct_to_wrong_penalty * 0.09);
```

Also derive confidence from:

- total subtopic question count
- distinct attempt coverage count

Keep threshold constants local to the function so future tuning only touches one place.

- [ ] **Step 5: Re-run the migration test**

Run:

```bash
npm run test -- --run supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260508000019_personal_weakness_diagnosis.sql supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts
git commit -m "feat: add personal weakness diagnosis rpc"
```

### Task 7: Map the diagnosis RPC into stable TypeScript view models

**Files:**
- Modify: `src/lib/api/analytics-api.ts`
- Modify: `src/lib/api/analytics-api.test.ts`
- Modify: `src/lib/mappers/analytics-mappers.ts`
- Create: `src/lib/mappers/analytics-mappers.test.ts`

- [ ] **Step 1: Write the failing analytics API and mapper tests**

Update `src/lib/api/analytics-api.test.ts` to cover:

- calling `rpc("get_personal_weakness_diagnosis", ...)`
- returning `empty`, `basic`, and `full` payloads without throwing
- mapping `subtopicRankings` and `globalBehaviorPatterns` from the RPC payload

Create `src/lib/mappers/analytics-mappers.test.ts` for:

- summary field mapping
- behavior flag label mapping
- narrative fallback handling
- ranking preservation order

Example API assertion:

```ts
expect(rpc).toHaveBeenCalledWith("get_personal_weakness_diagnosis", {
  date_from: "2026-05-01",
  date_to: "2026-05-07",
  user_timezone: "Asia/Jakarta",
});
```

Example mapper expectation:

```ts
expect(result.subtopicRankings[0]).toMatchObject({
  topicName: "Kardiologi",
  confidence: "high",
  behaviorFlags: ["slow_pacing", "correct_to_wrong_switches"],
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run:

```bash
npm run test -- --run src/lib/api/analytics-api.test.ts src/lib/mappers/analytics-mappers.test.ts
```

Expected: FAIL because the new client function and mapper types do not exist yet.

- [ ] **Step 3: Add diagnosis response types and mapper helpers**

In `src/lib/mappers/analytics-mappers.ts`, add explicit types such as:

```ts
export type DiagnosisMode = "empty" | "basic" | "full";

export type PersistedDiagnosisBehaviorPattern = {
  code: "frequent_ragu" | "slow_pacing" | "frequent_answer_changes" | "correct_to_wrong_switches";
  label: string;
  severity: "low" | "medium" | "high";
  evidence: string;
  description: string;
};

export type PersistedDiagnosisSubtopicRanking = {
  topicId: string;
  topicName: string;
  blockId: string | null;
  blockName: string;
  rank: number;
  weaknessScore: number;
  confidence: "low" | "medium" | "high";
  questionCount: number;
  attemptCoverageCount: number;
  accuracy: number;
  averageTimePerQuestion: number;
  behaviorFlags: string[];
  summary: string;
};
```

Create a new mapper like:

```ts
export function mapPersonalWeaknessDiagnosisViewModel(input: { ... }) {
  return {
    summary: ...,
    globalBehaviorPatterns: ...,
    subtopicRankings: ...,
    basicSummary: ...,
    narrative: ...,
  };
}
```

- [ ] **Step 4: Add the analytics API client function**

In `src/lib/api/analytics-api.ts`, add:

```ts
export async function getPersonalWeaknessDiagnosis({
  client = getSupabaseBrowserClient(),
  dateFrom,
  dateTo,
  timezone,
}: {
  client?: AnalyticsClient & { rpc: (...args: unknown[]) => Promise<unknown> };
  dateFrom: string;
  dateTo: string;
  timezone: string;
}) {
  const { data, error } = await client.rpc("get_personal_weakness_diagnosis", {
    date_from: dateFrom,
    date_to: dateTo,
    user_timezone: timezone,
  });

  if (error) {
    throw new Error(error.message);
  }

  return mapPersonalWeaknessDiagnosisViewModel(data as PersonalWeaknessDiagnosisRow);
}
```

Keep existing dashboard and legacy analytics functions unchanged unless shared helpers are extracted for clarity.

- [ ] **Step 5: Re-run the targeted tests**

Run:

```bash
npm run test -- --run src/lib/api/analytics-api.test.ts src/lib/mappers/analytics-mappers.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/api/analytics-api.ts src/lib/api/analytics-api.test.ts src/lib/mappers/analytics-mappers.ts src/lib/mappers/analytics-mappers.test.ts
git commit -m "feat: expose personal weakness diagnosis contract"
```

## Chunk 5: Verification And Smoke Testing

### Task 8: Verify migration, runtime capture, snapshots, and diagnosis contract together

**Files:**
- No new files

- [ ] **Step 1: Run migration coverage**

Run:

```bash
npm run test -- --run supabase/migrations/20260508000019_personal_weakness_diagnosis.test.ts
```

Expected: PASS

- [ ] **Step 2: Run runtime API and session coverage**

Run:

```bash
npm run test -- --run src/lib/api/tryout-api.test.ts src/pages/app/tryout-session-page.test.tsx
```

Expected: PASS

- [ ] **Step 3: Run diagnosis API and mapper coverage**

Run:

```bash
npm run test -- --run src/lib/api/analytics-api.test.ts src/lib/mappers/analytics-mappers.test.ts
```

Expected: PASS

- [ ] **Step 4: Reset local Supabase and smoke-test the pipeline**

Run:

```bash
npm run supabase:reset
```

Expected: PASS

Manual smoke-check:

- start a diagnosis-approved `Try Out Besar`
- answer at least a few questions, including:
  - one question flagged `ragu-ragu`
  - one question with a changed answer
  - one question changed from correct to wrong if practical
- submit the attempt
- verify `attempt_diagnostic_snapshots` and `attempt_diagnostic_topic_snapshots` receive rows for that attempt
- complete at least three diagnosis-approved attempts in the test range
- call the diagnosis RPC for that submitted-date range
- confirm the payload returns `diagnosisMode = 'full'`
- confirm the weakest subtopic list is ordered and includes confidence plus behavior flags

- [ ] **Step 5: Optional direct RPC verification in SQL**

Run a direct RPC call through the Supabase SQL editor or local SQL shell with a logged-in test user context to inspect the returned JSON shape and check:

- `summary.eligibleAttemptCount`
- `summary.diagnosisMode`
- `globalBehaviorPatterns`
- `subtopicRankings`
- `narrative`

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add personal weakness diagnosis backend"
```

## Execution Notes

- This plan intentionally stops at backend/runtime capture and the TypeScript browser-client contract.
- A follow-on UI plan can add:
  - custom date-range controls
  - `empty` / `basic` / `full` diagnosis rendering
  - subtopic ranking presentation on the analytics page
- Do not fold that UI work into this execution unless product requirements are expanded first.
