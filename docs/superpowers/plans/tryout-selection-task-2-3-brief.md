# Tasks 2 & 3: Redesign Tryout Selection & Add Resume Active Tryout

## Requirements
Update `src/pages/app/tryout-selection-page.tsx`.

1. **Active Tryout Functionality (Task 3)**:
   - Use the `useSession` hook (from `src/lib/auth/use-session.ts`) to retrieve the current `session?.user?.id`. Note: Check if the user is authenticated; if not, do not fetch. (Alternatively, `useStudentShell` or `SessionContext` could be used, but `useSession` is exported).
   - Use `@tanstack/react-query` to fetch the active tryout session for the user using `findActiveAttemptForUser({ userId })` (from `src/lib/api/tryout-api.ts`).
   - If an active session exists (i.e., data is returned and status is "in_progress" or "paused"), display a prominent "Lanjutkan Try Out" (Resume Tryout) Card at the top of the page.
   - The card should display the title of the tryout, maybe the answered count/total, and a CTA button "Lanjutkan" pointing to `/app/tryout/session`.
   - Consider loading states for this query (e.g. a skeleton for the resume card if `isLoading`).

2. **Redesign the Cards (Task 2)**:
   - The user complained the text and layout in the cards looked messy ("teks nya cenderung berantakan").
   - Follow `/frontend-design` aesthetics. Change the center-aligned layout into something more structured, like left-aligned content with a clear icon, title, description, and button.
   - Improve typography (use proper line heights, weights).
   - Keep the micro-interactions (hover effects) but refine them to feel premium.

3. **Testing**:
   - Update `src/pages/app/tryout-selection-page.test.tsx` to handle the new `useSession` dependency and the `useQuery` call.
   - Mock `findActiveAttemptForUser` appropriately.
   - Add a test case asserting the "Resume Tryout" card is shown if the API returns an active attempt, and hidden otherwise.

## Context
The user wants to be able to resume tryouts easily from the mode selection screen and also wants a cleaner UI for that screen.

## Global Constraints
- Use `shadcn/ui` components where applicable.
- No placeholders in code.
- Ensure only the focused test is run: `npx vitest run src/pages/app/tryout-selection-page.test.tsx`
