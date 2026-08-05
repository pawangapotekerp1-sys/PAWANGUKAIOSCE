# Tryout Pause And Resume Design

Date: 2026-05-08
Status: Draft for user review

## 1. Summary

This design adds a true pause-and-resume flow for student tryouts.

The new behavior is:

1. when a user closes the tab, refreshes, or leaves the live tryout, the active attempt is automatically paused
2. paused time does not continue reducing the tryout timer
3. when the user logs in again and opens the tryout feature, the app offers one clear `Lanjutkan Try Out` path
4. resuming uses the same persisted attempt, so the student continues from the same question set and saved answers instead of starting from zero

The product rule is locked to one active or paused attempt per user at a time.

## 2. Goals

### Primary Goals

- stop the tryout timer when the web app is closed or disconnected from the active session
- preserve the same attempt, question snapshot, and saved answers for later continuation
- expose a clear `Lanjutkan Try Out` experience inside the tryout entry flow
- prevent users from accidentally creating a second attempt while one active or paused attempt already exists
- keep scoring and review behavior consistent with the current tryout model

### Non-Goals

- supporting multiple paused tryouts per user
- adding a manual pause button in this iteration
- changing question randomization or attempt snapshot rules
- redesigning the global dashboard or login landing flow
- adding cross-user admin controls for paused attempts

## 3. Scope

### In Scope

- extend tryout runtime data to support `paused` attempts
- persist accumulated active time separately from wall-clock elapsed time
- add backend pause and resume RPCs
- prevent new attempt creation when one active or paused attempt already exists
- add frontend query and mutation support for finding, pausing, and resuming one active attempt
- show a `Lanjutkan Try Out` state in the tryout catalog
- auto-pause the attempt from the session page when the browser leaves the live session
- add tests for migration, API, mapper, and page behavior

### Out of Scope

- manual pause from an in-session CTA
- continuing different tryouts in parallel
- recovering from a full browser crash with guaranteed final unload delivery in every environment
- changing result-page layout or review-page content

## 4. Product Decisions Locked

- each user may have at most one attempt in `in_progress` or `paused` status
- closing the tab or leaving the live tryout pauses automatically without an extra confirmation dialog
- resuming must continue the same attempt and must not rerandomize questions
- saved answers and `ragu-ragu` state remain attached to the same attempt items
- users who still have an active or paused attempt cannot start a new tryout until the existing attempt is resumed and submitted
- the `Lanjutkan Try Out` experience lives in the tryout feature entry flow, not as a separate login-only destination

## 5. Experience Design

### Entry Flow

`/app/tryout` remains the main entry route for student tryouts.

Before rendering the normal catalog as the primary action, the page should check whether the current user already has one active tryout attempt in either:

- `in_progress`
- `paused`

If no such attempt exists, the page behaves exactly like the current catalog.

If an active or paused attempt exists, the page shows a high-priority `Lanjutkan Try Out` panel above the catalog content.

### Lanjutkan Try Out Panel

The panel should present:

- tryout title
- tryout type label such as `Simulasi penuh`, `Try out per blok`, or `Try out per materi`
- progress summary such as `12 dari 30 soal terjawab`
- current remaining time from the backend pause-aware calculation
- one primary CTA: `Lanjutkan Try Out`

Optional secondary text can explain that the previous session was paused automatically when the app was closed.

The catalog may still remain visible below the panel, but the resume action should be visually dominant.

### Session Experience

The session page continues using `/app/tryout/session?attempt=...`.

When a paused attempt is resumed:

- the student sees the same question order
- previously selected answers remain visible
- `ragu-ragu` markers remain visible
- remaining time resumes from the persisted paused state

No new attempt should be created during this flow.

## 6. Data Model Direction

The current timing model is based on `started_at` and direct wall-clock difference. That is not sufficient because paused time should not count.

Recommended attempt runtime additions:

- extend `attempts.status` to include `paused`
- add `elapsed_seconds integer not null default 0`
- add `last_resumed_at timestamptz null`
- add `paused_at timestamptz null`

Recommended semantics:

- `elapsed_seconds`
  - total active time already consumed across earlier running segments
- `last_resumed_at`
  - the timestamp when the current active segment began
  - for a newly created attempt, this is initialized when the attempt starts
- `paused_at`
  - the timestamp of the latest pause action
  - null when the attempt is actively running

This approach is preferred over recomputing everything from `started_at` because:

- it cleanly separates active time from paused time
- it supports multiple pause/resume cycles without ambiguity
- it keeps remaining-time math simple and deterministic

## 7. Backend Runtime Direction

### Start Attempt

`start_attempt_from_template` should refuse to create a new attempt if the current authenticated user already has one attempt with status:

- `in_progress`
- `paused`

It should raise a clear domain error that the student must continue the existing tryout first.

For newly created attempts:

- `status = 'in_progress'`
- `elapsed_seconds = 0`
- `last_resumed_at = now()`
- `paused_at = null`

### Pause Attempt

Add a new RPC such as `pause_attempt(target_attempt_id uuid)`.

Behavior:

- validate authenticated user ownership
- only apply if the target attempt is currently `in_progress`
- compute the active segment duration from `last_resumed_at` to `now()`
- add that duration to `elapsed_seconds`
- set `status = 'paused'`
- set `paused_at = now()`
- set `last_resumed_at = null`

The RPC should be idempotent enough that repeated pause requests do not double-count time once the attempt is already paused.

### Resume Attempt

Add a new RPC such as `resume_attempt(target_attempt_id uuid)`.

Behavior:

- validate authenticated user ownership
- only apply if the target attempt is currently `paused`
- set `status = 'in_progress'`
- set `last_resumed_at = now()`
- keep `elapsed_seconds` unchanged
- clear `paused_at`

### Submit Attempt

`submit_attempt` must stop deriving `time_used_seconds` from `submitted_at - started_at`.

Instead it should compute:

- `time_used_seconds = elapsed_seconds + active_segment_seconds`

Where:

- `active_segment_seconds` is the current running segment from `last_resumed_at` to submit time when status is still `in_progress`
- `active_segment_seconds = 0` if the attempt is already paused before a submit transition

The final stored result should still be capped at `time_limit_seconds`.

## 8. Frontend API And Mapper Direction

### New Runtime Queries

The frontend API layer should add a query that finds the current user's one active attempt in statuses:

- `in_progress`
- `paused`

This payload should include enough metadata to render the resume panel:

- attempt id
- attempt status
- tryout title
- tryout mode
- total questions
- answered question count
- remaining time

### Pause And Resume Mutations

Add frontend mutations:

- `pauseAttempt(attemptId)`
- `resumeAttempt(attemptId)`

The session page should use these instead of inventing client-only timer freezing.

### Timer Mapper

Session page data should compute remaining time from:

- `time_limit_seconds`
- `elapsed_seconds`
- `last_resumed_at`
- `status`

Recommended formula:

- if `status = 'paused'`, remaining time uses only `elapsed_seconds`
- if `status = 'in_progress'`, remaining time uses `elapsed_seconds + now - last_resumed_at`

This preserves correct behavior across repeated resumes.

## 9. Browser Event Direction

The session page should attach browser lifecycle listeners using a React effect with cleanup that follows the official React pattern for subscribing and unsubscribing external browser events.

Relevant guidance verified from official React documentation through Context7:

- window-level listeners should be attached inside `useEffect`
- the effect should always return cleanup that removes the same listeners
- external-system synchronization should avoid stale repeated subscriptions

Recommended browser signals:

- `pagehide` as the primary signal for leaving the page
- `visibilitychange` as a fallback when the document becomes hidden

Pause dispatch rules:

- only fire for attempts that are still `in_progress`
- guard against duplicate sends with a ref flag
- avoid auto-pause after manual submit has started

Where possible, the pause request should use a transport compatible with unload-time delivery expectations.

## 10. Edge Cases

- refresh should pause and then allow the same attempt to be resumed without losing answers
- if the user opens `/app/tryout/session?template=...` while another active or paused attempt exists, the app must not create a new attempt
- if the attempt is already `paused`, repeated pause signals must not add more elapsed time
- if the attempt is already `submitted`, it must never surface in the `Lanjutkan Try Out` panel
- if the user closes the browser and the final pause request is not delivered, the system should still preserve the same attempt record; however, a small amount of extra active time may be counted until the next successful state transition
- if time reaches zero while the session is open and active, existing auto-submit behavior still applies using the pause-aware timing model

## 11. Testing Strategy

Tests should cover:

- migration extends runtime state for paused attempts
- pause RPC accumulates active segment time and moves the attempt to `paused`
- resume RPC reactivates the same attempt without resetting elapsed time
- start RPC blocks creation when a user already has one active or paused attempt
- submit RPC calculates `time_used_seconds` from accumulated active runtime instead of wall-clock since `started_at`
- API layer can fetch the one active attempt for the resume panel
- session mapper returns stable remaining time for both `in_progress` and `paused` states
- catalog page shows `Lanjutkan Try Out` when an active or paused attempt exists
- session page pause logic does not create a new attempt on resume
- resumed session shows the same saved answers and does not rerandomize the attempt

## 12. Risks And Constraints

- browser unload behavior is inherently best effort, so pause delivery can be reliable but not mathematically perfect in every failure mode
- the current attempt contract and tests assume timing derives from `started_at`; those tests will need coordinated updates
- because the product allows only one active or paused attempt, the UI and backend must enforce the same rule consistently
- some existing components may assume catalog entry always leads to new attempt creation, so the resume-first rule must be applied carefully to avoid confusing navigation
