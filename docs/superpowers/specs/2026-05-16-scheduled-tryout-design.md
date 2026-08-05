# Scheduled Tryout Design

Date: 2026-05-16
Status: Draft for user review

## 1. Summary

This design adds a new `try out terjadwal` product lane that is separate from the current tryout catalog, but still reuses the same live exam interaction model and the same combined review surface.

The new behavior is:

1. pro and mentor users get a new student-facing sidebar entry for `Try Out Terjadwal`
2. student users only see scheduled events whose access window is active at the current `tanggal + jam`
3. mentor and admin users get a separate admin-style operations surface for creating, editing, deleting, and re-activating scheduled events
4. each scheduled event owns its own question set and does not reuse the normal tryout bank
5. each user may submit at most 3 attempts per event cycle
6. when an expired event is re-activated, its attempt limit resets and its old attempts, results, and review visibility are cleared
7. a user who started before the deadline may continue and resume that scheduled attempt after the access window closes
8. live edits to an active event apply to existing scheduled attempts immediately, except questions already opened or answered remain preserved if that question is removed from the event
9. scheduled tryout results appear in the shared `Review` flow, but do not participate in `Analisis`

This feature should be implemented as a separate domain, not as another flag inside the current `exam_templates` runtime.

## 2. Goals

### Primary Goals

- add a new scheduled tryout lane that is clearly separated from the existing tryout catalog and runtime
- let mentor and admin users manage multiple scheduled events with `tanggal + jam` access windows
- keep the live exam UI familiar by matching answer selection, `ragu-ragu`, timer, and submit behavior to the current tryout session
- enforce a strict `3 attempts per user per event cycle` rule
- make event re-activation behave like a fresh cycle with cleared student history
- preserve the existing combined `Review` experience while excluding scheduled events from analytics

### Non-Goals

- replacing or redesigning the current `try out` catalog, runtime, or analytics model
- merging scheduled event questions into the existing `question bank`
- introducing scheduled tryout data into the current diagnosis and analytics pipeline
- building cohort assignment, invitations, enrollment lists, or per-event participant whitelists
- creating a generic reusable event-template library shared across multiple scheduled events

## 3. Scope

### In Scope

- new student-facing route family for scheduled tryouts
- new mentor/admin operations route family with an admin-style shell
- scheduled event CRUD with `tanggal + jam` access windows
- event-owned question authoring with the same UI shape as the current bank-soal editor
- max 3 attempts per user per event cycle
- re-activation flow for expired events that resets attempts and clears old review data
- scheduled session runtime with live sync against active event edits
- shared review history integration
- migration, API, page, and end-to-end coverage for the scheduled lane

### Out of Scope

- changing the current `tryout-api` contract for normal tryouts beyond the shared review surface
- adding scheduled tryout data to the current leaderboard
- supporting offline exam delivery
- adding a second operations shell inside `/admin` only and excluding mentors from that surface
- adding manual grading, essay questions, or non-multiple-choice formats

## 4. Product Decisions Locked

- `Try Out Terjadwal` is a separate feature from the current `Try out`
- the student-facing scheduled lane is available to `pro` and `mentor`
- mentor and admin users get a separate admin-style operations area for scheduled tryouts
- student catalogs may show more than one active scheduled event at a time
- only active scheduled events appear in the student catalog
- each scheduled event owns its own question set directly
- a scheduled event re-activation resets the `3 attempts` limit from zero
- re-activation also clears the old attempt history so it no longer appears in `Review`
- users who started before the deadline may continue and resume after the event window closes
- scheduled attempts should appear in `Review` only, not `Analisis`
- event duration is always `jumlah soal x 60 detik`
- mentor and admin users may edit active events and may delete events
- when an active event changes, existing participants should follow the latest event version
- if a question has already been opened or answered in an attempt, removing that question from the event must not remove it from that existing attempt
- a user may have one active normal tryout and one active scheduled tryout at the same time
- mentor and admin users set access windows using `tanggal + jam`, not date-only values

## 5. Current State

### 5.1 Routing and shells

The current app already separates student and admin route families in [app-router.tsx](</E:/Projek TRY OYT/src/router/app-router.tsx:1>):

- `/app/*` for student-style surfaces
- `/admin/*` for admin-only surfaces

