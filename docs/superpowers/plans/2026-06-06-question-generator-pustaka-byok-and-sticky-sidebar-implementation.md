# Question Generator Pustaka, Local BYOK, And Sticky Sidebar Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bibliography-aware question generation, browser-local Gemini key persistence per authenticated user, and a sticky mentor sidebar without breaking the existing review and delivery workflow.

**Architecture:** Extend the existing generator incrementally instead of rebuilding it. Add bibliography parsing and traceability validation to the existing shared generator helpers and edge function, add a small browser-local BYOK storage helper plus create-flow UX guidance, and then convert the mentor product shell into a sticky desktop layout that keeps the current collapse behavior intact.

**Tech Stack:** React 19, React Router 7, TanStack React Query 5, TypeScript, Vitest, Testing Library, Supabase Edge Functions on Deno, Zod, browser `localStorage`.

---

## File Structure

- Modify: `supabase/functions/_shared/question-generator.ts`
  Responsibility: own bibliography parsing, traceability heuristics, prompt rules, and generator output validation for `copy_concept` and `paraphrase`.
- Modify: `supabase/functions/_shared/question-generator.test.ts`
  Responsibility: prove the parser recognizes flexible bibliography patterns and rejects missing or untraceable sources where required.
- Modify: `supabase/functions/question-generator/index.ts`
  Responsibility: enforce bibliography validation before generation persistence and during draft edit saves.
- Modify: `supabase/functions/question-generator/index.test.ts`
  Responsibility: cover reference validation failures, generated-item bibliography failures, and edited-draft failures.
- Create: `src/lib/question-generator-byok-storage.ts`
  Responsibility: read, write, and clear Gemini keys in browser-local storage using a user-scoped storage key.
- Create: `src/lib/question-generator-byok-storage.test.ts`
  Responsibility: verify storage key namespacing and conservative delete behavior.
- Modify: `src/components/question-generator/question-generator-create-flow.tsx`
  Responsibility: restore the Gemini key from local storage, show sync guidance, and add explanation helper copy plus bibliography template insertion.
- Create: `src/components/question-generator/question-generator-create-flow.test.tsx`
  Responsibility: verify local BYOK restore, local/server mismatch messaging, and explanation template insertion behavior.
- Modify: `src/components/question-generator/reference-question-form.tsx`
  Responsibility: add bibliography helper text and the insertion shortcut while keeping a single explanation field.
- Modify: `src/components/question-generator/reference-question-form.test.tsx`
  Responsibility: verify helper copy and template insertion affordance.
- Modify: `src/components/question-generator/generated-draft-editor.tsx`
  Responsibility: preserve user-edited explanation text when bibliography validation fails and surface any bibliography-aware save guidance.
- Modify: `src/components/question-generator/generated-draft-editor.test.tsx`
  Responsibility: verify invalid bibliography save attempts do not clear edited text.
- Modify: `src/pages/admin/question-generator-page.test.tsx`
  Responsibility: cover page-level BYOK restore and local/server sync states.
- Modify: `src/pages/admin/question-generator-review-page.test.tsx`
  Responsibility: cover bibliography-aware review-save failures.
- Modify: `src/components/layout/product-shell.tsx`
  Responsibility: make the mentor sidebar sticky on desktop while preserving collapse behavior and internal scrolling.
- Modify: `src/components/layout/product-shell.test.tsx`
  Responsibility: verify sticky layout classes, collapse persistence, and toggle accessibility.
- Modify: `src/lib/api/question-generator-api.ts`
  Responsibility: preserve backend error messages cleanly for bibliography-specific save and generate failures.
- Modify: `src/lib/api/question-generator-api.test.ts`
  Responsibility: verify bibliography-specific edge-function messages still surface to the UI.

## Chunk 1: Bibliography Parsing And Backend Enforcement

### Task 1: Write failing parser and bibliography validation tests

**Files:**
- Modify: `supabase/functions/_shared/question-generator.test.ts`

- [ ] **Step 1: Add a failing test for labeled bibliography parsing**

```ts
test("extracts bibliography from a Pustaka label", () => {
  expect(parseExplanationBibliography("Pembahasan inti.\n\nPustaka:\n1. DOI: 10.1000/test")).toEqual({
    explanationBody: "Pembahasan inti.",
    bibliographyBlock: "1. DOI: 10.1000/test",
    bibliographyLabel: "Pustaka",
  });
});
```

