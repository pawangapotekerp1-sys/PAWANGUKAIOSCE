import { Buffer } from "node:buffer";
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
import type { AlignedSourceRecord, ConceptNode } from "./aligner.ts";
import type { TranscriptSegment } from "./cleaner.ts";

export type CandidateEvidencePackParams = {
  segments: TranscriptSegment[];
  concepts?: ConceptNode[];
  alignedSources?: AlignedSourceRecord[];
  maxCharacters?: number;
  maxSegmentsPerConcept?: number;
};

export type CandidateEvidencePackMetrics = {
  availableSegmentsCount: number;
  selectedSegmentsCount: number;
  skippedSegmentsCount: number;
  evidencePackChars: number;
  clinicalSegmentsCount: number;
};

export type CandidateEvidencePackResult = {
  evidenceText: string;
  selectedSegmentIds: string[];
  metrics: CandidateEvidencePackMetrics;
};

export const DEFAULT_MAX_EVIDENCE_CHARACTERS = 16_000;
export const DEFAULT_MAX_SEGMENTS_PER_CONCEPT = 4;

const CRITICAL_CLINICAL_KEYWORDS = [
  "kontraindikasi",
  "contraindication",
  "contraindicated",
  "efek samping",
  "adverse",
  "interaksi",
  "interaction",
  "toksisitas",
  "toxicity",
  "overdosis",
  "dosis",
  "dosage",
  "regimen",
  "frekuensi",
  "lini pertama",
  "first line",
  "kehamilan",
  "wanita hamil",
  "teratogenik",
  "gangguan ginjal",
  "gagal ginjal",
  "crcl",
  "gfr",
  "gangguan hepar",
  "hati",
  "peringatan",
  "perhatian",
  "monitoring",
  "waspada",
  "subkutan",
  "intravena",
  "iv",
  "im",
  "per oral",
  "sebelum makan",
  "sesudah makan",
];

