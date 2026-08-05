# Pawang Masuk Apoteker Phase 1 Fullstack Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current Phase 1 UI preview into a working fullstack product with Supabase-backed auth, subscriptions, try out runtime, admin operations, and AI ingestion while preserving the existing interface direction.

**Architecture:** Keep the current single Vite + React application for the client, but replace preview session and mock-driven state with typed Supabase Auth, Postgres, Storage, and Edge Function integrations. Preserve the existing page and shell structure in `src/pages/*`, `src/components/layout/*`, and `src/components/ui/*`; backend work should wire those surfaces to real data instead of redesigning them.

**Tech Stack:** React 19, TypeScript, Vite, React Router v7, Tailwind CSS v4, Supabase Auth, Supabase Postgres, Supabase Storage, Supabase Edge Functions, SQL migrations, `@supabase/supabase-js`, `@tanstack/react-query`, `zod`, Vitest, React Testing Library, Playwright

## Execution Status Note

- Chunks 1-7 have been implemented in-repo.
- Chunk 8 verification scaffolding is now split between:
  - dev/test-only preview helpers
  - gated Playwright specs that require real runtime credentials
  - deployment handoff notes under `docs/superpowers/handoff`
- Full live E2E remains dependent on a reachable Supabase runtime plus seeded credentials.

---

## Scope Check

The approved spec spans multiple independent subsystems: auth, subscriptions, try out runtime, analytics, admin CMS, and AI ingestion. This plan keeps them in one master document, but splits execution into delivery chunks so each chunk can ship usable software on top of the UI that already exists today.

## Current Baseline Locked Before Backend Work

- The UI shell is already built under `src/pages`, `src/components/layout`, and `src/components/ui`.
- The current product entry is login-first: `/` redirects to `/auth/login`. Do not reintroduce the old public landing page as the default entry during this phase.
- `src/lib/preview-session.ts`, `src/lib/preview-route-state.ts`, and `src/mocks/*` are temporary scaffolding. Replace them incrementally, not by rewriting the UI from scratch.
- Existing screens for student and admin should keep their visual language, structure, and Bahasa Indonesia product tone.
- The existing frontend plan in `docs/superpowers/plans/2026-05-01-pawang-masuk-apoteker-frontend-phase1-implementation.md` is now treated as completed UI baseline, not the source of truth for backend behavior.

## Scope Guardrails

- Use Supabase as the Phase 1 backend platform for auth, database, and storage.
- Keep all sensitive workflows that require secrets inside Edge Functions or equivalent secure server execution.
- Do not expose platform AI keys, service role keys, or raw storage internals in the browser.
- Keep `pro_max` and `mentor` schema-ready only. Do not build their UI workflows in this phase.
- Keep AI as optional or admin-assisted. Core learning flow must still work when AI is unavailable.
- Preserve the current route groups:
  - `/auth/*`
  - `/subscription`
  - `/app/*`
  - `/admin/*`

## File Structure

### Existing frontend files to modify

- `src/App.tsx`: keep mounting the app router, but add global providers.
- `src/main.tsx`: wrap the app in query, auth, and error providers.
- `src/router/app-router.tsx`: preserve route structure while connecting to live auth state.
- `src/router/route-guards.tsx`: replace preview-only guards with real session and role guards.
- `src/lib/preview-session.ts`: retire after real auth/session wiring is complete.
- `src/lib/preview-route-state.ts`: keep only for visual QA if still useful; remove from production data flow.
- `src/pages/auth/login-page.tsx`: connect email/password auth and leave Google login as optional follow-up task.
- `src/pages/subscription-page.tsx`: replace fake upload and fake status with real payment submission flow.
- `src/pages/app/dashboard-page.tsx`: replace fixture summaries with live queries.
- `src/pages/app/tryout-catalog-page.tsx`: load active templates from the database.
- `src/pages/app/tryout-session-page.tsx`: replace local session-only state with persisted attempts and answers.
- `src/pages/app/tryout-result-page.tsx`: load generated result snapshots.
- `src/pages/app/review-page.tsx`: load question review data from attempts and explanations.
- `src/pages/app/analytics-page.tsx`: replace mock analytics with derived backend summaries.
- `src/pages/admin/admin-dashboard-page.tsx`: load operational counts and queue summaries.
- `src/pages/admin/payments-page.tsx`: wire approval and rejection flows.
- `src/pages/admin/questions-page.tsx`: replace static cards with question CRUD and publish state.
- `src/pages/admin/reference-library-page.tsx`: wire file upload, metadata, and active state.
- `src/pages/admin/review-queue-page.tsx`: wire candidate review and retry actions.
- `src/pages/admin/ai-settings-page.tsx`: wire platform AI config and student BYOK management surface.

