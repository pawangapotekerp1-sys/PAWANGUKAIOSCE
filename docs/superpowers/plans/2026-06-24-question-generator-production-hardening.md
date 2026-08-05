# Question Generator Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a forward-only Supabase migration that repairs existing production question-generator schema drift and legacy permissive RLS policies without changing application logic.

**Architecture:** Keep the edited historical migration as a no-op marker for fresh installs, then add one new corrective migration that makes already-deployed databases converge to the authoritative question-generator contract. Guard the corrective migration with regression tests that assert both the policy cleanup and the critical schema repairs.

**Tech Stack:** Supabase SQL migrations, Vitest migration tests, TypeScript edge-function regression tests

---

## Chunk 1: Drift Audit And Regression Coverage

### Task 1: Capture the production drift in a new migration test

**Files:**
- Create: `supabase/migrations/20260624000045_question_generator_production_hardening.test.ts`
- Reference: `supabase/migrations/20260605000039_question_generator_atomic_ops.sql`
- Reference: `supabase/migrations/20260614000042_question_generator_trusted_reference_metadata.sql`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the new migration test to verify it fails before SQL exists**
- [ ] **Step 3: Assert the new migration drops legacy `*_select_own` and `*_write_own` policies**
- [ ] **Step 4: Assert the new migration enforces the missing schema repairs on existing DBs**
- [ ] **Step 5: Re-run the targeted migration test and keep it red until SQL is added**

### Task 2: Keep the application-level bibliography regression covered

**Files:**
- Modify: `supabase/functions/question-generator/index.test.ts`
- Modify: `supabase/functions/question-generator/handler.ts`

- [ ] **Step 1: Confirm the existing bibliography regression tests still describe intended behavior**
- [ ] **Step 2: Avoid changing runtime logic unless a new failing test proves more drift**

## Chunk 2: Production-Safe Forward Migration

### Task 3: Implement the corrective migration

**Files:**
- Create: `supabase/migrations/20260624000045_question_generator_production_hardening.sql`

- [ ] **Step 1: Drop legacy permissive question-generator policies if they still exist**
- [ ] **Step 2: Recreate owner-access policies guarded by `public.can_manage_question_bank()`**
- [ ] **Step 3: Backfill and enforce `generator_user_settings.secret_hint` as `not null`**
- [ ] **Step 4: Add missing `updated_at`, trigger, and index repairs for `question_generation_references`**
- [ ] **Step 5: Null orphan `draft_question_id` values, add the missing FK, and repair indexes/constraints on `question_generation_items`**
- [ ] **Step 6: Repair delivery indexes and keep migration idempotent for already-correct environments**

## Chunk 3: Verification And Handoff

### Task 4: Verify targeted and repo-wide safety

**Files:**
- Verify only

- [ ] **Step 1: Run the new production-hardening migration test**
- [ ] **Step 2: Run question-generator function tests**
- [ ] **Step 3: Run `npm.cmd test -- --run --project supabase`**
- [ ] **Step 4: Run `npm.cmd test -- --run`**
- [ ] **Step 5: Run `npm.cmd run build`**

### Task 5: Commit the production hardening

**Files:**
- Commit only

- [ ] **Step 1: Review `git diff --stat`**
- [ ] **Step 2: Commit with a migration-focused message**
- [ ] **Step 3: Report whether GitHub push is safe and whether Supabase production is now safe**
