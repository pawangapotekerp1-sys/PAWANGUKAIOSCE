# Unified Modern Loading Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace legacy cream-colored loading and error screens with a modern, glassmorphic `FullPageLoader` component featuring the Bowl of Hygieia logo and sleek micro-animations.

**Architecture:** Create a standalone reusable component `FullPageLoader` in `src/components/ui/full-page-loader.tsx`, then swap all route-suspense fallbacks in `src/router/app-router.tsx` and route guard states in `src/router/route-guards.tsx`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Vitest, React Testing Library.

## Global Constraints
- Use `bg-clinical-surface` for theme consistency.
- No hardcoded cream gradients (`rgba(242,232,201,...)`).
- Accessible loading labels and ARIA attributes (`role="status"` / `role="alert"`).

---

### Task 1: Build `FullPageLoader` Component

**Files:**
- Create: `src/components/ui/full-page-loader.tsx`
- Test: `src/components/ui/full-page-loader.test.tsx`

**Interfaces:**
- Produces: `FullPageLoader` component with `title?: string`, `description?: string`, `variant?: "loading" | "error"`, `errorDetails?: string`.

- [ ] **Step 1: Write the failing test for FullPageLoader**

Create `src/components/ui/full-page-loader.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FullPageLoader from "./full-page-loader";

describe("FullPageLoader", () => {
  it("renders default loading state with Hygieia icon and title", () => {
    render(<FullPageLoader />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Menyiapkan Ruang Belajar...")).toBeInTheDocument();
    expect(screen.getByText(/halaman sedang dimuat agar pengalaman belajar/i)).toBeInTheDocument();
  });

  it("renders error state when variant is error", () => {
    render(
      <FullPageLoader
        variant="error"
        title="Akses Belum Diverifikasi"
        description="Gagal memverifikasi akun Anda."
      />
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Akses Belum Diverifikasi")).toBeInTheDocument();
    expect(screen.getByText("Gagal memverifikasi akun Anda.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/full-page-loader.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Write implementation for `FullPageLoader`**

Create `src/components/ui/full-page-loader.tsx`:
```tsx
import type { ReactNode } from "react";

export type FullPageLoaderProps = {
  title?: string;
  description?: string;
  variant?: "loading" | "error";
  errorDetails?: string;
  children?: ReactNode;
};

export default function FullPageLoader({
  title = "Menyiapkan Ruang Belajar...",
  description = "Halaman sedang dimuat agar pengalaman belajar Anda tetap cepat & responsif.",
  variant = "loading",
  errorDetails,
  children,
}: FullPageLoaderProps) {
  const isError = variant === "error";

  return (
    <main
      role={isError ? "alert" : "status"}
      aria-live="polite"
      className="relative flex min-h-[100dvh] w-full items-center justify-center bg-clinical-surface px-4 py-8 text-foreground overflow-hidden"
    >
      {/* Glowing Ambient Mesh Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-[120px] transition-all duration-700"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px] transition-all duration-700"
      />

      {/* Glassmorphic Container Card */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center rounded-3xl border border-border/50 bg-card/80 p-8 shadow-2xl shadow-primary/5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Icon Header */}
        <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
          {!isError && (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping opacity-30"
            />
          )}
          {/* Bowl of Hygieia Icon */}
          <svg
            viewBox="0 0 100 100"
            className="h-9 w-9 text-primary fill-current transition-transform duration-300"
            aria-hidden="true"
          >
            <path d="M42 22 L58 22 C64 22 68 25 71 30 C74 36 75 44 73 51 C70 60 62 67 52 68 L52 76 L66 76 C68 76 70 78 70 80 C70 82 68 84 66 84 L34 84 C32 84 30 82 30 80 C30 78 32 76 34 76 L48 76 L48 68 C38 67 30 60 27 51 C25 44 26 36 29 30 C32 25 36 22 42 22 Z M43 26 C38 26 34 29 32 33 C30 38 29 44 31 50 C33 57 40 63 50 63 C60 63 67 57 69 50 C71 44 70 38 68 33 C66 29 62 26 57 26 Z" />
            <path d="M50 14 C48 10 44 7 40 7 C34 7 30 11 30 16 C30 20 33 24 37 27 C42 30 46 34 46 40 C46 47 41 52 35 54 L36 57 C44 55 50 49 50 40 C50 32 44 28 40 25 C36 22 34 20 34 16 C34 13 37 10 40 10 C43 10 45 12 47 15 Z" />
          </svg>
        </div>

        {/* Shimmering Indeterminate Progress Bar */}
        {!isError && (
          <div className="mb-6 h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-muted/60 relative">
            <div className="absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r from-primary/40 via-primary to-primary/40 animate-[shimmer_1.5s_infinite] -translate-x-full" />
          </div>
        )}

        {/* Title and Description */}
        <h2 className="text-xl font-extrabold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed max-w-sm">
          {description}
        </p>

        {errorDetails && (
          <div className="mt-4 w-full rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs font-medium text-destructive">
            {errorDetails}
          </div>
        )}

        {children}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/full-page-loader.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/full-page-loader.tsx src/components/ui/full-page-loader.test.tsx
git commit -m "feat(ui): add FullPageLoader component with Hygieia branding"
```

---

### Task 2: Integrate `FullPageLoader` in App Router and Route Guards

**Files:**
- Modify: `src/router/app-router.tsx:49-61`
- Modify: `src/router/route-guards.tsx:33-48`

- [ ] **Step 1: Update `RouteLoadingState` in `src/router/app-router.tsx`**

Replace `RouteLoadingState` implementation with `<FullPageLoader />`:
```tsx
import FullPageLoader from "../components/ui/full-page-loader";

function RouteLoadingState() {
  return <FullPageLoader />;
}
```

- [ ] **Step 2: Update `GuardErrorState` in `src/router/route-guards.tsx`**

Replace `GuardErrorState` implementation with `<FullPageLoader variant="error" />`:
```tsx
import FullPageLoader from "../components/ui/full-page-loader";

function GuardErrorState({
  message,
  title,
}: {
  message: string;
  title: string;
}) {
  return (
    <FullPageLoader
      variant="error"
      title={title}
      description={message}
    />
  );
}
```

- [ ] **Step 3: Run existing router and route-guard tests**

Run: `npx vitest run src/router/`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/router/app-router.tsx src/router/route-guards.tsx
git commit -m "refactor(router): replace cream loading/error screens with unified FullPageLoader"
```

---

### Task 3: Full Verification & Cleanup

- [ ] **Step 1: Check codebase for any remaining `rgba(242,232,201` cream gradients**

Run: `grep -rn "rgba(242,232,201" src/`
Expected: No cream background occurrences in loading or guard screens.

- [ ] **Step 2: Run all page and router tests**

Run: `npx vitest run src/components/ui/full-page-loader.test.tsx`
Expected: All tests pass cleanly.

- [ ] **Step 3: Final Commit**

```bash
git commit --allow-empty -m "chore: verified unified loading page integration"
```
