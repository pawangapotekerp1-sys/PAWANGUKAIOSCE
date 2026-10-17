import {
  generateGeminiStructuredDataWithUsage,
  type GeminiRequest,
  type GeminiUsageMetadata,
} from "../../_shared/gemini-client.ts";
import { type StageTokenMetrics } from "../../_shared/flash-card.ts";
import type { CandidateCard } from "./generator.ts";
import { stripCitationTags } from "./generator.ts";

export type RepairOptions = {
  defectiveCards?: CandidateCard[];
  cards?: CandidateCard[];
  sourceContext?: string;
  apiKey?: string;
  model?: string;
  geminiClient?: (request: GeminiRequest) => Promise<{
    data?: unknown;
    text?: string;
    usage?: GeminiUsageMetadata;
    latencyMs?: number;
  }>;
};

export type RepairResult = {
  repairedCards: CandidateCard[];
  droppedCards: CandidateCard[];
  repairedCount: number;
  droppedCount: number;
  tokenUsage: StageTokenMetrics;
  allCards?: CandidateCard[];
};

function buildRepairPrompt(
  defectiveCards: CandidateCard[],
  options: RepairOptions,
): string {
  const cardsPayload = defectiveCards.map((c) => ({
    id: c.id,
    front_text: c.front_text,
    back_text: c.back_text,
    defectNotes: c.defectNotes ?? "Perbaiki kejelasan dan format teks kartu.",
  }));

  const parts: string[] = [
    "Anda adalah Asisten Editor Ahli Pembuatan Flashcard Farmasi Klinis (Targeted Repair Pass).",
    "TUGAS UTAMA: Perbaiki kartu-kartu berikut yang memiliki status REPAIRABLE_DEFECT sesuai catatan perbaikan (defectNotes).",
    "ATURAN MUTLAK PERBAIKAN:",
    "1. DILARANG KERAS mengubah substansi medis/fakta klinis.",
    "2. DILARANG menyisipkan citation tags seperti [Slide 3], [seg-1], atau (Slide...) ke dalam front_text maupun back_text.",
    "3. Rumuskan front_text menjadi pertanyaan/prompt yang jelas, spesifik, dan tidak ambigu (minimal 2 kata bermakna).",
    "4. Rumuskan back_text menjadi jawaban yang akurat, komprehensif, dan langsung pada intinya (minimal 2 kata bermakna).",
    "5. Gunakan Bahasa Indonesia baku.",
    `Kartu yang Memerlukan Perbaikan:\n${JSON.stringify(cardsPayload, null, 2)}`,
  ];

  if (options.sourceContext) {
    parts.push(`Konteks Tambahan Materi Sumber:\n${options.sourceContext}`);
  }

  parts.push(
    "Format JSON Keluaran: { repairedCards: [{ id: string, front_text: string, back_text: string }] }",
  );

  return parts.join("\n\n");
}

function getRepairResponseSchema(): Record<string, unknown> {
  return {
    type: "OBJECT",
    properties: {
      repairedCards: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            front_text: { type: "STRING" },
            back_text: { type: "STRING" },
          },
          required: ["id", "front_text", "back_text"],
        },
      },
    },
    required: ["repairedCards"],
  };
}

/**
 * Deterministically checks whether the repaired card meets quality and safety standards.
 */
function validateRepairedCard(
  front: string,
  back: string,
): { isValid: boolean; reason?: string; cleanFront: string; cleanBack: string } {
  const cleanFront = stripCitationTags(front).trim();
  const cleanBack = stripCitationTags(back).trim();

  if (!cleanFront || !cleanBack) {
    return {
      isValid: false,
      reason: "Teks depan atau belakang kosong.",
      cleanFront,
      cleanBack,
    };
  }

  const frontWords = cleanFront.split(/\s+/).filter(Boolean);
  const backWords = cleanBack.split(/\s+/).filter(Boolean);

  if (frontWords.length < 2) {
    return {
      isValid: false,
      reason: "Pertanyaan terlalu singkat (< 2 kata).",
      cleanFront,
      cleanBack,
    };
  }

  if (backWords.length < 2) {
    return {
      isValid: false,
      reason: "Jawaban terlalu singkat (< 2 kata).",
      cleanFront,
      cleanBack,
    };
  }

  if (cleanFront.toLowerCase() === cleanBack.toLowerCase()) {
    return {
      isValid: false,
      reason: "Pertanyaan dan jawaban identik.",
      cleanFront,
      cleanBack,
    };
  }

  const refusalRegex = /^(maaf|tidak dapat|i cannot|as an ai)/i;
  if (refusalRegex.test(cleanFront) || refusalRegex.test(cleanBack)) {
    return {
      isValid: false,
      reason: "Teks memuat penolakan jawaban dari model.",
      cleanFront,
      cleanBack,
    };
  }

  return { isValid: true, cleanFront, cleanBack };
}

