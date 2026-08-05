# Scheduled Event Editor Recovery Design

Date: 2026-05-16
Status: Draft for user review

## 1. Summary

This design updates the scheduled event editor so it behaves like an event-owned authoring surface instead of a copy of the normal tryout question bank editor.

The new behavior is:

1. scheduled event questions no longer use `blok` and `materi` categorization in the editor
2. the `Tambah soal` action moves from the top metadata card into the footer of the last question card
3. in-progress editor work is stored automatically in browser-local draft storage and restored after refresh, reconnect, or accidental tab closure on the same device and browser
4. successful event saves clear the matching local draft so stale form data does not reappear

This change is intentionally local to the scheduled event manager and must not change the normal tryout or normal question-bank authoring flows.

## 2. Goals

### Primary Goals

- remove question-bank-only categorization from scheduled event authoring
- reduce scrolling friction when building longer scheduled events
- prevent accidental data loss when the editor reloads mid-authoring
- keep the backend payload and save flow compatible with the current scheduled event RPC contract

### Non-Goals

- adding backend autosave or cross-device draft sync
- redesigning the overall scheduled event manager information architecture
- changing the student scheduled tryout runtime or review behavior
- changing the normal bank soal editor under `/admin`

## 3. Scope

### In Scope

- scheduled event editor page UI changes in [scheduled-event-editor-page.tsx](</E:/Projek TRY OYT/src/pages/scheduled-ops/scheduled-event-editor-page.tsx:1>)
- local draft storage helpers for the scheduled event editor
- editor validation updates so scheduled questions no longer require `blockId` or `topicId`
- page tests covering hidden categorization fields, last-card add button behavior, draft restore, and draft cleanup after save

### Out of Scope

- schema changes to remove nullable `block_id` or `topic_id` from stored scheduled question rows
- replacing existing image upload behavior
- regenerating expired signed image URLs as part of the first recovery iteration

## 4. Product Decisions Locked

- scheduled event authoring must not ask users to choose `blok` or `materi`
- the scheduled event editor keeps the event metadata card at the top
- `Tambah soal` lives inside the last visible question card, not in the metadata card and not as a detached bottom-of-page action
- local draft recovery targets the same browser on the same device only
- the editor should restore draft data automatically without requiring a separate recovery modal
- draft data must be isolated between `new` and `edit` routes, and between different edited events

## 5. Current State

### 5.1 Editor structure

The current scheduled editor in [scheduled-event-editor-page.tsx](</E:/Projek TRY OYT/src/pages/scheduled-ops/scheduled-event-editor-page.tsx:1>) has:

- one metadata card at the top
- a `Tambah soal` button inside that metadata card
- one card per question
- required `blok` and `materi` selectors for each scheduled question

That means scheduled events currently inherit authoring assumptions from the normal question-bank flow even though scheduled questions are supposed to be self-owned by the event.

### 5.2 Existing API contract

The current scheduled event mutation contract in [scheduled-tryout-api.ts](</E:/Projek TRY OYT/src/lib/api/scheduled-tryout-api.ts:1>) already treats `blockId` and `topicId` as optional nullable fields.

This is important because the planned change does not require a breaking RPC or schema rewrite. The editor can stop collecting those values while the backend continues accepting nulls safely.

### 5.3 Existing local storage pattern

The project already uses `localStorage` in [preview-session.ts](</E:/Projek TRY OYT/src/lib/preview-session.ts:1>) for browser-local persisted state. That gives us an existing project pattern for lightweight persistence without introducing backend draft state.

### 5.4 Documentation context checked

React persistence guidance was checked through Context7 against the official React docs. The relevant design takeaway is:

- state should initialize locally and synchronize to external browser storage through `useEffect`
- synchronization logic should avoid overwriting incoming async data during hydration

That fits this editor because edit mode receives server-loaded data after mount, while local draft recovery also needs to run safely.

## 6. Recommended Approach

Use a **UI-local recovery layer** inside the scheduled event editor:

- keep the event metadata card at the top
- remove the categorization controls from each question card
- add a footer action row only to the last question card
- persist the full editor form state to `localStorage`
- restore matching local draft state during mount with event-aware guards

This approach is preferred because it gives the user the requested recovery behavior without introducing backend draft complexity or cross-device sync rules.

## 7. Experience Design

### 7.1 Metadata card

The top metadata card continues to contain:

- `Judul event`
- `Status`
- `Deskripsi singkat`
- `Akses mulai`
- `Akses selesai`
- computed duration summary

It should no longer contain the `Tambah soal` button.

### 7.2 Question cards

