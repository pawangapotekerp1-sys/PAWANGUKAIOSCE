import {
  generateGeminiStructuredDataWithUsage,
  type GeminiRequest,
  type GeminiUsageMetadata,
} from "../../_shared/gemini-client.ts";
import {
  type SourceConflictRecord,
  type StageTokenMetrics,
} from "../../_shared/flash-card.ts";
import type { CandidateCard } from "./generator.ts";
import type { AlignedSourceRecord } from "./aligner.ts";

export type CardQualityStatus =
  | "ACCEPTED"
  | "REPAIRABLE_DEFECT"
  | "SUBSTANTIVE_CONFLICT"
  | "UNSUPPORTED_CLAIM";

export type ReviewOptions = {
  cards: CandidateCard[];
  conflicts?: SourceConflictRecord[];
  alignedSources?: AlignedSourceRecord[];
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

export type RejectedAuditEntry = {
  draftFront: string;
  rejectionReason: string;
  triggerSourceId?: string;
};

export type ReviewResult = {
  reviewedCards: CandidateCard[];
  acceptedCount: number;
  repairableCount: number;
  conflictCount: number;
  unsupportedCount: number;
  rejectedAuditTrail: RejectedAuditEntry[];
  tokenUsage: StageTokenMetrics;
};

function buildReviewPrompt(cards: CandidateCard[], options: ReviewOptions): string {
  const cardsPayload = cards.map((c) => ({
    id: c.id,
    front_text: c.front_text,
    back_text: c.back_text,
    conceptId: c.conceptId,
    sources: c.sources?.map((s) => ({
      sourceId: s.sourceId,
      sourceType: s.sourceType,
      textQuote: s.location.textQuote,
    })),
  }));

  const parts: string[] = [
    "Anda adalah Auditor Medis dan Reviewer Adversarial Independen untuk flashcard OSCE/CBT farmasi klinis.",
    "TUGAS UTAMA: Lakukan audit ketat terhadap kandidat kartu berdasarkan 3 sumbu evaluasi:",
    "1. Source Fidelity: Apakah fakta dalam front_text dan back_text didukung oleh materi sumber? Jika mengarang fakta fiktif -> UNSUPPORTED_CLAIM.",
    "2. Cross-Source Consistency: Apakah kartu memuat pertentangan fakta antar sumber atau mengambil salah satu pihak dari kontradiksi belum terselesaikan -> SUBSTANTIVE_CONFLICT.",
    "3. Clinical & Safety Rigor: Apakah istilah klinis, dosis, dan kontraindikasi aman dan tepat? Jika secara klinis benar namun rumusan kalimat ambigu/terlalu singkat -> REPAIRABLE_DEFECT. Jika sempurna -> ACCEPTED.",
    "ATURAN KLASIFIKASI:",
    "- ACCEPTED: Kartu valid, akurat, dan pedagogis.",
    "- REPAIRABLE_DEFECT: Cacat format, kejelasan, atau ambiguitas minor yang BUKAN kontradiksi klinis. Wajib sertakan 'defectNotes'.",
    "- SUBSTANTIVE_CONFLICT: Kontradiksi substansial dengan slide atau transkrip (misal dosis bertentangan). Wajib sertakan 'conflictRefId'. DILARANG direparasi otomatis.",
    "- UNSUPPORTED_CLAIM: Klaim tanpa dasar faktual pada sumber. Wajib sertakan 'rejectionReason'.",
    `Kandidat Kartu untuk Diaudit:\n${JSON.stringify(cardsPayload, null, 2)}`,
  ];

  if (options.sourceContext) {
    parts.push(`Konteks Sumber:\n${options.sourceContext}`);
  }

  if (options.conflicts && options.conflicts.length > 0) {
    parts.push(`Daftar Konflik Sumber yang Diketahui:\n${JSON.stringify(options.conflicts, null, 2)}`);
  }

  parts.push(
    "Format JSON Keluaran: { reviews: [{ cardId: string, status: 'ACCEPTED' | 'REPAIRABLE_DEFECT' | 'SUBSTANTIVE_CONFLICT' | 'UNSUPPORTED_CLAIM', defectNotes?: string, conflictRefId?: string, rejectionReason?: string, triggerSourceId?: string }] }",
  );

  return parts.join("\n\n");
}

function getReviewResponseSchema(): Record<string, unknown> {
  return {
    type: "OBJECT",
    properties: {
      reviews: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            cardId: { type: "STRING" },
            status: {
              type: "STRING",
              enum: [
                "ACCEPTED",
                "REPAIRABLE_DEFECT",
                "SUBSTANTIVE_CONFLICT",
                "UNSUPPORTED_CLAIM",
              ],
            },
            defectNotes: { type: "STRING" },
            conflictRefId: { type: "STRING" },
            rejectionReason: { type: "STRING" },
            triggerSourceId: { type: "STRING" },
          },
          required: ["cardId", "status"],
        },
      },
    },
    required: ["reviews"],
  };
}

