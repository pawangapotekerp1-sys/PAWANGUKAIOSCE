# Task 5 Report: Implement dynamic fetch for TryoutBlockSelectionPage

## What was implemented
- Removed hardcoded `blockOptions` array from `TryoutBlockSelectionPage`.
- Integrated `@tanstack/react-query` to fetch block options dynamically via the `listTryoutCatalogEntries` API.
- Filtered the API response for `mode === "block"`.
- Added a `getBlockVisuals` mapper to dynamically inject visual attributes (icons, badge colors, accent backgrounds, subtitles, and proportion labels) based on the `blockId` or `blockName` (checking for Clinical Science, Pharmaceutical Science, and Social/Behavioral).
- Implemented a skeleton loader state using Tailwind `animate-pulse` utility for a polished UI experience while loading.
- Implemented an error fallback state using the standard `shadcn/ui` Alert component to inform the user if the data fails to load.
- Preserved the original design language, card layouts, interactions, and `shadcn/ui` integration.

## Tests & Validation
- No explicit TDD requirement for UI component was specified in the task brief.
- The UI mapping logic securely provides valid fallback options if the block name doesn't match the known patterns.
- Loading and error states cover all asynchronous boundary edge cases.

## Files changed
- `src/pages/app/tryout-block-selection-page.tsx`

## Self-review findings
- **Completeness**: Handled data fetching, filtering, mapping visual aesthetics, and edge cases (loading, empty, error states).
- **Quality**: The `getBlockVisuals` function is clean and isolates mapping logic from the render tree. Code matches the original Shadcn/ui visual layout.
- **Discipline**: Used existing components and generic tailwind utility classes for the skeleton rather than creating unnecessary custom components.

## Concerns
- N/A. The dynamic fetch fits well with the previous static design pattern.

## Fixes Implemented
- Removed unused `Loader2` import from `lucide-react`.
- Conditionally render a disabled `Button` when `!block.isStartable`, accompanied by a subtitle displaying `block.disabledReason`.
- Conditionally hide the "Pilih per Materi" link when `block.blockId` is falsy to prevent broken routes.
- Added a mock for `useQuery` in `tryout-block-selection-page.test.tsx` to fix failing tests caused by a missing `QueryClientProvider`.

## Fix Tests Run
Command: `npx vitest run src/pages/app/tryout-block-selection-page.test.tsx`
Output:
```
 RUN  v4.1.5 E:/Projek TRY OYT

 ✓  src  src/pages/app/tryout-block-selection-page.test.tsx (2 tests) 149ms

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  21:15:05
   Duration  23.47s (transform 845ms, setup 1.78s, import 16.56s, tests 149ms, environment 4.62s)
```

## Reviewer Fixes Implemented
- Removed the `vi.mock("@tanstack/react-query")`.
- Provided a `QueryClientProvider` wrapper in the tests and mocked `listTryoutCatalogEntries` directly.
- Added test cases for missing data mapping logic (filtering non-block modes), loading state, error state, and empty state.

## Reviewer Fixes Tests Run
Command: `npx vitest run src/pages/app/tryout-block-selection-page.test.tsx`
Output:
```
 RUN  v4.1.5 E:/Projek TRY OYT

 ✓  src  src/pages/app/tryout-block-selection-page.test.tsx (4 tests) 199ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  21:19:56
   Duration  19.80s (transform 607ms, setup 1.10s, import 11.99s, tests 199ms, environment 6.05s)
```
