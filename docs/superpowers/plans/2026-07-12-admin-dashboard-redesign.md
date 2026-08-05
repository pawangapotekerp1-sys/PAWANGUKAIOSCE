# Admin Dashboard Page Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task.

**Goal:** Modernize the Admin Dashboard Page (`admin-dashboard-page.tsx`) to strictly use standard Shadcn components (`Card`, `Alert`, `Badge`) and standard Tailwind utility classes (`bg-background`, `text-foreground`), completely purging legacy inline `rgba(...)` styles and custom CSS variables like `var(--color-outline)` and `var(--color-accent-ink-soft)`.

**Context:** The Admin Dashboard displays high-level system metrics, user/review pulse, and payment queues. Currently, it is deeply coupled with the old `SurfacePanel` design logic, including complex nested `rgba` background overlays and the deprecated `StatePanel` for data-fetching states.

---

### Task 1: Refactor Loading/Error/Empty States

**Files:**
- Modify: `src/pages/admin/admin-dashboard-page.tsx`

- [ ] **Step 1: Purge `StatePanel` usages**
Replace all five instances of `<StatePanel>` in the Admin Dashboard:
- For loading state (`overviewQuery.isLoading` or `queueView === "loading"`): Replace with a modern centered card layout containing a `<Loader2>` spinner from `lucide-react` (rather than Phosphor's).
- For error state: Replace with `<Alert variant="destructive">` containing an `<AlertCircle>`.
- For empty state: Replace with `<Alert>` or a subtle `<Card>` indicating no payments are pending.
- Ensure the "Lihat pembayaran" action buttons are preserved using the standard `<Link>` with `getButtonStyleProps`.

---

### Task 2: Refactor Metrics & Pulse Cards

**Files:**
- Modify: `src/pages/admin/admin-dashboard-page.tsx`

- [ ] **Step 1: Refactor Metrics Grid**
Replace the `<SurfacePanel>` wrappers iterating over `overview.metrics` with standard `<Card>` components.
Replace `<MetricPill>` with Shadcn `<Badge>`.
Replace text styling `text-[var(--color-outline)]` with `text-foreground`.

- [ ] **Step 2: Refactor Pulse Highlights ("Sorotan hari ini")**
Replace the `<SurfacePanel tone="accent">` wrapper with a standard `<Card className="bg-primary/5 border-primary/20">` or similar semantic alternative.
Remove `rgba(242,232,201,0.08)` and `rgba(244,197,66,0.18)` backgrounds. Use standard Tailwind background utilities (e.g., `bg-background/50` or `bg-card`).
Change Phosphor icons to Lucide equivalents if possible, or adapt existing ones to match the text color (e.g. `text-primary`).

---

### Task 3: Refactor Payment Queue Preview

**Files:**
- Modify: `src/pages/admin/admin-dashboard-page.tsx`

- [ ] **Step 1: Refactor Payment List Items**
Replace the wrapping `<SurfacePanel>` with a `<Card>`.
Replace the inner queue items `bg-[rgba(255,252,244,0.76)]` and `border-[rgba(15,46,47,0.08)]` with semantic standard `<div className="rounded-xl border border-border bg-muted/50 p-4">`.
Ensure typography inside the queue preview uses `text-foreground` and `text-muted-foreground` instead of `var(--color-ink-muted)`.
Replace `<MetricPill>` inside the payment list with `<Badge>`.

---

## Verification Plan
1. Ensure `admin-dashboard-page.tsx` is completely free of `rgba(...)` and `var(--color-...)`.
2. Run `npm run build` to guarantee no TS errors and no missing imports.
3. Test locally in the browser to ensure the Admin Dashboard layout renders beautifully.