export async function reviewCandidateCards(
  options: ReviewOptions,
): Promise<ReviewResult> {
  const cards = options.cards ?? [];
  const conflicts = options.conflicts ?? [];
  const rejectedAuditTrail: RejectedAuditEntry[] = [];

  const reviewedCards: CandidateCard[] = [];
  const cardsNeedingLlm: CandidateCard[] = [];

  // Deterministic conflict matching pass
  for (const card of cards) {
    let matchedConflict: SourceConflictRecord | undefined;

    if (card.conceptId) {
      matchedConflict = conflicts.find(
        (c) => c.conceptId.toLowerCase() === card.conceptId!.toLowerCase(),
      );
    }

    if (!matchedConflict && conflicts.length > 0) {
      // Check if front or back text matches conflict quotes
      for (const c of conflicts) {
        const slideQuote = c.slideEvidence?.exactQuote?.toLowerCase();
        const transQuote = c.transcriptEvidence?.exactQuote?.toLowerCase();
        const frontLower = card.front_text.toLowerCase();
        const backLower = card.back_text.toLowerCase();

        if (
          (slideQuote && (frontLower.includes(slideQuote) || backLower.includes(slideQuote))) ||
          (transQuote && (frontLower.includes(transQuote) || backLower.includes(transQuote)))
        ) {
          matchedConflict = c;
          break;
        }
      }
    }

    if (matchedConflict) {
      const conflictCard: CandidateCard = {
        ...card,
        qualityStatus: "SUBSTANTIVE_CONFLICT",
        conflictRefId: matchedConflict.conflictId,
        defectNotes:
          matchedConflict.clinicalClarificationNotes ??
          "Terdeteksi kontradiksi substansial antar materi sumber.",
        metadata: {
          ...(card.metadata ?? { sources: [] }),
          sources: card.sources ?? card.metadata?.sources ?? [],
          clinicalVerification: card.metadata?.clinicalVerification ?? { status: "not_assessed" },
          qualityStatus: "SUBSTANTIVE_CONFLICT",
          conflictRefId: matchedConflict.conflictId,
        },
      };
      reviewedCards.push(conflictCard);
    } else {
      cardsNeedingLlm.push(card);
    }
  }

  let usageMetadata: GeminiUsageMetadata = {
    isAvailable: false,
    promptTokenCount: null,
    candidatesTokenCount: null,
    totalTokenCount: null,
    thoughtsTokenCount: null,
  };

  // If there are cards that need adversarial audit and an LLM client/apiKey is available
  if (cardsNeedingLlm.length > 0 && (options.geminiClient || options.apiKey)) {
    const prompt = buildReviewPrompt(cardsNeedingLlm, options);
    const geminiReq: GeminiRequest = {
      apiKey: options.apiKey ?? "internal",
      model: options.model ?? "gemini-3.8-flash",
      prompt,
      maxOutputTokens: 8192,
      thinkingLevel: "medium", // Adversarial audit pass uses medium thinkingLevel
      responseMimeType: "application/json",
      responseSchema: getReviewResponseSchema(),
    };

    let rawOutput: {
      reviews?: Array<{
        cardId: string;
        status: CardQualityStatus;
        defectNotes?: string;
        conflictRefId?: string;
        rejectionReason?: string;
        triggerSourceId?: string;
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

    const reviewMap = new Map<string, {
      status: CardQualityStatus;
      defectNotes?: string;
      conflictRefId?: string;
      rejectionReason?: string;
      triggerSourceId?: string;
    }>();

    if (Array.isArray(rawOutput?.reviews)) {
      for (const rev of rawOutput!.reviews) {
        if (rev.cardId) {
          reviewMap.set(rev.cardId, rev);
        }
      }
    }

    for (const card of cardsNeedingLlm) {
      const rev = reviewMap.get(card.id);
      const status: CardQualityStatus = rev?.status ?? "ACCEPTED";
      const defectNotes = rev?.defectNotes;
      const conflictRefId = rev?.conflictRefId ?? null;

      if (status === "UNSUPPORTED_CLAIM" && rejectedAuditTrail.length < 10) {
        const rejectionReason = (
          rev?.rejectionReason ??
          defectNotes ??
          "Klaim fakta tidak didukung bukti materi sumber."
        ).trim().slice(0, 300);

        rejectedAuditTrail.push({
          draftFront: card.front_text.trim().slice(0, 200),
          rejectionReason,
          triggerSourceId: rev?.triggerSourceId ?? card.sources?.[0]?.sourceId,
        });
      }

      const updatedCard: CandidateCard = {
        ...card,
        qualityStatus: status,
        defectNotes: status === "REPAIRABLE_DEFECT" ? defectNotes : undefined,
        conflictRefId: status === "SUBSTANTIVE_CONFLICT" ? conflictRefId : null,
        metadata: {
          ...(card.metadata ?? { sources: [] }),
          sources: card.sources ?? card.metadata?.sources ?? [],
          clinicalVerification: card.metadata?.clinicalVerification ?? { status: "not_assessed" },
          qualityStatus: status,
          conflictRefId: status === "SUBSTANTIVE_CONFLICT" ? conflictRefId : null,
        },
      };

      reviewedCards.push(updatedCard);
    }
  } else {
    // If no LLM was called, apply fallback heuristic classification
    for (const card of cardsNeedingLlm) {
      const front = card.front_text.trim();
      const back = card.back_text.trim();
      let status: CardQualityStatus = "ACCEPTED";
      let defectNotes: string | undefined;

      if (front.split(/\s+/).length < 2 || back.split(/\s+/).length < 2) {
        status = "REPAIRABLE_DEFECT";
        defectNotes = "Teks pertanyaan atau jawaban terlalu singkat.";
      }

      reviewedCards.push({
        ...card,
        qualityStatus: status,
        defectNotes,
        metadata: {
          ...(card.metadata ?? { sources: [] }),
          sources: card.sources ?? card.metadata?.sources ?? [],
          clinicalVerification: card.metadata?.clinicalVerification ?? { status: "not_assessed" },
          qualityStatus: status,
        },
      });
    }
  }

  // Preserve original order of cards
  const cardIndexMap = new Map<string, number>();
  cards.forEach((c, idx) => cardIndexMap.set(c.id, idx));
  reviewedCards.sort(
    (a, b) => (cardIndexMap.get(a.id) ?? 0) - (cardIndexMap.get(b.id) ?? 0),
  );

  let acceptedCount = 0;
  let repairableCount = 0;
  let conflictCount = 0;
  let unsupportedCount = 0;

  for (const card of reviewedCards) {
    if (card.qualityStatus === "ACCEPTED") acceptedCount++;
    else if (card.qualityStatus === "REPAIRABLE_DEFECT") repairableCount++;
    else if (card.qualityStatus === "SUBSTANTIVE_CONFLICT") conflictCount++;
    else if (card.qualityStatus === "UNSUPPORTED_CLAIM") unsupportedCount++;
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
    reviewedCards,
    acceptedCount,
    repairableCount,
    conflictCount,
    unsupportedCount,
    rejectedAuditTrail,
    tokenUsage,
  };
}
