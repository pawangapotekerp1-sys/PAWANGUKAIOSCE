# Task 2 Brief: Implement Redesigned TryoutResultPage

## Files
- Modify: `src/pages/app/tryout-result-page.tsx`

## Requirements
Implement the redesigned `TryoutResultPage` with high contrast, modern layout, and comprehensive analytics:

1. **Header & Navigation**:
   - Add back button `data-testid="btn-back-to-tryout"` pointing to `/app/tryout-selection` with text `Kembali ke Pilihan Try Out` and `ArrowLeft` icon.
   - Add `<SectionHeading title="Hasil try out" description="Skor akhir, hasil per blok, dan akses pembahasan." />`.

2. **Hero Performance Card**:
   - Calculate `isPassed = Math.round(resultData.score) >= 68`.
   - Display passing threshold badge:
     - If `isPassed`: badge with text `Memenuhi Standar Kelulusan (Target ≥ 68)` and `CheckCircle2` icon.
     - Else: badge with text `Belum Mencapai Target (Target ≥ 68)` and `AlertCircle` icon.
   - Display final score: `Math.round(resultData.score)`.
   - Display summary text: `{resultData.correctAnswers} dari {totalQuestions} soal terjawab benar pada sesi ini.`.
   - Display insight box: `{weakestBlockInsight}`.
   - Action buttons:
     - Primary Review CTA:
       `<Link {...getButtonStyleProps({ variant: "primary", className: "font-semibold shadow-sm" })} to={'/app/review/' + resultData.attemptId}> Review jawaban <ArrowRight className="w-4 h-4 ml-2" /> </Link>`
       (Ensure it renders with `data-variant="primary"` and high contrast text).
     - Secondary CTA:
       `<Link {...getButtonStyleProps({ variant: "outline", className: "font-semibold" })} to="/app/tryout-selection"> Coba Try Out Baru </Link>`.

3. **4-Metric Grid**:
   - Grid with 4 cards:
     1. `Jawaban Benar` with count `{resultData.correctAnswers}`.
     2. `Jawaban Salah` with count `{resultData.wrongAnswers}`.
     3. `Tidak Dijawab` with count `{resultData.unansweredCount}`.
     4. `Waktu Terpakai` with formatted clock `{formatDurationAsClock(resultData.timeUsedSeconds)}` and average time per answered question.

4. **Block Performance Analysis**:
   - Card title: `Analisis Performa Per Blok` with `Timer` icon.
   - For each block in `resultData.blocks`:
     - Total questions: `totalInBlock = item.correct + item.wrong`.
     - Accuracy: `accuracy = totalInBlock > 0 ? Math.round((item.correct / totalInBlock) * 100) : 0`.
     - Mastery badge:
       - `accuracy >= 75`: `Kuasai Baik`
       - `accuracy >= 50`: `Cukup`
       - `< 50`: `Perlu Latihan`
     - Breakdown details: `{item.correct} benar, {item.wrong} salah`.
     - Visual segmented horizontal progress bar with green for correct and red for wrong.
     - Badge for `{totalInBlock} soal`.

5. **Verification**:
   - Run: `npm test -- src/pages/app/tryout-result-page.test.tsx --run` -> All tests must pass.
   - Run: `npx tsc --noEmit` -> Must exit with code 0.
   - Run: `npm run build` -> Must succeed.

6. **Commit**:
   `git add src/pages/app/tryout-result-page.tsx`
   `git commit -m "feat(tryout): redesign result page with hero card, 4-metric grid, and block mastery bars"`

## Report Contract
Write your full report to: `docs/superpowers/plans/task-2-report.md`.