export async function repairDefectiveCards(
  options: RepairOptions,
): Promise<RepairResult> {
  const allCards = options.cards ? [...options.cards] : undefined;

  // Filter ONLY cards with REPAIRABLE_DEFECT
  // Strictly ignores ACCEPTED, SUBSTANTIVE_CONFLICT, and UNSUPPORTED_CLAIM
  const defectiveCards = (
    options.defectiveCards ??
    options.cards?.filter((c) => c.qualityStatus === "REPAIRABLE_DEFECT") ??
    []
  ).filter((c) => c.qualityStatus === "REPAIRABLE_DEFECT");

  // If no defective cards, return immediately without calling LLM
  if (defectiveCards.length === 0) {
    return {
      repairedCards: [],
      droppedCards: [],
      repairedCount: 0,
      droppedCount: 0,
      tokenUsage: {
        isAvailable: false,
        promptTokenCount: null,
        candidatesTokenCount: null,
        totalTokenCount: null,
        thoughtsTokenCount: null,
        statusText: "NO_DEFECTIVE_CARDS",
      },
      allCards,
    };
  }

  const prompt = buildRepairPrompt(defectiveCards, options);
  const geminiReq: GeminiRequest = {
    apiKey: options.apiKey ?? "internal",
    model: options.model ?? "gemini-3.8-flash",
    prompt,
    thinkingLevel: "low", // Targeted repair uses low thinkingLevel
    responseMimeType: "application/json",
    responseSchema: getRepairResponseSchema(),
  };

  let usageMetadata: GeminiUsageMetadata = {
    isAvailable: false,
    promptTokenCount: null,
    candidatesTokenCount: null,
    totalTokenCount: null,
    thoughtsTokenCount: null,
  };

  let rawOutput: {
    repairedCards?: Array<{
      id: string;
      front_text: string;
      back_text: string;
    }>;
  } | null = null;

  if (options.geminiClient) {
    const res = await options.geminiClient(geminiReq);
    if (res?.usage) {
      usageMetadata = res.usage;
    }
    if (res?.data && typeof res.data === "object") {
      rawOutput = res.data as typeof rawOutput;
    } else if (res?.text) {
      try {
        rawOutput = JSON.parse(res.text);
      } catch {
        rawOutput = null;
      }
    }
  } else {
    const res = await generateGeminiStructuredDataWithUsage<typeof rawOutput>(
      geminiReq,
    );
    rawOutput = res.data;
    if (res.usage) {
      usageMetadata = res.usage;
    }
  }

  const repairedMap = new Map<string, { front_text: string; back_text: string }>();
  if (Array.isArray(rawOutput?.repairedCards)) {
    for (const r of rawOutput!.repairedCards) {
      if (r.id) {
        repairedMap.set(r.id, {
          front_text: r.front_text,
          back_text: r.back_text,
        });
      }
    }
  }

  const repairedCards: CandidateCard[] = [];
  const droppedCards: CandidateCard[] = [];

  // Single-cycle re-review and validation
  for (const originalCard of defectiveCards) {
    const repairAttempt = repairedMap.get(originalCard.id);

    if (!repairAttempt) {
      // No repair returned; hard cap 1 cycle reached -> drop or flag
      droppedCards.push({
        ...originalCard,
        metadata: {
          ...(originalCard.metadata ?? { sources: [] }),
          sources: originalCard.sources ?? originalCard.metadata?.sources ?? [],
          clinicalVerification: originalCard.metadata?.clinicalVerification ?? { status: "not_assessed" },
          qualityStatus: "REPAIRABLE_DEFECT",
          mentorCustomNotes: "flagged_for_mentor_review",
        },
      });
      continue;
    }

    const validation = validateRepairedCard(
      repairAttempt.front_text,
      repairAttempt.back_text,
    );

    if (validation.isValid) {
      // Re-review passed: promote to ACCEPTED
      const successfulCard: CandidateCard = {
        ...originalCard,
        front_text: validation.cleanFront,
        back_text: validation.cleanBack,
        qualityStatus: "ACCEPTED",
        defectNotes: undefined,
        metadata: {
          ...(originalCard.metadata ?? { sources: [] }),
          sources: originalCard.sources ?? originalCard.metadata?.sources ?? [],
          clinicalVerification: originalCard.metadata?.clinicalVerification ?? { status: "not_assessed" },
          qualityStatus: "ACCEPTED",
          conflictRefId: null,
        },
      };
      repairedCards.push(successfulCard);
    } else {
      // Re-review failed after 1 cycle; HARD CAP: strictly no 2nd cycle
      const droppedCard: CandidateCard = {
        ...originalCard,
        metadata: {
          ...(originalCard.metadata ?? { sources: [] }),
          sources: originalCard.sources ?? originalCard.metadata?.sources ?? [],
          clinicalVerification: originalCard.metadata?.clinicalVerification ?? { status: "not_assessed" },
          qualityStatus: "REPAIRABLE_DEFECT",
          mentorCustomNotes: "flagged_for_mentor_review",
        },
      };
      droppedCards.push(droppedCard);
    }
  }

  // Update allCards if provided
  if (allCards) {
    const repairedLookup = new Map<string, CandidateCard>();
    for (const c of repairedCards) repairedLookup.set(c.id, c);
    const droppedLookup = new Map<string, CandidateCard>();
    for (const c of droppedCards) droppedLookup.set(c.id, c);

    for (let i = 0; i < allCards.length; i++) {
      const cardId = allCards[i].id;
      if (repairedLookup.has(cardId)) {
        allCards[i] = repairedLookup.get(cardId)!;
      } else if (droppedLookup.has(cardId)) {
        allCards[i] = droppedLookup.get(cardId)!;
      }
    }
  }

  const tokenUsage: StageTokenMetrics = {
    isAvailable: Boolean(usageMetadata.isAvailable),
    promptTokenCount: usageMetadata.promptTokenCount ?? null,
    candidatesTokenCount: usageMetadata.candidatesTokenCount ?? null,
    totalTokenCount: usageMetadata.totalTokenCount ?? null,
    thoughtsTokenCount: usageMetadata.thoughtsTokenCount ?? null,
    statusText: "COMPLETED",
  };

  return {
    repairedCards,
    droppedCards,
    repairedCount: repairedCards.length,
    droppedCount: droppedCards.length,
    tokenUsage,
    allCards,
  };
}
