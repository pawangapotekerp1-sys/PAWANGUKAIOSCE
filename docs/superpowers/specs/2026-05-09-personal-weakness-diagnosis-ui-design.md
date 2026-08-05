# Personal Weakness Diagnosis UI Design

Date: 2026-05-09
Status: Draft for user review

## 1. Summary

This design replaces the current analytics page with a diagnosis-first experience that reads from the new personal weakness diagnosis backend.

The new page is no longer a generic analytics dashboard. It becomes a date-range driven diagnosis view with three backend-owned states:

1. `empty`
2. `basic`
3. `full`

The UI must make the diagnosis rules obvious:

- the default range is the last 7 days
- the user can switch with presets or a custom date range
- only eligible large try outs are counted
- full diagnosis appears only when the selected range has at least 3 eligible attempts

The primary visual focus of the page is the weakest subtopic, while behavior patterns act as supporting explanation, matching the backend scoring hierarchy.

## 2. Goals

### Primary Goals

- replace the old analytics page with the new diagnosis experience
- make the selected date range the main control of the page
- present `empty`, `basic`, and `full` diagnosis modes clearly
- make the weakest subtopic the main headline in full mode
- keep the page easy to scan on desktop and mobile
- expose behavior patterns without overpowering the subtopic diagnosis

### Non-Goals

- preserving the old block-based analytics layout on this page
- adding a separate diagnosis detail route
- building mentor/admin views
- redesigning unrelated student pages

## 3. Product Rules Locked

- the page fully replaces the old analytics page content
- the page loads with a default date range of the last 7 days in the user's timezone
- the page supports both:
  - quick preset ranges
  - custom manual date range selection
- `empty` mode explains the lack of eligible data and provides an action to start a large try out
- `basic` mode shows only summary and global behavior patterns, without full subtopic ranking
- `full` mode highlights the weakest subtopic first
- only the top 5 subtopics are visible by default
- the rest of the rankings open in an expanded section below the top 5
- each subtopic card shows:
  - subtopic name
  - accuracy
  - behavior flags
  - confidence
- each subtopic card can expand inline to reveal narrative and supporting metrics
- old block accuracy panels are removed from this page

## 4. Current Baseline

The current page in [analytics-page.tsx](E:/Projek TRY OYT/src/pages/app/analytics-page.tsx) still renders the previous analytics model:

- weakest block
- strongest block
- block accuracy list
- topic weakness ranking
- rules insights

This no longer matches the backend that was implemented for diagnosis:

- `getPersonalWeaknessDiagnosis()`
- custom submitted-date range
- backend `empty/basic/full` modes
- behavior patterns
- subtopic rankings based on the new diagnosis contract

The current UI therefore misrepresents the available product capability.

## 5. Scope

### In Scope

- replace the old analytics page content
- wire the page to `getPersonalWeaknessDiagnosis()`
- add default and custom date-range controls
- support all diagnosis modes
- add top-5 plus expand-all ranking behavior
- add inline expandable subtopic cards
- add diagnosis-oriented tests

### Out of Scope

- changing the main app navigation label
- adding separate detail pages for subtopics
- changing unrelated dashboard cards
- adding charts unless strictly needed for diagnosis clarity

## 6. Page Structure

The page should keep the existing `ProductShell` layout, but the main content area changes substantially.

Recommended structure:

1. Header
2. Date-range controls
3. Mode-specific content
4. Shared diagnosis sections when relevant

## 7. Header

The header should introduce the page as diagnosis, not as generic analytics.

Recommended content:

- eyebrow: `Diagnosis hasil try out`
- title: `Diagnosis Kelemahan`
- description:
  - explains that the page reads weaknesses from eligible large try outs inside the selected date range

This wording should help the user understand why results change when the date range changes.

## 8. Date-Range Controls

The date controls sit directly under the page header.

### Default Behavior

On first load:

- range defaults to the last 7 user-local days
- the query runs automatically

### Controls Included

- quick presets:
  - `7 hari`
  - `14 hari`
  - `30 hari`
- custom date range input
- apply/update action only if needed by the chosen control pattern

### UX Notes

- the active range should always be visible
- changing range should feel responsive without wiping the current layout immediately
- if the implementation uses TanStack Query, the diagnosis query should preserve prior results during refetch to avoid jarring layout flicker when the user changes range

Context7 note:

- TanStack Query documentation supports query keys with filter parameters and preserving previous results during changing query inputs via `placeholderData` / `keepPreviousData` style behavior
- official guidance also supports conditional queries with `enabled`

Reference:

- [TanStack Query docs](https://github.com/tanstack/query/blob/v5.90.3/docs/framework/react/guides/paginated-queries.md)
- [TanStack Query docs](https://github.com/tanstack/query/blob/v5.90.3/docs/framework/react/guides/disabling-queries.md)

## 9. Empty Mode

If the selected range has no eligible attempts:

- show an empty-state panel
- explain that no large diagnosis-approved try outs were submitted in the selected date range
- provide a direct action button to start a large try out

Recommended content shape:

- title
- short explanation
- one primary CTA

This mode should be diagnosis-specific, not a generic data error panel.

## 10. Basic Mode

If the selected range has only 1-2 eligible attempts:

- show summary information
- show global behavior patterns when available
- show a clear message that full diagnosis requires at least 3 eligible attempts
- do not show the full ranked subtopic diagnosis

Recommended sections:

1. compact summary card
2. global behavior pattern chips or cards
3. readiness message panel

This mode should feel useful, but deliberately incomplete.

## 11. Full Mode

If the selected range has 3 or more eligible attempts:

- show a diagnosis-first layout
- make the weakest subtopic the hero focus
- use behavior patterns as explanation

### Recommended Section Order

1. Hero diagnosis card
2. Global behavior pattern detail card
3. Top 5 weakest subtopics
4. Expanded remainder section

## 12. Hero Diagnosis Card

The main hero should emphasize the weakest subtopic, because that is the primary output of the backend.

### Recommended Content

- label: `Subtopik paling lemah`
- subtopic name as the largest text
- supporting short narrative
- supporting metrics:
  - accuracy
  - confidence
  - attempt coverage or question count if useful
- small row of global behavior chips under the main diagnosis

### Why This Matches Backend

The backend ranking is driven primarily by subtopic weakness, with behavior as an amplifier. The hero must preserve that hierarchy rather than leading with behavior.

## 13. Global Behavior Patterns

Behavior appears in two levels:

1. compact chips in the hero
2. fuller detail in a dedicated card below

### Compact Chips

Purpose:

- fast scan
- immediate supporting explanation

Good candidates:

- `Sering ragu-ragu`
- `Terlalu lama`
- `Sering ganti jawaban`
- `Benar jadi salah`

### Detail Card

Each global behavior item may include:

- label
- severity
- short evidence text
- short explanation

This card should feel analytical, but not overly dense.

## 14. Subtopic Ranking Section

This is the core ranking area in full mode.

### Default View

- show only top 5 weakest subtopics
- use a clear section title, for example:
  - `5 Subtopik Paling Perlu Diperhatikan`

### Expand Behavior

- show a `Lihat semua` action
- opening it reveals the remaining items in a new section below the top 5
- allow collapsing back to a shorter list

This keeps the page compact without hiding the full diagnosis.

## 15. Subtopic Card Structure

Each ranking card should present information in the following order:

1. subtopic name
2. accuracy
3. behavior flags
4. confidence

### Collapsed State

The collapsed card should show:

- rank index
- topic name
- block name as secondary context if useful
- accuracy as the most visible metric
- short row of behavior flag chips
- confidence badge

### Expanded State

When expanded, the card shows:

- backend-provided narrative summary
- average time per question
- attempt coverage count
- question count
- any other diagnosis metric already available in the backend contract

The expanded content must stay inline on the same page.

## 16. Removed Legacy Sections

The following existing sections should be removed from the page:

- old snapshot card about weakest/strongest block
- old block accuracy panel
- old topic ranking panel based on legacy analytics
- old rules insight copy tied to previous block analytics

The new page should not mix the old and new mental models.

## 17. States And Query Flow

The frontend should treat the diagnosis response as backend-owned and render by mode.

### State Flow

1. initial load with default 7-day range
2. loading state while query resolves
3. render one of:
  - `empty`
  - `basic`
  - `full`
4. preserve previous content during range changes when practical

### Query Notes

Recommended query key shape:

- `["personal-weakness-diagnosis", userId, { dateFrom, dateTo, timezone }]`

Recommended behavior:

- enable only when user session is ready and dates are valid
- keep previous visible result during range refetch when possible

These patterns align with official TanStack Query guidance for filtered query keys and conditional fetching.

## 18. Mobile Direction

The mobile layout should keep the same order, but stack vertically:

1. header
2. range controls
3. hero
4. behavior card
5. top 5 cards
6. expanded remainder

Cards should remain readable without requiring side-by-side comparison panels.

## 19. Error Handling

This page should distinguish:

- loading
- backend/query error
- empty diagnosis

An error state should not reuse the empty diagnosis message.

Recommended error state:

- short diagnosis-specific explanation
- retry path via refresh or staying on the page

## 20. Testing Direction

Tests should cover:

- default 7-day query behavior
- switching presets
- applying custom date ranges
- correct rendering of:
  - `empty`
  - `basic`
  - `full`
- top 5 rendering
- `Lihat semua` expansion
- inline card expansion
- removal of legacy analytics sections
- loading and error states

## 21. Risks And Constraints

- if the custom range control is too heavy, it can dominate the page visually
- showing too many metrics in each subtopic card can make the page feel like a debug screen
- if previous diagnosis data is not preserved during refetch, the page may feel unstable
- if old analytics language is left behind in copy or tests, the new diagnosis intent will remain muddy

## 22. Recommended Implementation Order

1. replace the analytics page query with the diagnosis query
2. add date-range state and default 7-day behavior
3. implement mode-specific rendering
4. implement hero and behavior cards
5. implement top 5 ranking and expand-all behavior
6. implement per-card expansion
7. remove legacy analytics UI and tests

