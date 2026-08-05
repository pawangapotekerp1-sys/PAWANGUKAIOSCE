# User Profile Page Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task.

**Goal:** Modernize the User Profile Page (`profile-page.tsx`) to strictly use standard Shadcn components (`Card`, `Input`, `Label`, `Alert`) and standard Tailwind utility classes (`bg-background`, `text-foreground`), completely purging legacy inline `rgba(...)` styles and custom CSS variables like `var(--color-outline)`.

**Context:** The Profile page is one of the oldest and largest files remaining that still heavily relies on `SurfacePanel`, `StatePanel`, `MetricPill`, and `var(--color-...)` tokens. It also contains a fallback layout for users without a role, which currently uses an aggressive legacy gradient background.

---

### Task 1: Refactor `ProfileSurface` (Fallback Layout)

**Files:**
- Modify: `src/pages/profile-page.tsx`

- [ ] **Step 1: Rewrite the Fallback Layout**
Currently, when a user is new (role is not admin/pro/mentor), it renders:
```tsx
<main className="min-h-[100dvh] bg-[linear-gradient(180deg,_rgba(242,232,201,0.98),_rgba(230,224,203,0.94))] ...">
  <header className="rounded-[2rem] border border-[var(--color-outline-soft)] bg-[rgba(255,252,244,0.8)] ...">
```
Rewrite this to use a standard semantic `min-h-[100dvh] bg-background` and replace the header with a modern header container, keeping it clean and Shadcn-aligned. (e.g. `border-border bg-card shadow-sm rounded-xl`).
Change all text colors from `var(--color-outline)` and `var(--color-ink-muted)` to `text-foreground` and `text-muted-foreground`.

---

### Task 2: Refactor Profile Loading/Error States

**Files:**
- Modify: `src/pages/profile-page.tsx`

- [ ] **Step 1: Purge `StatePanel`**
In `ProfilePage`, replace `<StatePanel variant="loading">` and `<StatePanel variant="error">` with standard modern equivalents.
- For loading: Use a centered block with `Loader2` from `lucide-react`.
- For error: Use `<Alert variant="destructive">`.

---

### Task 3: Refactor "Identitas Akun" & Form Cards

**Files:**
- Modify: `src/pages/profile-page.tsx`

- [ ] **Step 1: Identity Card Refactoring**
Replace the first `<SurfacePanel tone="accent">` with a `<Card className="bg-primary/5 border-primary/20">`.
Replace `<MetricPill>` with `<Badge>`.
Remove custom `bg-[rgba(242,232,201,0.14)]` and `text-[var(--color-gold)]` for the avatar fallback. Use standard `bg-primary/10 text-primary` or similar.
Remove `bg-[rgba(242,232,201,0.08)]` block, replace with `bg-background/50 rounded-xl`.

- [ ] **Step 2: Form Cards Refactoring**
Replace the remaining `<SurfacePanel>` instances for "Nama Tampilan", "Alias Leaderboard", and "Ganti Password" with standard `<Card>`.
Ensure all typography inside them uses `text-foreground` and `text-muted-foreground` instead of `var(--color-outline)`.
Ensure Shadcn `<Label>` and `<Input>` are properly mapped.

- [ ] **Step 3: Logout Card Refactoring**
Replace the `<SurfacePanel tone="warm">` (Logout section) with `<Card className="border-destructive/20 bg-destructive/5">`.
Ensure typography is standardized.

---

## Verification Plan
1. Ensure `profile-page.tsx` is completely free of `rgba(...)` and `var(--color-...)`.
2. Run `npm run build` to guarantee no TS errors.
3. Test locally in the browser to ensure the Profile page renders correctly.
