# Pawang Masuk Apoteker Frontend Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Phase 1 front-end surface for marketing, student, and admin flows using the approved spec and the existing dashboard visual language, while deferring all backend auth, OAuth, database, storage, and AI integrations.

**Architecture:** Keep the app as one Vite + React + TypeScript application with route-level separation for `/`, `/auth/*`, `/app/*`, and `/admin/*`. Use mocked session state, mocked content fixtures, and shared layout primitives so the UI can be reviewed end-to-end now and connected to Supabase and backend workflows later without reworking the page structure.

**Tech Stack:** Vite, React 19, TypeScript, React Router v7, Tailwind CSS v4, Vitest, React Testing Library, existing `lucide-react`

---

## Scope Guardrails

- Front-end only. Do not implement Supabase, OAuth, storage uploads, API clients, or database persistence in this plan.
- Preserve the existing dashboard design system direction already present in [src/pages/dashboard-page.tsx](E:/Projek%20TRY%20OYT/src/pages/dashboard-page.tsx:1) and [src/index.css](E:/Projek%20TRY%20OYT/src/index.css:1): teal, cream, gold, deep green, rounded premium surfaces, Bahasa Indonesia copy, and serious exam-prep tone.
- Do not introduce shadcn/ui in this slice. The spec mentions it, but it is not installed yet and is not needed to finish the first front-end pass.
- Use local fixtures and preview-only role/subscription switches to simulate `pendaftar_baru`, `pro`, and `admin` states.
- Every page must include loading, empty, and error placeholders even if the first implementation drives them with local flags only.
- Keep layouts mobile-safe: collapse asymmetric desktop grids to one column below `md`, and use `min-h-[100dvh]` for full-height shells.

## File Structure

### Existing files to modify

- `src/App.tsx`: replace the one-page mount with the application router.
- `src/index.css`: formalize design tokens, layout variables, and shared utility classes from the existing dashboard.
- `src/main.tsx`: keep `BrowserRouter`, but ensure the new routed app shell is mounted cleanly.
- `src/pages/dashboard-page.tsx`: use as the source material for extraction, then either move or reduce it once the routed student dashboard exists.
- `src/pages/dashboard-page.test.tsx`: migrate expectations to the new routed student dashboard or replace with a more focused route-level test.

### New route and session files

- `src/router/app-router.tsx`: declare all public, student, and admin routes.
- `src/router/route-guards.tsx`: hold preview-only guards for role and subscription state.
- `src/lib/preview-session.ts`: central mock session state and helpers for `pendaftar_baru`, `pro`, and `admin`.

### New shared UI and layout files

- `src/components/layout/marketing-shell.tsx`: shell for marketing and public informational pages.
- `src/components/layout/product-shell.tsx`: shell for student app navigation, header, and content frame.
- `src/components/layout/admin-shell.tsx`: shell for admin navigation and operational surfaces.
- `src/components/ui/section-heading.tsx`: shared heading block for page sections.
- `src/components/ui/surface-panel.tsx`: reusable elevated panel aligned to the current rounded visual system.
- `src/components/ui/metric-pill.tsx`: reusable label chip for scores, states, and metadata.
- `src/components/ui/state-panel.tsx`: loading, empty, and error states in one consistent visual format.

### New mock data files

- `src/mocks/marketing-content.ts`: homepage and pricing preview content.
- `src/mocks/subscription-content.ts`: package cards, payment state labels, and upload instructions.
- `src/mocks/student-dashboard.ts`: summary metrics, weak blocks, attempts, and study queue.
- `src/mocks/tryouts.ts`: try out besar, try out per blok, result, and review fixtures.
- `src/mocks/analytics.ts`: block/topic weakness summaries and chart-friendly fake data.
- `src/mocks/admin-content.ts`: pending payments, AI queue counts, question bank status, and user list summaries.

### New page files

- `src/pages/home-page.tsx`
- `src/pages/auth/login-page.tsx`
- `src/pages/subscription-page.tsx`
- `src/pages/app/dashboard-page.tsx`
- `src/pages/app/tryout-catalog-page.tsx`
- `src/pages/app/tryout-session-page.tsx`
- `src/pages/app/tryout-result-page.tsx`
- `src/pages/app/review-page.tsx`
- `src/pages/app/analytics-page.tsx`
- `src/pages/admin/admin-dashboard-page.tsx`
- `src/pages/admin/payments-page.tsx`
- `src/pages/admin/questions-page.tsx`
- `src/pages/admin/reference-library-page.tsx`
- `src/pages/admin/review-queue-page.tsx`
- `src/pages/admin/ai-settings-page.tsx`

