export type QuestionAuthoringOverviewCard = {
  id: string;
  title: string;
  detail: string;
};

export type QuestionBankItemViewModel = {
  id: string;
  stem: string;
  status: string;
  statusLabel: string;
  blockId: string | null;
  blockName: string | null;
  topicId: string | null;
  topicName: string | null;
  questionImageUrl: string | null;
  hasQuestionImage: boolean;
  hasExplanationText: boolean;
  hasExplanationImage: boolean;
  updatedAt: string;
};

export type QuestionEditorOptionViewModel = {
  id: string | null;
  key: string;
  text: string;
  isCorrect: boolean;
  sortOrder: number;
};

export type QuestionEditorDataViewModel = {
  id: string;
  stem: string;
  status: string;
  statusLabel: string;
  blockId: string | null;
  blockName: string | null;
  topicId: string | null;
  topicName: string | null;
  questionImagePath: string | null;
  questionImageUrl: string | null;
  explanationText: string | null;
  explanationImagePath: string | null;
  explanationImageUrl: string | null;
  options: QuestionEditorOptionViewModel[];
  correctOptionKey: string | null;
  updatedAt: string;
};

export type TopicSuggestionViewModel = {
  topicId: string | null;
  topicName: string | null;
  confidenceLabel: string | null;
  confidenceTone: "high" | "medium" | "low" | "muted";
  reason: string | null;
};

export type QuestionBatchCard = {
  id: string;
  title: string;
  formatLabel: string;
  statusLabel: string;
  statusTone: "default" | "warning" | "danger";
  sourceFileName: string | null;
  totalItems: number;
  counters: Array<{
    id: "draft_ready" | "needs_enrichment" | "needs_review" | "enrichment_failed";
    label: string;
    value: number;
  }>;
  createdAt: string;
};

export type QuestionBatchDetailItem = {
  id: string;
  stem: string;
  workflowStatus: string;
  workflowLabel: string;
  extractionLabel: string;
  extractionTone: "default" | "warning";
  parseConfidenceLabel: string | null;
  parseWarningLabel: string | null;
  topicSuggestion: TopicSuggestionViewModel;
  blockName: string | null;
  topicName: string | null;
  suggestedTopicName: string | null;
  provenanceLabel: string;
};

export type QuestionBatchDetailViewModel = QuestionBatchCard & {
  items: QuestionBatchDetailItem[];
};

export type QuestionDraftEditorViewModel = {
  id: string;
  batchId: string;
  batchTitle: string;
  batchFormat: string;
  stem: string;
  workflowStatus: string;
  workflowLabel: string;
  blockId: string | null;
  blockName: string | null;
  topicId: string | null;
  topicName: string | null;
  topicSuggestion: TopicSuggestionViewModel;
  options: Array<{ key: string; text: string }>;
  correctOptionKey: string | null;
  explanation: string;
  provenanceLabel: string;
  references: Array<{
    id: string;
    origin: string;
    originLabel: string;
    label: string;
    excerpt: string | null;
  }>;
  reviewSummary: string | null;
};

export type EnrichmentQueueItemViewModel = {
  id: string;
  batchId: string;
  batchTitle: string;
  formatLabel: string;
  statusLabel: string;
  urgencyTone: "default" | "warning" | "danger";
  extractionLabel: string;
  stem: string;
  referenceSummary: string;
  topicSuggestion: TopicSuggestionViewModel;
  updatedAt: string;
};

type TopicSuggestionSource = {
  topicId: string | null;
  topicName: string | null;
  confidence: number | null;
  reason: string | null;
};

type BatchCardSource = {
  id: string;
  title: string;
  inputFormat: string;
  status: string;
  sourceFileName: string | null;
  totalItems: number;
  draftReadyCount: number;
  needsEnrichmentCount: number;
  needsReviewCount: number;
  enrichmentFailedCount: number;
  ocrItemCount: number;
  createdAt: string;
};

