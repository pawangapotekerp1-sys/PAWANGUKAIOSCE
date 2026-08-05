# Scheduled Event Leaderboard And Five Attempts Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-event scheduled tryout leaderboard with live/final states and increase the scheduled event attempt budget from 3 to 5 without affecting the normal tryout leaderboard.

**Architecture:** Add a new scheduled-domain migration that introduces a dedicated `get_scheduled_event_leaderboard(...)` RPC and updates all scheduled attempt-limit rules from 3 to 5. Expose the leaderboard through the existing scheduled tryout API and mapper layers, then add a dedicated student page under the scheduled route family so leaderboard UI stays event-scoped and does not leak into the normal `/app/leaderboard` surface.

**Tech Stack:** Supabase Postgres migrations and RPCs, React 19, React Router 7, TanStack Query 5, Vitest, existing scheduled tryout API/mapper/page patterns.

---

## File Structure

### Existing files to modify

- `supabase/migrations/20260516000031_scheduled_tryout_runtime.sql`
  Current scheduled runtime reference only. Read carefully for rule parity, but do not edit this historical migration in the implementation.
- `src/lib/api/scheduled-tryout-api.ts`
  Existing scheduled API layer. This will own the new leaderboard fetch helper and the attempt-limit label updates.
- `src/lib/api/scheduled-tryout-api.test.ts`
  Existing API coverage for scheduled catalog, session, result, and editor behavior. Extend it for 5-attempt math and leaderboard RPC mapping.
- `src/lib/mappers/scheduled-tryout-mappers.ts`
  Existing scheduled view-model layer. Update hardcoded “3 attempt” copy and add a mapper for leaderboard rows/page state.
- `src/lib/mappers/scheduled-tryout-mappers.test.ts`
  Existing mapper coverage. Extend it for 5-attempt labels and leaderboard tie presentation.
- `src/pages/app/scheduled-tryout-catalog-page.tsx`
  Existing student catalog page. Update attempt exhaustion copy and add entry-point links to the event leaderboard.
- `src/pages/app/scheduled-tryout-catalog-page.test.tsx`
  Existing catalog page tests. Update assertions that mention 3 attempts and add leaderboard-link expectations.
- `src/pages/app/scheduled-tryout-result-page.tsx`
  Existing scheduled result page. Add a link into the scheduled leaderboard for the same event so students can inspect standings after submit.
- `src/router/app-router.tsx`
  Add the dedicated scheduled leaderboard route.
- `src/router/app-router.test.tsx`
  Route coverage for student pages. Extend to assert the scheduled leaderboard route exists and is guarded through the app shell.

### New files to create

- `supabase/migrations/20260616000043_scheduled_event_leaderboard_and_five_attempts.sql`
  New production-safe migration for the 5-attempt limit and scheduled leaderboard RPC.
- `supabase/migrations/20260616000043_scheduled_event_leaderboard_and_five_attempts.test.ts`
  Migration test coverage for the new RPC, role filter, event-cycle isolation, and five-attempt rule.
- `src/pages/app/scheduled-tryout-leaderboard-page.tsx`
  Dedicated student-facing per-event leaderboard page with live/final state messaging.
- `src/pages/app/scheduled-tryout-leaderboard-page.test.tsx`
  UI tests for live/final copy, ranked rows, shared-rank rendering, and empty states.

### Optional references to inspect during implementation

- `docs/superpowers/specs/2026-06-16-scheduled-event-leaderboard-and-five-attempts-design.md`
- `docs/superpowers/specs/2026-05-16-scheduled-tryout-design.md`
- `supabase/migrations/20260507000017_leaderboard_rankings.sql`
- `supabase/migrations/20260507000017_leaderboard_rankings.test.ts`
- `src/pages/app/leaderboard-page.tsx`
- `src/pages/app/leaderboard-page.test.tsx`

---

## Chunk 1: Database Contract And Attempt Limit

### Task 1: Write the failing migration tests for 5-attempt scheduling and event leaderboard rules

**Files:**
- Create: `supabase/migrations/20260616000043_scheduled_event_leaderboard_and_five_attempts.test.ts`
- Reference: `supabase/migrations/20260516000031_scheduled_tryout_runtime.sql`
- Reference: `supabase/migrations/20260507000017_leaderboard_rankings.test.ts`

