# Tryout Session Timer And Ragu-Ragu Design

Date: 2026-05-06
Status: Draft for user review

## 1. Summary

This design updates the live tryout session in three connected areas:

1. replace template-based timing with a global runtime rule of `1 minute per question`
2. add a persisted `ragu-ragu` marker for answered multiple-choice questions
3. auto-submit the session when time reaches zero, using the latest saved answers as final answers

The goal is to make session timing predictable, let students mark uncertain answers without losing their selected option, and ensure timeout behavior is consistent with manual submit.

## 2. Goals

### Primary Goals

- make every new tryout attempt use `jumlah soal x 60 detik`
- let users mark an answered question as `ragu-ragu`
- show `ragu-ragu` questions in the left question-number list with a yellow state
- prevent `ragu-ragu` from being set on unanswered questions
- auto-submit the tryout when the countdown reaches zero
- ensure `ragu-ragu` questions still submit their currently selected option as the final answer

### Non-Goals

- changing score calculation rules
- changing review-page scoring or explanation behavior
- adding partial-credit or confidence-based scoring
- redesigning the overall tryout layout beyond the new control and status colors
- changing historical attempts that were already created before this update

## 3. Scope

### In Scope

- update attempt creation timing logic
- extend persisted answer data with a `ragu-ragu` flag
- update session API and mapper contracts
- add a `ragu-ragu` control to the tryout session page
- update left-side question-number colors to include a yellow doubtful state
- add client countdown behavior and timeout-triggered submit
- add tests for migration, API, mapper, and session-page behavior

### Out of Scope

- allowing `ragu-ragu` for essay or non-multiple-choice items
- adding filtering by doubtful questions in result or review pages
- surfacing `ragu-ragu` labels in analytics dashboards
- letting editors configure different per-question timing rules

## 4. Product Decisions Locked

- the timing rule is global for new attempts: `time_limit_seconds = total_questions * 60`
- the old template duration value is no longer the source of truth for newly created attempts
- `ragu-ragu` can only be toggled when a question already has a selected option
- a question may remain `ragu-ragu` even if the user later changes its selected option
- manual submit and auto-submit both use the latest persisted answer state
- if the timer expires on any question, the whole attempt is submitted immediately

## 5. Experience Design

### Session Timer

The session header keeps the existing timer pill, but its behavior becomes a true live countdown.

- the initial remaining time still comes from the session payload
- the client counts down every second from that initial value
- when the value reaches `00:00:00`, the page submits automatically once and then moves to the result page

### Answering And Doubtful Marking

The existing multiple-choice interaction remains the primary action.

- user selects an option first
- after that, a `Ragu-ragu` control appears in the answer action area below the choices
- before an option is selected, the `Ragu-ragu` control is disabled
- toggling `Ragu-ragu` must not clear or replace the current answer

### Question Number Status Colors

The left-side number grid should support four visual states:

- active question: active style
- answered and marked `ragu-ragu`: yellow
- answered and not `ragu-ragu`: green
- unanswered: neutral

If the active question is also `ragu-ragu`, the active style should still remain visually primary while preserving a clear doubtful cue in the design system treatment.

### Submission Behavior

- on the last question, the manual submit CTA remains available
- when manual submit is clicked, the attempt submits immediately using the saved answers
- when time expires, the app behaves the same way without requiring another user action
- answers marked yellow are not transformed into a different option; their current selected choice is simply treated as final

## 6. Data Model Direction

The current `answers` table stores only selected option state. That is not enough for the new persisted doubtful marker.

Recommended schema change:

- add `is_doubtful boolean not null default false` to `public.answers`

Recommended answer record rules:

- if `selected_option_key is null`, `is_doubtful` should be stored as `false`
- any save flow that clears an answer in the future should also clear `is_doubtful`
- existing answer rows should backfill safely through the default value

No separate doubtful table is recommended because:

- the marker belongs to one saved answer state
- it must travel together with the selected option
- the current answer upsert flow is already the natural write boundary

## 7. Runtime And API Direction

### Attempt Creation

`start_attempt_from_template` should stop using `exam_templates.duration_minutes * 60` for newly created attempts.

Instead it should:

- count the selected questions for the attempt
- write `time_limit_seconds = template_question_count * 60`
- keep `total_questions = template_question_count`

This keeps the persisted attempt self-contained and ensures all later session math remains unchanged.

### Answer Save Contract

`saveAnswer()` should expand from:

- `attemptId`
- `attemptItemId`
- `selectedOptionKey`

to:

- `attemptId`
- `attemptItemId`
- `selectedOptionKey`
- `isDoubtful`

The session payload returned by `getAttemptSessionPageData()` should also include `isDoubtful` per question.

### Submit Contract

`submitAttempt()` does not need a new scoring model. It should continue reading the final state from `answers`, but that state now includes:

- the selected option used for scoring
- the doubtful marker used only for session UX

The doubtful marker should not change correctness or score calculations.

## 8. Frontend State And Interaction Rules

### Session Query Shape

`TryoutSessionPageData.questions[]` should expose:

- `selectedOptionKey`
- `isDoubtful`

This gives the page enough information to render:

- selected answer styles
- doubtful control state
- left-nav color state

### Optimistic Updates

The current optimistic answer mutation should update both:

- `selectedOptionKey`
- `isDoubtful`

This prevents the UI from briefly showing stale yellow/green states after a click.

### Countdown Safety

The session page should add a client-side countdown guard:

- start from the fetched `timeRemainingSeconds`
- decrement once per second
- stop at zero
- trigger submit only if the attempt is still `in_progress` and submit is not already pending

This avoids double-submit when:

- the timer expires
- the user clicks manual submit at nearly the same moment

## 9. Edge Cases

- if a user refreshes the page, the selected option and `ragu-ragu` state must still load correctly from persisted data
- if a user changes the selected option on a doubtful question, the doubtful state should stay attached
- if a user has not selected any option, the doubtful control must remain disabled
- if a question is unanswered at timeout, it remains unanswered in scoring
- if the attempt is already submitted when the page reloads, the session should not attempt another auto-submit
- attempts created before this change keep their previously stored `time_limit_seconds`; only new attempts adopt the new formula

## 10. Testing Strategy

Tests should cover:

- migration adds `answers.is_doubtful`
- attempt bootstrap sets `time_limit_seconds` from question count
- answer save API upserts `selected_option_key` and `is_doubtful`
- session mapper returns `isDoubtful` and correct remaining time
- session page disables `Ragu-ragu` before an answer is selected
- session page can mark an answered question as `Ragu-ragu`
- left question-number navigation renders yellow for doubtful answered items
- auto-submit fires when countdown reaches zero and navigates to result
- manual submit remains available and does not conflict with timeout submit

## 11. Risks And Constraints

- the current client timer is static, so the live countdown must be introduced carefully to avoid hydration or interval bugs
- session auto-submit depends on reliable single-fire mutation guards
- older tests and mocks currently assume answers only contain `selectedOptionKey`; they will need coordinated updates
- `duration_minutes` may remain in schema for catalog metadata or backward compatibility, but it should no longer control new attempt runtime duration
