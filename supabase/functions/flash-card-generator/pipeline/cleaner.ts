import {
  generateGeminiTextWithUsage,
  type GeminiRequest,
  type GeminiUsageMetadata,
} from "../../_shared/gemini-client.ts";

export type TranscriptSegment = {
  segmentId: string;
  rawText: string;
  normalizedText: string;
  lineOffset: number;
  hasClinicalEntities: boolean;
  matchedEntities: string[];
  classification?: "relevant" | "noise" | "uncertain";
  reason?: string;
  suspectedTranscriptionError?: boolean;
};

export type CleanerOptions = {
  apiKey?: string;
  model?: string;
  geminiClient?: (request: GeminiRequest) => Promise<{
    text: string;
    usage: GeminiUsageMetadata;
  }>;
  chunkSize?: number;
  chunkOverlap?: number;
};

export type CleanedTranscriptResult = {
  segments: TranscriptSegment[];
  retainedSegments: TranscriptSegment[];
  retainedText: string;
  droppedNoiseCount: number;
  uncertainCount: number;
  metrics: GeminiUsageMetadata;
  tokenUsage: GeminiUsageMetadata;
};

/**
 * Normalizes deterministic transcript noise:
 * - Strips ASR timestamps: [14:20], [00:14:20], (14:20), (00:14:20), and SRT/VTT timecodes
 * - Strips speaker labels: Speaker 1, Mentor, Dosen, Audience, Host, etc.
 * - Deduplicates benign conversational stutters on common conjunctions
 * - NEVER strips clinical negation words ("tidak", "bukan", "jangan") or dosage quantities
 */
export function normalizeDeterministicTranscript(rawText: string): string {
  if (!rawText || typeof rawText !== "string") {
    return "";
  }

  let text = rawText;

  // 1. Strip WebVTT headers
  text = text.replace(/^WEBVTT[^\r\n]*/gmi, "");

  // 2. Strip SRT sequence numbers preceding timecodes
  text = text.replace(
    /^\s*\d+\s*\r?\n(?=\d{1,2}:\d{2}(?::\d{2})?[,.]\d{3})/gm,
    "",
  );

  // 3. Strip SRT/VTT timecodes
  text = text.replace(
    /\d{1,2}:\d{2}(?::\d{2})?[,.]\d{3}\s*-->\s*\d{1,2}:\d{2}(?::\d{2})?[,.]\d{3}[^\r\n]*/gm,
    "",
  );

  // 4. Strip bracketed and parenthesized ASR timestamps like [14:20], [00:14:20], (14:20), (00:14:20)
  text = text.replace(/\[\d{1,2}:\d{2}(?::\d{2})?(?:[,.]\d{1,3})?\]/g, "");
  text = text.replace(/\(\d{1,2}:\d{2}(?::\d{2})?(?:[,.]\d{1,3})?\)/g, "");

  // 5. Strip speaker tags (accounting for possible leading spaces)
  text = text.replace(
    /^\s*(?:Speaker(?:\s+\d+|\s+[A-Za-z0-9_-]+)?|Mentor(?:\s+[A-Za-z0-9_-]+)?|Dosen(?:\s+[A-Za-z0-9_-]+)?|Audience|Host(?:\s+\d+)?|Narasumber|Moderator)\s*:\s*/gmi,
    "",
  );

  // 6. Safe stutter deduplication on common conjunctions/particles (case-insensitive, preserving first token)
  // NEVER deduplicate clinical negations ("tidak", "bukan", "jangan") or dosages
  const stutterRegex =
    /\b(dan|yang|atau|di|ke|ini|itu|pada|dari|untuk|jadi)(?:\s+\1\b)+/gi;
  text = text.replace(stutterRegex, "$1");

  // 7. Normalize whitespace per line
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/[^\S\r\n]+/g, " ").trim());

  text = lines.join("\n");

  // 8. Collapse excessive blank lines
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}

/**
 * Scans text for clinical entities:
 * - Units & dosages (mg, mcg, µg, g, ml, iu, tetes, %, iu/ml, mg/kg)
 * - Regimen, frequency & administration routes (1x1, 2x1, 1x sehari, prn, ac, pc, subkutan, iv, po, im)
 * - Pharmacological drug stems (olol, pril, sartan, statin, mab, floxacin, cillin, prazole, mycin, sone, glitazone)
 */