### New frontend infrastructure files

- `src/lib/env.ts`: validate public Supabase environment variables.
- `src/lib/supabase/browser-client.ts`: singleton browser client.
- `src/lib/supabase/query-client.ts`: shared React Query client.
- `src/lib/auth/session-provider.tsx`: auth session provider and bootstrap.
- `src/lib/auth/use-session.ts`: session hook with role and subscription helpers.
- `src/lib/auth/permissions.ts`: central role and access helpers.
- `src/lib/api/auth-api.ts`: login, logout, session refresh, profile bootstrap.
- `src/lib/api/subscription-api.ts`: package lookup, payment proof upload, submission status, admin approval actions.
- `src/lib/api/tryout-api.ts`: template lookup, attempt create, answer save, submit, result fetch, review fetch.
- `src/lib/api/analytics-api.ts`: dashboard summary, block performance, topic weakness queries.
- `src/lib/api/admin-api.ts`: operational metrics, question CRUD, references, queue listings.
- `src/lib/api/ai-api.ts`: platform AI config calls, review queue retry, student BYOK calls.
- `src/lib/mappers/*.ts`: map Supabase rows into the current UI view-model shape.
- `src/types/database.ts`: generated Supabase database types committed to the repo.

### New backend and platform files

- `supabase/config.toml`: local Supabase project config.
- `supabase/seed.sql`: local seed data for roles, blocks, topics, templates, and admin user bootstrap.
- `supabase/migrations/20260501000001_identity_and_profiles.sql`
- `supabase/migrations/20260501000002_subscriptions_and_payments.sql`
- `supabase/migrations/20260501000003_academic_content.sql`
- `supabase/migrations/20260501000004_tryout_runtime.sql`
- `supabase/migrations/20260501000005_analytics_and_ai.sql`
- `supabase/migrations/20260501000006_rls_and_storage.sql`
- `supabase/functions/_shared/env.ts`
- `supabase/functions/_shared/auth.ts`
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/gemini-client.ts`
- `supabase/functions/_shared/reference-retrieval.ts`
- `supabase/functions/platform-ai-config/index.ts`
- `supabase/functions/ingest-question-pdf/index.ts`
- `supabase/functions/retry-ingestion-candidate/index.ts`
- `supabase/functions/student-ai-insight/index.ts`

### New test and automation files

- `src/lib/auth/session-provider.test.tsx`
- `src/lib/auth/permissions.test.ts`
- `src/lib/api/subscription-api.test.ts`
- `src/lib/api/tryout-api.test.ts`
- `src/lib/api/analytics-api.test.ts`
- `src/lib/api/admin-api.test.ts`
- `tests/e2e/auth-and-subscription.spec.ts`
- `tests/e2e/pro-tryout-flow.spec.ts`
- `tests/e2e/admin-payments-and-queue.spec.ts`
- `playwright.config.ts`

## Chunk 1: Supabase Foundation and Runtime Wiring

### Task 1: Add client dependencies, Supabase project scaffolding, and typed runtime providers

**Files:**
- Modify: `package.json`
- Create: `src/lib/env.ts`
- Create: `src/lib/supabase/browser-client.ts`
- Create: `src/lib/supabase/query-client.ts`
- Create: `src/lib/auth/session-provider.tsx`
- Create: `src/lib/auth/use-session.ts`
- Modify: `src/main.tsx`
- Create: `supabase/config.toml`
- Test: `src/lib/auth/session-provider.test.tsx`

- [ ] **Step 1: Install the fullstack client dependencies**

Run: `npm install @supabase/supabase-js @tanstack/react-query zod`
Expected: `package.json` and `package-lock.json` updated without peer dependency errors

- [ ] **Step 2: Install the E2E test dependency**

Run: `npm install -D @playwright/test`
Expected: Playwright added to `devDependencies`

- [ ] **Step 3: Write the failing provider bootstrap test**

Test for:
- app renders when wrapped in session and query providers
- missing env values throw a readable configuration error

- [ ] **Step 4: Run the provider test and confirm it fails**

Run: `npx vitest run src/lib/auth/session-provider.test.tsx`
Expected: FAIL because provider and env modules do not exist yet

- [ ] **Step 5: Implement env validation and provider bootstrap**

Create:
- `src/lib/env.ts` for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- `src/lib/supabase/browser-client.ts` for the singleton Supabase browser client
- `src/lib/supabase/query-client.ts` for one shared React Query client
- `src/lib/auth/session-provider.tsx` and `src/lib/auth/use-session.ts` for session bootstrap and consumers

- [ ] **Step 6: Wrap the app in providers**

Modify `src/main.tsx` so the rendered app is wrapped by:
- `QueryClientProvider`
- `SessionProvider`

- [ ] **Step 7: Initialize local Supabase config**

Run: `npx supabase init`
Expected: `supabase/config.toml` created or updated for this repo

- [ ] **Step 8: Re-run the provider test**

Run: `npx vitest run src/lib/auth/session-provider.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

