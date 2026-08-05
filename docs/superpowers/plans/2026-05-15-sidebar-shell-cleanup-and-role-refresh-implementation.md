# Sidebar Shell Cleanup and Role Refresh Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove non-essential sidebar status/debug panels across all shells, make the desktop sidebar flush-left, and eliminate mentor-to-pro role flicker during rapid tab switching.

**Architecture:** Keep the shell cleanup focused in the layout layer so route pages do not own sidebar chrome details. Handle role flicker at the refresh/data-preservation boundary by deduping focus bursts and preserving the last resolved role during background refreshes instead of resetting shell state.

**Tech Stack:** React 19, React Router 7, TanStack Query v5, TypeScript, Vitest, Testing Library, Tailwind utility classes

---

## File Structure

### Layout shells

- Modify: `src/components/layout/product-shell.tsx`
  Student and mentor shell chrome. Remove status/debug/sprint sections and apply the flush-left desktop layout.
- Modify: `src/components/layout/admin-shell.tsx`
  Admin shell chrome. Remove status/debug sections and align the desktop shell with the flush-left treatment.
- Modify: `src/components/layout/marketing-shell.tsx`
  Public shell. Remove the debug `SupabaseSourceNotice` block so the public module matches the “all modules” requirement.

### Shell consumers and shell metadata

- Modify: `src/pages/app/dashboard-page.tsx`
  Stop passing removed shell props and route dashboard tier/nav through the stabilized shell role flow.
- Modify: `src/pages/app/analytics-page.tsx`
- Modify: `src/pages/app/leaderboard-page.tsx`
- Modify: `src/pages/app/review-page.tsx`
- Modify: `src/pages/app/tryout-catalog-page.tsx`
- Modify: `src/pages/app/tryout-session-page.tsx`
- Modify: `src/pages/app/tryout-result-page.tsx`
- Modify: `src/pages/profile-page.tsx`
- Modify: `src/pages/admin/admin-dashboard-page.tsx`
- Modify: `src/pages/admin/payments-page.tsx`
- Modify: `src/pages/admin/questions-page.tsx`
- Modify: `src/pages/admin/question-editor-page.tsx`
- Modify: `src/pages/admin/users-page.tsx`
  Remove now-dead `statusLabel`, `statusIcon`, `sprintTitle`, `sprintIcon`, `sprintItems`, and `sidebarStatusIcon` props at call sites.
- Modify: `src/mocks/student-dashboard.ts`
  Remove unused shell metadata and sprint mock data that only existed for the sidebar panel.
- Modify: `src/mocks/admin-content.ts`
  Remove unused admin shell status metadata if no longer consumed.

### Focus refresh and role stabilization

- Modify: `src/lib/use-window-focus-refresh.ts`
  Deduplicate near-simultaneous `focus` and `visibilitychange` events so rapid `Alt+Tab` only triggers one refresh.
- Modify: `src/pages/app/use-student-shell.ts`
  Preserve the last resolved role while profile refetch is in flight, and become the canonical source of stable student-shell role state.
- Modify: `src/pages/app/dashboard-page.tsx`
  Reuse the stabilized shell role logic instead of reading `profileQuery.data?.role` directly.
- Modify: `src/pages/profile-page.tsx`
  Preserve the last resolved role for mentor/pro shell rendering during focus refresh.
- Modify: `src/router/route-guards.tsx`
  Keep the current access-refresh behavior, but verify it does not induce duplicate focus-triggered access refreshes after the dedupe change.

### Debug UI cleanup

- Delete: `src/components/ui/supabase-source-notice.tsx`
- Delete: `src/components/ui/supabase-source-notice.test.tsx`
  The “Sumber data aktif” panel must disappear from all modules. Keep the lower-level source helper only if it still serves future diagnostics.

### Tests

- Create: `src/components/layout/product-shell.test.tsx`
- Create: `src/components/layout/admin-shell.test.tsx`
  Focused shell tests for panel removal and desktop wrapper classes.
- Modify: `src/pages/home-page.test.tsx`
  Assert the public shell no longer renders the Supabase source notice.
- Modify: `src/router/app-router.test.tsx`
  Cover shell cleanup indirectly on authenticated student/admin routes and add the role flicker regression around rapid focus bursts.
- Modify: `src/pages/profile-page.test.tsx`
  Verify focus refresh preserves mentor/pro shell role instead of falling back to `Pro`.
- Modify: `src/pages/app/dashboard-page.test.tsx`
  Verify dashboard shell role stays stable through refetch.

## Chunk 1: Remove Sidebar Status, Debug, and Sprint UI

### Task 1: Add failing shell cleanup tests

**Files:**
- Create: `src/components/layout/product-shell.test.tsx`
- Create: `src/components/layout/admin-shell.test.tsx`
- Modify: `src/pages/home-page.test.tsx`

