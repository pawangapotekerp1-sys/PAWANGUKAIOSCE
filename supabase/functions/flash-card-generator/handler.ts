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

export function assertFlashCardMaterialRetryable(status: string) {
  if (status === "published") {
    throw new Error("Materi flash card yang sudah dipublikasikan tidak bisa diproses ulang.");
  }
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
  apiKey,
  model,
  userId,
}: {
  apiKey: string;
  model: string;
  userId: string;
}) {
  return {
    user_id: userId,
    provider: "gemini",
    model: model.trim() || "gemini-3.7-flash",
    secret_hint: `â€¢â€¢â€¢â€¢${apiKey.trim().slice(-4)}`,
    last_error: null,
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