- [ ] **Step 2: Add a failing test for equivalent labels and trailing citation blocks**

```ts
test("extracts bibliography from Referensi and trailing citation lines", () => {
  expect(parseExplanationBibliography("Pembahasan.\n\nReferensi:\nhttps://example.org")).toMatchObject({
    bibliographyBlock: "https://example.org",
  });
});
```

- [ ] **Step 3: Add failing tests for traceability heuristics**

```ts
test("accepts DOI and rejects vague source labels", () => {
  expect(isTraceableBibliography("DOI: 10.1000/test")).toBe(true);
  expect(isTraceableBibliography("buku farmakologi")).toBe(false);
});
```

- [ ] **Step 4: Add failing tests for generation-mode bibliography rules**

```ts
test("requires bibliography for copy concept outputs and carried bibliography for paraphrase outputs", () => {
  expect(() => validateGeneratedQuestionItems([...], schema, referenceContext)).toThrow(/pustaka/i);
});
```

- [ ] **Step 5: Run the focused helper suite and verify it fails for the new expectations**

Run: `npx vitest run supabase/functions/_shared/question-generator.test.ts`
Expected: FAIL with missing parser and bibliography validation helpers.

### Task 2: Implement bibliography parsing, traceability checks, and prompt rules

**Files:**
- Modify: `supabase/functions/_shared/question-generator.ts`
- Test: `supabase/functions/_shared/question-generator.test.ts`

- [ ] **Step 1: Add a parser that splits explanation body from bibliography block**

```ts
type ParsedExplanationBibliography = {
  explanationBody: string;
  bibliographyBlock: string | null;
  bibliographyLabel: "Pustaka" | "Referensi" | "Sumber" | null;
};
```

- [ ] **Step 2: Add traceability helpers for URL, DOI, PMID, ISBN, and sufficiently complete citations**

```ts
function isTraceableBibliography(value: string) {
  return hasUrl(value) || hasDoi(value) || hasPmid(value) || hasIsbn(value) || hasStructuredCitation(value);
}
```

- [ ] **Step 3: Extend the prompt builder so `copy_concept` keeps traceable bibliography and `paraphrase` carries the original bibliography**

```ts
"Untuk copy_concept, pembahasan wajib tetap mencantumkan pustaka yang bisa ditelusuri."
"Untuk paraphrase, cantumkan ulang pustaka dari referensi asal pada pembahasan."
```

- [ ] **Step 4: Extend generated-item validation to enforce bibliography rules**

```ts
validateGeneratedQuestionItems(input, schema, {
  references,
  requireTraceableBibliographyForCopyConcept: true,
  requireCarriedBibliographyForParaphrase: true,
});
```

- [ ] **Step 5: Re-run the helper suite and verify it passes**

Run: `npx vitest run supabase/functions/_shared/question-generator.test.ts`
Expected: PASS

### Task 3: Write failing edge-function tests for bibliography-aware generation and editing

**Files:**
- Modify: `supabase/functions/question-generator/index.test.ts`

- [ ] **Step 1: Add a failing test that rejects reference explanations with empty detected bibliography blocks**

```ts
expect(() => validateQuestionGeneratorReferences([{ explanationText: "Pembahasan.\n\nPustaka:" }])).toThrow(/pustaka/i);
```

- [ ] **Step 2: Add a failing test that rejects untraceable bibliography for copy concept outputs**

```ts
expect(response).toContain("Pustaka pada Referensi 1 belum bisa ditelusuri");
```

- [ ] **Step 3: Add a failing test that rejects edited drafts which remove required bibliography**

```ts
expect(updateItem()).toThrow(/tetap mencantumkan pustaka/i);
```

- [ ] **Step 4: Run the focused function suite and verify it fails**

Run: `npx vitest run supabase/functions/question-generator/index.test.ts`
Expected: FAIL with missing bibliography-aware validation paths.

### Task 4: Implement bibliography enforcement in the edge function

**Files:**
- Modify: `supabase/functions/question-generator/index.ts`
- Modify: `supabase/functions/_shared/question-generator.ts`
- Test: `supabase/functions/question-generator/index.test.ts`

- [ ] **Step 1: Validate reference explanations for empty or untraceable bibliography before generation starts**
- [ ] **Step 2: Validate generated items against bibliography mode rules after Gemini returns JSON**
- [ ] **Step 3: Re-validate edited draft explanations before saving `update-item`**
- [ ] **Step 4: Preserve clear user-facing errors from the function**

