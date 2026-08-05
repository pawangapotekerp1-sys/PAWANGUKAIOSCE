# Scheduled Event Leaderboard And Five Attempts Design

Date: 2026-06-16
Status: Draft for user review

## 1. Summary

This design extends the existing `try out terjadwal` lane with two connected product changes:

1. increase the per-event-cycle attempt budget from `3` to `5`
2. add an `overall` leaderboard for each scheduled event

The leaderboard is event-scoped, not global:

- each leaderboard belongs to one `(event_id, event_cycle)`
- each leaderboard is `overall` only
- each leaderboard supports both `live` and `final` states

The ranking rule is intentionally simple:

1. highest `best score` wins
2. if tied, the participant who reached that best score with fewer attempts wins
3. if still tied, participants share the same rank

This keeps the scheduled leaderboard competitive, explainable, and aligned with the event-cycle model that already exists in the scheduled tryout domain.

## 2. Goals

### Primary Goals

- raise scheduled attempt availability from `3` to `5`
- keep the new attempt limit consistent across backend rules, student labels, and event behavior
- add one `overall` leaderboard per scheduled event
- show a `live leaderboard` while an event is active
- show a `final leaderboard` after the event access window ends
- rank participants using best performance while still rewarding efficiency

### Non-Goals

- adding scheduled leaderboard categories per block
- merging scheduled leaderboard data into the existing normal tryout leaderboard
- creating a cross-event leaderboard for scheduled tryouts
- adding analytics, diagnosis, or trend reporting to scheduled leaderboard rows
- introducing a hidden weighting formula, average score model, or attempt penalty math beyond explicit tie-break rules

## 3. Existing Context

The scheduled tryout domain already defines:

- a separate event root in `scheduled_tryout_events`
- a cycle-aware attempt model via `scheduled_tryout_attempts.event_cycle`
- a dedicated results table in `scheduled_tryout_attempt_results`
- a current attempt budget of `3` reflected in product copy and runtime rules

The earlier scheduled tryout design explicitly excluded scheduled data from the existing leaderboard. This design adds a dedicated scheduled leaderboard without changing the normal tryout leaderboard contract.

## 4. Product Decisions Locked

- the maximum number of scheduled attempts per user per event cycle changes from `3` to `5`
- leaderboard scope is one `(event_id, event_cycle)` only
- leaderboard is `overall` only
- leaderboard participants are restricted to `profiles.role = 'pro'`
- mentor users may still access the scheduled lane for operations or testing, but their attempts do not appear in leaderboard results
- only `submitted` scheduled attempts count toward leaderboard ranking
- leaderboard uses `best score`, not latest score and not average score
- tie-break 1 is fewer attempts needed to reach that best score
- tie-break 2 is `shared rank`
- leaderboard is visible in `live` form while the event is active
- leaderboard automatically becomes `final` after the access window ends
- leaderboard may show all ranked participants for the event cycle, not only a top-10 subset
- reactivating an event creates a fresh leaderboard context because `current_cycle` changes and old scheduled history is cleared

## 5. Why This Ranking Rule

Three candidate models were considered:

1. best score only
2. last submitted score only
3. best score, then fewer attempts wins

The recommended and approved model is `3`.

This is preferred because it balances two goals cleanly:

- reward the strongest achieved performance
- still distinguish students who reached that performance more efficiently

It avoids the downsides of the alternatives:

- `best score only` makes all extra retries effectively free except for more opportunities
- `last submitted score only` can feel unfair because a participant may legitimately perform best earlier and then worsen later

The approved rule is still easy to explain in UI copy:

> Leaderboard memakai skor terbaikmu pada event ini. Jika skornya sama, peserta yang mencapainya dengan attempt lebih sedikit akan berada di atas. Jika masih sama, peringkat dibagikan.

## 6. Attempt Budget Change

### 6.1 Runtime rule

Every place that currently enforces or displays the scheduled attempt budget must move from `3` to `5`.

This includes:

- start-attempt eligibility checks
- remaining-attempt calculations
- catalog card labels
- locked-state messaging when a user has exhausted attempts
- any mentor/admin operational copy that refers to the attempt cap

### 6.2 Event-cycle behavior

The attempt budget continues to be counted against:

- `event_id`
- `current_cycle`
- `user_id`

Reactivation behavior remains unchanged in principle:

- the event increments `current_cycle`
- old attempts and results are cleared as already designed
- the participant receives a fresh `5-attempt` budget for the new cycle

## 7. Leaderboard Scope And States

### 7.1 Scope

Each leaderboard belongs to exactly one event cycle:

- `event_id`
- `event_cycle`

This prevents old cycles from polluting current event competition and matches the existing scheduled event reset model.

### 7.2 Live leaderboard

While the event is active:

- ranking updates as new submitted attempts arrive
- the UI must clearly label this as a temporary or live leaderboard
- participants should understand that rankings may still move before event close

Recommended student-facing label:

- `Leaderboard sementara`

Recommended helper copy:

- `Peringkat ini masih bisa berubah sampai event berakhir.`

### 7.3 Final leaderboard

After `access_end_at` has passed:

- the same event leaderboard becomes final
- no new attempt starts are allowed
- ranking stops changing because no new submitted attempts should appear

Recommended label:

- `Leaderboard final`

Recommended helper copy:

- `Peringkat ini sudah dikunci setelah window event berakhir.`

## 8. Ranking Rules

### 8.1 Eligible attempts

Only attempts that satisfy all of the following may participate:

- belong to a user whose `profiles.role = 'pro'`
- belong to the target `event_id`
- belong to the target `event_cycle`
- have `status = 'submitted'`
- have a corresponding row in `scheduled_tryout_attempt_results`

### 8.2 Per-user candidate selection

For each participant, the system should evaluate all submitted attempts within the event cycle and identify the participant's `best score`.

If the same participant reached that same best score multiple times, the system should prefer the earliest successful score-achievement in terms of attempt count, because tie-break 1 depends on how many attempts were needed to reach that best score.

Recommended derived values per participant:

- `best_score`
- `best_score_attempt_number`
- `best_score_attempt_id`
- `best_score_submitted_at`

`best_score_attempt_number` means:

- attempt ke-1 if the participant already achieved that score on the first submission
- attempt ke-2 if the first time they achieved that score was on the second submission
- and so on up to attempt ke-5

### 8.3 Event ranking order

Leaderboard rows should be ordered by:

1. `best_score desc`
2. `best_score_attempt_number asc`

If both are still equal, rows share the same `rank`.

The ordering used to render tied rows consistently may still use a stable internal sort such as:

1. `best_score desc`
2. `best_score_attempt_number asc`
3. `best_score_submitted_at asc`
4. `user_id asc`

But those later fields are for deterministic rendering only and must not change the displayed shared rank.

### 8.4 Shared rank semantics

If two or more participants have:

- the same `best_score`
- the same `best_score_attempt_number`

they share the same displayed rank number.

Example:

- User A: best score `88`, reached on attempt `2`
- User B: best score `88`, reached on attempt `2`

Result:

- both display rank `1` if that is the top score band

## 9. UX Direction

### 9.1 Student surfaces

The scheduled leaderboard should be presented as part of the scheduled event experience, not merged into the normal `/app/leaderboard` page.

Recommended placement:

- inside scheduled event detail or scheduled result-oriented surface
- optionally reachable from the scheduled catalog card when the user opens one event

This keeps the scope obvious:

- one event
- one event cycle
- one leaderboard

### 9.2 Row fields

Each leaderboard row should show:

- rank
- alias
- best score
- attempt count used to reach that score
- optional achieved-at timestamp if product wants extra context

Because this leaderboard is already scoped to one event, the recommended first version is to show all ranked participants for that event cycle rather than forcing a top-10 cutoff.

Recommended participant detail copy:

- `Skor terbaik 92`
- `Dicapai pada attempt 2`