export function scanClinicalEntities(text: string): {
  hasClinicalEntities: boolean;
  matchedEntities: string[];
} {
  if (!text || typeof text !== "string") {
    return { hasClinicalEntities: false, matchedEntities: [] };
  }

  const patterns = [
    // 1. Units and dosages
    /\b\d+(?:[.,]\d+)?\s*(?:iu\/ml|mg\/kg|mcg\/kg|mg\/ml|mg|mcg|µg|ug|g|ml|iu|tetes|%)(?!\w)/gi,
    // 2. Regimen, frequency, and administration routes
    /\b(?:\d+\s*x\s*\d+|\d+\s*x\s*sehari|1x sehari|2x sehari|3x sehari|prn|ac|pc|subkutan|intravena|iv|po|im)\b/gi,
    // 3. Drug naming stems
    /\b[a-zA-Z]*(?:olol|pril|sartan|statin|mab|floxacin|cillin|prazole|mycin|sone|glitazone)\b/gi,
  ];

  const matched: string[] = [];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) {
        const trimmed = m.trim();
        if (trimmed && !matched.includes(trimmed)) {
          matched.push(trimmed);
        }
      }
    }
  }

  return {
    hasClinicalEntities: matched.length > 0,
    matchedEntities: matched,
  };
}

/**
 * Segments normalized text into structured TranscriptSegments with segment IDs,
 * line offsets, and clinical entity scan results.
 */
export function segmentTranscript(normalizedText: string): TranscriptSegment[] {
  if (
    !normalizedText ||
    typeof normalizedText !== "string" ||
    !normalizedText.trim()
  ) {
    return [];
  }

  const lines = normalizedText.split(/\r?\n/);
  const segments: TranscriptSegment[] = [];
  let segmentIndex = 1;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx].trim();
    if (!line) {
      continue;
    }

    // Split on sentence boundaries: . ! ? … followed by whitespace, or ... followed by whitespace
    // Negative lookbehind protects common honorifics: dr. apt. prof. tn. ny. nn. no. hal.
    const sentenceParts = line.split(
      /(?<!\b(?:dr|apt|prof|tn|ny|nn|no|hal)\.)(?<=[.!?…]+)\s+/i,
    );

    for (const part of sentenceParts) {
      const trimmedPart = part.trim();
      if (!trimmedPart) {
        continue;
      }

      const segmentId = `seg-${String(segmentIndex).padStart(3, "0")}`;
      segmentIndex++;

      const entityScan = scanClinicalEntities(trimmedPart);

      segments.push({
        segmentId,
        rawText: trimmedPart,
        normalizedText: trimmedPart,
        lineOffset: lineIdx + 1,
        hasClinicalEntities: entityScan.hasClinicalEntities,
        matchedEntities: entityScan.matchedEntities,
      });
    }
  }

  return segments;
}

function cleanJsonText(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  return text;
}

/**
 * Cleans a transcript by:
 * 1. Performing deterministic normalization (ASR timestamps, speaker labels, stutters).
 * 2. Segmenting and scanning each segment for clinical entities.
 * 3. Classifying segments with Gemini 3.8 Flash in sliding chunks with context.
 * 4. Applying the CLINICAL ENTITY SHIELD guardrail to protect clinical data from noise removal.
 * 5. Computing retained segments, retained text, dropped noise count, and token usage metrics.
 */