```ts
throw new HttpError(400, "BIBLIOGRAPHY_INVALID", "Pustaka pada Referensi 1 belum bisa ditelusuri. Tambahkan URL, DOI, PMID, ISBN, atau sitasi yang lebih lengkap.");
```

- [ ] **Step 5: Re-run the function suite and verify it passes**

Run: `npx vitest run supabase/functions/question-generator/index.test.ts`
Expected: PASS

### Task 5: Checkpoint backend bibliography enforcement

**Files:**
- No new files.

- [ ] **Step 1: Run the combined backend verification**

Run: `npx vitest run supabase/functions/_shared/question-generator.test.ts supabase/functions/question-generator/index.test.ts`
Expected: PASS

- [ ] **Step 2: Commit the backend slice**

```bash
git add supabase/functions/_shared/question-generator.ts supabase/functions/_shared/question-generator.test.ts supabase/functions/question-generator/index.ts supabase/functions/question-generator/index.test.ts
git commit -m "feat: enforce question generator bibliography rules"
```

## Chunk 2: Local BYOK Persistence And Generator UX

### Task 6: Write failing tests for local BYOK storage

**Files:**
- Create: `src/lib/question-generator-byok-storage.test.ts`

- [ ] **Step 1: Add a failing test for user-scoped storage keys**

```ts
test("stores keys per user id", () => {
  writeQuestionGeneratorApiKey("user-1", "key-a");
  writeQuestionGeneratorApiKey("user-2", "key-b");
  expect(readQuestionGeneratorApiKey("user-1")).toBe("key-a");
});
```

- [ ] **Step 2: Add a failing test for clear behavior**

```ts
test("removes only the target user's key", () => {
  clearQuestionGeneratorApiKey("user-1");
  expect(readQuestionGeneratorApiKey("user-2")).toBe("key-b");
});
```

- [ ] **Step 3: Run the new storage test and verify it fails**

Run: `npx vitest run src/lib/question-generator-byok-storage.test.ts`
Expected: FAIL because the storage helper does not exist yet.

### Task 7: Implement local BYOK storage helper

**Files:**
- Create: `src/lib/question-generator-byok-storage.ts`
- Test: `src/lib/question-generator-byok-storage.test.ts`

- [ ] **Step 1: Implement helper functions for read, write, and clear**

```ts
const STORAGE_PREFIX = "question-generator:gemini-key";

export function questionGeneratorApiKeyStorageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}
```

- [ ] **Step 2: Guard browser-only access so tests and non-window execution stay safe**
- [ ] **Step 3: Re-run the storage suite and verify it passes**

Run: `npx vitest run src/lib/question-generator-byok-storage.test.ts`
Expected: PASS

### Task 8: Write failing tests for create-flow local restore, sync messaging, and bibliography template insertion

**Files:**
- Create: `src/components/question-generator/question-generator-create-flow.test.tsx`
- Modify: `src/components/question-generator/reference-question-form.test.tsx`
- Modify: `src/pages/admin/question-generator-page.test.tsx`

- [ ] **Step 1: Add a failing create-flow test that restores the Gemini key from local storage for the authenticated user**
- [ ] **Step 2: Add a failing create-flow test that shows sync guidance when local key exists but backend status reports no credential**
- [ ] **Step 3: Add a failing reference-form test for bibliography helper copy and template insertion**

```tsx
fireEvent.click(screen.getByRole("button", { name: /tambahkan template pustaka/i }));
expect(screen.getByLabelText(/pembahasan/i)).toHaveValue(expect.stringContaining("Pustaka:\n1. "));
```

- [ ] **Step 4: Run the focused frontend tests and verify they fail**

Run: `npx vitest run src/components/question-generator/question-generator-create-flow.test.tsx src/components/question-generator/reference-question-form.test.tsx src/pages/admin/question-generator-page.test.tsx`
Expected: FAIL with missing local restore and helper UI behavior.

### Task 9: Implement local BYOK restore and bibliography-friendly input UX

**Files:**
- Modify: `src/components/question-generator/question-generator-create-flow.tsx`
- Modify: `src/components/question-generator/reference-question-form.tsx`
- Modify: `src/lib/api/question-generator-api.ts`
- Modify: `src/lib/api/question-generator-api.test.ts`
- Test: `src/components/question-generator/question-generator-create-flow.test.tsx`
- Test: `src/components/question-generator/reference-question-form.test.tsx`
- Test: `src/pages/admin/question-generator-page.test.tsx`

