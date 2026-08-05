# Tryout Pause And Resume Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pause-and-resume flow for tryouts so closing the web app automatically pauses the active attempt, preserves answers and question order, and lets the student continue the same attempt later from `/app/tryout`.

**Architecture:** Extend the tryout runtime in Supabase so attempts can move between `in_progress` and `paused` while persisting accumulated active time in `elapsed_seconds`. Then thread the richer runtime state through the TypeScript API and mapper layers into two student surfaces: the catalog page, which shows a resume-first `Lanjutkan Try Out` panel, and the session page, which auto-pauses on browser exit and resumes the same attempt without creating a new one.

**Tech Stack:** Supabase Postgres, SQL migrations, React 19, TypeScript, TanStack Query, React Router v7, Vitest, React Testing Library

---

## File Structure

### Database Runtime

- Create: `supabase/migrations/20260508000018_tryout_pause_resume.sql`
- Create: `supabase/migrations/20260508000018_tryout_pause_resume.test.ts`
- Reference: `supabase/migrations/20260501000004_tryout_runtime.sql`
- Reference: `supabase/migrations/20260506000014_tryout_session_timer_ragu_ragu.sql`

### API And Mapper Layer

- Modify: `src/lib/api/tryout-api.ts`
- Modify: `src/lib/api/tryout-api.test.ts`
- Modify: `src/lib/mappers/tryout-mappers.ts`
- Modify: `src/lib/mappers/tryout-mappers.test.ts`

### Tryout Catalog UI

- Modify: `src/pages/app/tryout-catalog-page.tsx`
- Modify: `src/pages/app/tryout-catalog-page.test.tsx`

### Tryout Session UI

- Modify: `src/pages/app/tryout-session-page.tsx`
- Modify: `src/pages/app/tryout-session-page.test.tsx`

### Routing And Shared Verification

- Modify if needed: `src/router/app-router.test.tsx`

### Existing Docs

- Reference: `docs/superpowers/specs/2026-05-08-tryout-pause-resume-design.md`

Notes:

- Follow `@test-driven-development`: write the failing test first, run it, then implement the minimum code that makes it pass.
- Use `@verification-before-completion` before claiming the feature is done.
- Keep changes DRY and YAGNI: do not add a manual pause CTA, a new tryout route, or support for multiple paused attempts.
- React browser event cleanup should follow the official React guidance already verified through Context7 during design work.

## Chunk 1: Database Runtime And Pause Semantics

### Task 1: Add paused runtime fields and pause/resume RPC coverage

**Files:**
- Create: `supabase/migrations/20260508000018_tryout_pause_resume.sql`
- Create: `supabase/migrations/20260508000018_tryout_pause_resume.test.ts`
- Reference: `supabase/migrations/20260506000014_tryout_session_timer_ragu_ragu.sql`

- [ ] **Step 1: Write the failing migration test**

Create `supabase/migrations/20260508000018_tryout_pause_resume.test.ts` with assertions that the migration:

- supports `paused` as an attempt runtime state
- adds `elapsed_seconds integer not null default 0`
- adds `last_resumed_at timestamptz`
- adds `paused_at timestamptz`
- creates `public.pause_attempt(uuid)`
- creates `public.resume_attempt(uuid)`
- updates `public.submit_attempt(uuid)` to use accumulated runtime instead of direct `submitted_at - started_at`

Example assertion shape:

```ts
expect(migrationSql).toMatch(/elapsed_seconds integer not null default 0/i);
expect(migrationSql).toMatch(/create or replace function public\.pause_attempt/i);
expect(migrationSql).toMatch(/create or replace function public\.resume_attempt/i);
expect(migrationSql).toMatch(/time_used_seconds_value := greatest\(/i);
expect(migrationSql).toMatch(/target_attempt\.elapsed_seconds/i);
```

- [ ] **Step 2: Run the migration test to verify it fails**

Run:

```bash
npm run test -- --run supabase/migrations/20260508000018_tryout_pause_resume.test.ts
```

Expected: FAIL because the migration file does not exist yet.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260508000018_tryout_pause_resume.sql` with the minimum runtime changes:

- alter `public.attempts` runtime storage:

```sql
alter table public.attempts
  add column if not exists elapsed_seconds integer not null default 0,
  add column if not exists last_resumed_at timestamptz,
  add column if not exists paused_at timestamptz;
