# Collapsible Sidebar And Scheduled Event Autosave Design

Date: 2026-06-02
Status: Draft for user review

## 1. Summary

This design adds two focused improvements to the mentor-side product experience:

1. the left sidebar in the mentor shell can be hidden and restored with a single arrow control, sliding off-canvas to the left without removing access to the toggle
2. the scheduled event editor keeps its existing browser-local draft recovery and adds silent backend autosave every 5 minutes

The save behavior is intentionally split:

- manual save from the `Simpan event` button must still return the user to `/scheduled-ops/events`
- autosave must never navigate away from the editor and must not reload or visually reset the page

These changes should feel additive and low-friction. They must not redesign the scheduled event information architecture, and they must not change the student tryout runtime.

## 2. Goals

### Primary Goals

- let mentor users reclaim horizontal space by collapsing the main sidebar
- preserve the ability to restore the hidden sidebar from the same page state
- protect scheduled event authoring work against disconnects and refreshes through immediate local persistence plus periodic backend sync
- ensure backend autosave does not interrupt authoring or move the user away from the editor
- keep manual save behavior explicit and unchanged from the user's perspective

### Non-Goals

- redesigning the student-facing tryout shell
- creating a separate draft-management dashboard
- introducing a new backend draft table or a draft publish workflow
- changing scheduled event review, catalog, or activation behavior outside the editor
- changing the admin shell unless the same product-shell component is already shared there

## 3. Scope

### In Scope

- mentor shell layout behavior in [product-shell.tsx](</E:/Projek TRY OYT/src/components/layout/product-shell.tsx:1>)
- mentor shell tests in [product-shell.test.tsx](</E:/Projek TRY OYT/src/components/layout/product-shell.test.tsx:1>)
- scheduled event editor behavior in [scheduled-event-editor-page.tsx](</E:/Projek TRY OYT/src/pages/scheduled-ops/scheduled-event-editor-page.tsx:1>)
- scheduled event editor draft helpers in [scheduled-event-editor-draft.ts](</E:/Projek TRY OYT/src/lib/scheduled-event-editor-draft.ts:1>)
- scheduled event editor tests in [scheduled-event-editor-page.test.tsx](</E:/Projek TRY OYT/src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx:1>)
- draft helper tests in [scheduled-event-editor-draft.test.ts](</E:/Projek TRY OYT/src/lib/scheduled-event-editor-draft.test.ts:1>)
- save orchestration through the existing scheduled event API in [scheduled-tryout-api.ts](</E:/Projek TRY OYT/src/lib/api/scheduled-tryout-api.ts:1>)

### Out of Scope

- schema changes for a dedicated scheduled-event drafts table
- route changes from `/scheduled-ops/events/new` to a server-owned edit route immediately after autosave
- websocket collaboration or multi-user live editing
- autosave support for other editors unless separately requested

## 4. Product Decisions Locked

- the sidebar toggle is a single arrow control
- hiding the sidebar moves it leftward off-canvas instead of removing the entire shell structure
- the toggle remains reachable while the sidebar is hidden
- sidebar preference should persist across page navigation in the same browser
- local draft persistence continues to happen immediately on change
- backend autosave runs every 5 minutes and is silent
- autosave must not navigate, reload, or replace the current route
- manual save must still navigate back to the event list after success
- new-event autosave may create the backing event in the database if the payload is valid enough for the existing RPC

## 5. Current State

### 5.1 Sidebar shell

The mentor shell currently renders a fixed-width sidebar and content grid in [product-shell.tsx](</E:/Projek TRY OYT/src/components/layout/product-shell.tsx:1>).

There is no persisted layout preference and no affordance to reclaim the sidebar width on dense pages.

### 5.2 Scheduled event editor persistence

The scheduled event editor already writes the form state to browser-local storage through [scheduled-event-editor-draft.ts](</E:/Projek TRY OYT/src/lib/scheduled-event-editor-draft.ts:1>) and restores matching drafts on mount in [scheduled-event-editor-page.tsx](</E:/Projek TRY OYT/src/pages/scheduled-ops/scheduled-event-editor-page.tsx:1>).

That means same-browser recovery already exists, but cross-refresh backend persistence during authoring does not.

### 5.3 Scheduled event save contract

The current create and update flows in [scheduled-tryout-api.ts](</E:/Projek TRY OYT/src/lib/api/scheduled-tryout-api.ts:1012>) and [scheduled-tryout-api.ts](</E:/Projek TRY OYT/src/lib/api/scheduled-tryout-api.ts:1040>) both call the same RPC, `upsert_scheduled_tryout_event`.

