# Task 1 Brief: Update Test Suite for Cleaned Tryout Result Page

## Files
- Modify: `src/pages/app/tryout-result-page.test.tsx`

## Requirements
Update `src/pages/app/tryout-result-page.test.tsx` to align with the removal of the top SectionHeading (title & subtitle) and the removal of the block performance analysis card:

1. **Remove Assertions for**:
   - `Hasil try out` title
   - `Skor akhir, hasil per blok, dan akses pembahasan.` description
   - `Analisis Performa Per Blok` heading, block labels (`Clinical Science`, `Pharmaceutical Science`), details (`17 benar, 5 salah`), and mastery evaluation tiers.
   - The dedicated test `"renders block performance analysis with mastery evaluation tiers"`.
2. **Preserve Assertions for**:
   - Back button `data-testid="btn-back-to-tryout"` pointing to `/app/tryout-selection` with text `Kembali ke Pilihan Try Out`.
   - Score `78`, passing threshold status badge (`Memenuhi Standar Kelulusan (Target ≥ 68)` vs `Belum Mencapai Target (Target ≥ 68)`), summary copy, and insight copy.
   - Review CTA with `data-variant="primary"` pointing to `/app/review/attempt-1` with label `Review jawaban`.
   - 4-metric grid: `Jawaban Benar` (count `31`), `Jawaban Salah` (count `9`), `Tidak Dijawab` (count `0`), and `Waktu Terpakai` (clock `00:35:00`).
   - Order assertion: Hero region contains the review CTA and precedes the 4-metric grid (`supportingLabel`).
   - Edge case tests: weakest block insight, tied wrong count fallback, empty block fallback, all-correct celebration, latest attempt fallback, loading state, error state, empty state.
3. **Type Check**:
   - Run `npx tsc --noEmit` and ensure it exits with code 0.
4. **Commit**:
   `git add src/pages/app/tryout-result-page.test.tsx`
   `git commit -m "test(tryout): update result page tests for clean layout without header and block analysis"`

## Report Contract
Write your full report to: `docs/superpowers/plans/task-1-report.md`.