### 9.3 Empty states

If no submitted attempts exist yet:

- live leaderboard should show an empty state saying results are not available yet

If the event is final but still has no submissions:

- final leaderboard should show that no final ranking could be formed

## 10. Backend Direction

### 10.1 Attempt-limit updates

All logic that currently assumes `3 attempts` must be centralized or updated to `5`.

Expected areas include:

- the catalog listing RPC that reports remaining attempts
- the start-attempt RPC that blocks creation after the limit is exhausted
- any mapper or page copy that hardcodes `3`

### 10.2 Leaderboard query helper

Add a dedicated scheduled leaderboard SQL helper, preferably an RPC, for example:

- `get_scheduled_event_leaderboard(target_event_id uuid, target_event_cycle integer default null)`

Recommended behavior:

- resolve `target_event_cycle` to the current event cycle when omitted
- return one row per participant for the requested event cycle
- exclude non-`pro` profiles from ranked output
- include enough metadata for both live and final display

Recommended output fields:

- `rank`
- `event_id`
- `event_cycle`
- `user_id`
- `alias`
- `best_score`
- `best_score_attempt_number`
- `attempt_id`
- `submitted_at`
- `leaderboard_state`

`leaderboard_state` should be derived as:

- `live` when the event is currently active
- `final` when the event has expired

### 10.3 Attempt numbering

Because the tie-break depends on how many attempts were needed to reach the best score, the query must derive attempt order within `(event_id, event_cycle, user_id)`.

Recommended derivation:

- sort submitted attempts by `submitted_at asc, id asc`
- assign `row_number()` per user within the event cycle
- use that as the logical attempt number for leaderboard purposes

This avoids storing extra mutable state just for rank calculation.

## 11. Frontend Architecture Direction

### 11.1 API layer

Add scheduled leaderboard fetching to the scheduled tryout API layer, not the normal leaderboard API module.

Recommended responsibility:

- fetch one event leaderboard by event id
- expose whether the result is `live` or `final`

### 11.2 Mapping layer

Add a mapper that converts the RPC rows into a student-facing event leaderboard model.

Recommended output shape:

- event title
- event cycle
- leaderboard state
- ranked rows
- empty-state metadata

### 11.3 Existing UI copy changes

All existing scheduled attempt labels must be updated from `3` to `5`.

Known example from the current mapper:

- `x dari 3 attempt tersisa`

This should become:

- `x dari 5 attempt tersisa`

## 12. Testing Strategy

### 12.1 Database tests

Tests should verify:

- a user can submit up to `5` attempts in one event cycle
- the sixth start is rejected
- leaderboard ignores `in_progress`, `paused`, and `abandoned` attempts
- leaderboard chooses the highest score for each participant
- when best scores tie, the participant who reached it in fewer attempts ranks higher
- when both best score and best-score attempt number tie, participants share the same rank
- leaderboard is isolated to the requested `(event_id, event_cycle)`
- reactivated events do not leak old-cycle leaderboard rows

### 12.2 Frontend tests

Tests should verify:

- scheduled catalog labels show `5` attempts
- live leaderboard copy appears while the event is active
- final leaderboard copy appears after the event ends
- row rendering shows attempt count used to reach the best score
- empty states behave correctly for zero submissions

## 13. Risks And Constraints

- if the attempt limit remains hardcoded in more than one place, the UI and backend may drift out of sync
- if the leaderboard query uses raw submission count instead of the first attempt number that achieved the best score, ties may be broken incorrectly
- if the event-cycle boundary is ignored, reactivated events could show stale ranking rows from earlier cycles
- if live and final states are not labeled clearly, participants may misunderstand temporary positions as locked outcomes

## 14. Approval Gate

This spec is ready for review. After approval, the next step should be an implementation plan that covers:

- updating the attempt limit from `3` to `5`
- adding the scheduled event leaderboard RPC
- wiring the student-facing scheduled leaderboard UI
- adding tests for the new ranking rules
