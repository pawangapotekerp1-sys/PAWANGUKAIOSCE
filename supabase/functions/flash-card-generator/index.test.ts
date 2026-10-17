import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import {
  assertFlashCardMaterialEditable,
  assertFlashCardMaterialPublishable,
  assertFlashCardMaterialRetryable,
  buildFlashCardCredentialWritePayload,
  buildFlashCardFailureUpdate,
  buildFlashCardMaterialInsert,
  buildFlashCardPublishUpdate,
  buildFlashCardSourceFileRows,
  ensureFlashCardManagerAccess,
  FlashCardManagerAccessError,
  handlePublishMaterial,
  handleResolveConflict,
  handleUpdateMaterialProtectedMetadata,
  validateGeneratedFlashCardOutput,
  validateFlashCardMaterialDraftInput,
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

  test("rejects users who are not admin or mentor", () => {
    expect(() => ensureFlashCardManagerAccess("pro")).toThrow(FlashCardManagerAccessError);
    expect(() => ensureFlashCardManagerAccess("pendaftar_baru")).toThrow(/admin atau mentor/i);
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
});
