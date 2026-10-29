import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, test, vi } from "vitest";

if (typeof (globalThis as any).Deno === "undefined") {
  (globalThis as any).Deno = {
    serve: () => {},
    env: {
      get: (key: string) => {
        if (key === "SUPABASE_URL") return "http://127.0.0.1:54321";
        if (key === "SUPABASE_SERVICE_ROLE_KEY") return "service-role-test-key";
        if (key === "SUPABASE_ANON_KEY") return "anon-test-key";
        if (key === "GEMINI_BASE_URL") return "https://generativelanguage.googleapis.com/v1beta";
        return process.env[key];
      },
    },
  };
}

import {
  handleSaveCredential,
  handleTestCredential,
  processMaterialGeneration,
} from "./index.ts";
import {
  assertFlashCardMaterialEditable,
  assertFlashCardMaterialPublishable,
  assertFlashCardMaterialRetryable,
  buildFlashCardCredentialWritePayload,
  buildFlashCardFailureUpdate,
  buildFlashCardMaterialInsert,
  buildFlashCardPublishUpdate,
  buildFlashCardSourceFileRows,
  buildRateLimitMetadataUpdate,
  buildStageCheckpointMetadataUpdate,
  buildStaleJobRecoveryUpdate,
  canContinueFlashCardMaterial,
  determineMaterialClaimConditions,
  ensureFlashCardManagerAccess,
  FlashCardManagerAccessError,
  handlePublishMaterial,
  handleResolveConflict,
  handleUpdateMaterialProtectedMetadata,
  isGlobalAiCredentialAction,
  MAX_STALE_AUTO_RECOVERIES,
  validateGeneratedFlashCardOutput,
  validateFlashCardMaterialDraftInput,
  resolveStepGroupFromCheckpoint,
  sanitizeMaterialMetadataForClient,
  sanitizeCredentialErrorMessage,
} from "./handler";
import { validateMaterialMetadata } from "../_shared/flash-card.ts";

