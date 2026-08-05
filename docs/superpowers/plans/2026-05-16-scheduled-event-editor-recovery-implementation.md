# Scheduled Event Editor Recovery Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove scheduled-event-only category fields, move the add-question action into the last question card, and preserve in-progress editor work across refreshes in the same browser.

**Architecture:** Keep the scheduled event editor as the only place that knows about browser-local recovery. A small draft-storage helper owns `localStorage` parsing and keying, while the page owns hydrate-vs-restore ordering, last-card action placement, and draft cleanup after successful saves. The existing scheduled event RPC contract remains unchanged because category fields are already nullable.

**Tech Stack:** React 19, React Router 7, TanStack React Query 5, TypeScript, Vitest, Testing Library.

---

## File Structure

- Create: `src/lib/scheduled-event-editor-draft.ts`
  Responsibility: draft key generation, payload validation, safe read/write/remove helpers for scheduled event editor recovery.
- Create: `src/lib/scheduled-event-editor-draft.test.ts`
  Responsibility: unit coverage for safe local-storage parsing, route-aware keys, and cleanup behavior.
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
  Responsibility: remove taxonomy-dependent category controls, restore matching drafts, autosave form state, move `Tambah soal` into the last question card, and clear drafts after save.
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`
  Responsibility: page-level coverage for hidden fields, last-card action placement, new-mode restore, edit-mode restore ordering, and draft cleanup after save.
- Optional modify only if implementation needs stronger typing: `src/lib/api/scheduled-tryout-api.ts`
  Responsibility: keep scheduled mutation types aligned if the page stops sending category properties entirely.

## Chunk 1: Red Tests

### Task 1: Add draft helper tests first

**Files:**
- Create: `src/lib/scheduled-event-editor-draft.test.ts`
- Create: `src/lib/scheduled-event-editor-draft.ts`

- [ ] Write failing tests for `buildScheduledEventDraftStorageKey`, valid draft parsing, invalid payload rejection, and remove behavior.
- [ ] Model both `new` and `edit` keys so collisions between routes are impossible.
- [ ] Run: `npx vitest run src/lib/scheduled-event-editor-draft.test.ts`
- [ ] Confirm the suite fails because the helper module is missing or incomplete.

### Task 2: Expand editor page tests around the requested UX

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`

- [ ] Add a failing test that asserts `Blok soal 1` and `Materi soal 1` are no longer rendered in the scheduled editor.
- [ ] Add a failing test that asserts `Tambah soal` appears only in the last question card and moves to the new last card after one click.
- [ ] Add a failing test that types draft data in `/scheduled-ops/events/new`, unmounts, remounts, and expects the same browser draft to be restored automatically.
- [ ] Add a failing test that seeds an edit draft for `/scheduled-ops/events/event-9/edit`, loads server data, and expects the matching local draft to win for that same event.
- [ ] Add a failing test that verifies a successful save clears the matching draft storage key.
- [ ] Run: `npx vitest run src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`
- [ ] Confirm the failures are caused by the current missing recovery behavior and old button placement.

## Chunk 2: Green Helper Implementation

### Task 3: Implement the browser draft helper

**Files:**
- Create: `src/lib/scheduled-event-editor-draft.ts`
- Test: `src/lib/scheduled-event-editor-draft.test.ts`

- [ ] Define a narrow persisted payload type containing `eventId`, `updatedAt`, and `formState`.
- [ ] Implement a key builder that returns `scheduled-event-editor:draft:new` for create mode and `scheduled-event-editor:draft:<eventId>` for edit mode.
- [ ] Implement safe `read`, `write`, and `clear` helpers that no-op during SSR and ignore malformed JSON.
- [ ] Guard parsing with shape checks so corrupt `localStorage` never breaks the editor render path.
- [ ] Re-run: `npx vitest run src/lib/scheduled-event-editor-draft.test.ts`
- [ ] Confirm the helper suite passes cleanly.

## Chunk 3: Green Editor Implementation

### Task 4: Remove taxonomy-driven category requirements from the page

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
- Optional modify: `src/lib/api/scheduled-tryout-api.ts`

- [ ] Remove `listQuestionTaxonomy` and the scheduled editor's taxonomy query if nothing else in the page depends on them.
- [ ] Delete `blockId` and `topicId` from the page-level question form state and from `emptyQuestion()`.
- [ ] Simplify `buildInput()` so scheduled questions require stem, at least two non-empty options, and a valid answer key, but no longer require category fields.
- [ ] Stop rendering `Blok soal` and `Materi soal` inputs in every question card.
- [ ] If TypeScript requires it, keep the API mutation types optional rather than forcing null category values back into the page.

### Task 5: Add restore, autosave, and cleanup ordering

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
- Modify: `src/lib/scheduled-event-editor-draft.ts`

- [ ] Initialize create-mode form state from a matching `new` draft if one exists.
- [ ] In edit mode, wait for `editorQuery.data` hydration, then merge in the matching local draft for the same `eventId` so server data from another event never overwrites the user's current draft.
- [ ] Add a `useEffect` that writes the latest form state to the matching draft key after form changes.
- [ ] Avoid writing incomplete edit-mode placeholders before server hydration by gating autosave until the page knows whether it is in `new` mode or has finished loading `edit` mode data.
- [ ] In the save mutation success path, clear the matching draft key before navigating back to `/scheduled-ops/events`.

### Task 6: Move the add-question action into the last question card

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`

- [ ] Remove the metadata-card `Tambah soal` button.
- [ ] Render an action footer only when `questionIndex === formState.questions.length - 1`.
- [ ] Place `Draft tersimpan otomatis` copy and the `Tambah soal` button in that footer.
- [ ] Keep the computed duration pill in the metadata card so the top summary stays familiar.
- [ ] Re-run: `npx vitest run src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`
- [ ] Confirm the page suite passes with the new layout and restore behavior.

## Chunk 4: Verification

### Task 7: Prove the implementation across helper and page layers

**Files:**
- No new files.

- [ ] Run: `npx vitest run src/lib/scheduled-event-editor-draft.test.ts src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`
- [ ] Run: `npm run build`
- [ ] Verify there are no leftover imports, unused taxonomy mocks, or failing type checks from the removed category fields.
- [ ] Summarize any remaining risk, especially that restored image previews may still depend on signed URL freshness after long delays.

## Notes For Execution

- Use @test-driven-development for every behavioral change in this plan: write the failing draft helper tests and page tests before touching implementation.
- Keep the draft helper browser-local and editor-specific. Do not generalize it into a global persistence abstraction unless the existing implementation proves duplication immediately.
- Do not touch the normal bank-soal editor under `/admin` while making the scheduled editor leaner.
- If edit-mode restore ordering becomes messy inside the page component, split the restore logic into a small local helper rather than stacking unrelated `useEffect` branches in one block.

Plan complete and saved to `docs/superpowers/plans/2026-05-16-scheduled-event-editor-recovery-implementation.md`. Ready to execute?
