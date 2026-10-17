import {
  generateGeminiStructuredDataWithUsage,
  type GeminiRequest,
  type GeminiUsageMetadata,
} from "../../_shared/gemini-client.ts";
import {
  type CardSourceReference,
  CardSourceReferenceSchema,
  type SourceConflictRecord,
  SourceConflictRecordSchema,
  type StageTokenMetrics,
  validateSourceConflictRecord,
} from "../../_shared/flash-card.ts";
import type { TranscriptSegment } from "./cleaner.ts";

export type ConceptHierarchyLevel = "subtopic" | "core_concept" | "attribute";

export type ConceptRelationType =
  | "mechanism_of"
  | "dosage_for"
  | "contraindicated_in"
  | "first_line_for"
  | "subset_of";

export type ConceptNode = {
  id: string;
  name: string;
  academicDomain: string;
  hierarchyLevel: ConceptHierarchyLevel;
  attributes?: Record<string, string>;
  domain?: string;
  level?: ConceptHierarchyLevel;
};

export type ConceptRelation = {
  sourceId: string;
  targetId: string;
  relationType: ConceptRelationType;
};

/**
 * In-memory directed knowledge graph for biomedical & pharmaceutical concepts.
 */
export class KnowledgeGraph {
  private nodes = new Map<string, ConceptNode>();
  private outgoing = new Map<string, ConceptRelation[]>();
  private incoming = new Map<string, ConceptRelation[]>();

  addNode(
    node:
      | ConceptNode
      | (Record<string, unknown> & { id: string; name: string }),
  ): void {
    const raw = node as Record<string, unknown>;
    const academicDomain = String(
      raw.academicDomain ?? raw.domain ?? "clinical_science",
    );
    const hierarchyLevel = (raw.hierarchyLevel ??
      raw.level ??
      "core_concept") as ConceptHierarchyLevel;

    const normalized: ConceptNode = {
      id: String(raw.id),
      name: String(raw.name),
      academicDomain,
      hierarchyLevel,
      domain: academicDomain,
      level: hierarchyLevel,
      attributes: (raw.attributes as Record<string, string>) ?? {},
    };

    this.nodes.set(normalized.id, normalized);
    if (!this.outgoing.has(normalized.id)) {
      this.outgoing.set(normalized.id, []);
    }
    if (!this.incoming.has(normalized.id)) {
      this.incoming.set(normalized.id, []);
    }
  }

  addEdge(relation: ConceptRelation): void {
    if (!this.outgoing.has(relation.sourceId)) {
      this.outgoing.set(relation.sourceId, []);
    }
    if (!this.incoming.has(relation.targetId)) {
      this.incoming.set(relation.targetId, []);
    }

    this.outgoing.get(relation.sourceId)!.push(relation);
    this.incoming.get(relation.targetId)!.push(relation);
  }

  getNode(id: string): ConceptNode | undefined {
    return this.nodes.get(id);
  }

  getOutgoingRelations(id: string): ConceptRelation[] {
    return [...(this.outgoing.get(id) ?? [])];
  }

  getIncomingRelations(id: string): ConceptRelation[] {
    return [...(this.incoming.get(id) ?? [])];
  }

  getAllNodes(): ConceptNode[] {
    return Array.from(this.nodes.values());
  }

  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }
}

/**
 * Builds an in-memory knowledge graph from concepts and optional directed relations.
 */
export function buildKnowledgeGraph(
  concepts: Array<ConceptNode | Record<string, unknown>>,
  relations: ConceptRelation[] = [],
): KnowledgeGraph {
  const graph = new KnowledgeGraph();
  for (const concept of concepts) {
    graph.addNode(concept as ConceptNode);
  }
  for (const relation of relations) {
    graph.addEdge(relation);
  }
  return graph;
}

export type SlideMatchParam = {
  pdfPageIndex?: number | null;
  printedSlideNumber?: number | null;
  quote: string;
  confidence?: "high" | "medium" | "low";
  isExact?: boolean;
  confidenceReason?: string;
};

export type TranscriptMatchParam = {
  segmentId?: string | null;
  quote: string;
  confidence?: "high" | "medium" | "low";
  isExact?: boolean;
  confidenceReason?: string;
};

export type BuildSourceReferencesParams = {
  slideMatch?: SlideMatchParam;
  transcriptMatch?: TranscriptMatchParam;
};

