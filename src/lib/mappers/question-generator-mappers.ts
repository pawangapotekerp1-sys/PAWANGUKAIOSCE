export type QuestionGeneratorStatusViewModel = {
  hasCredential: boolean;
  model: string;
  modelLabel: string;
  lastValidatedAt: string | null;
  lastError: string | null;
};

export type QuestionGeneratorDeliveryViewModel = {
  id: string;
  destinationType: "question_bank" | "scheduled_event";
  destinationQuestionId: string | null;
  destinationEventId: string | null;
  destinationEventQuestionId: string | null;
  blockId: string | null;
  topicId: string | null;
  deliveredBy: string | null;
  createdAt: string;
};

export type QuestionGeneratorItemViewModel = {
  id: string;
  draftQuestionId: string | null;
  order: number;
  variationMode: "new_case_same_concept" | "different_trap_same_objective" | "reverse_reasoning";
  variationModeLabel: "Kasus baru, konsep sama" | "Jebakan baru, tujuan sama" | "Penalaran dibalik";
  status: string;
  editedAt: string | null;
  stem: string;
  options: Record<"A" | "B" | "C" | "D" | "E", string>;
  correctOptionKey: "A" | "B" | "C" | "D" | "E" | null;
  explanationText: string;
  referenceLabel: string;
  referenceUrl: string;
  deliveries: QuestionGeneratorDeliveryViewModel[];
  deliverySummaryLabel: string;
};

export type QuestionGenerationBatchDetailViewModel = {
  batch: {
    id: string;
    model: string;
    status: string;
    statusLabel: string;
    targetQuestionCount: number;
    referenceCount: number;
    generatedCount: number;
    failedReason: string | null;
    createdAt: string;
    updatedAt: string;
  };
  references: Array<{
    id: string;
    order: number;
    stem: string;
    options: Record<"A" | "B" | "C" | "D" | "E", string>;
    correctOptionKey: "A" | "B" | "C" | "D" | "E";
    explanationText: string;
  }>;
  items: QuestionGeneratorItemViewModel[];
};

function mapVariationModeLabel(mode: QuestionGeneratorItemViewModel["variationMode"]) {
  switch (mode) {
    case "new_case_same_concept":
      return "Kasus baru, konsep sama";
    case "different_trap_same_objective":
      return "Jebakan baru, tujuan sama";
    case "reverse_reasoning":
      return "Penalaran dibalik";
  }
}

function mapBatchStatusLabel(status: string) {
  switch (status) {
    case "ready_for_review":
      return "Siap direview";
    case "generating":
      return "Sedang digenerate";
    case "partially_distributed":
      return "Sebagian sudah didistribusikan";
    case "completed":
      return "Semua item sudah didistribusikan";
    case "failed":
      return "Gagal digenerate";
    default:
      return "Draft generator";
  }
}

function mapDeliverySummaryLabel(deliveries: QuestionGeneratorDeliveryViewModel[]) {
  if (!deliveries.length) {
    return "Belum didistribusikan";
  }

  const questionBankCount = deliveries.filter((delivery) => delivery.destinationType === "question_bank").length;
  const scheduledEventCount = deliveries.filter((delivery) => delivery.destinationType === "scheduled_event").length;

  if (questionBankCount > 0 && scheduledEventCount === 0) {
    return `Bank soal ${questionBankCount}x`;
  }

  if (scheduledEventCount > 0 && questionBankCount === 0) {
    return `Event ${scheduledEventCount}x`;
  }

  return `Bank soal ${questionBankCount}x + Event ${scheduledEventCount}x`;
}

export function mapQuestionGeneratorStatus(input: {
  hasCredential: boolean;
  model: string;
  lastValidatedAt: string | null;
  lastError: string | null;
}): QuestionGeneratorStatusViewModel {
  return {
    ...input,
    modelLabel: input.model,
  };
}

export function mapQuestionGenerationBatchDetail(input: {
  batch: {
    id: string;
    model: string;
    targetQuestionCount: number;
    referenceCount: number;
    status: string;
    generatedCount: number;
    failedReason: string | null;
    createdAt: string;
    updatedAt: string;
  };
  references: Array<{
    id: string;
    order: number;
    stem: string;
    options: Record<"A" | "B" | "C" | "D" | "E", string>;
    correctOptionKey: "A" | "B" | "C" | "D" | "E";
    explanationText: string;
  }>;
  items: Array<{
    id: string;
    draftQuestionId: string | null;
    order: number;
    variationMode: "new_case_same_concept" | "different_trap_same_objective" | "reverse_reasoning";
    status: string;
    editedAt: string | null;
    stem: string;
    options: Record<"A" | "B" | "C" | "D" | "E", string>;
    correctOptionKey: "A" | "B" | "C" | "D" | "E" | null;
    explanationText: string;
    reference: {
      label: string;
      url: string;
    };
    deliveries: QuestionGeneratorDeliveryViewModel[];
  }>;
}): QuestionGenerationBatchDetailViewModel {
  return {
    batch: {
      ...input.batch,
      statusLabel: mapBatchStatusLabel(input.batch.status),
    },
    references: input.references,
    items: input.items.map((item) => ({
      ...item,
      variationModeLabel: mapVariationModeLabel(item.variationMode),
      referenceLabel: item.reference.label,
      referenceUrl: item.reference.url,
      deliverySummaryLabel: mapDeliverySummaryLabel(item.deliveries),
    })),
  };
}
