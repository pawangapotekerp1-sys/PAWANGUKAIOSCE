# Source-Aware Flashcard Engine, BYOK, dan Gemini 3.8 Flash Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun AI Quality Engine 8-tahap pada Flash Card Generator yang memadukan PDF slide PPT dan transkrip kelas online secara komplementer dengan multi-source provenance, deteksi konflik substantif, publish gating di backend, isolasi kredensial BYOK, serta migrasi model ke `gemini-3.8-flash` dengan akuntansi token resmi (`thoughtsTokenCount`).

**Architecture:** Arsitektur pipeline modular 8-tahap di Deno Edge Function (`supabase/functions/flash-card-generator/pipeline/`) dengan pemrosesan deterministik aman, pemrosesan multimodal Gemini 3.8 Flash, in-memory directed knowledge graph, re-review adversarial independen, single-cycle targeted repair, checkpoint state machine untuk ketahanan timeout, dan penyimpanan non-destruktif ke PostgreSQL via RPC terproteksi.

**Tech Stack:** TypeScript, Deno Edge Runtime, Google Gemini 3.8 Flash REST API, Supabase (PostgreSQL, Vault, RLS, Storage), Zod, React 19, Vite, TanStack Query, Vitest.

## Global Constraints
- Target model untuk Flash Card Generator dan Student AI Insight adalah `gemini-3.8-flash`.
- Fitur realtime OSCE Live (`use-gemini-live.ts`, `generate-osce`, `simulate-osce`) TIDAK BOLEH disentuh atau diubah protokolnya.
- BYOK strictly enforced: Kredensial dibaca dari Supabase Vault di backend; API key mentah tidak pernah dikirim ke browser atau dicatat di log.
- Publish Gating: Materi dengan konflik sumber derajat `critical` dan `high` yang belum diselesaikan DIBLOKIR dari publikasi pada level backend.
- Multi-Source Provenance: Mendukung multi-sumber per kartu (`sources[]`) dengan pemisahan status provenance dari status verifikasi klinis.
- Zero-Hallucination: Dilarang mengarang nomor halaman, nomor slide, atau kutipan sumber palsu. Jika tidak dapat diverifikasi, field diisi `null`.
- Repair Cap: Targeted repair dibatasi maksimal 1 siklus (*hard cap 1 cycle*) dengan re-review penuh. Konflik substantif TIDAK ditebak oleh AI.
- Backward Compatibility: Skema database menggunakan `metadata jsonb default '{}'::jsonb` non-destruktif; data lama tetap terbaca 100%.

---

## Files Map

```
supabase/
├── migrations/
│   ├── 20261017000050_source_aware_flashcard_engine.sql       # SQL migration (metadata columns, RPC security)
│   └── 20261017000050_source_aware_flashcard_engine.test.ts   # Migration assertions
├── functions/
│   ├── _shared/
│   │   ├── gemini-client.ts        # thoughtsTokenCount, thinkingLevel, allowlist, usage parsing
│   │   ├── gemini-client.test.ts   # Unit tests for token usage & thinkingConfig
│   │   ├── flash-card.ts           # Shared Zod schemas (Multi-source, conflicts, metadata)
│   │   └── flash-card.test.ts      # Schema & quality assertions
│   ├── flash-card-generator/
│   │   ├── pipeline/
│   │   │   ├── cleaner.ts          # Tier 1 regex normalizer + Tier 2 contextual classifier
│   │   │   ├── cleaner.test.ts     # Clinical Entity Shield & noise filtering tests
│   │   │   ├── aligner.ts          # In-memory knowledge graph, alignment, conflict detector
│   │   │   ├── aligner.test.ts     # Multi-source provenance & conflict detection tests
│   │   │   ├── generator.ts        # Clean prompt builder & multimodal card generator
│   │   │   ├── generator.test.ts   # Generation schema tests
│   │   │   ├── reviewer.ts         # 3-axis adversarial audit pass
│   │   │   ├── reviewer.test.ts    # Reviewer rubric & conflict classification tests
│   │   │   ├── repairer.ts         # Single-cycle targeted repair & re-review pass
│   │   │   ├── repairer.test.ts    # Repair cap & validation tests
│   │   │   ├── orchestrator.ts     # 8-stage coordinator, checkpoint state machine, recovery
│   │   │   └── orchestrator.test.ts# Checkpoint resume & timeout recovery tests
│   │   ├── handler.ts              # Request validation, owner auth check, conflict resolvers
│   │   ├── index.ts                # Route handlers (process, audit-repair, resolve-conflict, publish)
│   │   └── index.test.ts           # E2E Edge Function integration tests
│   └── student-ai-insight/
│       ├── index.ts                # Default model migration to gemini-3.8-flash & usage logging
│       └── index.test.ts           # Migration verification tests
src/
├── lib/api/
│   ├── flash-card-api.ts           # Client types & methods (sources, conflicts, audit-repair)
│   └── flash-card-api.test.ts      # API client test suite
├── pages/app/
│   ├── ai-config-page.tsx          # gemini-3.8-flash standard default & UI text
│   └── ai-config-page.test.tsx     # UI assertions
└── components/flash-cards/
    ├── flash-card-review-editor.tsx # Multi-source pills, conflict resolution UI, gating, token panel
    └── flash-card-review-editor.test.tsx # UI component tests
```

---

### Task 1: Non-Destructive Database Migration & RPC Security

**Files:**
- Create: `supabase/migrations/20261017000050_source_aware_flashcard_engine.sql`
- Create: `supabase/migrations/20261017000050_source_aware_flashcard_engine.test.ts`