- [ ] **Step 1: Use `useSession()` to derive the current user id and lazily restore the local Gemini key**
- [ ] **Step 2: Save the key locally on successful backend save and keep it local when backend save fails**
- [ ] **Step 3: Only clear the local key after backend delete succeeds**
- [ ] **Step 4: Add helper text and placeholder guidance to the explanation field**
- [ ] **Step 5: Add the `Tambahkan template pustaka` insertion affordance without splitting the field**
- [ ] **Step 6: Preserve edge-function error messages in the API layer for bibliography-specific failures**
- [ ] **Step 7: Re-run the focused frontend suites and verify they pass**

Run: `npx vitest run src/lib/question-generator-byok-storage.test.ts src/lib/api/question-generator-api.test.ts src/components/question-generator/question-generator-create-flow.test.tsx src/components/question-generator/reference-question-form.test.tsx src/pages/admin/question-generator-page.test.tsx`
Expected: PASS

### Task 10: Write failing review-editor tests for invalid bibliography save attempts

**Files:**
- Modify: `src/components/question-generator/generated-draft-editor.test.tsx`
- Modify: `src/pages/admin/question-generator-review-page.test.tsx`

- [ ] **Step 1: Add a failing component or page-level test that simulates a save rejection for missing required bibliography**
- [ ] **Step 2: Assert that the user's edited explanation text stays in the form after the failed save**
- [ ] **Step 3: Run the focused review tests and verify the new case fails**

Run: `npx vitest run src/components/question-generator/generated-draft-editor.test.tsx src/pages/admin/question-generator-review-page.test.tsx`
Expected: FAIL because the editor currently resets from server state too eagerly on failure.

### Task 11: Implement bibliography-aware review-save UX

**Files:**
- Modify: `src/components/question-generator/generated-draft-editor.tsx`
- Modify: `src/components/question-generator/question-generator-review-flow.tsx`
- Test: `src/components/question-generator/generated-draft-editor.test.tsx`
- Test: `src/pages/admin/question-generator-review-page.test.tsx`

- [ ] **Step 1: Keep edited explanation state local when save fails**
- [ ] **Step 2: Surface bibliography-specific save errors near the edited draft**
- [ ] **Step 3: Ensure successful saves still sync the local editor state**
- [ ] **Step 4: Re-run the review suites and verify they pass**

Run: `npx vitest run src/components/question-generator/generated-draft-editor.test.tsx src/pages/admin/question-generator-review-page.test.tsx`
Expected: PASS

### Task 12: Checkpoint local BYOK and generator UX

**Files:**
- No new files.

- [ ] **Step 1: Run the combined frontend verification for this chunk**

Run: `npx vitest run src/lib/question-generator-byok-storage.test.ts src/lib/api/question-generator-api.test.ts src/components/question-generator/question-generator-create-flow.test.tsx src/components/question-generator/reference-question-form.test.tsx src/components/question-generator/generated-draft-editor.test.tsx src/pages/admin/question-generator-page.test.tsx src/pages/admin/question-generator-review-page.test.tsx`
Expected: PASS

- [ ] **Step 2: Commit the frontend UX slice**

```bash
git add src/lib/question-generator-byok-storage.ts src/lib/question-generator-byok-storage.test.ts src/lib/api/question-generator-api.ts src/lib/api/question-generator-api.test.ts src/components/question-generator/question-generator-create-flow.tsx src/components/question-generator/question-generator-create-flow.test.tsx src/components/question-generator/reference-question-form.tsx src/components/question-generator/reference-question-form.test.tsx src/components/question-generator/generated-draft-editor.tsx src/components/question-generator/generated-draft-editor.test.tsx src/components/question-generator/question-generator-review-flow.tsx src/pages/admin/question-generator-page.test.tsx src/pages/admin/question-generator-review-page.test.tsx
git commit -m "feat: add local byok and bibliography-aware generator ux"
```

## Chunk 3: Sticky Mentor Sidebar And Final Verification

### Task 13: Write failing tests for sticky mentor sidebar behavior

**Files:**
- Modify: `src/components/layout/product-shell.test.tsx`

