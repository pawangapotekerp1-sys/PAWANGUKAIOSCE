# Question Generator Reference Handling, Local BYOK, And Sticky Sidebar Design

Date: 2026-06-06
Status: Draft for user review

## 1. Summary

This design adds three focused improvements to the mentor-side question generator experience:

1. reference explanations may include inline bibliography text, and generated drafts must preserve and validate that bibliography according to generation mode
2. each user keeps their Gemini API key in the local browser so refresh does not force re-entry
3. the mentor product sidebar stays visible while the main content scrolls on long pages such as `Question Generator`

These changes should improve trust and usability without splitting the current explanation field into separate inputs or redesigning the generator workflow.

## 2. Goals

### Primary Goals

- keep reference bibliography inside the existing `Pembahasan` field
- make bibliography handling explicit and reliable for both `copy concept` and `paraphrase` outputs
- reject generated or edited drafts that lose required bibliography or drift into untraceable sourcing
- persist Gemini BYOK locally per authenticated user in the current browser
- keep the sidebar navigation reachable while long generator pages scroll

### Non-Goals

- building a separate bibliography input field
- doing live internet verification of every citation at generation time
- changing the core `50-50` copy concept and paraphrase split
- redesigning the admin shell unless the same shared shell is already used
- replacing server-side BYOK storage with browser-only execution

## 3. Scope

### In Scope

- generator form behavior in [question-generator-create-flow.tsx](</E:/Projek TRY OYT/src/components/question-generator/question-generator-create-flow.tsx:1>)
- reference editor UI in [reference-question-form.tsx](</E:/Projek TRY OYT/src/components/question-generator/reference-question-form.tsx:1>)
- draft review UI in [generated-draft-editor.tsx](</E:/Projek TRY OYT/src/components/question-generator/generated-draft-editor.tsx:1>) and [question-generator-review-flow.tsx](</E:/Projek TRY OYT/src/components/question-generator/question-generator-review-flow.tsx:1>)
- generator API contract in [question-generator-api.ts](</E:/Projek TRY OYT/src/lib/api/question-generator-api.ts:1>)
- mentor shell layout in [product-shell.tsx](</E:/Projek TRY OYT/src/components/layout/product-shell.tsx:1>)
- question generator edge function in [question-generator/index.ts](</E:/Projek TRY OYT/supabase/functions/question-generator/index.ts:1>)
- shared generator prompt and validation logic in [question-generator.ts](</E:/Projek TRY OYT/supabase/functions/_shared/question-generator.ts:1>)
- existing generator tests in [question-generator-api.test.ts](</E:/Projek TRY OYT/src/lib/api/question-generator-api.test.ts:1>), [product-shell.test.tsx](</E:/Projek TRY OYT/src/components/layout/product-shell.test.tsx:1>), and [question-generator/index.test.ts](</E:/Projek TRY OYT/supabase/functions/question-generator/index.test.ts:1>)

### Out of Scope

- database schema changes for dedicated bibliography tables
- non-generator question authoring flows
- switching the generator away from Gemini
- shared secret execution from the browser directly to Gemini

## 4. Locked Product Decisions

- the explanation input remains a single field
- `Pustaka:` is the recommended format, but the parser should also recognize equivalent bibliography cues such as `Referensi:` and `Sumber:`
- the system may detect a bibliography block at the end of the explanation even if the user forgets the exact label
- `copy concept` outputs must keep bibliography that is traceable
- `paraphrase` outputs must re-carry bibliography from the originating reference explanation
- generated drafts and edited drafts fail validation if required bibliography disappears
- Gemini API keys persist locally per authenticated browser user through `localStorage`
- backend BYOK storage remains in place for the actual edge-function execution path
- the mentor shell sidebar stays pinned on desktop while the content area scrolls

## 5. Current State

### 5.1 Reference explanations are plain text only

The current reference editor in [reference-question-form.tsx](</E:/Projek TRY OYT/src/components/question-generator/reference-question-form.tsx:1>) accepts a single `Pembahasan` textarea and treats the whole value as opaque text.

There is no bibliography-aware parsing, no helper text for citation entry, and no way to distinguish explanation body from source lines.

### 5.2 Generated drafts do not preserve bibliography intent

The prompt builder in [question-generator.ts](</E:/Projek TRY OYT/supabase/functions/_shared/question-generator.ts:1>) sends `Pembahasan: ...` to Gemini, but there is no explicit rule telling the model how to preserve bibliography differently for `copy concept` versus `paraphrase`.

The generated output validator only checks that `explanationText` is non-empty. It does not enforce bibliography preservation or traceability.

### 5.3 BYOK form state is transient

The create flow in [question-generator-create-flow.tsx](</E:/Projek TRY OYT/src/components/question-generator/question-generator-create-flow.tsx:1>) stores the Gemini key only in React state. After refresh, the input clears even if the backend credential still exists.

### 5.4 The mentor sidebar is not sticky during long-page scroll

