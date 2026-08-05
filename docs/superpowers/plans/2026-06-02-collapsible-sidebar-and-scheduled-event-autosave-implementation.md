# Collapsible Sidebar And Scheduled Event Autosave Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible mentor sidebar plus silent 5-minute scheduled-event backend autosave while preserving local draft recovery, preventing duplicate event creation, keeping autosave on-page, and keeping manual save redirect behavior.

**Architecture:** Keep sidebar behavior isolated inside the mentor `ProductShell` with a small browser-local preference key. Keep scheduled-event persistence isolated inside the scheduled event editor and its draft helper, where local draft storage remains immediate and backend autosave reuses the existing `createScheduledEvent` and `updateScheduledEvent` API contract through a persisted server event identity. Separate autosave and manual-save success paths so autosave only updates status metadata while manual save still clears the draft and navigates back to the list.

**Tech Stack:** React 19, React Router 7, TanStack React Query 5, TypeScript, Vitest, Testing Library, localStorage-backed browser persistence.

---

## File Structure

- Modify: `src/components/layout/product-shell.tsx`
  Responsibility: own sidebar collapse state, toggle control, persisted preference read/write, and responsive shell layout classes.
- Modify: `src/components/layout/product-shell.test.tsx`
  Responsibility: cover sidebar toggle visibility, collapse behavior, and persisted preference restore.
- Modify: `src/lib/scheduled-event-editor-draft.ts`
  Responsibility: extend draft payload with persisted server identity and server-save metadata while keeping safe parse/write/clear semantics.
- Modify: `src/lib/scheduled-event-editor-draft.test.ts`
  Responsibility: unit coverage for the extended draft payload and backward-safe parsing behavior.
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
  Responsibility: own autosave status state, dirty tracking, 5-minute backend autosave interval, create-then-update routing for `/new`, upload overlap guard, and manual-save redirect invariants.
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`
  Responsibility: page-level coverage for autosave non-navigation, create-then-update reuse, manual-save redirect, upload overlap skip, and local draft persistence invariants.
- Optional modify only if type extraction reduces page complexity: `src/lib/api/scheduled-tryout-api.ts`
  Responsibility: preserve clear typed boundaries for scheduled event payload reuse if helper types are extracted.

## Chunk 1: Sidebar Collapse

### Task 1: Write sidebar collapse tests first

**Files:**
- Modify: `src/components/layout/product-shell.test.tsx`

- [ ] Add a failing test that renders `ProductShell`, finds a single sidebar toggle control, clicks it, and asserts the sidebar switches to the collapsed state while the restore control remains accessible.
- [ ] Add a failing test that seeds `localStorage` with the sidebar-collapsed preference before render and asserts the shell restores the collapsed layout on mount.
- [ ] Keep the existing assertions for brand, nav visibility, and logout button so the new behavior does not weaken current shell guarantees.
- [ ] Run: `npx vitest run src/components/layout/product-shell.test.tsx`
- [ ] Confirm the suite fails because the current shell has no toggle or persisted collapse behavior.

### Task 2: Implement sidebar collapse in the mentor shell

**Files:**
- Modify: `src/components/layout/product-shell.tsx`
- Test: `src/components/layout/product-shell.test.tsx`

- [ ] Add a narrow browser-safe helper inside the component or as tiny local functions to read and write `product-shell:sidebar-collapsed`.
- [ ] Initialize sidebar state from `localStorage` on mount without breaking server-safe rendering.
- [ ] Add one arrow-based toggle control that flips the collapse state and persists the new preference.
- [ ] Keep the sidebar mounted in the DOM and switch its layout with transform/width classes so it slides left instead of disappearing abruptly.
- [ ] Ensure the restore control remains reachable from the content edge when collapsed.
- [ ] Re-run: `npx vitest run src/components/layout/product-shell.test.tsx`
- [ ] Confirm the sidebar suite passes with both default and restored-collapsed states.

### Task 3: Verify shell behavior and checkpoint the work

**Files:**
- No new files.

- [ ] Run: `npm run build`
- [ ] Check that the shell still compiles cleanly and no other layout imports were accidentally broken.
- [ ] Stage only `src/components/layout/product-shell.tsx` and `src/components/layout/product-shell.test.tsx`.
- [ ] Commit:

```bash
git add src/components/layout/product-shell.tsx src/components/layout/product-shell.test.tsx
git commit -m "feat: add collapsible mentor sidebar"
```

## Chunk 2: Draft Metadata Extension

### Task 4: Write failing tests for extended draft metadata

**Files:**
- Modify: `src/lib/scheduled-event-editor-draft.test.ts`

- [ ] Add a failing test that writes and reads a valid draft payload containing `persistedEventId` and `lastServerSavedAt`.
- [ ] Add a failing test that proves older payloads without the new metadata still read safely if backward compatibility is preserved during parsing.
- [ ] Keep the key-isolation and clear-key coverage intact.
- [ ] Run: `npx vitest run src/lib/scheduled-event-editor-draft.test.ts`
- [ ] Confirm the suite fails until the helper accepts the new metadata.

### Task 5: Extend the draft helper safely

**Files:**
- Modify: `src/lib/scheduled-event-editor-draft.ts`
- Test: `src/lib/scheduled-event-editor-draft.test.ts`

- [ ] Extend the persisted payload type with `persistedEventId` and `lastServerSavedAt`.
- [ ] Update the runtime shape guards so these fields are optional or nullable where needed, allowing existing stored drafts to remain readable.
- [ ] Keep browser-only access guarded behind `hasWindow()`.
- [ ] Re-run: `npx vitest run src/lib/scheduled-event-editor-draft.test.ts`
- [ ] Confirm the helper suite passes cleanly.

### Task 6: Checkpoint the draft metadata work

**Files:**
- No new files.

- [ ] Stage only `src/lib/scheduled-event-editor-draft.ts` and `src/lib/scheduled-event-editor-draft.test.ts`.
- [ ] Commit:

```bash
git add src/lib/scheduled-event-editor-draft.ts src/lib/scheduled-event-editor-draft.test.ts
git commit -m "feat: extend scheduled event draft metadata"
```

## Chunk 3: Autosave Red Tests

### Task 7: Add failing page tests for backend autosave behavior

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`