Run:
```bash
git add package.json package-lock.json src/main.tsx src/lib/env.ts src/lib/supabase src/lib/auth supabase/config.toml
git commit -m "chore: add supabase client foundation"
```

## Chunk 2: Identity, Roles, and Subscription Core

### Task 2: Implement auth, profile bootstrap, roles, subscriptions, payment submissions, and storage rules

**Files:**
- Create: `supabase/migrations/20260501000001_identity_and_profiles.sql`
- Create: `supabase/migrations/20260501000002_subscriptions_and_payments.sql`
- Create: `supabase/migrations/20260501000006_rls_and_storage.sql`
- Create: `supabase/seed.sql`
- Create: `src/lib/auth/permissions.ts`
- Create: `src/lib/api/auth-api.ts`
- Create: `src/lib/api/subscription-api.ts`
- Modify: `src/router/route-guards.tsx`
- Modify: `src/lib/preview-session.ts`
- Modify: `src/pages/auth/login-page.tsx`
- Modify: `src/pages/subscription-page.tsx`
- Modify: `src/pages/admin/payments-page.tsx`
- Test: `src/lib/auth/permissions.test.ts`
- Test: `src/lib/api/subscription-api.test.ts`
- Test: `src/router/app-router.test.tsx`

- [ ] **Step 1: Write the failing permission and subscription tests**

Test for:
- `pendaftar_baru` cannot enter `/app/*`
- `pro` with `expired` subscription is blocked from premium student routes
- payment submission upload requires auth
- admin-only actions reject non-admin callers

- [ ] **Step 2: Run the failing tests**

Run: `npx vitest run src/lib/auth/permissions.test.ts src/lib/api/subscription-api.test.ts src/router/app-router.test.tsx`
Expected: FAIL because real permissions and APIs are not implemented yet

- [ ] **Step 3: Create the identity and subscription schema**

Implement migrations for:
- `profiles`
- `subscriptions`
- `payment_submissions`
- `audit_logs`

Required fields:
- role
- subscription state
- subscription start and end timestamps
- payment proof path
- admin review metadata

- [ ] **Step 4: Add storage buckets and policies**

Add private bucket support for:
- `payment-proofs`

RLS and storage rules must allow:
- user upload of their own proof
- user read of their own proof
- admin read and review access

- [ ] **Step 5: Seed baseline data**

