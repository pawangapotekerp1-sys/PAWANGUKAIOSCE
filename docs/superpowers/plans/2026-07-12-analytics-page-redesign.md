# Analytics Page Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task.

**Goal:** Modernize the Analytics Page (`analytics-page.tsx`) and its corresponding diagnosis components to strictly use standard Shadcn components (`Card`, `Badge`, `Input`) and standard Tailwind utility classes (`bg-background`, `text-foreground`), completely purging legacy inline `rgba(...)` styles and custom CSS variables like `var(--color-outline)`.

**Context:** The Analytics page is currently a mix of semi-refactored `SurfacePanel`/`StatePanel` components and untouched diagnosis components (`diagnosis-hero-card`, `subtopic-ranking-list`, etc.) that are still heavily polluted with legacy inline CSS and `rgba()` values. 

---

### Task 1: Refactor `analytics-page.tsx`

**Files:**
- Modify: `src/pages/app/analytics-page.tsx`

- [ ] **Step 1: Replace Legacy Wrappers**
Replace all `<SurfacePanel>` wrappers inside `analytics-page.tsx` with standard Shadcn `<Card>` components. For example, change:
```tsx
<SurfacePanel as="article" className="mt-6 px-5 py-5" tone="default">
```
To:
```tsx
<Card className="mt-6">
  <CardContent className="pt-6">
```
Ensure text colors use `text-foreground` and `text-muted-foreground` instead of `var(--color-outline)`.

- [ ] **Step 2: Replace `StatePanel` with `Alert` or Standard Divs**
Replace `<StatePanel variant="loading">` with a centered block featuring a spinning `Loader2` from `lucide-react`.
Replace `<StatePanel variant="error">` and `<StatePanel variant="empty">` with `<Alert variant="destructive">` and `<Alert variant="default">` respectively. Ensure the action buttons are properly placed inside.

---

### Task 2: Refactor `DiagnosisRangeControls`

**Files:**
- Modify: `src/components/diagnosis/diagnosis-range-controls.tsx`

- [ ] **Step 1: Rewrite Component**
Replace `SurfacePanel` with `<Card>`.
Replace the custom `rgba()` inputs with Shadcn `<Input type="date">`.
Update the layout to look like a modern filter bar (e.g., `<Card className="mt-6 p-4">`).

---

### Task 3: Refactor `DiagnosisHeroCard` & `GlobalBehaviorPanel`

**Files:**
- Modify: `src/components/diagnosis/diagnosis-hero-card.tsx`
- Modify: `src/components/diagnosis/global-behavior-panel.tsx`

- [ ] **Step 1: Purge Inline CSS in `DiagnosisHeroCard`**
Remove `SurfacePanel tone="accent"`. Wrap the hero section in a `<Card className="mt-6 bg-primary text-primary-foreground">`.
Rewrite the 3 inner grid boxes to use `bg-white/10 border-white/20`.
Replace behavior pattern pills with `<Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">`.

- [ ] **Step 2: Purge Inline CSS in `GlobalBehaviorPanel`**
Replace `SurfacePanel` with `<Card>`.
Rewrite the pattern boxes from `bg-[rgba(255,252,244,0.76)]` to `<div className="rounded-xl border bg-muted/50 p-4">`.
Use standard `<Badge>` for severity labels.

---

### Task 4: Refactor `SubtopicRankingList`

**Files:**
- Modify: `src/components/diagnosis/subtopic-ranking-list.tsx`

- [ ] **Step 1: Purge Inline CSS**
Replace `SurfacePanel tone="warm"` with `<Card>`.
Rewrite the `SubtopicCard` component:
- Remove `bg-[rgba(...)]` and `border-[rgba(...)]`. Use `<div className="rounded-xl border bg-muted/50 p-4">`.
- Change `text-[var(--color-outline)]` to `text-foreground`.
- Change `text-[var(--color-teal-deep)]` to `text-primary`.
- Use `<Badge>` components for `behaviorFlags` and `confidence` labels instead of custom spans with `rgba()`.

---

## Verification Plan
1. Ensure all 5 files are completely free of `rgba(...)` and `var(--color-...)` custom values.
2. Run `npm run build` to guarantee no TS errors or unresolved Shadcn imports.
3. Test locally in the browser to ensure the Analytics Page renders beautifully and the date pickers function correctly.
