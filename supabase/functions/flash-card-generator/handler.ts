import {
  assertFlashCardOutputQuality,
  normalizeFlashCardAcademicGroup,
  validateFlashCardOutput,
  validateMaterialMetadata,
  type CardMetadata,
  type FlashCardAcademicGroup,
  type FlashCardOutput,
  type MaterialMetadata,
  type SourceConflictRecord,
} from "../_shared/flash-card.ts";

export class FlashCardManagerAccessError extends Error {}

export type FlashCardManagerRole = "admin" | "mentor" | "pro" | "pendaftar_baru";

export type FlashCardSourceInput = {
  fileKind: "transcript" | "slide_pdf";
  storageBucket: string;
  storagePath: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
};

const SUPPORTED_TRANSCRIPT_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
]);

export const GLOBAL_AI_CREDENTIAL_ACTIONS = new Set([
  "get-status",
  "export-credential",
  "save-credential",
  "delete-credential",
  "test-credential",
]);

export function isGlobalAiCredentialAction(action: unknown): boolean {
  return typeof action === "string" && GLOBAL_AI_CREDENTIAL_ACTIONS.has(action);
}

export function ensureFlashCardManagerAccess(role: FlashCardManagerRole) {
  if (role !== "admin" && role !== "mentor") {
    throw new FlashCardManagerAccessError("Fitur flash card hanya bisa diakses admin atau mentor.");
  }
}

export function assertFlashCardMaterialEditable(status: string) {
  if (status === "published") {
    throw new Error("Materi flash card yang sudah dipublikasikan tidak bisa diedit langsung.");
  }
}

export const STALE_PROCESSING_TIMEOUT_MS = 180_000;

export function isProcessingJobStale(params: {
  status: string;
  metadata?: Record<string, unknown> | null;
  updatedAt?: string | null;
  now?: number;
  timeoutMs?: number;
}): boolean {
  if (params.status !== "processing") {
    return false;
  }
  const timeoutMs = params.timeoutMs ?? STALE_PROCESSING_TIMEOUT_MS;
  const now = params.now ?? Date.now();
  const processingJob = params.metadata?.processingJob as { heartbeatAt?: string; startedAt?: string } | undefined;
  const lastActiveTime = processingJob?.heartbeatAt
    ? new Date(processingJob.heartbeatAt).getTime()
    : (params.updatedAt ? new Date(params.updatedAt).getTime() : 0);

  if (!lastActiveTime) {
    return false;
  }
  return (now - lastActiveTime) > timeoutMs;
}

export function assertFlashCardMaterialRetryable(status: string) {
  if (status === "published") {
    throw new Error("Materi flash card yang sudah dipublikasikan tidak bisa diproses ulang.");
  }
}

export function canRetryFlashCardMaterial(params: {
  status: string;
  metadata?: Record<string, unknown> | null;
  updatedAt?: string | null;
  now?: number;
  timeoutMs?: number;
}): boolean {
  if (params.status === "published") {
    return false;
  }
  if (params.status === "processing") {
    return isProcessingJobStale(params);
  }
  return true;
}

export function canContinueFlashCardMaterial(params: {
  status: string;
  metadata?: Record<string, unknown> | null;
  updatedAt?: string | null;
  now?: number;
  timeoutMs?: number;
}): boolean {
  if (params.status === "published") {
    return false;
  }
  const processingJob = params.metadata?.processingJob as { jobId?: string } | undefined;
  if (params.status === "processing" && processingJob?.jobId && !isProcessingJobStale(params)) {
    return false;
  }
  return true;
}

export function shouldApplyStaleRecovery(params: {
  status: string;
  metadata?: Record<string, unknown> | null;
  updatedAt?: string | null;
  now?: number;
  timeoutMs?: number;
}): boolean {
  return isProcessingJobStale(params);
}

export type StaleRecoveryDiagnostics = {
  materialId: string;
  jobId: string | null;
  lastStage: string | null;
  lastHeartbeatAt: string | null;
};

