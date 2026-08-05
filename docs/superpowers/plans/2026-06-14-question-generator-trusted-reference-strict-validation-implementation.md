# Question Generator Trusted Reference Strict Validation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current question generator variation modes with fresher modes and enforce one trusted, reachable reference URL per generated item before any draft batch is persisted.

**Architecture:** Keep the existing question generator edge function and React flows, but change the shared generator contract so Gemini must return a structured `reference` object and one of three new `variationMode` values. Enforce strict trusted-reference validation inside the edge function after structured output parsing and before persistence, then update frontend mappers and review UI to display the new mode and source metadata.

**Tech Stack:** TypeScript, React, Vitest, Testing Library, Supabase Edge Functions, Gemini structured output

---

## File Structure

**Backend shared contract**
- Modify: `supabase/functions/_shared/question-generator.ts`
  Responsibility: define the new variation mode enum, source object contract, prompt text, trusted domain allowlist helpers, and shared generated-item validation.
- Modify: `supabase/functions/_shared/question-generator.test.ts`
  Responsibility: cover prompt contract, variation mode validation, source object rules, host allowlist, and strict URL shape checks.

**Edge function orchestration**
- Modify: `supabase/functions/question-generator/index.ts`
  Responsibility: enforce post-generation reference validation, reject failed batches atomically, and return specific trusted-reference errors.
- Modify: `supabase/functions/question-generator/index.test.ts`
  Responsibility: protect runtime wiring and new error-path behavior.

**Optional edge helper split if file grows too much**
- Optional create: `supabase/functions/question-generator/reference-validation.ts`
  Responsibility: isolate URL parsing, allowlist checks, and accessibility fetch logic if `index.ts` becomes too large to reason about safely.
- Optional create: `supabase/functions/question-generator/reference-validation.test.ts`
  Responsibility: focused tests for URL/accessibility behavior if helper extraction happens.

**Frontend API and mapping**
- Modify: `src/lib/api/question-generator-api.ts`
  Responsibility: preserve API shape changes if the backend returns richer batch item source data or more specific trusted-reference errors.
- Modify: `src/lib/api/question-generator-api.test.ts`
  Responsibility: confirm error normalization and batch-detail payload handling still work.
- Modify: `src/lib/mappers/question-generator-mappers.ts`
  Responsibility: map new variation modes and source metadata into UI-facing labels.
- Modify: `src/lib/mappers/question-generator-mappers.test.ts`
  Responsibility: protect variation label mapping and source metadata mapping.

**Frontend create and review flows**
- Modify: `src/components/question-generator/question-generator-create-flow.tsx`
  Responsibility: update summary copy from old modes to the three new modes.
- Modify: `src/components/question-generator/question-generator-create-flow.test.tsx`
  Responsibility: protect the updated copy and unchanged create behavior.
- Modify: `src/components/question-generator/question-generator-review-flow.tsx`
  Responsibility: surface the trusted source label and URL on each generated draft item.
- Modify: `src/components/question-generator/generated-draft-editor.tsx`
  Responsibility: render the new variation label and primary trusted source link within the editor card.
- Modify: `src/components/question-generator/generated-draft-editor.test.tsx`
  Responsibility: protect source-link rendering and new mode labels.
- Modify: `src/pages/admin/question-generator-page.test.tsx`
- Modify: `src/pages/admin/question-generator-review-page.test.tsx`
  Responsibility: catch user-facing regressions in admin routes if copy or review details change.

## Chunk 1: Shared Contract And Prompt

### Task 1: Add failing tests for new variation modes and source object contract

**Files:**
- Modify: `supabase/functions/_shared/question-generator.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests that expect:
- only `new_case_same_concept`, `different_trap_same_objective`, and `reverse_reasoning` are accepted,
- generated items require `reference.label` and `reference.url`,
- generated items reject `http://` URLs,
- generated items reject missing source objects,
- prompt text mentions the three new modes and forbids DOI-only or book-only output.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/_shared/question-generator.test.ts`

Expected: FAIL because the current schema still uses `copy_concept` / `paraphrase` and has no structured `reference` object.

- [ ] **Step 3: Write minimal implementation**

Modify `supabase/functions/_shared/question-generator.ts` to:
- replace the old mode enum with the three new modes,
- add a `reference` object to the generated item schema and response schema,
- update prompt builder text to demand one primary trusted URL per item,
- stop relying on bibliography text blobs as the primary source contract.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/_shared/question-generator.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/question-generator.ts supabase/functions/_shared/question-generator.test.ts
git commit -m "feat: add trusted reference output contract"
```

### Task 2: Add shared trusted-domain helpers with focused tests

