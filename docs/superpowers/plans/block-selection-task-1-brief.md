# Task 1: Add "Try Out Acak Seluruh Blok"

## Requirements
Update `src/pages/app/tryout-block-selection-page.tsx`.
Currently, `blockOptions` only includes items where `entry.mode === "block"`.
Change this to also include `entry.mode === "full"`.

If an entry has `mode === "full"`, ensure it is rendered as a beautiful card alongside the other blocks. 
- You may want to enhance `getBlockVisuals` (or add a special case) so that a `mode === "full"` entry gets a distinctive icon (e.g., `Layers`, `Infinity`, or similar) and unique colors, perhaps a gradient or a distinct primary accent, to differentiate it from the specific clinical/pharma blocks.
- The title can just use `block.title` which should be "Try Out Acak Seluruh Blok" or whatever the API returns, but ensure the UI displays it prominently as the overarching mixed block try out.
- Make sure `tryout-block-selection-page.test.tsx` handles this new condition if it mocks data that includes a "full" mode entry.

## Context
The user requested that the "Try out acak seluruh blok" (previously "try out penuh") is visible again on the block selection page.

## Global Constraints
- Do not introduce placeholders or "TODO" comments.
- Verify the test passes cleanly: `npx vitest run src/pages/app/tryout-block-selection-page.test.tsx`
