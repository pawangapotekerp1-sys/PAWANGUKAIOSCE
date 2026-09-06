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
3. Plain question and explanation content remains text with source spelling and wording preserved. Formatting-only normalization may remove layout whitespace but must not rewrite content.
4. Simple equation characters required inside selectable options, such as `≤`, `≥`, `<`, and `>`, are preserved as Unicode text obtained from the Word equation XML. They must not be guessed from highlighting.
5. Complex explanation cells containing equations, embedded images, or nested tables are rendered as one exact visual image. For those rows, `explanation_text` is left null and the rendered cell is stored in `explanation_image_path`, preventing a lossy transcription or duplicate explanation.
6. Embedded figures and nested tables that are required to understand a question are rendered or extracted as one question visual. The source prose and options remain separately selectable text; only the non-plain visual fragment is stored in `question_image_path`.
7. Yellow highlighting is not used to determine the answer. Only the explicit `Jawaban X` label is authoritative.

## Components

### Word extractor

Input: the original DOCX.

Output: a normalized JSON manifest containing source row number, stem, five options, correct option key, plain explanation when safe, flags for complex content, and local paths for generated visual assets.

The extractor reads the top-level table only, preserves row order, reads OOXML equations in document order, resolves embedded-image relationships, and ignores empty rows 92 through 100. It reports validation errors without producing an import-ready manifest.

### Visual renderer

Input: source cell content identified as complex.

Output: PNG or WebP assets with a white background, readable resolution, and no clipping.

Microsoft Word is used to render the source content because it is the authoritative renderer for native Word equations. Each generated asset is visually compared with the corresponding source page before upload. Assets remain under the 10 MB `question-media` bucket limit.

### Storage uploader

Input: validated local assets.

Output: private `question-media` object paths under:

`scheduled-events/67049b8f-1763-45aa-993f-d1b93311e294/import-20260906/`

The uploader requires an authenticated admin/mentor session or backend Storage credential. No credential is written to source control, logs, generated manifests, or SQL files. Database credentials alone are not used as a substitute for Storage authorization.

### Database importer

Input: validated manifest and uploaded Storage paths.

Behavior: open a transaction, lock the target event, verify it is the expected draft event, delete its one dummy question, insert 91 event questions, insert five options per question, and keep the event metadata and `editorial_status = 'draft'` unchanged.

All questions receive the active `Pharmaceutical Science` block ID. Topic remains null because the source document does not provide authoritative topic metadata.

If any assertion or insert fails, the transaction rolls back and the dummy question remains intact.

## Data Flow

1. Read and render the original Word document.
2. Extract rows 1 through 91 into a manifest.
3. Validate source numbering, stems, five options, explicit answer labels, and complex-content mapping.
4. Render and visually verify required question and explanation assets.
5. Upload all assets to the private bucket.
6. Recheck the target event and current dummy-question count.
7. Run the replacement transaction.
8. Verify the cloud result and retain the event as draft.

## Validation Gates

The database write is prohibited unless all of these checks pass:

- Exactly 91 populated source rows.
- Source numbers are exactly 1 through 91 with no gaps or duplicates.
- Exactly 91 explicit source answer labels.
- Every correct answer is one of A, B, C, D, or E.
- Every row has exactly one option for each of A, B, C, D, and E.
- Every complex source cell has exactly one verified output asset.
- Every referenced Storage object is successfully uploaded before the database transaction starts.
- The target event ID and title match, the event remains `draft`, and it has zero attempts.

Post-import checks:

- Exactly 91 event questions in sequential order.
- Exactly 455 option rows, five per event question.
- No invalid correct-option keys.
- No question points to a missing Storage object.
- Event metadata and draft status are unchanged.

## Failure Handling

- Parsing ambiguity: stop and report the source row; do not infer content.
- Rendering mismatch or clipping: regenerate the asset and inspect it again.
- Storage failure: leave the database unchanged and remove only objects uploaded by this import when safe.
- Database failure: roll back the transaction; do not publish the event.
- Post-import verification failure: keep the event draft and report the discrepancy before any further change.

## Security

The already-shared database password is used only through an interactive connection and is not stored in the repository. It must be rotated after the import. Elevated Storage keys must not be sent in chat or placed in frontend variables.

## Out of Scope

- Rewriting or medically correcting source questions, answers, or explanations.
- Assigning individual topics without authoritative source metadata.
- Publishing the event.
- Modifying general question-bank tables.
- Changing the application to add MathML or KaTeX rendering.
