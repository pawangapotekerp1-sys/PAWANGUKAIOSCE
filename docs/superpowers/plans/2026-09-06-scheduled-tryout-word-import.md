# Scheduled Try Out Word Import Implementation Plan

> **For agentic workers:** REQUIRED: Use `subagent-driven-development` in an isolated worktree. Implement each task with TDD, then complete spec-compliance and code-quality review before moving to the next task.

**Goal:** Replace the one verified dummy question in `Try Out CBT Pharmaceutical Science Part 1` with the 91 source-faithful questions from the supplied Word document, preserving text, answers, equations, images, and nested tables while leaving the event in `draft`.

**Architecture:** OOXML traversal and semantic parsing produce a partial source manifest plus exact fragment selectors. Fragment DOCX files preserve the original package relationships and are rendered by Microsoft Word to PDF, rasterized at exactly 200 DPI, and cropped without changing content. A read-only PostgreSQL preflight captures raw snapshots before any Storage write; a tested Python finalizer recursively canonicalizes them and computes fingerprints. An orchestrator combines source, visual, and cloud evidence into the versioned manifest. Storage uses an ephemeral authenticated admin/mentor session. Separate import, verification, and recovery generators create guarded SQL; the destructive replacement runs only after a fresh in-transaction recheck.

**Tech Stack:** Python 3 (`python-docx`, `lxml`, Pillow), Microsoft Word COM, bundled Poppler, Node.js (`@supabase/supabase-js`, Vitest), PostgreSQL 17 through Docker `psql`.

**Specification:** `docs/superpowers/specs/2026-09-06-scheduled-tryout-word-import-design.md`

**Fixed source and target facts:**

- Source: `C:\Users\ASUS\Downloads\Soal Try Out 1(1).docx`
- Event: `67049b8f-1763-45aa-993f-d1b93311e294`
- Dummy question: `94d85610-ef6d-41eb-871e-62fffb776d9f`
- Expected source rows: 1-91; blank rows: 92-100
- Expected options: 455
- Expected assets: 47 total
- Question-visual rows: 8, 16, 23, 28, 59, 77, 89
- Complex-explanation rows: 1, 5, 11, 14, 15, 16, 18, 19, 21, 23, 24, 25, 27, 28, 29, 31, 36, 38, 42, 43, 46, 47, 49, 51, 54, 56, 57, 58, 60, 62, 67, 70, 71, 73, 75, 78, 79, 83, 84, 91

**Command setup used below:**

```powershell
$repo = (git rev-parse --show-toplevel).Trim()
$py = "C:\Users\ASUS\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
$pdfToPpm = "C:\Users\ASUS\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin\pdftoppm.exe"
$sourceDocx = "C:\Users\ASUS\Downloads\Soal Try Out 1(1).docx"
```

---

## Chunk 1 — Source extraction and Word-authoritative assets

### Task 1: Lock the source inventory and OOXML traversal contract

**Files:**

- Create: `scripts/scheduled_tryout_import/models.py`
- Create: `scripts/scheduled_tryout_import/ooxml.py`
- Create: `scripts/scheduled_tryout_import/probe_source_inventory.py`
- Create: `scripts/scheduled_tryout_import/__init__.py`
- Create: `tests/scripts/test_scheduled_tryout_ooxml.py`
- Create fixtures: `tests/fixtures/scheduled_tryout_import/`

- [ ] **Step 1: Create focused OOXML fixtures and failing tests**

Fixtures must cover direct `w:p`/`w:tbl` child ordering, embedded-image relationship lookup, an image paragraph before option A, a nested table before option A, a visual after option A, `m:oMath` in stem prose, supported `≤ ≥ < >` option equations, unsupported option equations, and answer-label punctuation/whitespace variants. Test methods name every behavior and compare exact paragraph strings and relationship targets.

Run:

```powershell
& $py -m unittest tests.scripts.test_scheduled_tryout_ooxml -v
```

Expected RED: import failure naming `scripts.scheduled_tryout_import.ooxml`.

- [ ] **Step 2: Implement single-responsibility OOXML helpers and inventory CLI**

`ooxml.py` owns namespace constants, direct-child iteration, ordered `w:t`/`m:t` text extraction, paragraph boundary preservation, direct nested-table detection, `a:blip` relationship resolution, and immutable fragment selectors expressed as cell column plus direct-child indexes and optional paragraph/run boundaries. It must not decide which text is stem, option, answer, or explanation. `models.py` contains typed immutable records and stable validation-error codes only. `probe_source_inventory.py` is a read-only CLI that reports the kind-specific asset row sets and exits nonzero unless they match explicit caller expectations.

Normalization is limited to trimming each paragraph at both ends, joining adjacent runs, and joining retained paragraphs with `\n`. Characters inside a paragraph are never collapsed, corrected, or replaced.

- [ ] **Step 3: Run OOXML tests and verify GREEN**

Run the Step 1 command.

Expected GREEN: all named OOXML tests pass with `OK`; fixture relationship targets and child indexes match exactly.

- [ ] **Step 4: Verify the frozen source inventory with the implemented CLI**

Run:

```powershell
& $py -m scripts.scheduled_tryout_import.probe_source_inventory --source $sourceDocx --expect-question-rows "8,16,23,28,59,77,89" --expect-explanation-rows "1,5,11,14,15,16,18,19,21,23,24,25,27,28,29,31,36,38,42,43,46,47,49,51,54,56,57,58,60,62,67,70,71,73,75,78,79,83,84,91"
```

Expected exact line: `INVENTORY_OK question=7 explanation=40 total=47 embedded_pictures=5 equations=97`.

- [ ] **Step 5: Commit Task 1**

```powershell
git add scripts/scheduled_tryout_import/models.py scripts/scheduled_tryout_import/ooxml.py scripts/scheduled_tryout_import/probe_source_inventory.py scripts/scheduled_tryout_import/__init__.py tests/scripts/test_scheduled_tryout_ooxml.py tests/fixtures/scheduled_tryout_import
git commit -m "feat: add scheduled tryout OOXML traversal"
```

### Task 2: Parse and validate 91 semantic questions

**Files:**

- Create: `scripts/scheduled_tryout_import/docx_parser.py`
- Create: `tests/scripts/test_scheduled_tryout_docx_parser.py`

- [ ] **Step 1: Write named failing semantic tests**

Tests must assert: only the first top-level table is read; header is skipped; populated source labels are exactly `1` through `91`; rows 92-100 are ignored only when all content is empty; exactly five unambiguous direct option paragraphs map in order to A-E; continuation paragraphs or extra candidate paragraphs block parsing; numbered-list metadata is inspected when present but never used to invent missing text; `Jawaban A` and `Jawaban : C` with variable spaces are accepted; the full matched label is preserved in `answerSourceText`; yellow highlight is ignored; empty stem/option blocks; any stem equation blocks; only standalone `≤ ≥ < >` option equation tokens are accepted; any visual after option A blocks; plain explanations preserve paragraphs; complex explanations return a full post-label fragment selector; same-paragraph content after the answer label is included in that selector.

Run:

```powershell
& $py -m unittest tests.scripts.test_scheduled_tryout_docx_parser -v
```

Expected RED: import failure naming `scripts.scheduled_tryout_import.docx_parser`.

- [ ] **Step 2: Implement semantic parsing without inference**

`docx_parser.py` owns row classification and exposes concrete functions `parse_docx(path)`, `parse_question_row(row_number, row)`, and `validate_document(parsed)`. It uses the last five direct question-cell paragraphs only when there are exactly five structurally valid option candidates after the stem/visual region; otherwise it emits `AMBIGUOUS_OPTIONS`. It obtains `correctOptionKey` only from the same-row explicit answer-label regex and preserves the matched source label. It reports all row-scoped errors and sets partial-source readiness to blocked when any error exists.

- [ ] **Step 3: Run parser tests and verify GREEN**

Run the Step 1 command.

Expected GREEN: all named parser tests pass with `OK`.

- [ ] **Step 4: Parse the original DOCX read-only**

Run:

```powershell
& $py -m scripts.scheduled_tryout_import.docx_parser --source $sourceDocx --output "$repo\tmp\scheduled-tryout-import\source-partial.json"
```

Expected exact console summary:

```text
SOURCE_VALIDATED questions=91 options=455 answers=91 blank_rows=9 question_assets=7 explanation_assets=40 total_assets=47 errors=0
```

The output must also report 5 resolved embedded pictures and 97 Word equation nodes. Any differing count is a blocker, not a reason to loosen validation.

- [ ] **Step 5: Commit Task 2**

```powershell
git add scripts/scheduled_tryout_import/docx_parser.py tests/scripts/test_scheduled_tryout_docx_parser.py
git commit -m "feat: parse scheduled tryout Word questions"
```

### Task 3: Build fragment DOCX files and render exactly at 200 DPI

**Files:**

- Create: `scripts/scheduled_tryout_import/fragment_docx.py`
- Create: `scripts/scheduled_tryout_import/render_word_assets.ps1`
- Create: `scripts/scheduled_tryout_import/rasterize_assets.py`
- Create: `scripts/scheduled_tryout_import/record_visual_review.py`
- Create: `tests/scripts/test_scheduled_tryout_fragments.py`
- Create: `tests/scripts/test_scheduled_tryout_assets.py`

- [ ] **Step 1: Write failing fragment and raster tests**

Fragment tests inspect generated ZIP/XML and assert: original package media, styles, fonts, numbering, and relationships remain present; question fragments contain only visual-bearing direct nodes before option A in source order; explanation fragments contain every node and any same-paragraph residual text after the answer label; no parent three-column border is copied; one fragment file is produced per expected asset; duplicate output refuses overwrite. Raster tests use a two-page fixture and assert Word-PDF pages are rasterized through Poppler at `-r 200`, pure-white outer margins alone are trimmed, multiple pages are stitched vertically in order on white, PNG MIME/dimensions/size are recorded, and size outside 1 through 10,485,760 bytes blocks validation.

Run:

```powershell
& $py -m unittest tests.scripts.test_scheduled_tryout_fragments tests.scripts.test_scheduled_tryout_assets -v
```

Expected RED: import failures naming `fragment_docx` and `rasterize_assets`.

- [ ] **Step 2: Implement fragment-package generation**