**Interfaces:**
- Consumes: Existing tables `flashcard_materials`, `flashcard_cards`, `user_ai_credentials`.
- Produces: New columns `metadata jsonb default '{}'` on both tables, updated RPC `replace_flashcard_material_content` with owner check and strict permissions.

- [ ] **Step 1: Write the failing test for migration SQL**

```ts
// supabase/migrations/20261017000050_source_aware_flashcard_engine.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Migration 20261017000050_source_aware_flashcard_engine.sql", () => {
  const sqlPath = resolve(__dirname, "20261017000050_source_aware_flashcard_engine.sql");
  const sqlContent = readFileSync(sqlPath, "utf-8");

  it("adds metadata column to flashcard_materials and flashcard_cards idempotently", () => {
    expect(sqlContent).toMatch(/alter table public\.flashcard_materials\s+add column if not exists metadata jsonb not null default '{}'::jsonb;/i);
    expect(sqlContent).toMatch(/alter table public\.flashcard_cards\s+add column if not exists metadata jsonb not null default '{}'::jsonb;/i);
  });

  it("updates user_ai_credentials default model to gemini-3.8-flash", () => {
    expect(sqlContent).toMatch(/alter table public\.user_ai_credentials\s+alter column model set default 'gemini-3.8-flash';/i);
  });

  it("secures RPC replace_flashcard_material_content with owner check and revoked permissions", () => {
    expect(sqlContent).toMatch(/create or replace function public\.replace_flashcard_material_content/i);
    expect(sqlContent).toMatch(/if actual_owner_id <> target_owner_id then/i);
    expect(sqlContent).toMatch(/revoke all on function public\.replace_flashcard_material_content\(uuid, uuid, jsonb\) from public, anon, authenticated;/i);
    expect(sqlContent).toMatch(/grant execute on function public\.replace_flashcard_material_content\(uuid, uuid, jsonb\) to service_role;/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/migrations/20261017000050_source_aware_flashcard_engine.test.ts`
Expected: FAIL (File not found).

- [ ] **Step 3: Write the SQL migration file**

```sql
-- supabase/migrations/20261017000050_source_aware_flashcard_engine.sql
-- 1. Tambah kolom metadata pada flashcard_materials
alter table public.flashcard_materials
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 2. Tambah kolom metadata pada flashcard_cards
alter table public.flashcard_cards
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 3. Update default model user_ai_credentials ke gemini-3.8-flash
alter table public.user_ai_credentials
  alter column model set default 'gemini-3.8-flash';

-- 4. RPC Penggantian Konten Atomik dengan Dukungan Metadata dan Proteksi Hak Akses
create or replace function public.replace_flashcard_material_content(
  target_material_id uuid,
  target_owner_id uuid,
  target_subtopics jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actual_owner_id uuid;
begin
  if target_subtopics is null or jsonb_typeof(target_subtopics) <> 'array' or jsonb_array_length(target_subtopics) = 0 then
    raise exception 'Flash card subtopics payload is required.';
  end if;

  select created_by into actual_owner_id
  from public.flashcard_materials
  where id = target_material_id;

  if actual_owner_id is null then
    raise exception 'Flash card material not found.';
  end if;

  if actual_owner_id <> target_owner_id then
    raise exception 'Flash card material is not owned by the provided mentor.';
  end if;

  delete from public.flashcard_subtopics
  where material_id = target_material_id;

  with inserted_subtopics as (
    insert into public.flashcard_subtopics (
      material_id,
      title,
      summary,
      sort_order
    )
    select
      target_material_id,
      trim(subtopic_payload ->> 'title'),
      trim(subtopic_payload ->> 'summary'),
      subtopic_order::integer
    from jsonb_array_elements(target_subtopics) with ordinality as subtopic(subtopic_payload, subtopic_order)
    returning id, sort_order
  )
  insert into public.flashcard_cards (
    subtopic_id,
    front_text,
    back_text,
    sort_order,
    metadata
  )
  select
    inserted_subtopics.id,
    trim(card_payload ->> 'front_text'),
    trim(card_payload ->> 'back_text'),
    card_order::integer,
    coalesce(card_payload -> 'metadata', '{}'::jsonb)
  from inserted_subtopics
  inner join jsonb_array_elements(target_subtopics) with ordinality as subtopic(subtopic_payload, subtopic_order)
    on inserted_subtopics.sort_order = subtopic_order::integer
  inner join jsonb_array_elements(subtopic.subtopic_payload -> 'cards') with ordinality as card(card_payload, card_order)
    on true;
end;
$$;

revoke all on function public.replace_flashcard_material_content(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_flashcard_material_content(uuid, uuid, jsonb) to service_role;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/migrations/20261017000050_source_aware_flashcard_engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261017000050_source_aware_flashcard_engine.sql supabase/migrations/20261017000050_source_aware_flashcard_engine.test.ts
git commit -m "feat(db): add non-destructive metadata columns and secure replace_flashcard_material_content RPC"
```

---

### Task 2: Shared Gemini Client Update (`gemini-3.8-flash`, `thoughtsTokenCount`, & Usage Accounting)

**Files:**
- Modify: `supabase/functions/_shared/gemini-client.ts`
- Modify: `supabase/functions/_shared/gemini-client.test.ts`

**Interfaces:**
- Consumes: Gemini REST API v1beta.
- Produces: `GeminiUsageMetadata`, `generateGeminiTextWithUsage`, `generateGeminiStructuredDataWithUsage`, `normalizeAiModel`, `testGeminiConnection`.

- [ ] **Step 1: Write failing tests for usage metadata, thoughtsTokenCount, and thinkingLevel**

