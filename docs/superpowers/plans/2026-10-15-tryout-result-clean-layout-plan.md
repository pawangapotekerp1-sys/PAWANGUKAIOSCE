# Clean Tryout Result Page Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the tryout result page by removing the top title/subtitle and the block performance analysis card, leaving a focused layout with back navigation, hero score card, and 4-metric quick stats.

**Architecture:** Modify `TryoutResultPage` to remove `<SectionHeading>` and the entire block performance analysis card, keeping the back button, hero score panel, and 4-metric grid. Update `tryout-result-page.test.tsx` to match the cleaned-up layout.

**Tech Stack:** React 19, TypeScript, React Router v7, Lucide Icons, Tailwind CSS v4, Vitest, React Testing Library.

## Global Constraints
- Target component: `src/pages/app/tryout-result-page.tsx`
- Target test: `src/pages/app/tryout-result-page.test.tsx`
- Back button test ID: `btn-back-to-tryout`
- Review CTA test attribute: `data-variant="primary"` and `href="/app/review/[attemptId]"`
- Type checking must pass with `npx tsc --noEmit`
- Production build must succeed with `npm run build`

---

### Task 1: Update Test Suite for Cleaned Tryout Result Page

**Files:**
- Modify: `src/pages/app/tryout-result-page.test.tsx`

**Interfaces:**
- Consumes: `TryoutResultPage`, `getAttemptResultPageData` mock
- Produces: Updated test assertions matching the removed header title/subtitle and removed block analysis card

- [ ] **Step 1: Update `src/pages/app/tryout-result-page.test.tsx`**

Remove expectations for:
- `Hasil try out` title
- `Skor akhir, hasil per blok, dan akses pembahasan.` description
- `Analisis Performa Per Blok` heading and mastery evaluation tiers

Keep expectations for:
- Back button `btn-back-to-tryout` pointing to `/app/tryout-selection`
- Score `78`, passing status badge, and insight text
- Review CTA with `data-variant="primary"` pointing to `/app/review/attempt-1`
- 4-metric grid: `Jawaban Benar` (31), `Jawaban Salah` (9), `Tidak Dijawab` (0), `Waktu Terpakai` (00:35:00)
- Edge cases: tied wrong count fallback, all correct celebration, loading, error, empty states

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: Exits with code 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/tryout-result-page.test.tsx
git commit -m "test(tryout): update result page tests for clean layout without header and block analysis"
```

---

### Task 2: Implement Clean Layout in `TryoutResultPage`

**Files:**
- Modify: `src/pages/app/tryout-result-page.tsx`

**Interfaces:**
- Consumes: `resultData` (`score`, `correctAnswers`, `wrongAnswers`, `unansweredCount`, `timeUsedSeconds`)
- Produces: Streamlined result page without SectionHeading and without block performance analysis card

- [ ] **Step 1: Update `src/pages/app/tryout-result-page.tsx`**

1. Remove `SectionHeading` import and JSX:
   Replace:
   ```tsx
   <div className="flex flex-col gap-4">
     <Link
       data-testid="btn-back-to-tryout"
       to="/app/tryout-selection"
       {...getButtonStyleProps({
         variant: "ghost",
         size: "sm",
         className: "w-fit -ml-2 text-muted-foreground hover:text-foreground",
       })}
     >
       <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Pilihan Try Out
     </Link>
     <SectionHeading
       title="Hasil try out"
       description="Skor akhir, hasil per blok, dan akses pembahasan."
     />
   </div>
   ```
   with:
   ```tsx
   <div>
     <Link
       data-testid="btn-back-to-tryout"
       to="/app/tryout-selection"
       {...getButtonStyleProps({
         variant: "ghost",
         size: "sm",
         className: "w-fit -ml-2 text-muted-foreground hover:text-foreground",
       })}
     >
       <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Pilihan Try Out
     </Link>
   </div>
   ```

2. Remove the entire `{/* 3. Block Performance Analysis */}` Card block (lines 296-407).
3. Clean up unused imports (`SectionHeading`, `Timer`).

- [ ] **Step 2: Run verification**

Run: `npm test -- src/pages/app/tryout-result-page.test.tsx --run`
Expected: All tests pass.

Run: `npx tsc --noEmit`
Expected: Code 0.

Run: `npm run build`
Expected: Code 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/tryout-result-page.tsx
git commit -m "feat(tryout): remove header title and block analysis card from result page"
```
