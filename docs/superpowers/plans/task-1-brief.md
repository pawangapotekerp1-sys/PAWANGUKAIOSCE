# Task 1 Brief: Update Test Suite for Back Button and Block Header Navigation

## Files
- Modify: `src/pages/app/tryout-topic-selection-page.test.tsx`

## Requirements
Update `src/pages/app/tryout-topic-selection-page.test.tsx` to align with the removal of block filter buttons and the addition of the "Kembali ke Pilihan Blok" button and active block header.

Specifically:
1. Replace filter button assertions with tests for the back button and block heading:
   - Verify `data-testid="btn-back-to-blocks"` is rendered and has `href="/app/tryout/blocks"`.
   - Verify heading (`role="heading", level 1`) displays "Semua Materi" when no block param is passed.
   - Verify `screen.queryByTestId("filter-all")` does not exist in the document.
2. In the URL filtering test:
   - When URL contains `?block=b1`, verify heading displays "Clinical Science" and only topics belonging to block `b1` are rendered ("Farmakoterapi Kardiovaskular & Renologi"), while topics belonging to other blocks (`b2`, `b3`) are not in document.
3. Remove outdated assertions that check for `Try Out Per Materi / Topik` or `Clinical Science` pill buttons.
4. Run `npx tsc --noEmit` to verify type checking passes cleanly.
5. Commit your changes:
   `git add src/pages/app/tryout-topic-selection-page.test.tsx`
   `git commit -m "test(tryout): update topic selection tests for back button and block header"`

## Report Contract
Write your full report to: `docs/superpowers/plans/task-1-report.md`.
