# Auth Pages Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task.

**Goal:** Overhaul the Authentication Flow (`login-page.tsx` and `reset-password-page.tsx`) to strictly use Shadcn UI primitives, standard Tailwind variable classes (e.g., `bg-primary` instead of `bg-clinical-accent`), and Lucide icons.

**Context:** The `login-page.tsx` was partially refactored in a previous phase but still uses Phosphor icons and custom `clinical-*` Tailwind aliases. The `reset-password-page.tsx` is completely legacy (using `SurfacePanel`, `rgba(...)` inline styles, etc).

---

### Task 1: Standardize Login Page (`login-page.tsx`)

**Files:**
- Modify: `src/pages/auth/login-page.tsx`

- [ ] **Step 1: Replace Icons**
Change `@phosphor-icons/react` imports to `lucide-react`:
`ArrowRight`, `Info`, `Lock`, `Send` (for PaperPlaneTilt), `UserCircle`, `AlertCircle` (for WarningCircle).

- [ ] **Step 2: Replace `MetricPill` with `Badge`**
Remove `MetricPill` import and replace its usage with a Shadcn `<Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">`.

- [ ] **Step 3: Standardize Tailwind Classes**
The file currently uses `clinical-*` custom classes. Replace them with standard Shadcn equivalents:
- `bg-clinical-bg` -> `bg-background`
- `bg-clinical-surface` -> `bg-muted/50`
- `text-clinical-text-primary` -> `text-foreground`
- `text-clinical-text-secondary` -> `text-muted-foreground`
- `border-clinical-border` -> `border-border`
- `text-clinical-accent`, `bg-clinical-accent`, `focus-visible:ring-clinical-accent` -> `text-primary`, `bg-primary`, `focus-visible:ring-primary`
- `bg-clinical-accent-dark` -> `bg-primary/90`
- Alerts: Use `variant="destructive"` instead of custom error classes. Use `variant="default"` for success/info messages.

*Keep the 50/50 split layout and cyan gradients on the right side.*

---

### Task 2: Refactor Reset Password Page (`reset-password-page.tsx`)

**Files:**
- Modify: `src/pages/auth/reset-password-page.tsx`

- [ ] **Step 1: Import Standard Components**
Remove `SurfacePanel`, `MetricPill`, Phosphor icons.
Import `Card`, `Input`, `Label`, `Alert`, `Button`, and Lucide icons (`ArrowRight`, `Lock`, `AlertCircle`, `CheckCircle2`).

- [ ] **Step 2: Rewrite JSX**
Replace the entire JSX block with a centered Shadcn `Card` layout.

```tsx
<main className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
  <Card className="w-full max-w-md shadow-lg border-border">
     <CardHeader className="space-y-4">
        {/* Badge: Atur ulang kata sandi */}
        {/* Title: Buat kata sandi baru */}
        {/* Description: Masukkan kata sandi baru... */}
     </CardHeader>
     <CardContent>
        {/* Form elements using <Label> and <Input> */}
        {/* Alerts for error and success */}
     </CardContent>
  </Card>
</main>
```
*Ensure the business logic (React Hooks) is completely untouched.*

---

## Verification Plan
1. Ensure both `login-page.tsx` and `reset-password-page.tsx` compile correctly (`npm run build`).
2. Verify visual layout in browser at `/auth/login` and `/auth/reset-password`.