`fragment_docx.py` copies the original OPC package per asset and replaces only `word/document.xml` body content with deep copies selected by the parser plus the original section properties. It retains the original related parts so Microsoft Word resolves images, equations, styles, fonts, and nested-table formatting. It writes to a new run directory and refuses existing targets. It validates each generated package by reopening it and comparing the selected XML/text/image relationship sequence with the source.

- [ ] **Step 3: Implement Microsoft Word rendering and 200-DPI rasterization**

`render_word_assets.ps1` opens each fragment read-only in Word, disables prompts and macros, exports Word's fixed-layout PDF, and closes every document and Word instance in `finally`. It never opens the original source for writing. `rasterize_assets.py` requires the exact bundled binary `C:\Users\ASUS\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin\pdftoppm.exe`, invokes it with `-png -r 200`, composites transparency onto white, crops only the exterior all-white bounding box with a safety margin, vertically stitches multiple pages when needed, writes one PNG per asset, verifies PNG signature, and records SHA-256, byte size, width, and height.

- [ ] **Step 4: Run fragment/raster tests and verify GREEN**

Run the Step 1 command.

Expected GREEN: all named tests pass with `OK`; the fixture PNG metadata reports 200 DPI and the oversize fixture is rejected.

- [ ] **Step 5: Generate the actual 47 assets without cloud writes**

Run:

```powershell
if (-not (Test-Path -LiteralPath $pdfToPpm -PathType Leaf)) { throw "Bundled pdftoppm.exe not found" }
& $py -m scripts.scheduled_tryout_import.fragment_docx --source $sourceDocx --partial-manifest "$repo\tmp\scheduled-tryout-import\source-partial.json" --run-root "$repo\tmp\scheduled-tryout-import"
& "$repo\scripts\scheduled_tryout_import\render_word_assets.ps1" -RunRoot "$repo\tmp\scheduled-tryout-import"
& $py -m scripts.scheduled_tryout_import.rasterize_assets --run-root "$repo\tmp\scheduled-tryout-import" --pdftoppm $pdfToPpm --dpi 200
```

Expected exact final line: `ASSETS_RENDERED total=47 question=7 explanation=40 dpi=200 invalid=0`.

- [ ] **Step 6: Inspect and record every asset against Word at 100%**

For each asset, compare the PNG side-by-side against the original Word page at 100% zoom. Approve only identical visible content/order with no clipping or replacement glyph. Record evidence using:

```powershell
& $py -m scripts.scheduled_tryout_import.record_visual_review --run-root "$repo\tmp\scheduled-tryout-import" --interactive
```

The interactive prompt obtains the source page for each already-identified asset and writes evidence in the exact format `Word 100% | source page N | source row N | content/order identical | no clipping | no replacement glyphs`. Expected gate after all 47 reviews: `VISUAL_REVIEW approved=47 pending=0 rejected=0`. Any rejection requires regeneration and a new hash before it can be approved.

- [ ] **Step 7: Commit Task 3**

```powershell
git add scripts/scheduled_tryout_import/fragment_docx.py scripts/scheduled_tryout_import/render_word_assets.ps1 scripts/scheduled_tryout_import/rasterize_assets.py scripts/scheduled_tryout_import/record_visual_review.py tests/scripts/test_scheduled_tryout_fragments.py tests/scripts/test_scheduled_tryout_assets.py
git commit -m "feat: render Word-authoritative tryout assets"
```

---

## Chunk 2 — Cloud snapshot, manifest, Storage, and SQL safeguards

### Task 4: Capture canonical cloud preflight before Storage upload

**Files:**

- Create: `scripts/scheduled_tryout_import/cloud_preflight.sql`
- Create: `scripts/scheduled_tryout_import/finalize_preflight.py`
- Create: `tests/scripts/test_scheduled_tryout_preflight.py`

- [ ] **Step 1: Write failing canonicalization and preflight tests**

Tests assert the SQL reads exactly the eleven event fields (`id`, `title`, `description`, `editorial_status`, `access_start_at`, `access_end_at`, `current_cycle`, `created_by`, `updated_by`, `created_at`, `updated_at`), full dummy question row, dummy options ordered by `sort_order`, count from `scheduled_tryout_attempts`, and active `blocks` rows named `Pharmaceutical Science`. SQL converts timestamps to UTC ISO strings, preserves nulls and array order, and returns raw snapshot values without claiming canonical key order. Python refuses malformed/multiple JSON lines, independently checks the exact target/dummy facts, recursively sorts every object key, preserves array order, serializes UTF-8 with `ensure_ascii=False` and compact separators `(',', ':')`, and computes lowercase SHA-256 from those exact bytes.

Run:

```powershell
& $py -m unittest tests.scripts.test_scheduled_tryout_preflight -v
```

Expected RED: import failure naming `finalize_preflight`.

- [ ] **Step 2: Implement read-only SQL and finalizer**

`cloud_preflight.sql` uses `\pset tuples_only on`, `\pset format unaligned`, and `\o :preflight_output` to write exactly one JSON object to the caller-supplied mounted path. It performs SELECT statements only. The raw object contains `eventSnapshot`, `dummySnapshot`, `attemptCount`, and `activeBlocks`. `finalize_preflight.py` verifies exactly one matching draft event, title `Try Out CBT Pharmaceutical Science Part 1`, zero attempts, one exact dummy ID/content/options snapshot, and exactly one active matching block; canonicalizes the two snapshots with the tested recursive serializer; adds `eventFingerprint`, `dummyFingerprint`, `eventCanonicalJson`, and `dummyCanonicalJson`; then atomically writes `cloud-preflight.json`.