```

- normalize historical rows so existing `in_progress` attempts get a usable `last_resumed_at`
- update `public.start_attempt_from_template(uuid)` to:
  - block creation if the current user already has one `in_progress` or `paused` attempt
  - insert `elapsed_seconds = 0`
  - insert `last_resumed_at = timezone('utc', now())`
  - insert `paused_at = null`
- add `public.pause_attempt(uuid)` with idempotent pause semantics
- add `public.resume_attempt(uuid)` with idempotent resume semantics
- update `public.submit_attempt(uuid)` so:

```sql
time_used_seconds_value := greatest(
  0,
  least(
    target_attempt.time_limit_seconds,
    target_attempt.elapsed_seconds
    + case
        when target_attempt.status = 'in_progress' and target_attempt.last_resumed_at is not null
          then greatest(0, extract(epoch from (submission_time - target_attempt.last_resumed_at))::integer)
        else 0
      end
  )
);
```

- [ ] **Step 4: Run the migration test again**

Run:

```bash
npm run test -- --run supabase/migrations/20260508000018_tryout_pause_resume.test.ts
```

Expected: PASS

- [ ] **Step 5: Reset local Supabase to catch SQL issues early**

Run:

```bash
npm run supabase:reset
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260508000018_tryout_pause_resume.sql supabase/migrations/20260508000018_tryout_pause_resume.test.ts
git commit -m "feat: add tryout pause runtime"
```

### Task 2: Lock start-attempt behavior to one active or paused tryout per user

**Files:**
- Modify: `supabase/migrations/20260508000018_tryout_pause_resume.sql`
- Modify: `supabase/migrations/20260508000018_tryout_pause_resume.test.ts`

- [ ] **Step 1: Extend the failing migration test with single-attempt assertions**

Add assertions that the SQL:

- checks for existing `in_progress` or `paused` attempts before insert
- raises a clear domain error when another active attempt exists

Example assertion:

```ts
expect(migrationSql).toMatch(/where user_id = auth\.uid\(\)\s+and status in \('in_progress', 'paused'\)/i);
expect(migrationSql).toMatch(/lanjutkan try out yang masih aktif/i);
```

- [ ] **Step 2: Run the migration test to verify it fails**

Run:

```bash
npm run test -- --run supabase/migrations/20260508000018_tryout_pause_resume.test.ts
```

Expected: FAIL until the start-attempt guard is added.

- [ ] **Step 3: Implement the single-attempt guard**

In `public.start_attempt_from_template(uuid)`, add a pre-insert guard like:

```sql
if exists (
  select 1
  from public.attempts
  where user_id = auth.uid()
    and status in ('in_progress', 'paused')
) then
  raise exception 'Silakan lanjutkan try out yang masih aktif sebelum memulai sesi baru.'
    using errcode = 'P0001';
end if;
```

Keep the rest of the attempt snapshot logic unchanged.

- [ ] **Step 4: Re-run the migration test**

Run:

```bash
npm run test -- --run supabase/migrations/20260508000018_tryout_pause_resume.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260508000018_tryout_pause_resume.sql supabase/migrations/20260508000018_tryout_pause_resume.test.ts
git commit -m "feat: enforce one active tryout attempt"
```

## Chunk 2: API And Mapper Contract

### Task 3: Extend attempt and session contracts for paused runtime state

**Files:**
- Modify: `src/lib/api/tryout-api.ts`
- Modify: `src/lib/api/tryout-api.test.ts`
- Modify: `src/lib/mappers/tryout-mappers.ts`
- Modify: `src/lib/mappers/tryout-mappers.test.ts`

- [ ] **Step 1: Write the failing API and mapper tests**

Update `src/lib/api/tryout-api.test.ts` and `src/lib/mappers/tryout-mappers.test.ts` to expect:

- `AttemptRow` and `PersistedAttempt` include `elapsed_seconds`, `last_resumed_at`, and `paused_at`
- session page mapping returns correct `timeRemainingSeconds` for both `in_progress` and `paused`
- `submitted` attempts still compute remaining time correctly from accumulated runtime

Example test target:

```ts
expect(data.attempt).toEqual({
  id: "attempt-1",
  status: "paused",
  totalQuestions: 2,
  timeRemainingSeconds: 1800,
});
```

Example mapper input:

```ts
attempt: {
  id: "attempt-1",
  status: "paused",
  totalQuestions: 2,
  timeLimitSeconds: 3600,
  startedAt: "2026-05-08T10:00:00.000Z",
  submittedAt: null,
  elapsedSeconds: 1800,
  lastResumedAt: null,
  pausedAt: "2026-05-08T10:30:00.000Z",
}
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run:

