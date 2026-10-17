import { z } from "npm:zod";

export const flashCardAcademicGroupSchema = z.enum([
  "pharmaceutical_science",
  "clinical_science",
  "social_behavioral_and_administration",
]);

export const CardSourceReferenceSchema = z.object({
  sourceId: z.string().trim().min(1),
  sourceType: z.enum(["slide_pdf", "transcript"]),
  provenanceStatus: z.enum(["verified_exact", "semantic_match", "unanchored"]),
  location: z.object({
    pdfPageIndex: z.number().int().positive().nullable(),
    printedSlideNumber: z.number().int().positive().nullable().optional(),
    segmentId: z.string().trim().nullable().optional(),
    textQuote: z.string().trim().max(500),
  }),
  alignmentConfidence: z.enum(["high", "medium", "low"]),
  confidenceReason: z.string().trim().min(1),
});
export const cardSourceReferenceSchema = CardSourceReferenceSchema;

export const CardClinicalVerificationSchema = z.object({
  status: z
    .enum([
      "not_assessed",
      "source_supported_only",
      "externally_verified",
      "clinical_review_required",
    ])
    .default("not_assessed"),
  notes: z.string().trim().nullable().optional(),
});
export const cardClinicalVerificationSchema = CardClinicalVerificationSchema;

export const CardMetadataSchema = z.object({
  sources: z.array(CardSourceReferenceSchema).default([]),
  clinicalVerification: CardClinicalVerificationSchema.default({
    status: "not_assessed",
  }),
  qualityStatus: z
    .enum(["ACCEPTED", "REPAIRABLE_DEFECT", "SUBSTANTIVE_CONFLICT", "UNSUPPORTED_CLAIM"])
    .default("ACCEPTED"),
  conflictRefId: z.string().trim().nullable().optional(),
  cardType: z.string().trim().optional(),
  mentorCustomNotes: z.string().trim().optional(),
});
export const cardMetadataSchema = CardMetadataSchema;

export const SourceConflictRecordSchema = z.object({
  conflictId: z.string().trim().min(1),
  conceptId: z.string().trim().min(1),
  category: z.enum([
    "dosage_discrepancy",
    "contraindication_mismatch",
    "drug_identity",
    "formula_conflict",
    "clinical_guideline",
  ]),
  severity: z.enum(["critical", "high", "moderate"]),
  slideEvidence: z.object({
    pdfPageIndex: z.number().int().positive().nullable(),
    printedSlideNumber: z.number().int().positive().nullable().optional(),
    exactQuote: z.string().trim().max(500),
  }),
  transcriptEvidence: z.object({
    segmentId: z.string().trim().min(1),
    exactQuote: z.string().trim().max(500),
  }),
  distinctionType: z.literal("substantive_contradiction").default("substantive_contradiction"),
  resolutionStatus: z
    .enum(["unresolved", "mentor_clarified", "externally_verified"])
    .default("unresolved"),
  clinicalClarificationNotes: z.string().trim().nullable().optional(),
  resolvedAt: z.string().nullable().optional(),
  resolvedBy: z.string().trim().nullable().optional(),
});
export const sourceConflictRecordSchema = SourceConflictRecordSchema;

export const StageTokenMetricsSchema = z.object({
  isAvailable: z.boolean(),
  promptTokenCount: z.number().int().nullable().optional(),
  candidatesTokenCount: z.number().int().nullable().optional(),
  totalTokenCount: z.number().int().nullable().optional(),
  thoughtsTokenCount: z.number().int().nullable().optional(),
  statusText: z.string().optional(),
});
export const stageTokenMetricsSchema = StageTokenMetricsSchema;

export const MaterialMetadataSchema = z.object({
  pipelineVersion: z.string().default("gemini-3.8-source-aware-v1"),
  modelUsed: z.string().default("gemini-3.8-flash"),
  executionDurationMs: z.number().nonnegative().optional(),
  pipelineCheckpoint: z.record(z.string(), z.unknown()).optional(),
  tokenUsage: z.record(z.string(), StageTokenMetricsSchema).optional(),
  qualityReport: z
    .object({
      totalCardsGenerated: z.number().int().nonnegative().optional(),
      acceptedCount: z.number().int().nonnegative().optional(),
      repairedCount: z.number().int().nonnegative().optional(),
      droppedCount: z.number().int().nonnegative().optional(),
      conflictsCount: z.number().int().nonnegative().optional(),
      unresolvedCriticalOrHighConflicts: z.number().int().nonnegative().optional(),
    })
    .optional(),
  sourceConflicts: z.array(SourceConflictRecordSchema).default([]),
  rejectedAuditTrail: z
    .array(
      z.object({
        draftFront: z.string().trim().max(200),
        rejectionReason: z.string().trim().max(300),
        triggerSourceId: z.string().trim().optional(),
      }),
    )
    .max(10)
    .default([]),
});
export const materialMetadataSchema = MaterialMetadataSchema;