- [ ] Add fake-timer based coverage for the 5-minute interval using `vi.useFakeTimers()` and restore timers after each affected test.
- [ ] Add a failing test for `/scheduled-ops/events/new` that fills a valid draft, advances time by 5 minutes, expects `createScheduledEvent` once, then changes a field, advances time again, and expects `updateScheduledEvent` instead of a second create.
- [ ] Add a failing test that proves autosave success does not navigate away from the editor route.
- [ ] Add a failing test that proves clicking `Simpan event` after autosave-created state navigates to the event list.
- [ ] Add a failing test that makes autosave fail and confirms local draft data remains in `localStorage`.
- [ ] Add a failing test that keeps the upload mutation pending when the timer fires and confirms no autosave request is made during the upload window.
- [ ] Run: `npx vitest run src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`
- [ ] Confirm the new failures point to missing autosave state management rather than unrelated regressions.

## Chunk 4: Autosave Green Implementation

### Task 8: Introduce explicit autosave state and persisted server identity

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
- Modify: `src/lib/scheduled-event-editor-draft.ts`

- [ ] Add page state for `persistedEventId`, last successful server save timestamp, and autosave status copy or enum.
- [ ] Initialize `persistedEventId` from the restored draft when present, or from `eventId` in edit mode if that keeps logic simpler.
- [ ] Ensure every local draft write stores the newest `persistedEventId` and `lastServerSavedAt` alongside `formState`.
- [ ] Keep the existing local draft write-on-change behavior intact so browser-local recovery remains immediate.

### Task 9: Separate backend autosave payload building from manual-save flow

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
- Optional modify: `src/lib/api/scheduled-tryout-api.ts`

- [ ] Extract or clarify the payload-building logic so both autosave and manual save can reuse it without duplicating validation rules.
- [ ] Preserve strict eligibility rules for backend autosave: title, access window, at least one question, non-empty stem, two populated options, and a correct answer mapped to a populated option.
- [ ] Add a dirty/fingerprint check so the timer no-ops if nothing changed since the last successful backend save.
- [ ] Guard backend autosave while media upload is pending or while an autosave request is already in flight.