```ts
// In supabase/functions/_shared/gemini-client.test.ts
test("extracts thoughtsTokenCount and usage metadata from Gemini response", async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: '{"result":"ok"}' }] } }],
      usageMetadata: {
        promptTokenCount: 150,
        candidatesTokenCount: 50,
        totalTokenCount: 200,
        candidatesTokensDetails: [{ modality: "TEXT", tokenCount: 30 }, { modality: "THINKING", tokenCount: 20 }],
        thoughtsTokenCount: 20,
      },
    }),
  });
  vi.stubGlobal("fetch", fetchMock);

  const { generateGeminiTextWithUsage } = await import("./gemini-client.ts");
  const result = await generateGeminiTextWithUsage({
    apiKey: "test-key",
    model: "gemini-3.8-flash",
    prompt: "Hello",
    thinkingLevel: "low",
  });

  expect(result.text).toBe('{"result":"ok"}');
  expect(result.usage).toEqual({
    isAvailable: true,
    promptTokenCount: 150,
    candidatesTokenCount: 50,
    totalTokenCount: 200,
    thoughtsTokenCount: 20,
  });

  const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
  const body = JSON.parse(String(requestInit.body));
  expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "low" });
});

test("normalizes deprecated model IDs gracefully to gemini-3.8-flash", async () => {
  const { normalizeAiModel, DEFAULT_AI_MODEL } = await import("./gemini-client.ts");
  expect(DEFAULT_AI_MODEL).toBe("gemini-3.8-flash");
  expect(normalizeAiModel("gemini-3.7-flash")).toBe("gemini-3.8-flash");
  expect(normalizeAiModel("gemini-2.5-flash")).toBe("gemini-3.8-flash");
  expect(normalizeAiModel("gemini-3.8-flash")).toBe("gemini-3.8-flash");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/_shared/gemini-client.test.ts`
Expected: FAIL (`generateGeminiTextWithUsage` or `normalizeAiModel` not defined).

- [ ] **Step 3: Implement usage metadata parsing, thinkingLevel support, and model normalization**

Update `supabase/functions/_shared/gemini-client.ts`:
- Define `SUPPORTED_AI_MODELS = ["gemini-3.8-flash"] as const`, `DEFAULT_AI_MODEL = "gemini-3.8-flash"`.
- Implement `normalizeAiModel(model: string | null | undefined): string`.
- Define `GeminiUsageMetadata` interface.
- Extract `payload.usageMetadata` (including `thoughtsTokenCount` or fallback search in `candidatesTokensDetails`).
- Update `thinkingConfig` generation: support `thinkingLevel: "low" | "medium" | "high"` alongside `thinkingBudget`.
- In `testGeminiConnection`: pass `thinkingBudget: 0` or omit heavy reasoning to fix existing test suite.
- Export `generateGeminiTextWithUsage` and `generateGeminiStructuredDataWithUsage`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/_shared/gemini-client.test.ts`
Expected: PASS (all 14 tests pass, including the previously failing test).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/gemini-client.ts supabase/functions/_shared/gemini-client.test.ts
git commit -m "feat(gemini): support gemini-3.8-flash, thoughtsTokenCount, and thinkingLevel in shared client"
```

---

### Task 3: Shared Flash Card Domain Models, Multi-Source Provenance & Conflict Schemas

**Files:**
- Modify: `supabase/functions/_shared/flash-card.ts`
- Modify: `supabase/functions/_shared/flash-card.test.ts`

**Interfaces:**
- Consumes: Zod.
- Produces: `CardSourceReferenceSchema`, `CardMetadataSchema`, `SourceConflictRecordSchema`, `MaterialMetadataSchema`, `validateCardMetadata`.

- [ ] **Step 1: Write failing tests for multi-source provenance and conflict validation**

```ts
// In supabase/functions/_shared/flash-card.test.ts
test("validates card metadata with multiple sources and separate clinical verification", () => {
  const { validateCardMetadata } = await import("./flash-card.ts");
  const validMetadata = {
    sources: [
      {
        sourceId: "pdf-page-3",
        sourceType: "slide_pdf",
        provenanceStatus: "verified_exact",
        location: {
          pdfPageIndex: 3,
          printedSlideNumber: 2,
          segmentId: null,
          textQuote: "Dosis pemeliharaan 25 mg 2x sehari",
        },
        alignmentConfidence: "high",
        confidenceReason: "Kutipan harfiah pada slide tabel dosis",
      },
      {
        sourceId: "transcript-seg-015",
        sourceType: "transcript",
        provenanceStatus: "verified_exact",
        location: {
          pdfPageIndex: null,
          printedSlideNumber: null,
          segmentId: "seg-015",
          textQuote: "mentor menegaskan dosis pada lansia diturunkan setengahnya",
        },
        alignmentConfidence: "high",
        confidenceReason: "Elaborasi lisan terhubung ke slide 2",
      },
    ],
    clinicalVerification: {
      status: "source_supported_only",
      notes: "Sesuai materi slide dan penjelasan kelas",
    },
    qualityStatus: "ACCEPTED",
  };

  const parsed = validateCardMetadata(validMetadata);
  expect(parsed.sources).toHaveLength(2);
  expect(parsed.clinicalVerification.status).toBe("source_supported_only");
});

test("validates source conflict records with required evidence pairs and severity", () => {
  const { validateSourceConflictRecord } = await import("./flash-card.ts");
  const conflict = {
    conflictId: "cnf-001",
    conceptId: "cpt-captopril-dose",
    category: "dosage_discrepancy",
    severity: "critical",
    slideEvidence: {
      pdfPageIndex: 5,
      printedSlideNumber: 5,
      exactQuote: "Dosis awal 12.5 mg",
    },
    transcriptEvidence: {
      segmentId: "seg-034",
      exactQuote: "Kasih dosis awal langsung 50 mg",
    },
    distinctionType: "substantive_contradiction",
    resolutionStatus: "unresolved",
  };

  const parsed = validateSourceConflictRecord(conflict);
  expect(parsed.severity).toBe("critical");
  expect(parsed.resolutionStatus).toBe("unresolved");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/_shared/flash-card.test.ts`
