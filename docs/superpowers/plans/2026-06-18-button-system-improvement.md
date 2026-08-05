# Button System Improvement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable button primitive with clear hierarchy and migrate the shared confirm dialog to it without changing business logic.

**Architecture:** Add one focused `Button` primitive under `src/components/ui` with visual variants, sizes, loading, and full-width support. Keep rollout intentionally narrow by applying it only to `ConfirmDialog` first, while verifying the shared primitive contract and dialog behavior through existing Vitest coverage.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4 utility classes, Vitest, Testing Library

---

## Chunk 1: Shared Button Primitive

### Task 1: Add button primitive coverage

**Files:**
- Modify: `src/components/ui/ui-primitives.test.tsx`
- Test: `src/components/ui/ui-primitives.test.tsx`

- [ ] **Step 1: Write the failing test**

Add tests that expect a new `Button` primitive to:
- expose `data-variant`
- render loading text without dropping disabled semantics
- support full-width and icon slots cleanly

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ui/ui-primitives.test.tsx --run`
Expected: FAIL because `Button` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/ui/button.tsx` with:
- `variant`: `primary | secondary | outline | ghost | destructive`
- `size`: `sm | md | lg`
- `loading?: boolean`
- `fullWidth?: boolean`
- `leadingIcon?` and `trailingIcon?`
- native button props pass-through

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/ui/ui-primitives.test.tsx --run`
Expected: PASS

### Task 2: Migrate shared confirm dialog

**Files:**
- Modify: `src/components/ui/confirm-dialog.tsx`
- Modify: `src/components/ui/confirm-dialog.test.tsx`

- [ ] **Step 1: Write the failing test**

Update the confirm dialog test to assert:
- cancel action uses a lower-emphasis variant
- confirm action uses the destructive variant
- pending state still preserves semantics

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ui/confirm-dialog.test.tsx --run`
Expected: FAIL because the dialog still uses inline button styling.

- [ ] **Step 3: Write minimal implementation**

Replace inline dialog buttons with the new `Button` primitive while keeping:
- focus restore
- escape handling
- destructive action callback flow unchanged

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/ui/confirm-dialog.test.tsx --run`
Expected: PASS

## Chunk 2: Verification

### Task 3: Run focused regression coverage

**Files:**
- Test: `src/components/ui/ui-primitives.test.tsx`
- Test: `src/components/ui/confirm-dialog.test.tsx`
- Test: `src/pages/admin/questions-page.test.tsx`
- Test: `src/pages/scheduled-ops/scheduled-events-page.test.tsx`

- [ ] **Step 1: Run focused tests**

Run: `npm test -- src/components/ui/ui-primitives.test.tsx src/components/ui/confirm-dialog.test.tsx src/pages/admin/questions-page.test.tsx src/pages/scheduled-ops/scheduled-events-page.test.tsx --run`
Expected: PASS

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: PASS