export function extractStaleRecoveryDiagnostics(params: {
  materialId: string;
  metadata?: Record<string, unknown> | null;
}): StaleRecoveryDiagnostics {
  const processingJob = params.metadata?.processingJob as {
    jobId?: string | null;
    stage?: string | null;
    heartbeatAt?: string | null;
  } | undefined;

  return {
    materialId: params.materialId,
    jobId: typeof processingJob?.jobId === "string" ? processingJob.jobId : null,
    lastStage: typeof processingJob?.stage === "string" ? processingJob.stage : null,
    lastHeartbeatAt: typeof processingJob?.heartbeatAt === "string" ? processingJob.heartbeatAt : null,
  };
}

export const MAX_STALE_AUTO_RECOVERIES = 2;

export function buildStaleJobRecoveryUpdate(params: {
  metadata?: Record<string, unknown> | null;
  timeoutMessage: string;
  maxAutoRecoveries?: number;
}): {
  autoResumed: boolean;
  updatePayload: {
    status: "processing" | "failed";
    processing_error: string | null;
    metadata: Record<string, unknown>;
  };
} {
  const meta = (params.metadata ?? {}) as Record<string, unknown>;
  const maxAutoRecoveries = params.maxAutoRecoveries ?? MAX_STALE_AUTO_RECOVERIES;
  const currentRecoveryCount =
    typeof meta.staleRecoveryCount === "number" && Number.isFinite(meta.staleRecoveryCount)
      ? Math.max(0, Math.floor(meta.staleRecoveryCount))
      : 0;

  const rawCp = (meta.pipelineCheckpoint ?? meta.pipeline_checkpoint) as
    | {
        completedStages?: unknown;
        stageArtifacts?: Record<string, unknown> | null;
      }
    | undefined;

  const completedStages = Array.isArray(rawCp?.completedStages) ? rawCp.completedStages : [];
  const partialCleaning = rawCp?.stageArtifacts?.["transcript_cleaning_partial"] as
    | { completedSegments?: unknown }
    | undefined;
  const hasPartialSegments =
    Array.isArray(partialCleaning?.completedSegments) &&
    partialCleaning.completedSegments.length > 0;
  const hasCheckpointProgress = completedStages.length > 0 || hasPartialSegments;

  if (hasCheckpointProgress && currentRecoveryCount < maxAutoRecoveries) {
    return {
      autoResumed: true,
      updatePayload: {
        status: "processing",
        processing_error: null,
        metadata: {
          ...meta,
          processingJob: undefined,
          staleRecoveryCount: currentRecoveryCount + 1,
        },
      },
    };
  }

  return {
    autoResumed: false,
    updatePayload: {
      status: "failed",
      processing_error: params.timeoutMessage,
      metadata: {
        ...meta,
        processingJob: undefined,
      },
    },
  };
}

export interface MaterialClaimConditions {
  statusFilter: { type: "eq"; value: string } | { type: "in"; value: string[] };
  jobIdFilter?: { type: "eq"; value: string } | { type: "is_null" };
}

export function determineMaterialClaimConditions(params: {
  isRetry?: boolean;
  status: string;
  metadata?: Record<string, unknown> | null;
}): MaterialClaimConditions {
  if (params.isRetry) {
    if (params.status === "processing") {
      const oldJobId = (params.metadata as any)?.processingJob?.jobId;
      if (typeof oldJobId === "string" && oldJobId.trim()) {
        return {
          statusFilter: { type: "eq", value: "processing" },
          jobIdFilter: { type: "eq", value: oldJobId.trim() },
        };
      }
      return {
        statusFilter: { type: "eq", value: "processing" },
        jobIdFilter: { type: "is_null" },
      };
    }
    return {
      statusFilter: { type: "eq", value: params.status },
    };
  }
  return {
    statusFilter: { type: "in", value: ["draft", "failed"] },
  };
}

