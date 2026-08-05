# Tryout Session Timer And Ragu-Ragu Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make new tryout attempts use `1 minute per question`, persist a `ragu-ragu` marker per answered question, and auto-submit the session when the timer reaches zero.

**Architecture:** Extend the tryout runtime at the database layer so each new attempt stores `time_limit_seconds = total_questions * 60` and each answer row can store an `is_doubtful` boolean alongside the selected option. Then thread that richer answer state through the API and mapper layers into the session UI, where a live client countdown, doubtful toggle, and left-nav status colors share the same persisted source of truth.

**Tech Stack:** Supabase Postgres, SQL migrations, React 19, TypeScript, TanStack Query, React Router v7, Vitest, React Testing Library

---

## File Structure

### Database Runtime

- Create: `supabase/migrations/20260506000014_tryout_session_timer_ragu_ragu.sql`
- Create: `supabase/migrations/20260506000014_tryout_session_timer_ragu_ragu.test.ts`
- Reference: `supabase/migrations/20260501000004_tryout_runtime.sql`

### API And Mapper Layer

- Modify: `src/lib/api/tryout-api.ts`
- Modify: `src/lib/api/tryout-api.test.ts`
- Modify: `src/lib/mappers/tryout-mappers.ts`
- Modify: `src/lib/mappers/tryout-mappers.test.ts`

### Session UI

- Modify: `src/pages/app/tryout-session-page.tsx`
- Modify: `src/pages/app/tryout-session-page.test.tsx`

### Optional Fixture Updates

- Modify if needed: `supabase/seed.sql`

### Existing Docs

- Reference: `docs/superpowers/specs/2026-05-06-tryout-session-timer-ragu-ragu-design.md`

Notes:

- Follow `@test-driven-development` strictly: write the failing test first, watch it fail for the right reason, then implement the minimum code to pass.
- Use `@verification-before-completion` before claiming success.
- This workspace currently does not expose an active git repository, so replace commit steps with manual checkpoints unless git becomes available during execution.

## Chunk 1: Database Runtime And Persistence

### Task 1: Add `answers.is_doubtful` and switch new attempt timing to `total_questions * 60`

**Files:**
- Create: `supabase/migrations/20260506000014_tryout_session_timer_ragu_ragu.sql`
- Create: `supabase/migrations/20260506000014_tryout_session_timer_ragu_ragu.test.ts`
- Reference: `supabase/migrations/20260501000004_tryout_runtime.sql`

- [ ] **Step 1: Write the failing migration test**

Create `supabase/migrations/20260506000014_tryout_session_timer_ragu_ragu.test.ts` with assertions that the new migration:

- adds `is_doubtful boolean not null default false` to `public.answers`
- updates `start_attempt_from_template` so inserted attempts use question count for `time_limit_seconds`
- preserves the existing `submit_attempt` entry point
- keeps answer persistence centered on the `answers` table rather than a new doubtful table

Example assertion shape:

```ts
expect(migrationSql).toMatch(/add column if not exists is_doubtful boolean not null default false/i);
expect(migrationSql).toMatch(/template_question_count \* 60/i);
expect(migrationSql).toMatch(/create or replace function public\.submit_attempt/i);
```

- [ ] **Step 2: Run the migration test to verify it fails**

Run:

```bash
npm run test -- --run supabase/migrations/20260506000014_tryout_session_timer_ragu_ragu.test.ts
```

Expected: FAIL because the migration file does not exist yet.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260506000014_tryout_session_timer_ragu_ragu.sql` with the minimum schema/runtime changes:

- `alter table public.answers add column if not exists is_doubtful boolean not null default false;`
- replace `public.start_attempt_from_template(uuid)` so the inserted attempt uses:

```sql
time_limit_seconds = template_question_count * 60
```

- keep `total_questions = template_question_count`
- leave `submit_attempt(uuid)` scoring semantics unchanged unless a small compatibility touch is required

Recommended SQL skeleton:

```sql
alter table public.answers
  add column if not exists is_doubtful boolean not null default false;

create or replace function public.start_attempt_from_template(
  target_exam_template_id uuid
)
returns public.attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  template_row public.exam_templates%rowtype;
  created_attempt public.attempts%rowtype;
  template_question_count integer;
begin
  -- existing guards

  insert into public.attempts (
    user_id,
    exam_template_id,
    status,
    time_limit_seconds,
    total_questions
  )
  values (
    auth.uid(),
    template_row.id,
    'in_progress',
    template_question_count * 60,
    template_question_count
  )
  returning * into created_attempt;

  -- keep existing attempt_items snapshot insert
