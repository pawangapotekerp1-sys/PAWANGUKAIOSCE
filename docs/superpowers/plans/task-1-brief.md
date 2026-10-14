# Task 1 Brief: Update Test Suite for Redesigned Tryout Result Page

## Files
- Modify: `src/pages/app/tryout-result-page.test.tsx`

## Requirements
Update `src/pages/app/tryout-result-page.test.tsx` to reflect the comprehensive dashboard redesign of the tryout result page:

1. **Header & Navigation Assertions**:
   - Verify `<SectionHeading title="Hasil try out" description="Skor akhir, hasil per blok, dan akses pembahasan." />` is present.
   - Verify back button `data-testid="btn-back-to-tryout"` is present and has `href="/app/tryout-selection"`.
2. **Review Action & Score Assertions**:
   - Verify score `78` is rendered.
   - Verify review CTA has `data-variant="primary"` and `href="/app/review/attempt-1"` with text matching `Review jawaban`.
   - Verify hero region contains the review CTA before supporting detail sections.
3. **4-Metric Grid Assertions**:
   - Verify `Jawaban Benar` (count `31`) is present.
   - Verify `Jawaban Salah` is present.
   - Verify `Tidak Dijawab` is present.
   - Verify `Waktu Terpakai` (formatted clock `00:35:00`) is present.
4. **Block Performance Analysis Assertions**:
   - Verify block labels: `Clinical Science` and `Pharmaceutical Science`.
   - Verify block breakdown details: `17 benar, 5 salah` and `14 benar, 4 salah`.
   - Verify evaluation badges / accuracy are rendered (e.g., `Kuasai Baik`, `Cukup`, or accuracy percentages).
5. **Preserve Edge Case Tests**:
   - Keep the insight tests intact:
     - `renders short actionable insight copy for the weakest block`
     - `falls back to a generic review prompt when the highest wrong count is tied`
     - `renders celebration insight when all answers are correct`
     - `renders loading state initially`
     - `renders error state when result query fails`
     - `renders empty state when no attempt is available`
6. **Type Check**:
   - Run `npx tsc --noEmit` and ensure it exits with code 0.
7. **Commit**:
   `git add src/pages/app/tryout-result-page.test.tsx`
   `git commit -m "test(tryout): update result page tests for comprehensive dashboard redesign"`

## Report Contract
Write your full report to: `docs/superpowers/plans/task-1-report.md`.