/**
 * Builds validated multi-source provenance records respecting the Zero-Hallucination rule.
 * Never fabricates page numbers (only positive numbers allowed, else null).
 * Quotes are strictly capped at 300 characters.
 */
export function buildSourceReferences(
  params: BuildSourceReferencesParams,
): CardSourceReference[] {
  const references: CardSourceReference[] = [];

  if (params.slideMatch) {
    const rawPage = params.slideMatch.pdfPageIndex;
    const pdfPageIndex =
      typeof rawPage === "number" && Number.isInteger(rawPage) && rawPage > 0
        ? rawPage
        : null;

    const rawPrinted = params.slideMatch.printedSlideNumber;
    const printedSlideNumber =
      typeof rawPrinted === "number" &&
      Number.isInteger(rawPrinted) &&
      rawPrinted > 0
        ? rawPrinted
        : undefined;

    const textQuote = (params.slideMatch.quote ?? "").trim().slice(0, 300);
    const isExact = Boolean(params.slideMatch.isExact);
    const provenanceStatus =
      pdfPageIndex === null
        ? "unanchored"
        : isExact
        ? "verified_exact"
        : "semantic_match";

    const sourceId =
      pdfPageIndex !== null
        ? `slide-page-${pdfPageIndex}`
        : "slide-unanchored";

    const alignmentConfidence =
      params.slideMatch.confidence ??
      (pdfPageIndex === null ? "low" : isExact ? "high" : "medium");

    const confidenceReason =
      params.slideMatch.confidenceReason ??
      (pdfPageIndex === null
        ? "Rujukan materi slide umum (tidak terjangkar)"
        : isExact
        ? `Kutipan harfiah slide terverifikasi pada halaman ${pdfPageIndex}`
        : `Kesesuaian konten semantik slide halaman ${pdfPageIndex}`);

    const slideRef: CardSourceReference = {
      sourceId,
      sourceType: "slide_pdf",
      provenanceStatus,
      location: {
        pdfPageIndex,
        printedSlideNumber,
        segmentId: null,
        textQuote,
      },
      alignmentConfidence,
      confidenceReason,
    };

    references.push(CardSourceReferenceSchema.parse(slideRef));
  }

  if (params.transcriptMatch) {
    const rawSegId = params.transcriptMatch.segmentId?.trim();
    const segmentId = rawSegId ? rawSegId : null;
    const textQuote = (params.transcriptMatch.quote ?? "").trim().slice(0, 300);
    const isExact = Boolean(params.transcriptMatch.isExact);

    const provenanceStatus =
      segmentId === null
        ? "unanchored"
        : isExact
        ? "verified_exact"
        : "semantic_match";

    const sourceId =
      segmentId !== null ? `transcript-${segmentId}` : "transcript-unanchored";

    const alignmentConfidence =
      params.transcriptMatch.confidence ??
      (segmentId === null ? "low" : isExact ? "high" : "medium");

    const confidenceReason =
      params.transcriptMatch.confidenceReason ??
      (segmentId === null
        ? "Penjelasan audio kuliah tanpa jangkar segmen"
        : isExact
        ? `Kutipan harfiah transkrip segmen ${segmentId}`
        : `Kesesuaian semantik audio kuliah segmen ${segmentId}`);

    const transcriptRef: CardSourceReference = {
      sourceId,
      sourceType: "transcript",
      provenanceStatus,
      location: {
        pdfPageIndex: null,
        printedSlideNumber: undefined,
        segmentId,
        textQuote,
      },
      alignmentConfidence,
      confidenceReason,
    };

    references.push(CardSourceReferenceSchema.parse(transcriptRef));
  }

  return references;
}

export type SlideInput = {
  pdfPageIndex: number;
  printedSlideNumber?: number | null;
  textSummary: string;
  keyTerms?: string[];
};

export type TranscriptSegmentInput = {
  segmentId: string;
  normalizedText?: string;
  text?: string;
  rawText?: string;
  hasClinicalEntities?: boolean;
};

export type ConflictCategory =
  | "dosage_discrepancy"
  | "contraindication_mismatch"
  | "drug_identity"
  | "formula_conflict"
  | "clinical_guideline";

export type CandidateComparison = {
  conceptId: string;
  conceptName?: string;
  slideClaim: string;
  slidePageIndex?: number | null;
  printedSlideNumber?: number | null;
  transcriptClaim: string;
  segmentId: string;
  category?: ConflictCategory;
};

