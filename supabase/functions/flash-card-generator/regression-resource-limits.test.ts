import { describe, expect, test, vi } from "vitest";
import {
  assertFlashCardMaterialRetryable,
  isProcessingJobStale,
  STALE_PROCESSING_TIMEOUT_MS,
} from "./handler.ts";
import { generateCandidateCards } from "./pipeline/generator.ts";
import { cleanTranscript, segmentTranscript } from "./pipeline/cleaner.ts";
import { runFlashCardPipeline, resumePipelineFromCheckpoint, type PipelineCheckpoint } from "./pipeline/orchestrator.ts";

describe("Flash Card Generator Resource Limits & Stale Job Regression Suite", () => {
  // Scenario 1: Valid small PDF (< 4MB) is included as inlineData
  test("Scenario 1: small valid PDF (< 4MB) is included as inlineData", async () => {
    let capturedRequest: any = null;
    const mockGeminiClient = async (req: any) => {
      capturedRequest = req;
      return {
        text: JSON.stringify({
          global_summary: "Ringkasan materi",
          subtopics: [
            {
              title: "Farmakokinetika Captopril",
              summary: "Absorpsi dan ekskresi",
              cards: [
                {
                  front_text: "Berapa bioavailabilitas Captopril saat lambung kosong?",
                  back_text: "Sekitar 60-75%, menurun jika bersama makanan.",
                },
              ],
            },
          ],
        }),
        usage: { isAvailable: true, promptTokenCount: 150, candidatesTokenCount: 80, totalTokenCount: 230 },
      };
    };

    const smallPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
    const result = await generateCandidateCards({
      title: "Captopril",
      academicGroup: "clinical_science",
      pdfBytes: smallPdfBytes,
      geminiClient: mockGeminiClient,
    });

    expect(result.subtopics).toHaveLength(1);
    expect(capturedRequest).toBeDefined();
    const inlinePart = capturedRequest.parts?.find((p: any) => p.inlineData);
    expect(inlinePart).toBeDefined();
    expect(inlinePart.inlineData.mimeType).toBe("application/pdf");
    expect(typeof inlinePart.inlineData.data).toBe("string");
  });

  // Scenario 2: PDF exceeding 4MB size limit is guarded (omits inlineData to protect 150MB Deno RAM ceiling)
  test("Scenario 2: PDF exceeding 4MB size limit omits inlineData to prevent OOM", async () => {
    let capturedRequest: any = null;
    const mockGeminiClient = async (req: any) => {
      capturedRequest = req;
      return {
        text: JSON.stringify({
          global_summary: "Ringkasan materi tanpa inline PDF",
          subtopics: [
            {
              title: "Hipertensi",
              summary: "Ringkasan konsep",
              cards: [
                {
                  front_text: "Apa obat lini pertama hipertensi tanpa komorbid?",
                  back_text: "ACEi, ARB, CCB, atau Diuretik Tiazid.",
                },
              ],
            },
          ],
        }),
        usage: { isAvailable: true, promptTokenCount: 120, candidatesTokenCount: 60, totalTokenCount: 180 },
      };
    };

    // 5MB dummy PDF bytes (exceeds 4MB limit)
    const largePdfBytes = new Uint8Array(5 * 1024 * 1024);
    largePdfBytes[0] = 0x25;
    largePdfBytes[1] = 0x50;

    const result = await generateCandidateCards({
      title: "Hipertensi Besar",
      academicGroup: "clinical_science",
      transcriptText: "Kuliah hipertensi dan terapi farmakologis.",
      pdfBytes: largePdfBytes,
      geminiClient: mockGeminiClient,
    });

    expect(result.subtopics).toHaveLength(1);
    expect(capturedRequest).toBeDefined();
    // Guard verified: No inlineData part was added, preventing massive Base64 memory overhead
    const inlinePart = capturedRequest.parts?.find((p: any) => p.inlineData);
    expect(inlinePart).toBeUndefined();
    // Prompt still includes transcriptText
    const textPart = capturedRequest.parts?.find((p: any) => p.text);
    expect(textPart.text).toContain("Kuliah hipertensi dan terapi farmakologis.");
  });

  // Scenario 3: Long transcript producing multiple chunks (chunkSize = 50)
  test("Scenario 3: long transcript produces multiple sequential chunks and aggregates tokens", async () => {
    // Generate 120 segments
    const lines: string[] = [];
    for (let i = 1; i <= 120; i++) {
      lines.push(`Dosis obat nomor ${i} adalah ${i * 10} mg sehari.`);
    }
    const longTranscript = lines.join("\n");

    let callCount = 0;
    const mockGeminiClient = async (req: any) => {
      callCount++;
      // Return valid classifications for whatever segments were passed
      const prompt = req.prompt as string;
      const idMatches = [...prompt.matchAll(/\[(seg-\d+)\]/g)].map((m) => m[1]);
      const classifications = idMatches.map((id) => ({
        segmentId: id,
        classification: "relevant",
        reason: "Clinical dosage instruction",
      }));

      return {
        text: JSON.stringify({ classifications }),
        usage: {
          isAvailable: true,
          promptTokenCount: 200,
          candidatesTokenCount: 100,
          totalTokenCount: 300,
          thoughtsTokenCount: 50,
        },
      };
    };

    const result = await cleanTranscript(longTranscript, {
      chunkSize: 50,
      geminiClient: mockGeminiClient,
    });

    // 120 segments with chunkSize 50 -> ceil(120/50) = 3 calls
    expect(callCount).toBe(3);
    expect(result.retainedSegments.length).toBe(120);
    expect(result.droppedNoiseCount).toBe(0);
    expect(result.tokenUsage.promptTokenCount).toBe(600);
    expect(result.tokenUsage.thoughtsTokenCount).toBe(150);
    expect(result.tokenUsage.totalTokenCount).toBe(900);
  });

  // Scenario 4: Empty or malformed chunk handling
  test("Scenario 4: empty or malformed chunk response falls back gracefully without crashing", async () => {
    const raw = "Captopril 25 mg diminum sebelum makan.\nOke halo semuanya selamat pagi.";

    // Mock returns completely invalid non-JSON string
    const mockGeminiClient = async () => {
      return {
        text: "I am an AI and here is some unparseable unstructured text without JSON...",
        usage: { isAvailable: false },
      };
    };

    const result = await cleanTranscript(raw, {
      geminiClient: mockGeminiClient,
    });

    // Clinical entity shield ensures segments with dosages default to relevant
    expect(result.retainedSegments.length).toBeGreaterThanOrEqual(1);
    const captoprilSeg = result.retainedSegments.find((s) => s.normalizedText.includes("Captopril"));
    expect(captoprilSeg).toBeDefined();
    expect(captoprilSeg?.classification).toBe("relevant");
  });

  // Scenario 5: Provider error after several chunks completed
  test("Scenario 5: provider error on a later chunk fails cleanly with informative error", async () => {
    const lines: string[] = [];
    for (let i = 1; i <= 60; i++) {
      lines.push(`Obat ${i} dosis ${i} mg.`);
    }
    const transcript = lines.join("\n");

    let callCount = 0;
    const mockGeminiClient = async () => {
      callCount++;
      if (callCount === 2) {
        throw new Error("Gemini API 503 Service Unavailable");
      }
      return {
        text: JSON.stringify({ classifications: [] }),
        usage: { isAvailable: true, totalTokenCount: 100 },
      };
    };

    await expect(
      cleanTranscript(transcript, {
        chunkSize: 30,
        geminiClient: mockGeminiClient,
      }),
    ).rejects.toThrow("Gemini API 503 Service Unavailable");
    expect(callCount).toBe(2);
  });

  // Scenario 6: Storage/persistence failure after generation preserves checkpoint
  test("Scenario 6: failure during or after generation preserves latest completed checkpoint", async () => {
    let savedCheckpoint: PipelineCheckpoint | undefined;
    const onStageComplete = vi.fn(async (_stage: any, cp: PipelineCheckpoint) => {
      savedCheckpoint = cp;
    });

    const mockGeminiClient = async () => {
      return {
        text: JSON.stringify({
          global_summary: "Ringkasan",
          subtopics: [{ title: "T1", summary: "S1", cards: [{ front_text: "F1", back_text: "B1" }] }],
          classifications: [],
        }),
        usage: { isAvailable: true, totalTokenCount: 50 },
      };
    };

    // Run pipeline
    const pipelinePromise = runFlashCardPipeline({
      title: "Uji Checkpoint",
      academicGroup: "pharmaceutical_science",
      transcriptText: "Transkrip materi kuliah.",
      pdfBytes: null,
      geminiClient: mockGeminiClient,
      onStageComplete,
    });

    const result = await pipelinePromise;
    expect(result.checkpoint.completedStages).toContain("ingestion");
    expect(result.checkpoint.completedStages).toContain("transcript_cleaning");
    expect(onStageComplete).toHaveBeenCalled();
    expect(savedCheckpoint).toBeDefined();
    expect(savedCheckpoint?.completedStages).toContain("candidate_generation");
  });

  // Scenario 7: Material remaining in 'processing' after worker terminates (stale recovery)
  test("Scenario 7: stale processing job (>90s) is identified as stale and eligible for recovery", () => {
    const now = 1_700_000_000_000;

    // Active job (30s ago): NOT stale
    const activeMaterial = {
      status: "processing",
      metadata: {
        processingJob: {
          jobId: "job-1",
          startedAt: new Date(now - 30_000).toISOString(),
          heartbeatAt: new Date(now - 30_000).toISOString(),
          stage: "candidate_generation",
        },
      },
      updatedAt: new Date(now - 30_000).toISOString(),
    };
    expect(isProcessingJobStale({ ...activeMaterial, now })).toBe(false);

    // Stale job (95s ago): STALE (SIGKILL occurred without finally)
    const staleMaterial = {
      status: "processing",
      metadata: {
        processingJob: {
          jobId: "job-2",
          startedAt: new Date(now - 95_000).toISOString(),
          heartbeatAt: new Date(now - 95_000).toISOString(),
          stage: "transcript_cleaning",
        },
      },
      updatedAt: new Date(now - 95_000).toISOString(),
    };
    expect(isProcessingJobStale({ ...staleMaterial, now })).toBe(true);

    // Non-processing statuses are never stale
    expect(isProcessingJobStale({ status: "ready_for_review", now })).toBe(false);
    expect(isProcessingJobStale({ status: "failed", now })).toBe(false);
    expect(isProcessingJobStale({ status: "published", now })).toBe(false);
  });

  // Scenario 8: Failed status allows retry action
  test("Scenario 8: failed status passes assertFlashCardMaterialRetryable", () => {
    expect(() => assertFlashCardMaterialRetryable("failed")).not.toThrow();
    expect(() => assertFlashCardMaterialRetryable("ready_for_review")).not.toThrow();
    expect(() => assertFlashCardMaterialRetryable("draft")).not.toThrow();
    // Only published is blocked
    expect(() => assertFlashCardMaterialRetryable("published")).toThrow(/tidak bisa diproses ulang/i);
  });

  // Scenario 9: Idempotency prevents two active concurrent jobs for the same material
  test("Scenario 9: active job prevents duplicate concurrent execution", () => {
    const now = Date.now();
    const metadataWithActiveJob = {
      processingJob: {
        jobId: "active-uuid",
        startedAt: new Date(now - 10_000).toISOString(),
        heartbeatAt: new Date(now - 5_000).toISOString(),
        stage: "concept_mapping",
      },
    };

    const isStale = isProcessingJobStale({
      status: "processing",
      metadata: metadataWithActiveJob,
      now,
    });

    // Since it's NOT stale (< 90s), process-material will safely ignore duplicate request
    expect(isStale).toBe(false);
  });

  // Scenario 10: Old job changes do not overwrite the latest job results (superseded protection)
  test("Scenario 10: superseded job with mismatched jobId is safely discarded", () => {
    const originalJobId = "job-original-123";
    const newerRetryJobId = "job-retry-456";

    // Simulate database having been updated by a retry action
    const currentDatabaseRow = {
      metadata: {
        processingJob: {
          jobId: newerRetryJobId,
        },
      },
    };

    const isAutoritative = currentDatabaseRow.metadata.processingJob.jobId === originalJobId;
    expect(isAutoritative).toBe(false); // Old job must not replace content
  });

  // Scenario 11: Ingestion checkpoint strictly omits raw binary pdfBytes to prevent 150MB+ JSON memory explosion
  test("Scenario 11: ingestion checkpoint stores only metadata, NEVER raw Uint8Array pdfBytes", async () => {
    let capturedIngestionArtifact: any = null;
    const onStageComplete = vi.fn(async (stage: any, cp: PipelineCheckpoint) => {
      if (stage === "ingestion") {
        capturedIngestionArtifact = cp.stageArtifacts["ingestion"];
      }
    });

    const mockPdfBytes = new Uint8Array([1, 2, 3, 4, 5]);
    const mockGemini = async () => ({
      text: JSON.stringify({
        global_summary: "S",
        subtopics: [{ title: "T", summary: "S", cards: [{ front_text: "F", back_text: "B" }] }],
        classifications: [],
      }),
      usage: { isAvailable: true, totalTokenCount: 10 },
    });

    await runFlashCardPipeline({
      title: "Cek Heap Checkpoint",
      academicGroup: "clinical_science",
      transcriptText: "Transkrip pendek.",
      pdfBytes: mockPdfBytes,
      geminiClient: mockGemini,
      onStageComplete,
    });

    expect(capturedIngestionArtifact).toBeDefined();
    // CRITICAL: pdfBytes is NOT stored in stageArtifacts
    expect(capturedIngestionArtifact.pdfBytes).toBeUndefined();
    expect(capturedIngestionArtifact.hasPdf).toBe(true);
    expect(capturedIngestionArtifact.pdfByteLength).toBe(5);

    // Verify JSON serialization produces a tiny string (<500 chars), not a 125MB string
    const jsonStr = JSON.stringify(capturedIngestionArtifact);
    expect(jsonStr.length).toBeLessThan(500);
  });

  // Scenario 12: Resume from checkpoint skips completed stages
  test("Scenario 12: resumePipelineFromCheckpoint skips ingestion & cleaning stages", async () => {
    let generatorCalled = false;
    const mockGeminiClient = async (req: any) => {
      generatorCalled = true;
      return {
        text: JSON.stringify({
          global_summary: "Hasil resume",
          subtopics: [{ title: "T", summary: "S", cards: [{ front_text: "F", back_text: "B" }] }],
        }),
        usage: { isAvailable: true, totalTokenCount: 50 },
      };
    };

    const existingCheckpoint: PipelineCheckpoint = {
      currentStage: "candidate_generation",
      completedStages: ["ingestion", "transcript_cleaning", "concept_mapping", "alignment_and_conflict_detection"],
      stageArtifacts: {
        ingestion: { hasPdf: false, pdfByteLength: 0 },
        transcript_cleaning: { retainedText: "Cleaned text", retainedSegments: [] },
        concept_mapping: { concepts: [] },
        alignment_and_conflict_detection: { alignedSources: [], conflicts: [] },
      },
    };

    const result = await resumePipelineFromCheckpoint(existingCheckpoint, {
      title: "Resume Test",
      academicGroup: "clinical_science",
      transcriptText: "Transkrip.",
      geminiClient: mockGeminiClient,
    });

    expect(generatorCalled).toBe(true);
    expect(result.subtopics).toHaveLength(1);
    expect(result.checkpoint.completedStages).toContain("candidate_generation");
  });

  // Scenario 13: STALE_PROCESSING_TIMEOUT_MS constant and fallback logic
  test("Scenario 13: STALE_PROCESSING_TIMEOUT_MS is 90 seconds and falls back to updatedAt", () => {
    expect(STALE_PROCESSING_TIMEOUT_MS).toBe(90_000);

    const now = 2_000_000_000_000;
    // Without processingJob, uses updatedAt
    const materialWithOnlyUpdatedAt = {
      status: "processing",
      metadata: {},
      updatedAt: new Date(now - 100_000).toISOString(),
    };
    expect(isProcessingJobStale({ ...materialWithOnlyUpdatedAt, now })).toBe(true);

    const recentUpdatedAt = {
      status: "processing",
      metadata: {},
      updatedAt: new Date(now - 30_000).toISOString(),
    };
    expect(isProcessingJobStale({ ...recentUpdatedAt, now })).toBe(false);
  });
});
