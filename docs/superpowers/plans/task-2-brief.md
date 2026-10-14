# Task 2 Brief: Implement Clean Layout in TryoutResultPage

## Files
- Modify: `src/pages/app/tryout-result-page.tsx`

## Requirements
Update `src/pages/app/tryout-result-page.tsx` to remove the header title/subtitle and the block performance analysis card:

1. **Remove Title & Subtitle**:
   - Remove `<SectionHeading title="Hasil try out" description="Skor akhir, hasil per blok, dan akses pembahasan." />`.
   - Remove unused import `import SectionHeading from "../../components/ui/section-heading";`.
   - Keep the back navigation button `<Link data-testid="btn-back-to-tryout" to="/app/tryout-selection" ...> <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Pilihan Try Out </Link>`.

2. **Remove Block Performance Analysis Card**:
   - Delete the entire Card block `{/* 3. Block Performance Analysis */}` including the card header (`Analisis Performa Per Blok`), card content, mastery badges, progress bar, and breakdown stats.
   - Clean up unused icon import `Timer` from `lucide-react`.

3. **Preserve Intact**:
   - Hero Performance Card (Skor akhir, status kelulusan passing target ≥ 68, summary copy, insight box, primary CTA `Review jawaban`, outline CTA `Coba Try Out Baru`).
   - 4-Metric Grid (`Jawaban Benar`, `Jawaban Salah`, `Tidak Dijawab`, `Waktu Terpakai`).
   - Loading, error, and empty states.

4. **Verification**:
   - Run: `npm test -- src/pages/app/tryout-result-page.test.tsx --run` -> All 10 tests must pass.
   - Run: `npx tsc --noEmit` -> Must exit with code 0.
   - Run: `npm run build` -> Must succeed.

5. **Commit**:
   `git add src/pages/app/tryout-result-page.tsx`
   `git commit -m "feat(tryout): remove header title and block analysis card from result page"`

## Report Contract
Write your full report to: `docs/superpowers/plans/task-2-report.md`.
