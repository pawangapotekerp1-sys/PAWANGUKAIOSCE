# Pawang Masuk Apoteker Phase 1 Design

Date: 2026-04-30
Status: Draft for user review

## 1. Product Summary

Pawang Masuk Apoteker is a SaaS web application for pharmacy students and fresh graduates preparing for pharmacist professional exams. The first delivery focuses on a serious, exam-like CBT experience, admin-operated subscriptions, and a controlled AI-assisted content pipeline for question ingestion and verification.

Phase 1 is intentionally scoped as a balanced learning platform:

- strong student exam workflow
- admin tooling that is operational on day one
- AI used as an editorial assistant, not as the source of truth

## 2. Phase 1 Scope

### In Scope

- landing page and pricing preview
- email/password authentication
- optional Google OAuth
- role-based access for `pendaftar_baru`, `pro`, and `admin`
- schema-ready roles for `pro_max` and `mentor`
- subscription flow with manual transfer and proof upload
- admin payment verification
- student dashboard
- try out besar
- try out per blok
- review and pembahasan
- rules-based analytics
- admin dashboard with operational monitoring
- question bank management
- reference library management
- AI PDF import with review queue
- Gemini-based AI provider configuration
- optional student BYOK for personal AI weakness insight

### Out of Scope for Phase 1

- mentor UI and mentoring workflows
- Pro Max recording library UI
- leaderboard
- try out per materi
- adaptive study planner
- long-form AI coaching
- automatic publishing of AI-generated or AI-verified content
- internet-based references for academic validation

## 3. Product Goals

### Primary Goals

- deliver a credible CBT simulation for pharmacist exam preparation
- give admins enough tools to run the product without developer intervention
- keep academic quality controlled through admin review and reference-grounded AI
- separate core learning value from optional AI features

### Non-Goals

- replacing academic reviewers with AI
- building a full mentoring platform in phase 1
- building a complete media-learning platform in phase 1

## 4. User Roles and Access Model

### Active Phase 1 Roles

#### `pendaftar_baru`

Can access:

- subscription page
- profile basics
- package information

Cannot access:

- dashboard
- tryouts
- analytics
- premium review content

#### `pro`

Can access:

- dashboard
- try out besar
- try out per blok
- results
- review and pembahasan
- rules-based weakness analytics
- optional AI weakness insight if BYOK is configured

#### `admin`

Can access:

- all student-facing areas
- user management
- payment verification
- role changes
- admin monitoring dashboard
- question bank
- reference library
- AI provider settings
- AI import review queue

### Schema-Ready Future Roles

#### `pro_max`

Reserved for:

- all `pro` capabilities
- Zoom recording library access in a later phase

#### `mentor`

Reserved for:

- student progress visibility
- weakness review for assigned students
- mentorship workflows in a later phase

### Access Model Rules

- role and subscription state are separate
- role determines product surface
- subscription state determines premium eligibility
- frontend guards improve UX, but database rules remain the true enforcement layer
- premium student learning access requires both a premium student role and an `active` subscription state
- when a premium subscription expires, the user keeps their historical role assignment but is treated as locked out of premium learning surfaces until reactivated

## 5. Subscription Model

Phase 1 uses manual transfer verification.

Flow:

1. User registers and receives `pendaftar_baru` role.
2. User is routed to subscription.
3. User selects a package and uploads proof of transfer.
4. Submission status becomes `pending_review`.
5. Admin approves or rejects the payment.
6. On approval, the user receives premium access for the active subscription period.

Recommended subscription states:

- `pending_review`
- `active`
- `rejected`
- `expired`

## 6. Student Experience Design

### Homepage

- value proposition focused on passing the pharmacist professional exam
- feature summary for tryout, analytics, and AI insight
- CTA to begin try out journey
- subscription preview

### Authentication

- email/password login
- optional Google OAuth
- required login before dashboard access

### Dashboard

For `pro` users:

- average score
- strongest block
- weakest block
- study progress summary
- quick links to try out besar and try out per blok
- short non-AI insight cards

For `pendaftar_baru` users:

- locked product shell or direct routing to subscription
- very limited navigation to avoid confusion

### Try Out Besar

- 200 mixed questions
- real-time timer
- numbered navigation
- next and previous controls
- submit at the end

Result surface:

- final score
- block-level correct/incorrect distribution
- review with explanations
- wrong-only filter

