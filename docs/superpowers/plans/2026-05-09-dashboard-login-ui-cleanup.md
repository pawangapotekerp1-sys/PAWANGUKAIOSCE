# Dashboard and Login UI Cleanup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the requested temporary UI elements from the main dashboard and login page without changing the working email login and password reset flow.

**Architecture:** Keep the cleanup scoped to the two page components that render the affected UI. Preserve existing routing and auth behavior, and update tests first so the removals are verified explicitly.

**Tech Stack:** React 19, React Router 7, Vitest, Testing Library, Tailwind utility classes

---

## Chunk 1: Dashboard shell cleanup

### Task 1: Remove the sprint panel from the main dashboard route only

**Files:**
- Modify: `src/pages/app/dashboard-page.tsx`
- Test: `src/pages/app/dashboard-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Add an assertion that `Sprint hari ini` is not rendered in the dashboard route output.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/app/dashboard-page.test.tsx`
Expected: FAIL because the current shell still renders the sprint panel.

- [ ] **Step 3: Write minimal implementation**

Stop passing sprint props into the dashboard page shell by making them optional in the shell interface and only rendering the sprint section when those props exist.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/app/dashboard-page.test.tsx`
Expected: PASS

## Chunk 2: Login page cleanup

### Task 2: Remove delayed helper and placeholder login/signup UI

**Files:**
- Create: `src/pages/auth/login-page.test.tsx`
- Modify: `src/pages/auth/login-page.tsx`
- Modify: `src/pages/subscription-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a dedicated login page test asserting the page keeps email login and forgot-password controls, while not rendering:
- the top Supabase helper paragraph
- the email helper paragraph
- the password helper paragraph
- the Google placeholder button
- the sign-up card and `Daftar` link

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/auth/login-page.test.tsx src/pages/subscription-page.test.tsx`
Expected: FAIL because those elements are still visible.

- [ ] **Step 3: Write minimal implementation**

Delete the requested copy and placeholder UI from the login page, keeping only the active login and reset-password interaction.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/auth/login-page.test.tsx src/pages/subscription-page.test.tsx`
Expected: PASS

## Chunk 3: Final verification

### Task 3: Verify the targeted behavior end-to-end at test level

**Files:**
- Test: `src/pages/app/dashboard-page.test.tsx`
- Test: `src/pages/auth/login-page.test.tsx`
- Test: `src/pages/subscription-page.test.tsx`
- Test: `src/pages/auth/reset-password-page.test.tsx`

- [ ] **Step 1: Run the targeted suite**

Run: `npm test -- src/pages/app/dashboard-page.test.tsx src/pages/auth/login-page.test.tsx src/pages/subscription-page.test.tsx src/pages/auth/reset-password-page.test.tsx`

- [ ] **Step 2: Confirm outcomes**

Expected:
- dashboard still renders core sections
- dashboard no longer shows `Sprint hari ini`
- login page still renders email, password, submit, and forgot-password actions
- login page no longer shows the postponed helper or placeholder signup/social UI
- password reset request flow still passes