The underlying database function in [20260516000031_scheduled_tryout_runtime.sql](</E:/Projek TRY OYT/supabase/migrations/20260516000031_scheduled_tryout_runtime.sql:1170>) already supports:

- create when `target_event_id` is null
- update when `target_event_id` is present
- upserting the full event plus its question set

This is the strongest reason to reuse the existing save pathway instead of adding a separate draft backend model.

### 5.4 Documentation context checked

React interval and latest-state guidance was checked through Context7 against the official React docs.

The relevant takeaway is:

- `useEffectEvent` is the preferred React 19 pattern for interval callbacks that must read the latest form state without recreating the timer on every render
- the interval should still be created and cleaned up inside `useEffect`

This fits the autosave requirement because the timer is fixed at 5 minutes while the form state changes frequently.

## 6. Recommended Approach

Use an **incremental shell-and-editor enhancement**:

- add a persisted collapse state to the mentor product shell
- animate the sidebar in and out of view instead of conditionally unmounting it
- keep immediate local draft persistence in place
- extend the stored draft payload with backend-sync metadata
- add a 5-minute backend autosave loop that reuses the existing create and update RPC flow
- separate manual-save success handling from autosave success handling

This is the recommended option because it delivers the requested resilience and UX polish with the smallest change surface and the least backend risk.

## 7. Alternative Approaches Considered

### Option A. Recommended: Local draft plus event-backed autosave

Behavior:

- every field change writes immediately to local draft storage
- every 5 minutes the latest valid draft is sent to the existing event upsert flow
- autosave for a new event may create the server event once, then subsequent autosaves update that same event

Pros:

- reuses current API and migration contract
- protects against same-browser loss immediately and server-side loss periodically
- no route changes required during autosave

Trade-offs:

- the editor must track a hidden persisted event identifier after the first successful autosave
- backend autosave can only run when the current draft satisfies minimum payload rules for the existing API

### Option B. Dedicated backend draft table

Behavior:

- autosave writes to a separate draft entity
- manual save promotes the draft into a scheduled event

Pros:

- draft semantics are cleanly separated from published event entities

Trade-offs:

- requires new schema, new API, new restore rules, and new publish flow
- adds much more risk and time than the requested change needs

### Option C. Local-only autosave with online flush

Behavior:

- local persistence remains instant
- server sync is attempted only on reconnect or explicit save

Pros:

- fewer backend writes

Trade-offs:

- weaker server-side protection
- less aligned with the explicit 5-minute autosave requirement

## 8. Experience Design

### 8.1 Sidebar collapse behavior

When expanded:

- the mentor shell looks the same as today
- the arrow points left to indicate `hide`

When collapsed:

- the sidebar slides to the left and no longer consumes the full layout column visually
- the content area expands into the freed width
- a slim toggle rail or floating edge control remains visible near the left edge of the content area
- the arrow points right to indicate `show`

The transition should be smooth and should not cause a full rerender flash.

### 8.2 Scheduled event autosave status

The editor should expose a small non-blocking status hint such as:

- `Draft lokal tersimpan`
- `Menyimpan ke server...`
- `Tersimpan ke server 10:35`
- `Autosave server gagal, draft lokal tetap aman`

The status belongs near the editor action area or metadata summary, not in a modal and not in an intrusive toast loop.

### 8.3 Manual save versus autosave

Manual save:

- runs when the user presses `Simpan event`
- validates the full payload using the current strict save rules
- clears the matching local draft after success
- navigates back to `/scheduled-ops/events`

Autosave:

- runs in the background every 5 minutes
- never navigates
- never reloads the route
- never clears local draft data on a partial or failed save
- only updates autosave status metadata after success or failure

## 9. Sidebar State Design

### 9.1 Ownership

The sidebar collapse state should live in [product-shell.tsx](</E:/Projek TRY OYT/src/components/layout/product-shell.tsx:1>) because it owns both the sidebar and the main content frame.

### 9.2 Persistence

Persist the preference to browser-local storage with a dedicated key such as:

- `product-shell:sidebar-collapsed`

This lets the mentor keep a stable preference across routed pages in the same browser.

### 9.3 Rendering strategy

Prefer a transform-based slide and width-aware content layout update over fully removing the sidebar from the tree.

Reasons:

- smoother animation
- toggle control remains easy to anchor
- lower risk of unexpected nav remount behavior

## 10. Draft Storage And Autosave Metadata

### 10.1 Existing payload extension

The current local draft payload stores:

- `eventId`
- `updatedAt`
- `formState`

Extend it to also store:

- `persistedEventId`
- `lastServerSavedAt`

Optional additional metadata if needed during implementation:

- `lastAutosaveError`
- `lastSavedFingerprint`

