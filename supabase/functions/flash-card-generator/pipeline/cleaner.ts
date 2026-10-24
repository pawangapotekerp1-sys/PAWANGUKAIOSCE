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
  maxChunksPerRun?: number;
  maxExecutionMs?: number;
  useLlmClassifier?: boolean;
  cachedSegments?: TranscriptSegment[];
  onChunkComplete?: (
    completedSegments: TranscriptSegment[],
    chunkIndex?: number,
    totalChunks?: number,
  ) => Promise<void> | void;
};

export type CleanedTranscriptResult = {
  segments: TranscriptSegment[];
  retainedSegments: TranscriptSegment[];
  retainedText: string;
  droppedNoiseCount: number;
  uncertainCount: number;
  metrics: GeminiUsageMetadata;
  tokenUsage: GeminiUsageMetadata;
  isComplete?: boolean;
  totalSegmentsCount?: number;
};

const PROTECTED_CLINICAL_LABELS = new Set([
  "dosis",
  "indikasi",
  "kontraindikasi",
  "efek samping",
  "perhatian",
  "peringatan",
  "interaksi",
  "mekanisme",
  "catatan",
  "kesimpulan",
  "rumus",
  "contoh",
  "definisi",
  "tujuan",
  "syarat",
  "uji",
  "pasien",
  "obat",
  "terapi",
  "diagnosis",
  "gejala",
]);

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

  // 5. Strip speaker tags (explicit roles and generic Zoom/Meet participant prefixes at line start)
  text = text.replace(
    /^\s*(?:Speaker(?:\s+\d+|\s+[A-Za-z0-9_-]+)?|Mentor(?:\s+[A-Za-z0-9_-]+)?|Dosen(?:\s+[A-Za-z0-9_-]+)?|Audience|Host(?:\s+\d+)?|Narasumber|Moderator)\s*:\s*/gmi,
    "",
  );
  text = text.replace(
    /^(\s*)([A-Za-z][A-Za-z0-9_.\s-]{1,34})\s*:\s+/gm,
    (fullMatch, leadingSpace: string, label: string) => {
      const normalizedLabel = label.trim().toLowerCase().replace(/\s+/g, " ");
      if (
        PROTECTED_CLINICAL_LABELS.has(normalizedLabel) ||
        scanClinicalEntities(label).hasClinicalEntities
      ) {
        return fullMatch;
      }
      return leadingSpace;
    },
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
 * - Units & dosages (numeric and spoken)
 * - Regimen, frequency & administration routes
 * - Pharmacological drug stems and common active ingredients
 * - Pharmaceutics, dosage forms, formulation excipients, and IPC/QC testing terms
 */
export function scanClinicalEntities(text: string): {
  hasClinicalEntities: boolean;
  matchedEntities: string[];
} {
  if (!text || typeof text !== "string") {
    return { hasClinicalEntities: false, matchedEntities: [] };
  }

  const patterns = [
    // 1. Units and dosages (numeric and spoken)
    /\b(?:\d+(?:[.,]\d+)?|(?:(?:satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan)\s+ratus(?:\s+(?:satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan)\s+puluh)?(?:\s+(?:satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|belas))?|(?:satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan)\s+puluh(?:\s+(?:satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|belas))?|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|seratus|seribu))\s*(?:iu\/ml|mg\/kg|mcg\/kg|mg\/ml|mg|miligram|mcg|µg|ug|gram|g|ml|mililiter|iu|tetes|%|persen)(?!\w)/gi,
    // 2. Regimen, frequency, and administration routes
    /\b(?:\d+\s*x\s*\d+|\d+\s*x\s*sehari|1x sehari|2x sehari|3x sehari|prn|ac|pc|subkutan|intravena|iv|po|im|peroral|parenteral|topikal|rektal|vaginal|sublingual|bukal)\b/gi,
    // 3. Drug naming stems and common pharmaceutical active ingredients
    /\b(?:[a-zA-Z]*(?:olol|pril|sartan|statin|mab|floxacin|cillin|prazole|mycin|sone|glitazone|zepam|zolam|dipine|conazole|vir|tidine|setron|profen|kain|caine)|paracetamol|parasetamol|asetosal|aspirin|ibuprofen|amoksisilin|metformin|kaptopril|captopril|amlodipin|simvastatin|omeprazol|digoksin|warfarin|insulin|fenitoin|rifampisin|isoniazid)\b/gi,
    // 4. Pharmaceutics, dosage forms, formulation excipients, andIPC/QC testing terms
    /\b(?:pulvis|pulveres|kapsul|supositoria|ovula|salut\s+(?:gula|film|enterik|entrick)|granulasi\s+(?:basah|kering)|kempa\s+langsung|eksipien|zat\s+aktif|pengisi|diluen|pengikat|binder|penghancur|disintegran|pelicin|lubrikan|glidan|antiadheren|pembasah|surfaktan|friabilitas|kerapuhan|disolusi|waktu\s+hancur|keseragaman\s+(?:bobot|kandungan)|kekerasan\s+tablet|daya\s+alir|sudut\s+(?:diam|istirahat)|kompresibilitas|indeks\s+tap|capping|laminating|mottling|sticking|picking|binding|cracking|chipping|laktosa|avicel|amprotab|magnesium\s+stearat|talkum|mucilago|aerosil|nipagin|nipasol|eudragit|hpmc|pvp|cmc)\b/gi,
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

const MAX_COALESCED_LINE_SEGMENT_CHARS = 180;

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
    const sentenceParts = line
      .split(/(?<!\b(?:dr|apt|prof|tn|ny|nn|no|hal)\.)(?<=[.!?…]+)\s+/i)
      .map((p) => p.trim())
      .filter(Boolean);

    // Coalesce short ASR micro-sentences on the SAME line up to MAX_COALESCED_LINE_SEGMENT_CHARS
    // ONLY when neither part ends with an ellipsis (... / …) and both share the same hasClinicalEntities flag.
    const coalescedParts: string[] = [];
    for (const part of sentenceParts) {
      if (coalescedParts.length === 0) {
        coalescedParts.push(part);
        continue;
      }
      const prev = coalescedParts[coalescedParts.length - 1];
      const prevEndsWithEllipsis = /(?:\.\.\.|…)$/.test(prev);
      const currEndsWithEllipsis = /(?:\.\.\.|…)$/.test(part);
      const prevHasEntities = scanClinicalEntities(prev).hasClinicalEntities;
      const currHasEntities = scanClinicalEntities(part).hasClinicalEntities;

      if (
        !prevEndsWithEllipsis &&
        !currEndsWithEllipsis &&
        prevHasEntities === currHasEntities &&
        prev.length + 1 + part.length <= MAX_COALESCED_LINE_SEGMENT_CHARS
      ) {
        coalescedParts[coalescedParts.length - 1] = `${prev} ${part}`;
      } else {
        coalescedParts.push(part);
      }
    }

    for (const trimmedPart of coalescedParts) {
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
      isComplete: true,
      totalSegmentsCount: 0,
    };
  }

  if (Array.isArray(options.cachedSegments) && options.cachedSegments.length > 0) {
    const cachedMap = new Map<string, TranscriptSegment>();
    for (const cached of options.cachedSegments) {
      if (cached?.segmentId) {
        cachedMap.set(cached.segmentId, cached);
      }
    }

    for (const seg of segments) {
      const cached = cachedMap.get(seg.segmentId);
      if (cached && cached.classification) {
        seg.classification = cached.classification;
        seg.reason = cached.reason;
        seg.suspectedTranscriptionError = cached.suspectedTranscriptionError;
      }
    }
  }

  const CONVERSATIONAL_NOISE_PATTERNS: RegExp[] = [
    /^(?:halo|hai|tes|cek)\b.*(?:suara|mic|mikrofon|satu\s+dua|terdengar|jelas)/i,
    /\b(?:link\s+absen|absensi\s+di\s+(?:chat|portal)|isi\s+daftar\s+hadir|daftar\s+hadir\s+di\s+chat|share\s+screen|apakah\s+slide\s+sudah\s+terlihat|slide\s+selanjutnya\s+tolong|lanjut\s+slide\s+berikutnya)\b/i,
    /^(?:assalamualaikum[\s.,!]*warahmatullahi[\s.,!]*wabarakatuh|selamat\s+(?:pagi|siang|sore|malam)\s+(?:rekan-rekan|teman-teman|semua|peserta)[^.]*\.?)$/i,
    /^(?:oke\s+kita\s+mulai\s+ya|terima\s+kasih\s+semuanya|sampai\s+jumpa\s+di\s+pertemuan\s+berikutnya)\b/i,
  ];

  // Quota-conserving deterministic cleaning by default in production when no custom geminiClient is injected
  if (!options.geminiClient && !options.useLlmClassifier) {
    for (const seg of segments) {
      if (!seg.classification) {
        const trimmed = seg.normalizedText.trim();
        if (/(?:\.\.\.|…)$/.test(trimmed)) {
          seg.classification = "uncertain";
          seg.reason = "Ambiguous or fragmented transcript";
          seg.suspectedTranscriptionError = true;
        } else if (
          !seg.hasClinicalEntities &&
          CONVERSATIONAL_NOISE_PATTERNS.some((rx) => rx.test(trimmed))
        ) {
          seg.classification = "noise";
          seg.reason = "Conversational noise";
          seg.suspectedTranscriptionError = false;
        } else {
          seg.classification = "relevant";
          seg.reason = seg.hasClinicalEntities ? "Clinical entity detected" : "Default relevant";
          seg.suspectedTranscriptionError = false;
        }
      }
      if (seg.hasClinicalEntities && seg.classification === "noise") {
        seg.classification = "uncertain";
        seg.reason = "Protected by Clinical Entity Shield";
      }
    }

    if (options.onChunkComplete) {
      await options.onChunkComplete(segments, 0, 1);
    }

    const retainedSegments = segments.filter(
      (s) => s.classification === "relevant" || s.classification === "uncertain",
    );
    const droppedNoiseCount = segments.filter((s) => s.classification === "noise").length;
    const uncertainCount = segments.filter((s) => s.classification === "uncertain").length;
    const retainedText = retainedSegments.map((s) => s.normalizedText).join("\n");
    const deterministicUsage: GeminiUsageMetadata = {
      ...emptyUsage,
      statusText: "DETERMINISTIC_CLEANING",
    };

    return {
      segments,
      retainedSegments,
      retainedText,
      droppedNoiseCount,
      uncertainCount,
      metrics: deterministicUsage,
      tokenUsage: deterministicUsage,
      isComplete: true,
      totalSegmentsCount: segments.length,
    };
  }

  const chunkSize = options.chunkSize ?? 250;
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

  const MAX_SUBDIVISION_DEPTH = 2;
  const MAX_MATERIAL_SUBDIVISION_CALLS = 4;
  let subdivisionCallsRemaining = MAX_MATERIAL_SUBDIVISION_CALLS;

  const maxChunksPerRun =
    typeof options.maxChunksPerRun === "number" && options.maxChunksPerRun > 0
      ? Math.floor(options.maxChunksPerRun)
      : undefined;
  const maxExecutionMs =
    typeof options.maxExecutionMs === "number" && options.maxExecutionMs > 0
      ? options.maxExecutionMs
      : undefined;
  const runStartedAt = Date.now();
  let newlyProcessedChunksCount = 0;
  let stoppedEarlyForChunkCap = false;

  for (let i = 0; i < segments.length; i += chunkSize) {
    const targetSlice = segments.slice(i, i + chunkSize);
    const allCached = targetSlice.every((s) => s.classification !== undefined);

    if (allCached) {
      continue;
    }

    const contextBefore =
      i > 0 ? segments.slice(Math.max(0, i - chunkOverlap), i) : [];

    type ParsedSliceResult = {
      noiseIds: Set<string>;
      uncertainMap: Map<string, { reason: string; isSuspectedError: boolean }>;
      legacyClassifications?: Map<string, { classification: string; reason?: string; isSuspectedError?: boolean }>;
    };

    const parseResponseText = (responseText: string): ParsedSliceResult => {
      const noiseIds = new Set<string>();
      const uncertainMap = new Map<string, { reason: string; isSuspectedError: boolean }>();
      const legacyClassifications = new Map<string, { classification: string; reason?: string; isSuspectedError?: boolean }>();

      try {
        const parsed = JSON.parse(cleanJsonText(responseText));

        // 1. Sparse format: noiseSegmentIds
        if (Array.isArray(parsed?.noiseSegmentIds)) {
          for (const id of parsed.noiseSegmentIds) {
            if (typeof id === "string" && id.trim()) {
              noiseIds.add(id.trim());
            }
          }
        }

        // 2. Sparse format: uncertainSegments
        if (Array.isArray(parsed?.uncertainSegments)) {
          for (const u of parsed.uncertainSegments) {
            if (u && typeof u.segmentId === "string") {
              uncertainMap.set(u.segmentId.trim(), {
                reason: typeof u.reason === "string" ? u.reason : "Ambiguous or fragmented transcript",
                isSuspectedError: Boolean(u.suspectedTranscriptionError ?? u.suspected_transcription_error ?? true),
              });
            }
          }
        }

        // 3. Legacy verbose format (backward compatibility with existing mocks / responses)
        const legacyItems = Array.isArray(parsed?.classifications)
          ? parsed.classifications
          : Array.isArray(parsed)
          ? parsed
          : [];

        for (const item of legacyItems) {
          if (item && typeof item.segmentId === "string") {
            const segId = item.segmentId.trim();
            const classification = typeof item.classification === "string" ? item.classification : "relevant";
            legacyClassifications.set(segId, {
              classification,
              reason: item.reason,
              isSuspectedError: Boolean(item.suspectedTranscriptionError ?? item.suspected_transcription_error),
            });
          }
        }
      } catch {
        // In case of JSON parse failure, fallback
      }

      return { noiseIds, uncertainMap, legacyClassifications };
    };

    const classifySlice = async (
      slice: TranscriptSegment[],
      context: TranscriptSegment[],
      depth = 0,
    ): Promise<ParsedSliceResult> => {
      const prompt = `You are an expert clinical pharmacist and AI medical educator analyzing educational lecture transcripts.
Your task is to classify transcript segments for pharmacy flashcard generation.

IMPORTANT STRATEGY:
Assume transcript segments are "relevant" clinical content by default.
Identify ONLY:
1. "noiseSegmentIds": array of segment IDs that are purely conversational noise, greetings, audio tests ("cek suara"), administrative remarks ("link absen"), or jokes with no educational value.
2. "uncertainSegments": array of objects for segments that contain ambiguous, corrupted, or cut-off clinical statements (suspectedTranscriptionError: true).

CRITICAL GUARDRAIL:
Any segment with clinical entities (dosages, drug names, medical terms) MUST NOT be classified as noise. If uncertain or fragmented, list under uncertainSegments instead.

${
        context.length > 0
          ? `PREVIOUS CONTEXT (DO NOT CLASSIFY, FOR CONTEXT ONLY):
${context.map((s) => `[${s.segmentId}] ${s.normalizedText}`).join("\n")}
`
          : ""
      }
SEGMENTS TO EVALUATE:
${slice.map((s) => `[${s.segmentId}] ${s.normalizedText}`).join("\n")}

Respond ONLY with valid JSON in this exact structure:
{
  "noiseSegmentIds": ["seg-001"],
  "uncertainSegments": [
    {
      "segmentId": "seg-005",
      "reason": "cut-off dosage instruction",
      "suspectedTranscriptionError": true
    }
  ]
}`;

      try {
        const response = await geminiCaller({
          apiKey,
          model,
          prompt,
          maxOutputTokens: 8192,
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

        return parseResponseText(response.text);
      } catch (err: any) {
        const isMaxTokens =
          err?.code === "GEMINI_MAX_TOKENS" ||
          (typeof err?.message === "string" &&
            (err.message.includes("batas token") ||
              err.message.includes("MAX_TOKENS") ||
              err.message.includes("token limit")));

        // Bounded adaptive subdivision: if batch is large (> 15), within depth limit, and budget remaining
        if (
          isMaxTokens &&
          slice.length > 15 &&
          depth < MAX_SUBDIVISION_DEPTH &&
          subdivisionCallsRemaining >= 2
        ) {
          subdivisionCallsRemaining -= 2;
          const mid = Math.floor(slice.length / 2);
          const firstHalf = slice.slice(0, mid);
          const secondHalf = slice.slice(mid);
          const firstResults = await classifySlice(firstHalf, context, depth + 1);
          const secondResults = await classifySlice(secondHalf, [...context, ...firstHalf], depth + 1);

          const mergedNoise = new Set([...firstResults.noiseIds, ...secondResults.noiseIds]);
          const mergedUncertain = new Map([...firstResults.uncertainMap, ...secondResults.uncertainMap]);
          const mergedLegacy = new Map([
            ...(firstResults.legacyClassifications ?? []),
            ...(secondResults.legacyClassifications ?? []),
          ]);
          return {
            noiseIds: mergedNoise,
            uncertainMap: mergedUncertain,
            legacyClassifications: mergedLegacy,
          };
        }
        throw err;
      }
    };

    const { noiseIds, uncertainMap, legacyClassifications } = await classifySlice(targetSlice, contextBefore, 0);

    for (const seg of targetSlice) {
      let classification: "relevant" | "noise" | "uncertain" = "relevant";
      let reason = seg.hasClinicalEntities ? "Clinical entity detected" : "Default relevant";
      let isSuspectedError = false;

      // Check legacy format first if returned by mock
      if (legacyClassifications && legacyClassifications.has(seg.segmentId)) {
        const classItem = legacyClassifications.get(seg.segmentId)!;
        classification = (classItem.classification as any) ?? (seg.hasClinicalEntities ? "relevant" : "relevant");
        reason =
          classItem.reason ??
          (seg.hasClinicalEntities
            ? "Clinical entity detected"
            : classification === "noise"
            ? "Conversational noise"
            : classification === "uncertain"
            ? "Ambiguous or fragmented transcript"
            : "Default relevant");
        isSuspectedError = Boolean(classItem.isSuspectedError);
      } else if (uncertainMap.has(seg.segmentId)) {
        const item = uncertainMap.get(seg.segmentId)!;
        classification = "uncertain";
        reason = item.reason;
        isSuspectedError = item.isSuspectedError;
      } else if (noiseIds.has(seg.segmentId)) {
        classification = "noise";
        reason = "Conversational noise";
      }

      // CLINICAL ENTITY SHIELD GUARDRAIL:
      // If segment has clinical entities, it MUST NOT be classified as "noise".
      if (seg.hasClinicalEntities && classification === "noise") {
        classification = "uncertain";
        reason = "Protected by Clinical Entity Shield";
      }

      if (isSuspectedError && classification !== "relevant") {
        classification = "uncertain";
        seg.suspectedTranscriptionError = true;
      }

      seg.classification = classification;
      seg.reason = reason;
    }

    if (options.onChunkComplete) {
      const chunkIdx = Math.floor(i / chunkSize);
      const totalChunks = Math.ceil(segments.length / chunkSize);
      await options.onChunkComplete(
        segments.slice(0, i + chunkSize),
        chunkIdx,
        totalChunks,
      );
    }

    newlyProcessedChunksCount += 1;
    const hitChunkCap =
      maxChunksPerRun !== undefined &&
      newlyProcessedChunksCount >= maxChunksPerRun;
    const hitTimeBudget =
      maxExecutionMs !== undefined &&
      Date.now() - runStartedAt >= maxExecutionMs;

    if ((hitChunkCap || hitTimeBudget) && i + chunkSize < segments.length) {
      stoppedEarlyForChunkCap = true;
      break;
    }

    if (i + chunkSize < segments.length) {
      const isTestEnv = (typeof process !== "undefined" && (process.env?.VITEST || process.env?.NODE_ENV === "test")) ||
        (typeof Deno !== "undefined" && (Deno.env.get("VITEST") === "true" || Deno.env.get("NODE_ENV") === "test"));
      if (!isTestEnv) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }
  }

  const cleanedSegments = stoppedEarlyForChunkCap
    ? segments.filter((s) => s.classification !== undefined)
    : segments;
  const retainedSegments = cleanedSegments.filter(
    (s) => s.classification === "relevant" || s.classification === "uncertain",
  );
  const droppedNoiseCount =
    cleanedSegments.filter((s) => s.classification === "noise").length;
  const uncertainCount =
    cleanedSegments.filter((s) => s.classification === "uncertain").length;
  const retainedText = retainedSegments.map((s) => s.normalizedText).join("\n");

  return {
    segments: cleanedSegments,
    retainedSegments,
    retainedText,
    droppedNoiseCount,
    uncertainCount,
    metrics: aggregatedMetrics,
    tokenUsage: aggregatedMetrics,
    isComplete: !stoppedEarlyForChunkCap,
    totalSegmentsCount: segments.length,
  };
}