Use `supabase/seed.sql` to insert:
- blocks and topics needed by the current UI
- one admin profile
- one `pro` user
- one `pendaftar_baru` user
- sample subscription statuses

- [ ] **Step 6: Replace preview route guards with real session + role checks**

Modify `src/router/route-guards.tsx` so guards derive access from:
- Supabase auth session
- `profiles.role`
- latest subscription state

- [ ] **Step 7: Wire real login and logout**

Modify `src/pages/auth/login-page.tsx` and `src/lib/api/auth-api.ts` to support:
- email/password login
- auth error copy
- logout action from existing shells when session is active

- [ ] **Step 8: Wire subscription page and admin payments page**

Modify:
- `src/pages/subscription-page.tsx` to upload proof and display live status
- `src/pages/admin/payments-page.tsx` to approve or reject submissions and write audit logs

- [ ] **Step 9: Apply migrations and re-run tests**

Run:
- `npx supabase db reset`
- `npx vitest run src/lib/auth/permissions.test.ts src/lib/api/subscription-api.test.ts src/router/app-router.test.tsx`

Expected:
- local database resets successfully
- tests PASS

- [ ] **Step 10: Commit**

Run:
```bash
git add supabase/migrations supabase/seed.sql src/lib/auth src/lib/api src/router src/pages/auth/login-page.tsx src/pages/subscription-page.tsx src/pages/admin/payments-page.tsx
git commit -m "feat: add auth and subscription backend flow"
```

## Chunk 3: Academic Content, Tryout Runtime, and Result Snapshots

### Task 3: Implement question bank schema, exam templates, attempts, answers, and result generation

**Files:**
- Create: `supabase/migrations/20260501000003_academic_content.sql`
- Create: `supabase/migrations/20260501000004_tryout_runtime.sql`
- Create: `src/lib/api/tryout-api.ts`
- Create: `src/lib/mappers/tryout-mappers.ts`
- Modify: `src/pages/app/tryout-catalog-page.tsx`
- Modify: `src/pages/app/tryout-session-page.tsx`
- Modify: `src/pages/app/tryout-result-page.tsx`
- Modify: `src/pages/app/review-page.tsx`
- Modify: `src/pages/admin/questions-page.tsx`
- Test: `src/lib/api/tryout-api.test.ts`
- Test: `src/pages/app/tryout-session-page.test.tsx`

- [ ] **Step 1: Write the failing tryout persistence tests**

Test for:
- creating an attempt snapshots question content
- saving answers updates only the current user's attempt
- submitting an attempt creates a result row
- review page can retrieve answer, correct option, and explanation

- [ ] **Step 2: Run the tryout tests and confirm they fail**

Run: `npx vitest run src/lib/api/tryout-api.test.ts src/pages/app/tryout-session-page.test.tsx`
Expected: FAIL because no live runtime exists yet

- [ ] **Step 3: Implement academic content schema**

Create tables for:
- `questions`
- `question_options`
- `question_explanations`
- `blocks`
- `topics`
- `question_tags`
- `question_sources`

- [ ] **Step 4: Implement tryout runtime schema**

Create tables for:
- `exam_templates`
- `attempts`
- `attempt_items`
- `answers`
- `attempt_results`

Important rule:
- `attempt_items` must snapshot delivered question stem, options, correct answer, block, and topic at attempt creation time

- [ ] **Step 5: Wire question bank management**

Modify `src/pages/admin/questions-page.tsx` to support:
- list
- create draft
- edit
- publish
- block/topic assignment

- [ ] **Step 6: Replace local tryout state with live APIs**

Modify:
- `src/pages/app/tryout-catalog-page.tsx` to load active templates
- `src/pages/app/tryout-session-page.tsx` to create attempts, save answers, restore progress, and submit
- `src/pages/app/tryout-result-page.tsx` to load persisted result snapshots
- `src/pages/app/review-page.tsx` to load question review data

- [ ] **Step 7: Reset the local database and re-run tests**

Run:
- `npx supabase db reset`
- `npx vitest run src/lib/api/tryout-api.test.ts src/pages/app/tryout-session-page.test.tsx`

Expected: PASS

