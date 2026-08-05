## Task 1 Report: Add "Try Out Acak Seluruh Blok"

### What was implemented
- Updated `src/pages/app/tryout-block-selection-page.tsx` to include tryout entries with `mode === "full"` alongside `mode === "block"`.
- Modified `getBlockVisuals` function to accept an optional `mode` parameter. When `mode === "full"`, it returns a distinct visual configuration:
  - `InfinityIcon` from `lucide-react`.
  - A unique fuchsia-to-purple gradient background and text accent.
  - Custom subtitle "Seluruh Materi Blok" and proportion label "Komprehensif".
- Updated `src/pages/app/tryout-block-selection-page.test.tsx` to include a "full" mode entry in the mocked API response and verified it renders properly alongside standard block entries while filtering out other modes like "exam".

### What was tested and test results
- Ran `npx vitest run src/pages/app/tryout-block-selection-page.test.tsx` synchronously.
- **Results**: 1 test file passed, 4 tests passed, taking ~17s to run (including setup/import). Output was pristine.
- Verified that the new tests for "full" mode specifically check its inclusion and the exclusion of irrelevant modes.

### Files changed
- `src/pages/app/tryout-block-selection-page.tsx`
- `src/pages/app/tryout-block-selection-page.test.tsx`

### Self-review findings
- Completeness: All requirements met. The "full" mode entry is now returned, visually distinct, prominently displayed, and backed by a test.
- Quality: Visual styles follow the existing paradigm using consistent Tailwind opacity scales but styled uniquely with gradients.
- Discipline: Ensured not to change unrelated test files or components. No "TODO" comments were introduced.

### Issues or concerns
- None.
