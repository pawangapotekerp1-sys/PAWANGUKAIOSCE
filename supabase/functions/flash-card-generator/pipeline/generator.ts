import {
  generateGeminiStructuredDataWithUsage,
  type GeminiRequest,
  type GeminiUsageMetadata,
} from "../../_shared/gemini-client.ts";
import {
  type CardMetadata,
  type CardSourceReference,
  type FlashCardAcademicGroup,
  type StageTokenMetrics,
} from "../../_shared/flash-card.ts";
import type { AlignedSourceRecord } from "./aligner.ts";

export type CandidateCard = {
  id: string;
  front_text: string;
  back_text: string;
  conceptId?: string;
  qualityStatus: "ACCEPTED" | "REPAIRABLE_DEFECT" | "SUBSTANTIVE_CONFLICT" | "UNSUPPORTED_CLAIM";
  defectNotes?: string;
  conflictRefId?: string | null;
  sources: CardSourceReference[];
  metadata?: CardMetadata;
};

export type GenerationSubtopic = {
  title: string;
  summary: string;
  cards: CandidateCard[];
};

export type GenerationOptions = {
  title: string;
  academicGroup?: FlashCardAcademicGroup | string;
  alignedContext?: string;
  alignedSources?: AlignedSourceRecord[];
  transcriptText?: string;
  pdfBytes?: Uint8Array | null;
  apiKey?: string;
  model?: string;
  geminiClient?: (request: GeminiRequest) => Promise<{
    data?: unknown;
    text?: string;
    usage: GeminiUsageMetadata;
    latencyMs?: number;
  }>;
};

export type GenerationResult = {
  subtopics: GenerationSubtopic[];
  cards: CandidateCard[];
  global_summary: string;
  tokenUsage: StageTokenMetrics;
};

/**
 * Strips citation markers such as [Slide 3], (Slide 4), [Halaman 2], [seg-01], (seg-05), etc.
 * from front_text and back_text to ensure clean, professional flashcards.
 */
export function stripCitationTags(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .replace(/\[\s*(?:Slide|Halaman|Page|Transkrip|Segment|seg)[^\]]*\]/gi, "")
    .replace(/\(\s*(?:Slide|Halaman|Page|Transkrip|Segment|seg)[^\)]*\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function buildPrompt(options: GenerationOptions): string {
  const parts: string[] = [
    "Anda adalah Senior Clinical Pharmacist dan Medical Educator ahli dalam pembuatan flashcard uji kompetensi apoteker/medis (OSCE/CBT).",
    "TUGAS UTAMA: Susun subtopik komprehensif dan kartu flashcard high-yield dari materi kuliah yang diberikan.",
    "ATURAN MUTLAK BAHASA: Seluruh output (judul, ringkasan, front_text, back_text) HARUS menggunakan Bahasa Indonesia baku yang jelas, ringkas, dan tepat secara medis.",
    "ATURAN ZERO CITATION TAG PADA KARTU: DILARANG KERAS menyisipkan penanda sitasi sumber seperti [Slide 3], (Slide 4), [Halaman 2], atau [seg-05] ke dalam front_text maupun back_text. Teks kartu harus murni konten pedagogis. Sitasi sumber dikelola secara independen oleh metadata engine.",
    `Judul Materi: ${options.title}`,
  ];

  if (options.academicGroup) {
    parts.push(`Rumpun Ilmu: ${options.academicGroup}`);
  }

  if (options.alignedContext) {
    parts.push(`Konteks Terintegrasi:\n${options.alignedContext}`);
  }

  if (options.alignedSources && options.alignedSources.length > 0) {
    const serializedSources = options.alignedSources.map((s, idx) => {
      return `Konsep ${idx + 1} (${s.conceptId}): ${s.conceptName}\n- Slide: ${s.slideClaim || "(Tidak ada)"}\n- Transkrip: ${s.transcriptClaim || "(Tidak ada)"}`;
    }).join("\n\n");
    parts.push(`Sumber Terpadu (Slide + Transkrip):\n${serializedSources}`);
  }

  if (options.transcriptText) {
    parts.push(`Transkrip Perkuliahan:\n${options.transcriptText}`);
  }

  parts.push(
    "Struktur Keluaran: JSON murni dengan format { global_summary: string, subtopics: [{ title: string, summary: string, cards: [{ front_text: string, back_text: string, conceptId?: string }] }] }.",
  );

  return parts.join("\n\n");
}

function getFlashCardResponseSchema(): Record<string, unknown> {
  return {
    type: "OBJECT",
    properties: {
      global_summary: { type: "STRING" },
      subtopics: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            summary: { type: "STRING" },
            cards: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  front_text: { type: "STRING" },
                  back_text: { type: "STRING" },
                  conceptId: { type: "STRING" },
                },
                required: ["front_text", "back_text"],
              },
            },
          },
          required: ["title", "summary", "cards"],
        },
      },
    },
    required: ["subtopics"],
  };
}

