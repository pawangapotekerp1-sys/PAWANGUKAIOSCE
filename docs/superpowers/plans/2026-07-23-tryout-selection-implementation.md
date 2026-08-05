# Tryout Selection Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Tryout Selection Page and combine sidebar menus for Tryout Unlimited and Tryout Terjadwal into a single menu.

**Architecture:** We will modify the `productNavItems` in `student-dashboard.ts` to merge the two existing menu items. Then we'll update `app-router.tsx` to include the new route `/app/tryout-selection`. Finally, we will build `TryoutSelectionPage` with `ProductShell` and two descriptive cards pointing to the respective tryout features.

**Tech Stack:** React, react-router, Tailwind CSS, shadcn/ui.

## Global Constraints

- Follow frontend-design aesthetics (clean, elegant, hover micro-interactions).
- Use `shadcn/ui` components where applicable.
- No placeholders in code.

---

### Task 1: Update Sidebar Navigation

**Files:**
- Modify: `src/mocks/student-dashboard.ts`

**Interfaces:**
- Produces: Updated `productNavItems` with a single `Try Out` menu pointing to `/app/tryout-selection`.

- [ ] **Step 1: Modify student-dashboard.ts**

Update `productNavItems` in `src/mocks/student-dashboard.ts`:
```typescript
import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  CalendarDays,
  ChartColumnBig,
  CircleGauge,
  FileCheck2,
  IdCard,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { UserRole } from "../lib/auth/permissions";

export type MetricTone = "teal" | "gold" | "green";

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  tone: MetricTone;
};

export type BlockPerformance = {
  name: string;
  score: number;
  status: string;
};

export type AttemptSummary = {
  title: string;
  meta: string;
  score: string;
  note: string;
};

export type QuickAction = {
  title: string;
  body: string;
  cta: string;
  href: string;
  accent: LucideIcon;
};

export type StudyQueueItem = {
  topic: string;
  focus: string;
};

export type ProductNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  children?: Array<{
    href: string;
    label: string;
    active?: boolean;
  }>;
};

export const productNavItems: ProductNavItem[] = [
  {
    href: "/app/tryout-selection",
    label: "Try Out",
    icon: FileCheck2,
  },
  {
    href: "/app/analytics",
    label: "Analisis",
    icon: ChartColumnBig,
  },
  {
    href: "/app/review",
    label: "Review",
    icon: BookOpenCheck,
  },
  {
    href: "/app/questions",
    label: "Bank Soal",
    icon: FileCheck2,
  },
  {
    href: "/app/leaderboard",
    label: "Leaderboard",
    icon: Trophy,
  },
  {
    href: "/profile",
    label: "Profil",
    icon: IdCard,
  },
] as const;

// ... (keep the rest of the file exactly the same)
```

- [ ] **Step 2: Typecheck modifications**

Run: `npx tsc --noEmit`
Expected: PASS without type errors.

- [ ] **Step 3: Commit**

```bash
git add src/mocks/student-dashboard.ts
git commit -m "feat: merge try out sidebar menus"
```

---

### Task 2: Create TryoutSelectionPage

**Files:**
- Create: `src/pages/app/tryout-selection-page.test.tsx`
- Create: `src/pages/app/tryout-selection-page.tsx`

**Interfaces:**
- Produces: `TryoutSelectionPage` default export.

- [ ] **Step 1: Write the failing test**

Create `src/pages/app/tryout-selection-page.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, it, expect } from "vitest";
import TryoutSelectionPage from "./tryout-selection-page";

// Mock ProductShell and auth hooks to simplify testing
vi.mock("../../components/layout/product-shell", () => ({
  default: ({ children }: any) => <div data-testid="product-shell">{children}</div>,
}));
vi.mock("../../lib/auth/use-session", () => ({
  useSession: () => ({ user: { id: "test-user" } }),
}));
vi.mock("./use-student-shell", () => ({
  useStudentShell: () => ({ tierLabel: "Pro", navItems: [] }),
}));

describe("TryoutSelectionPage", () => {
  it("renders selection cards", () => {
    render(
      <MemoryRouter>
        <TryoutSelectionPage />
      </MemoryRouter>
    );
    expect(screen.getByText("Pilih Mode Try Out")).toBeInTheDocument();
    expect(screen.getByText("Try Out Unlimited")).toBeInTheDocument();
    expect(screen.getByText("Try Out Terjadwal")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/app/tryout-selection-page.test.tsx`
Expected: FAIL because `TryoutSelectionPage` doesn't exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/pages/app/tryout-selection-page.tsx`:
```tsx
import { BookOpen, CalendarClock, ArrowRight } from "lucide-react";
import { Link } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { getButtonStyleProps } from "../../components/ui/button";

function TryoutSelectionPage() {
  const studentShell = useStudentShell("/app/tryout-selection");

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <div className="flex flex-col items-center justify-center min-h-[70vh] py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-foreground">
            Pilih Mode Try Out
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Sesuaikan dengan gaya belajar dan kesiapanmu hari ini.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-5xl w-full px-4">
          <Card className="group relative flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20 border-border hover:border-primary/50 bg-white">
            <CardHeader className="text-center pb-2 pt-8">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <BookOpen className="h-10 w-10" />
              </div>
              <CardTitle className="text-2xl font-bold">Try Out Unlimited</CardTitle>
              <CardDescription className="text-base mt-2 px-4">
                Latihan mandiri tanpa batas waktu. Fokus pada pemahaman materi dan blok yang spesifik.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-6 flex justify-center pb-8">
              <Link
                {...getButtonStyleProps({
                  variant: "outline",
                  className: "group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all",
                })}
                to="/app/tryout"
              >
                Pilih Unlimited <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          <Card className="group relative flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20 border-border hover:border-primary/50 bg-white">
            <CardHeader className="text-center pb-2 pt-8">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <CalendarClock className="h-10 w-10" />
              </div>
              <CardTitle className="text-2xl font-bold">Try Out Terjadwal</CardTitle>
              <CardDescription className="text-base mt-2 px-4">
                Simulasi ujian sebenarnya dengan batasan waktu yang ketat dan saingan serentak.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-6 flex justify-center pb-8">
              <Link
                {...getButtonStyleProps({
                  variant: "outline",
                  className: "group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all",
                })}
                to="/app/scheduled-tryout"
              >
                Pilih Terjadwal <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProductShell>
  );
}

export default TryoutSelectionPage;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/app/tryout-selection-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/app/tryout-selection-page.test.tsx src/pages/app/tryout-selection-page.tsx
git commit -m "feat: create tryout selection page"
```

---

### Task 3: Update App Router

**Files:**
- Modify: `src/router/app-router.tsx`

**Interfaces:**
- Consumes: `TryoutSelectionPage`

- [ ] **Step 1: Modify app-router.tsx**

Update `src/router/app-router.tsx` to lazy load the new page and add the route:
1. Add lazy import near the other page imports:
```typescript
const TryoutSelectionPage = lazy(() => import("../pages/app/tryout-selection-page"));
```
2. Add the route inside `<Route path="/app">` right before the `tryout` route:
```tsx
            <Route path="tryout-selection" element={<TryoutSelectionPage />} />
```

- [ ] **Step 2: Typecheck modifications**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/router/app-router.tsx
git commit -m "feat: add tryout-selection route"
```
