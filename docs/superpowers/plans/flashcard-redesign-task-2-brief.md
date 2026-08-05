# Task 2: Redesign Flash Cards UI

## Requirements
Redesign `src/pages/app/flash-cards-page.tsx` and refactor/remove `src/components/flash-cards/flash-card-library-group.tsx` to match the card-based layout of `TryoutTopicSelectionPage`.

1. **Filter Tabs**: Replace the vertical grouped lists with interactive Filter Tabs based on the `academicGroupLabel` field from the API response (e.g. "Semua Kelompok", "Pharmaceutical Science", "Clinical Science", "Social Behavioral and Administration"). 
   - Sync the active tab with the URL search parameters (e.g. `?group=Pharmaceutical Science`) exactly like in `TryoutTopicSelectionPage`.
2. **Rich Cards Grid**: Render the flashcards in a responsive grid. Each card must include:
   - A dynamic icon based on the `subtopicTitle` or `materialTitle` (reuse the same pattern/logic used in `TryoutTopicSelectionPage`).
   - A `Badge` displaying the academic group.
   - Information about the `materialTitle` and `cardCount`.
   - Hover micro-interactions and a call-to-action button `Mulai Belajar` with an `<ArrowRight />` icon.
3. **States**:
   - Ensure the loading state displays a visually pleasing skeleton card grid without layout shifts.
   - Handle empty and error states elegantly using Shadcn `Alert` components.

## Context
The user requested that the Flash Card selection screen looks like the Try Out Topic selection screen (rich card UI with dynamic icons and badges).

## Global Constraints
- Use `shadcn/ui` where applicable.
- No placeholders in code.
- Ensure the layout is premium and uses the new visual design system.