export type AlignedSourceRecord = {
  conceptId: string;
  conceptName: string;
  alignmentType: "compatible_elaboration" | "direct_agreement" | "unanchored";
  slidePageIndex: number | null;
  printedSlideNumber?: number | null;
  slideClaim: string;
  segmentId: string | null;
  transcriptClaim: string;
  references: CardSourceReference[];
};

export type SourceAlignmentResult = {
  alignedSources: AlignedSourceRecord[];
  conflicts: SourceConflictRecord[];
  tokenUsage?: StageTokenMetrics;
};

export type AlignSourcesInput = {
  slides?: SlideInput[];
  segments?: Array<TranscriptSegment | TranscriptSegmentInput>;
  candidateComparisons?: CandidateComparison[];
  apiKey?: string;
  model?: string;
  geminiClient?: (request: GeminiRequest) => Promise<{
    data?: unknown;
    text?: string;
    usage: GeminiUsageMetadata;
    latencyMs?: number;
  }>;
};

/**
 * Extracts dosages with unit and numeric value.
 */
export function extractDosageEntities(
  text: string,
): Array<{ value: number; unit: string; raw: string }> {
  const results: Array<{ value: number; unit: string; raw: string }> = [];
  const regex = /\b(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|g|iu|ui|ml|%)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const numStr = match[1].replace(",", ".");
    const val = parseFloat(numStr);
    const unit = match[2].toLowerCase();
    if (!Number.isNaN(val)) {
      results.push({ value: val, unit, raw });
    }
  }
  return results;
}

/**
 * Checks if one claim permits / indicates and the other explicitly forbids / contraindicates.
 */
export function detectContraindicationMismatch(
  slideClaim: string,
  transcriptClaim: string,
): boolean {
  const contraindicationRegex =
    /\b(kontraindikasi|kontra-indikasi|tidak boleh|dilarang|jangan|hindari|toxic|toksik|contraindicated|contraindication)\b/i;
  const safeIndicatedRegex =
    /\b(aman|boleh|diindikasikan|indikasi|direkomendasikan|pilihan utama|dapat diberikan|safe|indicated)\b/i;

  const slideHasContra = contraindicationRegex.test(slideClaim);
  const slideHasSafe = safeIndicatedRegex.test(slideClaim);

  const transcriptHasContra = contraindicationRegex.test(transcriptClaim);
  const transcriptHasSafe = safeIndicatedRegex.test(transcriptClaim);

  return (
    (slideHasContra && transcriptHasSafe) ||
    (slideHasSafe && transcriptHasContra)
  );
}

/**
 * Checks for line of therapy or dosage frequency discrepancy.
 */
export function detectGuidelineMismatch(
  slideClaim: string,
  transcriptClaim: string,
): boolean {
  const firstLineRegex =
    /\b(lini\s*pertama|first\s*-?\s*line|pilihan\s*pertama)\b/i;
  const laterLineRegex =
    /\b(lini\s*kedua|second\s*-?\s*line|pilihan\s*kedua|lini\s*ketiga|third\s*-?\s*line)\b/i;

  const slideFirst = firstLineRegex.test(slideClaim);
  const slideLater = laterLineRegex.test(slideClaim);
  const transcriptFirst = firstLineRegex.test(transcriptClaim);
  const transcriptLater = laterLineRegex.test(transcriptClaim);

  if ((slideFirst && transcriptLater) || (slideLater && transcriptFirst)) {
    return true;
  }

  // Frequency comparison (e.g. 1x sehari vs 3x sehari or 1x1 vs 3x1)
  const freqRegex = /\b(\d+)\s*(?:x|kali)\s*(?:sehari|1\b)/gi;
  const slideFreqMatches = Array.from(slideClaim.matchAll(freqRegex)).map(
    (m) => m[1],
  );
  const transcriptFreqMatches = Array.from(
    transcriptClaim.matchAll(freqRegex),
  ).map((m) => m[1]);

  if (
    slideFreqMatches.length > 0 &&
    transcriptFreqMatches.length > 0 &&
    slideFreqMatches[0] !== transcriptFreqMatches[0]
  ) {
    return true;
  }

  return false;
}

/**
 * Identifies if transcript is a compatible elaboration (MOA explanation or clinical case study)
 * rather than a contradiction.
 */