- [ ] **Step 8: Commit**

Run:
```bash
git add supabase/migrations src/lib/api/tryout-api.ts src/lib/mappers/tryout-mappers.ts src/pages/app src/pages/admin/questions-page.tsx
git commit -m "feat: add persisted tryout runtime"
```

## Chunk 4: Rules-Based Analytics and Student Dashboard Wiring

### Task 4: Replace dashboard and analytics mocks with derived database queries

**Files:**
- Create: `supabase/migrations/20260501000005_analytics_and_ai.sql`
- Create: `src/lib/api/analytics-api.ts`
- Create: `src/lib/mappers/analytics-mappers.ts`
- Modify: `src/pages/app/dashboard-page.tsx`
- Modify: `src/pages/app/analytics-page.tsx`
- Test: `src/lib/api/analytics-api.test.ts`
- Test: `src/pages/app/analytics-page.test.tsx`
- Test: `src/pages/app/dashboard-page.test.tsx`

- [ ] **Step 1: Write the failing analytics tests**

Test for:
- dashboard returns average score, strongest block, weakest block, and recent attempts
- analytics page returns block accuracy and topic weakness ranking
- empty state appears when the user has no completed attempts

- [ ] **Step 2: Run the analytics tests**

Run: `npx vitest run src/lib/api/analytics-api.test.ts src/pages/app/analytics-page.test.tsx src/pages/app/dashboard-page.test.tsx`
Expected: FAIL because analytics are still fixture-driven

- [ ] **Step 3: Implement derived analytics tables or SQL views**

Create:
- `user_block_performance`
- `user_topic_performance`
- any helper views needed for dashboard summary queries

Keep analytics rules-based. Do not depend on AI for core dashboard summaries.

- [ ] **Step 4: Replace dashboard and analytics page loaders**

Modify:
- `src/pages/app/dashboard-page.tsx`
- `src/pages/app/analytics-page.tsx`

Use live query data mapped into the existing cards, panels, and state surfaces.

- [ ] **Step 5: Re-run analytics tests**

Run: `npx vitest run src/lib/api/analytics-api.test.ts src/pages/app/analytics-page.test.tsx src/pages/app/dashboard-page.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

Run:
```bash
git add supabase/migrations src/lib/api/analytics-api.ts src/lib/mappers/analytics-mappers.ts src/pages/app/dashboard-page.tsx src/pages/app/analytics-page.tsx
git commit -m "feat: wire rules-based analytics"
```

## Chunk 5: Admin Operational Surfaces Beyond Payments

### Task 5: Implement operational monitoring, reference library, and review queue data flows

**Files:**
- Create: `src/lib/api/admin-api.ts`
- Create: `src/lib/mappers/admin-mappers.ts`
- Modify: `src/pages/admin/admin-dashboard-page.tsx`
- Modify: `src/pages/admin/reference-library-page.tsx`
- Modify: `src/pages/admin/review-queue-page.tsx`
- Modify: `src/mocks/admin-content.ts`
- Test: `src/lib/api/admin-api.test.ts`
- Test: `src/pages/admin/admin-dashboard-page.test.tsx`

- [ ] **Step 1: Write the failing admin operations tests**

Test for:
- admin dashboard shows live pending payment count, total users, total attempts, pending AI jobs, and failed AI jobs
- review queue page shows status and evidence summary from stored candidates
- reference page lists uploaded docs and active/inactive state

- [ ] **Step 2: Run the admin tests**

Run: `npx vitest run src/lib/api/admin-api.test.ts src/pages/admin/admin-dashboard-page.test.tsx`
Expected: FAIL because pages still use fixtures

- [ ] **Step 3: Implement reference metadata and review queue data access**

Wire:
- `reference_documents`
- `reference_document_versions`
- `ingestion_jobs`
- `ingested_question_candidates`
- `candidate_verifications`
- `review_queue`

- [ ] **Step 4: Replace admin dashboard and queue loaders**

Modify:
- `src/pages/admin/admin-dashboard-page.tsx`
- `src/pages/admin/reference-library-page.tsx`
- `src/pages/admin/review-queue-page.tsx`

Keep the current UI composition, but replace fixture summaries with live queries.

- [ ] **Step 5: Re-run admin tests**

Run: `npx vitest run src/lib/api/admin-api.test.ts src/pages/admin/admin-dashboard-page.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