### Task 10: Wire the 5-minute autosave interval with React 19 patterns

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
- Test: `src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`

- [ ] Create an autosave callback with `useEffectEvent` so the interval always sees the latest form state and status flags.
- [ ] Create the 5-minute interval in `useEffect` and clean it up on unmount.
- [ ] For `/new`, call `createScheduledEvent` only on the first successful eligible autosave and store the returned id as `persistedEventId`.
- [ ] After `persistedEventId` exists, route future autosaves through `updateScheduledEvent`.
- [ ] For edit mode, update the existing event directly and never navigate.
- [ ] Update autosave status text on pending, success, and failure without touching the current route.

### Task 11: Preserve manual-save redirect behavior

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
- Test: `src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`

- [ ] Update `handleSave()` so it prefers `updateScheduledEvent` when `persistedEventId` already exists, even if the page is still on `/new`.
- [ ] Keep the success path that clears the matching draft and navigates to `/scheduled-ops/events`.
- [ ] Ensure autosave success never calls the navigate branch and never clears the draft.
- [ ] Re-run: `npx vitest run src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`
- [ ] Confirm the autosave and manual-save navigation invariants now pass.

### Task 12: Checkpoint autosave implementation

**Files:**
- No new files.

- [ ] Stage only the scheduled-event editor files touched in this chunk.
- [ ] Commit:

```bash
git add src/lib/scheduled-event-editor-draft.ts src/lib/scheduled-event-editor-draft.test.ts src/pages/scheduled-ops/scheduled-event-editor-page.tsx src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx
git commit -m "feat: add scheduled event backend autosave"
```

## Chunk 5: Full Verification

### Task 13: Run focused tests for both feature areas

**Files:**
- No new files.

- [ ] Run: `npx vitest run src/components/layout/product-shell.test.tsx src/lib/scheduled-event-editor-draft.test.ts src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx`
- [ ] Confirm all targeted tests pass.

### Task 14: Run type/build verification

**Files:**
- No new files.

- [ ] Run: `npm run build`
- [ ] Confirm there are no TypeScript or Vite build regressions from the new shell state, fake-timer tests, or autosave branching.

### Task 15: Perform manual behavior checks

**Files:**
- No new files.

- [ ] Start the app with `npm run dev`.
- [ ] Verify on a mentor-visible page that the sidebar collapses left, can be restored from the remaining edge control, and stays collapsed after route navigation or refresh.
- [ ] Verify in `Scheduled Event Manager` create mode that typing continues to update browser-local draft data immediately.
- [ ] Verify that after a valid 5-minute autosave window, the editor stays on the same page and shows a saved status instead of redirecting.
- [ ] Verify that pressing `Simpan event` still returns the user to `/scheduled-ops/events`.
- [ ] Verify that repeating save after an autosave-created draft does not create duplicate events in the list.

### Task 16: Final implementation notes for handoff

**Files:**
- No new files.

- [ ] Summarize any residual risk, especially around expired image signed URLs in long-lived drafts and the fact that backend autosave only runs after the draft becomes save-eligible.
- [ ] If any manual test uncovered friction in the autosave status copy, capture the final wording change in the implementation summary.

## Notes For Execution

- Use @test-driven-development for both feature areas. Do not implement sidebar toggle logic or autosave routing before the relevant tests fail first.
- Keep the shell change and scheduled-event editor change decoupled in commits even though they live in one plan.
- Do not introduce a new backend drafts table or route rewrite during autosave. The plan relies on the existing `upsert_scheduled_tryout_event` contract only.
- Avoid broad refactors in `scheduled-event-editor-page.tsx`. If the file becomes difficult to reason about, extract only the smallest local helpers needed for payload eligibility, autosave status formatting, or dirty-key computation.
- Respect the existing dirty worktree. Do not revert or reformat unrelated files while executing this plan.

Plan complete and saved to `docs/superpowers/plans/2026-06-02-collapsible-sidebar-and-scheduled-event-autosave-implementation.md`. Ready to execute?
