# Personal Weakness Diagnosis Backend Design

Date: 2026-05-08
Status: Draft for user review

## 1. Summary

This design adds a deeper personal weakness diagnosis backend for try out users.

The diagnosis is built for one user at a time and is driven by a custom submitted-date range chosen by that user. The system only uses completed try outs from templates explicitly marked as diagnosis sources. Practice attempts from block-only or topic-only flows must never be mixed into this diagnosis.

The backend uses a hybrid design:

1. after each eligible try out is submitted, the backend stores one diagnostic snapshot for that attempt
2. when the user requests a custom date range, the backend aggregates all eligible snapshots inside that range into one personal diagnosis result

The primary output is a ranked list of weak subtopics, where existing `topics` are treated as diagnosis subtopics. Behavioral patterns such as hesitation, slow pacing, frequent answer changes, and changing a correct answer into a wrong answer act as supporting signals, while accuracy remains the dominant factor in the weakness ranking.

## 2. Goals

### Primary Goals

- diagnose one user's weaknesses from all eligible try outs submitted inside a custom date range
- use all qualifying attempts in the range, not only the latest try out
- rank all detected subtopics from weakest to most stable
- keep accuracy as the main weakness signal while using behavior signals as diagnosis amplifiers
- expose both global behavior patterns and subtopic-specific behavior patterns
- support lightweight feedback when the date range has only one or two eligible try outs
- keep diagnosis generation fast enough for custom date range queries by precomputing per-attempt snapshots

### Non-Goals

- admin, mentor, or cohort-wide diagnosis
- AI-generated narratives
- personalized study recommendations or task queues
- using block-only or topic-only try outs as diagnosis sources
- multi-tag or multi-subtopic questions in this iteration

## 3. Product Rules Locked

- diagnosis is personal and scoped to the currently authenticated user
- diagnosis source attempts must come only from templates marked `diagnostic_source = true`
- date filtering uses `submitted_at`
- the selected date range is interpreted as full user-local days
- all eligible attempts inside the range must be included in the diagnosis aggregation
- full diagnosis requires at least three eligible attempts in the selected range
- if only one or two eligible attempts exist, backend returns basic mode instead of full diagnosis
- existing `topics` are treated as diagnosis subtopics
- all detected subtopics stay visible in the diagnosis result
- subtopics with thin data are not hidden, but must expose lower confidence
- weakness ranking uses a combined score where accuracy remains dominant
- behavior labels for v1 are:
  - `frequent_ragu`
  - `slow_pacing`
  - `frequent_answer_changes`
  - `correct_to_wrong_switches`
- backend output includes structured data plus short rule-based narrative text
- behavior patterns should be available both globally and per subtopic when relevant

## 4. Current System Baseline

The current backend already stores:

- `attempts`
- `attempt_items`
- `answers`
- `attempt_results`
- aggregate analytics views for block and topic performance

Today the analytics layer is enough for aggregate accuracy reporting, but it is not enough for deeper diagnosis because it does not preserve the runtime behavior signals needed to explain why a subtopic is weak.

The current model lacks:

- explicit source selection for diagnosis-ready templates
- per-question time spent
- answer-change history
- explicit counts for changing correct answers into wrong answers
- per-attempt diagnosis snapshots
- one backend-owned diagnosis response for custom date ranges

## 5. Scope

### In Scope

- add an explicit diagnosis-source flag on exam templates
- record diagnosis behavior signals for eligible try out runtime
- build per-attempt diagnosis snapshots after submission
- aggregate all eligible snapshots inside a custom date range
- support `empty`, `basic`, and `full` diagnosis modes
- rank all detected subtopics in the selected range
- expose global and per-subtopic behavior patterns
- return rule-based summary text from the backend
- add migration, SQL, API, and behavior tests

### Out of Scope

- frontend implementation details beyond response needs
- admin tools for managing diagnosis reports
- recommendation engines and remediation plans
- AI summarization
- changing the existing topic taxonomy structure beyond reusing it as subtopics

## 6. Taxonomy Direction

The project currently has two academic levels:

- `blocks`
- `topics`

This design reuses `topics` as the diagnosis subtopic level.

That means:

- `block` remains the high-level grouping
- `topic` becomes the subtopic shown in diagnosis results
- each question continues to belong to one primary `topic_id`

This iteration intentionally keeps the current one-question-to-one-topic rule. Multi-concept tagging is out of scope.

## 7. Data Source Eligibility

### Template Flag

Add a new field on `exam_templates`:

- `diagnostic_source boolean not null default false`

