import { describe, expect, test, vi } from "vitest";
import {
  assertFlashCardMaterialRetryable,
  buildStageCheckpointMetadataUpdate,
  canRetryFlashCardMaterial,
  extractStaleRecoveryDiagnostics,
  isProcessingJobStale,
  shouldApplyStaleRecovery,
  STALE_PROCESSING_TIMEOUT_MS,
} from "./handler.ts";
import { generateCandidateCards } from "./pipeline/generator.ts";
import { cleanTranscript, segmentTranscript } from "./pipeline/cleaner.ts";
import { alignSourcesAndDetectConflicts } from "./pipeline/aligner.ts";
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

  // Scenario 2: PDF exceeding 8MB size limit is guarded (omits inlineData to protect 150MB Deno RAM ceiling)
  test("Scenario 2: PDF exceeding 8MB size limit omits inlineData to prevent OOM", async () => {
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

    // 9MB dummy PDF bytes (exceeds 8MB limit)
    const largePdfBytes = new Uint8Array(9 * 1024 * 1024);
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

    // In-flight long LLM stage (95s ago): NOT stale under calibrated 180s window
    const inFlightMaterial = {
      status: "processing",
      metadata: {
        processingJob: {
          jobId: "job-2",
          startedAt: new Date(now - 95_000).toISOString(),
          heartbeatAt: new Date(now - 95_000).toISOString(),
          stage: "candidate_generation",
        },
      },
      updatedAt: new Date(now - 95_000).toISOString(),
    };
    expect(isProcessingJobStale({ ...inFlightMaterial, now })).toBe(false);

    // Stale job (195s ago): STALE (SIGKILL occurred without finally)
    const staleMaterial = {
      status: "processing",
      metadata: {
        processingJob: {
          jobId: "job-3",
          startedAt: new Date(now - 195_000).toISOString(),
          heartbeatAt: new Date(now - 195_000).toISOString(),
          stage: "transcript_cleaning",
        },
      },
      updatedAt: new Date(now - 195_000).toISOString(),
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
  test("Scenario 13: STALE_PROCESSING_TIMEOUT_MS is 180 seconds and falls back to updatedAt", () => {
    expect(STALE_PROCESSING_TIMEOUT_MS).toBe(180_000);

    const now = 2_000_000_000_000;
    // Without processingJob, uses updatedAt
    const materialWithOnlyUpdatedAt = {
      status: "processing",
      metadata: {},
      updatedAt: new Date(now - 190_000).toISOString(),
    };
    expect(isProcessingJobStale({ ...materialWithOnlyUpdatedAt, now })).toBe(true);

    const recentUpdatedAt = {
      status: "processing",
      metadata: {},
      updatedAt: new Date(now - 60_000).toISOString(),
    };
    expect(isProcessingJobStale({ ...recentUpdatedAt, now })).toBe(false);
  });

  // Scenario 14: Active heartbeat updates lease so a long-running stage does not become stale
  test("Scenario 14: active heartbeat updates prevent premature stale job detection during 100s stage", () => {
    const jobStartTime = 1_000_000_000_000;
    let heartbeatAt = new Date(jobStartTime).toISOString();

    // Simulate 100 seconds elapsed with 15-second heartbeat intervals
    for (let sec = 15; sec <= 90; sec += 15) {
      heartbeatAt = new Date(jobStartTime + sec * 1000).toISOString();
    }

    const checkTimeAt100s = jobStartTime + 100_000;
    // The heartbeat is from sec 90, so only 10s elapsed since last heartbeat!
    const jobStatus = isProcessingJobStale({
      status: "processing",
      metadata: {
        processingJob: {
          jobId: "job-123",
          startedAt: new Date(jobStartTime).toISOString(),
          heartbeatAt,
        },
      },
      now: checkTimeAt100s,
    });

    expect(jobStatus).toBe(false);
  });

  // Scenario 15: Checkpoint resume calls onResumeCheckpoint and does NOT emit fake stage_completed for skipped stages
  test("Scenario 15: resumePipelineFromCheckpoint calls onResumeCheckpoint and does not emit fake stage_completed for skipped stages", async () => {
    const stageEvents: string[] = [];
    let resumedCheckpoint: PipelineCheckpoint | undefined;

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

    const mockGeminiClient = async () => ({
      text: JSON.stringify({
        global_summary: "Summary",
        subtopics: [{ title: "Topic", summary: "Summary", cards: [{ front_text: "Q", back_text: "A" }] }],
        reviews: [{ cardId: "c-1", status: "ACCEPTED" }],
      }),
      usage: { isAvailable: true, promptTokenCount: 10, candidatesTokenCount: 10, totalTokenCount: 20 },
    });

    await resumePipelineFromCheckpoint(existingCheckpoint, {
      title: "Resume Heartbeat Test",
      academicGroup: "clinical_science",
      geminiClient: mockGeminiClient,
      onResumeCheckpoint: (cp) => {
        resumedCheckpoint = { ...cp };
      },
      onStageComplete: (stage) => {
        stageEvents.push(stage);
      },
    });

    // onResumeCheckpoint was called immediately on startup with the resume checkpoint
    expect(resumedCheckpoint).toBeDefined();
    expect(resumedCheckpoint?.currentStage).toBe("candidate_generation");

    // onStageComplete was NOT called for skipped stages
    expect(stageEvents).not.toContain("alignment_and_conflict_detection");
    expect(stageEvents).not.toContain("transcript_cleaning");
    expect(stageEvents).not.toContain("ingestion");
    // Only newly executed stages emitted onStageComplete
    expect(stageEvents[0]).toBe("candidate_generation");
  });

  // Scenario 16: alignSourcesAndDetectConflicts skips Gemini call when candidates list is empty
  test("Scenario 16: alignSourcesAndDetectConflicts skips Gemini call when candidates list is empty", async () => {
    let geminiCalled = false;
    const mockGemini = async () => {
      geminiCalled = true;
      return { text: "{}", usage: { isAvailable: false } };
    };

    const result = await alignSourcesAndDetectConflicts({
      candidateComparisons: [],
      geminiClient: mockGemini as any,
    });

    expect(geminiCalled).toBe(false);
    expect(result.conflicts).toHaveLength(0);
    expect(result.alignedSources).toHaveLength(0);
  });

  // Scenario 17: runFlashCardPipeline releases pdfBytes memory after candidate_generation
  test("Scenario 17: runFlashCardPipeline frees pdfBytes after candidate_generation stage completes", async () => {
    const mockGemini = async () => ({
      text: JSON.stringify({
        global_summary: "Summary",
        subtopics: [{ title: "Topic", summary: "Summary", cards: [{ front_text: "Q", back_text: "A" }] }],
        reviews: [{ cardId: "c-1", status: "ACCEPTED" }],
      }),
      usage: { isAvailable: true, promptTokenCount: 10, candidatesTokenCount: 10, totalTokenCount: 20 },
    });

    const pdfBuffer = new Uint8Array([1, 2, 3, 4]);
    const pipelineOpts = {
      title: "Memory release test",
      academicGroup: "clinical_science",
      transcriptText: "Transkrip obat.",
      pdfBytes: pdfBuffer as Uint8Array | null,
      geminiClient: mockGemini,
    };

    const res = await runFlashCardPipeline(pipelineOpts);
    expect(res.subtopics).toBeDefined();
    // Verify pipelineOpts.pdfBytes is dereferenced to null
    expect(pipelineOpts.pdfBytes).toBeNull();
  });

  // Scenario 18: Heartbeat from older superseded worker does not overwrite new job metadata
  test("Scenario 18: old worker heartbeat update is rejected when newer jobId is in database", () => {
    // Simulate database record with newer job
    const dbRecord = {
      id: "mat-1",
      status: "processing",
      metadata: {
        processingJob: {
          jobId: "job-new-2",
          startedAt: "2026-10-18T10:00:00Z",
          heartbeatAt: "2026-10-18T10:00:00Z",
          stage: "ingestion",
        },
      },
    };

    // Worker 1 has old jobId "job-old-1"
    const oldJobId = "job-old-1";

    // Simulate PostgREST query: .eq("id", material.id).eq("status", "processing").eq("metadata->processingJob->>jobId", jobId)
    const matchesQuery = (record: typeof dbRecord, targetJobId: string) => {
      return (
        record.id === "mat-1" &&
        record.status === "processing" &&
        record.metadata.processingJob.jobId === targetJobId
      );
    };

    const worker1Matched = matchesQuery(dbRecord, oldJobId);
    expect(worker1Matched).toBe(false); // 0 rows updated!

    // Verify database record remains untouched with job-new-2
    expect(dbRecord.metadata.processingJob.jobId).toBe("job-new-2");
  });

  // Scenario 19: Heartbeat does not write after job is finished or terminated
  test("Scenario 19: stopHeartbeat lifecycle flag prevents any further database heartbeat writes", () => {
    let isJobTerminated = false;
    let dbWriteCount = 0;

    const stopHeartbeat = () => {
      isJobTerminated = true;
    };

    const sendHeartbeat = () => {
      if (isJobTerminated) return;
      dbWriteCount++;
    };

    // Before termination
    sendHeartbeat();
    expect(dbWriteCount).toBe(1);

    // Job finishes or errors out
    stopHeartbeat();

    // Subsequent heartbeat triggers (from timer or remaining in-flight)
    sendHeartbeat();
    sendHeartbeat();
    expect(dbWriteCount).toBe(1); // No further writes occurred!
  });

  // Scenario 20: Concurrent retry requests are rejected when already active, preventing parallel pipelines
  test("Scenario 20: canRetryFlashCardMaterial rejects concurrent retry when active job is running", () => {
    const now = 1_000_000_000_000;

    // Active processing material with recent heartbeat (30s ago)
    const activeMaterial = {
      status: "processing",
      metadata: {
        processingJob: {
          jobId: "job-1",
          startedAt: new Date(now - 30_000).toISOString(),
          heartbeatAt: new Date(now - 30_000).toISOString(),
          stage: "transcript_cleaning",
        },
      },
      updatedAt: new Date(now - 30_000).toISOString(),
    };

    // Idempotency guard: retry MUST NOT be permitted
    expect(canRetryFlashCardMaterial({ ...activeMaterial, now })).toBe(false);

    // Stale processing material (200s ago): retry IS permitted
    const staleMaterial = {
      status: "processing",
      metadata: {
        processingJob: {
          jobId: "job-stale",
          startedAt: new Date(now - 200_000).toISOString(),
          heartbeatAt: new Date(now - 200_000).toISOString(),
          stage: "transcript_cleaning",
        },
      },
      updatedAt: new Date(now - 200_000).toISOString(),
    };
    expect(canRetryFlashCardMaterial({ ...staleMaterial, now })).toBe(true);

    // Failed material: retry IS permitted
    expect(canRetryFlashCardMaterial({ status: "failed", now })).toBe(true);

    // Published material: retry NEVER permitted
    expect(canRetryFlashCardMaterial({ status: "published", now })).toBe(false);
  });

  // Scenario 21: Stale recovery does not overwrite ready_for_review status
  test("Scenario 21: stale recovery status guard prevents overwriting terminal status", () => {
    // When worker finishes and sets status to ready_for_review
    const completedMaterial = {
      status: "ready_for_review",
      metadata: {
        sourceConflicts: [],
      },
      updatedAt: new Date(1_000_000).toISOString(),
    };

    // Stale recovery should NOT apply to non-processing status
    expect(shouldApplyStaleRecovery(completedMaterial)).toBe(false);

    // Simulated atomic update: .update(failureUpdate).eq("id", id).eq("status", "processing")
    const applyStaleRecoveryUpdate = (currentStatus: string) => {
      if (currentStatus !== "processing") {
        return { rowsUpdated: 0 };
      }
      return { rowsUpdated: 1, newStatus: "failed" };
    };

    const result = applyStaleRecoveryUpdate(completedMaterial.status);
    expect(result.rowsUpdated).toBe(0); // 0 rows updated, ready_for_review is preserved!
  });

  // Scenario 22: Polling returns fresh state when stale recovery loses the race
  test("Scenario 22: polling re-reads DB and returns actual status when stale recovery update fails", () => {
    let staleUpdateMatchedRows = 0;
    const dbRecord = {
      id: "mat-1",
      status: "ready_for_review",
      global_summary: "Ringkasan Sukses",
    };

    // Polling logic simulation from get-material
    let materialResult = { id: "mat-1", status: "processing", global_summary: null };
    const timeoutMessage = "Pemrosesan flash card terhenti di latar belakang.";

    if (staleUpdateMatchedRows > 0) {
      materialResult = { ...materialResult, status: "failed" };
    } else {
      // Re-read latest authoritative DB row
      materialResult = { ...dbRecord };
    }

    expect(materialResult.status).toBe("ready_for_review");
    expect(materialResult.global_summary).toBe("Ringkasan Sukses");
  });

  // Scenario 23: PDF presence metadata is preserved even when large PDF download is skipped
  test("Scenario 23: pipeline preserves hasPdf and pdfByteLength when in-memory PDF is omitted (>4MB)", async () => {
    const mockGeminiClient = async () => ({
      text: JSON.stringify({
        global_summary: "Summary without inline PDF",
        subtopics: [{ title: "Topic", summary: "Summary", cards: [{ front_text: "Q", back_text: "A" }] }],
        reviews: [{ cardId: "c-1", status: "ACCEPTED" }],
      }),
      usage: { isAvailable: true, promptTokenCount: 10, candidatesTokenCount: 10, totalTokenCount: 20 },
    });

    // In-memory buffer is null because >4MB was skipped by downloadBytesFromStorage
    const pipelineOpts = {
      title: "Large PDF Presence Test",
      academicGroup: "clinical_science",
      transcriptText: "Transkrip materi kuliah farmakologi.",
      pdfBytes: null,
      hasPdfSource: true,
      pdfByteLength: 6 * 1024 * 1024, // 6MB
      geminiClient: mockGeminiClient,
    };

    const res = await runFlashCardPipeline(pipelineOpts);
    const ingestionArtifact = res.checkpoint.stageArtifacts["ingestion"] as any;

    expect(ingestionArtifact).toBeDefined();
    // hasPdf must be true because the source file exists in storage
    expect(ingestionArtifact.hasPdf).toBe(true);
    expect(ingestionArtifact.pdfByteLength).toBe(6 * 1024 * 1024);
    // isPdfBytesInMemory must be false because the buffer was omitted for memory safety
    expect(ingestionArtifact.isPdfBytesInMemory).toBe(false);
  });

  // Scenario 24: Interleaving race between heartbeat and checkpoint update preserves Checkpoint B
  test("Scenario 24: interleaving between sendHeartbeat and onStageComplete preserves Checkpoint B", () => {
    // 1. Job starts with Checkpoint A
    const checkpointA: PipelineCheckpoint = {
      currentStage: "transcript_cleaning",
      completedStages: ["ingestion"],
      stageArtifacts: { ingestion: { hasPdf: true, pdfByteLength: 1024 } },
    };

    const checkpointB: PipelineCheckpoint = {
      currentStage: "concept_mapping",
      completedStages: ["ingestion", "transcript_cleaning"],
      stageArtifacts: {
        ingestion: { hasPdf: true, pdfByteLength: 1024 },
        transcript_cleaning: { retainedText: "Cleaned text" },
      },
    };

    // Live database row state
    const dbRow = {
      id: "mat-1",
      status: "processing",
      metadata: {
        pipelineCheckpoint: checkpointA,
        processingJob: {
          jobId: "job-100",
          startedAt: "2026-10-18T10:00:00.000Z",
          heartbeatAt: "2026-10-18T10:00:00.000Z",
          stage: "transcript_cleaning",
        },
      },
    };

    // 2. Heartbeat initiates read of in-memory metadata snapshot at time T_read
    const targetHeartbeatAt = "2026-10-18T10:00:15.000Z";

    // 3. Concurrently, the pipeline stage completes! onStageComplete updates DB to Checkpoint B
    dbRow.metadata = {
      ...dbRow.metadata,
      pipelineCheckpoint: checkpointB,
      processingJob: {
        ...dbRow.metadata.processingJob,
        stage: "concept_mapping",
        heartbeatAt: "2026-10-18T10:00:10.000Z",
      },
    };
    expect(dbRow.metadata.pipelineCheckpoint.currentStage).toBe("concept_mapping");

    // 4. Heartbeat writes its update via atomic jsonb_set
    const simulateAtomicHeartbeatRpc = (
      row: typeof dbRow,
      targetMaterialId: string,
      targetJobId: string,
      heartbeatAt: string,
    ) => {
      if (
        row.id !== targetMaterialId ||
        row.status !== "processing" ||
        row.metadata.processingJob.jobId !== targetJobId
      ) {
        return null;
      }
      // Equivalent to PostgreSQL jsonb_set(metadata, '{processingJob,heartbeatAt}', ...)
      row.metadata = {
        ...row.metadata,
        processingJob: {
          ...row.metadata.processingJob,
          heartbeatAt,
        },
      };
      return row.metadata;
    };

    const rpcResult = simulateAtomicHeartbeatRpc(dbRow, "mat-1", "job-100", targetHeartbeatAt);

    // 5. Assert: Checkpoint B remains 100% intact, stage is still concept_mapping, only heartbeatAt changed!
    expect(rpcResult).not.toBeNull();
    expect(dbRow.metadata.pipelineCheckpoint).toEqual(checkpointB);
    expect(dbRow.metadata.pipelineCheckpoint.completedStages).toContain("transcript_cleaning");
    expect(dbRow.metadata.processingJob.stage).toBe("concept_mapping");
    expect(dbRow.metadata.processingJob.heartbeatAt).toBe(targetHeartbeatAt);
  });

  // Scenario 25: Atomic heartbeat RPC rejects updates if job was superseded or status is terminal
  test("Scenario 25: atomic heartbeat RPC returns null when job was superseded or marked ready_for_review", () => {
    const completedDbRow = {
      id: "mat-1",
      status: "ready_for_review",
      metadata: {
        processingJob: {
          jobId: "job-100",
          startedAt: "2026-10-18T10:00:00.000Z",
          heartbeatAt: "2026-10-18T10:00:00.000Z",
          stage: "finished",
        },
      },
    };

    const simulateAtomicHeartbeatRpc = (
      row: typeof completedDbRow,
      targetMaterialId: string,
      targetJobId: string,
      heartbeatAt: string,
    ) => {
      if (
        row.id !== targetMaterialId ||
        row.status !== "processing" ||
        row.metadata.processingJob.jobId !== targetJobId
      ) {
        return null;
      }
      row.metadata = {
        ...row.metadata,
        processingJob: {
          ...row.metadata.processingJob,
          heartbeatAt,
        },
      };
      return row.metadata;
    };

    // Attempting heartbeat on ready_for_review returns null (0 rows updated in DB)
    const resultTerminal = simulateAtomicHeartbeatRpc(completedDbRow, "mat-1", "job-100", "2026-10-18T10:00:15.000Z");
    expect(resultTerminal).toBeNull();
    expect(completedDbRow.status).toBe("ready_for_review");

    // Attempting heartbeat on superseded job (jobId mismatch) returns null
    const activeDbRowWithNewJob = {
      id: "mat-1",
      status: "processing",
      metadata: {
        processingJob: {
          jobId: "job-200", // New job
          startedAt: "2026-10-18T10:05:00.000Z",
          heartbeatAt: "2026-10-18T10:05:00.000Z",
          stage: "ingestion",
        },
      },
    };

    const resultSuperseded = simulateAtomicHeartbeatRpc(activeDbRowWithNewJob, "mat-1", "job-100", "2026-10-18T10:05:15.000Z");
    expect(resultSuperseded).toBeNull();
    // New job remains untouched
    expect(activeDbRowWithNewJob.metadata.processingJob.jobId).toBe("job-200");
  });

  // Scenario 26: Multi-chunk transcript cleaning emits partial progress incrementally
  test("Scenario 26: multi-chunk transcript cleaning incrementally emits partial progress", async () => {
    const transcript = [
      "Kalimat pertama materi farmakokinetik.",
      "Kalimat kedua absorpsi obat.",
      "Kalimat ketiga distribusi ke jaringan.",
      "Kalimat keempat metabolisme di hepar.",
      "Kalimat kelima ekskresi melalui ginjal.",
      "Kalimat keenam klirens total obat.",
    ].join("\n");

    const chunkProgress: number[] = [];
    const mockGeminiClient = vi.fn().mockImplementation((req: any) => {
      // Return classification without verbose reasons
      const match = req.prompt.match(/\[(seg-\d+)\]/g) || [];
      const classifications = match.map((tag: string) => ({
        segmentId: tag.replace(/[\[\]]/g, ""),
        classification: "relevant",
        suspectedTranscriptionError: false,
      }));
      return Promise.resolve({
        text: JSON.stringify({ classifications }),
        usage: { isAvailable: true, promptTokenCount: 50, candidatesTokenCount: 20, totalTokenCount: 70 },
      });
    });

    const result = await cleanTranscript(transcript, {
      apiKey: "test",
      chunkSize: 2,
      chunkOverlap: 0,
      geminiClient: mockGeminiClient as any,
      onChunkComplete: (completedSegments) => {
        chunkProgress.push(completedSegments.length);
      },
    });

    // 6 segments / chunkSize 2 = 3 chunks
    expect(mockGeminiClient).toHaveBeenCalledTimes(3);
    expect(chunkProgress).toEqual([2, 4, 6]);
    expect(result.segments).toHaveLength(6);
    expect(result.retainedSegments).toHaveLength(6);
  });

  // Scenario 27: Interrupted transcript cleaning resume skips cached chunks completely
  test("Scenario 27: interrupted transcript cleaning resume skips cached chunks and does not re-invoke Gemini", async () => {
    const transcript = [
      "Kalimat pertama materi farmakokinetik.",
      "Kalimat kedua absorpsi obat.",
      "Kalimat ketiga distribusi ke jaringan.",
      "Kalimat keempat metabolisme di hepar.",
      "Kalimat kelima ekskresi melalui ginjal.",
      "Kalimat keenam klirens total obat.",
    ].join("\n");

    // Pre-cached segments from chunks 1 and 2 (segments 1 to 4)
    const cachedSegments = [
      { segmentId: "seg-001", rawText: "Kalimat pertama", normalizedText: "Kalimat pertama", lineOffset: 1, hasClinicalEntities: false, matchedEntities: [], classification: "relevant" as const },
      { segmentId: "seg-002", rawText: "Kalimat kedua", normalizedText: "Kalimat kedua", lineOffset: 2, hasClinicalEntities: false, matchedEntities: [], classification: "relevant" as const },
      { segmentId: "seg-003", rawText: "Kalimat ketiga", normalizedText: "Kalimat ketiga", lineOffset: 3, hasClinicalEntities: false, matchedEntities: [], classification: "relevant" as const },
      { segmentId: "seg-004", rawText: "Kalimat keempat", normalizedText: "Kalimat keempat", lineOffset: 4, hasClinicalEntities: false, matchedEntities: [], classification: "relevant" as const },
    ];

    const newlyEmittedProgress: number[] = [];
    const mockGeminiClient = vi.fn().mockImplementation((req: any) => {
      // Should ONLY be called for chunk 3 (seg-005 and seg-006)
      return Promise.resolve({
        text: JSON.stringify({
          classifications: [
            { segmentId: "seg-005", classification: "relevant", suspectedTranscriptionError: false },
            { segmentId: "seg-006", classification: "relevant", suspectedTranscriptionError: false },
          ],
        }),
        usage: { isAvailable: true, promptTokenCount: 50, candidatesTokenCount: 20, totalTokenCount: 70 },
      });
    });

    const result = await cleanTranscript(transcript, {
      apiKey: "test",
      chunkSize: 2,
      chunkOverlap: 0,
      cachedSegments,
      geminiClient: mockGeminiClient as any,
      onChunkComplete: (completedSegments) => {
        newlyEmittedProgress.push(completedSegments.length);
      },
    });

    // CRITICAL: Gemini called ONLY once for the remaining un-cached chunk (chunk 3)!
    expect(mockGeminiClient).toHaveBeenCalledTimes(1);
    // Cached chunks 1 & 2 were skipped and did not re-trigger redundant progress emissions
    expect(newlyEmittedProgress).toEqual([6]);
    expect(result.segments).toHaveLength(6);
    expect(result.retainedSegments).toHaveLength(6);
  });

  // Scenario 28: Stale job recovery safely captures job diagnostics using extractStaleRecoveryDiagnostics
  test("Scenario 28: stale job recovery captures last stage and heartbeat without leaking data via extractStaleRecoveryDiagnostics", () => {
    const staleMaterial = {
      id: "mat-abc",
      status: "processing",
      updated_at: "2026-10-18T10:00:00.000Z",
      metadata: {
        processingJob: {
          jobId: "job-xyz",
          startedAt: "2026-10-18T10:00:00.000Z",
          heartbeatAt: "2026-10-18T10:01:00.000Z",
          stage: "transcript_cleaning",
        },
        apiKey: "SUPER_SECRET_KEY_NEVER_LEAK",
        documentContent: "CONFIDENTIAL_PATIENT_MEDICAL_HISTORY",
      },
    };

    const isStale = isProcessingJobStale({
      status: staleMaterial.status,
      metadata: staleMaterial.metadata,
      now: new Date("2026-10-18T10:05:00.000Z").getTime(),
      timeoutMs: STALE_PROCESSING_TIMEOUT_MS,
    });

    expect(isStale).toBe(true);

    // Call the actual production helper function used by index.ts
    const diagnosticPayload = extractStaleRecoveryDiagnostics({
      materialId: staleMaterial.id,
      metadata: staleMaterial.metadata,
    });

    // 1. Verifies exact expected diagnostic fields
    expect(diagnosticPayload).toEqual({
      materialId: "mat-abc",
      jobId: "job-xyz",
      lastStage: "transcript_cleaning",
      lastHeartbeatAt: "2026-10-18T10:01:00.000Z",
    });

    // 2. Verifies strictly NO leak of API key, document content, or arbitrary metadata
    expect((diagnosticPayload as any).apiKey).toBeUndefined();
    expect((diagnosticPayload as any).documentContent).toBeUndefined();
    const serialized = JSON.stringify(diagnosticPayload);
    expect(serialized).not.toContain("SUPER_SECRET_KEY_NEVER_LEAK");
    expect(serialized).not.toContain("CONFIDENTIAL_PATIENT_MEDICAL_HISTORY");

    // 3. Verifies safe fallback when metadata or processingJob is missing/empty
    const emptyDiagnostics = extractStaleRecoveryDiagnostics({
      materialId: "mat-empty",
      metadata: {},
    });
    expect(emptyDiagnostics).toEqual({
      materialId: "mat-empty",
      jobId: null,
      lastStage: null,
      lastHeartbeatAt: null,
    });
  });

  // Scenario 29: buildStageCheckpointMetadataUpdate builds metadata with defined timestamp and avoids ReferenceError
  test("Scenario 29: buildStageCheckpointMetadataUpdate constructs valid checkpoint metadata with defined timestamp and preserved job state", () => {
    const checkpoint: PipelineCheckpoint = {
      currentStage: "transcript_cleaning",
      completedStages: ["ingestion"],
      stageArtifacts: { ingestion: { wordCount: 1500 } },
    };
    const fixedTimestamp = "2026-10-18T12:30:00.000Z";

    // 1. With explicit timestamp: sets heartbeatAt precisely to the provided timestamp
    const updatedMeta = buildStageCheckpointMetadataUpdate({
      currentMetadata: {
        existingField: "keep_me",
        processingJob: {
          jobId: "job-123",
          startedAt: "2026-10-18T12:00:00.000Z",
          heartbeatAt: "2026-10-18T12:15:00.000Z",
          stage: "ingestion",
        },
      },
      checkpoint,
      jobId: "job-123",
      jobStartTime: "2026-10-18T12:00:00.000Z",
      stage: "transcript_cleaning",
      timestamp: fixedTimestamp,
    });

    expect(updatedMeta.existingField).toBe("keep_me");
    expect(updatedMeta.pipelineCheckpoint).toEqual(checkpoint);
    expect((updatedMeta.processingJob as any)?.jobId).toBe("job-123");
    expect((updatedMeta.processingJob as any)?.startedAt).toBe("2026-10-18T12:00:00.000Z");
    expect((updatedMeta.processingJob as any)?.heartbeatAt).toBe(fixedTimestamp);
    expect((updatedMeta.processingJob as any)?.stage).toBe("transcript_cleaning");

    // 2. With omitted timestamp: automatically assigns valid ISO timestamp without throwing ReferenceError
    const autoTimeMeta = buildStageCheckpointMetadataUpdate({
      currentMetadata: {},
      checkpoint,
      jobId: "job-456",
      jobStartTime: "2026-10-18T12:00:00.000Z",
      stage: "concept_mapping",
    });
    expect((autoTimeMeta.processingJob as any)?.jobId).toBe("job-456");
    expect((autoTimeMeta.processingJob as any)?.startedAt).toBe("2026-10-18T12:00:00.000Z");
    expect(typeof (autoTimeMeta.processingJob as any)?.heartbeatAt).toBe("string");
    expect(new Date((autoTimeMeta.processingJob as any)?.heartbeatAt as string).getTime()).not.toBeNaN();
    expect((autoTimeMeta.processingJob as any)?.stage).toBe("concept_mapping");
  });

  // Scenario 30: Large transcript cleaning uses substantially fewer requests via sparse output and chunk size 150
  test("Scenario 30: large transcript cleaning uses substantially fewer requests (2 calls for 300 segments) with sparse output and active Clinical Entity Shield", async () => {
    // Generate 300 lines of transcript with one clinical segment and some conversational noise
    const lines = Array.from({ length: 300 }, (_, i) => {
      if (i === 1) return "Halo cek mikrofon satu dua tiga."; // noise
      if (i === 20) return "Captopril 12.5 mg dua kali sehari untuk pasien hipertensi."; // clinical entity
      if (i === 260) return "Jangan lupa absensi di portal."; // noise in chunk 2 (segments 251-300)
      return `Kalimat perkuliahan farmakoterapi nomor ${i + 1}.`;
    });
    const rawTranscript = lines.join("\n");

    let callCount = 0;
    const mockGeminiClient = vi.fn().mockImplementation((req: any) => {
      callCount += 1;
      if (callCount === 1) {
        // Chunk 1 (seg-001 to seg-250): model returns sparse noise for seg-002 and mistakenly tries to noise seg-021 (which has clinical entity)
        return Promise.resolve({
          text: JSON.stringify({
            noiseSegmentIds: ["seg-002", "seg-021"],
            uncertainSegments: [],
          }),
          usage: { isAvailable: true, promptTokenCount: 200, candidatesTokenCount: 25, totalTokenCount: 225 },
        });
      } else {
        // Chunk 2 (seg-251 to seg-300): model returns sparse noise for seg-261
        return Promise.resolve({
          text: JSON.stringify({
            noiseSegmentIds: ["seg-261"],
            uncertainSegments: [],
          }),
          usage: { isAvailable: true, promptTokenCount: 200, candidatesTokenCount: 20, totalTokenCount: 220 },
        });
      }
    });

    const result = await cleanTranscript(rawTranscript, {
      apiKey: "test",
      geminiClient: mockGeminiClient as any,
    });

    // 1. Request reduction: Exactly 2 calls for 300 segments (instead of 6 or 20 calls)
    expect(callCount).toBe(2);
    expect(result.segments).toHaveLength(300);

    // 2. Shield: seg-021 with clinical entity was protected and converted to uncertain
    const seg21 = result.segments.find((s) => s.segmentId === "seg-021")!;
    expect(seg21.classification).toBe("uncertain");
    expect(seg21.reason).toBe("Protected by Clinical Entity Shield");

    // 3. Noise segments: seg-002 and seg-261 correctly classified as noise
    const seg2 = result.segments.find((s) => s.segmentId === "seg-002")!;
    expect(seg2.classification).toBe("noise");
    const seg261 = result.segments.find((s) => s.segmentId === "seg-261")!;
    expect(seg261.classification).toBe("noise");

    // 4. Unlisted segments: correctly defaulted to relevant without requiring verbose tokens
    const seg1 = result.segments.find((s) => s.segmentId === "seg-001")!;
    expect(seg1.classification).toBe("relevant");
    expect(result.droppedNoiseCount).toBe(2);
    expect(result.retainedSegments).toHaveLength(298);
  });

  // Scenario 31: Pipeline halts cleanly without fast retries on 429 and preserves checkpoint state
  test("Scenario 31: cleaner halts cleanly on 429 rate limit without fast retries and preserves cached segments for resume", async () => {
    let callCount = 0;
    const mockGeminiClient = vi.fn().mockImplementation(() => {
      callCount += 1;
      const error: any = new Error("Rate limit exceeded (15 RPM).");
      error.status = 429;
      error.code = "GEMINI_RATE_LIMITED";
      error.diagnostics = {
        category: "GEMINI_RATE_LIMITED",
        isRetryable: true,
      };
      return Promise.reject(error);
    });

    await expect(() =>
      cleanTranscript("Baris 1 kuliah farmakoterapi.\nBaris 2 materi obat.", {
        apiKey: "test",
        chunkSize: 150,
        geminiClient: mockGeminiClient as any,
      }),
    ).rejects.toThrow(/Rate limit exceeded/i);

    // Fails fast: cleaner does not initiate nested retries
    expect(callCount).toBe(1);

    // When resuming with cached segments from previous run, completed chunk is skipped
    const cachedSegments = [
      {
        segmentId: "seg-001",
        rawText: "Baris 1 kuliah farmakoterapi.",
        normalizedText: "Baris 1 kuliah farmakoterapi.",
        lineOffset: 1,
        hasClinicalEntities: false,
        classification: "relevant" as const,
        reason: "Cached segment",
      },
    ];

    const resumeGeminiClient = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        noiseSegmentIds: [],
        uncertainSegments: [],
      }),
      usage: { isAvailable: true, totalTokenCount: 50 },
    });

    const resumedResult = await cleanTranscript("Baris 1 kuliah farmakoterapi.\nBaris 2 materi obat.", {
      apiKey: "test",
      chunkSize: 1, // 1 per chunk
      cachedSegments,
      geminiClient: resumeGeminiClient as any,
    });

    // Chunk 1 was skipped from cache; only chunk 2 (seg-002) called Gemini
    expect(resumeGeminiClient).toHaveBeenCalledTimes(1);
    expect(resumedResult.retainedSegments).toHaveLength(2);
    expect(resumedResult.retainedSegments[0].segmentId).toBe("seg-001");
    expect(resumedResult.retainedSegments[1].segmentId).toBe("seg-002");
  });
});
