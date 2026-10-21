# Mobile Question Navigation Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an ergonomic, responsive mobile bottom-sheet drawer for question navigation on Tryout Session, Scheduled Tryout Session, and Review pages, replacing the clunky inline bottom card on mobile devices.

**Architecture:** A reusable `MobileQuestionNavDrawer` component built on `@base-ui/react/dialog` via `src/components/ui/sheet.tsx`. Desktop viewports retain their sticky sidebar card, while mobile viewports display a sleek bottom-floating trigger pill that opens a slide-up drawer and automatically closes when a question number is tapped.

**Tech Stack:** React 19, Tailwind CSS v4, Lucide React icons, Vitest, Testing Library, `@base-ui/react`.

## Global Constraints
- Use existing Sheet primitive from `src/components/ui/sheet.tsx`.
- Must support both Tryout session states (answered, doubtful, idle) and Review states (isWrong: emerald / rose).
- Trigger pill positioned at bottom center (`fixed bottom-4 left-1/2 -translate-x-1/2 z-40`).
- Responsive visibility: `md:hidden` for tryout sessions, `xl:hidden` for review page.
- Do not break existing desktop navigation cards (`hidden md:block` / `hidden xl:block`).
- Auto-close drawer on number click.

---

### Task 1: Create `MobileQuestionNavDrawer` Component and Unit Tests

**Files:**
- Create: `src/components/tryout/mobile-question-nav-drawer.tsx`
- Test: `src/components/tryout/mobile-question-nav-drawer.test.tsx`

**Interfaces:**
- Produces:
  ```typescript
  export interface MobileQuestionNavDrawerProps {
    currentIndex: number;
    totalQuestions: number;
    onSelectQuestion: (index: number) => void;
    renderGrid: (helpers: { close: () => void }) => React.ReactNode;
    legend?: React.ReactNode;
    breakpoint?: "md" | "xl";
    title?: string;
    disabled?: boolean;
  }
  ```

- [ ] **Step 1: Write the failing unit tests for `MobileQuestionNavDrawer`**

```tsx
// src/components/tryout/mobile-question-nav-drawer.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MobileQuestionNavDrawer from "./mobile-question-nav-drawer";

describe("MobileQuestionNavDrawer", () => {
  it("renders floating pill trigger with current question progress", () => {
    render(
      <MobileQuestionNavDrawer
        currentIndex={2}
        totalQuestions={30}
        onSelectQuestion={vi.fn()}
        renderGrid={() => <div>Grid Content</div>}
      />
    );

    const trigger = screen.getByRole("button", { name: /navigasi soal/i });
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText("3 / 30")).toBeInTheDocument();
  });

  it("opens the drawer when trigger is clicked and closes on question selection", async () => {
    const handleSelect = vi.fn();
    render(
      <MobileQuestionNavDrawer
        currentIndex={0}
        totalQuestions={10}
        onSelectQuestion={handleSelect}
        renderGrid={({ close }) => (
          <button
            onClick={() => {
              handleSelect(4);
              close();
            }}
          >
            Nomor 5
          </button>
        )}
      />
    );

    const trigger = screen.getByRole("button", { name: /navigasi soal/i });
    fireEvent.click(trigger);

    expect(await screen.findByText("Nomor 5")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Nomor 5"));
    expect(handleSelect).toHaveBeenCalledWith(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --pool=forks src/components/tryout/mobile-question-nav-drawer.test.tsx`
Expected: FAIL because `mobile-question-nav-drawer.tsx` does not exist yet.

- [ ] **Step 3: Implement `MobileQuestionNavDrawer`**