This field is the only supported rule for deciding whether a submitted attempt may feed diagnosis.

Why this is preferred:

- it avoids inferring diagnosis eligibility from `mode` only
- it avoids hard-coding the question count as the sole rule
- it gives editorial and product control over which full try outs count toward diagnosis

### Attempt Eligibility For Range Aggregation

An attempt qualifies for a user's diagnosis range only if:

- it belongs to the current authenticated user
- it has `status = 'submitted'`
- its template has `diagnostic_source = true`
- its `submitted_at` falls inside the chosen local-day date range

## 8. Runtime Behavior Capture

The current runtime records final answers and already supports `ragu-ragu` state in the session flow, but deeper diagnosis requires richer behavioral evidence.

### Required Behavior Signals

For v1, the backend must preserve enough information to compute:

- whether a question was ever flagged as `ragu-ragu`
- whether a question remains flagged `ragu-ragu` at the final saved state
- total time spent on each attempt item
- how many times the answer changed
- whether the user changed from a correct answer to a wrong answer

### Recommended Storage Shape

Add one per-item metrics table:

- `attempt_item_behavior_metrics`

Suggested fields:

- `attempt_item_id uuid primary key references public.attempt_items (id) on delete cascade`
- `attempt_id uuid not null references public.attempts (id) on delete cascade`
- `time_spent_seconds integer not null default 0`
- `was_ever_flagged_ragu boolean not null default false`
- `is_flagged_ragu_final boolean not null default false`
- `answer_change_count integer not null default 0`
- `changed_correct_to_wrong_count integer not null default 0`
- `first_answered_at timestamptz null`
- `last_answered_at timestamptz null`
- `created_at timestamptz not null default timezone('utc', now())`
- `updated_at timestamptz not null default timezone('utc', now())`

Add one append-only event table:

- `attempt_answer_change_events`

Suggested fields:

- `id uuid primary key default gen_random_uuid()`
- `attempt_id uuid not null references public.attempts (id) on delete cascade`
- `attempt_item_id uuid not null references public.attempt_items (id) on delete cascade`
- `previous_option_key text null`
- `next_option_key text null`
- `was_previous_correct boolean not null default false`
- `is_next_correct boolean not null default false`
- `changed_at timestamptz not null default timezone('utc', now())`

Why both layers are recommended:

- metrics rows keep diagnosis queries fast
- event rows keep the raw evidence available if the scoring rules need refinement later

## 9. Per-Attempt Diagnosis Snapshot Model

The diagnosis architecture is hybrid, so the system should not compute every custom range from raw runtime events. Instead, it should write one normalized diagnosis snapshot for each eligible submitted attempt.

### Global Snapshot Table

Add:

- `attempt_diagnostic_snapshots`

Suggested fields:

- `id uuid primary key default gen_random_uuid()`
- `attempt_id uuid not null unique references public.attempts (id) on delete cascade`
- `user_id uuid not null references public.profiles (id) on delete cascade`
- `exam_template_id uuid not null references public.exam_templates (id) on delete cascade`
- `submitted_at timestamptz not null`
- `question_count integer not null`
- `correct_count integer not null`
- `wrong_count integer not null`
- `unanswered_count integer not null`
- `overall_accuracy numeric(5,2) not null`
- `overall_avg_time_per_question numeric(10,2) not null`
- `overall_ragu_rate numeric(6,4) not null`
- `overall_answer_change_rate numeric(6,4) not null`
- `overall_correct_to_wrong_rate numeric(6,4) not null`
- `created_at timestamptz not null default timezone('utc', now())`
- `updated_at timestamptz not null default timezone('utc', now())`

### Per-Subtopic Snapshot Table

Add:

- `attempt_diagnostic_topic_snapshots`

Suggested fields:

- `id uuid primary key default gen_random_uuid()`
- `attempt_snapshot_id uuid not null references public.attempt_diagnostic_snapshots (id) on delete cascade`
- `attempt_id uuid not null references public.attempts (id) on delete cascade`
- `topic_id uuid not null references public.topics (id) on delete cascade`
- `topic_name text not null`
- `block_id uuid references public.blocks (id) on delete set null`
- `block_name text not null`
- `question_count integer not null`
- `correct_count integer not null`
- `wrong_count integer not null`
- `unanswered_count integer not null`
- `accuracy numeric(5,2) not null`
- `avg_time_seconds numeric(10,2) not null`
- `ragu_count integer not null`
- `ragu_rate numeric(6,4) not null`
- `answer_change_count integer not null`
- `answer_change_rate numeric(6,4) not null`
- `correct_to_wrong_count integer not null`
- `correct_to_wrong_rate numeric(6,4) not null`
- `weakness_score_base numeric(8,4) not null`
- `created_at timestamptz not null default timezone('utc', now())`