- [ ] **Step 1: Write the failing migration test file**

```ts
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260616000043_scheduled_event_leaderboard_and_five_attempts.sql",
);

const migrationSql = readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.replace(/\s+/g, " ").trim().toLowerCase();

describe("20260616000043 scheduled event leaderboard and five attempts migration", () => {
  test("raises scheduled attempt cap from 3 to 5 in runtime logic and copy-facing rpc math", () => {
    expect(normalizedSql).toContain("5 attempts");
  });

  test("creates a scheduled event leaderboard rpc scoped by event id and event cycle", () => {
    expect(normalizedSql).toContain("create or replace function public.get_scheduled_event_leaderboard");
    expect(normalizedSql).toContain("target_event_id uuid");
    expect(normalizedSql).toContain("target_event_cycle integer default null");
  });

  test("filters leaderboard participants to pro users and ranks by best score then fewer attempts", () => {
    expect(normalizedSql).toContain("profiles.role = 'pro'");
    expect(normalizedSql).toContain("best_score");
    expect(normalizedSql).toContain("best_score_attempt_number");
    expect(normalizedSql).toContain("dense_rank()");
  });
});
```

- [ ] **Step 2: Run the migration test to verify it fails**

Run: `npm test -- supabase/migrations/20260616000043_scheduled_event_leaderboard_and_five_attempts.test.ts`

Expected: FAIL because the new migration file does not exist yet.

- [ ] **Step 3: Expand the failing tests with the concrete SQL contract**

Add targeted assertions for:

```ts
test("derives leaderboard state from event timing", () => {
  expect(normalizedSql).toContain("case");
  expect(normalizedSql).toContain("when timezone('utc', now()) < event.access_end_at");
  expect(normalizedSql).toContain("then 'live'");
  expect(normalizedSql).toContain("else 'final'");
});

test("derives attempt order from submitted_at ascending within event cycle", () => {
  expect(normalizedSql).toContain("row_number() over ( partition by attempt.user_id");
  expect(normalizedSql).toContain("order by attempt.submitted_at asc, attempt.id asc");
});
```

- [ ] **Step 4: Re-run the migration test and confirm the failure is still for missing implementation**

Run: `npm test -- supabase/migrations/20260616000043_scheduled_event_leaderboard_and_five_attempts.test.ts`

Expected: FAIL with missing file or missing SQL content, not with test syntax errors.

- [ ] **Step 5: Commit the failing test scaffold**

```bash
git add supabase/migrations/20260616000043_scheduled_event_leaderboard_and_five_attempts.test.ts
git commit -m "test: define scheduled leaderboard migration contract"
```

### Task 2: Implement the new migration for five attempts and event leaderboard RPC

**Files:**
- Create: `supabase/migrations/20260616000043_scheduled_event_leaderboard_and_five_attempts.sql`
- Test: `supabase/migrations/20260616000043_scheduled_event_leaderboard_and_five_attempts.test.ts`

- [ ] **Step 1: Create the migration header and document the scope**

Start with a focused migration that:

- updates the scheduled start-attempt limit from 3 to 5
- adds a dedicated leaderboard RPC for event leaderboard rows
- does not modify the normal `get_leaderboard` RPC

```sql
create or replace function public.get_scheduled_event_leaderboard(
  target_event_id uuid,
  target_event_cycle integer default null
)
returns table (
  rank bigint,
  event_id uuid,
  event_cycle integer,
  user_id uuid,
  alias text,
  best_score numeric(5,2),
  best_score_attempt_number integer,
  attempt_id uuid,
  submitted_at timestamptz,
  leaderboard_state text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_event_cycle integer;
begin
  -- implementation
end;
$$;
```

- [ ] **Step 2: Update the scheduled attempt-limit rule from 3 to 5**

In the migration, replace the hardcoded runtime cap used by the scheduled start-attempt logic.

Implementation target:

```sql
if submitted_attempt_count >= 5 then
  raise exception 'Batas attempt untuk event try out terjadwal ini sudah habis.'
    using errcode = 'P0001';
end if;
```

