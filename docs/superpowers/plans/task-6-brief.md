# Task 6: Implement dynamic fetch for TryoutTopicSelectionPage

## Requirements
Modify `src/pages/app/tryout-topic-selection-page.tsx` to no longer use hardcoded `topicItems`. Instead:
1. Use `useQuery` from `@tanstack/react-query` to fetch data via `listTryoutCatalogEntries` (from `src/lib/api/tryout-api.ts`).
2. Filter the entries where `mode === "topic"`. 
3. Note that the page accepts a `block` search parameter. You should only display topics whose `blockId` matches the selected block. If no block is selected or if the param is missing, we might show all topics or guide the user back. However, the existing UI handles `searchParams.get("block")`, so maintain that logic. Filter `mode === "topic"` AND `blockId === currentBlockId`.
4. Render the UI using the fetched data. Use Shadcn/ui components (Cards, Badges, etc.) and follow the existing aesthetic. Since icons/backgrounds aren't provided by the API, map them dynamically (similar to Task 5) based on `topicName` or `id`.
5. Implement proper loading states using skeleton placeholders (`animate-pulse`) and error states using Shadcn `Alert`.
6. Implement logic to handle `isStartable = false` correctly by disabling the primary action button and showing `disabledReason`.

## Context
This fixes an issue where the hardcoded UI did not match the backend's data configuration for topics. The previous Task 5 already fixed this for block mode; this task applies the same fix for topic mode.

## Global Constraints
- Use `shadcn/ui` where applicable.
- No placeholders in code.