```tsx
// src/components/tryout/mobile-question-nav-drawer.tsx
import { useState, type ReactNode } from "react";
import { ChevronUp, LayoutGrid, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { Button } from "../ui/button";

export interface MobileQuestionNavDrawerProps {
  currentIndex: number;
  totalQuestions: number;
  onSelectQuestion: (index: number) => void;
  renderGrid: (helpers: { close: () => void }) => ReactNode;
  legend?: ReactNode;
  breakpoint?: "md" | "xl";
  title?: string;
  disabled?: boolean;
}

export default function MobileQuestionNavDrawer({
  currentIndex,
  totalQuestions,
  onSelectQuestion: _onSelectQuestion,
  renderGrid,
  legend,
  breakpoint = "md",
  title = "Navigasi Soal",
  disabled = false,
}: MobileQuestionNavDrawerProps) {
  const [open, setOpen] = useState(false);

  const visibilityClass = breakpoint === "xl" ? "xl:hidden" : "md:hidden";

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div className={visibilityClass}>
      {/* Floating Pill Trigger */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          aria-label="Navigasi soal"
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card/95 hover:bg-card text-foreground border border-border/80 shadow-lg backdrop-blur-md text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <LayoutGrid className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
          <span>
            Soal <span className="font-extrabold text-primary">{currentIndex + 1}</span> / {totalQuestions}
          </span>
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5" />
        </button>
      </div>

      {/* Slide-Up Bottom Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="max-h-[80vh] rounded-t-3xl border-t border-border/80 bg-card p-0 flex flex-col shadow-2xl focus:outline-none"
        >
          {/* Drag handle */}
          <div className="pt-2 pb-1 flex justify-center">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/25" />
          </div>

          <SheetHeader className="px-5 py-3 border-b border-border/40 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <SheetTitle className="text-base font-extrabold text-foreground tracking-tight">
                {title}
              </SheetTitle>
              <p className="text-xs text-muted-foreground font-medium">
                Soal aktif: {currentIndex + 1} dari {totalQuestions}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClose}
              className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Tutup</span>
            </Button>
          </SheetHeader>

          {legend ? (
            <div className="px-5 pt-3 pb-1 border-b border-border/30 bg-muted/20">
              {legend}
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {renderGrid({ close: handleClose })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --pool=forks src/components/tryout/mobile-question-nav-drawer.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tryout/mobile-question-nav-drawer.tsx src/components/tryout/mobile-question-nav-drawer.test.tsx
git commit -m "feat(ui): add reusable MobileQuestionNavDrawer component"
```

---

### Task 2: Integrate `MobileQuestionNavDrawer` into `tryout-session-page.tsx`

**Files:**
- Modify: `src/pages/app/tryout-session-page.tsx`
- Test: `src/pages/app/tryout-session-page.test.tsx`

- [ ] **Step 1: Update desktop navigation card and add `MobileQuestionNavDrawer`**

In `src/pages/app/tryout-session-page.tsx`:
1. Import `MobileQuestionNavDrawer` from `../../components/tryout/mobile-question-nav-drawer`.
2. Update the desktop Card for `Navigasi Soal`:
   Change:
   `<Card className="shadow-sm h-fit order-2">`
   To:
   `<Card className="shadow-sm h-fit order-2 hidden md:block">`
3. Add `MobileQuestionNavDrawer`:
   ```tsx
   <MobileQuestionNavDrawer
     breakpoint="md"
     currentIndex={currentIndex}
     totalQuestions={questions.length}
     disabled={isQuestionNavigationDisabled}
     onSelectQuestion={(index) => {
       goToQuestion(index);
       window.scrollTo({ top: 0, behavior: "smooth" });
     }}
     legend={
       <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-muted-foreground">
         <span className="flex items-center gap-1.5">
           <span className="h-2.5 w-2.5 rounded-full bg-primary" />
           Terjawab
         </span>
         <span className="flex items-center gap-1.5">
           <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
           Ragu-ragu
         </span>
         <span className="flex items-center gap-1.5">
           <span className="h-2.5 w-2.5 rounded-full border border-border bg-card" />
           Belum dijawab
         </span>
       </div>
     }
     renderGrid={({ close }) => (
       <div className="grid grid-cols-5 gap-2.5">
         {questions.map((question, index) => (
           <SessionQuestionNavButton
             key={question.id}
             disabled={isQuestionNavigationDisabled}
             number={index + 1}
             onClick={() => {
               goToQuestion(index);
               close();
               window.scrollTo({ top: 0, behavior: "smooth" });
             }}
             isCurrent={index === currentIndex}
             state={
               question.isDoubtful
                 ? "doubtful"
                 : question.selectedOptionKey
                   ? "answered"
                   : "idle"
             }
           />
         ))}
       </div>
     )}
   />
   ```

- [ ] **Step 2: Run tests for `tryout-session-page`**

