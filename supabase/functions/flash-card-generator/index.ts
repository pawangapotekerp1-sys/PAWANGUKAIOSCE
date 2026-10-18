import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Buffer } from "node:buffer";
import {
  HttpError,
  createServiceClient,
  requireQuestionBankManager,
} from "../_shared/auth.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  collectFlashCardSourcePathsForCleanup,
  type CardMetadata,
  type MaterialMetadata,
  type SourceConflictRecord,
  validateMaterialMetadata,
} from "../_shared/flash-card.ts";
import {
  GeminiRequestError,
  generateGeminiText,
  isGeminiCredentialError,
  normalizeAiModel,
  sanitizeText,
  testGeminiConnection,
} from "../_shared/gemini-client.ts";
import {
  runFlashCardPipeline,
  resumePipelineFromCheckpoint,
  type PipelineCheckpoint,
} from "./pipeline/orchestrator.ts";
import { type CandidateCard } from "./pipeline/generator.ts";
import { reviewCandidateCards } from "./pipeline/reviewer.ts";
import { repairDefectiveCards } from "./pipeline/repairer.ts";
import {
  assertFlashCardMaterialEditable,
  assertFlashCardMaterialPublishable,
  assertFlashCardMaterialRetryable,
  buildFlashCardCredentialWritePayload,
  buildFlashCardFailureUpdate,
  buildFlashCardGenerationPrompt,
  buildFlashCardMaterialInsert,
  buildFlashCardPublishUpdate,
  buildFlashCardReadyForReviewUpdate,
  buildFlashCardSourceFileRows,
  canRetryFlashCardMaterial,
  createFlashCardResponseSchema,
  ensureFlashCardManagerAccess,
  extractStaleRecoveryDiagnostics,
  FlashCardManagerAccessError,
  handlePublishMaterial,
  handleResolveConflict,
  handleUpdateMaterialProtectedMetadata,
  isProcessingJobStale,
  shouldApplyStaleRecovery,
  STALE_PROCESSING_TIMEOUT_MS,
  validateGeneratedFlashCardOutput,
  validateFlashCardMaterialDraftInput,
  validateFlashCardReviewUpdate,
} from "./handler.ts";

type ServiceClient = ReturnType<typeof createServiceClient>;

type UserAiCredentialRow = {
  id: string;
  model: string;
  secret_id: string | null;
  last_validated_at: string | null;
  last_error: string | null;
};

type MaterialRow = {
  id: string;
  title: string;
  academic_group: string;
  status: string;
  global_summary: string | null;
  processing_error: string | null;
  created_by: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  metadata?: MaterialMetadata | Record<string, unknown> | null;
};

type SourceFileRow = {
  id: string;
  material_id: string;
  file_kind: "transcript" | "slide_pdf";
  storage_bucket: string;
  storage_path: string;
  original_file_name: string;
  mime_type: string;
  size_bytes: number;
  extraction_status: string;
  delete_after_publish: boolean;
};

type SubtopicRow = {
  id: string;
  material_id: string;
  title: string;
  summary: string;
  sort_order: number;
};

type CardRow = {
  id: string;
  subtopic_id: string;
  front_text: string;
  back_text: string;
  sort_order: number;
  metadata?: CardMetadata | Record<string, unknown> | null;
};

function encodeBase64(bytes: Uint8Array): string {
  if (!bytes || bytes.length === 0) {
    return "";
  }

  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
}

function mapFlashCardGeneratorStatus(credential: UserAiCredentialRow | null) {
  return {
    hasCredential: Boolean(credential?.secret_id),
    model: credential?.model ?? "gemini-3.7-flash",
    lastValidatedAt: credential?.last_validated_at ?? null,
    lastError: credential?.last_error ?? null,
  };
}

async function readUserCredential(service: ServiceClient, userId: string) {
  const { data, error } = await service
    .from("user_ai_credentials")
    .select("id, model, secret_id, last_validated_at, last_error")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "BYOK_READ_FAILED", error.message);
  }

  return (data as UserAiCredentialRow | null) ?? null;
}

async function createVaultSecret(service: ServiceClient, apiKey: string, name: string, description: string) {
  const { data, error } = await service.rpc("create_vault_secret", {
    secret: apiKey,
    name,
    description,
  });

  if (error) {
    throw new HttpError(500, "VAULT_WRITE_FAILED", error.message);
  }

  return data as string;
}

async function readVaultSecret(service: ServiceClient, secretId: string) {
  const { data, error } = await service.rpc("read_vault_secret", {
    target_secret_id: secretId,
  });

  if (error || typeof data !== "string" || data.length === 0) {
    throw new HttpError(500, "VAULT_READ_FAILED", error?.message ?? "Secret BYOK belum tersedia.");
  }

  return data;
}

async function deleteVaultSecret(service: ServiceClient, secretId: string) {
  const { error } = await service.rpc("delete_vault_secret", {
    target_secret_id: secretId,
  });

  if (error) {
    throw new HttpError(500, "VAULT_DELETE_FAILED", error.message);
  }
}