export const flashCardItemSchema = z.object({
  front_text: z.string().trim().min(1, "Flash card front text is required."),
  back_text: z.string().trim().min(1, "Flash card back text is required."),
  metadata: CardMetadataSchema.optional(),
});

export const flashCardSubtopicSchema = z.object({
  title: z.string().trim().min(1, "Subtopic title is required."),
  summary: z.string().trim().min(1, "Subtopic summary is required."),
  cards: z.array(flashCardItemSchema).min(1, "Each subtopic requires at least one card."),
});

export const flashCardOutputSchema = z.object({
  global_summary: z.string().trim().min(1, "Global summary is required."),
  subtopics: z.array(flashCardSubtopicSchema).min(1, "At least one subtopic is required."),
});

export type FlashCardAcademicGroup = z.infer<typeof flashCardAcademicGroupSchema>;
export type CardSourceReference = z.infer<typeof CardSourceReferenceSchema>;
export type CardClinicalVerification = z.infer<typeof CardClinicalVerificationSchema>;
export type CardMetadata = z.infer<typeof CardMetadataSchema>;
export type SourceConflictRecord = z.infer<typeof SourceConflictRecordSchema>;
export type StageTokenMetrics = z.infer<typeof StageTokenMetricsSchema>;
export type MaterialMetadata = z.infer<typeof MaterialMetadataSchema>;
export type FlashCardItem = z.infer<typeof flashCardItemSchema>;
export type FlashCardSubtopic = z.infer<typeof flashCardSubtopicSchema>;
export type FlashCardOutput = z.infer<typeof flashCardOutputSchema>;

export function validateCardMetadata(value: unknown): CardMetadata {
  return CardMetadataSchema.parse(value);
}

export function validateSourceConflictRecord(value: unknown): SourceConflictRecord {
  return SourceConflictRecordSchema.parse(value);
}

export function validateMaterialMetadata(value: unknown): MaterialMetadata {
  return MaterialMetadataSchema.parse(value);
}

function countMeaningfulWords(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

export function normalizeFlashCardAcademicGroup(value: string): FlashCardAcademicGroup {
  const normalized = value.trim().toLowerCase().replace(/[^a-z]+/g, " ").trim();

  if (normalized === "pharmaceutical science") {
    return "pharmaceutical_science";
  }

  if (normalized === "clinical science") {
    return "clinical_science";
  }

  if (normalized === "social behavioral and administration") {
    return "social_behavioral_and_administration";
  }

  throw new Error("Academic group is not supported.");
}

export function validateFlashCardOutput(value: unknown): FlashCardOutput {
  return flashCardOutputSchema.parse(value);
}

export function assertFlashCardOutputQuality(output: FlashCardOutput) {
  if (countMeaningfulWords(output.global_summary) < 3) {
    throw new Error("Flash card output quality is too thin because the global summary is too short.");
  }

  const normalizedFronts = new Set<string>();

  for (const subtopic of output.subtopics) {
    if (countMeaningfulWords(subtopic.summary) < 2) {
      throw new Error("Flash card output quality is too thin because a subtopic summary is too short.");
    }

    for (const card of subtopic.cards) {
      const normalizedFront = card.front_text.trim().toLowerCase();

      if (normalizedFronts.has(normalizedFront)) {
        throw new Error("Flash card output quality is too thin because duplicate card fronts were generated.");
      }

      normalizedFronts.add(normalizedFront);
    }
  }

  return output;
}

export function classifyFlashCardPdfSource({
  mimeType,
  extractedText,
}: {
  mimeType: string;
  extractedText: string | null | undefined;
}) {
  if (mimeType !== "application/pdf") {
    throw new Error("Flash card PDF classifier only supports PDF inputs.");
  }

  return extractedText?.trim() ? "text" : "ocr";
}

export function collectFlashCardSourcePathsForCleanup(
  sourceFiles: Array<{
    storageBucket: string;
    storagePath: string;
    deleteAfterPublish: boolean;
  }>,
) {
  return sourceFiles
    .filter((file) => file.deleteAfterPublish)
    .map((file) => ({
      storageBucket: file.storageBucket,
      storagePath: file.storagePath,
    }));
}