export function isCompatibleElaboration(
  slideClaim: string,
  transcriptClaim: string,
): boolean {
  // Mechanism of Action keywords
  const moaRegex =
    /\b(mekanisme|mechanism|bekerja dengan|menghambat enzim|inhibit|reseptor|penghambat|stimulasi|agonist|antagonist|memblokir)\b/i;
  // Clinical case study / hospital practical context keywords
  const hospitalCaseRegex =
    /\b(studi kasus|contoh kasus|kasus di|rumah sakit|pasien di rs|bangsal|pengalaman klinis|praktek klinis|di bangsal|rawat inap)\b/i;

  const hasElaborationContext =
    moaRegex.test(transcriptClaim) || hospitalCaseRegex.test(transcriptClaim);

  // If there's an elaboration context and no direct dosage conflict, it's compatible elaboration
  if (hasElaborationContext) {
    const slideDoses = extractDosageEntities(slideClaim);
    const transcriptDoses = extractDosageEntities(transcriptClaim);

    // If both have dosages, check if they contradict
    if (slideDoses.length > 0 && transcriptDoses.length > 0) {
      const slideValues = new Set(slideDoses.map((d) => `${d.value}_${d.unit}`));
      const hasMatchingDose = transcriptDoses.some((d) =>
        slideValues.has(`${d.value}_${d.unit}`),
      );
      if (!hasMatchingDose) {
        return false; // Actually a dosage contradiction
      }
    }

    if (detectContraindicationMismatch(slideClaim, transcriptClaim)) {
      return false; // Actually a contraindication contradiction
    }

    return true;
  }

  return false;
}

/**
 * Deterministically evaluates candidate comparisons or matches slides with segments.
 */
