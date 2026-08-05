# Task 6 Report

## What I implemented
I updated `TryoutTopicSelectionPage` to replace the hardcoded `topicItems` array with dynamic data fetched from the API.
1. Implemented `@tanstack/react-query`'s `useQuery` to fetch `listTryoutCatalogEntries`.
2. Filtered the entries to only show `mode === "topic"`.
3. Kept the existing logic for the `block` search parameter. It maps dynamically to available topics to render block filter tabs (Semua Blok + unique blocks from fetched topics). The `blockId` from the URL parameters initializes the `activeFilter`. 
4. Maintained Shadcn/ui elements, extracting dynamic mapping of topic title to correct Lucide icons and background styling (reusing similar aesthetic as Task 5).
5. Added proper loading states (six pulse skeleton cards) and error states (using `Alert`). 
6. Handled `isStartable = false` properly by conditionally rendering disabled buttons and displaying the disabled reason.

## What I tested and test results
I rewrote `src/pages/app/tryout-topic-selection-page.test.tsx` to support the dynamic fetching:
- Used `QueryClientProvider` around the page component in tests.
- Mocked `listTryoutCatalogEntries` to provide consistent mock data and verify component behaviors (loading, empty, loaded, error).
- Verified topics are correctly filtered when clicking the dynamically rendered filter tabs.
- Verified that initial URL parameters automatically set up the correct filtered view.

**Test run result**: 7/7 tests passing
```
 ✓  src  src/pages/app/tryout-topic-selection-page.test.tsx (7 tests) 679ms
```

## Files changed
- `src/pages/app/tryout-topic-selection-page.tsx`
- `src/pages/app/tryout-topic-selection-page.test.tsx`

## Self-review findings
- The code handles missing data by providing robust fallbacks and empty state messaging.
- Testing successfully checks specific interactions using robust queries (`getByRole` instead of `getByText` when multiple elements share text content).
- It adheres closely to existing architecture, reusing `ProductShell` and UI conventions. 

## Issues or concerns
- None. The feature operates accurately as requested.

## Fixes Implemented
I addressed the review feedback by:
1. Removing the duplicated `activeFilter` local state and `useEffect`.
2. Deriving the filter directly from `searchParams` and using `setSearchParams` in tab handlers to keep the URL as the single source of truth.
3. Conditionally hiding the filter tabs container while `isLoading` is true to prevent layout shift.
4. Adding `data-testid="skeleton-card"` to the skeleton cards and updating the test assertion in `tryout-topic-selection-page.test.tsx` to actually verify their presence.

**Test Command Run:** `npx vitest run src/pages/app/tryout-topic-selection-page.test.tsx`
**Test Output:**
```
 ✓  src  src/pages/app/tryout-topic-selection-page.test.tsx (7 tests) 642ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
```