Run: `npx vitest run --pool=forks src/pages/app/tryout-session-page.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/tryout-session-page.tsx
git commit -m "feat(tryout): integrate mobile question nav drawer in tryout session"
```

---

### Task 3: Integrate `MobileQuestionNavDrawer` into `scheduled-tryout-session-page.tsx`

**Files:**
- Modify: `src/pages/app/scheduled-tryout-session-page.tsx`
- Test: `src/pages/app/scheduled-tryout-session-page.test.tsx`

- [ ] **Step 1: Update desktop navigation card and add `MobileQuestionNavDrawer`**

In `src/pages/app/scheduled-tryout-session-page.tsx`:
1. Import `MobileQuestionNavDrawer`.
2. Update the desktop Card for `Navigasi Soal`:
   Change:
   `<Card className="shadow-sm h-fit order-2">`
   To:
   `<Card className="shadow-sm h-fit order-2 hidden md:block">`
3. Add `MobileQuestionNavDrawer` with the same props as Task 2.

- [ ] **Step 2: Run tests for `scheduled-tryout-session-page`**

Run: `npx vitest run --pool=forks src/pages/app/scheduled-tryout-session-page.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/scheduled-tryout-session-page.tsx
git commit -m "feat(scheduled-tryout): integrate mobile question nav drawer in scheduled session"
```

---

### Task 4: Integrate `MobileQuestionNavDrawer` into `review-page.tsx`

**Files:**
- Modify: `src/pages/app/review-page.tsx`
- Test: `src/pages/app/review-page.test.tsx`

- [ ] **Step 1: Update desktop navigation card and add `MobileQuestionNavDrawer`**

In `src/pages/app/review-page.tsx`:
1. Import `MobileQuestionNavDrawer`.
2. Update the desktop Card:
   Change:
   `<Card className="shadow-xs h-fit order-2">`
   To:
   `<Card className="shadow-xs h-fit order-2 hidden xl:block">`
3. Add `MobileQuestionNavDrawer` with `breakpoint="xl"`:
   ```tsx
   <MobileQuestionNavDrawer
     breakpoint="xl"
     currentIndex={currentIndex}
     totalQuestions={items.length}
     onSelectQuestion={(index) => {
       setCurrentIndex(index);
       window.scrollTo({ top: 0, behavior: "smooth" });
     }}
     legend={
       <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-muted-foreground">
         <span className="flex items-center gap-1.5">
           <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
           Jawaban Benar
         </span>
         <span className="flex items-center gap-1.5">
           <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
           Jawaban Salah
         </span>
       </div>
     }
     renderGrid={({ close }) => (
       <div className="grid grid-cols-5 gap-2.5">
         {items.map((item, index) => {
           const isCurrent = index === currentIndex;
           return (
             <button
               key={item.id}
               onClick={() => {
                 setCurrentIndex(index);
                 close();
                 window.scrollTo({ top: 0, behavior: "smooth" });
               }}
               aria-label={`Soal ${index + 1}`}
               className={[
                 "h-10 w-full rounded-full border text-sm font-bold transition-all duration-150 flex items-center justify-center cursor-pointer shadow-2xs",
                 item.isWrong
                   ? "!border-rose-600 !bg-rose-600 !text-white hover:!bg-rose-700"
                   : "!border-emerald-600 !bg-emerald-600 !text-white hover:!bg-emerald-700",
                 isCurrent ? "ring-2 ring-primary ring-offset-2 !border-primary scale-[1.03]" : "",
               ].filter(Boolean).join(" ")}
             >
               {index + 1}
             </button>
           );
         })}
       </div>
     )}
   />
   ```

- [ ] **Step 2: Run tests for `review-page`**

Run: `npx vitest run --pool=forks src/pages/app/review-page.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/review-page.tsx
git commit -m "feat(review): integrate mobile question nav drawer in review page"
```

---

### Task 5: End-to-End Verification and Production Build

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite for session and review components**

Run: `npx vitest run --pool=forks src/components/tryout/mobile-question-nav-drawer.test.tsx src/pages/app/tryout-session-page.test.tsx src/pages/app/scheduled-tryout-session-page.test.tsx src/pages/app/review-page.test.tsx`
Expected: All tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Clean build (`tsc -b && vite build`) without type or bundling errors.