Run:
```bash
git add src/lib/api/admin-api.ts src/lib/mappers/admin-mappers.ts src/pages/admin/admin-dashboard-page.tsx src/pages/admin/reference-library-page.tsx src/pages/admin/review-queue-page.tsx
git commit -m "feat: wire admin operational surfaces"
```

## Chunk 6: Platform AI Config, Student BYOK, and Edge Function Security

### Task 6: Add secure AI provider configuration and optional student BYOK workflows

**Files:**
- Create: `supabase/functions/_shared/env.ts`
- Create: `supabase/functions/_shared/auth.ts`
- Create: `supabase/functions/_shared/cors.ts`
- Create: `supabase/functions/_shared/gemini-client.ts`
- Create: `supabase/functions/platform-ai-config/index.ts`
- Create: `supabase/functions/student-ai-insight/index.ts`
- Create: `src/lib/api/ai-api.ts`
- Modify: `src/pages/admin/ai-settings-page.tsx`
- Modify: `src/pages/app/analytics-page.tsx`

- [ ] **Step 1: Write the failing AI API tests**

Test for:
- admin can save and test platform AI config without exposing secrets to the client
- student can save BYOK, test it, and delete it
- analytics page falls back cleanly when BYOK is missing or invalid

- [ ] **Step 2: Run the AI tests**

Run: `npx vitest run src/lib/api/analytics-api.test.ts src/lib/api/admin-api.test.ts`
Expected: FAIL because AI endpoints do not exist yet

- [ ] **Step 3: Implement AI config schema and secure invocation path**

Use:
- `ai_provider_configs`
- `user_ai_credentials`
- `ai_usage_logs`

Platform AI config must be write-only from the browser perspective.

- [ ] **Step 4: Implement Edge Functions**

Create:
- `platform-ai-config` for test/save/rotate platform key
- `student-ai-insight` for optional weakness summary using BYOK

Both functions must validate caller role and reject unauthorized access.

- [ ] **Step 5: Wire the current admin and analytics UI**

Modify:
- `src/pages/admin/ai-settings-page.tsx`
- `src/pages/app/analytics-page.tsx`

Use the existing UI cards and state panels for success, error, and fallback behavior.

- [ ] **Step 6: Re-run tests**