### Try Out per Blok

Blocks:

- Clinical Science
- Pharmaceutical Science
- Social, Behavioral and Administrative Pharmacy

Uses the same simulation-first model as try out besar:

- exam-like flow
- no full review until submit

### Review and Pembahasan

Each question supports:

- correct answer
- explanation
- user answer highlight
- wrong-only filter

### Rules-Based Analytics

Phase 1 analytics without AI:

- correctness by block
- correctness by topic
- weak area ranking
- dashboard summary of weakness

### Optional Student AI Insight

Available only for `pro` users who configure their own Gemini API key.

Scope:

- short weakness summary
- short study recommendation
- no long coaching sessions
- no adaptive planner

If AI is unavailable, the product falls back to rules-based analytics only.

## 7. Admin Experience Design

### Admin Dashboard

Phase 1 admin dashboard includes:

- pending payments count
- total users
- total attempts
- aggregate performance summary
- pending AI review jobs
- failed AI jobs

### User Management

Admins can:

- search users
- inspect profile and subscription state
- approve or reject payment submissions
- change role where allowed

### Question Bank Management

Admins can:

- create questions manually
- edit questions
- assign answer options
- tag block and topic
- add or edit explanations
- save draft or publish

### Reference Library

Admins can:

- upload reference documents
- view metadata
- activate or deactivate documents
- control which documents are available to AI workflows

### AI Provider Settings

Admins can:

- configure platform Gemini API key
- test connection
- rotate key
- enable or disable specific AI features

Platform AI is reserved for admin workflows and not for all student-facing AI activity.

### AI Review Queue

Admins can:

- inspect extracted question candidates
- inspect predicted tags
- inspect detected answer and explanation
- inspect reference evidence
- inspect verification status
- approve, edit then approve, reject, or retry

## 8. AI Strategy

### Principles

- AI is an assistant, not the authority
- academic validation must come from internal curated references
- anything uncertain must remain in review, not auto-publish

### Provider Strategy

- primary model: `gemini-3-flash-preview`
- fallback model: `gemini-2.5-flash-lite`
- optional second fallback: `gemini-2.5-flash`

This design assumes a provider abstraction so model changes do not force broad application rewrites.

### Platform AI vs Student AI

#### Platform AI

Used for:

- PDF question import
- question extraction
- block/topic tagging
- explanation verification
- draft explanation generation when explanation is missing

Credential source:

- admin-configured platform key
- stored securely on the backend
- never exposed in the client

#### Student AI

Used for:

- personal weakness insight

Credential source:

- user BYOK
- stored encrypted per account
- never exposed again in plaintext after submission
- only used for that user's requests

## 9. AI Content Ingestion Workflow

### Supported Inputs

- PDF question sets
- PDFs may or may not include answer keys and explanations

### Mode A: Verification Mode

Used when uploaded material already contains answer keys or explanations.

AI tasks:

- extract questions and options
- identify answer key
- extract existing explanation
- tag block and topic
- verify consistency against curated references

AI must not generate a replacement explanation unless the admin explicitly retries in generation mode.

### Mode B: Generation Mode

Used when uploaded material does not include explanation.

AI tasks:

- extract questions and options
- infer best answer
- tag block and topic
- create draft explanation
- attach internal-reference evidence

### Candidate Statuses

- `draft`
- `verified`
- `needs_review`
- `conflict_found`
- `approved`
- `rejected`
- `failed`

### Review Requirement

No candidate becomes a live published question without admin approval.

## 10. High-Level Architecture

### Frontend

- React
- TypeScript
- Vite
- React Router v7
- Tailwind CSS
- shadcn/ui

### Backend Platform

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase Edge Functions or secure server functions for AI and secret-handling workflows

### Deployment

- app deployed through Coolify
- managed Supabase for database, auth, and storage

### App Surface Structure

- `/` marketing
- `/auth/*` authentication
- `/app/*` student product area
- `/admin/*` admin product area

Single app structure is preferred for phase 1 to reduce complexity while keeping route-level separation.

## 11. Data Model

### Identity and Access

- `profiles`
- `subscriptions`
- `payment_submissions`
- `audit_logs`

Role may be stored in `profiles` for phase 1 simplicity, with a structure that can later evolve to a dedicated assignment table if multi-role needs emerge.

### Academic Content

- `questions`
- `question_options`
- `question_explanations`
- `blocks`
- `topics`
- `question_tags`
- `question_sources`

