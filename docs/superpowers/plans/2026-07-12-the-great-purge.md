# The Great Purge: Final Elimination of Legacy Components

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task concurrently using multiple subagents.

**Goal:** Eradicate the last 22 remaining files that depend on `SurfacePanel`, `StatePanel`, and `MetricPill`, allowing us to finally delete these legacy components from the codebase permanently without breaking the build.

**Strategy:** The work is purely mechanical and cosmetic. We will use standard Shadcn equivalents (`Card`, `Badge`, `Alert`, `lucide-react` icons, `bg-background`, `text-foreground`). Because there are 22 files, the work is divided into 6 independent task batches that can be executed concurrently by subagents.

---

### Task 1: Scheduled Tryout Module (4 files)

**Files:**
- `src/pages/app/scheduled-tryout-catalog-page.tsx`
- `src/pages/app/scheduled-tryout-leaderboard-page.tsx`
- `src/pages/app/scheduled-tryout-result-page.tsx`
- `src/pages/app/scheduled-tryout-session-page.tsx`

**Instructions:**
- Replace `<SurfacePanel>` with standard `<Card>` or `<div>`.
- Replace `<StatePanel>` with `<Alert variant="destructive">` (for errors), `<Alert>` (for empty), or `<Loader2>` spinner block (for loading).
- Replace `<MetricPill>` with `<Badge>`.
- Remove all `var(--color-outline)` and `rgba()` inline classes, use Tailwind `text-foreground`, `bg-card`, etc.
- Replace Phosphor icons with Lucide icons.

---

### Task 2: Flash Card Module (5 files)

**Files:**
- `src/pages/app/flash-card-deck-page.tsx`
- `src/pages/app/flash-card-generator-create-page.tsx`
- `src/pages/app/flash-card-generator-page.tsx`
- `src/pages/app/flash-card-generator-review-page.tsx`
- `src/pages/app/flash-cards-page.tsx`

**Instructions:**
- Apply the same mechanical translations (SurfacePanel -> Card, StatePanel -> Alert/Loader, MetricPill -> Badge).
- Strip out CSS variables `var(--color-...)` and `rgba()`.
- Replace Phosphor icons with Lucide equivalents.

---

### Task 3: Admin & Ops Modules (6 files)

**Files:**
- `src/pages/admin/payments-page.tsx`
- `src/pages/admin/question-editor-page.tsx`
- `src/pages/admin/questions-page.tsx`
- `src/pages/admin/users-page.tsx`
- `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
- `src/pages/scheduled-ops/scheduled-events-page.tsx`

**Instructions:**
- Convert tables wrapped in `SurfacePanel` to be wrapped in `<Card>`.
- Replace loading/error/empty `StatePanel` components.
- Replace `MetricPill` inside tables/headers with `<Badge>`.
- Ensure all text and borders use standard Tailwind colors.

---

### Task 4: Misc App Pages (2 files)

**Files:**
- `src/pages/app/leaderboard-page.tsx`
- `src/pages/app/review-page.tsx`

**Instructions:**
- Replace `StatePanel` for the loading/error states of the leaderboard and review views.
- Replace `SurfacePanel` and `MetricPill`.
- Purge any Phosphor icons and inline colors.

---

### Task 5: Core Pages (2 files)

**Files:**
- `src/pages/home-page.tsx`
- `src/pages/subscription-page.tsx`

**Instructions:**
- Convert `SurfacePanel` sections to `<Card>` or clean `<div>` sections with standard Shadcn backgrounds (`bg-card`, `bg-muted`).
- Replace any usage of `StatePanel` or `MetricPill`.
- Ensure public-facing home page still looks elegant and uses `text-foreground`, `text-muted-foreground`.

---

### Task 6: Routing & Tests (3 files)

**Files:**
- `src/router/app-router.tsx`
- `src/router/route-guards.tsx`
- `src/components/ui/ui-primitives.test.tsx`

**Instructions:**
- In the router/guards: Replace `<StatePanel>` with a simple clean loading spinner or `<Alert>` centered on the screen using standard HTML/Tailwind.
- In the test file: Completely delete the import and test suites for `SurfacePanel`, `StatePanel`, and `MetricPill`. Do not delete other valid tests.

---

### Task 7: Final Deletion (Execution by Main Agent)
Once all 6 tasks are complete and merged, the main agent will:
1. Run `rm src/components/ui/metric-pill.tsx src/components/ui/state-panel.tsx src/components/ui/surface-panel.tsx`
2. Run `npm run build` to verify 100% success.