**Files:**
- Modify: `supabase/functions/_shared/question-generator.ts`
- Modify: `supabase/functions/_shared/question-generator.test.ts`
- Optional create: `supabase/functions/question-generator/reference-validation.ts`
- Optional create: `supabase/functions/question-generator/reference-validation.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests that expect:
- exact host allowlist acceptance for approved domains,
- rejection for unknown hosts and subdomains not explicitly listed,
- rejection for malformed URLs,
- acceptance of one exact `https` URL string,
- rejection when multiple URLs appear in one `reference.url` field.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/_shared/question-generator.test.ts`

Expected: FAIL because trusted-domain validation is not implemented yet.

- [ ] **Step 3: Write minimal implementation**

Implement:
- an exact-host allowlist constant,
- URL parsing helper,
- `https` enforcement,
- one-link-only enforcement,
- exported helper(s) that the edge function can reuse later.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/_shared/question-generator.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/question-generator.ts supabase/functions/_shared/question-generator.test.ts
git commit -m "feat: add trusted reference allowlist helpers"
```

## Chunk 2: Edge Function Strict Gate

### Task 3: Capture strict-gate failure behavior in edge tests

**Files:**
- Modify: `supabase/functions/question-generator/index.test.ts`
- Modify: `supabase/functions/question-generator/index.ts`
- Optional create: `supabase/functions/question-generator/reference-validation.ts`

- [ ] **Step 1: Write the failing tests**

Add tests that assert:
- the index source no longer references old mode names,
- trusted-reference validation runs before persistence,
- failed batches return one of:
  `INVALID_REFERENCE_URL_FORMAT`
  `REFERENCE_DOMAIN_NOT_ALLOWED`
  `REFERENCE_URL_UNREACHABLE`
- failed batches do not proceed to persistence.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/question-generator/index.test.ts`

Expected: FAIL because the current edge function does not perform strict trusted-reference validation.

- [ ] **Step 3: Write minimal implementation**

Modify `supabase/functions/question-generator/index.ts` to:
- validate each generated item's `reference.url` after structured parsing,
- perform exact host allowlist checks,
- perform server-side accessibility fetch and accept only `2xx`,
- reject the whole batch before persistence if any item fails,
- map failures to specific `HttpError` or `GeminiRequestError` responses.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/question-generator/index.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/question-generator/index.ts supabase/functions/question-generator/index.test.ts
git commit -m "feat: enforce trusted reference strict gate"
```

### Task 4: Protect retry boundaries so only model transport issues retry

**Files:**
- Modify: `supabase/functions/_shared/gemini-client.ts`
- Modify: `supabase/functions/_shared/gemini-client.test.ts`
- Modify: `supabase/functions/question-generator/index.ts`

- [ ] **Step 1: Write the failing tests**

Add or adjust tests to show:
- malformed JSON and truncation still retry,
- disallowed domain failures do not retry,
- unreachable URL failures do not retry.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/_shared/gemini-client.test.ts supabase/functions/question-generator/index.test.ts`

Expected: FAIL if the current flow retries strict-reference failures incorrectly or lacks explicit coverage.

- [ ] **Step 3: Write minimal implementation**

Keep retry limited to:
- malformed structured JSON,
- truncated Gemini output.

Do not retry:
- bad URL format,
- host not in allowlist,
- accessibility check failures.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/_shared/gemini-client.test.ts supabase/functions/question-generator/index.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/gemini-client.ts supabase/functions/_shared/gemini-client.test.ts supabase/functions/question-generator/index.ts supabase/functions/question-generator/index.test.ts
git commit -m "fix: keep strict reference failures non-retryable"
```

## Chunk 3: Frontend Mapping And Review UI

### Task 5: Update API and mapper tests for new mode/source shape

**Files:**
- Modify: `src/lib/api/question-generator-api.test.ts`
- Modify: `src/lib/mappers/question-generator-mappers.ts`
- Modify: `src/lib/mappers/question-generator-mappers.test.ts`
- Modify: `src/lib/api/question-generator-api.ts`

- [ ] **Step 1: Write the failing tests**

Add tests that expect:
- the mapper understands the three new `variationMode` values,
- labels are human-readable in Indonesian,
- batch detail items can carry `reference.label` and `reference.url`,
- API error normalization still surfaces specific trusted-reference failures.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/api/question-generator-api.test.ts src/lib/mappers/question-generator-mappers.test.ts`

Expected: FAIL because current view models still assume `copy_concept` / `paraphrase` and no source object.

- [ ] **Step 3: Write minimal implementation**