- [ ] **Step 3: Run tests and verify GREEN**

Run the Step 1 command.

Expected GREEN: all preflight tests pass with `OK`.

- [ ] **Step 4: Execute the first cloud preflight interactively**

Create the run directory from the partial manifest, copy `cloud_preflight.sql` into it, then run:

```powershell
$runRoot = (& $py -m scripts.scheduled_tryout_import.docx_parser --print-run-root "$repo\tmp\scheduled-tryout-import\source-partial.json").Trim()
Copy-Item -LiteralPath "$repo\scripts\scheduled_tryout_import\cloud_preflight.sql" -Destination "$runRoot\cloud_preflight.sql" -Force
docker run --rm -it -v "${runRoot}:/work" postgres:17-alpine psql -W "host=aws-0-ap-northeast-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.pqwrsezwynpyeqeaydup sslmode=require" --set=ON_ERROR_STOP=1 --set=preflight_output=/work/cloud-preflight.raw.json --file=/work/cloud_preflight.sql
& $py -m scripts.scheduled_tryout_import.finalize_preflight --input "$runRoot\cloud-preflight.raw.json" --output "$runRoot\cloud-preflight.json"
```

Enter the database password only at psql's hidden `Password:` prompt. Expected final line:

```text
PREFLIGHT_OK event=67049b8f-1763-45aa-993f-d1b93311e294 status=draft attempts=0 questions=1 dummy=94d85610-ef6d-41eb-871e-62fffb776d9f active_block_count=1
```

No Storage or database mutation has occurred.

- [ ] **Step 5: Commit Task 4**

```powershell
git add scripts/scheduled_tryout_import/cloud_preflight.sql scripts/scheduled_tryout_import/finalize_preflight.py tests/scripts/test_scheduled_tryout_preflight.py
git commit -m "feat: capture scheduled tryout cloud preflight"
```

### Task 5: Combine the versioned manifest and generate staging outputs

**Files:**

- Create: `scripts/scheduled_tryout_import/manifest.py`
- Create: `scripts/scheduled_tryout_import/build_import_run.py`
- Create: `scripts/scheduled_tryout_import/assert_manifest.py`
- Create: `tests/scripts/test_scheduled_tryout_manifest.py`

- [ ] **Step 1: Write failing manifest-state tests**

Tests assert every field in `ImportManifest` schemaVersion 1; UUID run/question/option/asset IDs; lowercase source and asset SHA-256; exact remote prefix; canonical JSON serialization with sorted keys and atomic replace; source count 91; options 455; exact 47-asset inventory; non-empty review evidence; CSV layouts; and source-row reconciliation. Gate `storage` accepts only `readiness=validated`, empty errors, approved visuals, unchanged local hashes, PNG, positive dimensions, 1-10 MB, and `uploadStatus=pending`. Gate `database` additionally requires every asset `verified`, remote path/hash/size match, and authenticated readability evidence. Neither gate alters source data.

Run:

```powershell
& $py -m unittest tests.scripts.test_scheduled_tryout_manifest -v
```

Expected RED: import failures naming `manifest` and `build_import_run`.

- [ ] **Step 2: Implement manifest ownership and readiness transitions**

`manifest.py` owns schema parsing, canonical serialization, and the two explicit gates. `build_import_run.py` merges `source-partial.json`, visual metadata/evidence, and `cloud-preflight.json`; it is the only component allowed to populate `expectedEventFingerprint` and `expectedDummyQuestionFingerprint`. It pre-generates 91 question UUIDs and 455 option UUIDs, assigns the preflight block ID to every question, leaves `topic_id` null, and atomically writes `manifest.json`, `questions.csv`, `options.csv`, and `reconciliation.json`. `assert_manifest.py` prints all gate counts and exits nonzero on the first stable validation code.

CSV question columns are `id,event_id,question_order,stem,question_image_path,block_id,topic_id,correct_option_key,explanation_text,explanation_image_path`; option columns are `id,event_question_id,option_key,option_text,sort_order`. RFC 4180 quoting and UTF-8 without BOM are mandatory.

- [ ] **Step 3: Run tests and verify GREEN**

Run the Step 1 command.

Expected GREEN: all manifest tests pass with `OK`.

- [ ] **Step 4: Build the actual combined run and pass the Storage gate**

Run:

```powershell
& $py -m scripts.scheduled_tryout_import.build_import_run --source-partial "$repo\tmp\scheduled-tryout-import\source-partial.json" --preflight "$runRoot\cloud-preflight.json" --run-root $runRoot
& $py -m scripts.scheduled_tryout_import.assert_manifest --manifest "$runRoot\manifest.json" --gate storage
```

Expected exact lines:

```text
MANIFEST_BUILT schema=1 questions=91 options=455 assets=47 readiness=validated errors=0
GATE_STORAGE_OK approved=47 hashes=47 png=47 size_valid=47 pending_uploads=47
```