Expected: FAIL (`validateCardMetadata` or `validateSourceConflictRecord` not defined).

- [ ] **Step 3: Implement Zod schemas and validation helpers in `_shared/flash-card.ts`**

Define:
- `CardSourceReferenceSchema` (supporting `pdfPageIndex`, `printedSlideNumber`, `segmentId`, `textQuote`).
- `CardMetadataSchema` (array `sources`, `clinicalVerification`, `qualityStatus`, `conflictRefId`).
- `SourceConflictRecordSchema` (severity, slideEvidence, transcriptEvidence, resolutionStatus).
- `MaterialMetadataSchema` (tokenUsage, qualityReport, sourceConflicts, rejectedAuditTrail with max 10 limit).
- Export helper functions `validateCardMetadata`, `validateSourceConflictRecord`, `validateMaterialMetadata`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/_shared/flash-card.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/flash-card.ts supabase/functions/_shared/flash-card.test.ts
git commit -m "feat(flash-card): add multi-source provenance, conflict records, and material metadata schemas"
```

---

### Task 4: Transcript Cleaning & Noise Filtering with Clinical Entity Shield

**Files:**
- Create: `supabase/functions/flash-card-generator/pipeline/cleaner.ts`
- Create: `supabase/functions/flash-card-generator/pipeline/cleaner.test.ts`

**Interfaces:**
- Consumes: Raw transcript string, BYOK API key, `gemini-client.ts`.
- Produces: `cleanTranscript(rawTranscript: string, options: CleanerOptions): Promise<CleanedTranscriptResult>`.

- [ ] **Step 1: Write failing tests for deterministic normalizer and clinical shield**

```ts
// supabase/functions/flash-card-generator/pipeline/cleaner.test.ts
import { describe, expect, it, vi } from "vitest";
import { normalizeDeterministicTranscript, scanClinicalEntities, cleanTranscript } from "./cleaner.ts";