Student and mentor navigation items come from [student-dashboard.ts](</E:/Projek TRY OYT/src/mocks/student-dashboard.ts:1>), while admin navigation items come from [admin-content.ts](</E:/Projek TRY OYT/src/mocks/admin-content.ts:1>).

### 5.2 Current tryout runtime

The existing tryout lane is built around:

- `exam_templates`
- `attempts`
- `answers`
- `attempt_results`

The frontend contract lives in [tryout-api.ts](</E:/Projek TRY OYT/src/lib/api/tryout-api.ts:1>) and [tryout-mappers.ts](</E:/Projek TRY OYT/src/lib/mappers/tryout-mappers.ts:1>).

That runtime is built for:

- one catalog source
- one attempt lane
- one active or paused attempt at a time for the user
- no event-cycle reset behavior

Those assumptions do not fit the scheduled feature.

### 5.3 Current question authoring surface

The current question creation and editing UI already exists in [question-editor-page.tsx](</E:/Projek TRY OYT/src/pages/admin/question-editor-page.tsx:1>) and the listing surface in [questions-page.tsx](</E:/Projek TRY OYT/src/pages/admin/questions-page.tsx:1>).

This is useful because the scheduled event question editor should visually match this UI, but the persistence must remain isolated from the normal bank-soal tables and APIs.

### 5.4 Documentation context checked

Two external patterns were verified through Context7 before locking this design:

- React Router 7 nested route organization with `Route` and `Outlet` is appropriate for adding another route family with shared shell behavior
- Supabase row-level security patterns using `auth.uid()` and controlled `security definer` functions are appropriate for enforcing event windows, attempt ownership, and operations access inside database RPCs

## 6. Design Decision

### 6.1 Recommended approach

Use a **separate scheduled-tryout domain** with shared UI patterns:

- scheduled student routes live under `/app/scheduled-tryout/*`
- mentor/admin operations routes live under a new `/scheduled-ops/*` namespace
- scheduled events, questions, attempts, and results use new tables and new APIs
- the live session and review UI reuse the existing tryout interaction patterns, but not the same persistence model

This approach is preferred because it isolates the business rules that differ from the current tryout lane:

- scheduled access windows
- 3 attempts per cycle
- cycle reset on re-activation
- concurrent normal + scheduled attempts
- live event editing during active attempts
- special preservation rules when a removed question has already been opened

### 6.2 Alternatives considered

#### A. Extend the existing tryout runtime with a `scheduled` flag

Kelebihan:

- high UI reuse
- smaller initial route diff

Kekurangan:

- pushes conflicting business rules into the current runtime
- raises regression risk for the normal tryout lane
- makes active-attempt rules and analytics branching harder to reason about

This approach is rejected.

#### B. Separate event tables, but reuse the existing `attempts` table

Kelebihan:

- partial review integration feels simpler

Kekurangan:

- hybrid persistence still mixes incompatible lifecycle rules
- cycle reset and live-sync rules become ambiguous
- ownership and query semantics are harder to keep clean

This approach is rejected.

#### C. Separate domain with shared session/review patterns

Kelebihan:

- strongest isolation
- clearest modeling of event cycles
- easiest path to protect the current tryout lane from regressions

Kekurangan:

- more initial schema and API work

This is the recommended approach.

## 7. Experience Design

### 7.1 Student catalog

Add a new student-facing route:

- `/app/scheduled-tryout`

Add a new sidebar entry for eligible student surfaces:

- `Try Out Terjadwal`

The catalog should:

- show only events whose access window is active at the current time
- show more than one active event if multiple are live
- show title, access window in WIB, question count, duration, and remaining attempts
- show a top priority resume panel when the user already has an active or paused scheduled attempt

The student catalog should not show:

- expired events
- draft events
- future events whose start time has not been reached yet

### 7.2 Session and result routes

Add:

- `/app/scheduled-tryout/session?attempt=...`
- `/app/scheduled-tryout/result?attempt=...`

The session UI should reuse the same interaction model as the current tryout session:

- answer selection
- `ragu-ragu`
- numbered question navigation
- live timer
- submit flow

The only conceptual difference is the runtime source and the event-specific sync behavior.

### 7.3 Mentor and admin operations surface

Add a new mentor/admin route family:

- `/scheduled-ops`
- `/scheduled-ops/events`
- `/scheduled-ops/events/new`
- `/scheduled-ops/events/:eventId/edit`