### New test files

- `src/router/app-router.test.tsx`
- `src/pages/home-page.test.tsx`
- `src/pages/subscription-page.test.tsx`
- `src/pages/app/dashboard-page.test.tsx`
- `src/pages/app/tryout-session-page.test.tsx`
- `src/pages/app/analytics-page.test.tsx`
- `src/pages/admin/admin-dashboard-page.test.tsx`

## Chunk 1: Route Foundation and Design System Extraction

### Task 1: Replace the one-page mount with a route-driven app shell

**Files:**
- Create: `src/router/app-router.tsx`
- Create: `src/router/route-guards.tsx`
- Create: `src/lib/preview-session.ts`
- Modify: `src/App.tsx`
- Test: `src/router/app-router.test.tsx`

- [ ] **Step 1: Write the failing route test**

Test for:
- `/` renders the marketing page shell
- `/app` redirects preview `pendaftar_baru` users to subscription UI
- `/app` renders student dashboard for preview `pro`
- `/admin` renders admin dashboard for preview `admin`

- [ ] **Step 2: Run the route test and confirm it fails**

Run: `npx vitest run src/router/app-router.test.tsx`
Expected: FAIL because the app still mounts a single dashboard page

- [ ] **Step 3: Implement the router and preview session helpers**

Define route groups:
- `/`
- `/auth/login`
- `/subscription`
- `/app/*`
- `/admin/*`

Use a tiny mock session contract like:

```ts
type PreviewRole = "pendaftar_baru" | "pro" | "admin";
type SubscriptionState = "pending_review" | "active" | "rejected" | "expired";
```

- [ ] **Step 4: Re-run the route test**

Run: `npx vitest run src/router/app-router.test.tsx`
Expected: PASS

- [ ] **Step 5: Smoke-test the app build**

Run: `npm run build`
Expected: successful production build

### Task 2: Extract the existing dashboard look into reusable front-end primitives

**Files:**
- Modify: `src/index.css`
- Create: `src/components/ui/section-heading.tsx`
- Create: `src/components/ui/surface-panel.tsx`
- Create: `src/components/ui/metric-pill.tsx`
- Create: `src/components/ui/state-panel.tsx`

- [ ] **Step 1: Move the current color and surface decisions into clear tokens**

Preserve:
- existing teal, cream, gold, green palette
- current ink and outline variables
- current rounded large-radius surfaces
- current serious, premium dashboard tone

- [ ] **Step 2: Add shared layout constraints**

Add reusable classes or utility wrappers for:
- `max-w-[1600px]`
- section spacing
- panel border and shadow
- responsive single-column mobile fallback

- [ ] **Step 3: Create the shared primitives**

Each primitive should solve one problem only:
- `SectionHeading`: title + supporting copy
- `SurfacePanel`: padded elevated container
- `MetricPill`: status or numeric label
- `StatePanel`: loading, empty, and error variants

- [ ] **Step 4: Verify no visual regressions in the existing dashboard preview**

Run: `npm test -- --run`
Expected: existing test coverage still passes or is replaced intentionally by the routed tests

## Chunk 2: Marketing, Login, and Subscription Surfaces

### Task 3: Build the public-facing homepage with the established design language

**Files:**
- Create: `src/mocks/marketing-content.ts`
- Create: `src/components/layout/marketing-shell.tsx`
- Create: `src/pages/home-page.tsx`
- Test: `src/pages/home-page.test.tsx`

- [ ] **Step 1: Write the homepage test first**

Test for:
- hero copy focused on passing the pharmacist professional exam
- feature summary for try out, analytics, and AI insight
- pricing preview section
- CTA that points users toward starting the journey

- [ ] **Step 2: Run the homepage test to confirm it fails**

Run: `npx vitest run src/pages/home-page.test.tsx`
Expected: FAIL because the route and page do not exist yet

- [ ] **Step 3: Build the homepage**

Required sections:
- hero
- feature overview
- simulation-first product explanation
- pricing preview
- short footer

Use the same palette and surface logic already established by the dashboard instead of inventing a second design system.

- [ ] **Step 4: Re-run the homepage test**

Run: `npx vitest run src/pages/home-page.test.tsx`
Expected: PASS

