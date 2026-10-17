import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  runFlashCardPipeline,
  type PipelineOptions,
} from "../../supabase/functions/flash-card-generator/pipeline/orchestrator.ts";
import {
  cleanTranscript,
  normalizeDeterministicTranscript,
  scanClinicalEntities,
} from "../../supabase/functions/flash-card-generator/pipeline/cleaner.ts";
import {
  alignSourcesAndDetectConflicts,
  buildSourceReferences,
  detectSourceConflicts,
} from "../../supabase/functions/flash-card-generator/pipeline/aligner.ts";
import { stripCitationTags } from "../../supabase/functions/flash-card-generator/pipeline/generator.ts";
import { repairDefectiveCards } from "../../supabase/functions/flash-card-generator/pipeline/repairer.ts";
import {
  assertFlashCardMaterialPublishable,
  handlePublishMaterial,
  handleResolveConflict,
} from "../../supabase/functions/flash-card-generator/handler.ts";
import {
  CardSourceReferenceSchema,
  validateMaterialMetadata,
} from "../../supabase/functions/_shared/flash-card.ts";
import type { GeminiRequest } from "../../supabase/functions/_shared/gemini-client.ts";
import { StationConfigSchema } from "../../src/features/osce/schemas/stationConfig.ts";

describe("E2E Flashcard Quality Engine Benchmark", () => {
  /**
   * Scenario 1: Complementary Source Integration
   * Combines a slide with core factual definitions and a transcript with clinical mechanism/hospital case study.
   * Verifies cards attach both slide (pdfPageIndex: 1) and transcript (segmentId: "seg-002"),
   * with compatible_elaboration and 0 conflicts.
   */
  it("Scenario 1: Complementary Source Integration - attaches both slide and transcript without conflicts", async () => {
    const mockGeminiClient = vi.fn().mockImplementation(async (req: GeminiRequest) => {
      // Cleaner stage
      if (req.prompt.includes("classify transcript segments")) {
        return {
          text: JSON.stringify({
            classifications: [
              {
                segmentId: "seg-002",
                classification: "relevant",
                reason: "Mekanisme klinis komplementer di rumah sakit",
                suspectedTranscriptionError: false,
              },
            ],
          }),
          usage: {
            isAvailable: true,
            promptTokenCount: 60,
            candidatesTokenCount: 25,
            totalTokenCount: 85,
            thoughtsTokenCount: 10,
          },
        };
      }

      // Generator stage
      if (req.prompt.includes("Susun subtopik komprehensif")) {
        return {
          text: JSON.stringify({
            global_summary: "Ringkasan Farmakoterapi Hipertensi dan ACE Inhibitor",
            subtopics: [
              {
                title: "Inhibitor Enzim Konversi Angiotensin",
                summary: "Konsep komprehensif mekanisme Captopril",
                cards: [
                  {
                    id: "c-captopril-01",
                    front_text: "[Slide 1] Bagaimana mekanisme aksi Captopril dalam vasodilatasi perifer?",
                    back_text: "Menghambat konversi Angiotensin I menjadi Angiotensin II pada endotel vaskular, menurunkan resistensi perifer. [seg-002]",
                    conceptId: "cpt-captopril",
                  },
                ],
              },
            ],
          }),
          usage: {
            isAvailable: true,
            promptTokenCount: 180,
            candidatesTokenCount: 70,
            totalTokenCount: 250,
            thoughtsTokenCount: 25,
          },
        };
      }

      // Reviewer stage
      if (req.prompt.includes("Auditor Medis dan Reviewer Adversarial")) {
        return {
          text: JSON.stringify({
            reviews: [
              {
                cardId: "c-captopril-01",
                status: "ACCEPTED",
              },
            ],
          }),
          usage: {
            isAvailable: true,
            promptTokenCount: 120,
            candidatesTokenCount: 30,
            totalTokenCount: 150,
            thoughtsTokenCount: 15,
          },
        };
      }

      return {
        text: "{}",
        usage: { isAvailable: false },
      };
    });

    const pipelineOptions: PipelineOptions = {
      title: "Farmakoterapi Hipertensi",
      academicGroup: "clinical_science",
      transcriptText: "Pengalaman klinis dan kasus di rumah sakit membuktikan mekanisme kerja Captopril adalah menghambat enzim ACE pada endotel vaskular secara efektif.",
      slides: [
        {
          pdfPageIndex: 1,
          printedSlideNumber: 1,
          textSummary: "Captopril adalah obat golongan ACE inhibitor lini pertama untuk terapi hipertensi.",
          keyTerms: ["Captopril", "ACE inhibitor", "hipertensi"],
        },
      ],
      candidateComparisons: [
        {
          conceptId: "cpt-captopril",
          conceptName: "Captopril",
          slideClaim: "Captopril adalah obat golongan ACE inhibitor lini pertama untuk terapi hipertensi.",
          slidePageIndex: 1,
          transcriptClaim: "Pengalaman klinis dan kasus di rumah sakit membuktikan mekanisme kerja Captopril adalah menghambat enzim ACE pada endotel vaskular secara efektif.",
          segmentId: "seg-002",
        },
      ],
      geminiClient: mockGeminiClient,
      apiKey: "test-benchmark-key",
      model: "gemini-3.8-flash",
    };

    const result = await runFlashCardPipeline(pipelineOptions);

    // 1. Pipeline successfully completed
    expect(result).toBeDefined();
    expect(result.subtopics).toHaveLength(1);
    expect(result.subtopics[0].cards).toHaveLength(1);

    // 2. Zero conflicts generated
    expect(result.metadata.sourceConflicts).toHaveLength(0);
    expect(result.metadata.qualityReport?.conflictsCount).toBe(0);
    expect(result.metadata.qualityReport?.unresolvedCriticalOrHighConflicts).toBe(0);
    expect(result.metadata.qualityReport?.acceptedCount).toBe(1);

    // 3. Card details and citation stripped
    const card = result.subtopics[0].cards[0];
    expect(card.frontText).toBe("Bagaimana mekanisme aksi Captopril dalam vasodilatasi perifer?");
    expect(card.backText).toBe("Menghambat konversi Angiotensin I menjadi Angiotensin II pada endotel vaskular, menurunkan resistensi perifer.");
    expect(card.frontText).not.toContain("[Slide 1]");
    expect(card.backText).not.toContain("[seg-002]");

    // 4. Multi-source references attach both slide (pdfPageIndex: 1) and transcript (segmentId: "seg-002")
    const sources = card.metadata?.sources ?? [];
    expect(sources).toHaveLength(2);

    const slideRef = sources.find((s) => s.sourceType === "slide_pdf");
    expect(slideRef).toBeDefined();
    expect(slideRef?.location.pdfPageIndex).toBe(1);
    expect(slideRef?.provenanceStatus).toBe("verified_exact");

    const transcriptRef = sources.find((s) => s.sourceType === "transcript");
    expect(transcriptRef).toBeDefined();
    expect(transcriptRef?.location.segmentId).toBe("seg-002");
    expect(transcriptRef?.provenanceStatus).toBe("verified_exact");

    // 5. Checkpoint stage artifacts confirm compatible_elaboration
    const alignmentArtifact = result.checkpoint.stageArtifacts["alignment_and_conflict_detection"] as any;
    expect(alignmentArtifact?.alignedSources).toHaveLength(1);
    expect(alignmentArtifact.alignedSources[0].alignmentType).toBe("compatible_elaboration");
  });

  /**
   * Scenario 2: Transcript Noise Filtering with Clinical Entity Shield
   * Transcript contains noise ("Halo cek suara satu dua", "Link absen ada di chat", "Oke kita mulai ya")
   * alongside clinical entities ("Captopril dosis awal 12.5 mg 2x sehari jangan berikan pada wanita hamil").
   * Verifies noise segments are filtered out, while clinical segments with dosage and negation are strictly protected.
   */
  it("Scenario 2: Transcript Noise Filtering with Clinical Entity Shield - removes noise while strictly protecting clinical entities", async () => {
    const rawTranscript = [
      "Halo cek suara satu dua, apakah suara saya terdengar jelas?",
      "Link absen ada di chat zoom ya rekan-rekan sekalian.",
      "Oke kita mulai ya materi kuliah farmakoterapi hari ini.",
      "Captopril dosis awal 12.5 mg 2x sehari jangan berikan pada wanita hamil.",
    ].join("\n");

    // Model aggressively misclassifies all segments as noise
    const mockGeminiClient = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        classifications: [
          { segmentId: "seg-001", classification: "noise", reason: "Audio mic check" },
          { segmentId: "seg-002", classification: "noise", reason: "Attendance chat link" },
          { segmentId: "seg-003", classification: "noise", reason: "Casual greeting" },
          { segmentId: "seg-004", classification: "noise", reason: "Erroneously flagged as banter by model" },
        ],
      }),
      usage: {
        isAvailable: true,
        promptTokenCount: 90,
        candidatesTokenCount: 40,
        totalTokenCount: 130,
        thoughtsTokenCount: 10,
      },
    });

    const cleanedResult = await cleanTranscript(rawTranscript, {
      apiKey: "test-key",
      model: "gemini-3.8-flash",
      geminiClient: mockGeminiClient as any,
    });

    // 1. Noise segments without clinical entities are dropped
    expect(cleanedResult.droppedNoiseCount).toBe(3);

    // 2. Clinical segment is protected by Clinical Entity Shield despite model's "noise" classification
    expect(cleanedResult.retainedSegments).toHaveLength(1);
    const retained = cleanedResult.retainedSegments[0];
    expect(retained.hasClinicalEntities).toBe(true);
    expect(retained.matchedEntities).toEqual(
      expect.arrayContaining(["Captopril", "12.5 mg", "2x sehari"]),
    );
    expect(retained.normalizedText).toContain("Captopril dosis awal 12.5 mg 2x sehari jangan berikan pada wanita hamil");

    // 3. Retained text excludes chat and audio noise completely
    expect(cleanedResult.retainedText).not.toContain("Halo cek suara");
    expect(cleanedResult.retainedText).not.toContain("Link absen");
    expect(cleanedResult.retainedText).not.toContain("Oke kita mulai");
    expect(cleanedResult.retainedText).toContain("12.5 mg 2x sehari jangan berikan pada wanita hamil");

    // 4. Deterministic normalization preserves negation and dosage integrity
    const scanned = scanClinicalEntities(retained.normalizedText);
    expect(scanned.hasClinicalEntities).toBe(true);
  });

  /**
   * Scenario 3: Zero-Hallucination Multi-Source Provenance
   * Verifies cards created by generator & aligner only reference real existing slide page numbers
   * and transcript segment IDs, with quotes capped and no fabricated page numbers.
   */
  it("Scenario 3: Zero-Hallucination Multi-Source Provenance - caps quotes and prevents fabricated slide pages", () => {
    // 1. Valid slide and transcript referencing
    const validReferences = buildSourceReferences({
      slideMatch: {
        pdfPageIndex: 1,
        printedSlideNumber: 1,
        quote: "Definisi hipertensi: TD sistolik >= 140 mmHg atau diastolik >= 90 mmHg.",
        confidence: "high",
        isExact: true,
      },
      transcriptMatch: {
        segmentId: "seg-002",
        quote: "Pengukuran tekanan darah harus diulang dua kali dalam rentang 5 menit.",
        confidence: "high",
        isExact: true,
      },
    });

    expect(validReferences).toHaveLength(2);
    expect(validReferences[0].location.pdfPageIndex).toBe(1);
    expect(validReferences[0].location.segmentId).toBeNull();
    expect(validReferences[0].provenanceStatus).toBe("verified_exact");
    expect(validReferences[1].location.pdfPageIndex).toBeNull();
    expect(validReferences[1].location.segmentId).toBe("seg-002");
    expect(validReferences[1].provenanceStatus).toBe("verified_exact");

    for (const ref of validReferences) {
      expect(() => CardSourceReferenceSchema.parse(ref)).not.toThrow();
    }

    // 2. Non-positive or invalid page numbers are rejected as unanchored (no fake slide 0 or negative index)
    const zeroPageReferences = buildSourceReferences({
      slideMatch: {
        pdfPageIndex: 0, // Invalid: should be positive integer
        quote: "Teks klaim tanpa nomor halaman valid.",
      },
    });
    expect(zeroPageReferences[0].location.pdfPageIndex).toBeNull();
    expect(zeroPageReferences[0].provenanceStatus).toBe("unanchored");

    // 3. Quotes are capped at 300 characters
    const longQuote = "Captopril 25 mg ".repeat(30); // 480 characters
    const cappedReferences = buildSourceReferences({
      slideMatch: {
        pdfPageIndex: 1,
        quote: longQuote,
      },
    });
    expect(cappedReferences[0].location.textQuote.length).toBeLessThanOrEqual(300);
    expect(cappedReferences[0].location.textQuote.length).toBe(300);

    // 4. Citation tags stripped cleanly
    const rawCardText = "[Slide 1] Apa dosis awal kaptopril? [seg-002] (Halaman 3)";
    const cleanText = stripCitationTags(rawCardText);
    expect(cleanText).toBe("Apa dosis awal kaptopril?");
    expect(cleanText).not.toMatch(/\[Slide/);
    expect(cleanText).not.toMatch(/\[seg/);
  });

  /**
   * Scenario 4: Substantive Conflict Detection & Publish Gating
   * Slide claims: "Dosis pemeliharaan Captopril 25 mg 2x sehari"
   * Spoken claim: "Dosis pemeliharaan 50 mg 2x sehari"
   * Verifies conflict detector flags substantive_contradiction with severity: "critical", category: "dosage_discrepancy", and resolutionStatus: "unresolved".
   * Verifies assertFlashCardMaterialPublishable / handlePublishMaterial blocks publication with UNRESOLVED_SOURCE_CONFLICT.
   * Verifies resolving conflict via handleResolveConflict unblocks publication.
   */
  it("Scenario 4: Substantive Conflict Detection & Publish Gating - blocks unverified contradictions and unblocks on resolution", () => {
    // 1. Conflict detection flags critical dosage discrepancy
    const conflictResult = alignSourcesAndDetectConflicts({
      slides: [
        {
          pdfPageIndex: 1,
          printedSlideNumber: 1,
          textSummary: "Dosis pemeliharaan Captopril 25 mg 2x sehari",
        },
      ],
      segments: [
        {
          segmentId: "seg-005",
          normalizedText: "Dosis pemeliharaan 50 mg 2x sehari",
          hasClinicalEntities: true,
        },
      ],
      candidateComparisons: [
        {
          conceptId: "cpt-captopril-dosage",
          conceptName: "Dosis Captopril",
          slideClaim: "Dosis pemeliharaan Captopril 25 mg 2x sehari",
          slidePageIndex: 1,
          transcriptClaim: "Dosis pemeliharaan 50 mg 2x sehari",
          segmentId: "seg-005",
        },
      ],
    });

    expect(conflictResult.conflicts).toHaveLength(1);
    const conflict = conflictResult.conflicts[0];
    expect(conflict.distinctionType).toBe("substantive_contradiction");
    expect(conflict.severity).toBe("critical");
    expect(conflict.category).toBe("dosage_discrepancy");
    expect(conflict.resolutionStatus).toBe("unresolved");
    expect(conflict.slideEvidence.pdfPageIndex).toBe(1);
    expect(conflict.slideEvidence.exactQuote).toBe("Dosis pemeliharaan Captopril 25 mg 2x sehari");
    expect(conflict.transcriptEvidence.segmentId).toBe("seg-005");
    expect(conflict.transcriptEvidence.exactQuote).toBe("Dosis pemeliharaan 50 mg 2x sehari");

    // 2. Publish gating blocks publication with unresolved critical conflict
    const materialWithConflict = {
      id: "mat-substantive-test",
      status: "ready_for_review",
      metadata: {
        pipelineVersion: "gemini-3.8-source-aware-v1",
        modelUsed: "gemini-3.8-flash",
        sourceConflicts: conflictResult.conflicts,
      },
    };

    expect(() => assertFlashCardMaterialPublishable(materialWithConflict as any)).toThrow(
      "Materi memiliki konflik sumber berderajat critical/high yang belum diselesaikan.",
    );
    expect(() => handlePublishMaterial(materialWithConflict as any)).toThrow(
      "Materi memiliki konflik sumber berderajat critical/high yang belum diselesaikan.",
    );

    // 3. Resolve conflict via handleResolveConflict
    const resolvedMetadata = handleResolveConflict(materialWithConflict as any, {
      conflictId: conflict.conflictId,
      resolutionStatus: "mentor_clarified",
      clinicalClarificationNotes: "Dosis 25 mg 2x sehari adalah dosis pemeliharaan standar. Dosis 50 mg adalah dosis maksimal.",
      resolvedBy: "mentor-dr-andi",
    });

    const materialResolved = {
      ...materialWithConflict,
      metadata: resolvedMetadata,
    };

    const resolvedConflict = materialResolved.metadata.sourceConflicts.find(
      (c: any) => c.conflictId === conflict.conflictId,
    );
    expect(resolvedConflict?.resolutionStatus).toBe("mentor_clarified");
    expect(resolvedConflict?.clinicalClarificationNotes).toContain("dosis pemeliharaan standar");
    expect(resolvedConflict?.resolvedBy).toBe("mentor-dr-andi");
    expect(resolvedConflict?.resolvedAt).toBeDefined();

    // 4. Publish gating now allows publication
    expect(() => assertFlashCardMaterialPublishable(materialResolved as any)).not.toThrow();
    const publishPayload = handlePublishMaterial(materialResolved as any);
    expect(publishPayload.status).toBe("published");
    expect(publishPayload.published_at).toBeDefined();
  });

  /**
   * Scenario 5: Single-Cycle Targeted Repair Hard Cap
   * Defective card with ambiguous text is submitted to repairer.
   * Verifies repairer runs exactly 1 repair pass, re-validates, and if defective text persists,
   * drops/flags the card without infinite looping or second LLM pass.
   */
  it("Scenario 5: Single-Cycle Targeted Repair Hard Cap - executes strictly 1 repair cycle and drops persistent defects", async () => {
    const defectiveCard = {
      id: "card-defect-ambiguous",
      front_text: "Obat hipertensi?",
      back_text: "Banyak.",
      conceptId: "cpt-ht-ambiguous",
      qualityStatus: "REPAIRABLE_DEFECT" as const,
      defectNotes: "Pertanyaan terlalu ambigu dan jawaban terlalu singkat tanpa konteks klinis.",
      sources: [],
    };

    // Mock repair client returns another invalid card (fails min word count / quality validation)
    const mockRepairClient = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        repairedCards: [
          {
            id: "card-defect-ambiguous",
            front_text: "A", // Invalid: 1 word
            back_text: "B",  // Invalid: 1 word
          },
        ],
      }),
      usage: {
        isAvailable: true,
        promptTokenCount: 75,
        candidatesTokenCount: 15,
        totalTokenCount: 90,
        thoughtsTokenCount: 5,
      },
    });

    const repairResult = await repairDefectiveCards({
      defectiveCards: [defectiveCard] as any,
      cards: [defectiveCard] as any,
      sourceContext: "Captopril 25 mg untuk hipertensi",
      geminiClient: mockRepairClient as any,
      apiKey: "test-repair-key",
      model: "gemini-3.8-flash",
    });

    // 1. Strictly 1 LLM repair cycle was invoked (hard cap, no 2nd pass)
    expect(mockRepairClient).toHaveBeenCalledTimes(1);

    // 2. Defective card that still failed validation is dropped
    expect(repairResult.repairedCards).toHaveLength(0);
    expect(repairResult.repairedCount).toBe(0);
    expect(repairResult.droppedCards).toHaveLength(1);
    expect(repairResult.droppedCount).toBe(1);
    expect(repairResult.droppedCards[0].id).toBe("card-defect-ambiguous");

    // 3. Overall allCards retains dropped card marked with defect
    const finalCard = repairResult.allCards.find((c) => c.id === "card-defect-ambiguous");
    expect(finalCard?.qualityStatus).toBe("REPAIRABLE_DEFECT");
  });

  /**
   * Scenario 6: Gemini 3.8 Flash Token Accounting with thoughtsTokenCount
   * Verifies orchestrator aggregates token metrics across stages, capturing thoughtsTokenCount
   * into material.metadata.tokenUsage without double counting.
   */
  it("Scenario 6: Gemini 3.8 Flash Token Accounting - captures thoughtsTokenCount without double counting", async () => {
    const mockGeminiClient = vi.fn().mockImplementation(async (req: GeminiRequest) => {
      // 1. Cleaner stage
      if (req.prompt.includes("classify transcript segments")) {
        return {
          text: JSON.stringify({
            classifications: [
              {
                segmentId: "seg-001",
                classification: "relevant",
                reason: "Valid clinical statement",
              },
            ],
          }),
          usage: {
            isAvailable: true,
            promptTokenCount: 110,
            candidatesTokenCount: 35,
            totalTokenCount: 145,
            thoughtsTokenCount: 18,
          },
        };
      }

      // 2. Generator stage
      if (req.prompt.includes("Susun subtopik komprehensif")) {
        return {
          text: JSON.stringify({
            global_summary: "Ringkasan Kardiovaskular",
            subtopics: [
              {
                title: "Antihipertensi",
                summary: "Ringkasan antihipertensi",
                cards: [
                  {
                    id: "c-token-1",
                    front_text: "Apa efek samping utama Captopril?",
                    back_text: "Batuk kering persisten akibat akumulasi bradikinin.",
                  },
                ],
              },
            ],
          }),
          usage: {
            isAvailable: true,
            promptTokenCount: 220,
            candidatesTokenCount: 65,
            totalTokenCount: 285,
            thoughtsTokenCount: 42,
          },
        };
      }

      // 3. Reviewer stage
      if (req.prompt.includes("Auditor Medis dan Reviewer Adversarial")) {
        return {
          text: JSON.stringify({
            reviews: [
              {
                cardId: "c-token-1",
                status: "ACCEPTED",
              },
            ],
          }),
          usage: {
            isAvailable: true,
            promptTokenCount: 160,
            candidatesTokenCount: 40,
            totalTokenCount: 200,
            thoughtsTokenCount: 24,
          },
        };
      }

      return {
        text: "{}",
        usage: { isAvailable: false },
      };
    });

    const result = await runFlashCardPipeline({
      title: "Uji Akuntansi Token Gemini 3.8 Flash",
      transcriptText: "Captopril menyebabkan batuk kering persisten akibat peningkatan kadar bradikinin.",
      geminiClient: mockGeminiClient,
      apiKey: "test-token-key",
      model: "gemini-3.8-flash",
    });

    const tokenUsage = result.metadata.tokenUsage;
    expect(tokenUsage).toBeDefined();

    // 1. Stage-level thoughtsTokenCount
    expect(tokenUsage?.transcript_cleaning?.thoughtsTokenCount).toBe(18);
    expect(tokenUsage?.generation?.thoughtsTokenCount).toBe(42);
    expect(tokenUsage?.review?.thoughtsTokenCount).toBe(24);

    // 2. Aggregated total token usage
    const total = tokenUsage?.total;
    expect(total).toBeDefined();
    expect(total?.isAvailable).toBe(true);

    // Sum prompt tokens: 110 + 220 + 160 = 490
    expect(total?.promptTokenCount).toBe(490);
    // Sum candidate tokens: 35 + 65 + 40 = 140
    expect(total?.candidatesTokenCount).toBe(140);
    // Sum total tokens: 145 + 285 + 200 = 630
    expect(total?.totalTokenCount).toBe(630);
    // Sum thoughts tokens: 18 + 42 + 24 = 84
    expect(total?.thoughtsTokenCount).toBe(84);

    // 3. Metadata validation
    expect(result.metadata.modelUsed).toBe("gemini-3.8-flash");
    expect(() => validateMaterialMetadata(result.metadata)).not.toThrow();
  });

  /**
   * Scenario 7: Scope Isolation & Non-Destructive Regression
   * Verifies Realtime OSCE Live components, schemas, and default model fallbacks remain untouched.
   */
  it("Scenario 7: Scope Isolation & Non-Destructive Regression - verifies Realtime OSCE Live schemas and components remain untouched", () => {
    // 1. StationConfigSchema validates standard communication station correctly
    const validOsceConfig = {
      id: "stase-osce-live-01",
      title: "Konseling Pasien Hipertensi Geriatri",
      type: "komunikasi",
      durationMinutes: 8,
      instructions: "Lakukan edukasi kepatuhan minum obat pada pasien.",
      aiPersona: {
        role: "patient",
        prompt: "Anda adalah pasien lansia dengan kekhawatiran efek samping batuk kaptopril.",
      },
      attachments: [
        {
          id: "resep-1",
          title: "Resep Captopril 25 mg",
          type: "image",
          url: "/resep-captopril.jpg",
        },
      ],
    };

    const parseResult = StationConfigSchema.safeParse(validOsceConfig);
    expect(parseResult.success).toBe(true);

    // 2. StationConfigSchema strictly rejects invalid configurations
    const invalidOsceConfig = { id: "stase-missing-fields" };
    const invalidResult = StationConfigSchema.safeParse(invalidOsceConfig);
    expect(invalidResult.success).toBe(false);

    // 3. Verify OsceEvaluator retains gemini-3.7-flash fallback for audio simulation stability
    const evaluatorPath = resolve(process.cwd(), "src/features/osce/components/OsceEvaluator.tsx");
    const evaluatorSource = readFileSync(evaluatorPath, "utf-8");
    expect(evaluatorSource).toContain('status.model || "gemini-3.7-flash"');
    // Ensure OSCE Live was not accidentally modified to use gemini-3.8-flash
    expect(evaluatorSource).not.toContain('"gemini-3.8-flash"');
  });
});