The shell in [product-shell.tsx](</E:/Projek TRY OYT/src/components/layout/product-shell.tsx:1>) currently uses an absolutely positioned desktop sidebar within a non-sticky layout column. On long pages, the main content scrolls away while the sidebar does not stay visually anchored as a persistent companion.

### 5.5 Documentation context checked

React local browser state and synchronization guidance was checked through Context7 against the official React docs.

The relevant takeaway is:

- use a lazy `useState` initializer for one-time reads from browser APIs such as `localStorage`
- keep synchronization side effects in event handlers or `useEffect`
- avoid repeated storage reads during re-render

This matches the desired local BYOK behavior.

## 6. Recommended Approach

Use a **parser-backed explanation workflow** with **local BYOK persistence** and a **sticky mentor shell**:

- parse bibliography out of the existing explanation field without adding a second input
- enrich the Gemini prompt and output validation to preserve bibliography by generation mode
- validate bibliography by traceability heuristics before persistence and on edit
- persist the Gemini key in `localStorage` using the authenticated user id as part of the storage key
- convert the mentor desktop shell into a sticky sidebar layout with internal nav scrolling when needed

This is the recommended option because it solves the user's pain points without making the form heavier or forcing a broader architecture rewrite.

## 7. Alternative Approaches Considered

### Option A. Strict labeled bibliography only

Behavior:

- parse bibliography only when the user writes the exact label `Pustaka:`

Pros:

- simplest parser

Trade-offs:

- too easy for users to forget
- high false-negative risk for valid bibliography text

### Option B. Recommended: flexible bibliography detection in one field

Behavior:

- prefer explicit labels such as `Pustaka:`
- also accept equivalent labels and structured citation blocks at the end of the explanation

Pros:

- preserves the current single-field UX
- reduces accidental user failure
- keeps validation behavior strict enough for review and persistence

Trade-offs:

- parser logic is more involved than exact-string matching

### Option C. Separate bibliography field

Behavior:

- split explanation and bibliography into separate textareas

Pros:

- clearer structured data capture

Trade-offs:

- contradicts the approved product direction
- changes the form more than needed

## 8. Bibliography Parsing Design

### 8.1 Input model

The UI still captures one string, `explanationText`.

The backend and review validation should derive two logical parts:

- `explanationBody`
- `bibliographyBlock`

The raw stored explanation may remain a single string for compatibility, but the parser should operate on the text whenever validation or prompt-building needs structured meaning.

### 8.2 Detection rules

Recommended detection order:

1. explicit labels: `Pustaka:`, `Referensi:`, `Sumber:`
2. a trailing multi-line numbered or bulleted citation list after a blank line
3. a trailing block containing multiple traceable-source markers such as `DOI`, `PMID`, `ISBN`, or URLs

If no bibliography is detected, the parser returns `bibliographyBlock = null`.

### 8.3 UX guidance

The form should help users avoid mistakes through:

- helper text near the explanation field
- placeholder examples showing bibliography appended at the end
- an insertion shortcut such as `Tambahkan template pustaka` that appends:

```text
Pustaka:
1. 
```

This is guidance, not a second field.

## 9. Bibliography Traceability Validation

### 9.1 What counts as traceable

A bibliography entry should pass if it includes at least one of:

- a URL
- a DOI
- a PMID
- an ISBN
- a sufficiently complete journal or book citation

For the non-identifier citation path, the heuristic should look for a combination such as:

- title plus year
- author-like text plus title plus year
- book title plus edition or publisher context
- journal title plus volume or issue plus year

### 9.2 What should fail

Examples of invalid bibliography blocks:

- `Pustaka: buku farmakologi`
- `Sumber: internet`
- an empty label with no content
- a source line that names only a broad site or subject without enough detail to trace

### 9.3 Validation surface

Validation should run:

- before generation, on each reference explanation
- after Gemini returns generated items
- when the user saves edits to a generated draft if that draft must retain bibliography

This is traceability validation, not live internet verification.

## 10. Generation-Mode Rules

### 10.1 Copy concept

`copy concept` drafts are conceptually fresh but still sourced from the submitted references.

Required behavior:

- Gemini must include traceable bibliography in the returned explanation
- the bibliography should stay aligned with the concept source used to build the new item
- if the generated explanation loses bibliography or replaces it with untraceable text, the item fails validation

### 10.2 Paraphrase

`paraphrase` drafts are not fully fresh. They remain closer to the wording and sourcing of the original reference.

Required behavior:

- bibliography found in the originating reference explanation must be carried over
- if the output omits that bibliography, the item fails validation
- if multiple references were supplied, the prompt may instruct the model to preserve the nearest matching bibliography rather than inventing a new one

### 10.3 Editing after generation

When the user edits a draft on the review page:

- bibliography may be refined
- required bibliography may not be deleted silently
- validation errors should block save and keep the edited text in the form

## 11. Prompt And Validation Changes

### 11.1 Prompt changes

The prompt builder in [question-generator.ts](</E:/Projek TRY OYT/supabase/functions/_shared/question-generator.ts:1>) should:

- explain the difference between `copy concept` and `paraphrase` bibliography handling
- state that bibliography must remain in the explanation text
- forbid returning explanations that omit required source material

### 11.2 Output validation changes

The generated item validator should expand from structural checks into bibliography-aware checks:

- explanation still required
- bibliography required when mode or source conditions require it
- bibliography must satisfy traceability heuristics

### 11.3 Edit validation changes

The `update-item` path in [question-generator/index.ts](</E:/Projek TRY OYT/supabase/functions/question-generator/index.ts:1>) should re-run:

- reference completeness validation
- bibliography parsing
- bibliography traceability validation
- topic proximity validation

## 12. Local BYOK Persistence Design

### 12.1 Storage key shape

Persist the Gemini key in browser local storage using the authenticated user id:

- `question-generator:gemini-key:<userId>`

This prevents one logged-in user from automatically seeing another user's locally stored key in the same browser session history.

### 12.2 Lifecycle

On mount:

- read the current user id from [use-session.ts](</E:/Projek TRY OYT/src/lib/auth/use-session.ts:1>)
- lazily initialize the input value from `localStorage`

On save:

- keep the value in local storage
- send the same value to the backend BYOK save action

On delete:

- delete the backend secret first
- only clear local storage after backend deletion succeeds

### 12.3 UX states

Recommended states:

- backend active and local present
- local present but backend missing
- backend active but local missing
- neither present

The UI should surface a practical message when local and server states differ, for example:

- `API key tersedia di browser ini, tetapi belum tersimpan aktif di server. Klik Simpan untuk sinkronkan.`

## 13. Sticky Sidebar Design

### 13.1 Scope

The requested sticky behavior applies to the mentor/student-app shell in [product-shell.tsx](</E:/Projek TRY OYT/src/components/layout/product-shell.tsx:1>), which is the shell visible in the provided screenshots.

The admin shell in [admin-shell.tsx](</E:/Projek TRY OYT/src/components/layout/admin-shell.tsx:1>) is out of scope unless implementation reveals shared behavior worth extracting safely.

### 13.2 Layout behavior

On large screens:

- the left rail becomes sticky to the viewport top
- the sidebar height matches the viewport
- nav content can scroll internally if needed
- the collapse toggle remains visually attached to the sidebar edge

On small screens:

- preserve the current simpler flow unless testing shows the sticky layout is already safe

### 13.3 Collapse compatibility

The existing collapse preference in local storage must remain unchanged.

The sticky conversion should not break:

- expanded layout width
- collapsed layout width
- toggle visibility
- logout reachability

## 14. Error Handling

### 14.1 Bibliography input errors

Examples of user-facing errors:

- `Pustaka terdeteksi kosong pada Referensi 1. Tambahkan sumber yang bisa ditelusuri.`
- `Pustaka pada Referensi 2 belum bisa ditelusuri. Tambahkan URL, DOI, PMID, ISBN, atau sitasi yang lebih lengkap.`
- `Draft parafrase harus tetap mencantumkan pustaka dari referensi acuan.`

### 14.2 BYOK sync errors

Required behavior:

- if backend save fails, keep the local key intact
- if backend delete fails, keep the local key intact
- if local key exists but backend is missing, show a sync prompt instead of clearing the input

### 14.3 Review-save errors

If draft edit validation fails:

- reject the save request
- keep the user's edited text in place
- return a bibliography-specific message where relevant

## 15. Testing Strategy

### Backend tests

- parser recognizes `Pustaka:`, `Referensi:`, and `Sumber:`
- parser recognizes structured trailing citation blocks
- traceability validation passes for URL, DOI, PMID, ISBN, and sufficiently complete citations
- traceability validation fails for vague or empty sources
- `copy concept` items fail when required bibliography is missing
- `paraphrase` items fail when source bibliography is dropped

### Frontend tests

- the generator restores the local Gemini key on mount
- the local key is namespaced per authenticated user id
- deleting the key does not clear local storage when backend deletion fails
- explanation helper copy and bibliography template insertion render correctly
- mismatch messaging appears when local and server BYOK states differ

### Shell tests

- the mentor sidebar gets sticky desktop classes
- collapse and restore still work
- the existing collapse preference still restores from local storage

## 16. Implementation Sequence

Suggested order:

1. add bibliography parser and traceability validation tests
2. update prompt and output validation rules
3. add BYOK local-storage helpers and create-flow tests
4. update generator form and review editor UX copy
5. convert the mentor shell sidebar to sticky layout and extend shell tests

## 17. Local Review Notes

This spec was reviewed locally against:

- the current generator create flow
- the current review and edit path
- the existing server-side BYOK vault flow
- the current mentor shell layout

The key invariants are:

- the explanation field stays single-input
- bibliography becomes detectable and enforceable without requiring an exact remembered label
- browser refresh does not wipe the entered Gemini key for the same user
- long mentor pages keep navigation visible while scrolling

## 18. Approval Gate

This spec is ready for user review. After the user reviews the written spec, the next step should be a dedicated implementation plan followed by TDD-based implementation.