Why normalized rows are preferred over one large JSON blob:

- range filtering and SQL aggregation stay straightforward
- ranking all subtopics is easier
- tests can validate subtopic math directly
- future formula tuning stays safer

## 10. Submit Pipeline Direction

When `submit_attempt` completes:

1. the existing scoring pipeline still produces `attempt_results`
2. backend checks whether the attempt's template has `diagnostic_source = true`
3. if not, diagnosis snapshot creation is skipped
4. if yes, backend computes one attempt diagnosis snapshot plus topic snapshot rows
5. snapshot writes must be idempotent so repeated submit calls do not duplicate records

Recommended implementation direction:

- keep existing result generation in SQL
- add one follow-up SQL function or backend service step that rebuilds the diagnosis snapshot from the submitted attempt
- use `upsert` semantics keyed by `attempt_id`

## 11. Range Diagnosis Query Flow

When a user requests a personal diagnosis for a date range:

1. backend validates the authenticated user
2. backend accepts:
   - `date_from`
   - `date_to`
   - `timezone`
3. backend converts the chosen local days into UTC range boundaries
4. backend loads all `attempt_diagnostic_snapshots` for that user whose `submitted_at` falls inside the range
5. backend determines mode:
   - `empty` when zero eligible attempts exist
   - `basic` when one or two eligible attempts exist
   - `full` when three or more eligible attempts exist
6. backend aggregates all matching topic snapshot rows
7. backend computes global behavior patterns, subtopic rankings, confidence labels, and rule-based narrative text

The query must aggregate every eligible attempt inside the range, not only the latest one.

## 12. Aggregation Rules

Range diagnosis must recompute subtopic results from summed metrics across all eligible attempts in the range.

For each subtopic, the backend should aggregate:

- total questions
- total correct answers
- total wrong answers
- total unanswered questions
- total time spent
- total ragu count
- total answer changes
- total correct-to-wrong changes
- distinct attempt coverage count

Derived range metrics:

- `accuracy = total_correct / total_questions`
- `average_time_per_question = total_time_spent / total_questions`
- `ragu_rate = total_ragu_count / total_questions`
- `answer_change_rate = total_answer_change_count / total_questions`
- `correct_to_wrong_rate = total_correct_to_wrong_count / total_questions`

For global behavior, backend should aggregate the same behavior families across all eligible attempt snapshots in the range.

## 13. Weakness Score Direction

Weakness ranking should use a combined score where accuracy remains dominant and behavior signals act as supporting penalties.

Recommended direction:

- 70% from accuracy-derived weakness
- 30% from behavior-derived weakness

Inside the behavior component, the recommended relative weight is:

- time penalty: 25%
- ragu penalty: 25%
- answer change penalty: 20%
- correct-to-wrong penalty: 30%

Important interpretation rules:

- behavior should not overpower a clearly stronger accuracy profile
- behavior should help distinguish subtopics whose accuracy is similarly weak
- `correct_to_wrong_switches` should carry the strongest behavior weight because it indicates self-damaging decision reversal

The exact formula may be tuned during implementation, but the hierarchy of signals is locked:

1. accuracy is dominant
2. behavior is secondary
3. correct-to-wrong is the strongest behavior amplifier

## 14. Slow Pacing Baseline

The user selected a combined pacing baseline.

Slow pacing should be evaluated against:

- the user's overall average time per question across the eligible date range
- the relative pacing of other subtopics inside that same range

This avoids relying only on a static global threshold and makes the diagnosis more fair for naturally slower or faster users.

## 15. Confidence Labels

All detected subtopics remain visible, even when data is thin.

Because of that, backend must expose confidence labels such as:

- `low`
- `medium`
- `high`

Confidence should be derived from evidence depth such as:

- total question count for that subtopic in the range
- number of eligible attempts contributing to that subtopic

Confidence exists for transparency and should not dominate the main ranking.

## 16. Response Contract Direction

The diagnosis response should be backend-owned and should contain both structured fields and short rule-based text.

Recommended top-level structure:

- `summary`
- `globalBehaviorPatterns`
- `subtopicRankings`
- `basicSummary`
- `narrative`

### Summary

Suggested fields:

- `rangeStart`
- `rangeEnd`
- `timezone`
- `eligibleAttemptCount`
- `minimumAttemptsMet`
- `diagnosisMode`
- `overallAccuracy`
- `overallAverageTimePerQuestion`
- `overallQuestionCount`

### Global Behavior Patterns

Each item may include:

- `code`
- `label`
- `severity`
- `evidence`
- `description`

Supported codes for v1:

- `frequent_ragu`
- `slow_pacing`
- `frequent_answer_changes`
- `correct_to_wrong_switches`

### Subtopic Rankings

All detected subtopics appear here in descending weakness order.

Suggested item fields:

- `topicId`
- `topicName`
- `blockId`
- `blockName`
- `rank`
- `weaknessScore`
- `confidence`
- `questionCount`
- `attemptCoverageCount`
- `accuracy`
- `averageTimePerQuestion`
- `behaviorFlags`
- `summary`

### Basic Summary

When only one or two eligible attempts exist, backend should avoid returning full-ranking certainty. Instead it should return a lightweight block such as:

- `message`
- `eligibleAttemptCount`
- `overallAccuracy`
- `observedTopics`
- `globalBehaviorPatterns`

### Narrative

Short rule-based text generated by backend, not AI.

Suggested fields:

- `headline`
- `body`
- `nextReadiness`

## 17. Rule-Based Narrative Direction

Narrative text should explain:

- what is most consistently weak in the selected range
- which behavior patterns strengthen that conclusion
- whether the evidence is thick enough for a full reading

Examples of narrative intent:

- identify the weakest high-confidence subtopic
- mention one or two dominant supporting behavior patterns
- mention how many eligible attempts contributed to the diagnosis

The narrative should stay concise and deterministic.

## 18. Empty And Basic Mode Behavior

### Empty Mode

If no eligible attempts exist in the range:

- return `diagnosisMode = 'empty'`
- return no full diagnosis ranking
- include a message indicating that no eligible submitted diagnosis-source try outs exist in the selected range

### Basic Mode

If only one or two eligible attempts exist:

- return `diagnosisMode = 'basic'`
- return overall summary and global patterns if available
- do not return a full weakness ranking that implies mature statistical confidence
- include a message indicating that at least three eligible attempts are needed for full diagnosis

## 19. Security And Ownership

- only the authenticated user may request their own diagnosis
- diagnosis query logic must never leak another user's attempt snapshots
- snapshot generation must only read attempts that the backend already owns or can legally access
- any SQL function or edge function used here must preserve the same user ownership guarantees as the rest of the try out runtime

## 20. Testing Strategy

Tests should cover:

- migration adds `diagnostic_source` and new diagnosis tables
- diagnosis runtime tables store behavior metrics correctly
- answer-change events preserve correct-to-wrong transitions
- snapshot generation runs only for templates marked `diagnostic_source = true`
- submit replay or repeated submit calls do not duplicate snapshots
- range filtering uses `submitted_at` and user-local full-day boundaries correctly
- empty mode returns no ranking
- basic mode returns lightweight summary only
- full mode aggregates all eligible attempts in the range
- subtopics are ranked by combined weakness score
- all detected subtopics appear even when confidence is low
- confidence labels respond to data depth
- narrative text stays deterministic and rule-based
- pause/resume timing does not corrupt per-question time metrics

## 21. Risks And Constraints

- measuring per-question time can be noisy if frontend runtime events are inconsistent
- answer-change logging must avoid duplicate event spam from repeated saves
- custom local-day timezone filtering is easy to get subtly wrong without strict tests
- weak subtopics with very thin evidence may still appear alarming if confidence is not visually clear
- scoring weights will likely need practical tuning after real usage, so snapshot rows should preserve enough raw metrics to support recalculation

## 22. Recommended Implementation Order

1. add schema support for `diagnostic_source`
2. add behavior runtime storage for per-item metrics and answer-change events
3. update session-save pipeline so runtime behavior data is captured reliably
4. add per-attempt diagnosis snapshot generation on submit
5. add range diagnosis query or service
6. add tests for behavior capture, snapshot generation, and range aggregation

## 23. Open Implementation Details To Finalize In Planning

The product rules are locked, but these engineering details can still be finalized during implementation planning:

- whether the final diagnosis query is exposed as an RPC, edge function, or a thin combination of both
- the exact threshold math for `low`, `medium`, and `high` confidence
- the final numeric constants for weakness score weighting
- the exact frontend event contract for per-question timing updates
- whether snapshot generation is embedded directly inside submit SQL or triggered through a follow-up backend call