- [ ] **Step 1: Add a failing test that expects sticky desktop classes on the sidebar container**
- [ ] **Step 2: Add a failing test that expects internal nav scrolling or viewport-height anchoring**
- [ ] **Step 3: Keep the existing collapse tests and ensure they still assert restore-toggle accessibility**
- [ ] **Step 4: Run the shell test file and verify the new assertions fail**

Run: `npx vitest run src/components/layout/product-shell.test.tsx`
Expected: FAIL because the sidebar is currently absolute rather than sticky.

### Task 14: Implement sticky sidebar behavior without breaking collapse persistence

**Files:**
- Modify: `src/components/layout/product-shell.tsx`
- Test: `src/components/layout/product-shell.test.tsx`

- [ ] **Step 1: Convert the desktop shell layout so the sidebar rail is sticky to the viewport top**
- [ ] **Step 2: Give the sidebar viewport-height anchoring and internal navigation scrolling where needed**
- [ ] **Step 3: Keep the existing local-storage collapse preference key unchanged**
- [ ] **Step 4: Keep the collapse toggle attached to the sidebar edge in both expanded and collapsed states**
- [ ] **Step 5: Re-run the shell suite and verify it passes**

Run: `npx vitest run src/components/layout/product-shell.test.tsx`
Expected: PASS

### Task 15: Run the full focused regression suite

**Files:**
- No new files.

- [ ] **Step 1: Run all directly affected tests**

Run: `npx vitest run supabase/functions/_shared/question-generator.test.ts supabase/functions/question-generator/index.test.ts src/lib/question-generator-byok-storage.test.ts src/lib/api/question-generator-api.test.ts src/components/question-generator/question-generator-create-flow.test.tsx src/components/question-generator/reference-question-form.test.tsx src/components/question-generator/generated-draft-editor.test.tsx src/pages/admin/question-generator-page.test.tsx src/pages/admin/question-generator-review-page.test.tsx src/components/layout/product-shell.test.tsx`
Expected: PASS

- [ ] **Step 2: Run the build verification**

Run: `npm run build`
Expected: PASS with no TypeScript or bundling regressions.

### Task 16: Perform manual product checks

**Files:**
- No new files.

- [ ] **Step 1: Start the app locally**

Run: `npm run dev`
Expected: Vite dev server starts successfully.

- [ ] **Step 2: Verify generator bibliography input behavior**
- [ ] Open `/admin/question-generator`
- [ ] Confirm the explanation helper text recommends appending bibliography at the end
- [ ] Click `Tambahkan template pustaka`
- [ ] Confirm the explanation field inserts `Pustaka:\n1. `

- [ ] **Step 3: Verify local BYOK behavior**
- [ ] Enter a Gemini key and save it
- [ ] Refresh the page
- [ ] Confirm the key is restored in the same browser for the same user
- [ ] Delete the key
- [ ] Confirm it disappears only after delete succeeds

- [ ] **Step 4: Verify sticky sidebar behavior**
- [ ] Open a long generator or review page under `/app/question-generator`
- [ ] Scroll downward
- [ ] Confirm the left feature navigation remains visible and the collapse toggle stays reachable

### Task 17: Capture handoff notes and residual risks

**Files:**
- No new files.

- [ ] **Step 1: Note any residual heuristic risks**
- [ ] Call out that bibliography validation is traceability-based rather than live internet verification
- [ ] Call out any ambiguous citation formats that still may need manual review guidance

- [ ] **Step 2: Confirm the three user-facing outcomes in the implementation summary**
- [ ] Generated drafts now enforce bibliography rules by mode
- [ ] Gemini key persists locally per authenticated browser user
- [ ] Mentor sidebar remains visible while scrolling long pages

## Notes For Execution

- Use @test-driven-development throughout. Every behavior change in this plan should start with a failing automated test.
- Keep the explanation field single-input. Do not split `Pembahasan` into a separate bibliography field while executing this plan.
- Prefer small focused helpers over broad refactors. This plan is an upgrade to an existing feature, not a rewrite.
- Preserve existing backend Vault behavior. Local BYOK persistence is a UX improvement, not a transport-path redesign.
- Respect the existing dirty worktree and do not revert unrelated changes.
- A dedicated subagent review loop was not used while writing this plan because delegation was not explicitly requested in this thread; reintroduce review delegation only if the user explicitly asks for subagent work.

Plan complete and saved to `docs/superpowers/plans/2026-06-06-question-generator-pustaka-byok-and-sticky-sidebar-implementation.md`. Ready to execute?