### Task 4: Build the UI-only login and gated subscription entry flow

**Files:**
- Create: `src/pages/auth/login-page.tsx`
- Create: `src/mocks/subscription-content.ts`
- Create: `src/pages/subscription-page.tsx`
- Test: `src/pages/subscription-page.test.tsx`

- [ ] **Step 1: Write the failing subscription flow test**

Test for:
- package cards are shown
- payment proof upload area is present as UI only
- `pending_review`, `rejected`, and `expired` states each have distinct helper copy
- `pendaftar_baru` users are guided here from the guarded app route

- [ ] **Step 2: Run the subscription test and confirm it fails**

Run: `npx vitest run src/pages/subscription-page.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement the pages**

`/auth/login` should include:
- email field
- password field
- Google login placeholder button marked as coming later

`/subscription` should include:
- package comparison cards
- transfer instructions
- proof upload dropzone shell
- status panel for approval/rejection/expiry copy

- [ ] **Step 4: Re-run the subscription test**

Run: `npx vitest run src/pages/subscription-page.test.tsx`
Expected: PASS

## Chunk 3: Student Dashboard, Analytics, and Review Surfaces

### Task 5: Refactor the existing dashboard into the routed student product shell

**Files:**
- Create: `src/components/layout/product-shell.tsx`
- Create: `src/mocks/student-dashboard.ts`
- Create: `src/pages/app/dashboard-page.tsx`
- Modify: `src/pages/dashboard-page.tsx`
- Modify: `src/pages/dashboard-page.test.tsx`
- Test: `src/pages/app/dashboard-page.test.tsx`

- [ ] **Step 1: Write the failing student dashboard route test**

Test for:
- quick actions to start try out besar and per blok
- weakest block summary
- recent attempts
- daily study queue

- [ ] **Step 2: Run the student dashboard test and confirm it fails**

Run: `npx vitest run src/pages/app/dashboard-page.test.tsx`
Expected: FAIL

- [ ] **Step 3: Extract the existing monolithic dashboard into the new app route**

Move the current visual composition into `/app/dashboard`, but split content from layout:
- shell/navigation in `product-shell`
- static fixture data in `student-dashboard`
- page composition in `src/pages/app/dashboard-page.tsx`

- [ ] **Step 4: Reduce or remove the legacy top-level dashboard page**

Choose one:
- re-export the new routed page temporarily, or
- delete its usage after route migration is complete

- [ ] **Step 5: Re-run dashboard tests**

Run: `npx vitest run src/pages/app/dashboard-page.test.tsx src/pages/dashboard-page.test.tsx`
Expected: PASS

### Task 6: Build rules-based analytics and review surfaces with mocked data

**Files:**
- Create: `src/mocks/analytics.ts`
- Create: `src/pages/app/analytics-page.tsx`
- Create: `src/pages/app/review-page.tsx`
- Test: `src/pages/app/analytics-page.test.tsx`

- [ ] **Step 1: Write the failing analytics test**

Test for:
- correctness by block
- weakness ranking by topic
- short insight cards that are explicitly rules-based, not AI-generated

- [ ] **Step 2: Run the analytics test and confirm it fails**

Run: `npx vitest run src/pages/app/analytics-page.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement the analytics and review pages**

Analytics page must show:
- strongest block
- weakest block
- topic ranking
- summary guidance card

Review page must show:
- user answer state
- correct answer
- explanation
- wrong-only filter control in UI form

- [ ] **Step 4: Re-run the analytics test**

Run: `npx vitest run src/pages/app/analytics-page.test.tsx`
Expected: PASS

## Chunk 4: Try Out Experience

### Task 7: Build the catalog, session, and result surfaces for try out besar and per blok

**Files:**
- Create: `src/mocks/tryouts.ts`
- Create: `src/pages/app/tryout-catalog-page.tsx`
- Create: `src/pages/app/tryout-session-page.tsx`
- Create: `src/pages/app/tryout-result-page.tsx`
- Test: `src/pages/app/tryout-session-page.test.tsx`

- [ ] **Step 1: Write the failing try out session test**

Test for:
- timer is visible
- numbered navigation is visible
- next and previous controls are present
- submit action appears at the end state

- [ ] **Step 2: Run the session test and confirm it fails**

Run: `npx vitest run src/pages/app/tryout-session-page.test.tsx`
Expected: FAIL

- [ ] **Step 3: Build the catalog page**

