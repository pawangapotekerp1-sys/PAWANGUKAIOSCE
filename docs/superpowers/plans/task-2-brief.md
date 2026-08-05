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
import { describe, it, expect, vi } from "vitest";
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