- [ ] **Step 1: Write the failing product shell test**

```tsx
test("does not render sesi aktif, sumber data aktif, or sprint hari ini", () => {
  render(
    <MemoryRouter>
      <ProductShell brand="Pawang" tierLabel="Mentor" navItems={[]} >
        <div>Body</div>
      </ProductShell>
    </MemoryRouter>,
  )

  expect(screen.queryByText(/sesi aktif/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/sumber data aktif/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/sprint hari ini/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Write the failing admin shell test**

```tsx
test("does not render mode admin status chrome or source panel", () => {
  render(
    <MemoryRouter>
      <AdminShell title="Admin" description="Desc" navItems={[]}>
        <div>Body</div>
      </AdminShell>
    </MemoryRouter>,
  )

  expect(screen.queryByText(/sumber data aktif/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 3: Extend the home page test to assert the public shell does not render the source notice**

```tsx
expect(screen.queryByText(/sumber data aktif/i)).not.toBeInTheDocument()
expect(screen.queryByText(/supabase cloud/i)).not.toBeInTheDocument()
```

- [ ] **Step 4: Run tests to verify they fail**

Run:
```bash
npm test -- --run src/components/layout/product-shell.test.tsx src/components/layout/admin-shell.test.tsx src/pages/home-page.test.tsx
```

Expected: FAIL because the existing shells still render the removed sections or still require old props.

### Task 2: Remove shell chrome and dead props

**Files:**
- Modify: `src/components/layout/product-shell.tsx`
- Modify: `src/components/layout/admin-shell.tsx`
- Modify: `src/components/layout/marketing-shell.tsx`
- Modify: `src/mocks/student-dashboard.ts`
- Modify: `src/mocks/admin-content.ts`
- Modify: `src/pages/app/dashboard-page.tsx`
- Modify: `src/pages/app/analytics-page.tsx`
- Modify: `src/pages/app/leaderboard-page.tsx`
- Modify: `src/pages/app/review-page.tsx`
- Modify: `src/pages/app/tryout-catalog-page.tsx`
- Modify: `src/pages/app/tryout-session-page.tsx`
- Modify: `src/pages/app/tryout-result-page.tsx`
- Modify: `src/pages/profile-page.tsx`
- Modify: `src/pages/admin/admin-dashboard-page.tsx`
- Modify: `src/pages/admin/payments-page.tsx`
- Modify: `src/pages/admin/questions-page.tsx`
- Modify: `src/pages/admin/question-editor-page.tsx`
- Modify: `src/pages/admin/users-page.tsx`
- Delete: `src/components/ui/supabase-source-notice.tsx`
- Delete: `src/components/ui/supabase-source-notice.test.tsx`

- [ ] **Step 1: Simplify `ProductShellProps` and remove the status/debug/sprint render branches**

```tsx
type ProductShellProps = {
  children: ReactNode
  brand: string
  tierLabel: string
  navItems: ProductShellNavItem[]
}
```

- [ ] **Step 2: Simplify `AdminShellProps` and remove status/debug render branches**

```tsx
type AdminShellProps = {
  children: ReactNode
  title: string
  description: string
  navItems: AdminShellNavItem[]
}
```

- [ ] **Step 3: Remove `SupabaseSourceNotice` from `MarketingShell`**

```tsx
// delete the import and the rendered notice block below the brand copy
```

- [ ] **Step 4: Remove dead shell metadata from mocks and stop passing dead props from route pages**

Run a focused grep after edits:
```bash
rg -n "statusLabel=|statusIcon=|sprintTitle=|sprintIcon=|sprintItems=|sidebarStatusIcon=" src
```

Expected: no remaining shell prop call sites for those removed props.

- [ ] **Step 5: Run tests to verify the cleanup passes**

Run:
```bash
npm test -- --run src/components/layout/product-shell.test.tsx src/components/layout/admin-shell.test.tsx src/pages/home-page.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit the cleanup chunk**

```bash
git add src/components/layout/product-shell.tsx src/components/layout/admin-shell.tsx src/components/layout/marketing-shell.tsx src/mocks/student-dashboard.ts src/mocks/admin-content.ts src/pages/app/dashboard-page.tsx src/pages/app/analytics-page.tsx src/pages/app/leaderboard-page.tsx src/pages/app/review-page.tsx src/pages/app/tryout-catalog-page.tsx src/pages/app/tryout-session-page.tsx src/pages/app/tryout-result-page.tsx src/pages/profile-page.tsx src/pages/admin/admin-dashboard-page.tsx src/pages/admin/payments-page.tsx src/pages/admin/questions-page.tsx src/pages/admin/question-editor-page.tsx src/pages/admin/users-page.tsx src/components/layout/product-shell.test.tsx src/components/layout/admin-shell.test.tsx src/pages/home-page.test.tsx
git commit -m "refactor: remove shell status and debug panels"
```

## Chunk 2: Make Desktop Shells Flush-Left

### Task 3: Add failing layout assertions

**Files:**
- Modify: `src/components/layout/product-shell.test.tsx`
- Modify: `src/components/layout/admin-shell.test.tsx`

- [ ] **Step 1: Add the failing product shell desktop layout assertion**

```tsx
expect(screen.getByRole("main")).toHaveClass("min-h-[100dvh]")
expect(screen.getByTestId("product-shell-sidebar")).toHaveClass("lg:border-r")
expect(screen.getByTestId("product-shell-content")).toHaveClass("lg:px-8")
```

Note: introduce stable `data-testid` attributes only if class-based targeting becomes too brittle.

- [ ] **Step 2: Add the failing admin shell desktop layout assertion**

```tsx
expect(screen.getByTestId("admin-shell-frame")).toHaveClass("xl:grid-cols-[18rem_minmax(0,1fr)]")
expect(screen.getByTestId("admin-shell-sidebar")).not.toHaveClass("rounded-[2rem]")
```

- [ ] **Step 3: Run tests to verify they fail**

Run:
```bash
npm test -- --run src/components/layout/product-shell.test.tsx src/components/layout/admin-shell.test.tsx
```

Expected: FAIL because the existing wrappers still use the floating-card desktop layout.

### Task 4: Apply the flush-left desktop layout

**Files:**
- Modify: `src/components/layout/product-shell.tsx`
- Modify: `src/components/layout/admin-shell.tsx`

- [ ] **Step 1: Update `ProductShell` wrapper classes so the left column visually starts at the viewport edge on desktop**

```tsx
<div className="grid min-h-[100dvh] lg:grid-cols-[17.5rem_minmax(0,1fr)]">
  <aside className="... lg:border-r">
  <div className="px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
```
Keep the content padding on the right side; do not add an extra outer desktop gutter on the left.

- [ ] **Step 2: Update `AdminShell` wrapper classes so the sidebar is flush-left while the content surface remains padded**

```tsx
<main className="min-h-[100dvh] ... text-[var(--color-cream)]">
  <div className="grid min-h-[100dvh] xl:grid-cols-[18rem_minmax(0,1fr)]">
    <aside className="border-r ...">
```

- [ ] **Step 3: Re-run the shell layout tests**

Run:
```bash
npm test -- --run src/components/layout/product-shell.test.tsx src/components/layout/admin-shell.test.tsx
```

Expected: PASS

- [ ] **Step 4: Run a targeted app route smoke test**

Run:
```bash
npm test -- --run src/router/app-router.test.tsx src/pages/profile-page.test.tsx
```

Expected: PASS, proving the shell shape change did not break route rendering.

- [ ] **Step 5: Commit the layout chunk**

```bash
git add src/components/layout/product-shell.tsx src/components/layout/admin-shell.tsx src/components/layout/product-shell.test.tsx src/components/layout/admin-shell.test.tsx
git commit -m "feat: make desktop shells flush left"
```

## Chunk 3: Stabilize Role Refresh During Rapid Tab Switching

### Task 5: Add failing focus-burst regression tests

**Files:**
- Modify: `src/router/app-router.test.tsx`
- Modify: `src/pages/app/dashboard-page.test.tsx`
- Create: `src/lib/use-window-focus-refresh.test.tsx`

- [ ] **Step 1: Add a failing hook test that emits `focus` and `visibilitychange` back-to-back**

```tsx
test("dedupes rapid focus and visibilitychange bursts into one refresh", () => {
  // render a probe that counts refreshVersion changes
  // fire focus + set document.visibilityState to visible + dispatch visibilitychange
  // expect only one bump
})
```

- [ ] **Step 2: Add a failing app-router regression test for mentor users**

```tsx
test("does not flash pro before returning to mentor during focus refresh", async () => {
  setAuthenticatedSession("mentor", "active")
  // queue profile refetches that keep mentor
  renderApp("/app")
  fireEvent(window, new Event("focus"))
  fireEvent(document, new Event("visibilitychange"))
  expect(screen.queryByText(/^pro$/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 3: Add a failing dashboard regression test that preserves the last known mentor tier label while profile refetch is pending**

```tsx
expect(screen.getByText(/^mentor$/i)).toBeInTheDocument()
// trigger refetch
expect(screen.queryByText(/^pro$/i)).not.toBeInTheDocument()
```

- [ ] **Step 4: Run the regression tests to verify they fail**

Run:
```bash
npm test -- --run src/lib/use-window-focus-refresh.test.tsx src/router/app-router.test.tsx src/pages/app/dashboard-page.test.tsx
```

Expected: FAIL because focus bursts can currently double-bump refresh and the shell can temporarily fall back to `Pro`.

### Task 6: Implement deduped focus refresh and stable role preservation

**Files:**
- Modify: `src/lib/use-window-focus-refresh.ts`
- Modify: `src/pages/app/use-student-shell.ts`
- Modify: `src/pages/app/dashboard-page.tsx`
- Modify: `src/pages/profile-page.tsx`
- Modify: `src/router/route-guards.tsx`

- [ ] **Step 1: Add burst dedupe in `useWindowFocusRefresh`**

```tsx
const lastRefreshAtRef = useRef(0)
const cooldownMs = 250

function bumpRefreshVersion() {
  const now = Date.now()
  if (now - lastRefreshAtRef.current < cooldownMs) return
  lastRefreshAtRef.current = now
  setRefreshVersion((current) => current + 1)
}
```

- [ ] **Step 2: Preserve the last resolved role in `useStudentShell`**

```tsx
const [lastResolvedRole, setLastResolvedRole] = useState<UserRole | null>(null)

useEffect(() => {
  if (profileQuery.data?.role) {
    setLastResolvedRole(profileQuery.data.role)
  }
}, [profileQuery.data?.role])

const role = profileQuery.data?.role ?? lastResolvedRole
```

- [ ] **Step 3: Make the dashboard use the stabilized student shell role path instead of directly reading `profileQuery.data?.role`**

Prefer one of these minimal approaches:
- reuse `useStudentShell("/app")` and extend its return value with `role`
- or extract a tiny shared hook such as `useStableProfileRole`

Do not duplicate separate “stable role” logic in both dashboard and shell if one focused helper can serve both.

- [ ] **Step 4: Preserve last valid mentor/pro role on `ProfilePage` during refetch**

Apply the same last-known-role rule to the shell-selection path so the profile surface does not change shells while a refresh is in flight.

- [ ] **Step 5: Verify `route-guards.tsx` still refreshes access once per focus burst without resetting UI state**

Keep the existing effect-driven access hydration, but let the deduped hook reduce duplicate triggers.

- [ ] **Step 6: Run regression tests to verify they pass**

Run:
```bash
npm test -- --run src/lib/use-window-focus-refresh.test.tsx src/router/app-router.test.tsx src/pages/app/dashboard-page.test.tsx src/pages/profile-page.test.tsx src/pages/subscription-page.test.tsx
```

Expected: PASS

- [ ] **Step 7: Commit the focus-stability chunk**

```bash
git add src/lib/use-window-focus-refresh.ts src/lib/use-window-focus-refresh.test.tsx src/pages/app/use-student-shell.ts src/pages/app/dashboard-page.tsx src/pages/profile-page.tsx src/router/route-guards.tsx src/router/app-router.test.tsx src/pages/app/dashboard-page.test.tsx src/pages/profile-page.test.tsx src/pages/subscription-page.test.tsx
git commit -m "fix: stabilize shell role during focus refresh"
```

## Chunk 4: Final Verification and Handoff

### Task 7: Run the complete verification set

**Files:**
- No code changes expected

- [ ] **Step 1: Run the targeted shell and route suite**

```bash
npm test -- --run src/components/layout/product-shell.test.tsx src/components/layout/admin-shell.test.tsx src/pages/home-page.test.tsx src/router/app-router.test.tsx src/pages/app/dashboard-page.test.tsx src/pages/profile-page.test.tsx src/pages/subscription-page.test.tsx src/lib/use-window-focus-refresh.test.tsx
```

Expected: PASS

- [ ] **Step 2: Run a production build**

```bash
npm run build
```

Expected: build succeeds with exit code 0

- [ ] **Step 3: Review the diff for dead imports and removed prop references**

```bash
rg -n "SupabaseSourceNotice|statusLabel=|statusIcon=|sprintTitle=|sprintIcon=|sprintItems=|sidebarStatusIcon=" src
```

Expected:
- no remaining `SupabaseSourceNotice`
- no stale shell prop call sites
- allowed hits only for unrelated domain/data `statusLabel` fields such as question/payment statuses

- [ ] **Step 4: Commit the verification checkpoint if any final cleanup was needed**

```bash
git add .
git commit -m "chore: finish sidebar shell cleanup rollout"
```

Use this step only if verification required a final cleanup edit.

## Notes for the Implementer

- Use `@superpowers:test-driven-development` for every behavioral change in this plan.
- Use `@superpowers:systematic-debugging` if the focus-burst regression behaves differently than expected in tests.
- Use `@superpowers:verification-before-completion` before claiming the rollout is complete.
- Do not touch mobile navigation structure beyond what naturally follows from the desktop shell wrapper edits.
- Do not delete the low-level `src/lib/supabase/source.ts` helper unless a separate cleanup decision is made; only remove the end-user debug UI.

Plan complete and saved to `docs/superpowers/plans/2026-05-15-sidebar-shell-cleanup-and-role-refresh-implementation.md`. Ready to execute?