Also update any remaining-attempt arithmetic in database-facing scheduled helpers from `3 - submitted_count` to `5 - submitted_count` if such logic is moved into SQL helpers later.

- [ ] **Step 3: Implement the event-cycle resolution logic**

Use the passed cycle when present; otherwise resolve to the current cycle from the event row.

```sql
select current_cycle
into resolved_event_cycle
from public.scheduled_tryout_events
where id = target_event_id;

resolved_event_cycle := coalesce(target_event_cycle, resolved_event_cycle);
```

- [ ] **Step 4: Build the ranked query in narrow stages**

Use CTEs with one clear responsibility each:

```sql
with event_context as (...),
submitted_attempts as (...),
attempt_numbered as (...),
eligible_results as (...),
best_score_per_user as (...),
first_best_score_attempt as (...),
ranked_rows as (...)
select ...
```

Key rules to encode:

- join `scheduled_tryout_attempts`, `scheduled_tryout_attempt_results`, and `profiles`
- restrict rows to `profiles.role = 'pro'`
- restrict rows to one `event_id` and one `event_cycle`
- restrict rows to `attempt.status = 'submitted'`
- derive `attempt_number` using `row_number() over (partition by attempt.user_id order by attempt.submitted_at asc, attempt.id asc)`
- pick the first attempt where the participant reached their best score
- rank by `best_score desc, best_score_attempt_number asc`
- use `dense_rank()` so ties share the same rank
- derive `leaderboard_state` from the event’s access window

- [ ] **Step 5: Grant execution to authenticated users**

```sql
revoke all on function public.get_scheduled_event_leaderboard(uuid, integer) from public;
grant execute on function public.get_scheduled_event_leaderboard(uuid, integer) to authenticated;
grant execute on function public.get_scheduled_event_leaderboard(uuid, integer) to service_role;
```

- [ ] **Step 6: Run the migration test to verify it passes**

Run: `npm test -- supabase/migrations/20260616000043_scheduled_event_leaderboard_and_five_attempts.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the migration**

```bash
git add supabase/migrations/20260616000043_scheduled_event_leaderboard_and_five_attempts.sql supabase/migrations/20260616000043_scheduled_event_leaderboard_and_five_attempts.test.ts
git commit -m "feat: add scheduled event leaderboard rpc"
```

### Task 3: Add targeted API-layer failing tests for five-attempt math and leaderboard fetches

**Files:**
- Modify: `src/lib/api/scheduled-tryout-api.test.ts`
- Modify: `src/lib/mappers/scheduled-tryout-mappers.test.ts`
- Reference: `src/lib/api/scheduled-tryout-api.ts`
- Reference: `src/lib/mappers/scheduled-tryout-mappers.ts`

- [ ] **Step 1: Add a failing API test for 5-attempt remaining-attempt math**

Append a test that proves the catalog now expects 5 total attempts:

```ts
test("lists scheduled catalog entries with remaining attempts out of five", async () => {
  // same setup style as existing catalog test
  expect(result[0]?.remainingAttempts).toBe(3);
});
```

Use submitted attempt count `2` and expect `remainingAttempts = 3`.

- [ ] **Step 2: Add a failing API test for the new leaderboard RPC call**

```ts
test("fetches a scheduled event leaderboard through the dedicated rpc", async () => {
  const rpc = vi.fn().mockResolvedValue({
    data: [
      {
        rank: 1,
        event_id: "event-1",
        event_cycle: 2,
        user_id: "user-1",
        alias: "FarmasiNad",
        best_score: 92,
        best_score_attempt_number: 2,
        attempt_id: "attempt-2",
        submitted_at: "2026-06-16T01:00:00.000Z",
        leaderboard_state: "live",
      },
    ],
    error: null,
  });

  const client = { rpc };

  await getScheduledEventLeaderboard({
    client: client as never,
    eventId: "event-1",
  });

  expect(rpc).toHaveBeenCalledWith("get_scheduled_event_leaderboard", {
    target_event_id: "event-1",
    target_event_cycle: null,
  });
});
```

- [ ] **Step 3: Add a failing mapper test for 5-attempt label copy and shared-rank leaderboard rows**

In `src/lib/mappers/scheduled-tryout-mappers.test.ts`, add:

```ts
test("maps scheduled catalog cards with five-attempt labels", () => {
  expect(cards[0]?.attemptsRemainingLabel).toBe("3 dari 5 attempt tersisa");
});