export async function cleanTranscript(
  rawTranscript: string,
  options: CleanerOptions = {},
): Promise<CleanedTranscriptResult> {
  const normalizedText = normalizeDeterministicTranscript(rawTranscript);
  const segments = segmentTranscript(normalizedText);

  const emptyUsage: GeminiUsageMetadata = {
    isAvailable: false,
    promptTokenCount: 0,
    candidatesTokenCount: 0,
    totalTokenCount: 0,
    thoughtsTokenCount: 0,
  };

  if (segments.length === 0) {
    return {
      segments: [],
      retainedSegments: [],
      retainedText: "",
      droppedNoiseCount: 0,
      uncertainCount: 0,
      metrics: emptyUsage,
      tokenUsage: emptyUsage,
    };
  }

  const chunkSize = options.chunkSize ?? 18;
  const chunkOverlap = options.chunkOverlap ?? 2;
  const model = options.model ?? "gemini-3.8-flash";
  const apiKey = options.apiKey ?? "";

  const geminiCaller =
    options.geminiClient ??
    (async (req: GeminiRequest) => {
      return await generateGeminiTextWithUsage(req);
    });

  const aggregatedMetrics: GeminiUsageMetadata = {
    isAvailable: false,
    promptTokenCount: 0,
    candidatesTokenCount: 0,
    totalTokenCount: 0,
    thoughtsTokenCount: 0,
  };

  for (let i = 0; i < segments.length; i += chunkSize) {
    const targetSlice = segments.slice(i, i + chunkSize);
    const contextBefore =
      i > 0 ? segments.slice(Math.max(0, i - chunkOverlap), i) : [];

    const prompt = `You are an expert clinical pharmacist and AI medical educator analyzing educational lecture transcripts.
Your task is to classify transcript segments for pharmacy flashcard generation into:
- "relevant": core pharmacological facts, clinical concepts, dosages, indications, contraindications, mechanisms, patient counseling.
- "noise": audio checks, conversational banter, greetings, administrative remarks, jokes with no educational value.
- "uncertain": fragmented clinical statements, cut-off dosage instructions, ambiguous clinical phrasing, or transcription errors.

CRITICAL GUARDRAIL:
Any segment with clinical entities (dosages, drug names, medical terms) MUST NOT be classified as "noise".
If transcription is garbled or cut-off mid-clinical statement, classify as "uncertain" and set suspectedTranscriptionError: true.

${
      contextBefore.length > 0
        ? `PREVIOUS CONTEXT (DO NOT CLASSIFY, FOR CONTEXT ONLY):
${contextBefore.map((s) => `[${s.segmentId}] ${s.normalizedText}`).join("\n")}
`
        : ""
    }
SEGMENTS TO CLASSIFY:
${targetSlice.map((s) => `[${s.segmentId}] ${s.normalizedText}`).join("\n")}

Respond ONLY with valid JSON in this exact structure:
{
  "classifications": [
    {
      "segmentId": "string",
      "classification": "relevant" | "noise" | "uncertain",
      "reason": "short explanation",
      "suspectedTranscriptionError": boolean
    }
  ]
}`;

    const response = await geminiCaller({
      apiKey,
      model,
      prompt,
      thinkingLevel: "low",
      responseMimeType: "application/json",
    });

    if (response.usage && response.usage.isAvailable) {
      aggregatedMetrics.isAvailable = true;
      aggregatedMetrics.promptTokenCount =
        (aggregatedMetrics.promptTokenCount ?? 0) +
        (response.usage.promptTokenCount ?? 0);
      aggregatedMetrics.candidatesTokenCount =
        (aggregatedMetrics.candidatesTokenCount ?? 0) +
        (response.usage.candidatesTokenCount ?? 0);
      aggregatedMetrics.totalTokenCount =
        (aggregatedMetrics.totalTokenCount ?? 0) +
        (response.usage.totalTokenCount ?? 0);
      aggregatedMetrics.thoughtsTokenCount =
        (aggregatedMetrics.thoughtsTokenCount ?? 0) +
        (response.usage.thoughtsTokenCount ?? 0);
    }

    type ClassificationItem = {
      segmentId?: string;
      classification?: "relevant" | "noise" | "uncertain";
      reason?: string;
      suspectedTranscriptionError?: boolean;
      suspected_transcription_error?: boolean;
    };

    let classifications: ClassificationItem[] = [];
    try {
      const parsed = JSON.parse(cleanJsonText(response.text));
      if (Array.isArray(parsed?.classifications)) {
        classifications = parsed.classifications;
      } else if (Array.isArray(parsed)) {
        classifications = parsed;
      }
    } catch {
      // In case of JSON parse failure, fallback
    }

    const classificationMap = new Map<string, ClassificationItem>();
    for (const item of classifications) {
      if (item?.segmentId) {
        classificationMap.set(item.segmentId, item);
      }
    }

    for (const seg of targetSlice) {
      const classItem = classificationMap.get(seg.segmentId);
      let classification =
        classItem?.classification ??
        (seg.hasClinicalEntities ? "relevant" : "relevant");
      let reason =
        classItem?.reason ??
        (seg.hasClinicalEntities
          ? "Clinical entity detected"
          : "Default relevant");

      const isSuspectedError = Boolean(
        classItem?.suspectedTranscriptionError ||
          classItem?.suspected_transcription_error ||
          reason.toLowerCase().includes("transcription_error") ||
          reason.toLowerCase().includes("suspected_transcription_error") ||
          reason.toLowerCase().includes("transcription error") ||
          reason.toLowerCase().includes("corrupted"),
      );

      if (isSuspectedError) {
        seg.suspectedTranscriptionError = true;
        if (classification !== "relevant") {
          classification = "uncertain";
        }
      }

      // CLINICAL ENTITY SHIELD GUARDRAIL:
      // If segment has clinical entities, it MUST NOT be classified as "noise".
      if (seg.hasClinicalEntities && classification === "noise") {
        classification = "uncertain";
        reason = "Protected by Clinical Entity Shield";
      }

      seg.classification = classification;
      seg.reason = reason;
    }
  }

  const retainedSegments = segments.filter(
    (s) => s.classification === "relevant" || s.classification === "uncertain",
  );
  const droppedNoiseCount =
    segments.filter((s) => s.classification === "noise").length;
  const uncertainCount =
    segments.filter((s) => s.classification === "uncertain").length;
  const retainedText = retainedSegments.map((s) => s.normalizedText).join("\n");

  return {
    segments,
    retainedSegments,
    retainedText,
    droppedNoiseCount,
    uncertainCount,
    metrics: aggregatedMetrics,
    tokenUsage: aggregatedMetrics,
  };
}