async function upsertUserCredential(
  service: ServiceClient,
  {
    credential,
    userId,
    apiKey,
    model,
  }: {
    credential: UserAiCredentialRow | null;
    userId: string;
    apiKey: string;
    model?: string;
  },
) {
  const previousSecretId = credential?.secret_id ?? null;
  const nextSecretId = await createVaultSecret(
    service,
    apiKey.trim(),
    `flash-card-generator-byok-${userId}-${Date.now()}`,
    `Flash Card Generator BYOK for ${userId}`,
  );
  const writePayload = {
    ...buildFlashCardCredentialWritePayload({
      apiKey,
      model: model ?? "",
      userId,
    }),
    secret_id: nextSecretId,
  };

  if (credential?.id) {
    const { error } = await service
      .from("user_ai_credentials")
      .update(writePayload)
      .eq("id", credential.id);

    if (error) {
      throw new HttpError(500, "BYOK_WRITE_FAILED", error.message);
    }
  } else {
    const { error } = await service
      .from("user_ai_credentials")
      .insert(writePayload);

    if (error) {
      throw new HttpError(500, "BYOK_WRITE_FAILED", error.message);
    }
  }

  if (previousSecretId && previousSecretId !== nextSecretId) {
    await deleteVaultSecret(service, previousSecretId);
  }
}

async function loadOwnedMaterial(service: ServiceClient, materialId: string, userId: string) {
  const { data, error } = await service
    .from("flashcard_materials")
    .select("id, title, academic_group, status, global_summary, processing_error, created_by, published_at, created_at, updated_at, metadata")
    .eq("id", materialId)
    .eq("created_by", userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "FLASHCARD_MATERIAL_READ_FAILED", error.message);
  }

  if (!data) {
    throw new HttpError(404, "FLASHCARD_MATERIAL_NOT_FOUND", "Materi flash card tidak ditemukan.");
  }

  return data as MaterialRow;
}

async function loadMaterialChildren(service: ServiceClient, materialId: string) {
  const [{ data: sourceFiles, error: sourceError }, { data: subtopics, error: subtopicError }] = await Promise.all([
    service
      .from("flashcard_source_files")
      .select("id, material_id, file_kind, storage_bucket, storage_path, original_file_name, mime_type, size_bytes, extraction_status, delete_after_publish")
      .eq("material_id", materialId)
      .order("created_at", { ascending: true }),
    service
      .from("flashcard_subtopics")
      .select("id, material_id, title, summary, sort_order")
      .eq("material_id", materialId)
      .order("sort_order", { ascending: true }),
  ]);

  if (sourceError || subtopicError) {
    throw new HttpError(500, "FLASHCARD_CHILDREN_READ_FAILED", sourceError?.message ?? subtopicError?.message ?? "Detail materi belum berhasil dimuat.");
  }

  const subtopicIds = ((subtopics as SubtopicRow[] | null) ?? []).map((subtopic) => subtopic.id);
  const { data: cards, error: cardsError } = subtopicIds.length > 0
    ? await service
      .from("flashcard_cards")
      .select("id, subtopic_id, front_text, back_text, sort_order, metadata")
      .in("subtopic_id", subtopicIds)
      .order("sort_order", { ascending: true })
    : { data: [], error: null };

  if (cardsError) {
    throw new HttpError(500, "FLASHCARD_CARD_READ_FAILED", cardsError.message);
  }

  return {
    sourceFiles: (sourceFiles as SourceFileRow[] | null) ?? [],
    subtopics: (subtopics as SubtopicRow[] | null) ?? [],
    cards: (cards as CardRow[] | null) ?? [],
  };
}

async function downloadTextFromStorage(service: ServiceClient, sourceFile: SourceFileRow) {
  const { data, error } = await service.storage
    .from(sourceFile.storage_bucket)
    .download(sourceFile.storage_path);

  if (error || !data) {
    throw new HttpError(500, "FLASHCARD_SOURCE_DOWNLOAD_FAILED", error?.message ?? "Source transcript belum berhasil diunduh.");
  }

  return await data.text();
}

async function downloadBytesFromStorage(service: ServiceClient, sourceFile: SourceFileRow) {
  const MAX_INLINE_PDF_BYTES = 4 * 1024 * 1024;
  if (typeof sourceFile.size_bytes === "number" && sourceFile.size_bytes > MAX_INLINE_PDF_BYTES) {
    logSafeTelemetry("pdf_download_skipped_large_file", {
      sourceFileId: sourceFile.id,
      sizeBytes: sourceFile.size_bytes,
      maxInlineBytes: MAX_INLINE_PDF_BYTES,
    });
    return null;
  }

  const { data, error } = await service.storage
    .from(sourceFile.storage_bucket)
    .download(sourceFile.storage_path);

  if (error || !data) {
    throw new HttpError(500, "FLASHCARD_SOURCE_DOWNLOAD_FAILED", error?.message ?? "Source PDF belum berhasil diunduh.");
  }

  return new Uint8Array(await data.arrayBuffer());
}

async function replaceMaterialContent(
  service: ServiceClient,
  {
    ownerId,
    materialId,
    globalSummary,
    subtopics,
  }: {
    ownerId: string;
    materialId: string;
    globalSummary: string;
    subtopics: Array<{
      title: string;
      summary: string;
      cards: Array<{
        frontText?: string;
        backText?: string;
        front_text?: string;
        back_text?: string;
        metadata?: CardMetadata | Record<string, unknown> | null;
      }>;
    }>;
  },
) {
  const validatedOutput = validateFlashCardReviewUpdate({
    globalSummary,
    subtopics,
  });
  const { error } = await service.rpc("replace_flashcard_material_content", {
    target_material_id: materialId,
    target_owner_id: ownerId,
    target_subtopics: validatedOutput.subtopics.map((subtopic, sIdx) => ({
      title: subtopic.title,
      summary: subtopic.summary,
      cards: subtopic.cards.map((card, cIdx) => ({
        front_text: card.front_text,
        back_text: card.back_text,
        metadata: (card as any).metadata ?? (subtopics[sIdx]?.cards?.[cIdx] as any)?.metadata ?? {},
      })),
    })),
  });

  if (error) {
    throw new HttpError(500, "FLASHCARD_CONTENT_REPLACE_FAILED", error.message);
  }

  return validatedOutput;
}