### Tryout Runtime

- `exam_templates`
- `attempts`
- `attempt_items`
- `answers`
- `attempt_results`

Important rule:

- attempts must snapshot the delivered question set so historical scoring remains stable even if the question bank later changes

### Analytics

- `user_block_performance`
- `user_topic_performance`
- derived summaries for dashboard use

### AI and Editorial

- `ai_provider_configs`
- `user_ai_credentials`
- `ai_usage_logs`
- `ingestion_jobs`
- `ingested_question_candidates`
- `candidate_verifications`
- `review_queue`
- `reference_documents`
- `reference_document_versions`

## 12. Storage Design

Private buckets:

- `payment-proofs`
- `question-pdfs`
- `reference-library`

Future bucket:

- `zoom-recordings`

Storage rules:

- all sensitive files remain private
- file access uses signed URLs or storage RLS
- uploaded proofs are visible only to the uploader and admins
- reference documents are available only to admins and backend AI workflows

## 13. Security Model

### Core Rules

- RLS enabled on all sensitive tables
- route guards for UX, RLS for real protection
- secrets never stored in the frontend
- audit logging for sensitive admin actions

### Sensitive Actions to Audit

- role changes
- payment approvals and rejections
- AI provider configuration updates
- candidate approval and rejection
- reference activation or deactivation

### Credential Security

Platform AI key:

- stored securely on backend infrastructure
- never returned to the browser after save

Student BYOK:

- stored encrypted at rest
- not visible to admins
- not written into general logs
- can be updated, tested, or deleted by the owning user

## 14. Error Handling

### Error Domains

#### Auth and Access

- invalid login
- expired session
- unauthorized route access
- restricted access for `pendaftar_baru`

#### Subscription and Payment

- upload failure
- pending verification
- rejected payment
- expired subscription

#### Tryout Runtime

- incomplete attempt data
- timer expiry
- submit failure
- result generation failure

#### AI Configuration and Usage

- platform key missing
- user BYOK missing
- invalid key
- rate limit or quota exceeded
- model unavailable
- fallback failure

#### AI Ingestion

- PDF parse failure
- candidate extraction failure
- low-confidence tagging
- missing reference evidence
- answer-reference conflict

### UX Rules

- student-facing errors should be short and task-oriented
- admin-facing errors should include operational detail and next action
- core learning flow must continue even when optional AI features fail

## 15. Testing Strategy

### Unit Tests

- scoring
- performance aggregation
- permission helpers
- AI model fallback selection
- AI status mapping

### Integration Tests

- auth and role gating
- payment approval flow
- tryout submission and result generation
- question publishing flow
- student BYOK save, test, and delete flow

### End-to-End Tests

- new registrant registration to subscription funnel
- admin payment approval leading to Pro access
- Pro user completing try out besar
- admin PDF upload leading to populated review queue

### Manual QA

- timer behavior
- large question navigation
- long review pages
- admin queue usability
- mobile layout fit

## 16. Phase 1 Delivery Slices

1. Application foundation
2. Subscription and access control
3. Tryout engine
4. Rules-based analytics
5. Admin content system
6. AI layer

Each slice should be independently testable and should avoid introducing mentor or Pro Max UI dependencies.

## 17. Success Criteria

Phase 1 is successful when:

- users can register and reach the correct gated experience
- admins can process subscription approvals end-to-end
- Pro users can complete simulated exams and review results
- rules-based analytics provide useful weakness visibility
- admins can manage questions and references without developer help
- AI ingestion accelerates content work while preserving human review
- AI failures do not block the core exam experience

## 18. Design Decisions Locked by This Spec

- Phase 1 uses a balanced learning platform approach
- student experience is simulation-first
- admin panel includes operational monitoring
- content import begins with AI PDF ingestion plus review queue
- AI references are limited to curated internal corpus
- platform AI uses Gemini with fallback models
- platform AI is reserved for admin workflows
- optional student AI insight uses encrypted BYOK
- Mentor and Pro Max remain schema-ready only
- application language is Bahasa Indonesia

## 19. Known Constraints

- free-tier AI quotas can limit platform AI throughput
- preview models can change behavior and rate limits
- PDF quality variance will affect extraction reliability
- academic explanations still require human oversight

These constraints are accepted as part of phase 1 and are handled through review queues, fallback analytics, and limited AI scope.