function evaluateDeterministically(input: AlignSourcesInput): {
  alignedSources: AlignedSourceRecord[];
  conflicts: SourceConflictRecord[];
} {
  const alignedSources: AlignedSourceRecord[] = [];
  const conflicts: SourceConflictRecord[] = [];

  const candidates: CandidateComparison[] = [];

  if (input.candidateComparisons && input.candidateComparisons.length > 0) {
    candidates.push(...input.candidateComparisons);
  } else if (input.slides && input.segments) {
    // Automatically correlate slides and segments
    for (const segment of input.segments) {
      const text =
        segment.normalizedText ??
        segment.text ??
        segment.rawText ??
        "";
      if (!text.trim()) continue;

      let matchedSlide: SlideInput | undefined;
      for (const slide of input.slides) {
        if (
          slide.keyTerms?.some((term) =>
            text.toLowerCase().includes(term.toLowerCase()),
          ) ||
          slide.textSummary
            .toLowerCase()
            .split(/\s+/)
            .some(
              (w) => w.length > 5 && text.toLowerCase().includes(w),
            )
        ) {
          matchedSlide = slide;
          break;
        }
      }

      if (matchedSlide) {
        candidates.push({
          conceptId: `cpt-auto-${segment.segmentId}`,
          conceptName: matchedSlide.keyTerms?.[0] ?? "Materi Slide",
          slideClaim: matchedSlide.textSummary,
          slidePageIndex: matchedSlide.pdfPageIndex,
          printedSlideNumber: matchedSlide.printedSlideNumber,
          transcriptClaim: text,
          segmentId: segment.segmentId,
        });
      } else {
        // Unanchored segment
        alignedSources.push({
          conceptId: `cpt-unanchored-${segment.segmentId}`,
          conceptName: "Penjelasan Tambahan Transkrip",
          alignmentType: "unanchored",
          slidePageIndex: null,
          printedSlideNumber: null,
          slideClaim: "",
          segmentId: segment.segmentId,
          transcriptClaim: text,
          references: buildSourceReferences({
            transcriptMatch: {
              segmentId: segment.segmentId,
              quote: text,
              confidence: "medium",
            },
          }),
        });
      }
    }
  }

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const slideClaim = candidate.slideClaim ?? "";
    const transcriptClaim = candidate.transcriptClaim ?? "";

    // 1. Check for dosage contradiction
    const slideDoses = extractDosageEntities(slideClaim);
    const transcriptDoses = extractDosageEntities(transcriptClaim);

    let isDosageConflict = false;
    if (slideDoses.length > 0 && transcriptDoses.length > 0) {
      const slideValues = new Set(
        slideDoses.map((d) => `${d.value}_${d.unit}`),
      );
      const anyMatch = transcriptDoses.some((d) =>
        slideValues.has(`${d.value}_${d.unit}`),
      );
      if (!anyMatch) {
        isDosageConflict = true;
      }
    }

    if (candidate.category === "dosage_discrepancy" || isDosageConflict) {
      const validPageIndex =
        typeof candidate.slidePageIndex === "number" &&
        Number.isInteger(candidate.slidePageIndex) &&
        candidate.slidePageIndex > 0
          ? candidate.slidePageIndex
          : null;

      const validPrinted =
        typeof candidate.printedSlideNumber === "number" &&
        Number.isInteger(candidate.printedSlideNumber) &&
        candidate.printedSlideNumber > 0
          ? candidate.printedSlideNumber
          : undefined;

      const conflict: SourceConflictRecord = {
        conflictId: `cnf-dose-${candidate.conceptId}-${i + 1}`,
        conceptId: candidate.conceptId,
        category: "dosage_discrepancy",
        severity: "critical",
        slideEvidence: {
          pdfPageIndex: validPageIndex,
          printedSlideNumber: validPrinted,
          exactQuote: slideClaim.trim().slice(0, 300),
        },
        transcriptEvidence: {
          segmentId: candidate.segmentId,
          exactQuote: transcriptClaim.trim().slice(0, 300),
        },
        distinctionType: "substantive_contradiction",
        resolutionStatus: "unresolved",
        clinicalClarificationNotes:
          "Pertentangan dosis antara teks slide dan rekaman transkrip kuliah.",
      };

      conflicts.push(validateSourceConflictRecord(conflict));
      continue;
    }

    // 2. Check for contraindication mismatch
    if (
      candidate.category === "contraindication_mismatch" ||
      detectContraindicationMismatch(slideClaim, transcriptClaim)
    ) {
      const validPageIndex =
        typeof candidate.slidePageIndex === "number" &&
        Number.isInteger(candidate.slidePageIndex) &&
        candidate.slidePageIndex > 0
          ? candidate.slidePageIndex
          : null;

      const validPrinted =
        typeof candidate.printedSlideNumber === "number" &&
        Number.isInteger(candidate.printedSlideNumber) &&
        candidate.printedSlideNumber > 0
          ? candidate.printedSlideNumber
          : undefined;

      const conflict: SourceConflictRecord = {
        conflictId: `cnf-contra-${candidate.conceptId}-${i + 1}`,
        conceptId: candidate.conceptId,
        category: "contraindication_mismatch",
        severity: "critical",
        slideEvidence: {
          pdfPageIndex: validPageIndex,
          printedSlideNumber: validPrinted,
          exactQuote: slideClaim.trim().slice(0, 300),
        },
        transcriptEvidence: {
          segmentId: candidate.segmentId,
          exactQuote: transcriptClaim.trim().slice(0, 300),
        },
        distinctionType: "substantive_contradiction",
        resolutionStatus: "unresolved",
        clinicalClarificationNotes:
          "Pertentangan status kontraindikasi atau keamanan pasien antara slide dan transkrip.",
      };

      conflicts.push(validateSourceConflictRecord(conflict));
      continue;
    }

    // 3. Check for guideline / frequency discrepancy
    if (
      candidate.category === "clinical_guideline" ||
      detectGuidelineMismatch(slideClaim, transcriptClaim)
    ) {
      const validPageIndex =
        typeof candidate.slidePageIndex === "number" &&
        Number.isInteger(candidate.slidePageIndex) &&
        candidate.slidePageIndex > 0
          ? candidate.slidePageIndex
          : null;

      const validPrinted =
        typeof candidate.printedSlideNumber === "number" &&
        Number.isInteger(candidate.printedSlideNumber) &&
        candidate.printedSlideNumber > 0
          ? candidate.printedSlideNumber
          : undefined;

      const conflict: SourceConflictRecord = {
        conflictId: `cnf-guide-${candidate.conceptId}-${i + 1}`,
        conceptId: candidate.conceptId,
        category: "clinical_guideline",
        severity: "high",
        slideEvidence: {
          pdfPageIndex: validPageIndex,
          printedSlideNumber: validPrinted,
          exactQuote: slideClaim.trim().slice(0, 300),
        },
        transcriptEvidence: {
          segmentId: candidate.segmentId,
          exactQuote: transcriptClaim.trim().slice(0, 300),
        },
        distinctionType: "substantive_contradiction",
        resolutionStatus: "unresolved",
        clinicalClarificationNotes:
          "Perbedaan lini terapi klinis atau frekuensi pemberian obat.",
      };

      conflicts.push(validateSourceConflictRecord(conflict));
      continue;
    }

    // 4. Minor technical terminology differences (e.g. drug identity)
    if (candidate.category === "drug_identity" || candidate.category === "formula_conflict") {
      const validPageIndex =
        typeof candidate.slidePageIndex === "number" &&
        Number.isInteger(candidate.slidePageIndex) &&
        candidate.slidePageIndex > 0
          ? candidate.slidePageIndex
          : null;

      const validPrinted =
        typeof candidate.printedSlideNumber === "number" &&
        Number.isInteger(candidate.printedSlideNumber) &&
        candidate.printedSlideNumber > 0
          ? candidate.printedSlideNumber
          : undefined;

      const conflict: SourceConflictRecord = {
        conflictId: `cnf-term-${candidate.conceptId}-${i + 1}`,
        conceptId: candidate.conceptId,
        category: candidate.category,
        severity: "moderate",
        slideEvidence: {
          pdfPageIndex: validPageIndex,
          printedSlideNumber: validPrinted,
          exactQuote: slideClaim.trim().slice(0, 300),
        },
        transcriptEvidence: {
          segmentId: candidate.segmentId,
          exactQuote: transcriptClaim.trim().slice(0, 300),
        },
        distinctionType: "substantive_contradiction",
        resolutionStatus: "unresolved",
        clinicalClarificationNotes:
          "Perbedaan peristilahan teknis atau formula antar sumber.",
      };

      conflicts.push(validateSourceConflictRecord(conflict));
      continue;
    }

    // 5. Compatible elaboration (MOA, case study) or direct agreement
    const isElab = isCompatibleElaboration(slideClaim, transcriptClaim);
    const validPageIndex =
      typeof candidate.slidePageIndex === "number" &&
      Number.isInteger(candidate.slidePageIndex) &&
      candidate.slidePageIndex > 0
        ? candidate.slidePageIndex
        : null;

    const validPrinted =
      typeof candidate.printedSlideNumber === "number" &&
      Number.isInteger(candidate.printedSlideNumber) &&
      candidate.printedSlideNumber > 0
        ? candidate.printedSlideNumber
        : undefined;

    const isSlideAnchored =
      validPageIndex !== null && Boolean(slideClaim.trim());
    const isTranscriptAnchored =
      Boolean(candidate.segmentId?.trim()) && Boolean(transcriptClaim.trim());

    const references = buildSourceReferences({
      slideMatch: {
        pdfPageIndex: validPageIndex,
        printedSlideNumber: validPrinted,
        quote: slideClaim,
        confidence: isSlideAnchored ? "high" : "low",
        isExact: isSlideAnchored,
      },
      transcriptMatch: {
        segmentId: candidate.segmentId,
        quote: transcriptClaim,
        confidence: isTranscriptAnchored ? "high" : "low",
        isExact: isTranscriptAnchored,
      },
    });

    alignedSources.push({
      conceptId: candidate.conceptId,
      conceptName: candidate.conceptName ?? candidate.conceptId,
      alignmentType: isElab ? "compatible_elaboration" : "direct_agreement",
      slidePageIndex: validPageIndex,
      printedSlideNumber: validPrinted ?? null,
      slideClaim,
      segmentId: candidate.segmentId,
      transcriptClaim,
      references,
    });
  }

  return { alignedSources, conflicts };
}