export interface RateLimitMetadataUpdateResult {
  [key: string]: unknown;
  pipelineCheckpoint?: unknown;
  processingJob?: undefined;
  rateLimitInfo: {
    rateLimitedAt: string;
    retryAfterSeconds: number;
    message: string;
    consecutiveCount: number;
    isCircuitBroken: boolean;
    errorCategory?: string;
  };
}

export function buildRateLimitMetadataUpdate(params: {
  currentMetadata?: Record<string, unknown> | null;
  checkpointToPreserve?: unknown;
  retryAfterSeconds?: number;
  message?: string;
  now?: string;
  errorCategory?: string;
}): RateLimitMetadataUpdateResult {
  const currentMeta = (params.currentMetadata ?? {}) as Record<string, unknown>;
  const previousRateLimit = currentMeta.rateLimitInfo as { consecutiveCount?: number } | undefined;
  const previousCount = typeof previousRateLimit?.consecutiveCount === "number" ? previousRateLimit.consecutiveCount : 0;
  const consecutiveCount = previousCount + 1;
  const isCircuitBroken = consecutiveCount >= 3;
  const defaultRetry = params.errorCategory === "GEMINI_PROVIDER_UNAVAILABLE" ? 30 : 60;
  const retryAfterSeconds = params.retryAfterSeconds ?? defaultRetry;
  const defaultMessage = params.errorCategory === "GEMINI_PROVIDER_UNAVAILABLE"
    ? "Layanan Gemini sedang mengalami gangguan sementara dari Google (503)."
    : "Batas kuota Gemini tercapai.";
  const message = params.message ?? defaultMessage;

  return {
    ...currentMeta,
    ...(params.checkpointToPreserve ? { pipelineCheckpoint: params.checkpointToPreserve } : {}),
    processingJob: undefined,
    rateLimitInfo: {
      rateLimitedAt: params.now ?? new Date().toISOString(),
      retryAfterSeconds,
      message,
      consecutiveCount,
      isCircuitBroken,
      ...(params.errorCategory ? { errorCategory: params.errorCategory } : {}),
    },
  };
}


export function buildStageCheckpointMetadataUpdate(params: {
  currentMetadata?: Record<string, unknown> | null;
  checkpoint: unknown;
  jobId: string;
  jobStartTime: string;
  stage: string;
  timestamp?: string;
}): Record<string, unknown> {
  const stageNow = params.timestamp ?? new Date().toISOString();
  const liveMeta = (params.currentMetadata ?? {}) as Record<string, unknown>;
  const currentJob = (liveMeta.processingJob ?? {}) as Record<string, unknown>;

  return {
    ...liveMeta,
    pipelineCheckpoint: params.checkpoint,
    processingJob: {
      jobId: params.jobId,
      startedAt: typeof currentJob.startedAt === "string" ? currentJob.startedAt : params.jobStartTime,
      heartbeatAt: stageNow,
      stage: params.stage,
    },
  };
}

export function validateFlashCardMaterialDraftInput(input: {
  title: string;
  academicGroup: string;
  sourceFiles: FlashCardSourceInput[];
}) {
  const title = input.title.trim();
  const academicGroup = normalizeFlashCardAcademicGroup(input.academicGroup);
  const sourceFiles = input.sourceFiles.map((sourceFile) => ({
    ...sourceFile,
    storageBucket: sourceFile.storageBucket.trim(),
    storagePath: sourceFile.storagePath.trim(),
    originalFileName: sourceFile.originalFileName.trim(),
    mimeType: sourceFile.mimeType.trim(),
  }));

  if (!title) {
    throw new Error("Judul materi flash card wajib diisi.");
  }

  const transcriptFiles = sourceFiles.filter((sourceFile) => sourceFile.fileKind === "transcript");
  const slidePdfFiles = sourceFiles.filter((sourceFile) => sourceFile.fileKind === "slide_pdf");

  if (transcriptFiles.length !== 1 || slidePdfFiles.length !== 1) {
    throw new Error("Draft flash card wajib berisi tepat satu transcript dan satu slide PDF.");
  }

  if (slidePdfFiles[0]?.mimeType !== "application/pdf") {
    throw new Error("Slide source harus berupa file PDF.");
  }

  if (!SUPPORTED_TRANSCRIPT_MIME_TYPES.has(transcriptFiles[0]?.mimeType ?? "")) {
    throw new Error("Transcript source harus berupa file TXT atau Markdown.");
  }

  return {
    title,
    academicGroup,
    sourceFiles,
  };
}

