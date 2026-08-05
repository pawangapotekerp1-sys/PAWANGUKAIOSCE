# Clinical Topic Taxonomy Refresh Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename one Clinical Science topic, add one new Clinical Science topic, and keep catalog/tagging surfaces synchronized without stale hardcoded counts.

**Architecture:** Supabase remains the canonical taxonomy source. A new migration updates production taxonomy, seed mirrors the same rows for local parity, and the React catalog page derives topic copy from grouped catalog data so UI text stays accurate as taxonomy changes.

**Tech Stack:** Supabase SQL migrations, seed SQL, React, TypeScript, Vitest.

---

## Chunk 1: Red Tests

### Task 1: Capture taxonomy changes in tests

**Files:**
- Create: `supabase/migrations/20260515000029_clinical_topic_taxonomy_refresh.test.ts`
- Modify: `supabase/seed.test.ts`
- Modify: `src/pages/app/tryout-catalog-page.test.tsx`
- Modify: `src/lib/mappers/tryout-mappers.test.ts`
- Modify: `src/lib/api/question-authoring-api.test.ts`

- [ ] Write failing expectations for the renamed topic, new Clinical Science topic, alphabetical Clinical Science ordering, and dynamic topic-count copy.
- [ ] Run focused Vitest commands and confirm the failures are caused by missing implementation.

## Chunk 2: Green Implementation

### Task 2: Update canonical taxonomy and synced fixtures

**Files:**
- Create: `supabase/migrations/20260515000029_clinical_topic_taxonomy_refresh.sql`
- Modify: `supabase/seed.sql`
- Modify: `docs/question-batch-upload-guide.md`

- [ ] Write the forward-only migration that renames the existing topic, inserts the new topic, and resets Clinical Science `sort_order`.
- [ ] Mirror the same taxonomy rows in the local seed file.
- [ ] Update the upload guide to list the valid Clinical Science topics in alphabetical order.

### Task 3: Remove stale topic-count copy

**Files:**
- Modify: `src/pages/app/tryout-catalog-page.tsx`

- [ ] Compute topic totals from grouped catalog data.
- [ ] Render dynamic or generic copy so the page no longer hardcodes `15 materi`.

## Chunk 3: Verification

### Task 4: Prove the implementation end to end

**Files:**
- No new files.

- [ ] Re-run the focused Vitest suite covering seed, migration, mapper, taxonomy API fixtures, and the catalog page.
- [ ] Run `npm run build`.
- [ ] Summarize results with any remaining risks.