test("maps scheduled leaderboard rows with live state and shared ranks", () => {
  expect(result.stateLabel).toBe("Leaderboard sementara");
  expect(result.rows[0]?.rank).toBe(1);
  expect(result.rows[1]?.rank).toBe(1);
});
```

- [ ] **Step 4: Run the targeted tests and confirm they fail for missing implementation**

Run: `npm test -- src/lib/api/scheduled-tryout-api.test.ts src/lib/mappers/scheduled-tryout-mappers.test.ts`

Expected: FAIL because 3-attempt copy and leaderboard helpers still reflect the old behavior.

- [ ] **Step 5: Commit the failing API/mapper tests**

```bash
git add src/lib/api/scheduled-tryout-api.test.ts src/lib/mappers/scheduled-tryout-mappers.test.ts
git commit -m "test: define scheduled leaderboard api behavior"
```

### Task 4: Implement API and mapper support for scheduled leaderboard and five-attempt labels

**Files:**
- Modify: `src/lib/api/scheduled-tryout-api.ts`
- Modify: `src/lib/mappers/scheduled-tryout-mappers.ts`
- Test: `src/lib/api/scheduled-tryout-api.test.ts`
- Test: `src/lib/mappers/scheduled-tryout-mappers.test.ts`

- [ ] **Step 1: Introduce a shared attempt-cap constant in the scheduled API or mapper layer**

Use one constant so labels and remaining-attempt math stay in sync:

```ts
const SCHEDULED_MAX_ATTEMPTS_PER_EVENT_CYCLE = 5;
```

Apply it to:

- `remainingAttempts: Math.max(0, SCHEDULED_MAX_ATTEMPTS_PER_EVENT_CYCLE - submittedAttemptCount)`
- any derived exhausted-attempt messaging helpers

- [ ] **Step 2: Add scheduled leaderboard types to the scheduled API module**

Suggested types:

```ts
export type ScheduledEventLeaderboardRow = {
  rank: number;
  eventId: string;
  eventCycle: number;
  userId: string;
  alias: string;
  bestScore: number;
  bestScoreAttemptNumber: number;
  attemptId: string;
  submittedAt: string;
};

export type ScheduledEventLeaderboardState = "live" | "final";
```

- [ ] **Step 3: Add the leaderboard fetch helper**

```ts
export async function getScheduledEventLeaderboard(...) {
  const { data, error } = await client.rpc("get_scheduled_event_leaderboard", {
    target_event_id: eventId,
    target_event_cycle: eventCycle ?? null,
  });
  // map rows
}
```

Keep this inside `scheduled-tryout-api.ts`, not `leaderboard-api.ts`.

- [ ] **Step 4: Add a mapper for leaderboard page/view data**

Add a focused mapper in `scheduled-tryout-mappers.ts` that converts raw leaderboard rows plus event metadata into page-ready UI content.

Suggested output:

```ts
export type ScheduledEventLeaderboardPageData = {
  state: "live" | "final";
  stateLabel: string;
  helperText: string;
  rows: Array<{
    rank: number;
    alias: string;
    bestScore: number;
    bestScoreAttemptNumber: number;
    submittedAt: string;
    attemptId: string;
  }>;
};
```

Map the labels exactly:

- `live` → `Leaderboard sementara`
- `final` → `Leaderboard final`

- [ ] **Step 5: Update the scheduled catalog attempt label copy**

Change:

```ts
attemptsRemainingLabel: `${entry.remainingAttempts} dari 3 attempt tersisa`
```

to:

```ts
attemptsRemainingLabel: `${entry.remainingAttempts} dari 5 attempt tersisa`
```

- [ ] **Step 6: Run the targeted API and mapper tests**

Run: `npm test -- src/lib/api/scheduled-tryout-api.test.ts src/lib/mappers/scheduled-tryout-mappers.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the API and mapper layer**

```bash
git add src/lib/api/scheduled-tryout-api.ts src/lib/api/scheduled-tryout-api.test.ts src/lib/mappers/scheduled-tryout-mappers.ts src/lib/mappers/scheduled-tryout-mappers.test.ts
git commit -m "feat: add scheduled leaderboard api and mapper support"
```

