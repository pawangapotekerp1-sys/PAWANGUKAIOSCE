# Tryout Result Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the tryout result page to replace the uninformative result distribution card and fix the invisible text on the review button, delivering a comprehensive performance dashboard with clear metrics, visual block progress bars, and high-contrast actions.

**Architecture:** Update `TryoutResultPage` to introduce a clear page header and back navigation, a hero score panel with passing criteria (target ≥ 68), a 4-card quick metrics grid (Correct, Wrong, Unanswered, Time & Average), and an enhanced block performance analysis with multi-segment visual progress bars and mastery badges. Ensure the review button CTA uses `variant="primary"` on a neutral card with high contrast. Update tests in `tryout-result-page.test.tsx`.

**Tech Stack:** React 19, TypeScript, React Router v7, Lucide Icons, Tailwind CSS v4, Vitest, React Testing Library.

## Global Constraints
- Target component: `src/pages/app/tryout-result-page.tsx`
- Target test: `src/pages/app/tryout-result-page.test.tsx`
- Passing score threshold: 68
- Review CTA test attribute: `data-variant="primary"` and `href="/app/review/[attemptId]"`
- Back button test ID: `btn-back-to-tryout`
- Type checking must pass with `npx tsc --noEmit`
- Production build must succeed with `npm run build`

---

### Task 1: Update Test Suite for Redesigned Tryout Result Page

**Files:**
- Modify: `src/pages/app/tryout-result-page.test.tsx`

**Interfaces:**
- Consumes: `TryoutResultPage`, `getAttemptResultPageData` mock
- Produces: Test suite validating header, back button, hero score, 4-metric grid, high-contrast review CTA, and block analysis progress bars

- [ ] **Step 1: Update `src/pages/app/tryout-result-page.test.tsx`**

Ensure tests assert:
1. Header with `Hasil try out` title and description.
2. Back button with `data-testid="btn-back-to-tryout"` pointing to `/app/tryout-selection`.
3. Review CTA with `data-variant="primary"` and text `Review jawaban` pointing to `/app/review/attempt-1`.
4. Metric cards: `Jawaban Benar`, `Jawaban Salah`, `Tidak Dijawab`, `Waktu Terpakai`.
5. Block distribution cards displaying block labels (`Clinical Science`, `Pharmaceutical Science`), correct/wrong details (`17 benar, 5 salah`), and mastery evaluation badges.
6. Edge case tests (empty data, loading state, error state, tied wrong counts) remain completely functional.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: Exits with code 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/tryout-result-page.test.tsx
git commit -m "test(tryout): update result page tests for comprehensive dashboard redesign"
```

---

### Task 2: Implement Redesigned `TryoutResultPage`

**Files:**
- Modify: `src/pages/app/tryout-result-page.tsx`

**Interfaces:**
- Consumes: `resultData` (`score`, `correctAnswers`, `wrongAnswers`, `unansweredCount`, `timeUsedSeconds`, `blocks`)
- Produces: Enhanced UI layout with page header, back link, hero score card, 4-metric grid, and block mastery progress bars

- [ ] **Step 1: Update `src/pages/app/tryout-result-page.tsx`**

1. Import required Lucide icons:
   `ArrowRight, ArrowLeft, CheckCircle2, XCircle, HelpCircle, Clock, AlertTriangle, AlertCircle, Loader2, Package, BarChart3, BookOpen`
2. Render Section Header & Back Button at the top of `#tryout`:
   ```tsx
   <div className="flex flex-col gap-4 pb-2">
     <div className="flex items-center gap-2">
       <Link
         {...getButtonStyleProps({
           variant: "ghost",
           size: "sm",
           className: "text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground -ml-2",
         })}
         to="/app/tryout-selection"
         data-testid="btn-back-to-tryout"
       >
         <ArrowLeft className="h-4 w-4" />
         Kembali ke Pilihan Try Out
       </Link>
     </div>
     <SectionHeading
       title="Hasil try out"
       description="Skor akhir, hasil per blok, dan akses pembahasan."
     />
   </div>
   ```
3. Render Hero Performance Card:
   - Elevated card with subtle border and shadow:
   - Score: `Math.round(resultData.score)`
   - Passing badge:
     `isPassed ? (Badge: "Memenuhi Standar Kelulusan (Target ≥ 68)") : (Badge: "Belum Mencapai Target (Target ≥ 68)")`
   - Summary text: `{resultData.correctAnswers} dari {totalQuestions} soal terjawab benar pada sesi ini.`
   - Weakest block insight box (`weakestBlockInsight`)
   - Action buttons:
     - Review CTA:
       ```tsx
       <Link
         {...getButtonStyleProps({
           variant: "primary",
           className: "font-semibold shadow-sm",
         })}
         to={`/app/review/${resultData.attemptId}`}
       >
         Review jawaban <ArrowRight className="w-4 h-4 ml-2" />
       </Link>
       ```
     - Secondary CTA:
       ```tsx
       <Link
         {...getButtonStyleProps({
           variant: "outline",
           className: "font-semibold",
         })}
         to="/app/tryout-selection"
       >
         Coba Try Out Baru
       </Link>
       ```
4. Render 4-Metric Grid:
   - Card 1: Jawaban Benar (`CheckCircle2`, emerald, count)
   - Card 2: Jawaban Salah (`XCircle`, rose, count)
   - Card 3: Tidak Dijawab (`HelpCircle`, slate/muted, count)
   - Card 4: Waktu Terpakai (`Clock`, formatted duration + average time per answered question)
5. Render Redesigned Block Performance Analysis ("Analisis Performa Per Blok"):
   - Replace the old distribution card with an informative breakdown:
   - For each block in `resultData.blocks`:
     - Total block questions: `const totalBlock = item.correct + item.wrong;`
     - Accuracy: `const accuracy = totalBlock > 0 ? Math.round((item.correct / totalBlock) * 100) : 0;`
     - Mastery badge:
       - `accuracy >= 75`: "Kuasai Baik (≥75%)"
       - `accuracy >= 50`: "Cukup (50-74%)"
       - `< 50`: "Perlu Latihan (<50%)"
     - Visual segmented progress bar:
       ```tsx
       <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
         <div style={{ width: `${(item.correct / totalBlock) * 100}%` }} className="bg-emerald-500 h-full" />
         <div style={{ width: `${(item.wrong / totalBlock) * 100}%` }} className="bg-rose-500 h-full" />
       </div>
       ```
     - Detail text: `{item.correct} benar, {item.wrong} salah` and `{totalBlock} soal`.

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
git commit -m "feat(tryout): redesign result page with hero card, 4-metric grid, and block mastery bars"
```