- [ ] **Step 5: Commit Task 5**

```powershell
git add scripts/scheduled_tryout_import/manifest.py scripts/scheduled_tryout_import/build_import_run.py scripts/scheduled_tryout_import/assert_manifest.py tests/scripts/test_scheduled_tryout_manifest.py
git commit -m "feat: build guarded scheduled tryout manifest"
```

### Task 6: Upload assets with ephemeral application authentication

**Files:**

- Create: `scripts/scheduled_tryout_import/upload_assets.mjs`
- Create: `scripts/scheduled_tryout_import/storage_ledger.mjs`
- Create: `tests/scripts/upload_assets.test.ts`
- Create: `tests/scripts/storage_ledger.test.ts`

- [ ] **Step 1: Write failing uploader and ledger tests**

Inject fake Auth/Storage clients. Tests assert admin/mentor acceptance; all other roles rejected; hidden credential prompt is not logged; sign-out always occurs; gate revalidation precedes authentication; remote paths are exactly `scheduled-events/67049b8f-1763-45aa-993f-d1b93311e294/imports/<runId>/<assetId>.png`; MIME is `image/png`; upload uses `upsert:false`; each success is fsync-appended to `created-objects.jsonl` before the next upload; re-download matches SHA-256 and byte length; manifest update uses temp-file-plus-rename; an upload/re-download/hash failure automatically deletes every object ledgered in that same authenticated session before sign-out; retry cleanup accepts `--cleanup-upload-failure`; cleanup refuses paths outside the current run prefix or ledger and deletes only explicitly ledgered objects.

Run:

```powershell
npx vitest run tests/scripts/upload_assets.test.ts tests/scripts/storage_ledger.test.ts
```

Expected RED: module-resolution failures naming `upload_assets.mjs` and `storage_ledger.mjs`.

- [ ] **Step 2: Implement uploader and durable recovery ledger**

Read only `VITE_SUPABASE_URL` and the publishable/anon key from `.env.local`. Prompt for application email and password at runtime; password input must not echo. Authenticate, query the signed-in profile role, run the storage gate again, upload sequentially with `upsert:false`, fsync the ledger after each success, download through the same authenticated client, verify bytes/hash, and atomically update the manifest asset to `verified`. On any upload, download, or hash error, delete every successfully created path listed in the current ledger before sign-out, mark those assets pending again atomically, and exit nonzero. If automatic cleanup itself is interrupted, `--cleanup-upload-failure` repeats only the ledger/prefix-restricted deletions. Sign out in `finally`. Never print credentials, tokens, or full auth responses.

Cleanup mode accepts `--cleanup-current-run`, revalidates both ledger membership and prefix, and requires a caller-provided `--database-unreferenced-evidence` file before deletion after a database operation.

- [ ] **Step 3: Run tests and verify GREEN**

Run the Step 1 command.

Expected GREEN: Vitest reports both files passed and zero failed tests.

- [ ] **Step 4: Upload the actual assets**

Run:

```powershell
node scripts/scheduled_tryout_import/upload_assets.mjs --manifest "$runRoot\manifest.json" --env-file "$repo\.env.local"
& $py -m scripts.scheduled_tryout_import.assert_manifest --manifest "$runRoot\manifest.json" --gate database
```

If no admin/mentor application credential is available, pause only here and let the user type it interactively; never request it in chat. Expected final lines:

```text
STORAGE_UPLOAD_OK created=47 verified=47 failed=0
GATE_DATABASE_OK questions=91 options=455 assets=47 remote_verified=47 attempts=0
```

Database rows remain unchanged.

If the command fails, expected failure handling is `STORAGE_UPLOAD_FAILED created=N verified=N` followed by `STORAGE_ROLLBACK_OK deleted=N remaining=0`. If the process was interrupted before that line, rerun the authenticated cleanup explicitly:

```powershell
node scripts/scheduled_tryout_import/upload_assets.mjs --manifest "$runRoot\manifest.json" --env-file "$repo\.env.local" --cleanup-upload-failure
```

Expected: `STORAGE_ROLLBACK_OK deleted=N remaining=0`; the database is still unchanged because upload precedes Task 9.

- [ ] **Step 5: Commit Task 6**

```powershell
git add scripts/scheduled_tryout_import/upload_assets.mjs scripts/scheduled_tryout_import/storage_ledger.mjs tests/scripts/upload_assets.test.ts tests/scripts/storage_ledger.test.ts
git commit -m "feat: upload scheduled tryout assets safely"
```

### Task 7: Generate separate import, verification, and restoration SQL

**Files:**

- Create: `scripts/scheduled_tryout_import/sql_common.py`
- Create: `scripts/scheduled_tryout_import/generate_import_sql.py`
- Create: `scripts/scheduled_tryout_import/generate_verify_sql.py`
- Create: `scripts/scheduled_tryout_import/generate_restore_sql.py`
- Create: `scripts/scheduled_tryout_import/finalize_verification.py`
- Create: `tests/scripts/test_scheduled_tryout_import_sql.py`
- Create: `tests/scripts/test_scheduled_tryout_verify_sql.py`
- Create: `tests/scripts/test_scheduled_tryout_restore_sql.py`

