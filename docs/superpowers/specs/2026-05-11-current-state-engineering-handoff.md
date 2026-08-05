# Pawang Masuk Apoteker Current-State Engineering Handoff

Date: 2026-05-11
Status: Current-state product specification for engineering handoff
Audience: Product and engineering team

## 1. Product Overview

Pawang Masuk Apoteker is a web application for pharmacy exam preparation. The current codebase supports a gated student experience, subscription verification, timed tryout sessions, post-attempt review, performance analytics, leaderboard views, mentor-access question authoring, and admin operational tooling.

The implementation is a single React application backed by Supabase for authentication, persistence, storage, RPC workflows, and edge functions. The product is intentionally role-gated: users do not share the same surface area, and access decisions combine both role and subscription state.

## 2. Current Scope

The current shipped product surface includes:

- authentication with email/password login and password recovery
- subscription purchase confirmation through manual payment proof upload
- student dashboard, tryout catalog, timed tryout session, result page, and review page
- student analytics and leaderboard access
- profile management including name, password, avatar, and leaderboard alias
- question bank access for mentors and admins
- admin dashboard, payment review, question management, and user management
- backend support for question batch ingestion, OCR, review queue decisions, AI-powered enrichment, and platform AI configuration

The codebase also contains features that exist in modules and tests but are not exposed by the current router:

- marketing home page module
- admin review queue page
- admin reference library page

## 3. Architecture Summary

### Frontend

- React 19
- TypeScript
- Vite
- React Router 7
- TanStack React Query
- Tailwind CSS 4

The frontend is organized around route-level pages in `src/pages`, domain APIs in `src/lib/api`, mapping/view-model utilities in `src/lib/mappers`, and shell layouts in `src/components/layout`.

### Backend

- Supabase Auth for session and identity
- Supabase Postgres for domain data and reporting views
- Supabase Storage for user and content files
- Supabase RPC for transactional workflows and computed datasets
- Supabase Edge Functions for operational and AI-assisted tasks

### Test Stack

- Vitest for unit and component tests
- Testing Library for React rendering tests
- Playwright for end-to-end scenarios

## 4. Roles and Access Model

The active role model is defined in the client permission layer as:

- `pendaftar_baru`
- `pro`
- `mentor`
- `admin`

Subscription state is tracked separately:

- `pending_review`
- `active`
- `rejected`
- `expired`

Current access behavior:

- `pendaftar_baru` can authenticate and manage profile data, but is routed to `/subscription` instead of the student app.
- `pro` can access the student app only when the subscription state resolves to `active`.
- `mentor` can access the student app and the question bank surface.
- `admin` can access the admin surface and is redirected away from student routes to `/admin`.

Important implementation rule: access is not based on role alone. Student access is computed from an `AccessSnapshot` that combines role and subscription state.

## 5. Route Map

### Public and Auth Routes

- `/` redirects to `/auth/login`
- `/auth/login`
- `/auth/reset-password`
- `/subscription`

### Authenticated Shared Route

- `/profile`

### Student App Routes

- `/app`
- `/app/analytics`
- `/app/leaderboard`
- `/app/review`
- `/app/review/:attemptId`
- `/app/tryout`
- `/app/tryout/session`
- `/app/tryout/result`

### Mentor Question Authoring Routes

- `/app/questions`
- `/app/questions/new`
- `/app/questions/:questionId/edit`

These routes are guarded for mentor/admin-capable authoring access, but admins are redirected to the admin namespace.

### Admin Routes

- `/admin`
- `/admin/payments`
- `/admin/questions`
- `/admin/questions/new`
- `/admin/questions/:questionId/edit`
- `/admin/users`

### Implemented but Not Currently Routed

- `src/pages/home-page.tsx`
- `src/pages/admin/review-queue-page.tsx`
- `src/pages/admin/reference-library-page.tsx`

These modules have implementation and test coverage, but they are not currently mounted in `src/router/app-router.tsx`.

## 6. Frontend Surface Ownership

### App Shells

- `MarketingShell` is used by the landing-page module, but the landing page is not currently exposed.
- `ProductShell` is the primary student and mentor shell.
- `AdminShell` is the admin-only shell.

### Session and Access

- session state is provided through `src/lib/auth/session-provider.tsx`
- route protection is implemented in `src/router/route-guards.tsx`
- profile bootstrap occurs after login to ensure a `profiles` row exists

### Domain API Layer

Frontend pages do not talk directly to Supabase in most cases. The main integration point is the domain API layer in `src/lib/api`.

Key modules:

- `auth-api.ts`
- `subscription-api.ts`
- `profile-api.ts`
- `tryout-api.ts`
- `analytics-api.ts`
- `leaderboard-api.ts`
- `question-authoring-api.ts`
- `admin-api.ts`

## 7. Backend Domain Model

The current backend shape can be inferred from migrations, RPC usage, storage usage, and API adapters.

### Identity and Access

- `profiles`
- `subscriptions`
- `payment_submissions`

### Tryout Runtime

- `exam_templates`
- `attempts`
- `attempt_items`
- `answers`
- `attempt_results`

### Academic Content

- `questions`
- `question_options`
- `question_explanations`
- `blocks`
- `topics`

### Authoring and Ingestion

- `question_upload_batches`
- `question_upload_items`
- `question_draft_references`
- `question_draft_reviews`
- `reference_documents`
- `reference_document_versions`
- `ingestion_jobs`
- `review_queue`

### Reporting and Read Models

- `user_block_performance`
- `user_topic_performance`
- `user_recent_attempt_summaries`
- `admin_question_batch_overview`
- `admin_question_enrichment_queue`