end;
$$;
```

- [ ] **Step 4: Run the migration test again**

Run:

```bash
npm run test -- --run supabase/migrations/20260506000014_tryout_session_timer_ragu_ragu.test.ts
```

Expected: PASS

- [ ] **Step 5: Reset local Supabase to catch SQL regressions early**

Run:

```bash
npm run supabase:reset
```

Expected: PASS

- [ ] **Step 6: Record a checkpoint**

Suggested note:

```text
Checkpoint: migration adds answers.is_doubtful and new attempts now derive time_limit_seconds from total_questions.
```

## Chunk 2: API And Mapper Contract

### Task 2: Extend answer persistence and session payload shape with `isDoubtful`

**Files:**
- Modify: `src/lib/api/tryout-api.ts`
- Modify: `src/lib/api/tryout-api.test.ts`
- Modify: `src/lib/mappers/tryout-mappers.ts`
- Modify: `src/lib/mappers/tryout-mappers.test.ts`

- [ ] **Step 1: Write the failing API and mapper tests**

Update `src/lib/api/tryout-api.test.ts` and `src/lib/mappers/tryout-mappers.test.ts` to expect:

- `AnswerRow` and mapped answer shapes include `is_doubtful` / `isDoubtful`
- `saveAnswer()` upserts both `selected_option_key` and `is_doubtful`
- `getAttemptSessionPageData()` returns `questions[].isDoubtful`
- `mapAttemptSessionPageData()` carries doubtful state through while still calculating `timeRemainingSeconds` correctly

Example test targets:

```ts
expect(upsert).toHaveBeenCalledWith(
  expect.objectContaining({
    selected_option_key: "B",
    is_doubtful: true,
  }),
  { onConflict: "attempt_item_id" },
);
```

```ts
expect(data.questions[0]).toMatchObject({
  selectedOptionKey: "B",
  isDoubtful: true,
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run:

```bash
npm run test -- --run src/lib/api/tryout-api.test.ts src/lib/mappers/tryout-mappers.test.ts
```

Expected: FAIL because the current contracts only understand `selectedOptionKey`.

- [ ] **Step 3: Update the API types and query mapping**

In `src/lib/api/tryout-api.ts`:

- extend `AnswerRow`:

```ts
type AnswerRow = {
  attempt_id: string;
  attempt_item_id: string;
  selected_option_key: string | null;
  is_doubtful: boolean;
  answered_at: string;
};
```

- extend `PersistedAnswer`:

```ts
export type PersistedAnswer = {
  attemptId: string;
  attemptItemId: string;
  selectedOptionKey: string | null;
  isDoubtful: boolean;
  answeredAt: string;
};
```

- update `mapAnswer()`:

```ts
function mapAnswer(row: AnswerRow): PersistedAnswer {
  return {
    attemptId: row.attempt_id,
    attemptItemId: row.attempt_item_id,
    selectedOptionKey: row.selected_option_key,
    isDoubtful: row.is_doubtful,
    answeredAt: row.answered_at,
  };
}
```

- update `getAnswersByAttemptId()` select clause:

```ts
.select("attempt_id, attempt_item_id, selected_option_key, is_doubtful, answered_at")
```

- expand `saveAnswer()` input and upsert payload:

```ts
export async function saveAnswer({
  client = getSupabaseBrowserClient(),
  attemptId,
  attemptItemId,
  selectedOptionKey,
  isDoubtful,
}: {
  client?: TryoutClient;
  attemptId: string;
  attemptItemId: string;
  selectedOptionKey: string | null;
  isDoubtful: boolean;
}): Promise<PersistedAnswer> {
  const safeIsDoubtful = selectedOptionKey ? isDoubtful : false;

  const { data, error } = await client
    .from("answers")
    .upsert(
      {
        attempt_id: attemptId,
        attempt_item_id: attemptItemId,
        selected_option_key: selectedOptionKey,
        is_doubtful: safeIsDoubtful,
        answered_at: new Date().toISOString(),
      },
      {
        onConflict: "attempt_item_id",
      },
    )
    .select("attempt_id, attempt_item_id, selected_option_key, is_doubtful, answered_at")
    .single();
```

- [ ] **Step 4: Update the session mapper contract**

In `src/lib/mappers/tryout-mappers.ts`:

- extend `TryoutSessionPageData.questions[]`:

```ts
questions: Array<{
  id: string;
  order: number;
  blockLabel: string;
  stem: string;
  questionImageUrl: string | null;
  options: Array<{ key: string; text: string }>;
  selectedOptionKey: string | null;
  isDoubtful: boolean;
}>;
```

- update mapper input answer shape:

```ts
answers: Array<{
  attemptItemId: string;
  selectedOptionKey: string | null;
  isDoubtful: boolean;
}>;
```

- use a richer answer lookup:

```ts
const answerLookup = new Map(
  answers.map((answer) => [
    answer.attemptItemId,
    {
      selectedOptionKey: answer.selectedOptionKey,
      isDoubtful: answer.isDoubtful,
    },
  ]),
);
```

- map each question with a safe fallback:

```ts
const answerState = answerLookup.get(item.id) ?? {
  selectedOptionKey: null,
  isDoubtful: false,
};

return {
  id: item.id,
  order: item.sortOrder,
  blockLabel: item.blockName,
  stem: item.stem,
  questionImageUrl: item.questionImageUrl,
  options: item.options,
  selectedOptionKey: answerState.selectedOptionKey,
  isDoubtful: answerState.isDoubtful,
};
```

- [ ] **Step 5: Re-run the API and mapper tests**

Run:

```bash
npm run test -- --run src/lib/api/tryout-api.test.ts src/lib/mappers/tryout-mappers.test.ts
```

Expected: PASS

- [ ] **Step 6: Record a checkpoint**

Suggested note:

```text
Checkpoint: saveAnswer and session payload now persist and expose isDoubtful consistently.
```

## Chunk 3: Session UI Behavior

### Task 3: Add doubtful toggle, yellow nav states, and optimistic UI support

**Files:**
- Modify: `src/pages/app/tryout-session-page.tsx`
- Modify: `src/pages/app/tryout-session-page.test.tsx`

- [ ] **Step 1: Write the failing session-page tests for doubtful interactions**

Extend `src/pages/app/tryout-session-page.test.tsx` to cover:

- `Ragu-ragu` is disabled before the user selects an answer
- selecting an answer enables `Ragu-ragu`
- toggling `Ragu-ragu` calls `saveAnswer()` with the current `selectedOptionKey` and `isDoubtful: true`
- the left question-number navigation uses a yellow state for answered doubtful items

Recommended new fixture shape in the mocked query result:

```ts
questions: [
  {
    id: "item-1",
    order: 1,
    blockLabel: "Clinical Science",
    stem: "Apa terapi awal?",
    questionImageUrl: null,
    options: [
      { key: "A", text: "Pilihan A" },
      { key: "B", text: "Pilihan B" },
    ],
    selectedOptionKey: null,
    isDoubtful: false,
  },
]
```

Example assertions:

```ts
expect(screen.getByRole("button", { name: /ragu-ragu/i })).toBeDisabled();
```

```ts
await waitFor(() => {
  expect(mockSaveAnswer).toHaveBeenCalledWith({
    attemptId: "attempt-1",
    attemptItemId: "item-1",
    selectedOptionKey: "A",
    isDoubtful: true,
  });
});
```

- [ ] **Step 2: Run the session-page test to verify it fails**

Run:

```bash
npm run test -- --run src/pages/app/tryout-session-page.test.tsx
```

Expected: FAIL because the page does not render or persist doubtful state yet.

- [ ] **Step 3: Update the mutation contract and optimistic cache path**

In `src/pages/app/tryout-session-page.tsx`:

- expand the mutation variable shape:

```ts
mutationFn: (variables: {
  attemptItemId: string;
  selectedOptionKey: string | null;
  isDoubtful: boolean;
}) => saveAnswer({
  attemptId: attemptId!,
  attemptItemId: variables.attemptItemId,
  selectedOptionKey: variables.selectedOptionKey,
  isDoubtful: variables.isDoubtful,
})
```

- update `onMutate()` so the cached question updates both fields:

```ts
questions: current.questions.map((question) =>
  question.id === variables.attemptItemId
    ? {
        ...question,
        selectedOptionKey: variables.selectedOptionKey,
        isDoubtful: variables.isDoubtful,
      }
    : question
)
```

- keep `onError()` rollback unchanged

- [ ] **Step 4: Add focused page helpers for answer selection and doubtful toggling**

Inside `TryoutSessionPage`, add small local helpers:

```ts
function persistAnswer(selectedOptionKey: string | null, isDoubtful: boolean) {
  if (!currentQuestion || !attemptId) {
    return;
  }

  answerMutation.mutate({
    attemptItemId: currentQuestion.id,
    selectedOptionKey,
    isDoubtful: selectedOptionKey ? isDoubtful : false,
  });
}

function selectAnswer(optionKey: string) {
  const nextIsDoubtful = currentQuestion?.isDoubtful ?? false;
  persistAnswer(optionKey, nextIsDoubtful);
}

function toggleDoubtful() {
  if (!currentQuestion?.selectedOptionKey) {
    return;
  }

  persistAnswer(currentQuestion.selectedOptionKey, !currentQuestion.isDoubtful);
}
```

This keeps the page logic DRY and preserves doubtful state when the user changes options.

- [ ] **Step 5: Render the `Ragu-ragu` control and yellow nav styling**

In the session page JSX:

- compute local flags:

```ts
const hasSelectedAnswer = Boolean(currentQuestion?.selectedOptionKey);
```

- add a button below the answer list, before previous/next controls:

```tsx
<button
  className={[
    "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition duration-200 ease-[var(--dashboard-ease)] active:translate-y-px active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
    currentQuestion?.isDoubtful
      ? "border border-[rgba(221,170,24,0.32)] bg-[rgba(244,197,66,0.22)] text-[rgb(133,97,12)]"
      : "border border-[var(--color-outline-soft)] bg-[rgba(255,252,244,0.72)] text-[var(--color-outline)] hover:bg-[rgba(244,197,66,0.16)]",
  ].join(" ")}
  disabled={!hasSelectedAnswer || answerMutation.isPending}
  onClick={toggleDoubtful}
  type="button"
>
  {currentQuestion?.isDoubtful ? "Batal ragu-ragu" : "Ragu-ragu"}
</button>
```

- update the left-number button class selection order to include doubtful state before answered-green:

```ts
index === currentIndex
  ? "border-[rgba(31,111,115,0.26)] bg-[rgba(31,111,115,0.12)] text-[var(--color-teal-deep)]"
  : question.selectedOptionKey && question.isDoubtful
    ? "border-[rgba(221,170,24,0.3)] bg-[rgba(244,197,66,0.22)] text-[rgb(133,97,12)]"
    : question.selectedOptionKey
      ? "border-[rgba(107,203,119,0.24)] bg-[rgba(107,203,119,0.16)] text-[var(--color-green-deep)]"
      : "border-[var(--color-outline-soft)] bg-[rgba(255,252,244,0.7)] text-[var(--color-outline)] hover:bg-[rgba(31,111,115,0.08)]"
```

- [ ] **Step 6: Re-run the session-page test**

Run:

```bash
npm run test -- --run src/pages/app/tryout-session-page.test.tsx
```

Expected: PASS for the doubtful-toggle coverage, with any remaining countdown failures still pending if those tests were added separately.

### Task 4: Add live countdown and single-fire auto-submit behavior

**Files:**
- Modify: `src/pages/app/tryout-session-page.tsx`
- Modify: `src/pages/app/tryout-session-page.test.tsx`

- [ ] **Step 1: Write the failing countdown and auto-submit tests**

Add session-page tests that:

- use fake timers
- assert the timer label updates after one second
- assert `submitAttempt()` is called once when the local countdown reaches zero
- assert auto-submit does not fire if the attempt is already `submitted`

Recommended fixture for the countdown test:

```ts
attempt: {
  id: "attempt-1",
  status: "in_progress",
  totalQuestions: 1,
  timeRemainingSeconds: 2,
}
```

Recommended timer setup:

```ts
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});
```

Recommended assertion shape:

```ts
await screen.findByText(/timer sesi 00:00:02/i);
vi.advanceTimersByTime(1000);
expect(screen.getByText(/timer sesi 00:00:01/i)).toBeInTheDocument();
vi.advanceTimersByTime(1000);
await waitFor(() => {
  expect(mockSubmitAttempt).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run the session-page test to verify it fails**

Run:

```bash
npm run test -- --run src/pages/app/tryout-session-page.test.tsx
```

Expected: FAIL because the current timer is static and never auto-submits.

- [ ] **Step 3: Implement local countdown state**

In `src/pages/app/tryout-session-page.tsx`:

- add countdown state and a reset effect:

```ts
const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);
```

```ts
useEffect(() => {
  if (sessionData?.view !== "ready" || !sessionData.attempt) {
    setTimeRemainingSeconds(null);
    return;
  }

  setTimeRemainingSeconds(sessionData.attempt.timeRemainingSeconds);
}, [sessionData]);
```

- replace the timer label dependency so it prefers local countdown state:

```ts
const timerLabel = useMemo(() => {
  if (sessionData?.view !== "ready" || !sessionData.attempt) {
    return "Timer sesi --:--:--";
  }

  const visibleSeconds = timeRemainingSeconds ?? sessionData.attempt.timeRemainingSeconds;

  return `Timer sesi ${formatDurationAsClock(visibleSeconds)}`;
}, [sessionData, timeRemainingSeconds]);
```

- add the ticking interval:

```ts
useEffect(() => {
  if (sessionData?.view !== "ready" || sessionData.attempt.status !== "in_progress") {
    return;
  }

  if (timeRemainingSeconds === null || timeRemainingSeconds <= 0) {
    return;
  }

  const timer = window.setInterval(() => {
    setTimeRemainingSeconds((current) => {
      if (current === null) {
        return current;
      }

      return Math.max(0, current - 1);
    });
  }, 1000);

  return () => window.clearInterval(timer);
}, [sessionData, timeRemainingSeconds]);
```

- [ ] **Step 4: Implement single-fire auto-submit**

Add a guard ref:

```ts
const hasTriggeredAutoSubmit = useRef(false);
```

Reset it when a new in-progress attempt payload loads:

```ts
useEffect(() => {
  if (sessionData?.view === "ready" && sessionData.attempt?.status === "in_progress") {
    hasTriggeredAutoSubmit.current = false;
  }
}, [sessionData]);
```

Add the auto-submit effect:

```ts
useEffect(() => {
  if (sessionData?.view !== "ready" || sessionData.attempt?.status !== "in_progress") {
    return;
  }

  if (timeRemainingSeconds !== 0) {
    return;
  }

  if (submitMutation.isPending || hasTriggeredAutoSubmit.current) {
    return;
  }

  hasTriggeredAutoSubmit.current = true;
  setSubmitError(null);
  submitMutation.mutate();
}, [sessionData, submitMutation, timeRemainingSeconds]);
```

This is intentionally narrow: it only fires when the local countdown hits exactly zero and the attempt is still active.

- [ ] **Step 5: Re-run the session-page test**

Run:

```bash
npm run test -- --run src/pages/app/tryout-session-page.test.tsx
```

Expected: PASS

- [ ] **Step 6: Record a checkpoint**

Suggested note:

```text
Checkpoint: session page now supports doubtful toggles, yellow nav states, live countdown, and single-fire auto-submit.
```

## Chunk 4: Full Verification

### Task 5: Verify the entire tryout-session change set

**Files:**
- No new files

- [ ] **Step 1: Run migration coverage**

Run:

```bash
npm run test -- --run supabase/migrations/20260506000014_tryout_session_timer_ragu_ragu.test.ts
```

Expected: PASS

- [ ] **Step 2: Run API and mapper coverage**

Run:

```bash
npm run test -- --run src/lib/api/tryout-api.test.ts src/lib/mappers/tryout-mappers.test.ts
```

Expected: PASS

- [ ] **Step 3: Run session-page coverage**

Run:

```bash
npm run test -- --run src/pages/app/tryout-session-page.test.tsx
```

Expected: PASS

- [ ] **Step 4: Run adjacent student-surface tests**

Run:

```bash
npm run test -- --run src/router/app-router.test.tsx
```

Expected: PASS

Optional runtime smoke-check if credentials and local services are available:

```bash
npx playwright test tests/e2e/pro-tryout-flow.spec.ts
```

Expected: PASS, or SKIPPED when `E2E_PRO_EMAIL` / `E2E_PRO_PASSWORD` are not configured.

- [ ] **Step 5: Reset Supabase and smoke-check the flow manually**

Run:

```bash
npm run supabase:reset
```

Expected: PASS

Manual smoke-check:

- start a new tryout session and confirm the initial timer matches `jumlah soal x 60 detik`
- choose an option and confirm `Ragu-ragu` becomes enabled
- mark a question `Ragu-ragu` and confirm its left-nav number turns yellow
- switch to another option and confirm the question stays yellow
- let a short test session hit zero and confirm auto-submit redirects to the result page

- [ ] **Step 6: Record the final checkpoint**

Suggested note:

```text
Final checkpoint: timer-per-question, persisted doubtful answers, and auto-submit verified through targeted tests and local smoke-check.
```