export function buildCandidateEvidencePack(
  params: CandidateEvidencePackParams,
): CandidateEvidencePackResult {
  const {
    segments = [],
    concepts = [],
    alignedSources = [],
    maxCharacters = DEFAULT_MAX_EVIDENCE_CHARACTERS,
    maxSegmentsPerConcept = DEFAULT_MAX_SEGMENTS_PER_CONCEPT,
  } = params;

  if (!Array.isArray(segments) || segments.length === 0) {
    return {
      evidenceText: "",
      selectedSegmentIds: [],
      metrics: {
        availableSegmentsCount: 0,
        selectedSegmentsCount: 0,
        skippedSegmentsCount: 0,
        evidencePackChars: 0,
        clinicalSegmentsCount: 0,
      },
    };
  }

  // 1. Filter valid non-noise segments and deduplicate
  const seenTexts = new Set<string>();
  const candidates: Array<{
    segment: TranscriptSegment;
    score: number;
    matchedConceptIds: string[];
  }> = [];

  const conceptTerms: Array<{ id: string; name: string }> = [];
  if (Array.isArray(concepts)) {
    for (const c of concepts) {
      if (c?.name && typeof c.name === "string" && c.name.trim().length > 2) {
        conceptTerms.push({ id: c.id, name: c.name.trim().toLowerCase() });
      }
    }
  }
  if (Array.isArray(alignedSources)) {
    for (const a of alignedSources) {
      if (a?.conceptName && typeof a.conceptName === "string" && a.conceptName.trim().length > 2) {
        if (!conceptTerms.some((c) => c.name === a.conceptName.trim().toLowerCase())) {
          conceptTerms.push({ id: a.conceptId, name: a.conceptName.trim().toLowerCase() });
        }
      }
    }
  }

  for (const seg of segments) {
    if (!seg || typeof seg.normalizedText !== "string") continue;
    const trimmed = seg.normalizedText.trim();
    if (trimmed.length === 0) continue;
    if (seg.classification === "noise") continue;

    const dedupeKey = trimmed.toLowerCase().replace(/\s+/g, " ");
    if (seenTexts.has(dedupeKey)) continue;
    seenTexts.add(dedupeKey);

    // Compute Priority Score
    let score = 10;
    const lowerText = trimmed.toLowerCase();

    // Clinical Entity Shield Priority (Tier 1)
    if (seg.hasClinicalEntities) {
      score += 100;
    }
    if (Array.isArray(seg.matchedEntities)) {
      score += Math.min(50, seg.matchedEntities.length * 10);
    }

    // Keyword bonuses
    for (const kw of CRITICAL_CLINICAL_KEYWORDS) {
      if (lowerText.includes(kw)) {
        score += 25;
      }
    }

    // Concept matches (Tier 2)
    const matchedConceptIds: string[] = [];
    for (const term of conceptTerms) {
      if (lowerText.includes(term.name)) {
        matchedConceptIds.push(term.id);
        score += 40;
      }
    }

    // Penalize fragmented/uncertain segments slightly
    if (seg.suspectedTranscriptionError) {
      score -= 20;
    }

    candidates.push({
      segment: seg,
      score,
      matchedConceptIds,
    });
  }

  // 2. Representative Selection
  const selectedMap = new Map<string, TranscriptSegment>();
  let currentChars = 0;

  const tryAddSegment = (seg: TranscriptSegment): boolean => {
    if (selectedMap.has(seg.segmentId)) return true;
    const formatted = `[${seg.segmentId}] ${seg.normalizedText}`;
    const extraChars = selectedMap.size > 0 ? 2 + formatted.length : formatted.length;
    if (currentChars + extraChars > maxCharacters) {
      return false;
    }
    selectedMap.set(seg.segmentId, seg);
    currentChars += extraChars;
    return true;
  };

  if (conceptTerms.length > 0) {
    // Map candidates by concept
    const conceptBuckets = new Map<string, Array<{ segment: TranscriptSegment; score: number }>>();
    for (const c of conceptTerms) {
      conceptBuckets.set(c.id, []);
    }
    const unassigned: Array<{ segment: TranscriptSegment; score: number }> = [];

    for (const cand of candidates) {
      if (cand.matchedConceptIds.length > 0) {
        for (const cid of cand.matchedConceptIds) {
          conceptBuckets.get(cid)?.push({ segment: cand.segment, score: cand.score });
        }
      } else {
        unassigned.push({ segment: cand.segment, score: cand.score });
      }
    }

    // Sort within each bucket by descending score
    for (const bucket of conceptBuckets.values()) {
      bucket.sort((a, b) => b.score - a.score);
    }
    unassigned.sort((a, b) => b.score - a.score);

    // Pass 1: Fair representation (up to maxSegmentsPerConcept per concept)
    for (let round = 0; round < maxSegmentsPerConcept; round++) {
      for (const bucket of conceptBuckets.values()) {
        if (round < bucket.length) {
          const item = bucket[round];
          tryAddSegment(item.segment);
        }
      }
    }

    // Pass 2: Remaining slots filled by highest score globally
    const allRemaining = candidates
      .filter((c) => !selectedMap.has(c.segment.segmentId))
      .sort((a, b) => b.score - a.score);

    for (const cand of allRemaining) {
      if (!tryAddSegment(cand.segment)) {
        break;
      }
    }
  } else {
    // Fallback: strictly global priority order
    candidates.sort((a, b) => b.score - a.score);
    for (const cand of candidates) {
      if (!tryAddSegment(cand.segment)) {
        break;
      }
    }
  }

  // 3. Format in chronological order
  const selectedList = Array.from(selectedMap.values()).sort((a, b) => {
    return (a.lineOffset ?? 0) - (b.lineOffset ?? 0);
  });

  const formattedLines = selectedList.map((s) => `[${s.segmentId}] ${s.normalizedText}`);
  const evidenceText = formattedLines.join("\n\n");
  const selectedSegmentIds = selectedList.map((s) => s.segmentId);

  return {
    evidenceText,
    selectedSegmentIds,
    metrics: {
      availableSegmentsCount: segments.length,
      selectedSegmentsCount: selectedList.length,
      skippedSegmentsCount: segments.length - selectedList.length,
      evidencePackChars: evidenceText.length,
      clinicalSegmentsCount: selectedList.filter((s) => s.hasClinicalEntities).length,
    },
  };
}

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
  evidencePack?: CandidateEvidencePackResult;
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
  evidencePackMetrics?: CandidateEvidencePackMetrics;
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

export function encodeBase64(bytes: Uint8Array): string {
  if (!bytes || bytes.length === 0) {
    return "";
  }

  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
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

  const evidenceContent = options.evidencePack?.evidenceText ?? options.transcriptText;
  if (evidenceContent) {
    if (options.evidencePack) {
      parts.push(`Bukti Transkrip Terpilih (High-Yield Clinical Evidence):\n${evidenceContent}`);
    } else {
      parts.push(`Transkrip Perkuliahan:\n${evidenceContent}`);
    }
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

  // Safety cap: Edge Functions have a 150MB isolate memory ceiling.
  // A 4MB PDF becomes ~5.3MB Base64, fitting comfortably within memory limits without risking Memory Limit Exceeded.
  // Larger PDFs rely on the comprehensive transcriptText and alignedSources already present in the prompt.
  const MAX_INLINE_PDF_BYTES = 4 * 1024 * 1024;
  if (options.pdfBytes && options.pdfBytes.byteLength > 0 && options.pdfBytes.byteLength <= MAX_INLINE_PDF_BYTES) {
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
    maxOutputTokens: 8192,
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
    evidencePackMetrics: options.evidencePack?.metrics,
  };
}