## 8. Storage Buckets

The current implementation references these storage buckets:

- `payment-proofs`
- `profile-avatars`
- `question-media`
- `reference-library`

Storage usage patterns:

- payment proof uploads are signed for preview and admin review
- profile avatars are replaceable and user-scoped
- question and explanation images are stored in `question-media`
- reference PDFs are uploaded before ingestion jobs are queued

## 9. RPC and Edge Function Surface

### RPC Calls Used by the Frontend

- `start_attempt_from_template`
- `save_attempt_answer`
- `submit_attempt`
- `pause_attempt`
- `resume_attempt`
- `review_payment_submission`
- `list_admin_users`
- `get_leaderboard`
- `get_personal_weakness_diagnosis`

These RPCs cover the core transactional workflows that should remain server-controlled.

### Edge Functions Present

- `admin-manage-users`
- `ingest-question-pdf`
- `ocr-question-pdf`
- `platform-ai-config`
- `retry-ingestion-candidate`
- `review-ingestion-candidate`
- `student-ai-insight`
- `upload-question-batch`

Shared backend helpers exist under `supabase/functions/_shared` for auth, AI configuration, question authoring, reference retrieval, taxonomy, and review-queue logic.

## 10. Core User Workflows

### Authentication and Profile Bootstrap

1. User logs in through Supabase Auth.
2. `bootstrapProfile` upserts a `profiles` row.
3. Route guards fetch both profile and latest subscription state.
4. Navigation target is resolved from the combined access snapshot.

### Subscription Activation

1. A new registrant lands on `/subscription`.
2. The user uploads a payment proof into `payment-proofs`.
3. A `payment_submissions` row is created with `pending_review`.
4. Admin approves or rejects through the payment review surface.
5. Approval updates subscription state and unlocks student access.

### Tryout Runtime

1. Student opens the tryout catalog and selects a published template.
2. Frontend starts an attempt through `start_attempt_from_template`.
3. Session state loads attempt items and previous answers.
4. Answers are persisted through `save_attempt_answer`.
5. Pause and resume are handled by dedicated RPCs.
6. Submission is finalized through `submit_attempt`.
7. Results and review pages are assembled from stored snapshots and explanations.

### Analytics and Leaderboard

- dashboard summary reads from reporting tables and recent-attempt summaries
- analytics page reads block and topic performance views
- leaderboard is server-ranked through `get_leaderboard`
- personal weakness diagnosis is computed by RPC over a selected date range

### Question Authoring

There are two active authoring paths:

- direct admin question CRUD on published question records
- draft/batch-based authoring for manual entry, uploads, OCR, and enrichment workflows

Mentors currently have access to the question-bank surface through the `/app/questions` namespace. Admins use the `/admin/questions` namespace for the same domain with admin shell navigation.

### Admin Operations

The routed admin operational surface currently includes:

- dashboard overview
- payment verification
- question management
- user management

The codebase also includes review-queue and reference-library pages, but those surfaces are currently dormant from the main router.

## 11. UI and Navigation Behavior

Navigation is role-sensitive:

- student and mentor surfaces render via `createProductNavItems`
- admin surfaces render via `createAdminNavItems`
- profile page swaps between product and admin shell depending on user role

The UI includes preview-state helpers to force loading, empty, and error states for some pages, especially in admin and operational surfaces.

## 12. Testing Coverage

### Unit and Component Coverage

The repo includes focused tests for:

- route guards
- auth and permission helpers
- subscription APIs
- tryout APIs and mappers
- analytics APIs and mappers
- question authoring APIs and editor flows
- admin APIs and page surfaces

### End-to-End Coverage

Playwright covers key current-state scenarios:

- new registrant subscription flow through admin approval
- pro user tryout session, result, and review flow
- admin payment and operational preview states

These tests confirm that the implemented product is centered on access control, tryout execution, and admin operational handling.

## 13. External Dependencies and Runtime Assumptions

- Supabase project and env configuration are required for auth, DB, storage, RPC, and functions
- local development relies on Supabase CLI and Docker orchestration
- Vercel SPA rewrite support is present through `vercel.json`
- E2E tests assume seeded users and reachable app plus backend runtime

## 14. Current Constraints and Observations

- The router does not currently expose the marketing home page, review queue page, or reference library page even though those modules exist.
- Several backend capabilities are ahead of the routed UI surface, especially around ingestion review and reference management.
- Access control for `mentor` is already active in code, which makes the product broader than the original phase-1 role model.
- The product is operationally dependent on Supabase RPC contracts; any backend schema changes should be evaluated against both frontend API adapters and migration tests.
- Storage-backed flows depend on signed URL generation, so bucket policies and object paths are part of the product contract.

## 15. Recommended Onboarding Sequence for Engineers

1. Read `src/router/app-router.tsx` and `src/router/route-guards.tsx`.
2. Review `src/lib/auth/permissions.ts` to understand access rules.
3. Walk the domain APIs in `src/lib/api`.
4. Inspect the latest Supabase migrations for current schema and RPC behavior.
5. Use the Playwright specs to understand the expected live workflows.

## 16. Current-State Summary

This app is no longer just a student tryout frontend. In its present form, it is a multi-surface exam-preparation platform with:

- subscription-gated student workflows
- timed and persistent tryout runtime
- reporting and ranking features
- mentor-access content authoring
- admin operational control
- AI-assisted ingestion infrastructure that is partially surfaced in UI

The most important engineering fact is that current behavior is defined by the combination of routed React surfaces, Supabase RPC workflows, storage-backed file flows, and a role-plus-subscription access model.