/**
 * Wraps synchronous alignment in a Thenable structure so it can be used either
 * synchronously or with await.
 */
function createSyncThenableResult(
  alignedSources: AlignedSourceRecord[],
  conflicts: SourceConflictRecord[],
  tokenUsage: StageTokenMetrics,
): SourceAlignmentResult & PromiseLike<SourceAlignmentResult> {
  const result: SourceAlignmentResult = {
    alignedSources,
    conflicts,
    tokenUsage,
  };

  return Object.assign(result, {
    then<TResult1 = SourceAlignmentResult, TResult2 = never>(
      onfulfilled?:
        | ((value: SourceAlignmentResult) => TResult1 | PromiseLike<TResult1>)
        | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2> {
      return Promise.resolve(result).then(onfulfilled, onrejected);
    },
    catch<TResult = never>(
      onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
    ): Promise<SourceAlignmentResult | TResult> {
      return Promise.resolve(result).catch(onrejected);
    },
    finally(onfinally?: (() => void) | null): Promise<SourceAlignmentResult> {
      return Promise.resolve(result).finally(onfinally);
    },
  });
}

/**
 * Aligns lecture slides with transcript segments and detects substantive conflicts.
 * When `geminiClient` is provided, performs LLM semantic alignment.
 * Otherwise, performs high-precision deterministic clinical alignment.
 */
export function alignSourcesAndDetectConflicts(
  input: AlignSourcesInput,
): (SourceAlignmentResult & PromiseLike<SourceAlignmentResult>) | Promise<SourceAlignmentResult> {
  // If geminiClient is explicitly provided, run async LLM-based alignment
  if (input.geminiClient) {
    return (async () => {
      const startedAt = Date.now();
      const candidates = input.candidateComparisons ?? [];

      const prompt = `Evaluasi perbandingan klaim materi slide kuliah vs penjelasan transkrip audio berikut.
Bedakan apakah perbedaan merupakan:
1. "compatible_elaboration": transkrip menjelaskan mekanisme kerja (MOA) atau memberikan contoh kasus rumah sakit / studi kasus praktis yang selaras dengan slide tanpa bertentangan dosis / kontraindikasi.
2. "substantive_contradiction": terjadi pertentangan nyata (misalnya perbedaan dosis numerik, pertentangan kontraindikasi, perbedaan lini terapi, atau kontradiksi formula).

Kandidat perbandingan:
${JSON.stringify(candidates, null, 2)}

Format JSON keluaran:
{
  "evaluations": [
    {
      "conceptId": "string",
      "distinctionType": "compatible_elaboration" | "substantive_contradiction",
      "category": "dosage_discrepancy" | "contraindication_mismatch" | "drug_identity" | "formula_conflict" | "clinical_guideline",
      "severity": "critical" | "high" | "moderate",
      "reason": "string"
    }
  ]
}`;

      const schema = {
        type: "OBJECT",
        properties: {
          evaluations: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                conceptId: { type: "STRING" },
                distinctionType: {
                  type: "STRING",
                  enum: ["compatible_elaboration", "substantive_contradiction"],
                },
                category: {
                  type: "STRING",
                  enum: [
                    "dosage_discrepancy",
                    "contraindication_mismatch",
                    "drug_identity",
                    "formula_conflict",
                    "clinical_guideline",
                  ],
                },
                severity: {
                  type: "STRING",
                  enum: ["critical", "high", "moderate"],
                },
                reason: { type: "STRING" },
              },
              required: ["conceptId", "distinctionType"],
            },
          },
        },
        required: ["evaluations"],
      };

      const response = await input.geminiClient!({
        apiKey: input.apiKey ?? "internal",
        model: input.model ?? "gemini-3.8-flash",
        prompt,
        responseMimeType: "application/json",
        responseSchema: schema,
        thinkingLevel: "low",
      });

      let parsed: {
        evaluations: Array<{
          conceptId: string;
          distinctionType: "compatible_elaboration" | "substantive_contradiction";
          category?: ConflictCategory;
          severity?: "critical" | "high" | "moderate";
          reason?: string;
        }>;
      };

      if (response.data && typeof response.data === "object") {
        parsed = response.data as typeof parsed;
      } else if (response.text) {
        try {
          parsed = JSON.parse(response.text);
        } catch {
          // Fallback to deterministic if LLM output fails
          const det = evaluateDeterministically(input);
          return createSyncThenableResult(det.alignedSources, det.conflicts, {
            isAvailable: true,
            promptTokenCount: response.usage.promptTokenCount,
            candidatesTokenCount: response.usage.candidatesTokenCount,
            totalTokenCount: response.usage.totalTokenCount,
            thoughtsTokenCount: response.usage.thoughtsTokenCount,
            statusText: "FALLBACK_TO_DETERMINISTIC",
          });
        }
      } else {
        const det = evaluateDeterministically(input);
        return createSyncThenableResult(det.alignedSources, det.conflicts, {
          isAvailable: false,
          promptTokenCount: null,
          candidatesTokenCount: null,
          totalTokenCount: null,
          thoughtsTokenCount: null,
          statusText: "NO_DATA",
        });
      }

      const evalMap = new Map(
        (parsed.evaluations ?? []).map((e) => [e.conceptId, e]),
      );

      const alignedSources: AlignedSourceRecord[] = [];
      const conflicts: SourceConflictRecord[] = [];

      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        const evaluation = evalMap.get(c.conceptId);

        const validPageIndex =
          typeof c.slidePageIndex === "number" &&
          Number.isInteger(c.slidePageIndex) &&
          c.slidePageIndex > 0
            ? c.slidePageIndex
            : null;

        const validPrinted =
          typeof c.printedSlideNumber === "number" &&
          Number.isInteger(c.printedSlideNumber) &&
          c.printedSlideNumber > 0
            ? c.printedSlideNumber
            : undefined;

        if (
          evaluation?.distinctionType === "substantive_contradiction" ||
          (!evaluation &&
            evaluateDeterministically({ candidateComparisons: [c] }).conflicts
              .length > 0)
        ) {
          const category =
            evaluation?.category ?? c.category ?? "dosage_discrepancy";
          const severity =
            evaluation?.severity ??
            (category === "dosage_discrepancy" ||
            category === "contraindication_mismatch"
              ? "critical"
              : category === "clinical_guideline"
              ? "high"
              : "moderate");

          const conflict: SourceConflictRecord = {
            conflictId: `cnf-llm-${c.conceptId}-${i + 1}`,
            conceptId: c.conceptId,
            category,
            severity,
            slideEvidence: {
              pdfPageIndex: validPageIndex,
              printedSlideNumber: validPrinted,
              exactQuote: (c.slideClaim ?? "").trim().slice(0, 300),
            },
            transcriptEvidence: {
              segmentId: c.segmentId,
              exactQuote: (c.transcriptClaim ?? "").trim().slice(0, 300),
            },
            distinctionType: "substantive_contradiction",
            resolutionStatus: "unresolved",
            clinicalClarificationNotes:
              evaluation?.reason ?? "Terdeteksi kontradiksi substansial.",
          };

          conflicts.push(validateSourceConflictRecord(conflict));
        } else {
          const isSlideAnchored =
            validPageIndex !== null && Boolean(c.slideClaim?.trim());
          const isTranscriptAnchored =
            Boolean(c.segmentId?.trim()) && Boolean(c.transcriptClaim?.trim());

          const references = buildSourceReferences({
            slideMatch: {
              pdfPageIndex: validPageIndex,
              printedSlideNumber: validPrinted,
              quote: c.slideClaim,
              confidence: isSlideAnchored ? "high" : "low",
              isExact: isSlideAnchored,
            },
            transcriptMatch: {
              segmentId: c.segmentId,
              quote: c.transcriptClaim,
              confidence: isTranscriptAnchored ? "high" : "low",
              isExact: isTranscriptAnchored,
            },
          });

          alignedSources.push({
            conceptId: c.conceptId,
            conceptName: c.conceptName ?? c.conceptId,
            alignmentType: "compatible_elaboration",
            slidePageIndex: validPageIndex,
            printedSlideNumber: validPrinted ?? null,
            slideClaim: c.slideClaim,
            segmentId: c.segmentId,
            transcriptClaim: c.transcriptClaim,
            references,
          });
        }
      }

      const tokenUsage: StageTokenMetrics = {
        isAvailable: response.usage.isAvailable,
        promptTokenCount: response.usage.promptTokenCount,
        candidatesTokenCount: response.usage.candidatesTokenCount,
        totalTokenCount: response.usage.totalTokenCount,
        thoughtsTokenCount: response.usage.thoughtsTokenCount,
        statusText: "COMPLETED",
      };

      return {
        alignedSources,
        conflicts,
        tokenUsage,
      };
    })();
  }

  // Deterministic evaluation path
  const { alignedSources, conflicts } = evaluateDeterministically(input);
  const tokenUsage: StageTokenMetrics = {
    isAvailable: false,
    statusText: "HEURISTIC_DETERMINISTIC_ALIGNMENT",
    promptTokenCount: null,
    candidatesTokenCount: null,
    totalTokenCount: null,
    thoughtsTokenCount: null,
  };

  return createSyncThenableResult(alignedSources, conflicts, tokenUsage);
}

export const detectSourceConflicts = alignSourcesAndDetectConflicts;