This surface should look and behave like an admin-style area, not like another page inside the student `/app` shell.

Recommended operations shell nav:

- `Daftar Event`
- `Buat Event`

Optional later additions may include:

- `Draft`
- `Expired`
- `Riwayat Aktivasi`

But the first version can keep those as filters on the event list instead of separate routes.

### 7.4 Event editor

The event editor should include:

- title
- short description
- access start `tanggal + jam`
- access end `tanggal + jam`
- event question list
- computed duration summary from `jumlah soal x 1 menit`

Question authoring should visually follow the current bank-soal editor:

- stem
- A-E options
- correct answer
- block and topic tagging if still needed for review labeling and future reporting
- explanation text
- question image
- explanation image

But all reads and writes must target scheduled-event-owned data only.

## 8. Route And Access Design

### 8.1 Student route access

Student scheduled routes should be allowed for:

- `pro`
- `mentor`
- `admin` only if the current router behavior still redirects admins away from student routes by design

The current admin redirect behavior in [route-guards.tsx](</E:/Projek TRY OYT/src/router/route-guards.tsx:1>) should remain unchanged unless the implementation explicitly wants admins to test student screens through the student shell.

### 8.2 Operations route access

Create a new route guard for the scheduled operations surface.

Allowed roles:

- `mentor`
- `admin`

Disallowed roles:

- `pro`
- `pendaftar_baru`

This guard should not depend on active subscription state for mentor/admin operations access.

### 8.3 Shell ownership

Recommended shell split:

- student scheduled catalog and session pages use `ProductShell`
- scheduled operations pages use a dedicated admin-style shell, preferably reusing the same visual language as [admin-shell.tsx](</E:/Projek TRY OYT/src/components/layout/admin-shell.tsx:1>) without forcing the route family under `/admin`

## 9. Data Model Direction

### 9.1 Event root

Create a new root table for scheduled events, for example `scheduled_tryout_events`.

Recommended shape:

- `id`
- `title`
- `description`
- `editorial_status`
- `access_start_at`
- `access_end_at`
- `current_cycle`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

Recommended `editorial_status` values:

- `draft`
- `published`

Operational labels shown in the UI should be derived from `editorial_status` and time:

- `Draft`
- `Upcoming`
- `Active`
- `Expired`

This avoids storing an `active` flag that can drift out of sync with timestamps.

### 9.2 Event questions

Create a dedicated table for event-owned questions, for example `scheduled_tryout_event_questions`.

Recommended shape:

- `id`
- `event_id`
- `question_order`
- `stem`
- `question_image_path`
- `block_id`
- `topic_id`
- `correct_option_key`
- `explanation_text`
- `explanation_image_path`
- `created_at`
- `updated_at`

Recommended related options table:

- `scheduled_tryout_event_question_options`

This keeps the shape close to the current question model and allows the same editor UI patterns to be reused cleanly.

### 9.3 Attempt root

Create a dedicated attempt table, for example `scheduled_tryout_attempts`.

Recommended shape:

- `id`
- `event_id`
- `event_cycle`
- `user_id`
- `status`
- `started_at`
- `submitted_at`
- `time_limit_seconds`
- `elapsed_seconds`
- `last_resumed_at`
- `paused_at`
- `total_questions`
- `created_at`
- `updated_at`

Recommended `status` values:

- `in_progress`
- `paused`
- `submitted`
- `abandoned`

### 9.4 Attempt items

Create `scheduled_tryout_attempt_items` as the runtime snapshot of event questions that are attached to one attempt.

Recommended shape:

- `id`
- `attempt_id`
- `event_question_id`
- `sort_order`
- `opened_at`
- `question_snapshot`
- `options_snapshot`
- `correct_option_key_snapshot`
- `block_id_snapshot`
- `topic_id_snapshot`
- `question_image_path_snapshot`
- `explanation_text_snapshot`
- `explanation_image_path_snapshot`
- `created_at`
- `updated_at`

`opened_at` is important for the locked product rule:

- if an event question is removed from the event, but the corresponding attempt item has already been opened or answered, that attempt item must remain in the attempt
- if the attempt item has not yet been opened and the event question is removed, that attempt item may be removed during sync

### 9.5 Answers and results

Create:

- `scheduled_tryout_answers`
- `scheduled_tryout_attempt_results`

These should mirror the current tryout runtime enough to support:

- session rendering
- result rendering
- shared review history

## 10. Event Cycle And Reactivation Rules

### 10.1 Cycle semantics

Each scheduled event owns a `current_cycle`.

Rules:

- first publish starts at `current_cycle = 1`
- each re-activation after expiry increments `current_cycle`
- attempt limits are counted against `(event_id, current_cycle, user_id)`

### 10.2 Reactivation behavior

When an expired event is re-activated:

1. validate that the previous active window has already ended
2. increment `current_cycle`
3. save the new `access_start_at` and `access_end_at`
4. clear prior attempts, results, and review visibility for the previous cycle
5. keep the event row and question set editable for the new cycle

Because the product decision is locked to removing old history from `Review`, the old cycle should not remain queryable by the normal shared review surface.

### 10.3 Delete behavior

Deleting an event should be destructive.

Recommended behavior:

- remove the event from mentor/admin lists immediately
- remove it from the student catalog immediately
- remove or hard-clean related attempts, answers, and results
- prevent resume on refresh if the event was deleted while a student had the session open

## 11. Backend Runtime Direction

### 11.1 Start attempt

The scheduled runtime should expose a dedicated RPC such as `start_scheduled_tryout_attempt`.

Behavior:

- validate that the current authenticated user is eligible for the student lane
- validate that the event is `published`
- validate that the current time is within the access window
- validate that the user has fewer than 3 submitted attempts for `(event_id, current_cycle)`
- allow creation even if the same user already has an active normal tryout in the separate normal lane
- deny creation if the user already has an active or paused scheduled attempt for the same event cycle
- create attempt root and initial attempt items from the current event questions
- initialize `time_limit_seconds = total_questions x 60`

### 11.2 Resume attempt

Resume should be allowed when:

- the attempt belongs to the authenticated user
- the attempt status is `paused`
- the event still exists

Resume should **not** be blocked merely because the event window has ended, as long as the attempt was started before the deadline.

### 11.3 Sync before session render

Every session entry and every meaningful persistence action should run a scheduled attempt sync step first.

Recommended sync behavior:

1. load the event, attempt, event questions, attempt items, and existing answers
2. for each current event question:
   - if no attempt item exists yet, create one
   - if an attempt item exists, refresh its snapshots to the latest event-question content
3. for each attempt item whose source event question no longer exists:
   - keep it if it has `opened_at` or any saved answer
   - remove it if it has never been opened and has no saved answer
4. recompute contiguous sort order
5. recompute `total_questions`
6. recompute `time_limit_seconds = total_questions x 60`

This gives the locked product behavior:

- existing participants follow the latest event version
- newly added questions enter running attempts
- removed unseen questions disappear
- removed seen or answered questions remain
- timer changes with question-count changes

### 11.4 Open-question tracking

The first time a question becomes the active question in the session UI, persist `opened_at` if it is still null.

This tracking is required so the backend can distinguish:

- a question that was never really seen
- a question the student already entered

### 11.5 Save answer

Scheduled save-answer behavior should match the current normal tryout lane:

- save `selected_option_key`
- save `is_doubtful`
- accumulate `time_spent_delta_seconds`

But it should operate only against scheduled runtime tables and should run the same sync step first.

### 11.6 Submit attempt

Submission should:

- compute score from the latest live set of attempt items that still belong to the attempt after sync
- compute `time_used_seconds` using the same pause-aware semantics as the normal tryout runtime
- store scheduled results in dedicated scheduled result tables

### 11.7 Access control and database protection

Based on the Supabase documentation patterns checked through Context7:

- table-level RLS should restrict student data by `(select auth.uid()) = user_id`
- mentor/admin operations tables should be protected by role-aware policies or privileged RPCs
- student start/save/submit/resume actions should go through controlled RPCs that validate:
  - ownership
  - active window rules
  - cycle rules
  - attempt count rules
- complex access logic may be wrapped in `security definer` database functions when that reduces duplicated policy logic or performance penalties

## 12. Frontend API And UI Direction

### 12.1 New API surface

Add a dedicated frontend API module, for example:

- `scheduled-tryout-api.ts`

Recommended responsibilities:

- list active scheduled catalog events for students
- list operations events for mentor/admin
- create, update, delete, and reactivate events
- create, update, and delete event questions
- start, resume, save, pause, and submit scheduled attempts
- load session, result, and review-facing scheduled history data

### 12.2 New mapper surface

Add scheduled mappers that parallel the current tryout shape so page reuse is straightforward.

Recommended outputs:

- student catalog cards
- session page data
- result page data
- review history items

### 12.3 Session UI reuse

The scheduled session page should reuse as much current UI composition as possible from the current tryout session page in [tryout-session-page.tsx](</E:/Projek TRY OYT/src/pages/app/tryout-session-page.tsx:1>).

The main adaptation points are:

- query keys
- route paths
- event title and metadata
- scheduled sync notifications

### 12.4 Question editor reuse

The scheduled event question editor should visually match [question-editor-page.tsx](</E:/Projek TRY OYT/src/pages/admin/question-editor-page.tsx:1>), but must not call the normal bank-soal APIs in [question-authoring-api.ts](</E:/Projek TRY OYT/src/lib/api/question-authoring-api.ts:1>).

The editor may:

- share form structure
- share media-upload UI
- share validation rules

But should use isolated scheduled-event persistence helpers.

## 13. Review Integration

The existing `Review` lane should remain the single student review surface.

Required behavior:

- normal tryout results remain visible
- scheduled tryout results are added into the same list
- scheduled entries should carry a source label such as `Terjadwal`
- old scheduled results from an expired cycle that was later re-activated should no longer appear

Recommended implementation direction:

- extend the history-query layer to union normal and scheduled submitted attempts into one review timeline
- keep result and detail fetches source-aware so each row can resolve to the correct runtime tables

Scheduled tryout data must not feed:

- diagnosis
- analytics summaries
- leaderboard

## 14. Error Handling And Edge Cases

### Student-facing cases

- event not started yet
  - hide from the student catalog entirely
- event expired and no prior attempt exists
  - hide from the catalog
- max 3 attempts already reached
  - show disabled state only if the event is otherwise active and visible
- event deleted while session is open
  - show a clear error state and stop further saves
- event edited while session is open
  - session should continue after sync and may show a lightweight notice that the event changed

### Operations-facing cases

- invalid date range where end is before start
  - block save with inline validation
- re-activate before the previous window actually ended
  - block re-activation
- delete event with active participants
  - require explicit destructive confirmation

## 15. Testing Strategy

### Migration and database tests

- event root tables and event-question tables exist with expected columns
- start-attempt RPC enforces the access window
- start-attempt RPC enforces max 3 attempts per cycle
- resume after deadline remains allowed
- re-activation increments cycle and resets attempt availability
- delete cleans attempts, answers, and results
- sync keeps opened or answered removed questions
- sync removes unseen removed questions
- sync recalculates `time_limit_seconds` after question-count changes

### Frontend API tests

- list active student catalog events
- list mentor/admin operation events including upcoming and expired labels
- create, edit, delete, and reactivate event flows
- session loading maps scheduled data correctly
- review history includes scheduled results with source metadata

### Page tests

- student sidebar contains `Try Out Terjadwal`
- scheduled catalog shows only active events
- scheduled resume panel appears when a paused scheduled attempt exists
- operations routes are blocked for `pro`
- event editor question UI matches the existing authoring behavior
- review page renders mixed normal and scheduled rows safely

### End-to-end coverage

- mentor creates a scheduled event
- pro starts the event
- mentor edits the active event
- student session reflects the updated event
- event expires and new starts stop
- the previously started paused attempt still resumes
- mentor re-activates the event and the student gets a fresh attempt budget

## 16. Implementation Notes

### Suggested sequencing

1. add scheduled schema and RPC foundations
2. add scheduled API and mapper layers
3. add student catalog, session, and result pages
4. add mentor/admin operations routes and event editor
5. integrate combined review history
6. add verification coverage

### Risks to watch

- accidentally coupling scheduled and normal tryout attempt rules
- making review aggregation source-ambiguous
- allowing event edits to corrupt running attempts if sync ordering is incomplete
- forgetting that re-activation must clear old review visibility, not only reset attempt counts

## 17. Approval Gate

This spec is ready for user review. After the user approves it, the next step should be a dedicated implementation plan written from this design inside the isolated worktree.