Run: `npx vitest run src/lib/api/analytics-api.test.ts src/lib/api/admin-api.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

Run:
```bash
git add supabase/functions src/lib/api/ai-api.ts src/pages/admin/ai-settings-page.tsx src/pages/app/analytics-page.tsx
git commit -m "feat: add secure ai configuration and byok flow"
```

## Chunk 7: AI PDF Ingestion and Human Review Workflow

### Task 7: Implement ingestion jobs, candidate extraction, verification states, and retry flow

**Files:**
- Create: `supabase/functions/_shared/reference-retrieval.ts`
- Create: `supabase/functions/ingest-question-pdf/index.ts`
- Create: `supabase/functions/retry-ingestion-candidate/index.ts`
- Modify: `src/pages/admin/reference-library-page.tsx`
- Modify: `src/pages/admin/review-queue-page.tsx`
- Modify: `src/lib/api/admin-api.ts`
- Test: `tests/e2e/admin-payments-and-queue.spec.ts`

- [ ] **Step 1: Write the failing ingestion workflow E2E test**

Test for:
- admin uploads a question PDF
- ingestion job is created
- review queue receives candidates
- admin can approve, reject, or retry a candidate

- [ ] **Step 2: Run the E2E test and confirm it fails**

Run: `npx playwright test tests/e2e/admin-payments-and-queue.spec.ts`
Expected: FAIL because ingestion and queue actions are not implemented

- [ ] **Step 3: Implement ingestion storage and job creation**

Wire:
- `question-pdfs` storage bucket
- `ingestion_jobs`
- `ingested_question_candidates`

Support both:
- verification mode
- generation mode

- [ ] **Step 4: Implement the review queue mutation path**

Support actions:
- approve
- edit then approve
- reject
- retry

Every action must write audit data.

- [ ] **Step 5: Wire the review queue UI**

Modify:
- `src/pages/admin/reference-library-page.tsx` for PDF upload and status
- `src/pages/admin/review-queue-page.tsx` for evidence and decision actions

- [ ] **Step 6: Re-run the E2E test**

Run: `npx playwright test tests/e2e/admin-payments-and-queue.spec.ts`
Expected: PASS

- [ ] **Step 7: Commit**

Run:
```bash
git add supabase/functions src/lib/api/admin-api.ts src/pages/admin/reference-library-page.tsx src/pages/admin/review-queue-page.tsx tests/e2e/admin-payments-and-queue.spec.ts
git commit -m "feat: add ai ingestion review workflow"
```

## Chunk 8: End-to-End Product Verification and Deployment Handoff

### Task 8: Verify complete flows, remove preview-only production dependencies, and document deployment

**Files:**
- Modify: `src/lib/preview-session.ts`
- Modify: `src/lib/preview-route-state.ts`
- Create: `playwright.config.ts`
- Create: `tests/e2e/auth-and-subscription.spec.ts`
- Create: `tests/e2e/pro-tryout-flow.spec.ts`
- Modify: `docs/superpowers/plans/2026-05-01-pawang-masuk-apoteker-phase1-fullstack-implementation.md`
- Create: `docs/superpowers/handoff/2026-05-01-pawang-masuk-apoteker-phase1-backend-notes.md`

- [ ] **Step 1: Add the end-to-end auth and subscription flow test**

Test for:
- user logs in
- `pendaftar_baru` reaches subscription
- admin approves payment
- user gains `pro` access

- [ ] **Step 2: Add the end-to-end pro tryout flow test**

Test for:
- `pro` user starts try out besar
- answers are persisted
- submit creates a result
- review page loads explanations

- [ ] **Step 3: Run the end-to-end suite**

Run:
- `npx playwright test tests/e2e/auth-and-subscription.spec.ts`
- `npx playwright test tests/e2e/pro-tryout-flow.spec.ts`

Expected: PASS

- [ ] **Step 4: Remove preview-only production dependencies**

Do one of:
- delete `src/lib/preview-session.ts` after all routes stop importing it, or
- keep it behind a dev-only switch and ensure production routes never depend on it

Do the same for `src/lib/preview-route-state.ts`.

- [ ] **Step 5: Run the complete verification suite**

Run:
- `npm test -- --run`
- `npm run build`
- `npx playwright test`

Expected:
- all unit and route tests PASS
- production build succeeds
- all E2E scenarios PASS

- [ ] **Step 6: Document deployment and operational handoff**

Create `docs/superpowers/handoff/2026-05-01-pawang-masuk-apoteker-phase1-backend-notes.md` with:
- required env vars
- Supabase buckets
- migration order
- admin bootstrap steps
- Coolify deployment notes
- AI key rotation procedure

- [ ] **Step 7: Commit**

Run:
```bash
git add src/lib/preview-session.ts src/lib/preview-route-state.ts playwright.config.ts tests/e2e docs/superpowers/handoff
git commit -m "chore: finalize fullstack verification and handoff"
```

## Deferred Items That Must Stay Out of This Phase

- Mentor-facing UI and workflows
- Pro Max recording library UI
- Leaderboard and ranking systems
- Try out per materi
- Long-form coaching chat
- Adaptive study planner
- Automatic publication of AI-generated content without human review

## Suggested Execution Order

1. Supabase foundation
2. Identity and subscriptions
3. Tryout runtime
4. Analytics
5. Admin operations
6. AI config and BYOK
7. AI ingestion review queue
8. End-to-end verification and deployment handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-01-pawang-masuk-apoteker-phase1-fullstack-implementation.md`. Ready to execute?