function logSafeTelemetry(event: string, data: Record<string, unknown> = {}) {
  const heapUsedMb = (() => {
    try {
      if (typeof Deno !== "undefined" && typeof (Deno as any).memoryUsage === "function") {
        return Math.round((Deno as any).memoryUsage().heapUsed / (1024 * 1024));
      }
      if (typeof process !== "undefined" && typeof process.memoryUsage === "function") {
        return Math.round(process.memoryUsage().heapUsed / (1024 * 1024));
      }
    } catch {
      // ignore
    }
    return undefined;
  })();

  const sanitizedData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === "string") {
      sanitizedData[k] = sanitizeText(v);
    } else {
      sanitizedData[k] = v;
    }
  }

  const payload: Record<string, unknown> = {
    telemetry: "flashcard_pipeline",
    event,
    timestamp: new Date().toISOString(),
    ...(heapUsedMb !== undefined ? { heapUsedMb } : {}),
    ...sanitizedData,
  };
  console.log(JSON.stringify(payload));
}

async function processMaterialGeneration(
  service: ServiceClient,
  material: MaterialRow,
  credential: UserAiCredentialRow,
  options: { isRetry?: boolean } = {},
) {
  const { sourceFiles } = await loadMaterialChildren(service, material.id);
  const transcriptSource = sourceFiles.find((sourceFile) => sourceFile.file_kind === "transcript");
  const slidePdfSource = sourceFiles.find((sourceFile) => sourceFile.file_kind === "slide_pdf");

  if (!transcriptSource || !slidePdfSource) {
    throw new HttpError(400, "FLASHCARD_SOURCE_INCOMPLETE", "Materi flash card wajib memiliki satu transcript dan satu slide PDF.");
  }

  const initialCheckpoint = options.isRetry
    ? (((material.metadata as any)?.pipelineCheckpoint ?? (material.metadata as any)?.pipeline_checkpoint) as PipelineCheckpoint | undefined)
    : undefined;
  let latestCheckpoint: PipelineCheckpoint | undefined = initialCheckpoint;

  const jobId = crypto.randomUUID();
  const jobStartTime = new Date().toISOString();
  logSafeTelemetry("job_started", { materialId: material.id, jobId, isRetry: Boolean(options.isRetry) });

  const currentMeta = (material.metadata ?? {}) as Record<string, unknown>;
  const initialProcessingJob = {
    jobId,
    startedAt: jobStartTime,
    heartbeatAt: jobStartTime,
    stage: initialCheckpoint?.currentStage ?? "ingestion",
  };

  let claimQuery = service
    .from("flashcard_materials")
    .update({
      status: "processing",
      processing_error: null,
      metadata: {
        ...currentMeta,
        processingJob: initialProcessingJob,
      },
    })
    .eq("id", material.id);

  if (options.isRetry) {
    if (material.status === "processing") {
      const oldJobId = (material.metadata as any)?.processingJob?.jobId;
      if (oldJobId) {
        claimQuery = claimQuery.eq("status", "processing").eq("metadata->processingJob->>jobId", oldJobId);
      } else {
        claimQuery = claimQuery.eq("status", "processing");
      }
    } else {
      claimQuery = claimQuery.eq("status", material.status);
    }
  } else {
    claimQuery = claimQuery.in("status", ["draft", "failed"]);
  }

  const { data: claimData, error: claimError } = await claimQuery.select("id, status, metadata");

  if (claimError || !claimData || claimData.length === 0) {
    logSafeTelemetry("job_claim_race_lost", { materialId: material.id, jobId });
    const freshMaterial = await loadOwnedMaterial(service, material.id, material.created_by);
    if (freshMaterial.status === "processing") {
      return jsonResponse({
        materialId: material.id,
        status: "processing",
        message: "Materi sedang diproses di latar belakang.",
      });
    }
    return jsonResponse({
      materialId: freshMaterial.id,
      status: freshMaterial.status,
    });
  }

  material.metadata = {
    ...currentMeta,
    processingJob: initialProcessingJob,
  };

  let isJobTerminated = false;
  let heartbeatTimer: any = null;
  let isHeartbeatInFlight = false;

  const stopHeartbeat = () => {
    isJobTerminated = true;
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const sendHeartbeat = async () => {
    if (isJobTerminated || isHeartbeatInFlight) return;
    isHeartbeatInFlight = true;
    try {
      if (isJobTerminated) return;
      const liveMeta = (material.metadata ?? {}) as Record<string, unknown>;
      const currentJob = (liveMeta.processingJob ?? {}) as Record<string, unknown>;
      if (currentJob.jobId && currentJob.jobId !== jobId) {
        stopHeartbeat();
        return;
      }

      const stageNow = new Date().toISOString();

      // 1. Primary: Use atomic RPC that updates ONLY metadata->processingJob->heartbeatAt via jsonb_set
      // This completely prevents overwriting checkpoints or stages written concurrently by onStageComplete.
      const { data: rpcData, error: rpcError } = await service.rpc("update_flashcard_material_heartbeat", {
        target_material_id: material.id,
        target_job_id: jobId,
        target_heartbeat_at: stageNow,
      });

      if (rpcError) {
        console.warn("Heartbeat update failed via RPC:", rpcError);
        return;
      }

      if (!rpcData) {
        // 0 rows matched (status changed or job superseded)
        stopHeartbeat();
        return;
      }

      material.metadata = rpcData as Record<string, unknown>;
    } catch (err) {
      console.warn("Heartbeat update failed:", err);
    } finally {
      isHeartbeatInFlight = false;
    }
  };

  try {
    heartbeatTimer = setInterval(sendHeartbeat, 15_000);
    if (typeof heartbeatTimer?.unref === "function") {
      heartbeatTimer.unref();
    }

    const needsPdfBytes = !initialCheckpoint?.completedStages?.includes("candidate_generation");
    const [transcriptText, pdfBytes, apiKey] = await Promise.all([
      downloadTextFromStorage(service, transcriptSource),
      needsPdfBytes ? downloadBytesFromStorage(service, slidePdfSource) : Promise.resolve(null),
      readVaultSecret(service, credential.secret_id!),
    ]);
    const model = normalizeAiModel(credential.model);

    // Concurrency protection: Verify current jobId is still authoritative before starting expensive Gemini pipeline
    const prePipelineMaterial = await loadOwnedMaterial(service, material.id, material.created_by);
    const preActiveJobId = (prePipelineMaterial.metadata as any)?.processingJob?.jobId;
    if (preActiveJobId && preActiveJobId !== jobId) {
      stopHeartbeat();
      logSafeTelemetry("job_superseded_pre_pipeline", { materialId: material.id, jobId, activeJobId: preActiveJobId });
      return jsonResponse({
        materialId: material.id,
        status: prePipelineMaterial.status,
        message: "Job ini telah digantikan oleh sesi proses ulang yang lebih baru.",
      });
    }

    const onResumeCheckpoint = async (checkpoint: PipelineCheckpoint) => {
      if (isJobTerminated) return;
      latestCheckpoint = checkpoint;
      const stageNow = new Date().toISOString();
      logSafeTelemetry("checkpoint_resumed", {
        materialId: material.id,
        jobId,
        resumedStage: checkpoint.currentStage,
        completedStages: checkpoint.completedStages,
      });

      const liveMeta = (material.metadata ?? {}) as Record<string, unknown>;
      const updatedMeta = {
        ...liveMeta,
        pipelineCheckpoint: checkpoint,
        processingJob: {
          jobId,
          startedAt: (liveMeta.processingJob as any)?.startedAt ?? jobStartTime,
          heartbeatAt: stageNow,
          stage: checkpoint.currentStage,
        },
      };
      material.metadata = updatedMeta;
      await service
        .from("flashcard_materials")
        .update({
          metadata: updatedMeta,
        })
        .eq("id", material.id)
        .eq("status", "processing")
        .eq("metadata->processingJob->>jobId", jobId);
    };

    const onStageComplete = async (stage: any, checkpoint: PipelineCheckpoint) => {
      if (isJobTerminated) return;
      latestCheckpoint = checkpoint;
      const partialSegments = (checkpoint.stageArtifacts["transcript_cleaning_partial"] as any)?.completedSegments;
      if (stage === "transcript_cleaning" && Array.isArray(partialSegments) && !checkpoint.completedStages.includes("transcript_cleaning")) {
        logSafeTelemetry("cleaning_chunk_completed", {
          materialId: material.id,
          jobId,
          completedSegmentsCount: partialSegments.length,
        });
      } else {
        logSafeTelemetry("stage_completed", { materialId: material.id, jobId, stage: String(stage) });
      }

      const liveMeta = (material.metadata ?? {}) as Record<string, unknown>;
      const updatedMeta = {
        ...liveMeta,
        pipelineCheckpoint: checkpoint,
        processingJob: {
          jobId,
          startedAt: (liveMeta.processingJob as any)?.startedAt ?? jobStartTime,
          heartbeatAt: stageNow,
          stage: String(stage),
        },
      };
      material.metadata = updatedMeta;
      await service
        .from("flashcard_materials")
        .update({
          metadata: updatedMeta,
        })
        .eq("id", material.id)
        .eq("status", "processing")
        .eq("metadata->processingJob->>jobId", jobId);
    };

    const pipelineOptions = {
      title: material.title,
      academicGroup: material.academic_group,
      transcriptText,
      pdfBytes,
      hasPdfSource: Boolean(slidePdfSource),
      pdfByteLength: typeof slidePdfSource.size_bytes === "number" ? slidePdfSource.size_bytes : 0,
      apiKey,
      model,
      onStageComplete,
      onResumeCheckpoint,
    };

    let pipelineResult;
    if (initialCheckpoint && typeof initialCheckpoint === "object") {
      pipelineResult = await resumePipelineFromCheckpoint(initialCheckpoint as any, pipelineOptions);
    } else {
      pipelineResult = await runFlashCardPipeline(pipelineOptions);
    }
    latestCheckpoint = pipelineResult.checkpoint ?? latestCheckpoint;

    // Concurrency protection: Verify current jobId is still authoritative
    const latestMaterialRow = await loadOwnedMaterial(service, material.id, material.created_by);
    const activeJobId = (latestMaterialRow.metadata as any)?.processingJob?.jobId;
    if (activeJobId && activeJobId !== jobId) {
      stopHeartbeat();
      logSafeTelemetry("job_superseded", { materialId: material.id, jobId, activeJobId });
      return jsonResponse({
        materialId: material.id,
        status: latestMaterialRow.status,
        message: "Job ini telah digantikan oleh sesi proses ulang yang lebih baru.",
      });
    }

    // Stop heartbeat immediately before writing final completion status
    stopHeartbeat();

    await replaceMaterialContent(service, {
      ownerId: material.created_by,
      materialId: material.id,
      globalSummary: pipelineResult.globalSummary,
      subtopics: pipelineResult.subtopics.map((subtopic) => ({
        title: subtopic.title,
        summary: subtopic.summary,
        cards: subtopic.cards.map((card) => ({
          frontText: card.frontText,
          backText: card.backText,
          metadata: card.metadata,
        })),
      })),
    });

    const finalMetadata = {
      ...(pipelineResult.metadata ?? {}),
      processingJob: undefined,
    };

    const { error: materialUpdateError } = await service
      .from("flashcard_materials")
      .update({
        ...buildFlashCardReadyForReviewUpdate(pipelineResult.globalSummary),
        metadata: finalMetadata,
      })
      .eq("id", material.id);

    if (materialUpdateError) {
      throw new HttpError(500, "FLASHCARD_MATERIAL_UPDATE_FAILED", materialUpdateError.message);
    }

    await service
      .from("flashcard_source_files")
      .update({
        extraction_status: "completed",
      })
      .eq("material_id", material.id);

    logSafeTelemetry("job_completed", { materialId: material.id, jobId });

    return jsonResponse({
      materialId: material.id,
      status: "ready_for_review",
    });
  } catch (error) {
    stopHeartbeat();
    const rawMessage = error instanceof Error ? error.message : "Flash card processing failed.";
    const message = sanitizeText(rawMessage);
    const errorDiagnostics = error instanceof GeminiRequestError ? error.diagnostics : undefined;
    const errorCode = error instanceof GeminiRequestError ? error.code : undefined;
    const errorStatus = error instanceof GeminiRequestError ? error.status : undefined;

    logSafeTelemetry("job_failed", {
      materialId: material.id,
      jobId,
      error: message,
      errorCategory: errorDiagnostics?.category ?? errorCode,
      errorStatus,
      isRetryable: errorDiagnostics?.isRetryable,
      retryAfterSeconds: errorDiagnostics?.retryAfterSeconds,
    });
    const currentMeta = (material.metadata ?? {}) as Record<string, unknown>;
    const checkpointToPreserve = (error as any)?.checkpoint ?? latestCheckpoint;

    const failureUpdate: Record<string, unknown> = buildFlashCardFailureUpdate(message);
    failureUpdate.metadata = {
      ...currentMeta,
      ...(checkpointToPreserve ? { pipelineCheckpoint: checkpointToPreserve } : {}),
      processingJob: undefined,
    };

    await service
      .from("flashcard_materials")
      .update(failureUpdate)
      .eq("id", material.id)
      .eq("status", "processing")
      .eq("metadata->processingJob->>jobId", jobId);
    throw error;
  } finally {
    stopHeartbeat();
  }
}

function mapMaterialDetail({
  material,
  sourceFiles,
  subtopics,
  cards,
}: {
  material: MaterialRow;
  sourceFiles: SourceFileRow[];
  subtopics: SubtopicRow[];
  cards: CardRow[];
}) {
  return {
    material: {
      id: material.id,
      title: material.title,
      academicGroup: material.academic_group,
      status: material.status,
      globalSummary: material.global_summary,
      processingError: material.processing_error,
      publishedAt: material.published_at,
      createdAt: material.created_at,
      updatedAt: material.updated_at,
      metadata: material.metadata ?? {},
    },
    sourceFiles: sourceFiles.map((sourceFile) => ({
      id: sourceFile.id,
      fileKind: sourceFile.file_kind,
      storageBucket: sourceFile.storage_bucket,
      storagePath: sourceFile.storage_path,
      originalFileName: sourceFile.original_file_name,
      mimeType: sourceFile.mime_type,
      sizeBytes: sourceFile.size_bytes,
      extractionStatus: sourceFile.extraction_status,
      deleteAfterPublish: sourceFile.delete_after_publish,
    })),
    subtopics: subtopics.map((subtopic) => ({
      id: subtopic.id,
      title: subtopic.title,
      summary: subtopic.summary,
      sortOrder: subtopic.sort_order,
      cards: cards
        .filter((card) => card.subtopic_id === subtopic.id)
        .map((card) => ({
          id: card.id,
          frontText: card.front_text,
          backText: card.back_text,
          sortOrder: card.sort_order,
          metadata: card.metadata ?? {},
        })),
    })),
  };
}

async function deletePublishedSourceFiles(service: ServiceClient, sourceFiles: SourceFileRow[]) {
  const cleanupTargets = collectFlashCardSourcePathsForCleanup(sourceFiles.map((sourceFile) => ({
    storageBucket: sourceFile.storage_bucket,
    storagePath: sourceFile.storage_path,
    deleteAfterPublish: sourceFile.delete_after_publish,
  })));
  const bucketToPaths = new Map<string, string[]>();

  for (const target of cleanupTargets) {
    bucketToPaths.set(target.storageBucket, [...(bucketToPaths.get(target.storageBucket) ?? []), target.storagePath]);
  }

  for (const [bucket, paths] of bucketToPaths.entries()) {
    const { error } = await service.storage
      .from(bucket)
      .remove(paths);

    if (error) {
      throw new HttpError(500, "FLASHCARD_SOURCE_DELETE_FAILED", error.message);
    }
  }

  if (cleanupTargets.length > 0) {
    const { error: updateSourceError } = await service
      .from("flashcard_source_files")
      .update({
        extraction_status: "deleted",
      })
      .in("storage_path", cleanupTargets.map((target) => target.storagePath));

    if (updateSourceError) {
      throw new HttpError(500, "FLASHCARD_SOURCE_STATUS_UPDATE_FAILED", updateSourceError.message);
    }
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);

  if (corsResponse) {
    return corsResponse;
  }

  try {
    const { user, profile, service } = await requireQuestionBankManager(req);
    ensureFlashCardManagerAccess(profile.role as "admin" | "mentor" | "pro" | "pendaftar_baru");
    const payload = await req.json();
    const credential = await readUserCredential(service, user.id);

    if (payload.action === "get-status") {
      return jsonResponse({
        status: mapFlashCardGeneratorStatus(credential),
      });
    }

    if (payload.action === "export-credential") {
      if (!credential?.secret_id) {
        throw new HttpError(400, "BYOK_MISSING", "Belum ada BYOK yang bisa di-export.");
      }
      const apiKey = await readVaultSecret(service, credential.secret_id);
      return jsonResponse({
        apiKey,
      });
    }

    if (payload.action === "save-credential") {
      if (typeof payload.apiKey !== "string" || payload.apiKey.trim().length === 0) {
        throw new HttpError(400, "BYOK_REQUIRED", "Gemini API key pribadi wajib diisi.");
      }

      await upsertUserCredential(service, {
        credential,
        userId: user.id,
        apiKey: payload.apiKey,
        model: typeof payload.model === "string" ? payload.model : undefined,
      });

      return jsonResponse({
        status: mapFlashCardGeneratorStatus(await readUserCredential(service, user.id)),
      });
    }

    if (payload.action === "delete-credential") {
      if (credential?.secret_id) {
        await deleteVaultSecret(service, credential.secret_id);
      }

      if (credential?.id) {
        const { error } = await service
          .from("user_ai_credentials")
          .delete()
          .eq("id", credential.id);

        if (error) {
          throw new HttpError(500, "BYOK_DELETE_FAILED", error.message);
        }
      }

      return jsonResponse({
        status: mapFlashCardGeneratorStatus(null),
      });
    }

    if (payload.action === "test-credential") {
      if (!credential?.secret_id) {
        throw new HttpError(400, "BYOK_MISSING", "Belum ada BYOK yang bisa dites.");
      }

      const apiKey = await readVaultSecret(service, credential.secret_id);

      try {
        const testResult = await testGeminiConnection(apiKey, credential.model);
        await service
          .from("user_ai_credentials")
          .update({
            last_validated_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", credential.id);

        return jsonResponse({
          status: mapFlashCardGeneratorStatus(await readUserCredential(service, user.id)),
          testResult,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "BYOK test failed.";
        await service
          .from("user_ai_credentials")
          .update({
            last_error: message,
          })
          .eq("id", credential.id);

        if (isGeminiCredentialError(error)) {
          throw new HttpError(400, "BYOK_INVALID", message);
        }

        throw error;
      }
    }

    if (payload.action === "create-material") {
      const draftInput = validateFlashCardMaterialDraftInput({
        title: typeof payload.title === "string" ? payload.title : "",
        academicGroup: typeof payload.academicGroup === "string" ? payload.academicGroup : "",
        sourceFiles: Array.isArray(payload.sourceFiles) ? payload.sourceFiles : [],
      });
      const { data: materialData, error: materialError } = await service
        .from("flashcard_materials")
        .insert(buildFlashCardMaterialInsert({
          title: draftInput.title,
          academicGroup: draftInput.academicGroup,
          createdBy: user.id,
        }))
        .select("id, status")
        .single();

      if (materialError || !materialData) {
        throw new HttpError(500, "FLASHCARD_MATERIAL_CREATE_FAILED", materialError?.message ?? "Materi flash card belum berhasil dibuat.");
      }

      const { error: sourceError } = await service
        .from("flashcard_source_files")
        .insert(buildFlashCardSourceFileRows({
          materialId: (materialData as { id: string }).id,
          sourceFiles: draftInput.sourceFiles,
        }));

      if (sourceError) {
        throw new HttpError(500, "FLASHCARD_SOURCE_CREATE_FAILED", sourceError.message);
      }

      return jsonResponse({
        materialId: (materialData as { id: string }).id,
        status: (materialData as { status: string }).status,
      });
    }

    if (payload.action === "process-material") {
      if (!credential?.secret_id) {
        throw new HttpError(400, "BYOK_MISSING", "Belum ada BYOK tersimpan untuk flash card.");
      }

      const materialId = typeof payload.materialId === "string" ? payload.materialId : "";
      const material = await loadOwnedMaterial(service, materialId, user.id);

      // Idempotency: If material is already processing and still actively working, do not start a duplicate worker
      if (
        material.status === "processing" &&
        !isProcessingJobStale({
          status: material.status,
          metadata: material.metadata as any,
          updatedAt: material.updated_at,
        })
      ) {
        logSafeTelemetry("process_duplicate_ignored", { materialId });
        return jsonResponse({
          materialId: material.id,
          status: "processing",
          message: "Materi sedang diproses di latar belakang.",
        });
      }

      return await processMaterialGeneration(service, material, credential);
    }

    if (payload.action === "get-material") {
      const materialId = typeof payload.materialId === "string" ? payload.materialId : "";
      let material = await loadOwnedMaterial(service, materialId, user.id);

      // STALE PROCESSING RECOVERY:
      // If worker died (e.g., SIGKILL from Deno resource limit) without executing catch/finally,
      // auto-transition to "failed" after STALE_PROCESSING_TIMEOUT_MS so the frontend leaves infinite loading
      if (
        isProcessingJobStale({
          status: material.status,
          metadata: material.metadata as any,
          updatedAt: material.updated_at,
        })
      ) {
        const timeoutMessage =
          "Pemrosesan flash card terhenti di latar belakang karena batas waktu atau resource runtime terlampaui. Silakan gunakan tombol 'Coba Proses Ulang'.";
        const meta = (material.metadata ?? {}) as Record<string, unknown>;
        const diagnosticPayload = extractStaleRecoveryDiagnostics({
          materialId,
          metadata: material.metadata as any,
        });
        const failureUpdate = {
          status: "failed",
          processing_error: timeoutMessage,
          metadata: {
            ...meta,
            processingJob: undefined,
          },
        };
        const { data: updateData, error: updateError } = await service
          .from("flashcard_materials")
          .update(failureUpdate)
          .eq("id", material.id)
          .eq("status", "processing")
          .select("id, status");

        if (!updateError && updateData && updateData.length > 0) {
          material = {
            ...material,
            status: "failed",
            processing_error: timeoutMessage,
            metadata: failureUpdate.metadata as any,
          };
          logSafeTelemetry("stale_job_recovered", diagnosticPayload);
        } else {
          material = await loadOwnedMaterial(service, materialId, user.id);
        }
      }

      const children = await loadMaterialChildren(service, material.id);

      return jsonResponse({
        detail: mapMaterialDetail({
          material,
          sourceFiles: children.sourceFiles,
          subtopics: children.subtopics,
          cards: children.cards,
        }),
      });
    }

    if (payload.action === "update-material") {
      const materialId = typeof payload.materialId === "string" ? payload.materialId : "";
      const material = await loadOwnedMaterial(service, materialId, user.id);
      assertFlashCardMaterialEditable(material.status);
      const title = typeof payload.title === "string" ? payload.title.trim() : "";


      if (!title) {
        throw new HttpError(400, "FLASHCARD_TITLE_REQUIRED", "Judul materi flash card wajib diisi.");
      }

      const validatedOutput = await replaceMaterialContent(service, {
        ownerId: user.id,
        materialId,
        globalSummary: typeof payload.globalSummary === "string" ? payload.globalSummary : "",
        subtopics: Array.isArray(payload.subtopics) ? payload.subtopics : [],
      });
      const mergedMetadata = handleUpdateMaterialProtectedMetadata(material.metadata, payload);
      const { error: materialError } = await service
        .from("flashcard_materials")
        .update({
          title,
          status: "ready_for_review",
          global_summary: validatedOutput.global_summary,
          processing_error: null,
          metadata: mergedMetadata,
        })
        .eq("id", materialId);

      if (materialError) {
        throw new HttpError(500, "FLASHCARD_MATERIAL_UPDATE_FAILED", materialError.message);
      }

      return jsonResponse({
        materialId,
        status: "ready_for_review",
        metadata: mergedMetadata,
      });
    }

    if (payload.action === "retry-processing") {
      if (!credential?.secret_id) {
        throw new HttpError(400, "BYOK_MISSING", "Belum ada BYOK tersimpan untuk flash card.");
      }

      const materialId = typeof payload.materialId === "string" ? payload.materialId : "";
      const material = await loadOwnedMaterial(service, materialId, user.id);
      assertFlashCardMaterialRetryable(material.status);

      // Idempotency: If material is already processing and still actively working, do not start a duplicate worker
      if (
        material.status === "processing" &&
        !isProcessingJobStale({
          status: material.status,
          metadata: material.metadata as any,
          updatedAt: material.updated_at,
        })
      ) {
        logSafeTelemetry("retry_duplicate_ignored", { materialId });
        return jsonResponse({
          materialId: material.id,
          status: "processing",
          message: "Materi sedang diproses di latar belakang.",
        });
      }

      return await processMaterialGeneration(service, material, credential, { isRetry: true });
    }

    if (payload.action === "publish-material") {
      const materialId = typeof payload.materialId === "string" ? payload.materialId : "";
      const material = await loadOwnedMaterial(service, materialId, user.id);

      assertFlashCardMaterialPublishable(material);

      const children = await loadMaterialChildren(service, material.id);
      await deletePublishedSourceFiles(service, children.sourceFiles);
      const { error } = await service
        .from("flashcard_materials")
        .update(handlePublishMaterial(material))
        .eq("id", material.id);

      if (error) {
        throw new HttpError(500, "FLASHCARD_PUBLISH_FAILED", error.message);
      }

      return jsonResponse({
        materialId: material.id,
        status: "published",
      });
    }

    if (payload.action === "resolve-conflict") {
      const materialId = typeof payload.materialId === "string" ? payload.materialId : "";
      const material = await loadOwnedMaterial(service, materialId, user.id);
      assertFlashCardMaterialEditable(material.status);

      const conflictId = typeof payload.conflictId === "string" ? payload.conflictId.trim() : "";
      if (!conflictId) {
        throw new HttpError(400, "CONFLICT_ID_REQUIRED", "conflictId wajib diisi.");
      }

      const updatedMetadata = handleResolveConflict(material, {
        conflictId,
        resolutionStatus: typeof payload.resolutionStatus === "string" ? payload.resolutionStatus : undefined,
        clinicalClarificationNotes: typeof payload.clinicalClarificationNotes === "string" ? payload.clinicalClarificationNotes : undefined,
        resolvedBy: user.id,
      });

      const { error: updateError } = await service
        .from("flashcard_materials")
        .update({
          metadata: updatedMetadata,
        })
        .eq("id", material.id);

      if (updateError) {
        throw new HttpError(500, "FLASHCARD_CONFLICT_RESOLVE_FAILED", updateError.message);
      }

      return jsonResponse({
        materialId: material.id,
        metadata: updatedMetadata,
      });
    }

    if (payload.action === "audit-repair-material") {
      if (!credential?.secret_id) {
        throw new HttpError(400, "BYOK_MISSING", "Belum ada BYOK tersimpan untuk flash card.");
      }

      const materialId = typeof payload.materialId === "string" ? payload.materialId : "";
      const material = await loadOwnedMaterial(service, materialId, user.id);
      assertFlashCardMaterialEditable(material.status);

      const [children, apiKey] = await Promise.all([
        loadMaterialChildren(service, material.id),
        readVaultSecret(service, credential.secret_id),
      ]);

      const candidateCards: CandidateCard[] = children.cards.map((c) => ({
        id: c.id,
        front_text: c.front_text,
        back_text: c.back_text,
        qualityStatus: ((c.metadata as any)?.qualityStatus ?? "ACCEPTED") as any,
        sources: (c.metadata as any)?.sources ?? [],
        metadata: (c.metadata as any) ?? { sources: [] },
      }));

      const model = normalizeAiModel(credential.model);
      const conflicts = ((material.metadata as any)?.sourceConflicts ?? []) as SourceConflictRecord[];

      const reviewResult = await reviewCandidateCards({
        cards: candidateCards,
        conflicts,
        apiKey,
        model,
      });

      const defectiveCards = reviewResult.reviewedCards.filter(
        (c) => c.qualityStatus === "REPAIRABLE_DEFECT",
      );

      let finalCards = reviewResult.reviewedCards;
      let repairResult: any = { repairedCount: 0, droppedCount: 0 };
      if (defectiveCards.length > 0) {
        repairResult = await repairDefectiveCards({
          defectiveCards,
          cards: [...reviewResult.reviewedCards],
          apiKey,
          model,
        });
        finalCards = repairResult.allCards ?? reviewResult.reviewedCards;
      }

      const cardLookup = new Map(finalCards.map((c) => [c.id, c]));
      const subtopicsPayload = children.subtopics.map((subtopic) => ({
        title: subtopic.title,
        summary: subtopic.summary,
        cards: children.cards
          .filter((c) => c.subtopic_id === subtopic.id)
          .map((c) => {
            const updated = cardLookup.get(c.id);
            return {
              front_text: updated?.front_text ?? c.front_text,
              back_text: updated?.back_text ?? c.back_text,
              metadata: updated?.metadata ?? c.metadata ?? {},
            };
          }),
      }));

      await replaceMaterialContent(service, {
        ownerId: user.id,
        materialId: material.id,
        globalSummary: material.global_summary ?? "Ringkasan Materi",
        subtopics: subtopicsPayload,
      });

      const existingMeta = (material.metadata ?? {}) as any;
      const checkpoint = existingMeta.pipelineCheckpoint ?? existingMeta.pipeline_checkpoint;
      const updatedMeta = validateMaterialMetadata({
        ...existingMeta,
        ...(checkpoint ? { pipelineCheckpoint: checkpoint } : {}),
        rejectedAuditTrail: reviewResult.rejectedAuditTrail.slice(0, 10),
        qualityReport: {
          ...(existingMeta.qualityReport ?? {}),
          acceptedCount: finalCards.filter((c) => c.qualityStatus === "ACCEPTED").length,
          repairedCount: (existingMeta.qualityReport?.repairedCount ?? 0) + repairResult.repairedCount,
        },
      });

      const { error: materialError } = await service
        .from("flashcard_materials")
        .update({
          metadata: updatedMeta,
        })
        .eq("id", material.id);

      if (materialError) {
        throw new HttpError(500, "FLASHCARD_AUDIT_REPAIR_FAILED", materialError.message);
      }

      return jsonResponse({
        materialId: material.id,
        status: material.status,
        metadata: updatedMeta,
      });
    }

    if (payload.action === "delete-material") {
      const materialId = typeof payload.materialId === "string" ? payload.materialId : "";
      const material = await loadOwnedMaterial(service, materialId, user.id);
      const children = await loadMaterialChildren(service, material.id);

      const bucketToPaths = new Map<string, string[]>();
      for (const sourceFile of children.sourceFiles) {
        bucketToPaths.set(sourceFile.storage_bucket, [
          ...(bucketToPaths.get(sourceFile.storage_bucket) ?? []),
          sourceFile.storage_path,
        ]);
      }

      for (const [bucket, paths] of bucketToPaths.entries()) {
        await service.storage.from(bucket).remove(paths);
      }

      const { error } = await service
        .from("flashcard_materials")
        .delete()
        .eq("id", material.id);

      if (error) {
        throw new HttpError(500, "FLASHCARD_DELETE_FAILED", error.message);
      }

      return jsonResponse({
        materialId: material.id,
        status: "deleted",
      });
    }

    throw new HttpError(400, "INVALID_ACTION", "Aksi flash card generator tidak dikenali.");
  } catch (error) {
    if (error instanceof FlashCardManagerAccessError) {
      return jsonResponse(
        {
          error: "FORBIDDEN",
          message: error.message,
        },
        403,
      );
    }

    if (error instanceof HttpError) {
      return jsonResponse(
        {
          error: error.code,
          message: error.message,
        },
        error.status,
      );
    }

    return jsonResponse(
      {
        error: "UNEXPECTED_ERROR",
        message: error instanceof Error ? error.message : "Unexpected flash card generator error.",
      },
      500,
    );
  }
});
