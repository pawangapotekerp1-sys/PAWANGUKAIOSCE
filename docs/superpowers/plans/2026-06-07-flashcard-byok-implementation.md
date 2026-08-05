# Flashcard BYOK Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah flash card generator dari key platform global menjadi BYOK per admin/mentor dengan UX mirip Generator Soal dan model tetap `gemini-2.5-flash`.

**Architecture:** Frontend create flow akan mendapatkan panel status BYOK yang melakukan save/test/delete credential dan restore local browser. Edge function `flash-card-generator` akan memindahkan sumber credential dari platform config ke credential user dan menolak proses material bila BYOK belum siap.

**Tech Stack:** React, TanStack Query, TypeScript, Vitest, Supabase Edge Functions, Supabase Vault

---

## Chunk 1: Contracts and tests

### Task 1: Define failing frontend and client tests

**Files:**
- Modify: `src/pages/app/flash-card-generator-create-page.test.tsx`
- Modify: `src/components/flash-cards/flash-card-material-form.test.tsx`
- Modify: `src/lib/api/flash-card-api.test.ts`

- [ ] **Step 1: Write the failing tests**

Cover:
- BYOK status panel rendering and local restore,
- blocking submit when BYOK is missing,
- save/test/delete credential actions,
- API client mapping for new BYOK actions.

- [ ] **Step 2: Run tests to verify they fail**

Run:
`npm test -- src/pages/app/flash-card-generator-create-page.test.tsx src/components/flash-cards/flash-card-material-form.test.tsx src/lib/api/flash-card-api.test.ts`

- [ ] **Step 3: Write minimal implementation**

Add frontend state, local storage helper, and API calls.

- [ ] **Step 4: Run tests to verify they pass**

Run the same command and confirm green.

### Task 2: Define failing edge-function tests

**Files:**
- Modify: `supabase/functions/flash-card-generator/index.test.ts`

- [ ] **Step 1: Write the failing tests**

Cover:
- get/save/test/delete BYOK actions,
- default model `gemini-2.5-flash`,
- process flow refusing generation when no valid BYOK exists.

- [ ] **Step 2: Run tests to verify they fail**

Run:
`npm test -- supabase/functions/flash-card-generator/index.test.ts`

- [ ] **Step 3: Write minimal implementation**

Port the BYOK credential flow into `flash-card-generator`.

- [ ] **Step 4: Run tests to verify they pass**

Run the same command and confirm green.

## Chunk 2: Verification

### Task 3: Run targeted regression and build

**Files:**
- Modify: `src/pages/app/flash-card-generator-create-page.tsx`
- Modify: `src/lib/api/flash-card-api.ts`
- Modify: `supabase/functions/flash-card-generator/index.ts`

- [ ] **Step 1: Run targeted tests**

Run:
`npm test -- src/pages/app/flash-card-generator-create-page.test.tsx src/components/flash-cards/flash-card-material-form.test.tsx src/lib/api/flash-card-api.test.ts supabase/functions/flash-card-generator/index.test.ts`

- [ ] **Step 2: Run build**

Run:
`npm run build`

- [ ] **Step 3: Summarize residual risks**

Note whether older platform AI config screens still affect flashcard generation after this change.