export async function generateCandidateCards(
  options: GenerationOptions,
): Promise<GenerationResult> {
  const model = options.model ?? "gemini-3.8-flash";
  const prompt = buildPrompt(options);
  const responseSchema = getFlashCardResponseSchema();

  const requestParts: GeminiRequest["parts"] = [];

  if (options.pdfBytes && options.pdfBytes.byteLength > 0) {
    requestParts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: encodeBase64(options.pdfBytes),
      },
    });
  }

  requestParts.push({ text: prompt });

  const geminiReq: GeminiRequest = {
    apiKey: options.apiKey ?? "internal",
    model,
    prompt,
    parts: requestParts,
    thinkingLevel: "low",
    responseMimeType: "application/json",
    responseSchema,
  };

  let rawOutput: {
    global_summary?: string;
    subtopics?: Array<{
      title: string;
      summary: string;
      cards: Array<{
        id?: string;
        front_text: string;
        back_text: string;
        conceptId?: string;
      }>;
    }>;
  } | null = null;

  let usageMetadata: GeminiUsageMetadata = {
    isAvailable: false,
    promptTokenCount: null,
    candidatesTokenCount: null,
    totalTokenCount: null,
    thoughtsTokenCount: null,
  };

  if (options.geminiClient) {
    const res = await options.geminiClient(geminiReq);
    if (res.usage) {
      usageMetadata = res.usage;
    }
    if (res.data && typeof res.data === "object") {
      rawOutput = res.data as typeof rawOutput;
    } else if (res.text) {
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

  const subtopicsData = Array.isArray(rawOutput?.subtopics)
    ? rawOutput!.subtopics
    : [];

  const globalSummary =
    typeof rawOutput?.global_summary === "string" && rawOutput.global_summary.trim()
      ? rawOutput.global_summary.trim()
      : `Ringkasan materi flashcard ${options.title}`;

  // Index aligned sources by conceptId and name for fast lookup
  const sourcesByConceptId = new Map<string, AlignedSourceRecord>();
  if (options.alignedSources) {
    for (const source of options.alignedSources) {
      if (source.conceptId) {
        sourcesByConceptId.set(source.conceptId.toLowerCase(), source);
      }
    }
  }

  const allCards: CandidateCard[] = [];
  const processedSubtopics: GenerationSubtopic[] = [];

  for (let sIdx = 0; sIdx < subtopicsData.length; sIdx++) {
    const sub = subtopicsData[sIdx];
    const subCards: CandidateCard[] = [];

    const rawCards = Array.isArray(sub.cards) ? sub.cards : [];
    for (let cIdx = 0; cIdx < rawCards.length; cIdx++) {
      const rawCard = rawCards[cIdx];
      const cleanFront = stripCitationTags(rawCard.front_text ?? "");
      const cleanBack = stripCitationTags(rawCard.back_text ?? "");
      const cardId = rawCard.id || `card-${sIdx + 1}-${cIdx + 1}`;

      // Associate sources from alignedSources
      let cardSources: CardSourceReference[] = [];
      let matchedConceptId = rawCard.conceptId;

      if (matchedConceptId && sourcesByConceptId.has(matchedConceptId.toLowerCase())) {
        const matched = sourcesByConceptId.get(matchedConceptId.toLowerCase())!;
        cardSources = [...matched.references];
      } else if (options.alignedSources && options.alignedSources.length > 0) {
        // Fallback: match by keywords in front/back text
        for (const source of options.alignedSources) {
          const nameMatch =
            source.conceptName &&
            (cleanFront.toLowerCase().includes(source.conceptName.toLowerCase()) ||
              cleanBack.toLowerCase().includes(source.conceptName.toLowerCase()));

          if (nameMatch) {
            cardSources = [...source.references];
            matchedConceptId = source.conceptId;
            break;
          }
        }
      }

      const cardMetadata: CardMetadata = {
        sources: cardSources,
        clinicalVerification: {
          status: "not_assessed",
        },
        qualityStatus: "ACCEPTED",
        conflictRefId: null,
      };

      const candidateCard: CandidateCard = {
        id: cardId,
        front_text: cleanFront,
        back_text: cleanBack,
        conceptId: matchedConceptId,
        qualityStatus: "ACCEPTED",
        conflictRefId: null,
        sources: cardSources,
        metadata: cardMetadata,
      };

      subCards.push(candidateCard);
      allCards.push(candidateCard);
    }

    processedSubtopics.push({
      title: (sub.title ?? `Subtopik ${sIdx + 1}`).trim(),
      summary: (sub.summary ?? "").trim(),
      cards: subCards,
    });
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
    subtopics: processedSubtopics,
    cards: allCards,
    global_summary: globalSummary,
    tokenUsage,
  };
}