```bash
npm run test -- --run src/lib/api/tryout-api.test.ts src/lib/mappers/tryout-mappers.test.ts
```

Expected: FAIL because the current contracts only know about `started_at`, `submitted_at`, and direct countdown math.

- [ ] **Step 3: Update the API types and row mapping**

In `src/lib/api/tryout-api.ts`:

- extend `AttemptRow`:

```ts
type AttemptRow = {
  id: string;
  user_id: string;
  exam_template_id: string;
  status: "in_progress" | "paused" | "submitted" | "abandoned";
  started_at: string;
  submitted_at: string | null;
  time_limit_seconds: number;
  total_questions: number;
  elapsed_seconds: number;
  last_resumed_at: string | null;
  paused_at: string | null;
};
```

- extend `PersistedAttempt` with `elapsedSeconds`, `lastResumedAt`, and `pausedAt`
- update every `attempts` select clause to include the three new columns
- keep all existing question and answer mapping code unchanged unless type updates require small adjustments

- [ ] **Step 4: Update the timer mapper**

In `src/lib/mappers/tryout-mappers.ts`, add a small helper:

```ts
function calculateAttemptTimeUsedSeconds(attempt: {
  status: "in_progress" | "paused" | "submitted" | "abandoned";
  elapsedSeconds: number;
  startedAt: string;
  lastResumedAt: string | null;
  submittedAt: string | null;
}, now: Date): number {
  if (attempt.status === "in_progress" && attempt.lastResumedAt) {
    return attempt.elapsedSeconds
      + Math.max(0, Math.floor((now.getTime() - new Date(attempt.lastResumedAt).getTime()) / 1000));
  }

  if (attempt.status === "submitted" && attempt.submittedAt && attempt.lastResumedAt) {
    return attempt.elapsedSeconds
      + Math.max(0, Math.floor((new Date(attempt.submittedAt).getTime() - new Date(attempt.lastResumedAt).getTime()) / 1000));
  }

  return attempt.elapsedSeconds;
}
```

Then use it in `mapAttemptSessionPageData()` to derive `timeRemainingSeconds`.

- [ ] **Step 5: Re-run the API and mapper tests**

Run:

```bash
npm run test -- --run src/lib/api/tryout-api.test.ts src/lib/mappers/tryout-mappers.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/api/tryout-api.ts src/lib/api/tryout-api.test.ts src/lib/mappers/tryout-mappers.ts src/lib/mappers/tryout-mappers.test.ts
git commit -m "feat: add pause-aware tryout timing contracts"
```

### Task 4: Add active-attempt query plus pause/resume API helpers

**Files:**
- Modify: `src/lib/api/tryout-api.ts`
- Modify: `src/lib/api/tryout-api.test.ts`
- Modify: `src/lib/mappers/tryout-mappers.ts`

- [ ] **Step 1: Write the failing API tests for active-attempt discovery and runtime mutations**

Extend `src/lib/api/tryout-api.test.ts` to cover:

- `findActiveAttemptForUser()` returning the latest active or paused attempt with template metadata
- `pauseAttempt()` calling `pause_attempt`
- `resumeAttempt()` calling `resume_attempt`

Example assertions:

```ts
expect(rpc).toHaveBeenCalledWith("pause_attempt", {
  target_attempt_id: "attempt-1",
});
```

```ts
expect(activeAttempt).toMatchObject({
  attemptId: "attempt-1",
  status: "paused",
  title: "Try Out Besar",
  mode: "full",
  answeredCount: 12,
});
```