- [ ] **Step 1: Write failing import-SQL tests**

Assert `BEGIN ISOLATION LEVEL SERIALIZABLE`; transaction-scoped advisory lock derived from event UUID; `SELECT id FROM public.scheduled_tryout_events WHERE id = '67049b8f-1763-45aa-993f-d1b93311e294' FOR UPDATE`; reconstruction of current event/dummy JSONB and equality with the embedded expected snapshots; SHA-256 verification of the embedded compact canonical JSON bytes against the manifest fingerprints; title/draft/zero-attempt assertions; one active block assertion; temp staging tables matching the CSV columns; `\copy` from `/work/questions.csv` and `/work/options.csv`; schema/readiness/gate constants embedded from the manifest; delete restricted by both event ID and dummy ID; inserts into `scheduled_tryout_event_questions` and `scheduled_tryout_event_question_options`; and pre-COMMIT assertions for 91/455, five A-E options, non-empty text, valid keys, exact inserted UUID sets, block/topic/media mapping, unchanged eleven event fields, and zero attempts. JSONB equality proves the locked current rows equal the snapshots whose tested canonical bytes are fingerprinted. Every passed assertion emits `ASSERT_OK` followed by its stable named code before `COMMIT`.

Run:

```powershell
& $py -m unittest tests.scripts.test_scheduled_tryout_import_sql -v
```

Expected RED: import failure naming `generate_import_sql`.

- [ ] **Step 2: Implement common SQL quoting and import generation**

`sql_common.py` owns validated UUID/text literal quoting and manifest loading only. `generate_import_sql.py` refuses anything that fails the database gate, then writes `import.sql` atomically. It uses the exact table/columns listed in Task 5 and never updates `scheduled_tryout_events`. It includes the captured full dummy snapshot only for comparison; password/auth material never enters SQL.

- [ ] **Step 3: Run import-SQL tests and verify GREEN**

Run the Step 1 command.

Expected GREEN: all import SQL tests pass with `OK`.

- [ ] **Step 4: Write failing verification-SQL tests**

Assert fresh-connection read-only scripts have three distinct contracts. `verify.sql` compares source order, stem, each A-E option, correct key, explanation mode/text, media path, block, null topic, exact run UUID sets, Storage-path inventory, zero attempts, and all eleven unchanged event fields, writing `/work/cloud-verification.raw.json`. `verify_storage_references.sql` proves the original dummy snapshot is intact and no current-run question UUID or Storage path is referenced after a rolled-back import, writing `/work/storage-reference-verification.raw.json`. `verify_restore.sql` proves the captured dummy question/options are restored, all current-run IDs and media references are absent, all eleven event fields are unchanged, and attempts remain zero, writing `/work/post-restore-verification.raw.json`.

Run:

```powershell
& $py -m unittest tests.scripts.test_scheduled_tryout_verify_sql -v
```

Expected RED: import failure naming `generate_verify_sql`.

- [ ] **Step 5: Implement verification SQL and reconciliation finalization**

`generate_verify_sql.py` writes `verify.sql`, `verify_storage_references.sql`, and `verify_restore.sql`; all three perform SELECT statements only. `finalize_verification.py` owns raw-output validation. Mode `import` atomically updates `reconciliation.json` only on the exact 91/455/47 successful contract. Mode `storage-unreferenced` writes `database-unreferenced-evidence.json` only when the dummy is intact and all current-run question IDs and paths are absent. Mode `prepare-restore` writes `restore-authorized.json` only when the current cloud question UUID set exactly equals the 91 run IDs and all eleven event fields match. Mode `restored` accepts only the exact dummy snapshot, no run IDs/media references, unchanged event, and zero attempts.

- [ ] **Step 6: Run verification tests and verify GREEN**

Run the Step 4 command.

Expected GREEN: all verification SQL tests pass with `OK`.

- [ ] **Step 7: Write failing restoration-SQL tests**

Assert serializable transaction, advisory/event row locks, exact current-run question UUID-set equality guard, exact current-run Storage-path references, unchanged event fingerprint, deletion restricted to those run IDs, restoration of the captured dummy question and all captured option IDs/values/timestamps, invariant checks before COMMIT, and refusal to touch rows when the current set differs. Passed assertions emit `RESTORE_ASSERT_OK` followed by a stable named code.

Run:

```powershell
& $py -m unittest tests.scripts.test_scheduled_tryout_restore_sql -v
```

Expected RED: import failure naming `generate_restore_sql`.

- [ ] **Step 8: Implement restoration SQL and run tests**

`generate_restore_sql.py` writes `restore.sql` from the full preflight snapshot and current-run UUIDs. It does not delete Storage. Run the Step 7 command.

Expected GREEN: all restoration SQL tests pass with `OK`.

- [ ] **Step 9: Generate all actual SQL files and run a non-mutating dry gate**

Run:

```powershell
& $py -m scripts.scheduled_tryout_import.generate_import_sql --manifest "$runRoot\manifest.json" --output "$runRoot\import.sql"
& $py -m scripts.scheduled_tryout_import.generate_verify_sql --manifest "$runRoot\manifest.json" --output-directory $runRoot
& $py -m scripts.scheduled_tryout_import.generate_restore_sql --manifest "$runRoot\manifest.json" --output "$runRoot\restore.sql"
& $py -m scripts.scheduled_tryout_import.assert_manifest --manifest "$runRoot\manifest.json" --gate database --print-destructive-summary
```