Modify:
- `src/lib/mappers/question-generator-mappers.ts` for the new item shape,
- `src/lib/api/question-generator-api.ts` only if payload typing or error-path expectations need updating.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/api/question-generator-api.test.ts src/lib/mappers/question-generator-mappers.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/question-generator-api.ts src/lib/api/question-generator-api.test.ts src/lib/mappers/question-generator-mappers.ts src/lib/mappers/question-generator-mappers.test.ts
git commit -m "feat: map trusted reference generator modes"
```

### Task 6: Update create-flow and review UI tests before changing components

**Files:**
- Modify: `src/components/question-generator/question-generator-create-flow.test.tsx`
- Modify: `src/components/question-generator/generated-draft-editor.test.tsx`
- Modify: `src/pages/admin/question-generator-review-page.test.tsx`
- Modify: `src/components/question-generator/question-generator-review-flow.tsx`
- Modify: `src/components/question-generator/generated-draft-editor.tsx`
- Modify: `src/components/question-generator/question-generator-create-flow.tsx`

- [ ] **Step 1: Write the failing tests**

Add tests that expect:
- create-flow summary no longer says `copy konsep` or `parafrase`,
- generated draft cards show the new variation label,
- generated draft cards show one primary source label and clickable URL,
- review pages still load with the updated item shape.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/question-generator/question-generator-create-flow.test.tsx src/components/question-generator/generated-draft-editor.test.tsx src/pages/admin/question-generator-review-page.test.tsx`

Expected: FAIL because the UI still renders old labels and lacks source metadata.

- [ ] **Step 3: Write minimal implementation**

Modify:
- `src/components/question-generator/question-generator-create-flow.tsx` to update summary copy,
- `src/components/question-generator/generated-draft-editor.tsx` to render variation/source details,
- `src/components/question-generator/question-generator-review-flow.tsx` to pass source info through.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/question-generator/question-generator-create-flow.test.tsx src/components/question-generator/generated-draft-editor.test.tsx src/pages/admin/question-generator-review-page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/question-generator/question-generator-create-flow.tsx src/components/question-generator/question-generator-create-flow.test.tsx src/components/question-generator/question-generator-review-flow.tsx src/components/question-generator/generated-draft-editor.tsx src/components/question-generator/generated-draft-editor.test.tsx src/pages/admin/question-generator-review-page.test.tsx
git commit -m "feat: show trusted reference metadata in generator UI"
```

## Chunk 4: Regression Verification And Release

### Task 7: Run targeted regression suites

**Files:**
- Modify: none
- Test: `supabase/functions/_shared/gemini-client.test.ts`
- Test: `supabase/functions/_shared/question-generator.test.ts`
- Test: `supabase/functions/question-generator/index.test.ts`
- Test: `src/lib/api/question-generator-api.test.ts`
- Test: `src/lib/mappers/question-generator-mappers.test.ts`
- Test: `src/components/question-generator/question-generator-create-flow.test.tsx`
- Test: `src/components/question-generator/generated-draft-editor.test.tsx`
- Test: `src/pages/admin/question-generator-page.test.tsx`
- Test: `src/pages/admin/question-generator-review-page.test.tsx`

- [ ] **Step 1: Run the targeted suites**

Run:

```bash
npx vitest run supabase/functions/_shared/gemini-client.test.ts supabase/functions/_shared/question-generator.test.ts supabase/functions/question-generator/index.test.ts src/lib/api/question-generator-api.test.ts src/lib/mappers/question-generator-mappers.test.ts src/components/question-generator/question-generator-create-flow.test.tsx src/components/question-generator/generated-draft-editor.test.tsx src/pages/admin/question-generator-page.test.tsx src/pages/admin/question-generator-review-page.test.tsx
```

Expected: PASS with `0` failed tests.

- [ ] **Step 2: Fix any regression immediately**

If any suite fails, make the smallest code change needed and re-run the exact failing command before broadening the run.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test: cover trusted reference strict validation"
```

### Task 8: Run build and production release checks

**Files:**
- Modify: none

- [ ] **Step 1: Run build verification**

Run: `npm run build`

Expected: production build succeeds with exit code `0`.

- [ ] **Step 2: Inspect git scope before release**

Run: `git status --short`

Expected: only intended files are modified/staged for this feature.

- [ ] **Step 3: Push branch**

Run:

```bash
git push -u origin $(git branch --show-current)
```

Expected: branch published successfully.

- [ ] **Step 4: Deploy question generator to production**

Run:

```bash
npx supabase functions deploy question-generator --project-ref koapcujyfcjmtdovmxoe
```

Expected: deploy succeeds and production now serves the trusted-reference strict gate flow.

- [ ] **Step 5: Document release summary**

Record:
- final branch name,
- commit hash,
- tests run,
- build result,
- production deploy result,
- any residual risk around domain availability or false negatives from `2xx`-only validation.

## Execution Notes

- Use @test-driven-development for each code task above.
- Use @verification-before-completion before any success claim, push, or production deploy.
- Preserve unrelated local changes:
  `supabase/.temp/cli-latest`
  `docs/superpowers/plans/2026-06-06-question-generator-pustaka-byok-and-sticky-sidebar-implementation.md`
- Keep changes scoped to question generator files unless a shared helper clearly belongs in a broader module.
- Prefer structured `reference.url` validation over any parsing of bibliography prose.

Plan complete and saved to `docs/superpowers/plans/2026-06-14-question-generator-trusted-reference-strict-validation-implementation.md`. Ready to execute?