- [ ] **Step 2: Run the targeted API test to verify it fails**

Run:

```bash
npm run test -- --run src/lib/api/tryout-api.test.ts
```

Expected: FAIL because these exports and query shapes do not exist yet.

- [ ] **Step 3: Add the new API helpers**

In `src/lib/api/tryout-api.ts`:

- add a new exported shape:

```ts
export type ActiveAttemptSummary = {
  attemptId: string;
  status: "in_progress" | "paused";
  title: string;
  mode: "full" | "block" | "topic";
  answeredCount: number;
  totalQuestions: number;
  timeRemainingSeconds: number;
};
```

- add `findActiveAttemptForUser({ userId })`
- query `attempts` joined to `exam_templates`
- compute `answeredCount` from `answers` where `selected_option_key` is not null
- reuse the same timer helper logic so the summary is pause-aware
- add:

```ts
export async function pauseAttempt({ client = getSupabaseBrowserClient(), attemptId }: { client?: TryoutClient; attemptId: string; }) {
  const { data, error } = await client.rpc("pause_attempt", {
    target_attempt_id: attemptId,
  });
  if (error) throw new Error(error.message);
  return mapAttempt(data as AttemptRow);
}
```

```ts
export async function resumeAttempt({ client = getSupabaseBrowserClient(), attemptId }: { client?: TryoutClient; attemptId: string; }) {
  const { data, error } = await client.rpc("resume_attempt", {
    target_attempt_id: attemptId,
  });
  if (error) throw new Error(error.message);
  return mapAttempt(data as AttemptRow);
}
```

- [ ] **Step 4: Re-run the targeted API test**

Run:

```bash
npm run test -- --run src/lib/api/tryout-api.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/tryout-api.ts src/lib/api/tryout-api.test.ts src/lib/mappers/tryout-mappers.ts
git commit -m "feat: add active tryout resume api"
```

## Chunk 3: Catalog Resume Experience

### Task 5: Show the `Lanjutkan Try Out` panel in the tryout catalog

**Files:**
- Modify: `src/pages/app/tryout-catalog-page.tsx`
- Modify: `src/pages/app/tryout-catalog-page.test.tsx`
- Modify: `src/lib/api/tryout-api.ts`

- [ ] **Step 1: Write the failing catalog-page tests**

Update `src/pages/app/tryout-catalog-page.test.tsx` to cover:

- the page still renders the normal catalog when there is no active attempt
- the page renders `Lanjutkan Try Out` when `findActiveAttemptForUser()` returns a summary
- the panel shows title, answered progress, and remaining time
- clicking the CTA resumes the existing attempt instead of linking to a new template session

Example assertion shapes:

```ts
expect(screen.getByText(/lanjutkan try out/i)).toBeInTheDocument();
expect(screen.getByText(/12 dari 30 soal/i)).toBeInTheDocument();
expect(screen.getByRole("link", { name: /lanjutkan try out/i })).toHaveAttribute(
  "href",
  "/app/tryout/session?attempt=attempt-1",
);
```

- [ ] **Step 2: Run the catalog test to verify it fails**

Run:

```bash
npm run test -- --run src/pages/app/tryout-catalog-page.test.tsx
```

Expected: FAIL because the current page only renders templates.

- [ ] **Step 3: Add the active-attempt query to the catalog page**

In `src/pages/app/tryout-catalog-page.tsx`:

- import `useSession` if needed to access the authenticated user id
- create a second query:

```ts
const activeAttemptQuery = useQuery({
  queryKey: ["active-tryout-attempt", user?.id],
  enabled: Boolean(user?.id),
  queryFn: () => findActiveAttemptForUser({ userId: user!.id }),
});
```

- render a panel above the existing catalog when `activeAttemptQuery.data` exists
- show:
  - title
  - mode label
  - `${answeredCount} dari ${totalQuestions} soal`
  - `Timer sesi ${formatDurationAsClock(timeRemainingSeconds)}`
  - CTA to `/app/tryout/session?attempt=${attemptId}`

- [ ] **Step 4: Keep the existing catalog visible below the resume panel**

Do not remove existing section rendering. Only prepend the resume panel so the student can still see the catalog context without being able to start a new attempt accidentally.

