# Scheduled Try Out Word Import Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one verified dummy question in `Try Out CBT Pharmaceutical Science Part 1` with 91 source-faithful questions from the supplied Word document, including rendered equation/image/table explanations, while leaving the event as a draft.

**Architecture:** A Python OOXML parser produces a versioned manifest and CSV staging files. Microsoft Word exports the document to filtered HTML, then a Playwright renderer creates exact PNG assets for complex cells. A Supabase Storage uploader uses a temporary authenticated admin/mentor session, and a guarded PostgreSQL transaction performs the final replacement only after all source, visual, Storage, and cloud preconditions pass.

**Tech Stack:** Python 3 with `python-docx` and `lxml`, Microsoft Word filtered HTML export, Node.js with Playwright and `@supabase/supabase-js`, PostgreSQL 17 through Docker `psql`, Vitest/Node tests plus Python `unittest`.

**Specification:** `docs/superpowers/specs/2026-09-06-scheduled-tryout-word-import-design.md`

---

## Chunk 1 Source extraction and visual assets

### Task 1 OOXML source parser

**Files:**
- Create: `scripts/scheduled_tryout_import/docx_parser.py`
- Create: `scripts/scheduled_tryout_import/__init__.py`
- Create: `tests/scripts/test_scheduled_tryout_docx_parser.py`

- [ ] **Step 1: Write failing parser tests**