type BatchDetailItemSource = {
  id: string;
  stem: string | null;
  workflowStatus: string;
  textExtractionMode: string | null;
  parseConfidence: number | null;
  ocrConfidence: number | null;
  topicSuggestionConfidence: number | null;
  topicSuggestionReason: string | null;
  blockName: string | null;
  topicName: string | null;
  suggestedTopicName: string | null;
  correctOptionKey: string | null;
  explanationSource: string | null;
};

type BatchDetailSource = BatchCardSource & {
  items: BatchDetailItemSource[];
};

type DraftReferenceSource = {
  id: string;
  origin: string;
  label: string;
  excerpt: string | null;
};

type ReviewSource = {
  decision: string;
  notes: string | null;
  createdAt: string;
};

type DraftEditorSource = {
  id: string;
  batchId: string;
  batchTitle: string;
  batchFormat: string;
  stem: string | null;
  workflowStatus: string;
  blockId: string | null;
  blockName: string | null;
  topicId: string | null;
  topicName: string | null;
  suggestedTopicId: string | null;
  suggestedTopicName: string | null;
  topicSuggestionConfidence: number | null;
  topicSuggestionReason: string | null;
  options: Array<{ key: string; text: string }>;
  correctOptionKey: string | null;
  explanation: string | null;
  explanationSource: string | null;
  references: DraftReferenceSource[];
  lastReview: ReviewSource | null;
};