Recommended JSX skeleton:

```tsx
{activeAttempt ? (
  <SurfacePanel as="article" className="mb-6 px-5 py-5" tone="accent">
    <MetricPill tone="gold">Lanjutkan Try Out</MetricPill>
    <h3 className="mt-4 text-2xl font-semibold text-[var(--color-cream-strong)]">
      {activeAttempt.title}
    </h3>
    <p className="mt-3 text-sm leading-7 text-[var(--color-accent-ink)]">
      {activeAttempt.answeredCount} dari {activeAttempt.totalQuestions} soal terjawab. Timer berhenti saat sesi ditutup dan akan lanjut dari titik terakhir.
    </p>
    <div className="mt-5 flex items-center justify-between gap-3">
      <MetricPill tone="gold">
        Timer sesi {formatDurationAsClock(activeAttempt.timeRemainingSeconds)}
      </MetricPill>
      <Link to={`/app/tryout/session?attempt=${activeAttempt.attemptId}`}>Lanjutkan Try Out</Link>
    </div>
  </SurfacePanel>
) : null}
```

- [ ] **Step 5: Re-run the catalog test**

Run:

```bash
npm run test -- --run src/pages/app/tryout-catalog-page.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/app/tryout-catalog-page.tsx src/pages/app/tryout-catalog-page.test.tsx src/lib/api/tryout-api.ts
git commit -m "feat: show tryout resume panel"
```

## Chunk 4: Session Pause And Resume Behavior

### Task 6: Prevent new attempt creation when resuming and add explicit resume flow

**Files:**
- Modify: `src/pages/app/tryout-session-page.tsx`
- Modify: `src/pages/app/tryout-session-page.test.tsx`
- Modify: `src/lib/api/tryout-api.ts`

- [ ] **Step 1: Write the failing session-page tests for resume behavior**

Update `src/pages/app/tryout-session-page.test.tsx` to cover:

- when `attempt` is present in the URL, the page does not call `createAttempt()`
- when session data reports `status: "paused"`, the page resumes the attempt once before letting the timer continue
- resumed sessions show previously saved answers instead of resetting the page state

Example assertion shapes:

```ts
expect(mockCreateAttempt).not.toHaveBeenCalled();
expect(mockResumeAttempt).toHaveBeenCalledWith({ attemptId: "attempt-1" });
expect(screen.getByRole("button", { name: /pilihan b/i })).toHaveAttribute("aria-pressed", "true");
```

- [ ] **Step 2: Run the session-page test to verify it fails**

Run:

```bash
npm run test -- --run src/pages/app/tryout-session-page.test.tsx
```

Expected: FAIL because resume behavior and resume mutation do not exist on the page.

- [ ] **Step 3: Add resume mutation wiring**

In `src/pages/app/tryout-session-page.tsx`:

- import `resumeAttempt`
- create:

```ts
const resumeMutation = useMutation({
  mutationFn: () => resumeAttempt({ attemptId: attemptId! }),
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: ["tryout-session", attemptId] });
    void queryClient.invalidateQueries({ queryKey: ["active-tryout-attempt"] });
  },
});
```

- add an effect:

```ts
useEffect(() => {
  if (sessionData?.view !== "ready") return;
  if (sessionData.attempt?.status !== "paused") return;
  if (resumeMutation.isPending || resumeMutation.isSuccess) return;
  resumeMutation.mutate();
}, [resumeMutation, sessionData]);
```

- keep the existing create-attempt effect guarded by `!attemptId`

- [ ] **Step 4: Re-run the session-page test**

Run:

```bash
npm run test -- --run src/pages/app/tryout-session-page.test.tsx
```

Expected: PASS for resume-specific coverage, with auto-pause still pending.

- [ ] **Step 5: Commit**

```bash
git add src/pages/app/tryout-session-page.tsx src/pages/app/tryout-session-page.test.tsx src/lib/api/tryout-api.ts
git commit -m "feat: resume paused tryout sessions"
```

### Task 7: Auto-pause the live session on browser exit with safe cleanup

**Files:**
- Modify: `src/pages/app/tryout-session-page.tsx`
- Modify: `src/pages/app/tryout-session-page.test.tsx`