---

## Chunk 2: Student UI, Routing, And Verification

### Task 5: Add failing UI and route tests for the scheduled leaderboard page

**Files:**
- Create: `src/pages/app/scheduled-tryout-leaderboard-page.test.tsx`
- Modify: `src/pages/app/scheduled-tryout-catalog-page.test.tsx`
- Modify: `src/router/app-router.test.tsx`
- Reference: `src/pages/app/leaderboard-page.test.tsx`

- [ ] **Step 1: Write the failing page test for live leaderboard state**

```tsx
test("renders a live scheduled leaderboard for one event", async () => {
  mockGetScheduledEventLeaderboard.mockResolvedValue({
    state: "live",
    stateLabel: "Leaderboard sementara",
    helperText: "Peringkat ini masih bisa berubah sampai event berakhir.",
    rows: [
      {
        rank: 1,
        alias: "FarmasiNad",
        bestScore: 92,
        bestScoreAttemptNumber: 2,
        submittedAt: "2026-06-16T01:00:00.000Z",
        attemptId: "attempt-2",
      },
    ],
  });

  renderScheduledLeaderboardPage("/app/scheduled-tryout/leaderboard?event=event-1");

  expect(await screen.findByRole("heading", { name: /leaderboard event/i })).toBeInTheDocument();
  expect(screen.getByText(/leaderboard sementara/i)).toBeInTheDocument();
  expect(screen.getByText(/dicapai pada attempt 2/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Add a failing page test for shared-rank rendering**

```tsx
test("renders shared ranks when score and best-score attempt number tie", async () => {
  // rows[0].rank = 1 and rows[1].rank = 1
  expect(await screen.findAllByText(/^1$/)).not.toHaveLength(0);
});
```

- [ ] **Step 3: Add a failing catalog-page test for the new attempt copy and leaderboard link**

Add assertions like:

```tsx
expect(screen.getByText("2 dari 5 attempt tersisa")).toBeInTheDocument();
expect(screen.getByRole("link", { name: /lihat leaderboard event/i })).toHaveAttribute(
  "href",
  "/app/scheduled-tryout/leaderboard?event=event-1",
);
```

- [ ] **Step 4: Add a failing router test for the new scheduled leaderboard route**

Add a route-level assertion:

```tsx
test("renders the scheduled event leaderboard route for pro users", async () => {
  renderApp("/app/scheduled-tryout/leaderboard?event=event-1");
  expect(await screen.findByRole("heading", { name: /leaderboard event/i })).toBeInTheDocument();
});
```

- [ ] **Step 5: Run the UI and router tests to verify they fail**

Run: `npm test -- src/pages/app/scheduled-tryout-leaderboard-page.test.tsx src/pages/app/scheduled-tryout-catalog-page.test.tsx src/router/app-router.test.tsx`

Expected: FAIL because the page, route, and new links do not exist yet.

- [ ] **Step 6: Commit the failing UI tests**

```bash
git add src/pages/app/scheduled-tryout-leaderboard-page.test.tsx src/pages/app/scheduled-tryout-catalog-page.test.tsx src/router/app-router.test.tsx
git commit -m "test: define scheduled leaderboard page behavior"
```

### Task 6: Implement the scheduled leaderboard page and route wiring

**Files:**
- Create: `src/pages/app/scheduled-tryout-leaderboard-page.tsx`
- Modify: `src/pages/app/scheduled-tryout-catalog-page.tsx`
- Modify: `src/pages/app/scheduled-tryout-result-page.tsx`
- Modify: `src/router/app-router.tsx`
- Test: `src/pages/app/scheduled-tryout-leaderboard-page.test.tsx`
- Test: `src/pages/app/scheduled-tryout-catalog-page.test.tsx`
- Test: `src/router/app-router.test.tsx`

- [ ] **Step 1: Add the new lazy route import and route entry**

In `src/router/app-router.tsx`, add:

```tsx
const ScheduledTryoutLeaderboardPage = lazy(() => import("../pages/app/scheduled-tryout-leaderboard-page"));
```

and:

```tsx
<Route path="scheduled-tryout/leaderboard" element={<ScheduledTryoutLeaderboardPage />} />
```

- [ ] **Step 2: Build the scheduled leaderboard page with existing shell patterns**

Use the same app-shell/page conventions as the other scheduled pages:

```tsx
function ScheduledTryoutLeaderboardPage() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("event");
  const leaderboardQuery = useQuery(...);
  // loading, error, empty, ready
}
```

Include:

- heading and short event-scoped explanation
- live/final badge
- helper text from mapped state
- ranked rows with alias, score, and attempt-used detail

- [ ] **Step 3: Add leaderboard entry points from the catalog page**

In each catalog card, add a secondary link:

```tsx
<Link to={`/app/scheduled-tryout/leaderboard?event=${item.id}`}>
  Lihat leaderboard event
