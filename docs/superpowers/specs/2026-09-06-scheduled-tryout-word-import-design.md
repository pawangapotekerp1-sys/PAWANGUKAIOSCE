# Scheduled Try Out Word Import Design

## Objective

Replace the single dummy question in the Supabase Cloud event `Try Out CBT Pharmaceutical Science Part 1` (`67049b8f-1763-45aa-993f-d1b93311e294`) with the 91 populated questions from `C:\Users\ASUS\Downloads\Soal Try Out 1(1).docx` while preserving source answers, equations, images, and nested tables without inventing content. The event must remain in `draft` status.

## Source Findings

- The Word document has 36 rendered pages and one top-level table with a header plus 100 numbered rows.
- Rows 1 through 91 contain questions. Rows 92 through 100 are empty and must not be imported.
- Each populated row uses three cells: number, question with answer options, and answer with explanation.
- All 91 populated rows contain a source answer label in the form `Jawaban A` through `Jawaban E`; punctuation and whitespace around the label may vary.
- The document contains 97 native Word equations, five embedded images, and nested tables in several question or explanation cells.
- The target event is currently a draft with one dummy question and no participant attempts.

## Fidelity Rules

1. The importer must never infer, correct, or add an answer. `correct_option_key` must come only from the source answer label in the same Word row.
2. Every imported question must have exactly five source options, A through E, in source order. Missing or ambiguous options stop the import.
3. A plain cell is one whose OOXML subtree contains no `m:oMath`, `a:blip`, or direct child `w:tbl`. Plain question and explanation content remains text with source spelling and wording preserved. Normalization may trim the start and end of each paragraph, join adjacent Word runs, and preserve paragraph boundaries as `\n`; it may not collapse or replace characters inside a paragraph.
4. Simple equation characters required inside selectable options, limited to `≤`, `≥`, `<`, and `>`, are preserved as Unicode text read from the Word equation XML. They must not be guessed from highlighting. Any other equation structure inside an option is a blocking validation error because option images are unsupported. The inspected source has no equation in stem prose before the first option; the extractor asserts this for every row, and any such stem equation is a blocking error rather than being silently dropped.
5. A complex explanation cell is any answer cell whose OOXML subtree contains at least one `m:oMath`, `a:blip`, or direct child `w:tbl`. The complete cell content after the `Jawaban X` label is rendered by Microsoft Word to one PNG at 200 DPI on a white background, including all prose and visuals in source order. For those rows, `explanation_text` is null and the PNG path is stored in `explanation_image_path`.
6. A complex question visual is an embedded image or direct child nested table located before the first A-through-E option paragraph. Those visual fragments are rendered in source order into one PNG at 200 DPI on a white background and stored in `question_image_path`. Stem prose and the five options remain separately selectable text. A visual after the first option paragraph is a blocking validation error because the UI can display its one question image only between the stem and options.
7. An exact visual means the generated image contains the same visible content and order as Word at 100% zoom, has no clipping or replacement glyphs, and passes side-by-side human inspection against the source render. Decorative outer borders of the parent three-column table may be omitted; content, nested-table borders, equations, and embedded figures may not be altered.
8. Yellow highlighting is not used to determine the answer. Only the explicit `Jawaban X` label is authoritative.

## Manifest Contract

The extractor emits UTF-8 JSON with this versioned shape:

```text
ImportManifest {
  schemaVersion: 1
  runId: UUID
  sourcePath: string
  sourceSha256: lowercase hex string
  sourceQuestionCount: 91
  targetEventId: UUID
  expectedEventFingerprint: string
  expectedDummyQuestionFingerprint: string
  readiness: "validated" | "blocked"
  errors: ValidationError[]
  questions: ManifestQuestion[]
  assets: ManifestAsset[]
}

ManifestQuestion {
  sourceRowNumber: integer
  sourceNumberLabel: string
  stem: non-empty string
  options: exactly [{key:"A",text:string}, ..., {key:"E",text:string}]
  correctOptionKey: "A" | "B" | "C" | "D" | "E"
  answerSourceText: string
  explanationMode: "text" | "image"
  explanationText: string | null
  questionAssetId: UUID | null
  explanationAssetId: UUID | null
}

ManifestAsset {
  id: UUID
  sourceRowNumber: integer
  kind: "question" | "explanation"
  localPath: absolute string
  sha256: lowercase hex string
  mimeType: "image/png"
  sizeBytes: positive integer
  widthPx: positive integer
  heightPx: positive integer
  remotePath: string | null
  uploadStatus: "pending" | "uploaded" | "verified"
  visualReviewStatus: "pending" | "approved" | "rejected"
  visualReviewEvidence: string | null
}

ValidationError {
  sourceRowNumber: integer | null
  code: stable string
  message: string
}
```

Only a manifest with `schemaVersion = 1`, `readiness = "validated"`, an empty error array, verified asset hashes, all assets at `uploadStatus = "verified"`, and all assets at `visualReviewStatus = "approved"` with non-empty review evidence is accepted by the database importer.

### Cloud preflight and snapshot

Input: target event ID.

Output: the exact event-row snapshot, dummy question/options snapshot, attempt count, resolved active block row, and canonical fingerprints.

This component runs before Storage upload and owns the cloud-state fields in the combined manifest. It serializes objects as canonical UTF-8 JSON with recursively lexicographically sorted object keys, array order preserved, timestamps normalized to PostgreSQL UTC ISO output, and JSON nulls preserved; SHA-256 of those bytes becomes `expectedEventFingerprint` and `expectedDummyQuestionFingerprint`. The import orchestrator combines this preflight output with the DOCX extractor output; the DOCX extractor itself does not read or populate cloud-state fingerprints.

## Components

### Word extractor

Input: the original DOCX.

Output: a normalized JSON manifest containing source row number, stem, five options, correct option key, plain explanation when safe, flags for complex content, and local paths for generated visual assets.

The extractor reads the top-level table only, preserves row order, reads OOXML equations in document order, resolves embedded-image relationships, and ignores empty rows 92 through 100. It returns the manifest contract above. Any error sets `readiness` to `blocked` and prevents Storage or database writes.

### Visual renderer

Input: source cell content identified as complex.

Output: PNG assets with a white background, readable resolution, and no clipping.

Microsoft Word is used to render the source content because it is the authoritative renderer for native Word equations. Each generated asset is visually compared with the corresponding source page before upload. The reviewer records `visualReviewStatus = "approved"` and evidence identifying the source page and source row only after confirming identical visible content/order and no clipping; rejection blocks readiness. The renderer records dimensions, MIME type, byte length, and SHA-256 in the manifest. Assets remain under the 10 MB `question-media` bucket limit.

### Storage uploader

Input: validated local assets.

Output: private `question-media` object paths under:

`scheduled-events/67049b8f-1763-45aa-993f-d1b93311e294/imports/<runId>/`

The selected authorization path is an ephemeral authenticated application session for an `admin` or `mentor`. A local uploader uses the existing project URL and publishable key, prompts the user for application credentials without echoing the password, signs in, confirms the profile role through Supabase Auth, uploads with `upsert: false`, and signs out when finished. Current migrations authorize both roles through `can_manage_question_bank()`. No credential or access token is written to source control, logs, generated manifests, or SQL files. Database credentials alone are not used as a substitute for Storage authorization.

Every upload uses the unique run prefix and `upsert: false`. The uploader keeps a created-object ledger containing the path and SHA-256 of each successful object. Cleanup is restricted to paths in that ledger under the current run prefix; it can never delete or overwrite objects belonging to an earlier run. After upload, the object is downloaded through the authenticated client and its byte length and SHA-256 are compared with the manifest before status becomes `verified`.

### Database importer

Input: validated manifest and uploaded Storage paths.

The selected database integration is direct SQL through the existing pooler and PostgreSQL password, not the `upsert_scheduled_tryout_event` RPC. This avoids `auth.uid()` requirements and prevents the RPC from rewriting event metadata.