export function buildFlashCardMaterialInsert({
  title,
  academicGroup,
  createdBy,
}: {
  title: string;
  academicGroup: string;
  createdBy: string;
}) {
  const normalizedGroup = normalizeFlashCardAcademicGroup(academicGroup);

  return {
    title: title.trim(),
    academic_group: normalizedGroup,
    status: "draft",
    global_summary: null,
    processing_error: null,
    created_by: createdBy,
  };
}

export function buildFlashCardSourceFileRows({
  materialId,
  sourceFiles,
}: {
  materialId: string;
  sourceFiles: FlashCardSourceInput[];
}) {
  return sourceFiles.map((sourceFile) => ({
    material_id: materialId,
    file_kind: sourceFile.fileKind,
    storage_bucket: sourceFile.storageBucket,
    storage_path: sourceFile.storagePath,
    original_file_name: sourceFile.originalFileName,
    mime_type: sourceFile.mimeType,
    size_bytes: sourceFile.sizeBytes,
    extraction_status: "pending",
    delete_after_publish: true,
  }));
}

export function buildFlashCardFailureUpdate(message: string) {
  return {
    status: "failed",
    processing_error: message,
  };
}

export function buildFlashCardPublishUpdate(publishedAt: string) {
  return {
    status: "published",
    published_at: publishedAt,
    processing_error: null,
  };
}

export function buildFlashCardReadyForReviewUpdate(globalSummary: string) {
  return {
    status: "ready_for_review",
    global_summary: globalSummary,
    processing_error: null,
    published_at: null,
  };
}

export function buildFlashCardCredentialWritePayload({
  lastValidatedAt,
  lastError,
  apiKey,
  model,
  userId,
}: {
  apiKey: string;
  model: string;
  userId: string;
  lastValidatedAt?: string | null;
  lastError?: string | null;
}) {
  return {
    user_id: userId,
    provider: "gemini",
    model: model.trim() || "gemini-3.7-flash",
    secret_hint: `â€¢â€¢â€¢â€¢${apiKey.trim().slice(-4)}`,
    ...(lastValidatedAt !== undefined ? { last_validated_at: lastValidatedAt } : {}),
    last_error: lastError ?? null,
  };
}

export function buildFlashCardGenerationPrompt({
  title,
  academicGroup,
  transcriptText,
}: {
  title: string;
  academicGroup: FlashCardAcademicGroup;
  transcriptText: string;
}) {
  return [
    "You are an advanced AI learning architect specializing in pharmaceutical sciences.",
    "CRITICAL INSTRUCTION: ALL generated content (summaries, titles, and flashcard texts) MUST be written in formal Indonesian (Bahasa Indonesia). Do NOT generate the content in English.",
    "Comprehensively analyze the provided transcript and slide content.",
    `Material Title: ${title}`,
    `Academic Group: ${academicGroup}`,
    "Deconstruct the material into highly coherent subtopics.",
    "For each subtopic, generate a concise summary and multiple high-yield recall flashcards.",
    "Each flashcard must contain a 'front_text' (prompt/question) and 'back_text' (answer/explanation) that are concise and unambiguous.",
    "The response MUST be purely structural JSON matching this exact shape: { global_summary, subtopics: [{ title, summary, cards: [{ front_text, back_text }] }] }.",
    "Do not include any markdown formatting, conversational prose, or narrative outside of the JSON payload.",
    `Source Transcript:\n${transcriptText}`,
  ].join("\n\n");
}

