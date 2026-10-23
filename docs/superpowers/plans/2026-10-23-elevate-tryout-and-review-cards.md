# Elevate Tryout and Review Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure the three main cards (Question Info sidebar card, Main Question/Pembahasan card, and Desktop Question Navigation card) on the Tryout Session, Scheduled Tryout Session, and Review pages clearly stand out from the background with crisp border delineation and soft modern shadow elevation without reducing reading legibility.

**Architecture:**
- Update `--color-clinical-surface` in `src/index.css` from `#f8fafc` (slate-50, virtually indistinguishable from white) to `#f1f5f9` (slate-100), providing a soft, clean neutral page canvas.
- Apply crisp, refined borders (`border border-slate-200/90`) and modern soft elevation shadows (`shadow-sm md:shadow-md`) to the 3 cards across `tryout-session-page.tsx`, `scheduled-tryout-session-page.tsx`, and `review-page.tsx`.
- Preserve existing selector classes (`shadow-sm` on Tryout navigation cards, `shadow-xs` on Review navigation card) required by responsive layout tests.

**Tech Stack:** React 19, Tailwind CSS v4, Lucide React, Vitest.

---

### Task 1: Update Surface Background Variable in `src/index.css`

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Update `--color-clinical-surface` in `@theme` and `:root`**
  Change `--color-clinical-surface: #f8fafc;` to `--color-clinical-surface: #f1f5f9;` in `src/index.css`.
  This gently shifts the canvas to standard slate-100, providing immediate natural separation from `#ffffff` card surfaces.

- [ ] **Step 2: Verify CSS builds cleanly**
  Run: `npm run build`

---

### Task 2: Elevate Cards in `tryout-session-page.tsx`

**Files:**
- Modify: `src/pages/app/tryout-session-page.tsx`
- Test: `src/pages/app/tryout-session-page.test.tsx`

- [ ] **Step 1: Enhance the 3 card class lists**
  1. Desktop Navigation Card (`Card` with `Navigasi Soal`):
     Update:
     `<Card className="shadow-sm h-fit order-2 hidden md:block">`
     To:
     `<Card className="shadow-sm border border-slate-200/90 bg-card h-fit order-2 hidden md:block">`
  2. Question Info Side Card (`Card` with `Soal {currentIndex + 1}`):
     Update:
     `<Card className="shadow-sm w-full md:w-32 lg:w-36 shrink-0 md:sticky md:top-24">`
     To:
     `<Card className="shadow-sm border border-slate-200/90 bg-card w-full md:w-32 lg:w-36 shrink-0 md:sticky md:top-24">`
  3. Main Question Card (`Card` with `currentQuestion.stem`):
     Update:
     `<Card className="shadow-sm flex-1 min-w-0">`
     To:
     `<Card className="shadow-sm border border-slate-200/90 bg-card flex-1 min-w-0">`

- [ ] **Step 2: Run tests for tryout-session-page**
  Run: `npx vitest run src/pages/app/tryout-session-page.test.tsx`
  Expected: PASS

---

### Task 3: Elevate Cards in `scheduled-tryout-session-page.tsx`

**Files:**
- Modify: `src/pages/app/scheduled-tryout-session-page.tsx`
- Test: `src/pages/app/scheduled-tryout-session-page.test.tsx`

- [ ] **Step 1: Enhance the 3 card class lists**
  1. Desktop Navigation Card (`Card` with `Navigasi Soal`):
     Update:
     `<Card className="shadow-sm h-fit order-2 hidden md:block">`
     To:
     `<Card className="shadow-sm border border-slate-200/90 bg-card h-fit order-2 hidden md:block">`
  2. Question Info Side Card:
     Update:
     `<Card className="shadow-sm w-full md:w-32 lg:w-36 shrink-0 md:sticky md:top-24">`
     To:
     `<Card className="shadow-sm border border-slate-200/90 bg-card w-full md:w-32 lg:w-36 shrink-0 md:sticky md:top-24">`
  3. Main Question Card:
     Update:
     `<Card className="p-5 flex-1 min-w-0 shadow-sm">`
     To:
     `<Card className="p-5 flex-1 min-w-0 shadow-sm border border-slate-200/90 bg-card">`

- [ ] **Step 2: Run tests for scheduled-tryout-session-page**
  Run: `npx vitest run src/pages/app/scheduled-tryout-session-page.test.tsx`
  Expected: PASS

---

### Task 4: Elevate Cards in `review-page.tsx`

**Files:**
- Modify: `src/pages/app/review-page.tsx`
- Test: `src/pages/app/review-page.test.tsx`

- [ ] **Step 1: Enhance the 3 card class lists in the 2-column layout**
  1. Desktop Navigation Card (`Card` with `Navigasi Soal`):
     Update:
     `<Card className="shadow-xs h-fit order-2 hidden xl:block">`
     To:
     `<Card className="shadow-xs border border-slate-200/90 bg-card h-fit order-2 hidden xl:block">`
  2. Question Info Side Card:
     Update:
     `<Card className="shadow-sm w-full md:w-32 lg:w-36 shrink-0 md:sticky md:top-24">`
     To:
     `<Card className="shadow-sm border border-slate-200/90 bg-card w-full md:w-32 lg:w-36 shrink-0 md:sticky md:top-24">`
  3. Main Question Card:
     Update:
     `<Card className="shadow-sm flex-1 min-w-0">`
     To:
     `<Card className="shadow-sm border border-slate-200/90 bg-card flex-1 min-w-0">`

- [ ] **Step 2: Run tests for review-page**
  Run: `npx vitest run src/pages/app/review-page.test.tsx`
  Expected: PASS

---

### Task 5: End-to-End Verification and Final Build Check

- [ ] **Step 1: Run complete build check**
  Run: `npm run build`
  Expected: Clean build with zero errors.

- [ ] **Step 2: Run all 3 session & review test suites**
  Run:
  `npx vitest run src/pages/app/tryout-session-page.test.tsx`
  `npx vitest run src/pages/app/scheduled-tryout-session-page.test.tsx`
  `npx vitest run src/pages/app/review-page.test.tsx`
  Expected: All tests pass.