### 10.2 Meaning of identifiers

- `eventId` remains the route-associated identity used to isolate drafts
- `persistedEventId` is the server event id created or updated by autosave or manual save

This distinction matters most on `/scheduled-ops/events/new`, where `eventId` is null but the draft may already correspond to a real server event after the first autosave.

### 10.3 Restore rules

On mount:

- restore the matching local draft as today
- if the draft contains `persistedEventId`, keep it in editor state for future autosave and manual save routing

For edit mode:

- continue to prefer the matching local draft over late server hydration when the draft belongs to the same edited event

## 11. Autosave Flow

### 11.1 Timer model

Use a fixed 5-minute interval created in an effect and a React 19 `useEffectEvent` callback to read the latest editor state.

The timer should be cleaned up on unmount.

### 11.2 Dirty-check model

Autosave should no-op when:

- the editor has no unsynced changes since the last successful backend save
- the editor is already running a backend autosave
- a media upload needed by the current payload is still in flight

### 11.3 Minimum backend-save eligibility

Local draft persistence never waits for validation.

Backend autosave should only run when the draft has enough data to satisfy the existing event mutation contract:

- title exists
- access start exists
- access end exists
- at least one question exists
- each question has a non-empty stem
- each question has at least two non-empty options
- each question's correct answer points to a populated option

This keeps autosave compatible with the existing RPC and avoids introducing a weaker backend draft contract.

### 11.4 Create-then-update sequence for new events

For `/new`:

1. the first eligible autosave calls `createScheduledEvent`
2. on success, the returned id becomes `persistedEventId`
3. future autosaves call `updateScheduledEvent` with that id
4. the user stays on the same route unless they manually save

This prevents duplicate event creation while preserving a stable authoring URL.

### 11.5 Edit-mode sequence

For `/scheduled-ops/events/:eventId/edit`:

- autosave uses `eventId` directly unless `persistedEventId` needs to mirror the same id internally
- success updates save metadata only
- no navigation occurs

## 12. Manual Save Flow

Manual save should reuse the same input builder but keep a separate success path.

Required behavior:

1. build the full strict payload
2. choose update or create based on `persistedEventId` and route mode
3. clear the matching local draft on success
4. navigate to `/scheduled-ops/events`

Important invariant:

- if autosave has already created a server event while the user is still on `/new`, clicking `Simpan event` must update that same event and then return to the list
- it must not create a second event

## 13. Error Handling

### 13.1 Autosave failures

If backend autosave fails:

- keep local draft intact
- keep the user on the editor page
- surface a non-blocking status message
- allow the next autosave cycle or manual save to retry

### 13.2 Manual save failures

If manual save fails:

- keep the user on the editor page
- preserve local draft
- continue to show an actionable error banner in the existing save-error pattern

### 13.3 Upload overlap

If a question or explanation image upload is still pending when the autosave timer fires:

- skip that autosave attempt
- wait for the next cycle or manual save

This avoids saving stale media-path state mid-upload.

## 14. Testing Strategy

### Sidebar tests

- product shell renders a visible toggle control
- toggling collapse hides the sidebar visually and keeps the restore control accessible
- remounting the shell preserves the collapse preference from local storage

### Scheduled editor tests

- local draft payload round-trips with the new autosave metadata fields
- autosave for a new event creates once, stores `persistedEventId`, and later updates instead of creating again
- autosave success does not navigate away from the editor
- manual save after autosave still navigates to the event list
- autosave failure keeps local draft data intact
- autosave does not run while upload mutation is pending

### Verification focus

The most important regressions to guard against are:

- duplicate server events created from `/new`
- autosave unexpectedly redirecting to the event list
- manual save stopping its expected redirect behavior
- local draft state being cleared too early

## 15. Implementation Notes

Suggested sequencing:

1. extend local draft payload and tests
2. add sidebar collapse state, toggle UI, and persistence
3. add autosave status state and dirty-tracking metadata
4. wire the 5-minute backend autosave loop
5. route manual save through the persisted event id when present
6. expand tests for autosave and navigation invariants

## 16. Local Review Notes

This spec was reviewed locally against:

- the current mentor shell structure
- the scheduled event editor restore flow
- the existing scheduled event upsert API contract
- the user-locked distinction between autosave and manual save navigation behavior

The key invariants are:

- sidebar collapse must be reversible from the current page
- autosave must be silent and non-navigating
- manual save must still return to the event list
- first successful autosave from `/new` must establish a single server event identity for all later saves

## 17. Approval Gate

This spec is ready for user review. After user approval of the written spec, the next step should be a dedicated implementation plan for the sidebar collapse and scheduled event autosave changes.