Expected final line:

```text
DESTRUCTIVE_DRY_GATE_OK event=67049b8f-1763-45aa-993f-d1b93311e294 delete_question=94d85610-ef6d-41eb-871e-62fffb776d9f insert_questions=91 insert_options=455 assets=47 status_preserved=draft
```

- [ ] **Step 10: Commit Task 7**

```powershell
git add scripts/scheduled_tryout_import/sql_common.py scripts/scheduled_tryout_import/generate_import_sql.py scripts/scheduled_tryout_import/generate_verify_sql.py scripts/scheduled_tryout_import/generate_restore_sql.py scripts/scheduled_tryout_import/finalize_verification.py tests/scripts/test_scheduled_tryout_import_sql.py tests/scripts/test_scheduled_tryout_verify_sql.py tests/scripts/test_scheduled_tryout_restore_sql.py
git commit -m "feat: generate guarded scheduled tryout SQL"
```

---

## Chunk 3 — Fresh recheck, atomic replacement, verification, and recovery

### Task 8: Recheck cloud state immediately before replacement

**Runtime outputs only:** `tmp/scheduled-tryout-import/<runId>/`

- [ ] **Step 1: Re-run the same read-only preflight with a fresh connection**

Run:

```powershell
Copy-Item -LiteralPath "$repo\scripts\scheduled_tryout_import\cloud_preflight.sql" -Destination "$runRoot\cloud_preflight.sql" -Force
docker run --rm -it -v "${runRoot}:/work" postgres:17-alpine psql -W "host=aws-0-ap-northeast-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.pqwrsezwynpyeqeaydup sslmode=require" --set=ON_ERROR_STOP=1 --set=preflight_output=/work/cloud-preflight-final.raw.json --file=/work/cloud_preflight.sql
& $py -m scripts.scheduled_tryout_import.finalize_preflight --input "$runRoot\cloud-preflight-final.raw.json" --output "$runRoot\cloud-preflight-final.json"
```

Expected: the same `PREFLIGHT_OK` line as Task 4.

- [ ] **Step 2: Compare first and final preflight byte contracts**

Run:

```powershell
& $py -m scripts.scheduled_tryout_import.finalize_preflight --compare "$runRoot\cloud-preflight.json" --candidate "$runRoot\cloud-preflight-final.json"
& $py -m scripts.scheduled_tryout_import.assert_manifest --manifest "$runRoot\manifest.json" --gate database --preflight "$runRoot\cloud-preflight-final.json"
```

Expected exact lines:

```text
PREFLIGHT_UNCHANGED event_fingerprint=match dummy_fingerprint=match attempts=0 active_block=match
GATE_DATABASE_OK questions=91 options=455 assets=47 remote_verified=47 attempts=0
```

The gate explicitly revalidates schemaVersion 1, empty errors, source/local/remote hashes, PNG MIME, 1-10 MB sizes, positive dimensions, 47 non-empty visual evidence strings, 47 authenticated reads, event/dummy fingerprints, and zero attempts.

### Task 9: Execute the guarded serializable replacement

**Use:** `tmp/scheduled-tryout-import/<runId>/import.sql`

- [ ] **Step 1: Run the exact import through Docker psql**

Run:

```powershell
docker run --rm -it -v "${runRoot}:/work:ro" postgres:17-alpine psql -W "host=aws-0-ap-northeast-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.pqwrsezwynpyeqeaydup sslmode=require" --set=ON_ERROR_STOP=1 --file=/work/import.sql
```

Enter the database password only at psql's hidden prompt.

- [ ] **Step 2: Require the complete pre-COMMIT assertion transcript**

Expected transcript contains, in order, `ASSERT_OK EVENT_LOCKED`, `ASSERT_OK EVENT_FINGERPRINT`, `ASSERT_OK DUMMY_FINGERPRINT`, `ASSERT_OK ZERO_ATTEMPTS`, `ASSERT_OK ACTIVE_BLOCK`, `ASSERT_OK STAGING_91_455`, `ASSERT_OK INSERTED_UUID_SET`, `ASSERT_OK FIVE_OPTIONS_A_E`, `ASSERT_OK CONTENT_NONEMPTY`, `ASSERT_OK MEDIA_MAPPING`, `ASSERT_OK EVENT_FIELDS_UNCHANGED`, `ASSERT_OK ZERO_ATTEMPTS_FINAL`, then `COMMIT` and `IMPORT_OK questions=91 options=455`. Missing or reordered assertions are treated as failure; `ON_ERROR_STOP` must leave the transaction rolled back.

- [ ] **Step 3: Clean up uploaded assets if the import command fails before COMMIT**

Only on a nonzero Task 9 psql exit, prove the rollback left the exact dummy intact and no current-run ID or path referenced, then perform authenticated ledger-restricted cleanup:

```powershell
docker run --rm -it -v "${runRoot}:/work" postgres:17-alpine psql -W "host=aws-0-ap-northeast-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.pqwrsezwynpyeqeaydup sslmode=require" --set=ON_ERROR_STOP=1 --file=/work/verify_storage_references.sql
& $py -m scripts.scheduled_tryout_import.finalize_verification --mode storage-unreferenced --input "$runRoot\storage-reference-verification.raw.json" --manifest "$runRoot\manifest.json" --evidence "$runRoot\database-unreferenced-evidence.json"
node scripts/scheduled_tryout_import/upload_assets.mjs --manifest "$runRoot\manifest.json" --env-file "$repo\.env.local" --cleanup-current-run --database-unreferenced-evidence "$runRoot\database-unreferenced-evidence.json"
```

Expected exact lines: `DATABASE_UNREFERENCED_OK dummy=intact run_ids=0 run_paths=0`, then `STORAGE_CLEANUP_OK deleted=47 skipped=0`. If the evidence command fails, stop and retain all Storage objects for human review.

### Task 10: Verify independently and recover only on exact current-run ownership

**Use:** `verify.sql`, `restore.sql`, `reconciliation.json`, `created-objects.jsonl`

- [ ] **Step 1: Verify from a fresh database connection**

Run:

```powershell
docker run --rm -it -v "${runRoot}:/work" postgres:17-alpine psql -W "host=aws-0-ap-northeast-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.pqwrsezwynpyeqeaydup sslmode=require" --set=ON_ERROR_STOP=1 --file=/work/verify.sql
& $py -m scripts.scheduled_tryout_import.finalize_verification --mode import --input "$runRoot\cloud-verification.raw.json" --manifest "$runRoot\manifest.json" --reconciliation "$runRoot\reconciliation.json"
```

Expected exact final lines:

```text
VERIFY_OK mismatches=0 questions=91 options=455 assets=47
RECONCILIATION_OK source_rows=91 cloud_rows=91 option_rows=455 event_fields_unchanged=11 attempts=0
```

- [ ] **Step 2: Use compensation only if fresh verification fails and ownership is exact**

First run verification finalization in `prepare-restore` mode:

```powershell
& $py -m scripts.scheduled_tryout_import.finalize_verification --mode prepare-restore --input "$runRoot\cloud-verification.raw.json" --manifest "$runRoot\manifest.json" --authorization "$runRoot\restore-authorized.json"
```

Expected: `RESTORE_AUTHORIZED run_question_ids=91 event_fields_unchanged=11`; it writes `restore-authorized.json` only when the current cloud question UUID set exactly equals the 91 current-run IDs and the eleven event fields still match. If the command fails or that file is absent, stop without deleting database or Storage data.

When and only when `restore-authorized.json` exists, run:

```powershell
docker run --rm -it -v "${runRoot}:/work:ro" postgres:17-alpine psql -W "host=aws-0-ap-northeast-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.pqwrsezwynpyeqeaydup sslmode=require" --set=ON_ERROR_STOP=1 --file=/work/restore.sql
docker run --rm -it -v "${runRoot}:/work" postgres:17-alpine psql -W "host=aws-0-ap-northeast-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.pqwrsezwynpyeqeaydup sslmode=require" --set=ON_ERROR_STOP=1 --file=/work/verify_restore.sql
& $py -m scripts.scheduled_tryout_import.finalize_verification --mode restored --input "$runRoot\post-restore-verification.raw.json" --manifest "$runRoot\manifest.json" --evidence "$runRoot\database-unreferenced-evidence.json"
```

Expected restoration transcript ends with `RESTORE_OK dummy=94d85610-ef6d-41eb-871e-62fffb776d9f options=5 event_fields_unchanged=11 attempts=0`. The dedicated post-restore verification must then emit `POST_RESTORE_OK dummy=intact run_ids=0 run_paths=0 event_fields_unchanged=11 attempts=0` and create `database-unreferenced-evidence.json`. Only then run:

```powershell
node scripts/scheduled_tryout_import/upload_assets.mjs --manifest "$runRoot\manifest.json" --env-file "$repo\.env.local" --cleanup-current-run --database-unreferenced-evidence "$runRoot\database-unreferenced-evidence.json"
```

Expected: `STORAGE_CLEANUP_OK deleted=47 skipped=0`. Cleanup refuses all non-ledger or non-prefix paths.

- [ ] **Step 3: Confirm final target state**

The successful non-restored path must prove 91 questions numbered 1-91, 455 options, five options per question, valid source answer keys, seven question media paths, forty explanation media paths, 47 remotely readable matching objects, the one active Pharmaceutical Science block on every question, null topic on every question, zero attempts, `editorial_status=draft`, and byte-for-byte unchanged values for all eleven event fields.

- [ ] **Step 4: Run focused and repository regression verification**

Run:

```powershell
& $py -m unittest discover -s tests/scripts -p "test_scheduled_tryout_*.py" -v
npx vitest run tests/scripts/upload_assets.test.ts tests/scripts/storage_ledger.test.ts
npm test -- --run
git status --short
```

Expected: focused Python and Vitest suites pass with zero failures; repository suite passes or any pre-existing unrelated failure is documented separately; only intended committed files and ignored/untracked runtime artifacts remain.

- [ ] **Step 5: Rotate the exposed database password**

Report success without repeating the password and tell the user to rotate the Supabase database password immediately. Never rotate it without a separate explicit request.