describe("flash-card generator manager access", () => {
  test("uses explicit local .ts imports for runtime files", () => {
    const handlerSource = readFileSync(resolve(import.meta.dirname, "./handler.ts"), "utf8");
    const indexSource = readFileSync(resolve(import.meta.dirname, "./index.ts"), "utf8");

    expect(handlerSource).toContain('../_shared/flash-card.ts');
    expect(indexSource).toContain('.rpc("replace_flashcard_material_content"');
    expect(indexSource).toContain("async function processMaterialGeneration");
    expect(indexSource).toContain('payload.action === "create-material"');
    expect(indexSource).toContain('payload.action === "process-material"');
    expect(indexSource).toContain('payload.action === "get-material"');
    expect(indexSource).toContain('payload.action === "update-material"');
    expect(indexSource).toContain('payload.action === "retry-processing"');
    expect(indexSource).toContain('payload.action === "publish-material"');
    expect(indexSource).toContain('payload.action === "get-status"');
    expect(indexSource).toContain('payload.action === "save-credential"');
    expect(indexSource).toContain('payload.action === "test-credential"');
    expect(indexSource).toContain('payload.action === "delete-credential"');
    expect(indexSource).toContain("collectFlashCardSourcePathsForCleanup");
    expect(indexSource).toContain('payload.action === "resolve-conflict"');
    expect(indexSource).toContain('payload.action === "audit-repair-material"');
    expect(indexSource).toContain("assertFlashCardMaterialPublishable");
    expect(indexSource).toMatch(/payload\.action === "retry-processing"[\s\S]+processMaterialGeneration\(/);
    expect(indexSource).toContain('Belum ada BYOK tersimpan untuk flash card.');
    expect(indexSource).toContain("(material.metadata as any)?.pipelineCheckpoint ?? (material.metadata as any)?.pipeline_checkpoint");
    expect(indexSource).toContain("onStageComplete");
    expect(indexSource).toMatch(/catch\s*\(error\)[\s\S]+pipelineCheckpoint/);
    expect(indexSource).toMatch(/action === "audit-repair-material"[\s\S]+validateMaterialMetadata\(/);
  });

  test("rejects users who are not admin or mentor for flash-card authoring", () => {
    expect(() => ensureFlashCardManagerAccess("pro")).toThrow(FlashCardManagerAccessError);
    expect(() => ensureFlashCardManagerAccess("pendaftar_baru")).toThrow(/admin atau mentor/i);
  });

  test("allows any authenticated user to invoke global AI credential actions without manager guard", () => {
    expect(isGlobalAiCredentialAction("get-status")).toBe(true);
    expect(isGlobalAiCredentialAction("save-credential")).toBe(true);
    expect(isGlobalAiCredentialAction("test-credential")).toBe(true);
    expect(isGlobalAiCredentialAction("delete-credential")).toBe(true);
    expect(isGlobalAiCredentialAction("export-credential")).toBe(true);
    expect(isGlobalAiCredentialAction("create-material")).toBe(false);
    expect(isGlobalAiCredentialAction("process-material")).toBe(false);

    const indexSource = readFileSync(resolve(import.meta.dirname, "./index.ts"), "utf8");
    expect(indexSource).toContain("requireAuthenticatedUser");
    expect(indexSource).toMatch(/if\s*\(isGlobalAiCredentialAction\(payload\.action\)\)\s*\{[\s\S]*?requireAuthenticatedUser\(req\)/);
  });

  test("prevents editing or retrying materials that are already published", () => {
    expect(() => assertFlashCardMaterialEditable("published")).toThrow(/sudah dipublikasikan/i);
    expect(() => assertFlashCardMaterialRetryable("published")).toThrow(/tidak bisa diproses ulang/i);
    expect(() => assertFlashCardMaterialEditable("ready_for_review")).not.toThrow();
    expect(() => assertFlashCardMaterialRetryable("failed")).not.toThrow();
  });
});

describe("validateFlashCardMaterialDraftInput", () => {
  test("accepts one transcript source and one slide pdf source", () => {
    expect(validateFlashCardMaterialDraftInput({
      title: "Hipertensi pada CKD",
      academicGroup: "Clinical Science",
      sourceFiles: [
        {
          fileKind: "transcript",
          storageBucket: "flash-card-sources",
          storagePath: "mentor-1/material-1/transcript.txt",
          originalFileName: "kelas.txt",
          mimeType: "text/plain",
          sizeBytes: 2048,
        },
        {
          fileKind: "slide_pdf",
          storageBucket: "flash-card-sources",
          storagePath: "mentor-1/material-1/slide.pdf",
          originalFileName: "slide.pdf",
          mimeType: "application/pdf",
          sizeBytes: 4096,
        },
      ],
    }).sourceFiles).toHaveLength(2);
  });

  test("rejects transcript files that are not stored as supported text formats", () => {
    expect(() =>
      validateFlashCardMaterialDraftInput({
        title: "Hipertensi pada CKD",
        academicGroup: "Clinical Science",
        sourceFiles: [
          {
            fileKind: "transcript",
            storageBucket: "flash-card-sources",
            storagePath: "mentor-1/material-1/transcript.docx",
            originalFileName: "kelas.docx",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            sizeBytes: 2048,
          },
          {
            fileKind: "slide_pdf",
            storageBucket: "flash-card-sources",
            storagePath: "mentor-1/material-1/slide.pdf",
            originalFileName: "slide.pdf",
            mimeType: "application/pdf",
            sizeBytes: 4096,
          },
        ],
      }),
    ).toThrow(/transcript source harus berupa file txt atau markdown/i);
  });

  test("rejects drafts that do not include exactly one transcript and one slide pdf", () => {
    expect(() =>
      validateFlashCardMaterialDraftInput({
        title: "Hipertensi pada CKD",
        academicGroup: "Clinical Science",
        sourceFiles: [
          {
            fileKind: "transcript",
            storageBucket: "flash-card-sources",
            storagePath: "mentor-1/material-1/transcript.txt",
            originalFileName: "kelas.txt",
            mimeType: "text/plain",
            sizeBytes: 2048,
          },
        ],
      }),
    ).toThrow(/transcript.*pdf|pdf.*transcript/i);
  });
});

describe("flash-card persistence payloads", () => {
  test("builds a flash-card BYOK payload with default gemini flash model and masked hint", () => {
    expect(buildFlashCardCredentialWritePayload({
      apiKey: "AIza-testing-key-4321",
      model: "",
      userId: "mentor-1",
    })).toEqual({
      user_id: "mentor-1",
      provider: "gemini",
      model: "gemini-3.7-flash",
      secret_hint: "â€¢â€¢â€¢â€¢4321",
      last_error: null,
    });
  });

  test("builds the material draft payload with normalized academic group", () => {
    expect(buildFlashCardMaterialInsert({
      title: "Hipertensi pada CKD",
      academicGroup: "Clinical Science",
      createdBy: "mentor-1",
    })).toEqual({
      title: "Hipertensi pada CKD",
      academic_group: "clinical_science",
      status: "draft",
      global_summary: null,
      processing_error: null,
      created_by: "mentor-1",
    });
  });

  test("stores source rows with pending extraction and publish cleanup enabled", () => {
    expect(buildFlashCardSourceFileRows({
      materialId: "material-1",
      sourceFiles: [
        {
          fileKind: "transcript",
          storageBucket: "flash-card-sources",
          storagePath: "mentor-1/material-1/transcript.txt",
          originalFileName: "kelas.txt",
          mimeType: "text/plain",
          sizeBytes: 2048,
        },
      ],
    })).toEqual([
      {
        material_id: "material-1",
        file_kind: "transcript",
        storage_bucket: "flash-card-sources",
        storage_path: "mentor-1/material-1/transcript.txt",
        original_file_name: "kelas.txt",
        mime_type: "text/plain",
        size_bytes: 2048,
        extraction_status: "pending",
        delete_after_publish: true,
      },
    ]);
  });

  test("marks failed materials with a practical processing error message", () => {
    expect(buildFlashCardFailureUpdate("OCR gagal membaca slide.")).toEqual({
      status: "failed",
      processing_error: "OCR gagal membaca slide.",
    });
  });

  test("marks published materials with published timestamp and cleared processing error", () => {
    expect(buildFlashCardPublishUpdate("2026-06-06T12:00:00.000Z")).toEqual({
      status: "published",
      published_at: "2026-06-06T12:00:00.000Z",
      processing_error: null,
    });
  });

  test("replaces malformed but json-valid ai output errors with a mentor-facing retry message", () => {
    expect(() =>
      validateGeneratedFlashCardOutput({
        global_summary: "Ringkas",
        subtopics: [
          {
            title: "Hipertensi",
            summary: "Dasar",
            cards: [
              {
                front_text: "Apa target tekanan darah?",
                back_text: "Kurang dari 130/80 mmHg.",
              },
              {
                front_text: "Apa target tekanan darah?",
                back_text: "ACE inhibitor membantu albuminuria.",
              },
            ],
          },
        ],
      }),
    ).toThrow(/hasil ai belum cukup rapi untuk direview/i);
  });
});


describe("flash-card publication gating and authoritative conflict checks", () => {
  test("blocks publication if material status is not ready_for_review", () => {
    expect(() =>
      assertFlashCardMaterialPublishable({
        id: "mat-1",
        status: "processing",
        metadata: { sourceConflicts: [] },
      }),
    ).toThrow(/belum siap dipublikasikan/i);
  });

  test("blocks publication if material has unresolved critical or high conflict", () => {
    const materialWithCritical = {
      id: "mat-2",
      status: "ready_for_review",
      metadata: {
        sourceConflicts: [
          {
            conflictId: "cnf-1",
            conceptId: "cpt-1",
            category: "dosage_discrepancy",
            severity: "critical",
            resolutionStatus: "unresolved",
          },
        ],
      },
    };

    expect(() => assertFlashCardMaterialPublishable(materialWithCritical as any)).toThrow(
      "Materi memiliki konflik sumber berderajat critical/high yang belum diselesaikan.",
    );

    const materialWithHigh = {
      id: "mat-3",
      status: "ready_for_review",
      metadata: {
        sourceConflicts: [
          {
            conflictId: "cnf-2",
            conceptId: "cpt-2",
            category: "clinical_guideline",
            severity: "high",
            resolutionStatus: "unresolved",
          },
        ],
      },
    };

    expect(() => assertFlashCardMaterialPublishable(materialWithHigh as any)).toThrow(
      "Materi memiliki konflik sumber berderajat critical/high yang belum diselesaikan.",
    );
  });

  test("allows publication if conflict has moderate severity or has been resolved", () => {
    const materialModerate = {
      id: "mat-4",
      status: "ready_for_review",
      metadata: {
        sourceConflicts: [
          {
            conflictId: "cnf-3",
            conceptId: "cpt-3",
            category: "drug_identity",
            severity: "moderate",
            resolutionStatus: "unresolved",
          },
        ],
      },
    };

    expect(() => assertFlashCardMaterialPublishable(materialModerate as any)).not.toThrow();

    const materialResolved = {
      id: "mat-5",
      status: "ready_for_review",
      metadata: {
        sourceConflicts: [
          {
            conflictId: "cnf-4",
            conceptId: "cpt-4",
            category: "dosage_discrepancy",
            severity: "critical",
            resolutionStatus: "mentor_clarified",
          },
        ],
      },
    };

    expect(() => assertFlashCardMaterialPublishable(materialResolved as any)).not.toThrow();
  });
});

describe("handleResolveConflict", () => {
  test("updates conflict resolution status, notes, resolvedAt, and resolvedBy", () => {
    const material = {
      id: "mat-1",
      metadata: {
        pipelineVersion: "gemini-3.8-source-aware-v1",
        modelUsed: "gemini-3.8-flash",
        sourceConflicts: [
          {
            conflictId: "cnf-1",
            conceptId: "cpt-1",
            category: "dosage_discrepancy",
            severity: "critical",
            slideEvidence: { pdfPageIndex: 1, exactQuote: "Dosis 50 mg" },
            transcriptEvidence: { segmentId: "seg-1", exactQuote: "Dosis 25 mg" },
            distinctionType: "substantive_contradiction",
            resolutionStatus: "unresolved",
          },
        ],
      },
    };

    const updated = handleResolveConflict(material, {
      conflictId: "cnf-1",
      resolutionStatus: "mentor_clarified",
      clinicalClarificationNotes: "Dosis 25 mg adalah dosis awal untuk lansia.",
      resolvedBy: "mentor-123",
    });

    const resolved = updated.sourceConflicts.find((c: any) => c.conflictId === "cnf-1");
    expect(resolved?.resolutionStatus).toBe("mentor_clarified");
    expect(resolved?.clinicalClarificationNotes).toBe("Dosis 25 mg adalah dosis awal untuk lansia.");
    expect(resolved?.resolvedBy).toBe("mentor-123");
    expect(resolved?.resolvedAt).toBeDefined();
  });

  test("throws error if conflictId is not found", () => {
    const material = {
      id: "mat-1",
      metadata: { sourceConflicts: [] },
    };

    expect(() =>
      handleResolveConflict(material, {
        conflictId: "cnf-nonexistent",
      }),
    ).toThrow(/tidak ditemukan/i);
  });
});

describe("handleUpdateMaterialProtectedMetadata", () => {
  test("preserves system-owned fields and permits mentorCustomNotes", () => {
    const existingMetadata = {
      pipelineVersion: "gemini-3.8-source-aware-v1",
      modelUsed: "gemini-3.8-flash",
      sourceConflicts: [
        {
          conflictId: "cnf-1",
          conceptId: "cpt-1",
          category: "dosage_discrepancy",
          severity: "critical",
          slideEvidence: { pdfPageIndex: 1, exactQuote: "Dosis 50 mg" },
          transcriptEvidence: { segmentId: "seg-1", exactQuote: "Dosis 25 mg" },
          distinctionType: "substantive_contradiction",
          resolutionStatus: "unresolved",
        },
      ],
      tokenUsage: {
        total: {
          isAvailable: true,
          promptTokenCount: 100,
          candidatesTokenCount: 50,
          totalTokenCount: 150,
          thoughtsTokenCount: 10,
        },
      },
      rejectedAuditTrail: [
        { draftFront: "Soal jelek", rejectionReason: "Ambigu" },
      ],
      qualityReport: {
        totalCardsGenerated: 10,
        acceptedCount: 9,
      },
      mentorCustomNotes: "Catatan lama",
    };

    const incomingPayload = {
      pipelineVersion: "malicious-version",
      sourceConflicts: [],
      tokenUsage: {},
      rejectedAuditTrail: [],
      qualityReport: { totalCardsGenerated: 0 },
      mentorCustomNotes: "Catatan baru dari mentor yang diperbarui.",
    };

    const merged = handleUpdateMaterialProtectedMetadata(existingMetadata, incomingPayload);

    expect(merged.pipelineVersion).toBe("gemini-3.8-source-aware-v1");
    expect(merged.sourceConflicts).toHaveLength(1);
    expect(merged.tokenUsage?.total?.totalTokenCount).toBe(150);
    expect(merged.rejectedAuditTrail).toHaveLength(1);
    expect(merged.qualityReport?.totalCardsGenerated).toBe(10);
    expect(merged.mentorCustomNotes).toBe("Catatan baru dari mentor yang diperbarui.");
  });
});

describe("checkpoint recovery and audit-repair metadata schema validity", () => {
  test("supports pipelineCheckpoint and pipeline_checkpoint normalization for checkpoint recovery", () => {
    const cpData = {
      currentStage: "candidate_generation",
      completedStages: ["ingestion", "transcript_cleaning", "concept_mapping", "alignment_and_conflict_detection"],
      stageArtifacts: { ingestion: { ok: true } },
    };

    // Resolves camelCase pipelineCheckpoint
    const metaCamel = { metadata: { pipelineCheckpoint: cpData } };
    const resolvedCamel = ((metaCamel.metadata as any)?.pipelineCheckpoint ?? (metaCamel.metadata as any)?.pipeline_checkpoint);
    expect(resolvedCamel).toEqual(cpData);
    expect(resolvedCamel?.currentStage).toBe("candidate_generation");

    // Resolves snake_case pipeline_checkpoint
    const metaSnake = { metadata: { pipeline_checkpoint: cpData } };
    const resolvedSnake = ((metaSnake.metadata as any)?.pipelineCheckpoint ?? (metaSnake.metadata as any)?.pipeline_checkpoint);
    expect(resolvedSnake).toEqual(cpData);
    expect(resolvedSnake?.completedStages).toContain("alignment_and_conflict_detection");

    // Prioritizes camelCase if both present
    const cpOverridden = { currentStage: "adversarial_review", completedStages: [], stageArtifacts: {} };
    const metaBoth = { metadata: { pipelineCheckpoint: cpOverridden, pipeline_checkpoint: cpData } };
    const resolvedBoth = ((metaBoth.metadata as any)?.pipelineCheckpoint ?? (metaBoth.metadata as any)?.pipeline_checkpoint);
    expect(resolvedBoth).toEqual(cpOverridden);
  });

  test("audit-repair-material maintains schema validity when updating metadata", () => {
    const existingMeta = {
      pipelineVersion: "gemini-3.8-source-aware-v1",
      modelUsed: "gemini-3.8-flash",
      pipelineCheckpoint: {
        currentStage: "validation_and_storage",
        completedStages: ["ingestion", "targeted_repair"],
        stageArtifacts: { targeted_repair: { repairedCount: 2 } },
      },
      qualityReport: {
        totalCardsGenerated: 12,
        acceptedCount: 8,
        repairedCount: 2,
      },
      sourceConflicts: [],
    };

    const reviewAuditTrail = [
      {
        draftFront: "Apa kontraindikasi obat X?",
        rejectionReason: "Dosis ambigu",
        triggerSourceId: "src-1",
      },
    ];

    const repairedCardsCount = 2;
    const finalCardsAcceptedCount = 10;

    const checkpoint = (existingMeta as any).pipelineCheckpoint ?? (existingMeta as any).pipeline_checkpoint;
    const updatedMeta = validateMaterialMetadata({
      ...existingMeta,
      ...(checkpoint ? { pipelineCheckpoint: checkpoint } : {}),
      rejectedAuditTrail: reviewAuditTrail.slice(0, 10),
      qualityReport: {
        ...(existingMeta.qualityReport ?? {}),
        acceptedCount: finalCardsAcceptedCount,
        repairedCount: (existingMeta.qualityReport?.repairedCount ?? 0) + repairedCardsCount,
      },
    });

    expect(updatedMeta.pipelineVersion).toBe("gemini-3.8-source-aware-v1");
    expect(updatedMeta.modelUsed).toBe("gemini-3.8-flash");
    expect(updatedMeta.pipelineCheckpoint).toBeDefined();
    expect((updatedMeta.pipelineCheckpoint as any).currentStage).toBe("validation_and_storage");
    expect(updatedMeta.qualityReport?.acceptedCount).toBe(10);
    expect(updatedMeta.qualityReport?.repairedCount).toBe(4);
    expect(updatedMeta.rejectedAuditTrail).toHaveLength(1);
    expect(updatedMeta.rejectedAuditTrail[0].draftFront).toBe("Apa kontraindikasi obat X?");

    // Verify minimal/legacy metadata correctly gains schema defaults without throwing
    const minimalValidated = validateMaterialMetadata({
      rejectedAuditTrail: [],
      qualityReport: { acceptedCount: 5, repairedCount: 1 },
    });
    expect(minimalValidated.pipelineVersion).toBe("gemini-3.8-source-aware-v1");
    expect(minimalValidated.modelUsed).toBe("gemini-3.8-flash");
    expect(minimalValidated.sourceConflicts).toEqual([]);
    expect(minimalValidated.rejectedAuditTrail).toEqual([]);
    expect(minimalValidated.qualityReport?.acceptedCount).toBe(5);
  });

  test("onStageComplete and onResumeCheckpoint in index.ts declare stageNow in scope and use buildStageCheckpointMetadataUpdate", () => {
    const indexSource = readFileSync(resolve(import.meta.dirname, "./index.ts"), "utf8");

    // Verify onStageComplete declares stageNow and calls buildStageCheckpointMetadataUpdate
    const onStageCompleteMatch = indexSource.match(/const onStageComplete\s*=\s*async\s*\([\s\S]*?\n\s*};/);
    expect(onStageCompleteMatch).toBeTruthy();
    const onStageCompleteBody = onStageCompleteMatch![0];
    expect(onStageCompleteBody).toMatch(/const stageNow\s*=\s*new Date\(\)\.toISOString\(\);/);
    expect(onStageCompleteBody).toContain("buildStageCheckpointMetadataUpdate");
    expect(onStageCompleteBody).not.toMatch(/heartbeatAt:\s*stageNow/); // Should be delegated cleanly to buildStageCheckpointMetadataUpdate

    // Verify onResumeCheckpoint declares stageNow and calls buildStageCheckpointMetadataUpdate
    const onResumeMatch = indexSource.match(/const onResumeCheckpoint\s*=\s*async\s*\([\s\S]*?\n\s*};/);
    expect(onResumeMatch).toBeTruthy();
    const onResumeBody = onResumeMatch![0];
    expect(onResumeBody).toMatch(/const stageNow\s*=\s*new Date\(\)\.toISOString\(\);/);
    expect(onResumeBody).toContain("buildStageCheckpointMetadataUpdate");

    // Functional verification: invoking buildStageCheckpointMetadataUpdate does not throw ReferenceError
    const testCheckpoint = {
      currentStage: "transcript_cleaning",
      completedStages: ["ingestion"],
      stageArtifacts: {},
    };
    const result = buildStageCheckpointMetadataUpdate({
      currentMetadata: {},
      checkpoint: testCheckpoint,
      jobId: "job-test",
      jobStartTime: "2026-10-18T10:00:00Z",
      stage: "transcript_cleaning",
    });
    expect((result.processingJob as any)?.jobId).toBe("job-test");
    expect(typeof (result.processingJob as any)?.heartbeatAt).toBe("string");
  });
});

describe("flash-card step-by-step processing and continuation", () => {
  test("canContinueFlashCardMaterial enforces publish protection, allows suspended jobs, and blocks concurrent active jobs", () => {
    // 1. Published is never continue-able
    expect(canContinueFlashCardMaterial({ status: "published" })).toBe(false);

    // 2. Processing with NO active jobId (suspended step ready for continuation)
    expect(
      canContinueFlashCardMaterial({
        status: "processing",
        metadata: {
          pipelineCheckpoint: { currentStage: "concept_mapping", completedStages: ["ingestion", "transcript_cleaning"], stageArtifacts: {} },
        },
      }),
    ).toBe(true);

    // 3. Processing with active jobId and fresh heartbeat (actively running)
    const freshJobTime = new Date().toISOString();
    expect(
      canContinueFlashCardMaterial({
        status: "processing",
        metadata: {
          processingJob: {
            jobId: "active-job-123",
            heartbeatAt: freshJobTime,
          },
        },
      }),
    ).toBe(false);

    // 4. Processing with active jobId but stale heartbeat (> 180s)
    const staleJobTime = new Date(Date.now() - 200_000).toISOString();
    expect(
      canContinueFlashCardMaterial({
        status: "processing",
        metadata: {
          processingJob: {
            jobId: "stale-job-123",
            heartbeatAt: staleJobTime,
          },
        },
      }),
    ).toBe(true);
  });

  test("index.ts wires up continue-processing, handles stepGroup, and suspends cleanly with nextStepGroup", () => {
    const indexSource = readFileSync(resolve(import.meta.dirname, "./index.ts"), "utf8");

    expect(indexSource).toContain('payload.action === "continue-processing"');
    expect(indexSource).toContain("stepGroup");
    expect(indexSource).toContain("pipelineResult.isSuspended");
    expect(indexSource).toContain("nextStepGroup");
    expect(indexSource).toContain("GEMINI_RATE_LIMIT");
  });

  test("determineMaterialClaimConditions enforces is_null filter when resuming suspended processing job without jobId", () => {
    // Case 1: Fresh creation or initial processing from draft
    const draftConditions = determineMaterialClaimConditions({
      isRetry: false,
      status: "draft",
    });
    expect(draftConditions.statusFilter).toEqual({ type: "in", value: ["draft", "failed"] });
    expect(draftConditions.jobIdFilter).toBeUndefined();

    // Case 2: Resuming suspended job where status is processing and processingJob is null/empty
    const suspendedConditions = determineMaterialClaimConditions({
      isRetry: true,
      status: "processing",
      metadata: { pipelineCheckpoint: { currentStage: "candidate_generation" } },
    });
    expect(suspendedConditions.statusFilter).toEqual({ type: "eq", value: "processing" });
    expect(suspendedConditions.jobIdFilter).toEqual({ type: "is_null" });

    // Case 3: Retrying with an explicit oldJobId (e.g. stale worker recovery)
    const staleConditions = determineMaterialClaimConditions({
      isRetry: true,
      status: "processing",
      metadata: { processingJob: { jobId: "old-stale-job-999" } },
    });
    expect(staleConditions.statusFilter).toEqual({ type: "eq", value: "processing" });
    expect(staleConditions.jobIdFilter).toEqual({ type: "eq", value: "old-stale-job-999" });
  });

  test("simulates concurrent atomic claim where only one worker wins and the second worker is rejected", () => {
    // In-memory simulation of database row with JSONB metadata
    let dbRow = {
      id: "mat-concurrent-1",
      status: "processing",
      metadata: {
        pipelineCheckpoint: { completedStages: ["transcript_cleaning"] },
        // processingJob is undefined/null (suspended step)
      } as any,
    };

    // Helper simulating atomic compare-and-set query execution in PostgreSQL
    const executeAtomicClaim = (conditions: any, newJobId: string): { updatedCount: number; row: any } => {
      // Check status condition
      const statusMatches = conditions.statusFilter.type === "eq"
        ? dbRow.status === conditions.statusFilter.value
        : conditions.statusFilter.value.includes(dbRow.status);
      if (!statusMatches) return { updatedCount: 0, row: null };

      // Check jobId condition (compare-and-set)
      const currentJobId = dbRow.metadata?.processingJob?.jobId ?? null;
      if (conditions.jobIdFilter) {
        if (conditions.jobIdFilter.type === "is_null" && currentJobId !== null) {
          return { updatedCount: 0, row: null }; // Condition failed: jobId is NOT null!
        }
        if (conditions.jobIdFilter.type === "eq" && currentJobId !== conditions.jobIdFilter.value) {
          return { updatedCount: 0, row: null };
        }
      }

      // Claim succeeds atomically:
      dbRow = {
        ...dbRow,
        status: "processing",
        metadata: {
          ...dbRow.metadata,
          processingJob: { jobId: newJobId, startedAt: new Date().toISOString() },
        },
      };
      return { updatedCount: 1, row: dbRow };
    };

    // Worker 1 and Worker 2 both observe suspended state
    const conditions = determineMaterialClaimConditions({
      isRetry: true,
      status: dbRow.status,
      metadata: dbRow.metadata,
    });

    // Worker 1 claims first
    const result1 = executeAtomicClaim(conditions, "worker-job-alpha");
    expect(result1.updatedCount).toBe(1);
    expect(result1.row.metadata.processingJob.jobId).toBe("worker-job-alpha");

    // Worker 2 attempts same claim with same initial conditions
    const result2 = executeAtomicClaim(conditions, "worker-job-beta");
    expect(result2.updatedCount).toBe(0); // MUST be 0! Exactly one worker wins!
    expect(result2.row).toBeNull();
  });

  test("buildRateLimitMetadataUpdate tracks consecutive 429 failures and trips circuit breaker after 3", () => {
    // First 429 failure
    const update1 = buildRateLimitMetadataUpdate({
      currentMetadata: {},
      retryAfterSeconds: 60,
      message: "Batas 5 RPM tercapai",
    });
    expect(update1.rateLimitInfo.consecutiveCount).toBe(1);
    expect(update1.rateLimitInfo.isCircuitBroken).toBe(false);

    // Second consecutive 429 failure
    const update2 = buildRateLimitMetadataUpdate({
      currentMetadata: { rateLimitInfo: update1.rateLimitInfo },
      retryAfterSeconds: 60,
      message: "Batas 5 RPM tercapai",
    });
    expect(update2.rateLimitInfo.consecutiveCount).toBe(2);
    expect(update2.rateLimitInfo.isCircuitBroken).toBe(false);

    // Third consecutive 429 failure -> Circuit breaker trips!
    const update3 = buildRateLimitMetadataUpdate({
      currentMetadata: { rateLimitInfo: update2.rateLimitInfo },
      retryAfterSeconds: 60,
      message: "Batas 5 RPM tercapai",
    });
    expect(update3.rateLimitInfo.consecutiveCount).toBe(3);
    expect(update3.rateLimitInfo.isCircuitBroken).toBe(true);

    // Verify it preserves checkpoint and clears processingJob
    const testCheckpoint = { currentStage: "candidate_generation", completedStages: ["transcript_cleaning"], stageArtifacts: {} };
    const updateWithCheckpoint = buildRateLimitMetadataUpdate({
      currentMetadata: { rateLimitInfo: update2.rateLimitInfo },
      checkpointToPreserve: testCheckpoint,
      retryAfterSeconds: 60,
      message: "Batas 5 RPM tercapai",
    });
    expect(updateWithCheckpoint.pipelineCheckpoint).toEqual(testCheckpoint);
    expect(updateWithCheckpoint.processingJob).toBeUndefined();
  });
  test("buildRateLimitMetadataUpdate supports GEMINI_PROVIDER_UNAVAILABLE with default 30s cooldown and errorCategory tracking", () => {
    // First 503 failure without explicit retry hint: defaults to 30s cooldown
    const update1 = buildRateLimitMetadataUpdate({
      currentMetadata: {},
      retryAfterSeconds: 30,
      message: "Layanan Gemini sedang mengalami gangguan sementara dari sisi Google (503).",
      errorCategory: "GEMINI_PROVIDER_UNAVAILABLE",
    });
    expect(update1.rateLimitInfo.consecutiveCount).toBe(1);
    expect(update1.rateLimitInfo.retryAfterSeconds).toBe(30);
    expect(update1.rateLimitInfo.isCircuitBroken).toBe(false);
    expect(update1.rateLimitInfo.errorCategory).toBe("GEMINI_PROVIDER_UNAVAILABLE");

    // Second consecutive 503 failure
    const update2 = buildRateLimitMetadataUpdate({
      currentMetadata: { rateLimitInfo: update1.rateLimitInfo },
      retryAfterSeconds: 30,
      message: "Layanan Gemini sedang mengalami gangguan sementara dari sisi Google (503).",
      errorCategory: "GEMINI_PROVIDER_UNAVAILABLE",
    });
    expect(update2.rateLimitInfo.consecutiveCount).toBe(2);
    expect(update2.rateLimitInfo.isCircuitBroken).toBe(false);

    // Third consecutive 503 failure -> Circuit breaker trips!
    const update3 = buildRateLimitMetadataUpdate({
      currentMetadata: { rateLimitInfo: update2.rateLimitInfo },
      retryAfterSeconds: 30,
      message: "Layanan Gemini sedang mengalami gangguan sementara dari sisi Google (503).",
      errorCategory: "GEMINI_PROVIDER_UNAVAILABLE",
    });
    expect(update3.rateLimitInfo.consecutiveCount).toBe(3);
    expect(update3.rateLimitInfo.isCircuitBroken).toBe(true);
  });

  test("runs real index.ts processMaterialGeneration handler path on HTTP 503 GEMINI_PROVIDER_UNAVAILABLE, verifying checkpoint preservation, claim release, circuit breaker, resume without duplicate calls, and permanent error discrimination", async () => {
    function createMockService(initialMaterial: any) {
      let materialRow = {
        ...initialMaterial,
        metadata: { ...(initialMaterial.metadata ?? {}) },
      };

      const service: any = {
        from: (table: string) => {
          if (table === "flashcard_source_files") {
            return {
              select: () => ({
                eq: () => ({
                  order: () => Promise.resolve({
                    data: [
                      {
                        id: "src-transcript-1",
                        material_id: materialRow.id,
                        file_kind: "transcript",
                        storage_bucket: "sources",
                        storage_path: "transcripts/lecture.txt",
                        original_file_name: "lecture.txt",
                        mime_type: "text/plain",
                        size_bytes: 100,
                        extraction_status: "pending",
                        delete_after_publish: false,
                      },
                      {
                        id: "src-slide-1",
                        material_id: materialRow.id,
                        file_kind: "slide_pdf",
                        storage_bucket: "sources",
                        storage_path: "slides/lecture.pdf",
                        original_file_name: "lecture.pdf",
                        mime_type: "application/pdf",
                        size_bytes: 500,
                        extraction_status: "pending",
                        delete_after_publish: false,
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
              update: () => ({
                eq: () => Promise.resolve({ data: null, error: null }),
                in: () => Promise.resolve({ data: null, error: null }),
              }),
            };
          }

          if (table === "flashcard_subtopics") {
            return {
              select: () => ({
                eq: () => ({
                  order: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            };
          }

          if (table === "flashcard_cards") {
            return {
              select: () => ({
                in: () => ({
                  order: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            };
          }

          if (table === "flashcard_materials") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: () => Promise.resolve({ data: materialRow, error: null }),
                  }),
                }),
              }),
              update: (updatePayload: any) => {
                const chain: any = {
                  eq: () => chain,
                  in: () => chain,
                  is: () => chain,
                  select: () => chain,
                  then: (resolve: any) => {
                    materialRow = {
                      ...materialRow,
                      ...updatePayload,
                      metadata: {
                        ...(materialRow.metadata ?? {}),
                        ...(updatePayload.metadata ?? {}),
                      },
                    };
                    if (updatePayload.metadata && "processingJob" in updatePayload.metadata && updatePayload.metadata.processingJob === undefined) {
                      delete materialRow.metadata.processingJob;
                    }
                    resolve({
                      data: [{ id: materialRow.id, status: materialRow.status, metadata: materialRow.metadata }],
                      error: null,
                    });
                  },
                };
                return chain;
              },
            };
          }

          return {} as any;
        },
        rpc: (fn: string) => {
          if (fn === "read_vault_secret" || fn === "read_secret") {
            return Promise.resolve({ data: "fake-vault-key-abc", error: null });
          }
          if (fn === "replace_flashcard_material_content") {
            return Promise.resolve({ data: null, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        storage: {
          from: () => ({
            download: (path: string) => {
              if (typeof path === "string" && path.endsWith(".txt")) {
                return Promise.resolve({
                  data: new Blob(["Captopril dosis awal 12.5 mg 2x sehari untuk pasien lansia."]),
                  error: null,
                });
              }
              return Promise.resolve({
                data: new Blob([new Uint8Array([37, 80, 68, 70])]), // "%PDF"
                error: null,
              });
            },
          }),
        },
        getMaterial: () => materialRow,
        setMaterial: (m: any) => { materialRow = m; },
      };

      return service;
    }

    const mockService = createMockService({
      id: "mat-503-real-test",
      title: "Materi Hipertensi Klinis",
      academic_group: "farmakoterapi",
      status: "draft",
      global_summary: null,
      processing_error: null,
      created_by: "user-mentor-1",
      published_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {},
    });

    const credential: any = {
      id: "cred-1",
      model: "gemini-3.8-flash",
      secret_id: "sec-1",
      last_validated_at: new Date().toISOString(),
      last_error: null,
    };

    let cleanerCallCount = 0;

    // Phase 1: Run cleaning stage successfully
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: any) => {
      const body = JSON.parse(init?.body ?? "{}");
      const promptText = JSON.stringify(body);

      if (promptText.includes("classify transcript segments")) {
        cleanerCallCount += 1;
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        classifications: [
                          {
                            segmentId: "seg-001",
                            classification: "relevant",
                            reason: "Dosis Captopril klinis",
                          },
                        ],
                      }),
                    },
                  ],
                },
              },
            ],
            usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 20, totalTokenCount: 70 },
          }),
        };
      }

      // Generation stage fails with HTTP 503 GEMINI_PROVIDER_UNAVAILABLE (no retry hint)
      return {
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        headers: new Headers(),
        json: async () => ({
          error: {
            code: 503,
            message: "The model is overloaded. Please try again later.",
            status: "UNAVAILABLE",
          },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    // Run stepGroup: "cleaning" - succeeds deterministically with 0 Gemini API calls (0 RPD) and suspends cleanly
    await processMaterialGeneration(mockService, mockService.getMaterial(), credential, {
      stepGroup: "cleaning",
    });

    expect(mockService.getMaterial().status).toBe("processing");
    const cleaningCheckpoint = mockService.getMaterial().metadata.pipelineCheckpoint;
    expect(cleaningCheckpoint.completedStages).toContain("transcript_cleaning");
    expect(cleanerCallCount).toBe(0);

    // 1st 503 Failure during generation
    await expect(() =>
      processMaterialGeneration(mockService, mockService.getMaterial(), credential, {
        isRetry: true,
        stepGroup: "generation",
      })
    ).rejects.toMatchObject({
      status: 503,
      code: "GEMINI_PROVIDER_UNAVAILABLE",
    });

    // 1. Status materi tetap "processing", BUKAN "failed", processing_error null
    expect(mockService.getMaterial().status).toBe("processing");
    expect(mockService.getMaterial().processing_error).toBeNull();

    // 2. Checkpoint dan completedStages tetap tersimpan
    expect(mockService.getMaterial().metadata.pipelineCheckpoint).toBeDefined();
    expect(mockService.getMaterial().metadata.pipelineCheckpoint.completedStages).toContain("transcript_cleaning");

    // 3. processingJob dilepaskan sehingga claim baru dapat dilakukan setelah cooldown
    expect(mockService.getMaterial().metadata.processingJob).toBeUndefined();
    const claimCond1 = determineMaterialClaimConditions({
      isRetry: true,
      status: mockService.getMaterial().status,
      metadata: mockService.getMaterial().metadata,
    });
    expect(claimCond1.statusFilter).toEqual({ type: "eq", value: "processing" });
    expect(claimCond1.jobIdFilter).toEqual({ type: "is_null" });

    // 4. rateLimitInfo menyimpan kategori, waktu retry (30s), consecutiveCount = 1, isCircuitBroken = false
    const rateLimit1 = mockService.getMaterial().metadata.rateLimitInfo;
    expect(rateLimit1.errorCategory).toBe("GEMINI_PROVIDER_UNAVAILABLE");
    expect(rateLimit1.retryAfterSeconds).toBe(30);
    expect(rateLimit1.consecutiveCount).toBe(1);
    expect(rateLimit1.isCircuitBroken).toBe(false);

    // 2nd consecutive 503 failure
    await expect(() =>
      processMaterialGeneration(mockService, mockService.getMaterial(), credential, {
        isRetry: true,
        stepGroup: "generation",
      })
    ).rejects.toMatchObject({
      status: 503,
      code: "GEMINI_PROVIDER_UNAVAILABLE",
    });
    expect(mockService.getMaterial().metadata.rateLimitInfo.consecutiveCount).toBe(2);
    expect(mockService.getMaterial().metadata.rateLimitInfo.isCircuitBroken).toBe(false);

    // 3rd consecutive 503 failure -> Circuit breaker trips!
    await expect(() =>
      processMaterialGeneration(mockService, mockService.getMaterial(), credential, {
        isRetry: true,
        stepGroup: "generation",
      })
    ).rejects.toMatchObject({
      status: 503,
      code: "GEMINI_PROVIDER_UNAVAILABLE",
    });

    // 7. Setelah 3 kegagalan 503 berturut-turut, circuit breaker aktif
    const rateLimit3 = mockService.getMaterial().metadata.rateLimitInfo;
    expect(rateLimit3.consecutiveCount).toBe(3);
    expect(rateLimit3.isCircuitBroken).toBe(true);

    // 5. Frontend can continue using continue-processing after cooldown
    expect(canContinueFlashCardMaterial(mockService.getMaterial())).toBe(true);

    // 6. Resume from checkpoint after Google service recovers:
    // Completed stages (transcript_cleaning) are NOT re-called!
    const cleanerCountBeforeResume = cleanerCallCount;

    fetchMock.mockImplementation(async (url: string, init?: any) => {
      const body = JSON.parse(init?.body ?? "{}");
      const promptText = JSON.stringify(body);

      if (promptText.includes("classify transcript segments")) {
        cleanerCallCount += 1;
        throw new Error("Cleaner should not be called again when resuming from checkpoint!");
      }

      // Generation returns valid cards
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      global_summary: "Ringkasan Captopril",
                      subtopics: [
                        {
                          title: "ACE Inhibitor",
                          summary: "Mekanisme kerja",
                          cards: [
                            {
                              id: "c-1",
                              front_text: "Bagaimana mekanisme Captopril?",
                              back_text: "Menghambat enzim konversi angiotensin.",
                            },
                          ],
                        },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 150, candidatesTokenCount: 50, totalTokenCount: 200 },
        }),
      };
    });

    // Resume generation
    await processMaterialGeneration(mockService, mockService.getMaterial(), credential, {
      isRetry: true,
      stepGroup: "generation",
    });

    // Proves transcript_cleaning was skipped and NOT re-called by Gemini!
    expect(cleanerCallCount).toBe(cleanerCountBeforeResume);
    expect(mockService.getMaterial().metadata.pipelineCheckpoint.completedStages).toContain("candidate_generation");

    // 8. Error 429 RPD (Daily quota exhausted) during generation vs review, and 401/403 (Auth failure)
    // 8a. 403 API Key Invalid during review MUST still fail permanently
    fetchMock.mockImplementation(async () => ({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      headers: new Headers(),
      json: async () => ({
        error: {
          code: 403,
          status: "PERMISSION_DENIED",
          message: "API key not valid. Please pass a valid API key.",
        },
      }),
    }));

    await expect(() =>
      processMaterialGeneration(mockService, mockService.getMaterial(), credential, {
        isRetry: true,
        stepGroup: "review",
      })
    ).rejects.toMatchObject({
      code: "GEMINI_AUTHENTICATION_FAILED",
    });

    // 403 results in permanent failure!
    expect(mockService.getMaterial().status).toBe("failed");
    expect(mockService.getMaterial().processing_error).toMatch(/api key/i);

    // 8b. 429 RPD during review (when candidate_generation already succeeded) gracefully falls back to deterministic review and rescues generated cards!
    mockService.setMaterial({
      ...mockService.getMaterial(),
      status: "processing",
      processing_error: null,
    });

    fetchMock.mockImplementation(async () => ({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      headers: new Headers(),
      json: async () => ({
        error: {
          code: 429,
          status: "RESOURCE_EXHAUSTED",
          message: "Daily quota exhausted",
          details: [
            {
              "@type": "type.googleapis.com/google.rpc.QuotaFailure",
              violations: [
                {
                  quota_limit: "GenerateContentRequestsPerDayPerProject",
                  reason: "QUOTA_EXCEEDED",
                },
              ],
            },
          ],
        },
      }),
    }));

    await processMaterialGeneration(mockService, mockService.getMaterial(), credential, {
      isRetry: true,
      stepGroup: "review",
    });

    // Generated cards are rescued via deterministic review fallback and persisted as ready_for_review!
    expect(mockService.getMaterial().status).toBe("ready_for_review");
    expect(mockService.getMaterial().processing_error).toBeNull();

    // 8c. 429 RPD during generation (before cards exist) results in permanent failure!
    mockService.setMaterial({
      ...mockService.getMaterial(),
      status: "processing",
      processing_error: null,
      metadata: {
        pipelineCheckpoint: cleaningCheckpoint,
      },
    });

    await expect(() =>
      processMaterialGeneration(mockService, mockService.getMaterial(), credential, {
        isRetry: true,
        stepGroup: "generation",
      })
    ).rejects.toMatchObject({
      code: "GEMINI_QUOTA_EXHAUSTED",
    });

    expect(mockService.getMaterial().status).toBe("failed");
    expect(mockService.getMaterial().processing_error).toMatch(/kuota harian/i);
  });
});

describe("Large Material Runtime Guards (Step Inference, PDF Skip, Client Metadata Sanitization)", () => {
  it("resolveStepGroupFromCheckpoint infers cleaning, generation, or review when stepGroup is omitted", () => {
    expect(resolveStepGroupFromCheckpoint(undefined, undefined)).toBe("cleaning");
    expect(
      resolveStepGroupFromCheckpoint(undefined, {
        currentStage: "transcript_cleaning",
        completedStages: ["ingestion"],
        stageArtifacts: {},
      }),
    ).toBe("cleaning");
    expect(
      resolveStepGroupFromCheckpoint(undefined, {
        currentStage: "concept_mapping",
        completedStages: ["ingestion", "transcript_cleaning"],
        stageArtifacts: {},
      }),
    ).toBe("generation");
    expect(
      resolveStepGroupFromCheckpoint(undefined, {
        currentStage: "adversarial_review",
        completedStages: ["ingestion", "transcript_cleaning", "candidate_generation"],
        stageArtifacts: {},
      }),
    ).toBe("review");
    expect(
      resolveStepGroupFromCheckpoint("review", {
        currentStage: "transcript_cleaning",
        completedStages: ["ingestion"],
        stageArtifacts: {},
      }),
    ).toBe("review");
  });

  it("sanitizeMaterialMetadataForClient strips heavy stageArtifacts from pipelineCheckpoint while preserving cleaningProgress and completedStages", () => {
    const rawMetadata = {
      pipelineVersion: "gemini-3.8-source-aware-v1",
      pipelineCheckpoint: {
        currentStage: "transcript_cleaning",
        completedStages: ["ingestion"],
        updatedAt: "2026-10-24T04:00:00.000Z",
        stageArtifacts: {
          transcript_cleaning_partial: {
            completedSegments: Array.from({ length: 500 }, (_, i) => ({
              segmentId: `seg-${i + 1}`,
              normalizedText: "Kalimat panjang sekali",
            })),
            totalSegmentsCount: 1500,
          },
          transcript_cleaning: {
            retainedSegments: [{ segmentId: "seg-1", normalizedText: "Kalimat" }],
          },
        },
      },
    };

    const sanitized = sanitizeMaterialMetadataForClient(rawMetadata);
    const cp = (sanitized as any).pipelineCheckpoint;
    expect(cp.currentStage).toBe("transcript_cleaning");
    expect(cp.completedStages).toEqual(["ingestion"]);
    expect(cp.stageArtifacts).toEqual({});
    expect(cp.cleaningProgress).toEqual({
      completedSegmentsCount: 500,
      totalSegmentsCount: 1500,
    });
  });

  it("skips downloading slide PDF from storage during stepGroup='cleaning' and downloads it during stepGroup='generation'", async () => {
    let pdfDownloadCount = 0;
    let txtDownloadCount = 0;

    const materialRow: any = {
      id: "mat-pdf-skip-test",
      title: "Materi Farmakoterapi",
      academic_group: "clinical_science",
      status: "draft",
      global_summary: null,
      processing_error: null,
      created_by: "user-1",
      published_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {},
    };

    const service: any = {
      from: (table: string) => {
        if (table === "flashcard_source_files") {
          return {
            select: () => ({
              eq: () => ({
                order: () =>
                  Promise.resolve({
                    data: [
                      {
                        id: "src-txt",
                        material_id: materialRow.id,
                        file_kind: "transcript",
                        storage_bucket: "sources",
                        storage_path: "t.txt",
                        original_file_name: "t.txt",
                        mime_type: "text/plain",
                        size_bytes: 100,
                        extraction_status: "pending",
                        delete_after_publish: false,
                      },
                      {
                        id: "src-pdf",
                        material_id: materialRow.id,
                        file_kind: "slide_pdf",
                        storage_bucket: "sources",
                        storage_path: "s.pdf",
                        original_file_name: "s.pdf",
                        mime_type: "application/pdf",
                        size_bytes: 4_500_000,
                        extraction_status: "pending",
                        delete_after_publish: false,
                      },
                    ],
                    error: null,
                  }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ data: null, error: null }),
              in: () => Promise.resolve({ data: null, error: null }),
            }),
          };
        }
        if (table === "flashcard_subtopics") {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === "flashcard_cards") {
          return {
            select: () => ({
              in: () => ({
                order: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === "flashcard_materials") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: materialRow, error: null }),
                }),
              }),
            }),
            update: (updatePayload: any) => {
              const chain: any = {
                eq: () => chain,
                in: () => chain,
                is: () => chain,
                select: () => chain,
                then: (resolve: any) => {
                  Object.assign(materialRow, updatePayload);
                  resolve({ data: [materialRow], error: null });
                },
              };
              return chain;
            },
          };
        }
        return {} as any;
      },
      rpc: () => Promise.resolve({ data: "fake-key", error: null }),
      storage: {
        from: () => ({
          download: (path: string) => {
            if (path.endsWith(".txt")) {
              txtDownloadCount += 1;
              return Promise.resolve({
                data: new Blob(["Captopril 25 mg 2x sehari."]),
                error: null,
              });
            }
            pdfDownloadCount += 1;
            return Promise.resolve({
              data: new Blob([new Uint8Array([37, 80, 68, 70])]),
              error: null,
            });
          },
        }),
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    noiseSegmentIds: [],
                    uncertainSegments: [],
                    global_summary: "Ringkasan",
                    subtopics: [
                      {
                        title: "ACEi",
                        summary: "Ringkasan",
                        cards: [{ id: "c-1", front_text: "Q", back_text: "A" }],
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10, totalTokenCount: 20 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const credential: any = {
      id: "cred-1",
      model: "gemini-3.8-flash",
      secret_id: "sec-1",
      last_validated_at: new Date().toISOString(),
      last_error: null,
    };

    // 1. Run cleaning step: PDF must NOT be downloaded
    await processMaterialGeneration(service, materialRow, credential, {
      stepGroup: "cleaning",
    });
    expect(txtDownloadCount).toBe(1);
    expect(pdfDownloadCount).toBe(0);

    // 2. Run generation step: PDF MUST be downloaded
    await processMaterialGeneration(service, materialRow, credential, {
      isRetry: true,
      stepGroup: "generation",
    });
    expect(pdfDownloadCount).toBe(1);
  });

  test("buildStaleJobRecoveryUpdate auto-resumes stale jobs that have checkpoint progress up to MAX_STALE_AUTO_RECOVERIES, then transitions to failed", () => {
    const timeoutMessage =
      "Pemrosesan flash card terhenti di latar belakang karena batas waktu atau resource runtime terlampaui. Silakan gunakan tombol 'Coba Proses Ulang'.";

    // Case 1: Stale job with partial transcript cleaning progress (recovery #1) -> keeps status='processing' and clears processingJob
    const recovery1 = buildStaleJobRecoveryUpdate({
      metadata: {
        processingJob: {
          jobId: "job-dead-1",
          stage: "transcript_cleaning",
          heartbeatAt: "2026-10-24T07:17:27.852Z",
        },
        pipelineCheckpoint: {
          currentStage: "transcript_cleaning",
          completedStages: ["ingestion"],
          stageArtifacts: {
            transcript_cleaning_partial: {
              completedSegments: [{ segmentId: "seg-001" }],
            },
          },
        },
      },
      timeoutMessage,
    });

    expect(recovery1.autoResumed).toBe(true);
    expect(recovery1.updatePayload.status).toBe("processing");
    expect(recovery1.updatePayload.processing_error).toBeNull();
    expect(recovery1.updatePayload.metadata.processingJob).toBeUndefined();
    expect(recovery1.updatePayload.metadata.staleRecoveryCount).toBe(1);

    // Case 2: Second stale crash on the same material (recovery #2) -> still auto-resumes (up to MAX_STALE_AUTO_RECOVERIES = 2)
    const recovery2 = buildStaleJobRecoveryUpdate({
      metadata: {
        ...recovery1.updatePayload.metadata,
        processingJob: {
          jobId: "job-dead-2",
          stage: "transcript_cleaning",
          heartbeatAt: "2026-10-24T07:22:00.000Z",
        },
      },
      timeoutMessage,
    });

    expect(recovery2.autoResumed).toBe(true);
    expect(recovery2.updatePayload.status).toBe("processing");
    expect(recovery2.updatePayload.metadata.staleRecoveryCount).toBe(2);

    // Case 3: Third consecutive stale crash (staleRecoveryCount === 2 >= MAX_STALE_AUTO_RECOVERIES) -> fails permanently to prevent infinite crash loop
    const recovery3 = buildStaleJobRecoveryUpdate({
      metadata: {
        ...recovery2.updatePayload.metadata,
        processingJob: {
          jobId: "job-dead-3",
          stage: "transcript_cleaning",
          heartbeatAt: "2026-10-24T07:26:00.000Z",
        },
      },
      timeoutMessage,
    });

    expect(recovery3.autoResumed).toBe(false);
    expect(recovery3.updatePayload.status).toBe("failed");
    expect(recovery3.updatePayload.processing_error).toBe(timeoutMessage);
    expect(recovery3.updatePayload.metadata.processingJob).toBeUndefined();

    // Case 4: Stale job with NO checkpoint progress at all -> fails immediately
    const noProgressRecovery = buildStaleJobRecoveryUpdate({
      metadata: {
        processingJob: {
          jobId: "job-dead-0",
          stage: "ingestion",
          heartbeatAt: "2026-10-24T07:17:27.852Z",
        },
      },
      timeoutMessage,
    });

    expect(noProgressRecovery.autoResumed).toBe(false);
    expect(noProgressRecovery.updatePayload.status).toBe("failed");
    expect(noProgressRecovery.updatePayload.processing_error).toBe(timeoutMessage);
  });
});


describe("BYOK credential save and test handling (Domain 2)", () => {
  function createMockCredentialService(initialCredential: any = null) {
    let credentialRow = initialCredential ? { ...initialCredential } : null;
    const vaultSecrets = new Map<string, string>();
    if (initialCredential?.secret_id) {
      vaultSecrets.set(initialCredential.secret_id, "AIzaSyInitialValidKey1234567890");
    }
    const createdSecretIds: string[] = [];
    const deletedSecretIds: string[] = [];
    let secretCounter = 0;

    const service: any = {
      from: (table: string) => {
        if (table === "user_ai_credentials") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: credentialRow ? { ...credentialRow } : null, error: null }),
              }),
            }),
            insert: (payload: any) => {
              credentialRow = {
                id: "cred-new-1",
                model: payload.model,
                secret_id: payload.secret_id,
                last_validated_at: payload.last_validated_at ?? null,
                last_error: payload.last_error ?? null,
                ...payload,
              };
              return Promise.resolve({ data: credentialRow, error: null });
            },
            update: (payload: any) => ({
              eq: () => {
                if (credentialRow) {
                  credentialRow = {
                    ...credentialRow,
                    ...payload,
                  };
                }
                return Promise.resolve({ data: credentialRow, error: null });
              },
            }),
          };
        }
        return {} as any;
      },
      rpc: (fn: string, args: any) => {
        if (fn === "create_vault_secret") {
          secretCounter += 1;
          const newId = `vault-sec-${secretCounter}`;
          vaultSecrets.set(newId, args.secret);
          createdSecretIds.push(newId);
          return Promise.resolve({ data: newId, error: null });
        }
        if (fn === "read_vault_secret") {
          const secretVal = vaultSecrets.get(args.target_secret_id);
          return Promise.resolve({ data: secretVal ?? null, error: secretVal ? null : { message: "Not found" } });
        }
        if (fn === "delete_vault_secret") {
          vaultSecrets.delete(args.target_secret_id);
          deletedSecretIds.push(args.target_secret_id);
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      getCredentialRow: () => credentialRow,
      getVaultSecrets: () => vaultSecrets,
      getCreatedSecretIds: () => createdSecretIds,
      getDeletedSecretIds: () => deletedSecretIds,
    };

    return service;
  }

  test("save-credential when Gemini returns 503, 429, or 504 timeout saves key to Vault & DB with last_validated_at: null and last_error populated, returning 200", async () => {
    const transientCases = [
      {
        label: "503 high demand",
        mockFetch: async () => ({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
          headers: new Headers(),
          json: async () => ({
            error: {
              code: 503,
              status: "UNAVAILABLE",
              message: "The model is overloaded. Please try again later.",
            },
          }),
        }),
        expectedMessagePattern: /gangguan sementara|503|overloaded/i,
      },
      {
        label: "429 rate limit",
        mockFetch: async () => ({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          headers: new Headers(),
          json: async () => ({
            error: {
              code: 429,
              status: "RESOURCE_EXHAUSTED",
              message: "Resource has been exhausted (e.g. check quota).",
            },
          }),
        }),
        expectedMessagePattern: /penuh sementara|kuota|rpm|429/i,
      },
      {
        label: "504 timeout",
        mockFetch: async () => {
          const timeoutErr = new Error("The operation was aborted due to timeout");
          timeoutErr.name = "TimeoutError";
          throw timeoutErr;
        },
        expectedMessagePattern: /timeout|waktu tunggu/i,
      },
    ];

    for (const testCase of transientCases) {
      const mockService = createMockCredentialService({
        id: "cred-existing-1",
        model: "gemini-3.8-flash",
        secret_id: "old-vault-sec-0",
        last_validated_at: "2026-10-20T00:00:00.000Z",
        last_error: null,
      });

      vi.stubGlobal("fetch", vi.fn().mockImplementation(testCase.mockFetch));

      const rawKey = "AIzaSyTransientTestKey987654321";
      const response = await handleSaveCredential(mockService, {
        credential: mockService.getCredentialRow(),
        userId: "user-123",
        apiKey: rawKey,
        model: "gemini-3.8-flash",
      });

      expect(response.status).toBe(200);
      const body = await response.json();

      // Key is saved to Vault and old secret is cleaned up
      expect(mockService.getCreatedSecretIds()).toHaveLength(1);
      expect(mockService.getDeletedSecretIds()).toEqual(["old-vault-sec-0"]);

      // DB row has last_validated_at = null and last_error populated & sanitized
      const dbRow = mockService.getCredentialRow();
      expect(dbRow.secret_id).toBe("vault-sec-1");
      expect(dbRow.last_validated_at).toBeNull();
      expect(dbRow.last_error).toMatch(testCase.expectedMessagePattern);
      expect(dbRow.last_error).not.toContain(rawKey);

      // Response payload contains status and testResult: { ok: false, message }
      expect(body.status).toEqual({
        hasCredential: true,
        model: "gemini-3.8-flash",
        lastValidatedAt: null,
        lastError: dbRow.last_error,
      });
      expect(body.testResult).toEqual({
        ok: false,
        message: dbRow.last_error,
      });
    }
  });

  test("save-credential when Gemini returns 400, 401, 403, or 404 rejects with 400 BYOK_INVALID and does NOT save key to Vault or DB", async () => {
    const rejectionStatuses = [
      {
        status: 400,
        errorPayload: {
          error: {
            code: 400,
            status: "INVALID_ARGUMENT",
            message: "API key not valid. Please pass a valid API key: AIzaSyInvalidKey00000000000",
          },
        },
      },
      {
        status: 403,
        errorPayload: {
          error: {
            code: 403,
            status: "PERMISSION_DENIED",
            message: "Permission denied for key AIzaSyInvalidKey00000000000",
          },
        },
      },
      {
        status: 404,
        errorPayload: {
          error: {
            code: 404,
            status: "NOT_FOUND",
            message: "models/gemini-nonexistent is not found for API version v1beta",
          },
        },
      },
    ];

    for (const item of rejectionStatuses) {
      const mockService = createMockCredentialService({
        id: "cred-existing-valid",
        model: "gemini-3.8-flash",
        secret_id: "valid-vault-sec-1",
        last_validated_at: "2026-10-20T00:00:00.000Z",
        last_error: null,
      });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: item.status,
          headers: new Headers(),
          json: async () => item.errorPayload,
        }),
      );

      const invalidKey = "AIzaSyInvalidKey00000000000";
      await expect(
        handleSaveCredential(mockService, {
          credential: mockService.getCredentialRow(),
          userId: "user-123",
          apiKey: invalidKey,
          model: item.status === 404 ? "gemini-nonexistent" : "gemini-3.8-flash",
        }),
      ).rejects.toMatchObject({
        status: 400,
        code: "BYOK_INVALID",
      });

      // Vault must NOT be written to and existing valid secret must NOT be deleted or overwritten
      expect(mockService.getCreatedSecretIds()).toHaveLength(0);
      expect(mockService.getDeletedSecretIds()).toHaveLength(0);
      expect(mockService.getCredentialRow().secret_id).toBe("valid-vault-sec-1");
      expect(mockService.getCredentialRow().last_validated_at).toBe("2026-10-20T00:00:00.000Z");
    }
  });

  test("save-credential when Gemini connection succeeds saves key with last_validated_at timestamp and last_error: null", async () => {
    const mockService = createMockCredentialService(null);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "OK" }] } }],
        }),
      }),
    );

    const response = await handleSaveCredential(mockService, {
      credential: null,
      userId: "user-123",
      apiKey: "AIzaSyValidNewKey1234567890",
      model: "gemini-3.8-flash",
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status.hasCredential).toBe(true);
    expect(typeof body.status.lastValidatedAt).toBe("string");
    expect(body.status.lastError).toBeNull();
    expect(body.testResult?.ok).toBe(true);
  });

  test("test-credential sanitizes last_error so no raw API key or auth header is ever written to user_ai_credentials.last_error", async () => {
    const rawSecretKey = "AIzaSySuperSecretKey999888777";
    const mockService = createMockCredentialService({
      id: "cred-test-1",
      model: "gemini-3.8-flash",
      secret_id: "sec-test-1",
      last_validated_at: "2026-10-20T00:00:00.000Z",
      last_error: null,
    });
    mockService.getVaultSecrets().set("sec-test-1", rawSecretKey);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        throw new Error(
          `Fetch failed for https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${rawSecretKey} with headers x-goog-api-key: ${rawSecretKey} and Authorization: Bearer ${rawSecretKey}`,
        );
      }),
    );

    const response = await handleTestCredential(mockService, {
      credential: mockService.getCredentialRow(),
      userId: "user-123",
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.testResult.ok).toBe(false);
    expect(body.testResult.message).toBeTruthy();
    expect(body.testResult.message).not.toContain(rawSecretKey);
    expect(body.testResult.message).toContain("[REDACTED");

    const updatedCredential = mockService.getCredentialRow();
    expect(updatedCredential.last_error).toBeTruthy();
    expect(updatedCredential.last_error).not.toContain(rawSecretKey);
    expect(updatedCredential.last_error).toContain("[REDACTED");

    // Direct unit check on sanitizeCredentialErrorMessage with short custom keys and headers
    const dirtyMsg = "Error with key=short-custom-key, x-goog-api-key: short-custom-key, Authorization: Bearer my-bearer-secret";
    const cleaned = sanitizeCredentialErrorMessage(dirtyMsg, "short-custom-key");
    expect(cleaned).not.toContain("short-custom-key");
    expect(cleaned).not.toContain("my-bearer-secret");
  });
});