export function createFlashCardResponseSchema() {
  return {
    type: "object",
    required: ["global_summary", "subtopics"],
    properties: {
      global_summary: {
        type: "string",
      },
      subtopics: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["title", "summary", "cards"],
          properties: {
            title: {
              type: "string",
            },
            summary: {
              type: "string",
            },
            cards: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["front_text", "back_text"],
                properties: {
                  front_text: {
                    type: "string",
                  },
                  back_text: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

export function buildFlashCardContentRows({
  materialId,
  output,
}: {
  materialId: string;
  output: FlashCardOutput;
}) {
  const subtopics = output.subtopics.map((subtopic, index) => ({
    material_id: materialId,
    title: subtopic.title.trim(),
    summary: subtopic.summary.trim(),
    sort_order: index + 1,
  }));

  const cardsBySubtopic = output.subtopics.map((subtopic) =>
    subtopic.cards.map((card, index) => ({
      front_text: card.front_text.trim(),
      back_text: card.back_text.trim(),
      sort_order: index + 1,
    })));

  return {
    subtopics,
    cardsBySubtopic,
  };
}

export function validateGeneratedFlashCardOutput(value: unknown) {
  try {
    const output = validateFlashCardOutput(value);

    return assertFlashCardOutputQuality(output);
  } catch {
    throw new Error(
      "Hasil AI belum cukup rapi untuk direview. Coba ulang proses atau gunakan file sumber yang lebih jelas.",
    );
  }
}

export function validateFlashCardReviewUpdate(input: {
  globalSummary: string;
  subtopics: Array<{
    title: string;
    summary: string;
    cards: Array<{
      frontText: string;
      backText: string;
    }>;
  }>;
}) {
  return validateFlashCardOutput({
    global_summary: input.globalSummary,
    subtopics: input.subtopics.map((subtopic) => ({
      title: subtopic.title,
      summary: subtopic.summary,
      cards: subtopic.cards.map((card) => ({
        front_text: card.frontText ?? (card as any).front_text ?? "",
        back_text: card.backText ?? (card as any).back_text ?? "",
        metadata: (card as any).metadata,

      })),
    })),
  });
}


export function assertFlashCardMaterialPublishable(material: {
  id: string;
  status: string;
  metadata?: any;
}) {
  if (material.status !== "ready_for_review") {
    throw new Error("Materi flash card belum siap dipublikasikan.");
  }

  const conflicts = Array.isArray(material.metadata?.sourceConflicts)
    ? material.metadata.sourceConflicts
    : [];

  const hasUnresolvedCriticalOrHigh = conflicts.some(
    (c: any) =>
      (c.severity === "critical" || c.severity === "high") &&
      c.resolutionStatus === "unresolved",
  );

  if (hasUnresolvedCriticalOrHigh) {
    throw new Error(
      "Materi memiliki konflik sumber berderajat critical/high yang belum diselesaikan.",
    );
  }

  return true;
}

export function handlePublishMaterial(material: any) {
  assertFlashCardMaterialPublishable(material);
  return buildFlashCardPublishUpdate(new Date().toISOString());
}

export function handleResolveConflict(
  material: any,
  payload: {
    conflictId: string;
    resolutionStatus?: string;
    clinicalClarificationNotes?: string;
    resolvedBy?: string;
  },
) {
  const metadata = (material.metadata ?? {}) as Record<string, any>;
  const conflicts = Array.isArray(metadata.sourceConflicts)
    ? [...metadata.sourceConflicts]
    : [];

  const conflictIndex = conflicts.findIndex(
    (c: any) => c.conflictId === payload.conflictId,
  );

  if (conflictIndex === -1) {
    throw new Error(`Konflik sumber dengan id "${payload.conflictId}" tidak ditemukan.`);
  }

  const existingConflict = conflicts[conflictIndex];
  const updatedConflict = {
    ...existingConflict,
    resolutionStatus: payload.resolutionStatus ?? "mentor_clarified",
    clinicalClarificationNotes:
      payload.clinicalClarificationNotes !== undefined
        ? payload.clinicalClarificationNotes
        : existingConflict.clinicalClarificationNotes,
    resolvedAt: new Date().toISOString(),
    resolvedBy: payload.resolvedBy ?? null,
  };

  conflicts[conflictIndex] = updatedConflict;

  const unresolvedCriticalOrHigh = conflicts.filter(
    (c: any) =>
      (c.severity === "critical" || c.severity === "high") &&
      c.resolutionStatus === "unresolved",
  ).length;

  const qualityReport = metadata.qualityReport
    ? {
        ...metadata.qualityReport,
        unresolvedCriticalOrHighConflicts: unresolvedCriticalOrHigh,
      }
    : undefined;

  return {
    ...metadata,
    sourceConflicts: conflicts,
    qualityReport,
  };
}

export function handleUpdateMaterialProtectedMetadata(
  existingMetadata: any,
  incomingPayload: any,
) {
  const existing = existingMetadata ?? {};
  const incoming = incomingPayload ?? {};

  const mentorCustomNotes =
    typeof incoming.mentorCustomNotes === "string"
      ? incoming.mentorCustomNotes
      : typeof incoming.metadata?.mentorCustomNotes === "string"
      ? incoming.metadata.mentorCustomNotes
      : existing.mentorCustomNotes;

  return {
    ...existing,
    pipelineVersion: existing.pipelineVersion ?? "gemini-3.8-source-aware-v1",
    modelUsed: existing.modelUsed ?? "gemini-3.8-flash",
    sourceConflicts: existing.sourceConflicts ?? [],
    tokenUsage: existing.tokenUsage ?? {},
    rejectedAuditTrail: existing.rejectedAuditTrail ?? [],
    qualityReport: existing.qualityReport ?? {},
    pipelineCheckpoint: existing.pipelineCheckpoint ?? existing.pipeline_checkpoint,
    executionDurationMs: existing.executionDurationMs,
    mentorCustomNotes,
  };
}

export function resolveStepGroupFromCheckpoint(
  explicitStepGroup: string | undefined,
  checkpoint: { completedStages?: unknown } | null | undefined,
): "cleaning" | "generation" | "review" {
  if (
    explicitStepGroup === "cleaning" ||
    explicitStepGroup === "generation" ||
    explicitStepGroup === "review"
  ) {
    return explicitStepGroup;
  }

  const completedStages = Array.isArray(checkpoint?.completedStages)
    ? (checkpoint.completedStages as string[])
    : [];

  if (!completedStages.includes("transcript_cleaning")) {
    return "cleaning";
  }
  if (!completedStages.includes("candidate_generation")) {
    return "generation";
  }
  return "review";
}

export function sanitizeMaterialMetadataForClient(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  const rawCp = (metadata.pipelineCheckpoint ?? metadata.pipeline_checkpoint) as
    | Record<string, unknown>
    | undefined;
  if (!rawCp || typeof rawCp !== "object") {
    return { ...metadata };
  }

  const stageArtifacts =
    rawCp.stageArtifacts && typeof rawCp.stageArtifacts === "object"
      ? (rawCp.stageArtifacts as Record<string, any>)
      : {};
  const partialCleaning = stageArtifacts["transcript_cleaning_partial"];
  const completedSegmentsCount = Array.isArray(partialCleaning?.completedSegments)
    ? partialCleaning.completedSegments.length
    : undefined;
  const totalSegmentsCount =
    typeof partialCleaning?.totalSegmentsCount === "number"
      ? partialCleaning.totalSegmentsCount
      : undefined;

  const sanitizedCheckpoint: Record<string, unknown> = {
    ...rawCp,
    stageArtifacts: {},
    ...(typeof completedSegmentsCount === "number"
      ? {
          cleaningProgress: {
            completedSegmentsCount,
            ...(typeof totalSegmentsCount === "number" ? { totalSegmentsCount } : {}),
          },
        }
      : {}),
  };

  const result: Record<string, unknown> = {
    ...metadata,
    pipelineCheckpoint: sanitizedCheckpoint,
  };
  if ("pipeline_checkpoint" in result) {
    delete result.pipeline_checkpoint;
  }
  return result;
}


export function sanitizeCredentialErrorMessage(
  value: string,
  rawApiKey?: string,
): string {
  if (!value || typeof value !== "string") {
    return "";
  }

  let sanitized = value;
  const trimmedKey = typeof rawApiKey === "string" ? rawApiKey.trim() : "";
  if (trimmedKey.length > 0) {
    sanitized = sanitized.split(trimmedKey).join("[REDACTED_API_KEY]");
    const encodedKey = encodeURIComponent(trimmedKey);
    if (encodedKey && encodedKey !== trimmedKey) {
      sanitized = sanitized.split(encodedKey).join("[REDACTED_API_KEY]");
    }
  }

  return sanitized
    .replace(/AIza[0-9A-Za-z-_]{4,}/gi, "[REDACTED_API_KEY]")
    .replace(
      /(?:x-goog-api-key|authorization|api[-_]?key)\s*[:=]\s*(?:bearer\s+)?[^\s,"';&]+/gi,
      "[REDACTED_HEADER]",
    )
    .replace(/\bbearer\s+[^\s,"';&]+/gi, "[REDACTED_TOKEN]")
    .replace(/(?:key|token|bearer)=[^\s&"']+/gi, "[REDACTED]");
}

export function classifyCredentialValidationError(
  error: unknown,
  rawApiKey?: string,
): {
  kind: "invalid" | "transient" | "other";
  status: number | undefined;
  message: string;
} {
  const rawMessage =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : "BYOK validation failed.";
  const message = sanitizeCredentialErrorMessage(rawMessage, rawApiKey);
  const status =
    typeof (error as any)?.status === "number"
      ? ((error as any).status as number)
      : typeof (error as any)?.diagnostics?.rawStatus === "number"
      ? ((error as any).diagnostics.rawStatus as number)
      : undefined;
  const code = typeof (error as any)?.code === "string" ? (error as any).code : undefined;
  const category =
    typeof (error as any)?.diagnostics?.category === "string"
      ? (error as any).diagnostics.category
      : undefined;
  const errName = typeof (error as any)?.name === "string" ? (error as any).name : "";

  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    code === "GEMINI_AUTHENTICATION_FAILED" ||
    code === "GEMINI_REQUEST_INVALID" ||
    code === "GEMINI_MODEL_UNAVAILABLE" ||
    category === "GEMINI_AUTHENTICATION_FAILED" ||
    category === "GEMINI_REQUEST_INVALID" ||
    category === "GEMINI_MODEL_UNAVAILABLE"
  ) {
    return { kind: "invalid", status, message };
  }

  if (
    status === 408 ||
    status === 429 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    code === "GEMINI_PROVIDER_UNAVAILABLE" ||
    code === "GEMINI_RATE_LIMITED" ||
    code === "GEMINI_TOKEN_LIMITED" ||
    code === "GEMINI_QUOTA_EXHAUSTED" ||
    category === "GEMINI_PROVIDER_UNAVAILABLE" ||
    category === "GEMINI_RATE_LIMITED" ||
    category === "GEMINI_TOKEN_LIMITED" ||
    category === "GEMINI_QUOTA_EXHAUSTED" ||
    errName === "TimeoutError" ||
    errName === "AbortError" ||
    /timeout|timed out|aborted|overloaded|high demand|unavailable|rate limit|too many requests|quota/i.test(
      rawMessage,
    )
  ) {
    return { kind: "transient", status, message };
  }

  return { kind: "other", status, message };
}