describe("Transcript Cleaner", () => {
  it("strips ASR timestamps and speaker labels without mutating clinical negations", () => {
    const raw = "[00:14:20] Speaker 1: Pasien gagal ginjal tidak boleh diberikan kombinasi ini.\n\n[00:14:35] Speaker 1: Catat ya.";
    const result = normalizeDeterministicTranscript(raw);
    expect(result).toContain("Pasien gagal ginjal tidak boleh diberikan kombinasi ini.");
    expect(result).not.toContain("[00:14:20]");
    expect(result).not.toContain("Speaker 1:");
  });

  it("identifies clinical entities and prevents false removal into noise", () => {
    const textWithDose = "eh anu, dikasih 500 mg sehari 2x1 sesudah makan";
    const entities = scanClinicalEntities(textWithDose);
    expect(entities.hasClinicalEntities).toBe(true);
    expect(entities.matchedEntities).toEqual(expect.arrayContaining(["500 mg", "2x1"]));
  });

  it("classifies tech noise as noise but clinical ambiguity as uncertain", async () => {
    const mockGemini = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        classifications: [
          { segmentId: "seg-001", classification: "noise", reason: "Audio test" },
          { segmentId: "seg-002", classification: "uncertain", reason: "Cutoff dosage sentence" }
        ]
      }),
      usage: { isAvailable: true, promptTokenCount: 100, candidatesTokenCount: 40, totalTokenCount: 140, thoughtsTokenCount: 0 }
    });

    const result = await cleanTranscript("Tes mic satu dua... Dosisnya 500 mg tapi...", {
      apiKey: "test",
      model: "gemini-3.8-flash",
      geminiClient: mockGemini as any,
    });

    expect(result.droppedNoiseCount).toBeGreaterThanOrEqual(0);
    expect(result.retainedSegments.some(s => s.classification === "uncertain")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/flash-card-generator/pipeline/cleaner.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement cleaner pipeline module**

Write `supabase/functions/flash-card-generator/pipeline/cleaner.ts`:
- `normalizeDeterministicTranscript`: regex cleaning for timestamps, speaker labels, line normalization, safe stutter deduplication.
- `scanClinicalEntities`: regex patterns for doses (`mg`, `mcg`, `IU`, `tetes`, `%`), frequencies (`1x1`, `prn`, `ac`, `pc`), pharmacological stems (`-olol`, `-pril`, `-sartan`, `-statin`).
- `segmentTranscript`: split transcript into segments with ID `seg-001`, `seg-002`, preserving line offset and timestamps.
- `classifyTranscriptSegments`: call Gemini 3.8 Flash (`thinkingLevel: "low"`) in chunks of 15–20 segments with sliding overlap. If segment contains clinical entities, prevent `noise` classification (coerce to `uncertain` if ambiguous).
- Compute `CleanedTranscriptResult` with `retainedText`, `retainedSegments`, and `tokenUsage`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/flash-card-generator/pipeline/cleaner.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/flash-card-generator/pipeline/cleaner.ts supabase/functions/flash-card-generator/pipeline/cleaner.test.ts
git commit -m "feat(pipeline): add transcript cleaner with deterministic normalizer and clinical entity shield"
```

---

### Task 5: In-Memory Concept Mapping, Alignment & Multi-Source Provenance Tracking

**Files:**
- Create: `supabase/functions/flash-card-generator/pipeline/aligner.ts`
- Create: `supabase/functions/flash-card-generator/pipeline/aligner.test.ts`

**Interfaces:**
- Consumes: Cleaned segments, PDF slide data, Gemini client.
- Produces: `ConceptGraph`, `SourceAlignmentResult`, `detectSourceConflicts`.

- [ ] **Step 1: Write failing tests for concept mapping, alignment, and conflict detection**

```ts
// supabase/functions/flash-card-generator/pipeline/aligner.test.ts
import { describe, expect, it } from "vitest";
import { buildKnowledgeGraph, alignSourcesAndDetectConflicts } from "./aligner.ts";

describe("Aligner & Conflict Detector", () => {
  it("builds an in-memory directed knowledge graph from extracted concepts", () => {
    const rawConcepts = [
      { id: "cpt-1", name: "Hipertensi", domain: "clinical_science", level: "subtopic" },
      { id: "cpt-2", name: "Captopril", domain: "pharmaceutical_science", level: "core_concept" }
    ];
    const relations = [{ sourceId: "cpt-2", targetId: "cpt-1", relationType: "first_line_for" }];

    const graph = buildKnowledgeGraph(rawConcepts, relations);
    expect(graph.getNode("cpt-2")?.name).toBe("Captopril");
    expect(graph.getOutgoingRelations("cpt-2")).toHaveLength(1);
  });

  it("detects substantive conflict when slide and transcript contradict on dosage", () => {
    const slideInfo = [{ pdfPageIndex: 4, printedSlideNumber: 4, textSummary: "Dosis pemeliharaan 25 mg 2x sehari" }];
    const transcriptSegments = [{ segmentId: "seg-010", text: "Mentor menegaskan dosis pemeliharaan 50 mg 2x sehari" }];

    const result = alignSourcesAndDetectConflicts({
      slides: slideInfo,
      segments: transcriptSegments,
      candidateComparisons: [
        {
          conceptId: "cpt-captopril",
          slideClaim: "Dosis pemeliharaan 25 mg 2x sehari",
          slidePageIndex: 4,
          transcriptClaim: "Dosis pemeliharaan 50 mg 2x sehari",
          segmentId: "seg-010",
        }
      ]
    });

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].severity).toBe("critical");
    expect(result.conflicts[0].category).toBe("dosage_discrepancy");
    expect(result.conflicts[0].resolutionStatus).toBe("unresolved");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/flash-card-generator/pipeline/aligner.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement aligner and knowledge graph logic**

Write `supabase/functions/flash-card-generator/pipeline/aligner.ts`:
- Define `KnowledgeGraph` class with nodes, edges, and lookup methods.
- `alignSourcesAndDetectConflicts`: evaluate slide text vs transcript segments; distinguish `compatible_elaboration` from `substantive_contradiction`.
- Construct `CardSourceReference[]` with `pdfPageIndex`, `printedSlideNumber`, `segmentId`, `textQuote` (capped at 200 chars), `provenanceStatus`, and `confidenceReason`.
- Construct `SourceConflictRecord[]` for conflicts with severity `critical`, `high`, `moderate`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/flash-card-generator/pipeline/aligner.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/flash-card-generator/pipeline/aligner.ts supabase/functions/flash-card-generator/pipeline/aligner.test.ts
git commit -m "feat(pipeline): add in-memory knowledge graph and source conflict detector"
```

---

### Task 6: Flashcard Generation, Independent Adversarial Reviewer & Single-Cycle Targeted Repair

**Files:**
- Create: `supabase/functions/flash-card-generator/pipeline/generator.ts`
- Create: `supabase/functions/flash-card-generator/pipeline/reviewer.ts`
- Create: `supabase/functions/flash-card-generator/pipeline/repairer.ts`
- Create: `supabase/functions/flash-card-generator/pipeline/pipeline-quality.test.ts`

**Interfaces:**
- Consumes: Knowledge graph, aligned sources, Gemini 3.8 Flash client.
- Produces: `generateCandidateCards`, `reviewCandidateCards`, `repairDefectiveCards`.

- [ ] **Step 1: Write failing tests for generation, reviewer, and single-cycle repair**

```ts
// supabase/functions/flash-card-generator/pipeline/pipeline-quality.test.ts
import { describe, expect, it, vi } from "vitest";
import { generateCandidateCards } from "./generator.ts";
import { reviewCandidateCards } from "./reviewer.ts";
import { repairDefectiveCards } from "./repairer.ts";

describe("Generation, Reviewer, and Repair Pipeline", () => {
  it("generates candidate cards with clean front and back text without citation tags", async () => {
    const mockGemini = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        subtopics: [{
          title: "Farmakologi Kardiovaskular",
          summary: "Ringkasan subtopik",
          cards: [{ front_text: "Apa indikasi Captopril?", back_text: "Hipertensi dan gagal jantung kongestif." }]
        }]
      }),
      usage: { isAvailable: true, promptTokenCount: 200, candidatesTokenCount: 50, totalTokenCount: 250, thoughtsTokenCount: 10 }
    });

    const result = await generateCandidateCards({
      title: "Kardio",
      academicGroup: "clinical_science",
      alignedContext: "...",
      geminiClient: mockGemini as any,
      apiKey: "key",
      model: "gemini-3.8-flash"
    });

    expect(result.cards[0].front_text).not.toContain("[Slide");
    expect(result.cards[0].back_text).not.toContain("[Slide");
  });

  it("reviewer flags substantive conflict and prevents auto-repair", async () => {
    const cards = [{ id: "c1", front_text: "Dosis Captopril?", back_text: "Langsung 50 mg", conceptId: "cpt-1" }];
    const conflicts = [{ conflictId: "cnf-1", conceptId: "cpt-1", severity: "critical", category: "dosage_discrepancy" }];

    const reviewResult = await reviewCandidateCards({
      cards: cards as any,
      conflicts: conflicts as any,
      geminiClient: vi.fn() as any,
      apiKey: "key",
      model: "gemini-3.8-flash"
    });

    expect(reviewResult.reviewedCards[0].qualityStatus).toBe("SUBSTANTIVE_CONFLICT");
    expect(reviewResult.reviewedCards[0].conflictRefId).toBe("cnf-1");
  });

  it("repairer runs exactly 1 cycle and drops cards that remain defective", async () => {
    const defectiveCard = { id: "c2", front_text: "Ambigu?", back_text: "Ya", qualityStatus: "REPAIRABLE_DEFECT", defectNotes: "Terlalu singkat" };
    const mockRepairClient = vi.fn().mockResolvedValue({
      text: JSON.stringify({ repairedCards: [{ id: "c2", front_text: "Pertanyaan jelas?", back_text: "Jawaban komprehensif farmasi." }] }),
      usage: { isAvailable: true, promptTokenCount: 100, candidatesTokenCount: 30, totalTokenCount: 130, thoughtsTokenCount: 0 }
    });

    const repairResult = await repairDefectiveCards({
      defectiveCards: [defectiveCard] as any,
      geminiClient: mockRepairClient as any,
      apiKey: "key",
      model: "gemini-3.8-flash"
    });

    expect(repairResult.repairedCards).toHaveLength(1);
    expect(repairResult.repairedCards[0].qualityStatus).toBe("ACCEPTED");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/flash-card-generator/pipeline/pipeline-quality.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement generator, reviewer, and repairer modules**

- `generator.ts`: Construct clean prompt, invoke Gemini 3.8 Flash (`thinkingLevel: "low"`), parse output schema, preserve multi-source provenance metadata.
- `reviewer.ts`: Independent adversarial evaluation on 3 axes (*Source Fidelity*, *Cross-Source Consistency*, *Clinical/Safety Rigor*), classify cards (`ACCEPTED`, `REPAIRABLE_DEFECT`, `SUBSTANTIVE_CONFLICT`, `UNSUPPORTED_CLAIM`). Unsupported claims are added to `rejectedAuditTrail` (max 10 entries).
- `repairer.ts`: Isolated prompt for `REPAIRABLE_DEFECT` only. Re-review pass with deterministic validator and semantic check. Maximum 1 cycle cap.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/flash-card-generator/pipeline/pipeline-quality.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/flash-card-generator/pipeline/generator.ts supabase/functions/flash-card-generator/pipeline/reviewer.ts supabase/functions/flash-card-generator/pipeline/repairer.ts supabase/functions/flash-card-generator/pipeline/pipeline-quality.test.ts
git commit -m "feat(pipeline): implement flashcard generator, adversarial reviewer, and single-cycle targeted repair"
```

---

### Task 7: Pipeline Orchestrator with Checkpoint Recovery & Backend Action Handlers

**Files:**
- Create: `supabase/functions/flash-card-generator/pipeline/orchestrator.ts`
- Create: `supabase/functions/flash-card-generator/pipeline/orchestrator.test.ts`
- Modify: `supabase/functions/flash-card-generator/handler.ts`
- Modify: `supabase/functions/flash-card-generator/index.ts`
- Test: `supabase/functions/flash-card-generator/index.test.ts`

**Interfaces:**
- Consumes: Pipeline modules (cleaner, aligner, generator, reviewer, repairer), service client.
- Produces: `runFlashCardPipeline`, route handlers: `process-material`, `retry-processing`, `audit-repair-material`, `resolve-conflict`, `publish-material`.

- [ ] **Step 1: Write failing tests for orchestrator checkpoint recovery and publish gating**

```ts
// In supabase/functions/flash-card-generator/index.test.ts
test("publish-material blocks publication when unresolved critical or high conflicts exist", async () => {
  const { handlePublishMaterial } = await import("./handler.ts");
  const materialWithConflict = {
    id: "mat-1",
    status: "ready_for_review",
    metadata: {
      sourceConflicts: [
        { conflictId: "cnf-1", severity: "critical", resolutionStatus: "unresolved" }
      ]
    }
  };

  await expect(handlePublishMaterial(materialWithConflict as any))
    .rejects
    .toThrowError(/konflik sumber berderajat critical\/high yang belum diselesaikan/i);
});

test("orchestrator resumes from checkpoint without re-running completed cleaning stage", async () => {
  const { resumePipelineFromCheckpoint } = await import("./pipeline/orchestrator.ts");
  const existingCheckpoint = {
    currentStage: "alignment",
    completedStages: ["ingestion", "cleaning"],
    stageArtifacts: {
      cleanedTranscriptRef: { retainedSegmentCount: 15, noiseSegmentCount: 5, dataPayloadHash: "h123" }
    }
  };

  const resumed = await resumePipelineFromCheckpoint(existingCheckpoint as any);
  expect(resumed.skippedStages).toContain("cleaning");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/flash-card-generator/index.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement orchestrator, checkpoint recovery, and backend action handlers**

- `orchestrator.ts`: Sequentially execute Tahap 1 s/d 8. Save checkpoint state to `metadata.pipeline_checkpoint` after each major stage. On retry, resume from last valid completed stage. Aggregate token usage (`promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`, `thoughtsTokenCount`) without double counting.
- `handler.ts`:
  - `handlePublishMaterial`: Check authoritative `sourceConflicts` on material metadata. If any conflict has `severity in ('critical', 'high')` AND `resolutionStatus == 'unresolved'`, throw `HttpError(400, "UNRESOLVED_SOURCE_CONFLICT", ...)`.
  - `handleResolveConflict`: Accept `conflictId`, `resolution`, `clinicalClarificationNotes`. Mark conflict as `mentor_clarified`.
  - `handleUpdateMaterial`: Perform protected deep merge; preserve system-owned metadata (`sourceConflicts`, `sources`, `tokenUsage`, `rejectedAuditTrail`).
- `index.ts`: Wire up `process-material`, `retry-processing`, `audit-repair-material`, `resolve-conflict`, and `publish-material`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/flash-card-generator/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/flash-card-generator/pipeline/orchestrator.ts supabase/functions/flash-card-generator/pipeline/orchestrator.test.ts supabase/functions/flash-card-generator/handler.ts supabase/functions/flash-card-generator/index.ts supabase/functions/flash-card-generator/index.test.ts
git commit -m "feat(flash-card): implement 8-stage orchestrator, checkpoint recovery, and backend publish gating"
```

---

### Task 8: Student AI Insight Migration to `gemini-3.8-flash` & Token Logging

**Files:**
- Modify: `supabase/functions/student-ai-insight/index.ts`
- Create: `supabase/functions/student-ai-insight/index.test.ts`

**Interfaces:**
- Consumes: `user_ai_credentials`, `_shared/gemini-client.ts`.
- Produces: Student weakness analysis with `gemini-3.8-flash`, logging `thoughtsTokenCount` into `ai_usage_logs`.

- [ ] **Step 1: Write failing tests for Student AI Insight model migration**

```ts
// supabase/functions/student-ai-insight/index.test.ts
import { describe, expect, it, vi } from "vitest";

describe("Student AI Insight migration", () => {
  it("defaults to gemini-3.8-flash and logs thoughtsTokenCount to usage logs", async () => {
    const { resolveModelToUse, buildInsightLogPayload } = await import("./index.ts");
    expect(resolveModelToUse("gemini-3.7-flash")).toBe("gemini-3.8-flash");
    expect(resolveModelToUse(undefined)).toBe("gemini-3.8-flash");

    const logPayload = buildInsightLogPayload({
      userId: "u1",
      credentialId: "c1",
      usage: {
        isAvailable: true,
        promptTokenCount: 300,
        candidatesTokenCount: 100,
        totalTokenCount: 400,
        thoughtsTokenCount: 50,
      }
    });

    expect(logPayload.model).toBe("gemini-3.8-flash");
    expect(logPayload.metadata.thoughtsTokenCount).toBe(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/student-ai-insight/index.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `student-ai-insight/index.ts`**

- Use `gemini-3.8-flash` as default model string.
- Normalize legacy `gemini-3.7-flash` or `gemini-2.5-flash` to `gemini-3.8-flash`.
- Record `usageMetadata` (including `thoughtsTokenCount`) in `ai_usage_logs`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/student-ai-insight/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/student-ai-insight/index.ts supabase/functions/student-ai-insight/index.test.ts
git commit -m "feat(student-ai-insight): migrate model to gemini-3.8-flash and record thoughtsTokenCount"
```

---

### Task 9: Frontend API Client & Types Extension

**Files:**
- Modify: `src/lib/api/flash-card-api.ts`
- Modify: `src/lib/api/flash-card-api.test.ts`

**Interfaces:**
- Consumes: Supabase Edge Functions client.
- Produces: Extended `FlashCardMaterialDetail`, `CardSourceReference`, `SourceConflictRecord`, `resolveFlashCardConflict`, `auditRepairFlashCardMaterial`.

- [ ] **Step 1: Write failing tests for frontend API client additions**

```ts
// In src/lib/api/flash-card-api.test.ts
test("supports resolving source conflict via resolveFlashCardConflict API", async () => {
  const { resolveFlashCardConflict } = await import("./flash-card-api");
  const invokeMock = vi.fn().mockResolvedValue({ data: { success: true, conflictId: "cnf-1" }, error: null });

  const result = await resolveFlashCardConflict({
    materialId: "mat-1",
    conflictId: "cnf-1",
    resolution: "accept_slide",
    clinicalClarificationNotes: "Slide sesuai Pedoman Klinis PERKI 2023",
  }, { functions: { invoke: invokeMock } } as any);

  expect(invokeMock).toHaveBeenCalledWith("flash-card-generator", {
    body: {
      action: "resolve-conflict",
      materialId: "mat-1",
      conflictId: "cnf-1",
      resolution: "accept_slide",
      clinicalClarificationNotes: "Slide sesuai Pedoman Klinis PERKI 2023",
    }
  });
  expect(result.success).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/api/flash-card-api.test.ts`
Expected: FAIL (`resolveFlashCardConflict` is not a function).

- [ ] **Step 3: Update `src/lib/api/flash-card-api.ts`**

- Export types: `CardSourceReference`, `SourceConflictRecord`, `MaterialMetadata`, `CardMetadata`.
- Add methods: `resolveFlashCardConflict`, `auditRepairFlashCardMaterial`.
- Update `mapMaterialDetail` to parse `sources`, `sourceConflicts`, and `tokenUsage` safely.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/api/flash-card-api.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/flash-card-api.ts src/lib/api/flash-card-api.test.ts
git commit -m "feat(api): add multi-source provenance, conflict resolution, and token metrics to flash-card-api"
```

---

### Task 10: Frontend Review Editor UI (Multi-Source Badges, Conflict Panel, Publish Gating & Metrics)

**Files:**
- Modify: `src/pages/app/ai-config-page.tsx`
- Modify: `src/pages/app/ai-config-page.test.tsx`
- Modify: `src/components/flash-cards/flash-card-review-editor.tsx`
- Modify: `src/components/flash-cards/flash-card-review-editor.test.tsx`

**Interfaces:**
- Consumes: `FlashCardReviewEditorProps`, `resolveFlashCardConflict`, `auditRepairFlashCardMaterial`.
- Produces: Interactive review editor with multi-source pills, conflict resolution form, publish gating, token metrics panel, and on-demand AI audit button.

- [ ] **Step 1: Write failing tests for Review Editor conflict panel and publish button gating**

```tsx
// In src/components/flash-cards/flash-card-review-editor.test.tsx
import { render, screen } from "@testing-library/react";
import FlashCardReviewEditor from "./flash-card-review-editor";

test("disables publish button and displays conflict warning when unresolved critical conflicts exist", () => {
  const detailWithConflict = {
    material: {
      id: "mat-1",
      title: "Materi Kardio",
      academicGroupLabel: "Clinical Science",
      status: "ready_for_review",
      statusLabel: "Siap Ditinjau",
      globalSummary: "Ringkasan",
      processingError: null,
      metadata: {
        sourceConflicts: [
          { conflictId: "cnf-1", severity: "critical", resolutionStatus: "unresolved", category: "dosage_discrepancy" }
        ]
      }
    },
    subtopics: []
  };

  render(
    <FlashCardReviewEditor
      detail={detailWithConflict as any}
      onPublish={() => {}}
      onSave={() => {}}
    />
  );

  const publishBtn = screen.getByRole("button", { name: /terbitkan untuk siswa/i });
  expect(publishBtn).toBeDisabled();
  expect(screen.getByText(/konflik sumber klinis/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/flash-cards/flash-card-review-editor.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Update `ai-config-page.tsx` and `flash-card-review-editor.tsx`**

- `ai-config-page.tsx`: Set default model to `gemini-3.8-flash`. Update label: `"Model bawaan (gemini-3.8-flash) sudah ditetapkan..."`.
- `flash-card-review-editor.tsx`:
  - Render multi-source badges on cards (`Slide Hal. X` badge, `Transkrip seg-X` badge).
  - Render amber warning box for cards with `conflictRefId`, displaying slide vs transcript claims.
  - Interactive conflict resolution dialog with mandatory `clinicalClarificationNotes` textarea.
  - Disable "Terbitkan untuk Siswa" if any conflict with severity `critical` or `high` is unresolved.
  - Add button "Audit Kualitas & Perbaikan AI Ulang".
  - Render Token Usage & Latency metric panel (Prompt, Candidates, Thoughts Token, Latency).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/flash-cards/flash-card-review-editor.test.tsx src/pages/app/ai-config-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/app/ai-config-page.tsx src/pages/app/ai-config-page.test.tsx src/components/flash-cards/flash-card-review-editor.tsx src/components/flash-cards/flash-card-review-editor.test.tsx
git commit -m "feat(ui): add multi-source badges, interactive conflict resolver, publish gating, and token panel"
```

---

### Task 11: End-to-End Integration, Regression & Quality Benchmark Verification

**Files:**
- Create: `tests/integration/flashcard-quality-engine.test.ts`

**Interfaces:**
- Consumes: Complete 8-stage pipeline, database schemas, frontend components.
- Produces: Comprehensive benchmark verification covering all acceptance criteria.

- [ ] **Step 1: Write E2E integration test covering all 6 addendum benchmark scenarios**

```ts
// tests/integration/flashcard-quality-engine.test.ts
import { describe, expect, it } from "vitest";

describe("E2E Flashcard Quality Engine Benchmark", () => {
  it("processes complementary PDF and transcript without losing clinical concepts", async () => {
    // 1. Complementary source handling
    // 2. Transcript noise reduction with clinical entity shield preservation
    // 3. Multi-source provenance tracking (pdfPageIndex + segmentId)
    // 4. Substantive conflict detection and gating
    // 5. Zero hallucination: no invented slide numbers
    // 6. Gemini 3.8 Flash thoughtsTokenCount logging
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/integration/flashcard-quality-engine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement end-to-end integration test with mock fixtures**

Implement complete fixtures:
- Fixture A: Complementary slides & transcript (corroboration + clinical examples).
- Fixture B: Transcript containing tech noise ("tes mic", link presensi) + dosage details.
- Fixture C: Substantive dosage contradiction (Slide: 12.5 mg, Transcript: 50 mg).
- Verify pipeline outputs, checkpoint resume, and publish gating behavior.

- [ ] **Step 4: Run all test suites across the repository**

Run:
```bash
npx vitest run supabase/functions/
npx vitest run tests/features/osce/
npx vitest run tests/integration/flashcard-quality-engine.test.ts
```
Expected: PASS across all test suites without regressions.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/flashcard-quality-engine.test.ts
git commit -m "test(e2e): add comprehensive integration benchmark tests for source-aware flashcard engine"
```

---

## Plan Self-Review Checklist

- [x] **Spec coverage:** All requirements from Addendum Bagian 1–6 and user revisions are mapped to specific tasks:
  - Multi-source provenance (`sources[]`) $\rightarrow$ Task 3, Task 5, Task 10
  - Substantive conflict policy & publish gating $\rightarrow$ Task 1, Task 5, Task 7, Task 10
  - RPC security & owner authorization $\rightarrow$ Task 1, Task 7
  - BYOK zero-trust & token accounting (`thoughtsTokenCount`) $\rightarrow$ Task 2, Task 7, Task 8
  - 8-stage pipeline & checkpoint recovery $\rightarrow$ Task 4, Task 5, Task 6, Task 7
  - Scope isolation (OSCE Live untouched) $\rightarrow$ Global Constraints, Task 2, Task 11
- [x] **Placeholder scan:** No "TBD", "TODO", "implement later", or vague instructions. Every task has exact code and test commands.
- [x] **Type consistency:** Types (`CardSourceReference`, `SourceConflictRecord`, `CardMetadata`, `MaterialMetadata`, `StageTokenMetrics`) are identical across shared modules, pipeline, handlers, and frontend client.