Each question card keeps:

- question stem
- option inputs A-E
- correct answer selector
- explanation text
- question image upload
- explanation image upload

Each question card removes:

- `Blok soal`
- `Materi soal`

The last visible question card gets an extra footer row containing:

- an autosave status hint such as `Draft tersimpan otomatis`
- the `Tambah soal` button

Earlier question cards do not show that footer action row.

### 7.3 Recovery behavior

When the user types in the editor:

- the current form state is saved automatically to browser-local storage

When the page refreshes or reloads in the same browser:

- the editor restores the matching draft automatically

When the user saves successfully:

- the matching draft entry is removed from local storage

When the user abandons the page without saving:

- the draft remains available for later continuation on that same browser

## 8. Draft Storage Design

### 8.1 Storage keys

Use route-aware storage keys:

- `scheduled-event-editor:draft:new` for `/scheduled-ops/events/new`
- `scheduled-event-editor:draft:<eventId>` for `/scheduled-ops/events/:eventId/edit`

This avoids collisions between:

- new-event drafts
- edit-mode drafts
- different scheduled events

### 8.2 Stored payload

Persist:

- `eventId`
- `updatedAt`
- the full editor `formState`

The stored `formState` should include:

- event metadata fields
- every question row
- option values
- correct answer keys
- explanation text
- uploaded media path and signed URL values

### 8.3 Restore rules

For `new` mode:

- restore the local draft immediately if present and valid

For `edit` mode:

- wait for server editor data to hydrate first
- restore only if the draft belongs to the same `eventId`
- prefer the local draft after hydration because the user explicitly asked for their in-progress work to survive refresh/disconnect

If the draft payload is invalid JSON or missing expected shape:

- discard it silently and fall back to normal initialization

## 9. Validation And Save Behavior

### 9.1 Form validation changes

The scheduled event builder should still require:

- title
- access start
- access end
- at least one question
- non-empty stem per question
- at least two non-empty options per question
- a correct answer key that points to a filled option

The builder should no longer require:

- `blockId`
- `topicId`

### 9.2 Payload behavior

The save payload may:

- omit `blockId` and `topicId` entirely
- or pass them as null if the shared payload builder still includes those properties

Either path is acceptable because the current scheduled API contract already tolerates nullable category fields.

### 9.3 Save success cleanup

After `createScheduledEvent` or `updateScheduledEvent` succeeds:

- clear the matching draft key from local storage
- navigate back to `/scheduled-ops/events` as the current page already does

## 10. Edge Cases

### 10.1 Edit-mode race

Risk:

- server-loaded edit data can arrive after the component mounts and overwrite a restored draft

Required behavior:

- restore logic must be explicitly ordered so the intended local draft wins only for the matching event

### 10.2 Stale media preview URLs

Risk:

- signed URLs stored in the draft may expire before the page is reopened

First-iteration handling:

- restore text fields and stored paths normally
- allow image preview to remain best-effort
- defer signed URL refresh-by-path to a follow-up change if needed

### 10.3 Invalid draft payload

Risk:

- malformed browser storage can break the editor

Required behavior:

- parse defensively
- ignore invalid payloads
- remove obviously corrupt values when safe

## 11. Testing Strategy

### Page tests

- scheduled editor hides `Blok soal` and `Materi soal`
- `Tambah soal` appears only in the last question card
- clicking `Tambah soal` appends a question and moves the action footer to the new last card
- entering text, unmounting, and remounting restores the draft in `new` mode
- edit mode restores only the matching event draft
- successful save clears the stored draft

### API-adjacent tests

- mutation input no longer requires category fields for scheduled questions
- existing create and update flows still send valid question payloads

## 12. Implementation Notes

Suggested sequencing:

1. add local draft helpers and storage guards
2. update the editor form initialization and restore ordering
3. remove category fields and validation requirements
4. move `Tambah soal` into the last question card footer
5. extend tests for restore and cleanup behavior

Risks to watch:

- overwriting restored draft state during edit-mode hydration
- leaving stale drafts behind after save
- accidentally changing normal bank-soal authoring behavior while simplifying scheduled editor assumptions

## 13. Local Review Notes

This spec was reviewed locally against the requested scope and the current scheduled event API contract.

The intended invariants are:

- no scheduled-event-only UI should depend on normal tryout taxonomy selection
- recovery stays browser-local and does not imply backend autosave support
- the saved payload remains compatible with the existing nullable scheduled question category fields

## 14. Approval Gate

This spec is ready for user review. After the user approves it, the next step should be a dedicated implementation plan for the scheduled event editor changes.