Cover: top-level table only; rows 1-91 populated and 92-100 ignored; source number sequence; five option paragraphs mapped in order to A-E even when Word numbering labels are not text nodes; `Jawaban : C` and `Jawaban C`; `m:t` Unicode operators in option text; complex-cell classification; rejection of equation structures in stem prose or unsupported option equations; empty stem/option rejection.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
$env:PYTHONPATH = "C:\Users\ASUS\.cache\codex-runtimes\codex-primary-runtime\dependencies\python"
& "C:\Users\ASUS\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m unittest tests.scripts.test_scheduled_tryout_docx_parser -v
```

Expected: failure because `docx_parser.py` does not exist.

- [ ] **Step 3: Implement the minimal parser**

Expose:

```python
def parse_docx(path: Path) -> ParsedDocument: ...
def parse_question_row(row_number: int, row) -> ParsedQuestion: ...
def validate_document(parsed: ParsedDocument) -> list[ValidationError]: ...
```

Read direct `w:p` and `w:tbl` children in order, join `w:t` and `m:t`, preserve paragraph boundaries, use the last five option paragraphs as A-E only after structural validation, and use only the explicit answer label from the right cell.

- [ ] **Step 4: Run parser tests and verify GREEN**

Expected: all focused parser tests pass.

- [ ] **Step 5: Run the parser against the supplied DOCX**

Run using bundled Python against `C:\Users\ASUS\Downloads\Soal Try Out 1(1).docx`.

Expected acceptance summary: 91 questions, source numbers 1-91, 91 explicit answer labels, 455 non-empty options, five embedded pictures, 97 Word equations, and no blocking error. Do not upload anything.

- [ ] **Step 6: Commit parser and tests**

```powershell
git add scripts/scheduled_tryout_import tests/scripts/test_scheduled_tryout_docx_parser.py
git commit -m "feat: parse scheduled tryout Word source"
```

### Task 2 Word HTML export and complex-asset renderer

**Files:**
- Create: `scripts/scheduled_tryout_import/export_docx_html.ps1`
- Create: `scripts/scheduled_tryout_import/render_assets.mjs`
- Create: `tests/scripts/render_assets.test.ts`

- [ ] **Step 1: Write failing renderer tests**

Use a small HTML fixture to verify: full complex explanation after removal of `Jawaban X`; visual fragments before the first option only; no visuals after option A; exactly one PNG per complex question/explanation; white background; deterministic row-to-asset mapping; no overwrite.

- [ ] **Step 2: Run the renderer test and verify RED**

```powershell
npx vitest run tests/scripts/render_assets.test.ts
```

Expected: failure because renderer exports are missing.

- [ ] **Step 3: Implement Word export and Playwright rendering**

`export_docx_html.ps1` opens a read-only copy through Word COM, exports filtered HTML, closes Word in `finally`, and never modifies the source. `render_assets.mjs` opens the exported HTML locally, clones only the required DOM fragments, renders PNG at device scale 2 with white background, and refuses unsupported visual placement.

- [ ] **Step 4: Run renderer tests and verify GREEN**

Expected: focused renderer test passes.

- [ ] **Step 5: Generate actual assets without cloud writes**

Generate under `tmp/scheduled-tryout-import/<runId>/assets/`. Record SHA-256, MIME, byte size, dimensions, source row, and kind. Expect assets only for the rows classified as complex by the parser.

- [ ] **Step 6: Inspect every generated asset**

Compare each PNG at 100% against the corresponding page of the Word-to-PDF render. Record source page/row evidence and approve only images with identical visible content/order and no clipping or replacement glyphs. Regenerate failures.

- [ ] **Step 7: Commit renderer and tests**

```powershell
git add scripts/scheduled_tryout_import/export_docx_html.ps1 scripts/scheduled_tryout_import/render_assets.mjs tests/scripts/render_assets.test.ts
git commit -m "feat: render scheduled tryout Word assets"
```

---

## Chunk 2 Manifest storage and database safeguards

### Task 3 Versioned manifest and reconciliation outputs

**Files:**
- Create: `scripts/scheduled_tryout_import/build_manifest.py`
- Create: `tests/scripts/test_scheduled_tryout_manifest.py`

- [ ] **Step 1: Write failing manifest tests**

Cover schema version, UUID run ID, source hash, canonical cloud fingerprints, question/asset contracts, visual approval evidence, readiness blocking, questions CSV, options CSV, and source-row reconciliation output.

- [ ] **Step 2: Run tests and verify RED**

Expected: missing manifest builder failure.

- [ ] **Step 3: Implement manifest generation**

Generate `manifest.json`, `questions.csv`, `options.csv`, and `reconciliation.json`. Pre-generate question/option UUIDs so the transaction and recovery scripts can identify only the current run.

- [ ] **Step 4: Run tests and verify GREEN**

Expected: all manifest tests pass.

- [ ] **Step 5: Generate the actual manifest**

Expected: `readiness=validated`, 91 questions, 455 options, all required local assets hashed and visually approved, and no validation error.

- [ ] **Step 6: Commit manifest builder and tests**

```powershell
git add scripts/scheduled_tryout_import/build_manifest.py tests/scripts/test_scheduled_tryout_manifest.py
git commit -m "feat: build scheduled tryout import manifest"
```

### Task 4 Storage uploader with temporary user authentication

**Files:**
- Create: `scripts/scheduled_tryout_import/upload_assets.mjs`
- Create: `tests/scripts/upload_assets.test.ts`

- [ ] **Step 1: Write failing uploader tests**

Inject a fake Storage client and cover: admin/mentor role acceptance; other-role rejection; `upsert:false`; unique run prefix; created-object ledger; download/hash verification; cleanup limited to current-run ledger; sign-out in `finally`; no credential/token logging.

- [ ] **Step 2: Run test and verify RED**

Expected: missing uploader exports failure.

- [ ] **Step 3: Implement uploader**

Read project URL and publishable/anon key from `.env.local`. Prompt for application email and password at runtime without echoing the password, authenticate with Supabase Auth, verify role, upload PNGs to `question-media`, re-download for SHA-256 comparison, update a copy of the manifest, and sign out.

- [ ] **Step 4: Run test and verify GREEN**

Expected: all uploader tests pass.

- [ ] **Step 5: Authenticate and upload actual assets**

If no authenticated admin/mentor application credential is available, pause at this step and let the user enter it interactively. Do not request or transmit the password in chat. Expected result: every asset has `uploadStatus=verified` and a unique remote path; database remains unchanged.

- [ ] **Step 6: Commit uploader and tests**

```powershell
git add scripts/scheduled_tryout_import/upload_assets.mjs tests/scripts/upload_assets.test.ts
git commit -m "feat: upload scheduled tryout assets safely"
```

### Task 5 Guarded SQL generator

**Files:**
- Create: `scripts/scheduled_tryout_import/generate_sql.py`
- Create: `tests/scripts/test_scheduled_tryout_sql.py`

- [ ] **Step 1: Write failing SQL-generation tests**

Assert serializable transaction; advisory and row locks; exact event/dummy/attempt/fingerprint preconditions; unique active block lookup; delete restricted to event and dummy ID; CSV staging; 91/455 and non-empty invariants before commit; exact metadata invariance; inserted-ID reconciliation; compensating restore guarded by exact current-run IDs.

- [ ] **Step 2: Run tests and verify RED**

Expected: missing SQL generator failure.

- [ ] **Step 3: Implement SQL and recovery generation**

Generate `import.sql`, `verify.sql`, and `restore.sql` beside the manifest. The importer uses temporary staging tables and `\copy` from the mounted run directory. Never place the database password in generated files.

- [ ] **Step 4: Run tests and verify GREEN**

Expected: all SQL-generation tests pass.

- [ ] **Step 5: Commit generator and tests**

```powershell
git add scripts/scheduled_tryout_import/generate_sql.py tests/scripts/test_scheduled_tryout_sql.py
git commit -m "feat: generate guarded scheduled tryout SQL"
```

---

## Chunk 3 Cloud replacement and verification

### Task 6 Fresh cloud preflight

**Files:**
- Runtime outputs only under: `tmp/scheduled-tryout-import/<runId>/`

- [ ] **Step 1: Open a read-only PostgreSQL connection**

Use Docker `postgres:17-alpine` and interactive password entry. Do not place the password in command arguments or files.

- [ ] **Step 2: Capture and compare current cloud state**

Verify event ID/title, exact metadata fingerprint, `draft`, zero attempts, exactly one dummy question, exact dummy ID/content/options fingerprint, and one active `Pharmaceutical Science` block. Abort on any difference.

- [ ] **Step 3: Final readiness gate**

Confirm manifest source hash still matches the Word file, 91/455 counts match, all assets are visually approved and remotely verified, and all SQL files correspond to the same run ID.

### Task 7 Execute atomic replacement

**Files:**
- Use: `tmp/scheduled-tryout-import/<runId>/import.sql`

- [ ] **Step 1: Run the guarded import through Docker psql**

Mount only the exact run directory read-only and invoke `psql --set=ON_ERROR_STOP=1 --file=/work/import.sql` with interactive password entry.

- [ ] **Step 2: Confirm transaction output**

Expected before `COMMIT`: 91 event questions, 455 options, five options per question, valid correct keys, exact inserted UUID set, unchanged event metadata, zero attempts, and no missing media path. Any failure must roll back.

### Task 8 Independent verification and cleanup

**Files:**
- Use: `tmp/scheduled-tryout-import/<runId>/verify.sql`
- Update: `tmp/scheduled-tryout-import/<runId>/reconciliation.json`

- [ ] **Step 1: Verify with a fresh database connection**

Run `verify.sql` and compare every source row to cloud order, stem hash, five option hashes, correct key, explanation mode, media path, block, and topic.

- [ ] **Step 2: Handle mismatch safely**

If verification fails and the cloud question-ID set exactly equals this run, execute `restore.sql`, verify dummy restoration, then delete only unreferenced current-run Storage objects. If IDs differ, stop without deleting anything.

- [ ] **Step 3: Verify final event state**

Expected: title/schedule/cycle unchanged, `editorial_status=draft`, zero attempts, 91 questions numbered 1-91, and 455 options.

- [ ] **Step 4: Run repository regression tests**

```powershell
npm test -- --run
```

Expected: existing test suite passes. Report pre-existing unrelated failures separately without changing unrelated files.

- [ ] **Step 5: Rotate the exposed database password**

Tell the user to rotate the database password immediately after successful completion; never perform the rotation without the user explicitly requesting it.