type EnrichmentQueueSource = {
  id: string;
  batchId: string;
  batchTitle: string;
  inputFormat: string;
  stem: string | null;
  workflowStatus: string;
  textExtractionMode: string | null;
  ocrConfidence: number | null;
  parseConfidence: number | null;
  topicSuggestionConfidence: number | null;
  suggestedTopicName: string | null;
  topicSuggestionReason: string | null;
  referenceCount: number;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type QuestionBankItemSource = {
  id: string;
  stem: string | null;
  status: string;
  blockId: string | null;
  blockName: string | null;
  topicId: string | null;
  topicName: string | null;
  questionImageUrl: string | null;
  explanationText: string | null;
  explanationImageUrl: string | null;
  updatedAt: string;
};

type QuestionEditorDataSource = {
  id: string;
  stem: string | null;
  status: string;
  blockId: string | null;
  blockName: string | null;
  topicId: string | null;
  topicName: string | null;
  questionImagePath: string | null;
  questionImageUrl: string | null;
  explanationText: string | null;
  explanationImagePath: string | null;
  explanationImageUrl: string | null;
  options: QuestionEditorOptionViewModel[];
  updatedAt: string;
};

function formatPercent(value: number | null): string | null {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  return `${Math.round(value * 100)}%`;
}

export function mapQuestionStatusLabel(status: string): string {
  if (status === "published") {
    return "Published";
  }

  if (status === "archived") {
    return "Archived";
  }

  return "Draft";
}

export function mapQuestionBankItem(source: QuestionBankItemSource): QuestionBankItemViewModel {
  return {
    id: source.id,
    stem: source.stem ?? "Pertanyaan belum tersedia.",
    status: source.status,
    statusLabel: mapQuestionStatusLabel(source.status),
    blockId: source.blockId,
    blockName: source.blockName,
    topicId: source.topicId,
    topicName: source.topicName,
    questionImageUrl: source.questionImageUrl,
    hasQuestionImage: Boolean(source.questionImageUrl),
    hasExplanationText: Boolean(source.explanationText?.trim()),
    hasExplanationImage: Boolean(source.explanationImageUrl),
    updatedAt: source.updatedAt,
  };
}

export function mapQuestionEditorData(source: QuestionEditorDataSource): QuestionEditorDataViewModel {
  return {
    id: source.id,
    stem: source.stem ?? "",
    status: source.status,
    statusLabel: mapQuestionStatusLabel(source.status),
    blockId: source.blockId,
    blockName: source.blockName,
    topicId: source.topicId,
    topicName: source.topicName,
    questionImagePath: source.questionImagePath,
    questionImageUrl: source.questionImageUrl,
    explanationText: source.explanationText,
    explanationImagePath: source.explanationImagePath,
    explanationImageUrl: source.explanationImageUrl,
    options: source.options,
    correctOptionKey: source.options.find((option) => option.isCorrect)?.key ?? null,
    updatedAt: source.updatedAt,
  };
}

function formatBatchStatus(status: string): {
  label: string;
  tone: "default" | "warning" | "danger";
} {
  if (status === "completed") {
    return { label: "Selesai", tone: "default" };
  }

  if (status === "completed_with_issues") {
    return { label: "Selesai dengan catatan", tone: "warning" };
  }

  if (status === "failed") {
    return { label: "Gagal", tone: "danger" };
  }

  return { label: "Diproses", tone: "warning" };
}

function formatInputFormat(inputFormat: string): string {
  if (inputFormat === "docx") {
    return "DOCX";
  }

  if (inputFormat === "csv") {
    return "CSV";
  }

  if (inputFormat === "xlsx") {
    return "XLSX";
  }

  if (inputFormat === "manual") {
    return "Manual";
  }

  return "PDF";
}

function formatWorkflowStatus(workflowStatus: string): string {
  if (workflowStatus === "draft_ready") {
    return "Draft siap";
  }

  if (workflowStatus === "needs_enrichment") {
    return "Butuh enrichment";
  }

  if (workflowStatus === "approved") {
    return "Disetujui";
  }

  if (workflowStatus === "published") {
    return "Published";
  }

  if (workflowStatus === "rejected") {
    return "Ditolak";
  }

  if (workflowStatus === "enrichment_failed") {
    return "Enrichment gagal";
  }

  return "Butuh review";
}

function formatExplanationSource(explanationSource: string | null): string {
  if (explanationSource === "reference_library") {
    return "Pembahasan dari reference library";
  }

  if (explanationSource === "curated_external_ai") {
    return "Pembahasan dari AI terkurasi";
  }

  if (explanationSource === "manual_editor") {
    return "Pembahasan dari editor manual";
  }

  return "Pembahasan dari upload asli";
}

function formatReferenceOrigin(origin: string): string {
  if (origin === "reference_library") {
    return "Reference library";
  }

  if (origin === "curated_external_ai") {
    return "AI terkurasi";
  }

  if (origin === "manual_editor") {
    return "Editor manual";
  }

  return "Upload asli";
}

function mapExtractionStatus(
  textExtractionMode: string | null,
  ocrConfidence: number | null,
): {
  label: string;
  tone: "default" | "warning";
} {
  if (textExtractionMode === "ocr") {
    const confidenceLabel = formatPercent(ocrConfidence);

    if (confidenceLabel) {
      return {
        label: `OCR ${confidenceLabel}`,
        tone: (ocrConfidence ?? 0) < 0.6 ? "warning" : "default",
      };
    }

    return {
      label: "OCR",
      tone: "warning",
    };
  }

  return {
    label: "Teks langsung",
    tone: "default",
  };
}

export function mapTopicSuggestion(source: TopicSuggestionSource): TopicSuggestionViewModel {
  let confidenceTone: TopicSuggestionViewModel["confidenceTone"] = "muted";

  if (source.confidence !== null) {
    if (source.confidence >= 0.8) {
      confidenceTone = "high";
    } else if (source.confidence >= 0.6) {
      confidenceTone = "medium";
    } else {
      confidenceTone = "low";
    }
  }

  return {
    topicId: source.topicId,
    topicName: source.topicName,
    confidenceLabel: formatPercent(source.confidence),
    confidenceTone,
    reason: source.reason,
  };
}

export function mapQuestionBatchCard(source: BatchCardSource): QuestionBatchCard {
  const batchStatus = formatBatchStatus(source.status);

  return {
    id: source.id,
    title: source.title,
    formatLabel: formatInputFormat(source.inputFormat),
    statusLabel: batchStatus.label,
    statusTone: batchStatus.tone,
    sourceFileName: source.sourceFileName,
    totalItems: source.totalItems,
    createdAt: source.createdAt,
    counters: [
      { id: "draft_ready", label: "Draft siap", value: source.draftReadyCount },
      { id: "needs_enrichment", label: "Butuh enrichment", value: source.needsEnrichmentCount },
      { id: "needs_review", label: "Butuh review", value: source.needsReviewCount },
      { id: "enrichment_failed", label: "Enrichment gagal", value: source.enrichmentFailedCount },
    ],
  };
}

export function mapQuestionBatchDetail(source: BatchDetailSource): QuestionBatchDetailViewModel {
  return {
    ...mapQuestionBatchCard(source),
    items: source.items.map((item) => {
      const extractionStatus = mapExtractionStatus(item.textExtractionMode, item.ocrConfidence);

      return {
        id: item.id,
        stem: item.stem ?? "Stem soal belum berhasil dipetakan.",
        workflowStatus: item.workflowStatus,
        workflowLabel: formatWorkflowStatus(item.workflowStatus),
        extractionLabel: extractionStatus.label,
        extractionTone: extractionStatus.tone,
        parseConfidenceLabel: formatPercent(item.parseConfidence),
        parseWarningLabel: item.parseConfidence !== null && item.parseConfidence < 0.6 ? "Parse rendah" : null,
        topicSuggestion: mapTopicSuggestion({
          topicId: null,
          topicName: item.suggestedTopicName,
          confidence: item.topicSuggestionConfidence,
          reason: item.topicSuggestionReason,
        }),
        blockName: item.blockName,
        topicName: item.topicName,
        suggestedTopicName: item.suggestedTopicName,
        provenanceLabel: formatExplanationSource(item.explanationSource),
      };
    }),
  };
}

export function mapQuestionDraftEditorViewModel(source: DraftEditorSource): QuestionDraftEditorViewModel {
  return {
    id: source.id,
    batchId: source.batchId,
    batchTitle: source.batchTitle,
    batchFormat: formatInputFormat(source.batchFormat),
    stem: source.stem ?? "",
    workflowStatus: source.workflowStatus,
    workflowLabel: formatWorkflowStatus(source.workflowStatus),
    blockId: source.blockId,
    blockName: source.blockName,
    topicId: source.topicId,
    topicName: source.topicName,
    topicSuggestion: mapTopicSuggestion({
      topicId: source.suggestedTopicId,
      topicName: source.suggestedTopicName,
      confidence: source.topicSuggestionConfidence,
      reason: source.topicSuggestionReason,
    }),
    options: source.options,
    correctOptionKey: source.correctOptionKey,
    explanation: source.explanation ?? "",
    provenanceLabel: formatExplanationSource(source.explanationSource),
    references: source.references.map((reference) => ({
      id: reference.id,
      origin: reference.origin,
      originLabel: formatReferenceOrigin(reference.origin),
      label: reference.label,
      excerpt: reference.excerpt,
    })),
    reviewSummary: source.lastReview
      ? `${source.lastReview.decision}: ${source.lastReview.notes ?? "Tanpa catatan."}`
      : null,
  };
}

export function mapEnrichmentQueueItem(source: EnrichmentQueueSource): EnrichmentQueueItemViewModel {
  const extractionStatus = mapExtractionStatus(source.textExtractionMode, source.ocrConfidence);
  const urgencyTone = source.workflowStatus === "enrichment_failed"
    ? "danger"
    : source.workflowStatus === "needs_review"
      ? "warning"
      : "default";

  return {
    id: source.id,
    batchId: source.batchId,
    batchTitle: source.batchTitle,
    formatLabel: formatInputFormat(source.inputFormat),
    statusLabel: formatWorkflowStatus(source.workflowStatus),
    urgencyTone,
    extractionLabel: extractionStatus.label,
    stem: source.stem ?? "Stem soal belum tersedia.",
    referenceSummary: source.referenceCount > 0
      ? `${source.referenceCount} referensi tersimpan`
      : "Belum ada referensi tersimpan",
    topicSuggestion: mapTopicSuggestion({
      topicId: null,
      topicName: source.suggestedTopicName,
      confidence: source.topicSuggestionConfidence,
      reason: source.topicSuggestionReason,
    }),
    updatedAt: source.updatedAt,
  };
}