</Link>
```

Keep the CTA hierarchy clear:

- primary action: start or resume event
- secondary action: view leaderboard

- [ ] **Step 4: Add leaderboard entry point from the result page**

In `scheduled-tryout-result-page.tsx`, add a link so a participant can inspect event standings after submitting:

```tsx
<Link to={`/app/scheduled-tryout/leaderboard?event=${eventId}`}>
  Buka leaderboard event
</Link>
```

If result-page data does not currently expose `eventId`, extend the scheduled result API/model minimally to include it.

- [ ] **Step 5: Run the targeted UI and route tests**

Run: `npm test -- src/pages/app/scheduled-tryout-leaderboard-page.test.tsx src/pages/app/scheduled-tryout-catalog-page.test.tsx src/router/app-router.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the page and route integration**

```bash
git add src/pages/app/scheduled-tryout-leaderboard-page.tsx src/pages/app/scheduled-tryout-leaderboard-page.test.tsx src/pages/app/scheduled-tryout-catalog-page.tsx src/pages/app/scheduled-tryout-catalog-page.test.tsx src/pages/app/scheduled-tryout-result-page.tsx src/router/app-router.tsx src/router/app-router.test.tsx
git commit -m "feat: add scheduled event leaderboard page"
```

### Task 7: Run focused verification and regression checks

**Files:**
- Verify only; no new files

- [ ] **Step 1: Run migration and scheduled API test coverage**

Run:

```bash
npm test -- supabase/migrations/20260616000043_scheduled_event_leaderboard_and_five_attempts.test.ts src/lib/api/scheduled-tryout-api.test.ts src/lib/mappers/scheduled-tryout-mappers.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run scheduled page and routing coverage**

Run:

```bash
npm test -- src/pages/app/scheduled-tryout-catalog-page.test.tsx src/pages/app/scheduled-tryout-leaderboard-page.test.tsx src/pages/app/scheduled-tryout-result-page.test.tsx src/router/app-router.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run one broader integration slice for shared scheduled tryout behavior**

Run:

```bash
npm test -- src/lib/api/scheduled-tryout-api.test.ts src/lib/mappers/scheduled-tryout-mappers.test.ts src/pages/app/scheduled-tryout-catalog-page.test.tsx src/pages/app/scheduled-tryout-session-page.test.tsx src/pages/app/scheduled-tryout-result-page.test.tsx src/pages/app/review-page.test.tsx
```

Expected: PASS, confirming the attempt-limit change did not regress the main scheduled flow or shared review surface.

- [ ] **Step 4: Commit the verification pass**

```bash
git add .
git commit -m "test: verify scheduled leaderboard and five-attempt flow"
```

---

## Notes For Execution

- Do not edit old historical migrations to “fix” this feature. Create the new migration file and let it override behavior safely for existing environments.
- Keep the normal tryout leaderboard isolated. All new leaderboard logic belongs in the scheduled domain only.
- Prefer one shared scheduled attempt-cap constant in TypeScript to avoid drifting UI text.
- If the result page needs `eventId` to link to the leaderboard, extend that data shape minimally rather than introducing a second fetch path inside the page.
- Preserve existing user changes in unrelated files such as `.gitignore`, `supabase/.temp/cli-latest`, and unrelated docs.

Plan complete and saved to `docs/superpowers/plans/2026-06-16-scheduled-event-leaderboard-and-five-attempts-implementation.md`. Ready to execute?