Include:
- try out besar card
- per blok cards for Clinical Science, Pharmaceutical Science, and Social, Behavioral and Administrative Pharmacy
- short simulation-first copy

- [ ] **Step 4: Build the session page with local state only**

Implement UI behavior only:
- question stem and options
- timer display
- question number rail
- next/previous controls
- final submit state

Do not persist answers yet. Keep all state local to the route.

- [ ] **Step 5: Build the result page**

Include:
- final score
- block distribution summary
- CTA to review explanations

- [ ] **Step 6: Re-run the try out test**

Run: `npx vitest run src/pages/app/tryout-session-page.test.tsx`
Expected: PASS

## Chunk 5: Admin Operational Front-End

### Task 8: Build the admin shell and the highest-priority operational pages

**Files:**
- Create: `src/components/layout/admin-shell.tsx`
- Create: `src/mocks/admin-content.ts`
- Create: `src/pages/admin/admin-dashboard-page.tsx`
- Create: `src/pages/admin/payments-page.tsx`
- Create: `src/pages/admin/questions-page.tsx`
- Create: `src/pages/admin/reference-library-page.tsx`
- Create: `src/pages/admin/review-queue-page.tsx`
- Create: `src/pages/admin/ai-settings-page.tsx`
- Test: `src/pages/admin/admin-dashboard-page.test.tsx`

- [ ] **Step 1: Write the failing admin dashboard test**

Test for:
- pending payments count
- total users
- total attempts
- pending AI review jobs
- failed AI jobs

- [ ] **Step 2: Run the admin test and confirm it fails**

Run: `npx vitest run src/pages/admin/admin-dashboard-page.test.tsx`
Expected: FAIL

- [ ] **Step 3: Build the admin shell**

Navigation should cover:
- dashboard
- payments
- question bank
- reference library
- AI review queue
- AI settings

- [ ] **Step 4: Build the admin pages with fixture-backed tables and summary panels**

Each page should expose the right operational shape now even before live data exists:
- payments: approval queue and status filters
- questions: draft/published overview and editing entry points
- reference library: file list and active/inactive indicators
- review queue: candidate status, evidence summary, retry action
- AI settings: provider key placeholders and feature toggles

- [ ] **Step 5: Re-run the admin dashboard test**

Run: `npx vitest run src/pages/admin/admin-dashboard-page.test.tsx`
Expected: PASS

## Chunk 6: Shared States, QA, and Handoff Readiness

### Task 9: Add state coverage and final verification for all front-end slices

**Files:**
- Modify: `src/pages/home-page.tsx`
- Modify: `src/pages/subscription-page.tsx`
- Modify: `src/pages/app/dashboard-page.tsx`
- Modify: `src/pages/app/tryout-session-page.tsx`
- Modify: `src/pages/app/analytics-page.tsx`
- Modify: `src/pages/admin/admin-dashboard-page.tsx`
- Modify: shared pages as needed to use `src/components/ui/state-panel.tsx`

- [ ] **Step 1: Add loading, empty, and error states across key routes**

Cover at minimum:
- subscription status lookup
- student dashboard summaries
- try out question load state
- analytics summary panels
- admin queue surfaces

- [ ] **Step 2: Verify responsive behavior manually**

Run: `npm run dev`
Check:
- mobile nav collapse
- no horizontal scrolling
- timer and question rail remain usable on narrow screens
- admin tables degrade into stacked rows or scroll containers safely

- [ ] **Step 3: Run the full test suite**

Run: `npm test -- --run`
Expected: PASS

- [ ] **Step 4: Run a production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Record backend handoff notes**

Document the placeholders that the next slice must replace:
- preview session source
- upload no-op handlers
- try out local state
- admin fixture data
- AI settings placeholders

## Backend Deferrals That Must Stay Out of This Slice

- Real login and session persistence
- Google OAuth implementation
- Supabase route protection
- payment proof upload to storage
- payment approval mutations
- question CRUD persistence
- AI provider key storage and secret handling
- result scoring persistence and historical attempts

## Suggested Delivery Order

1. Route foundation
2. Shared design system extraction
3. Public pages
4. Student dashboard
5. Analytics and review
6. Try out flow
7. Admin surfaces
8. Shared states and QA

Plan complete and saved to `docs/superpowers/plans/2026-05-01-pawang-masuk-apoteker-frontend-phase1-implementation.md`. Ready to execute?