Behavior: open a serializable transaction, acquire a transaction-scoped advisory lock derived from the target event UUID, lock the event row with `SELECT ... FOR UPDATE`, and revalidate all destructive preconditions. Delete only dummy question `94d85610-ef6d-41eb-871e-62fffb776d9f` after its complete content fingerprint matches the captured source below, insert 91 event questions, insert five options per question, run all invariants inside the transaction, and keep the event row untouched.

Captured dummy fingerprint fields:

- stem `nsdlkasndk`
- correct key `A`
- explanation `sadnljanda`
- null block, topic, and media paths
- options in order: `A=asndkan`, `B=asndkasn`, `C=asdsndas`, `D=anskdnas`, `E=kasndksa`
- zero attempts for the event

All questions receive the active `Pharmaceutical Science` block ID. Topic remains null because the source document does not provide authoritative topic metadata.

If any assertion, insert, or invariant fails, the transaction rolls back and the dummy question remains intact. The importer records every new question UUID in the local run manifest. A local JSON snapshot of the dummy question and exact event row is written before the transaction.

## Data Flow

1. Read and render the original Word document.
2. Extract rows 1 through 91 into a manifest.
3. Validate source numbering, stems, five options, explicit answer labels, and complex-content mapping.
4. Render and visually verify required question and explanation assets.
5. Upload all assets to the private bucket.
6. Recheck the target event, exact metadata fingerprint, exact dummy fingerprint, and zero-attempt count.
7. Run the replacement transaction.
8. Verify the cloud result and retain the event as draft.

## Validation Gates

The database write is prohibited unless all of these checks pass:

- Exactly 91 populated source rows.
- Source numbers are exactly 1 through 91 with no gaps or duplicates.
- Exactly 91 explicit source answer labels.
- Every correct answer is one of A, B, C, D, or E.
- Every row has exactly one option for each of A, B, C, D, and E.
- Every complex source cell has exactly one verified output asset with MIME `image/png`, positive dimensions, size from 1 byte through 10 MB, matching local/remote SHA-256, successful authenticated readability, and recorded human visual approval evidence.
- Every referenced Storage object is successfully uploaded before the database transaction starts.
- The active block lookup returns exactly one `Pharmaceutical Science` row.
- The target event ID and title match, the event remains `draft`, it has zero attempts, and its metadata fingerprint matches the captured snapshot.
- Every trimmed stem and option text is non-empty.

Post-import checks:

- Exactly 91 event questions in sequential order.
- Exactly 455 option rows, five per event question.
- No invalid correct-option keys.
- No question points to a missing Storage object.
- The exact event fields `id`, `title`, `description`, `editorial_status`, `access_start_at`, `access_end_at`, `current_cycle`, `created_by`, `updated_by`, `created_at`, and `updated_at` are byte-for-byte unchanged.

## Failure Handling

- Parsing ambiguity: stop and report the source row; do not infer content.
- Rendering mismatch or clipping: regenerate the asset and inspect it again.
- Storage failure: leave the database unchanged and remove only paths listed in the current run's created-object ledger.
- Database failure: roll back the transaction, do not publish the event, and delete only current-run paths from the created-object ledger after confirming no database row references them.
- All count, option, key, event-metadata, and inserted-ID invariants run before `COMMIT`. After commit, a fresh connection repeats the checks. If that verification finds a discrepancy and the current question-ID set still exactly equals the current run's recorded IDs, a compensating serializable transaction deletes those IDs and restores the captured dummy snapshot. After successful compensation, delete only the unreferenced current-run paths from the created-object ledger. If concurrent data no longer matches that exact set, automation stops without deleting database rows or Storage objects and reports the conflict for human review.

## Security

The already-shared database password is used only through an interactive connection and is not stored in the repository. It must be rotated after the import. Elevated Storage keys must not be sent in chat or placed in frontend variables.

## Out of Scope

- Rewriting or medically correcting source questions, answers, or explanations.
- Assigning individual topics without authoritative source metadata.
- Publishing the event.
- Modifying general question-bank tables.
- Changing the application to add MathML or KaTeX rendering.
