# Task 5: Implement dynamic fetch for TryoutBlockSelectionPage

## Requirements
Modify `src/pages/app/tryout-block-selection-page.tsx` to no longer use hardcoded `blockOptions`. Instead:
1. Use `useQuery` from `@tanstack/react-query` to fetch data via `listTryoutCatalogEntries` (from `src/lib/api/tryout-api.ts`).
2. Filter the entries where `mode === "block"`.
3. Render the UI using the fetched data. Since the backend doesn't provide visual properties (icon, background color), create a small mapping function that adds these based on `blockId` or `blockName`.
4. Include a loading state (e.g., using Lucide icons like `Loader2` or skeleton placeholders) and an error state.
5. The visual design, card layout, and interaction must remain identical or very similar to the previous version (using Shadcn/ui and `frontend-design` guidelines).

## Context
This fixes an issue where the hardcoded UI did not match the backend's data configuration for blocks.

## Global Constraints
- Use `shadcn/ui` where applicable.
- No placeholders in code.