- [ ] **Step 1: Write the failing session-page tests for auto-pause**

Extend `src/pages/app/tryout-session-page.test.tsx` to cover:

- dispatching `pagehide` calls `pauseAttempt()` once when the attempt is `in_progress`
- dispatching `visibilitychange` while `document.hidden = true` calls `pauseAttempt()` once as a fallback
- `pauseAttempt()` is not called after manual submit starts
- duplicate browser events do not cause duplicate pause requests

Example test shape:

```ts
window.dispatchEvent(new PageTransitionEvent("pagehide"));
await waitFor(() => {
  expect(mockPauseAttempt).toHaveBeenCalledTimes(1);
});
```

Example fallback setup:

```ts
Object.defineProperty(document, "hidden", {
  configurable: true,
  get: () => true,
});
document.dispatchEvent(new Event("visibilitychange"));
```

- [ ] **Step 2: Run the session-page test to verify it fails**

Run:

```bash
npm run test -- --run src/pages/app/tryout-session-page.test.tsx
```

Expected: FAIL because no auto-pause listeners exist.

- [ ] **Step 3: Add a one-shot pause dispatcher**

In `src/pages/app/tryout-session-page.tsx`, add refs:

```ts
const hasRequestedPauseRef = useRef(false);
const hasStartedManualSubmitRef = useRef(false);
```

Reset `hasRequestedPauseRef` when a fresh in-progress attempt becomes active.

Create a helper:

```ts
function requestPause() {
  if (!attemptId || !sessionAttempt || sessionAttempt.status !== "in_progress") return;
  if (submitMutation.isPending || hasStartedManualSubmitRef.current) return;
  if (hasRequestedPauseRef.current) return;

  hasRequestedPauseRef.current = true;
  pauseMutation.mutate();
}
```

- [ ] **Step 4: Subscribe to browser lifecycle events with cleanup**

Still in `src/pages/app/tryout-session-page.tsx`, add:

```ts
useEffect(() => {
  if (!sessionAttempt || sessionAttempt.status !== "in_progress") {
    return;
  }

  function handlePageHide() {
    requestPause();
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      requestPause();
    }
  }

  window.addEventListener("pagehide", handlePageHide);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.removeEventListener("pagehide", handlePageHide);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [sessionAttempt, submitMutation.isPending]);
```

Keep this effect focused on listener subscription only. Do not combine it with timer logic.

- [ ] **Step 5: Re-run the session-page test**

Run:

```bash
npm run test -- --run src/pages/app/tryout-session-page.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/app/tryout-session-page.tsx src/pages/app/tryout-session-page.test.tsx
git commit -m "feat: auto pause live tryout sessions"
```

## Chunk 5: End-To-End Verification

### Task 8: Verify database, contracts, catalog, and session behavior together

**Files:**
- No new files

- [ ] **Step 1: Run migration coverage**

Run:

```bash
npm run test -- --run supabase/migrations/20260508000018_tryout_pause_resume.test.ts
```

Expected: PASS

- [ ] **Step 2: Run API and mapper coverage**

Run:

```bash
npm run test -- --run src/lib/api/tryout-api.test.ts src/lib/mappers/tryout-mappers.test.ts
```

Expected: PASS

- [ ] **Step 3: Run catalog and session coverage**

Run:

```bash
npm run test -- --run src/pages/app/tryout-catalog-page.test.tsx src/pages/app/tryout-session-page.test.tsx
```

Expected: PASS

- [ ] **Step 4: Run adjacent routing coverage**

Run:

```bash
npm run test -- --run src/router/app-router.test.tsx
```

Expected: PASS

- [ ] **Step 5: Reset Supabase and perform a manual smoke-check**

Run:

```bash
npm run supabase:reset
```

Expected: PASS

Manual smoke-check:

- start a new tryout from `/app/tryout`
- answer at least one question
- close or refresh the tab
- reopen the app, log in, and enter `/app/tryout`
- confirm the `Lanjutkan Try Out` panel appears
- continue the same attempt and verify the same answer and same question order remain
- confirm the timer resumes from the remaining value instead of resetting to full duration
- submit the resumed attempt and verify the result page still opens normally

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add tryout pause and resume flow"
```
