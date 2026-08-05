import {
  isTraceableBibliography,
  parseExplanationBibliography,
  type GeneratedQuestionItem,
  type QuestionGeneratorReference,
} from "../_shared/question-generator.ts";

export type QuestionGeneratorRole = "pendaftar_baru" | "pro" | "mentor" | "admin";

export class QuestionGeneratorAccessError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function hasEmptyBibliographyLabel(value: string) {
  return /(?:^|\n\s*)(Pustaka|Referensi|Sumber)\s*:\s*$/i.test(value.trim());
}

export function ensureQuestionGeneratorAccess(role: QuestionGeneratorRole) {
  if (role !== "admin" && role !== "mentor") {
    throw new QuestionGeneratorAccessError(403, "FORBIDDEN", "Fungsi ini hanya bisa diakses admin atau mentor.");
  }
}

export function buildGeneratorCredentialWritePayload({
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
    model: model.trim() || "gemini-3.6-flash",
    secret_hint: `••••${apiKey.trim().slice(-4)}`,
    last_error: null,
  };
}

export function validateQuestionGeneratorReferences(references: Array<{
  stem: string;
  options: Partial<Record<"A" | "B" | "C" | "D" | "E", string>>;
  correctOptionKey: string;
  explanationText: string;
}>) {
  if (references.length < 1 || references.length > 3) {
    throw new Error("Referensi soal harus berjumlah 1 sampai 3.");
  }

  references.forEach((reference) => {
    if (!reference.stem.trim()) {
      throw new Error("Referensi soal harus memiliki pertanyaan.");
    }

    if (!["A", "B", "C", "D", "E"].every((key) => reference.options[key as keyof typeof reference.options]?.trim())) {
      throw new Error("Referensi soal harus memiliki opsi lengkap A-E.");
    }

    if (!["A", "B", "C", "D", "E"].includes(reference.correctOptionKey)) {
      throw new Error("Referensi soal harus memiliki kunci jawaban yang valid.");
    }

    if (!reference.explanationText.trim()) {
      throw new Error("Referensi soal harus memiliki pembahasan.");
    }

    if (hasEmptyBibliographyLabel(reference.explanationText)) {
      throw new Error("Pustaka pada referensi soal tidak boleh kosong.");
    }

    const parsedExplanation = parseExplanationBibliography(reference.explanationText);

    if (parsedExplanation.bibliographyLabel && !parsedExplanation.bibliographyBlock) {
      throw new Error("Pustaka pada referensi soal tidak boleh kosong.");
    }

    if (
      parsedExplanation.bibliographyLabel
      && parsedExplanation.bibliographyBlock
      && !isTraceableBibliography(parsedExplanation.bibliographyBlock)
    ) {
      throw new Error(
        "Pustaka pada referensi soal belum bisa ditelusuri. Tambahkan URL, DOI, PMID, ISBN, atau sitasi yang lebih lengkap.",
      );
    }
  });

  return references as QuestionGeneratorReference[];
}

export function buildQuestionGenerationBatchInsert({
  createdBy,
  model,
  references,
  targetQuestionCount,
}: {
  createdBy: string;
  model: string;
  references: QuestionGeneratorReference[];
  targetQuestionCount: number;
}) {
  return {
    created_by: createdBy,
    model,
    target_question_count: targetQuestionCount,
    reference_count: references.length,
    status: "generating",
    generated_count: 0,
    failed_reason: null,
  };
}

export function buildGeneratedItemRows({
  batchId,
  generatedItems,
}: {
  batchId: string;
  generatedItems: GeneratedQuestionItem[];
}) {
  return generatedItems.map((item, index) => ({
    batch_id: batchId,
    item_order: index + 1,
    generation_mode: item.variationMode,
    status: "draft_generated",
  }));
}

export function buildQuestionBankDeliveryPayload({
  generationItemId,
  deliveredBy,
  blockId,
  topicId,
}: {
  generationItemId: string;
  deliveredBy: string;
  blockId: string;
  topicId: string;
}) {
  if (!blockId.trim()) {
    throw new Error("Pilih blok sebelum mengirim ke bank soal.");
  }

  if (!topicId.trim()) {
    throw new Error("Pilih materi sebelum mengirim ke bank soal.");
  }

  return {
    generation_item_id: generationItemId,
    destination_type: "question_bank",
    block_id: blockId,
    topic_id: topicId,
    delivered_by: deliveredBy,
  };
}

export function buildScheduledEventDeliveryPayload({
  generationItemId,
  deliveredBy,
  eventId,
}: {
  generationItemId: string;
  deliveredBy: string;
  eventId: string;
}) {
  if (!eventId.trim()) {
    throw new Error("Pilih event sebelum mengirim ke try out terjadwal.");
  }

  return {
    generation_item_id: generationItemId,
    destination_type: "scheduled_event",
    destination_event_id: eventId,
    delivered_by: deliveredBy,
  };
}
