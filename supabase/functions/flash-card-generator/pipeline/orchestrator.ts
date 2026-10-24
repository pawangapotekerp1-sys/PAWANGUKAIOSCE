import {
  type CardMetadata,
  type FlashCardAcademicGroup,
  type MaterialMetadata,
  type SourceConflictRecord,
  type StageTokenMetrics,
  validateMaterialMetadata,
} from "../../_shared/flash-card.ts";
import {
  type GeminiRequest,
  type GeminiUsageMetadata,
  normalizeAiModel,
} from "../../_shared/gemini-client.ts";
import {
  cleanTranscript,
  type CleanedTranscriptResult,
  type TranscriptSegment,
} from "./cleaner.ts";
import {
  alignSourcesAndDetectConflicts,
  buildKnowledgeGraph,
  type AlignedSourceRecord,
  type CandidateComparison,
  type ConceptNode,
  type ConceptRelation,
  type KnowledgeGraph,
  type SlideInput,
  type SourceAlignmentResult,
} from "./aligner.ts";
import {
  buildCandidateEvidencePack,
  generateCandidateCards,
  type CandidateCard,
  type CandidateEvidencePackResult,
  type GenerationResult,
  type GenerationSubtopic,
} from "./generator.ts";
import {
  reviewCandidateCards,
  type RejectedAuditEntry,
  type ReviewResult,
} from "./reviewer.ts";
import {
  repairDefectiveCards,
  type RepairResult,
} from "./repairer.ts";

export const DEFAULT_MAX_CLEANING_CHUNKS_PER_STEP = 3;

export type PipelineStageName =
  | "ingestion"
  | "transcript_cleaning"
  | "concept_mapping"
  | "alignment_and_conflict_detection"
  | "candidate_generation"
  | "adversarial_review"
  | "targeted_repair"
  | "validation_and_storage";

export const PIPELINE_STAGES: readonly PipelineStageName[] = [
  "ingestion",
  "transcript_cleaning",
  "concept_mapping",
  "alignment_and_conflict_detection",
  "candidate_generation",
  "adversarial_review",
  "targeted_repair",
  "validation_and_storage",
] as const;

export interface PipelineCheckpoint {
  currentStage: string;
  completedStages: string[];
  stageArtifacts: Record<string, unknown>;
  updatedAt?: string;
}

export interface PipelineCardOutput {
  frontText: string;
  backText: string;
  front_text?: string;
  back_text?: string;
  metadata?: CardMetadata;
}

export interface PipelineSubtopicOutput {
  title: string;
  summary: string;
  cards: PipelineCardOutput[];
}

export type PipelineStepGroup = "cleaning" | "generation" | "review" | "all";

export interface PipelineOptions {
  title: string;
  academicGroup?: FlashCardAcademicGroup | string;
  transcriptText: string;
  pdfBytes?: Uint8Array | null;
  hasPdfSource?: boolean;
  pdfByteLength?: number;
  slides?: SlideInput[];
  candidateComparisons?: CandidateComparison[];
  concepts?: ConceptNode[];
  relations?: ConceptRelation[];
  apiKey?: string;
  model?: string;
  geminiClient?: (request: GeminiRequest) => Promise<{
    data?: unknown;
    text?: string;
    usage?: GeminiUsageMetadata;
    latencyMs?: number;
  }>;
  checkpoint?: PipelineCheckpoint;
  stepGroup?: PipelineStepGroup;
  cleaningChunkSize?: number;
  maxCleaningChunksPerRun?: number;
  onStageComplete?: (stage: PipelineStageName, checkpoint: PipelineCheckpoint) => Promise<void> | void;
  onResumeCheckpoint?: (checkpoint: PipelineCheckpoint) => Promise<void> | void;
}

export interface PipelineResult {
  globalSummary: string;
  subtopics: PipelineSubtopicOutput[];
  cards?: PipelineCardOutput[];
  metadata: MaterialMetadata;
  checkpoint: PipelineCheckpoint;
  isSuspended?: boolean;
  nextStepGroup?: PipelineStepGroup | "finished";
}

function emptyTokenMetrics(): StageTokenMetrics {
  return {
    isAvailable: false,
    promptTokenCount: 0,
    candidatesTokenCount: 0,
    totalTokenCount: 0,
    thoughtsTokenCount: 0,
    statusText: "NO_TOKENS",
  };
}

function normalizeStageTokenMetrics(usage?: GeminiUsageMetadata | StageTokenMetrics | null): StageTokenMetrics {
  if (!usage) {
    return emptyTokenMetrics();
  }
  return {
    isAvailable: Boolean(usage.isAvailable),
    promptTokenCount: usage.promptTokenCount ?? 0,
    candidatesTokenCount: usage.candidatesTokenCount ?? 0,
    totalTokenCount: usage.totalTokenCount ?? 0,
    thoughtsTokenCount: usage.thoughtsTokenCount ?? 0,
    statusText: (usage as StageTokenMetrics).statusText ?? "COMPLETED",
  };
}

function aggregateStageTokenMetrics(metricsList: StageTokenMetrics[]): StageTokenMetrics {
  let isAvailable = false;
  let promptTokenCount = 0;
  let candidatesTokenCount = 0;
  let totalTokenCount = 0;
  let thoughtsTokenCount = 0;

  for (const metric of metricsList) {
    if (metric.isAvailable) {
      isAvailable = true;
      promptTokenCount += metric.promptTokenCount ?? 0;
      candidatesTokenCount += metric.candidatesTokenCount ?? 0;
      totalTokenCount += metric.totalTokenCount ?? 0;
      thoughtsTokenCount += metric.thoughtsTokenCount ?? 0;
    }
  }

  return {
    isAvailable,
    promptTokenCount,
    candidatesTokenCount,
    totalTokenCount,
    thoughtsTokenCount,
    statusText: isAvailable ? "COMPLETED" : "NO_TOKENS",
  };
}

/**
 * Executes or resumes the 8-stage Source-Aware Flashcard Pipeline.
 */
export async function runFlashCardPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const startTime = Date.now();
  const model = normalizeAiModel(options.model);
  const apiKey = options.apiKey ?? "";

  const rawCheckpoint = options.checkpoint as any;
  const checkpoint: PipelineCheckpoint = rawCheckpoint
    ? {
        currentStage: typeof rawCheckpoint.currentStage === "string" ? rawCheckpoint.currentStage : "ingestion",
        completedStages: Array.isArray(rawCheckpoint.completedStages) ? [...rawCheckpoint.completedStages] : [],
        stageArtifacts: rawCheckpoint.stageArtifacts && typeof rawCheckpoint.stageArtifacts === "object" ? { ...rawCheckpoint.stageArtifacts } : {},
        updatedAt: typeof rawCheckpoint.updatedAt === "string" ? rawCheckpoint.updatedAt : undefined,
      }
    : {
        currentStage: "ingestion",
        completedStages: [],
        stageArtifacts: {},
      };

  const isStageCompleted = (stage: PipelineStageName) => checkpoint.completedStages.includes(stage);

  const markStageCompleted = async (stage: PipelineStageName, artifact: unknown, nextStage: PipelineStageName | "finished") => {
    checkpoint.stageArtifacts[stage] = artifact;
    if (!checkpoint.completedStages.includes(stage)) {
      checkpoint.completedStages.push(stage);
    }
    checkpoint.currentStage = nextStage;
    checkpoint.updatedAt = new Date().toISOString();
    if (options.onStageComplete) {
      await options.onStageComplete(stage, checkpoint);
    }
  };

  // If resuming from checkpoint with previously completed stages, emit resume callback
  if (options.onResumeCheckpoint && checkpoint.completedStages.length > 0) {
    await options.onResumeCheckpoint(checkpoint);
  }

  // Stage 1: Ingestion
  let transcriptText = options.transcriptText ?? "";
  let pdfBytes = options.pdfBytes ?? null;
  let slides = options.slides ?? [];
  let candidateComparisons = options.candidateComparisons ?? [];
  let concepts = options.concepts ?? [];
  let relations = options.relations ?? [];

  if (isStageCompleted("ingestion")) {
    const artifact = checkpoint.stageArtifacts["ingestion"] as Record<string, unknown> | undefined;
    if (artifact) {
      if (!transcriptText && typeof artifact.transcriptText === "string") {
        transcriptText = artifact.transcriptText;
      }
      // pdfBytes is kept from options.pdfBytes (already loaded from storage) to avoid duplicating binary in DB jsonb
      if (options.pdfBytes instanceof Uint8Array || options.pdfBytes === null) pdfBytes = options.pdfBytes;
      if (Array.isArray(artifact.slides)) slides = artifact.slides as SlideInput[];
      if (Array.isArray(artifact.candidateComparisons)) candidateComparisons = artifact.candidateComparisons as CandidateComparison[];
      if (Array.isArray(artifact.concepts)) concepts = artifact.concepts as ConceptNode[];
      if (Array.isArray(artifact.relations)) relations = artifact.relations as ConceptRelation[];
    }
  } else {
    checkpoint.currentStage = "ingestion";
    await markStageCompleted(
      "ingestion",
      {
        transcriptCharCount: transcriptText.length,
        hasPdf: options.hasPdfSource ?? Boolean(pdfBytes && pdfBytes.byteLength > 0),
        pdfByteLength: options.pdfByteLength ?? (pdfBytes ? pdfBytes.byteLength : 0),
        isPdfBytesInMemory: Boolean(pdfBytes && pdfBytes.byteLength > 0),
        slides,
        candidateComparisons,
        concepts,
        relations,
      },
      "transcript_cleaning",
    );
  }

  // Stage 2: Transcript Cleaning
  let cleanedResult: CleanedTranscriptResult;
  let cleanerTokenUsage: StageTokenMetrics;

  if (isStageCompleted("transcript_cleaning")) {
    const artifact = checkpoint.stageArtifacts["transcript_cleaning"] as {
      cleanedResult?: CleanedTranscriptResult;
      retainedText?: string;
      retainedSegments?: TranscriptSegment[];
      tokenUsage?: StageTokenMetrics;
      droppedNoiseCount?: number;
      uncertainCount?: number;
    };
    const retainedSegments = artifact?.retainedSegments ?? artifact?.cleanedResult?.retainedSegments ?? [];
    const retainedText =
      artifact?.retainedText ??
      artifact?.cleanedResult?.retainedText ??
      retainedSegments.map((s) => s.normalizedText).join(" ");
    cleanedResult = artifact?.cleanedResult ?? {
      segments: retainedSegments,
      retainedSegments,
      retainedText,
      droppedNoiseCount: artifact?.droppedNoiseCount ?? artifact?.cleanedResult?.droppedNoiseCount ?? 0,
      uncertainCount: artifact?.uncertainCount ?? artifact?.cleanedResult?.uncertainCount ?? 0,
      metrics: emptyTokenMetrics(),
      tokenUsage: artifact?.tokenUsage ?? artifact?.cleanedResult?.tokenUsage ?? emptyTokenMetrics(),
    };
    cleanerTokenUsage = normalizeStageTokenMetrics(artifact?.tokenUsage ?? cleanedResult.tokenUsage);
  } else {
    checkpoint.currentStage = "transcript_cleaning";
    const partialCleaning = checkpoint.stageArtifacts["transcript_cleaning_partial"] as {
      completedSegments?: TranscriptSegment[];
      totalSegmentsCount?: number;
      tokenUsage?: GeminiUsageMetadata;
    } | undefined;

    cleanedResult = await cleanTranscript(transcriptText, {
      apiKey,
      model,
      chunkSize: options.cleaningChunkSize,
      maxChunksPerRun: options.maxCleaningChunksPerRun ?? (options.stepGroup === "cleaning" ? DEFAULT_MAX_CLEANING_CHUNKS_PER_STEP : undefined),
      cachedSegments: partialCleaning?.completedSegments,
      onChunkComplete: async (completedSegments) => {
        checkpoint.stageArtifacts["transcript_cleaning_partial"] = {
          completedSegments,
          totalSegmentsCount: undefined,
        };
        checkpoint.updatedAt = new Date().toISOString();
        if (options.onStageComplete) {
          await options.onStageComplete("transcript_cleaning", checkpoint);
        }
      },
      geminiClient: options.geminiClient as any,
    });
    cleanerTokenUsage = normalizeStageTokenMetrics(cleanedResult.tokenUsage);

    if (cleanedResult.isComplete === false) {
      checkpoint.stageArtifacts["transcript_cleaning_partial"] = {
        completedSegments: cleanedResult.segments,
        totalSegmentsCount: cleanedResult.totalSegmentsCount ?? cleanedResult.segments.length,
        tokenUsage: cleanedResult.tokenUsage,
      };
      checkpoint.updatedAt = new Date().toISOString();
      if (options.onStageComplete) {
        await options.onStageComplete("transcript_cleaning", checkpoint);
      }
      const rawMetadata: MaterialMetadata = {
        pipelineVersion: "gemini-3.8-source-aware-v1",
        modelUsed: model,
        executionDurationMs: Date.now() - startTime,
        pipelineCheckpoint: checkpoint as any,
        tokenUsage: {
          transcript_cleaning: cleanerTokenUsage,
          total: cleanerTokenUsage,
        },
        qualityReport: {
          totalCardsGenerated: 0,
          acceptedCount: 0,
          repairedCount: 0,
          droppedCount: 0,
          conflictsCount: 0,
          unresolvedCriticalOrHighConflicts: 0,
        },
        sourceConflicts: [],
        rejectedAuditTrail: [],
      };

      return {
        globalSummary: "",
        subtopics: [],
        cards: [],
        metadata: validateMaterialMetadata(rawMetadata),
        checkpoint,
        isSuspended: true,
        nextStepGroup: "cleaning",
      };
    }

    delete checkpoint.stageArtifacts["transcript_cleaning_partial"];
    await markStageCompleted(
      "transcript_cleaning",
      {
        retainedSegments: cleanedResult.retainedSegments,
        droppedNoiseCount: cleanedResult.droppedNoiseCount,
        uncertainCount: cleanedResult.uncertainCount,
        tokenUsage: cleanerTokenUsage,
      },
      "concept_mapping",
    );
  }

  if (options.stepGroup === "cleaning") {
    const rawMetadata: MaterialMetadata = {
      pipelineVersion: "gemini-3.8-source-aware-v1",
      modelUsed: model,
      executionDurationMs: Date.now() - startTime,
      pipelineCheckpoint: checkpoint as any,
      tokenUsage: {
        transcript_cleaning: cleanerTokenUsage,
        total: cleanerTokenUsage,
      },
      qualityReport: {
        totalCardsGenerated: 0,
        acceptedCount: 0,
        repairedCount: 0,
        droppedCount: 0,
        conflictsCount: 0,
        unresolvedCriticalOrHighConflicts: 0,
      },
      sourceConflicts: [],
      rejectedAuditTrail: [],
    };

    return {
      globalSummary: "",
      subtopics: [],
      cards: [],
      metadata: validateMaterialMetadata(rawMetadata),
      checkpoint,
      isSuspended: true,
      nextStepGroup: "generation",
    };
  }

  // Stage 3: Concept Mapping
  let knowledgeGraph: KnowledgeGraph;

  if (isStageCompleted("concept_mapping")) {
    const artifact = checkpoint.stageArtifacts["concept_mapping"] as {
      concepts?: ConceptNode[];
      relations?: ConceptRelation[];
    };
    knowledgeGraph = buildKnowledgeGraph(artifact?.concepts ?? concepts, artifact?.relations ?? relations);
  } else {
    checkpoint.currentStage = "concept_mapping";
    knowledgeGraph = buildKnowledgeGraph(concepts, relations);
    await markStageCompleted(
      "concept_mapping",
      {
        concepts,
        relations,
        nodeCount: knowledgeGraph.getAllNodes().length,
      },
      "alignment_and_conflict_detection",
    );
  }

  // Stage 4: Alignment & Conflict Detection
  let alignmentResult: SourceAlignmentResult;
  let alignmentTokenUsage: StageTokenMetrics;

  if (isStageCompleted("alignment_and_conflict_detection")) {
    const artifact = checkpoint.stageArtifacts["alignment_and_conflict_detection"] as {
      alignedSources?: AlignedSourceRecord[];
      conflicts?: SourceConflictRecord[];
      tokenUsage?: StageTokenMetrics;
    };
    alignmentResult = {
      alignedSources: artifact?.alignedSources ?? [],
      conflicts: artifact?.conflicts ?? [],
      tokenUsage: artifact?.tokenUsage,
    };
    alignmentTokenUsage = normalizeStageTokenMetrics(artifact?.tokenUsage);
  } else {
    checkpoint.currentStage = "alignment_and_conflict_detection";
    const alignOutput = await alignSourcesAndDetectConflicts({
      slides: slides.length > 0 ? slides : undefined,
      segments: cleanedResult.retainedSegments.length > 0 ? cleanedResult.retainedSegments : undefined,
      candidateComparisons: candidateComparisons.length > 0 ? candidateComparisons : undefined,
      apiKey,
      model,
      geminiClient: options.geminiClient as any,
    });
    alignmentResult = {
      alignedSources: alignOutput.alignedSources,
      conflicts: alignOutput.conflicts,
      tokenUsage: alignOutput.tokenUsage,
    };
    alignmentTokenUsage = normalizeStageTokenMetrics(alignmentResult.tokenUsage);
    await markStageCompleted(
      "alignment_and_conflict_detection",
      {
        alignedSources: alignmentResult.alignedSources,
        conflicts: alignmentResult.conflicts,
        tokenUsage: alignmentTokenUsage,
      },
      "candidate_generation",
    );
  }

  // Stage 5: Candidate Generation
  let generationResult: GenerationResult;
  let generationTokenUsage: StageTokenMetrics;

  if (isStageCompleted("candidate_generation")) {
    const artifact = checkpoint.stageArtifacts["candidate_generation"] as {
      generationResult?: GenerationResult;
      subtopics?: GenerationSubtopic[];
      cards?: CandidateCard[];
      global_summary?: string;
      tokenUsage?: StageTokenMetrics;
      evidencePack?: CandidateEvidencePackResult;
    };
    generationResult = artifact?.generationResult ?? {
      subtopics: artifact?.subtopics ?? [],
      cards: artifact?.cards ?? [],
      global_summary: artifact?.global_summary ?? "",
      tokenUsage: normalizeStageTokenMetrics(artifact?.tokenUsage),
      evidencePackMetrics: artifact?.evidencePack?.metrics,
    };
    generationTokenUsage = normalizeStageTokenMetrics(artifact?.tokenUsage ?? generationResult.tokenUsage);
  } else {
    checkpoint.currentStage = "candidate_generation";
    const evidencePack = buildCandidateEvidencePack({
      segments: cleanedResult.retainedSegments,
      concepts: knowledgeGraph.getAllNodes(),
      alignedSources: alignmentResult.alignedSources,
      maxCharacters: 16_000,
    });
    generationResult = await generateCandidateCards({
      title: options.title,
      academicGroup: options.academicGroup,
      alignedSources: alignmentResult.alignedSources,
      transcriptText: evidencePack.evidenceText,
      evidencePack,
      pdfBytes,
      apiKey,
      model,
      geminiClient: options.geminiClient as any,
    });
    generationTokenUsage = normalizeStageTokenMetrics(generationResult.tokenUsage);
    await markStageCompleted(
      "candidate_generation",
      {
        generationResult,
        subtopics: generationResult.subtopics,
        cards: generationResult.cards,
        global_summary: generationResult.global_summary,
        tokenUsage: generationTokenUsage,
        evidencePack,
        evidencePackMetrics: evidencePack.metrics,
        evidenceText: evidencePack.evidenceText,
      },
      "adversarial_review",
    );
  }

  // Free large PDF buffer from memory before starting adversarial review & repair
  pdfBytes = null;
  if ("pdfBytes" in options) {
    (options as any).pdfBytes = null;
  }

  if (options.stepGroup === "generation") {
    const candidateSubtopics: PipelineSubtopicOutput[] = generationResult.subtopics.map((subtopic, sIdx) => ({
      title: subtopic.title || `Subtopik ${sIdx + 1}`,
      summary: subtopic.summary,
      cards: subtopic.cards.map((card) => ({
        frontText: card.front_text,
        backText: card.back_text,
        front_text: card.front_text,
        back_text: card.back_text,
        metadata: card.metadata,
      })),
    }));

    const stageTokensRecord: Record<string, StageTokenMetrics> = {
      transcript_cleaning: cleanerTokenUsage,
      alignment: alignmentTokenUsage,
      generation: generationTokenUsage,
    };
    const totalUsage = aggregateStageTokenMetrics([
      cleanerTokenUsage,
      alignmentTokenUsage,
      generationTokenUsage,
    ]);
    stageTokensRecord.total = totalUsage;

    const rawMetadata: MaterialMetadata = {
      pipelineVersion: "gemini-3.8-source-aware-v1",
      modelUsed: model,
      executionDurationMs: Date.now() - startTime,
      pipelineCheckpoint: checkpoint as any,
      tokenUsage: stageTokensRecord,
      qualityReport: {
        totalCardsGenerated: generationResult.cards.length,
        acceptedCount: 0,
        repairedCount: 0,
        droppedCount: 0,
        conflictsCount: alignmentResult.conflicts.length,
        unresolvedCriticalOrHighConflicts: alignmentResult.conflicts.filter(
          (c) =>
            (c.severity === "critical" || c.severity === "high") &&
            c.resolutionStatus === "unresolved",
        ).length,
      },
      sourceConflicts: alignmentResult.conflicts,
      rejectedAuditTrail: [],
    };

    return {
      globalSummary: generationResult.global_summary,
      subtopics: candidateSubtopics,
      metadata: validateMaterialMetadata(rawMetadata),
      checkpoint,
      isSuspended: true,
      nextStepGroup: "review",
    };
  }

  // Stage 6: Adversarial Review
  let reviewResult: ReviewResult;
  let reviewTokenUsage: StageTokenMetrics;

  const cachedEvidenceText = (
    checkpoint.stageArtifacts["candidate_generation"] as { evidenceText?: string } | undefined
  )?.evidenceText;
  const boundedReviewContext =
    typeof cachedEvidenceText === "string" && cachedEvidenceText.length > 0
      ? cachedEvidenceText
      : buildCandidateEvidencePack({
          segments: cleanedResult.retainedSegments,
          concepts: knowledgeGraph.getAllNodes(),
          alignedSources: alignmentResult.alignedSources,
          maxCharacters: 16_000,
        }).evidenceText || cleanedResult.retainedText.slice(0, 16_000);

  if (isStageCompleted("adversarial_review")) {
    const artifact = checkpoint.stageArtifacts["adversarial_review"] as {
      reviewResult?: ReviewResult;
      reviewedCards?: CandidateCard[];
      rejectedAuditTrail?: RejectedAuditEntry[];
      acceptedCount?: number;
      repairableCount?: number;
      conflictCount?: number;
      unsupportedCount?: number;
      tokenUsage?: StageTokenMetrics;
    };
    reviewResult = artifact?.reviewResult ?? {
      reviewedCards: artifact?.reviewedCards ?? generationResult.cards,
      acceptedCount: artifact?.acceptedCount ?? 0,
      repairableCount: artifact?.repairableCount ?? 0,
      conflictCount: artifact?.conflictCount ?? 0,
      unsupportedCount: artifact?.unsupportedCount ?? 0,
      rejectedAuditTrail: artifact?.rejectedAuditTrail ?? [],
      tokenUsage: normalizeStageTokenMetrics(artifact?.tokenUsage),
    };
    reviewTokenUsage = normalizeStageTokenMetrics(artifact?.tokenUsage ?? reviewResult.tokenUsage);
  } else {
    checkpoint.currentStage = "adversarial_review";
    reviewResult = await reviewCandidateCards({
      cards: generationResult.cards,
      conflicts: alignmentResult.conflicts,
      alignedSources: alignmentResult.alignedSources,
      sourceContext: boundedReviewContext,
      apiKey,
      model,
      geminiClient: options.geminiClient as any,
    });
    reviewTokenUsage = normalizeStageTokenMetrics(reviewResult.tokenUsage);
    await markStageCompleted(
      "adversarial_review",
      {
        reviewResult,
        reviewedCards: reviewResult.reviewedCards,
        rejectedAuditTrail: reviewResult.rejectedAuditTrail,
        acceptedCount: reviewResult.acceptedCount,
        repairableCount: reviewResult.repairableCount,
        conflictCount: reviewResult.conflictCount,
        unsupportedCount: reviewResult.unsupportedCount,
        tokenUsage: reviewTokenUsage,
      },
      "targeted_repair",
    );
  }

  // Stage 7: Single-Cycle Targeted Repair
  let repairResult: RepairResult;
  let repairTokenUsage: StageTokenMetrics;
  let finalCards: CandidateCard[];

  if (isStageCompleted("targeted_repair")) {
    const artifact = checkpoint.stageArtifacts["targeted_repair"] as {
      repairResult?: RepairResult;
      repairedCards?: CandidateCard[];
      droppedCards?: CandidateCard[];
      allCards?: CandidateCard[];
      repairedCount?: number;
      droppedCount?: number;
      tokenUsage?: StageTokenMetrics;
    };
    repairResult = artifact?.repairResult ?? {
      repairedCards: artifact?.repairedCards ?? [],
      droppedCards: artifact?.droppedCards ?? [],
      repairedCount: artifact?.repairedCount ?? 0,
      droppedCount: artifact?.droppedCount ?? 0,
      tokenUsage: normalizeStageTokenMetrics(artifact?.tokenUsage),
      allCards: artifact?.allCards ?? reviewResult.reviewedCards,
    };
    repairTokenUsage = normalizeStageTokenMetrics(artifact?.tokenUsage ?? repairResult.tokenUsage);
    finalCards = artifact?.allCards ?? repairResult.allCards ?? reviewResult.reviewedCards;
  } else {
    checkpoint.currentStage = "targeted_repair";
    const defectiveCards = reviewResult.reviewedCards.filter(
      (c) => c.qualityStatus === "REPAIRABLE_DEFECT",
    );

    if (defectiveCards.length > 0) {
      repairResult = await repairDefectiveCards({
        defectiveCards,
        cards: [...reviewResult.reviewedCards],
        sourceContext: boundedReviewContext,
        apiKey,
        model,
        geminiClient: options.geminiClient as any,
      });
      repairTokenUsage = normalizeStageTokenMetrics(repairResult.tokenUsage);
      finalCards = repairResult.allCards ?? reviewResult.reviewedCards;
    } else {
      repairTokenUsage = emptyTokenMetrics();
      repairResult = {
        repairedCards: [],
        droppedCards: [],
        repairedCount: 0,
        droppedCount: 0,
        tokenUsage: repairTokenUsage,
        allCards: reviewResult.reviewedCards,
      };
      finalCards = reviewResult.reviewedCards;
    }

    await markStageCompleted(
      "targeted_repair",
      {
        repairResult,
        repairedCards: repairResult.repairedCards,
        droppedCards: repairResult.droppedCards,
        allCards: finalCards,
        repairedCount: repairResult.repairedCount,
        droppedCount: repairResult.droppedCount,
        tokenUsage: repairTokenUsage,
      },
      "validation_and_storage",
    );
  }

  // Stage 8: Validation & Storage
  checkpoint.currentStage = "validation_and_storage";

  // Map final cards back to subtopics
  const cardLookup = new Map<string, CandidateCard>();
  for (const c of finalCards) {
    cardLookup.set(c.id, c);
  }

  const finalSubtopics: PipelineSubtopicOutput[] = generationResult.subtopics.map((subtopic, sIdx) => {
    const updatedCards: PipelineCardOutput[] = subtopic.cards.map((card, cIdx) => {
      const updatedCard = cardLookup.get(card.id) ?? card;
      return {
        frontText: updatedCard.front_text,
        backText: updatedCard.back_text,
        front_text: updatedCard.front_text,
        back_text: updatedCard.back_text,
        metadata: updatedCard.metadata,
      };
    });

    return {
      title: subtopic.title || `Subtopik ${sIdx + 1}`,
      summary: subtopic.summary,
      cards: updatedCards,
    };
  });

  // Calculate quality report
  const totalCardsGenerated = generationResult.cards.length;
  const acceptedCount = finalCards.filter((c) => c.qualityStatus === "ACCEPTED").length;
  const repairedCount = repairResult.repairedCount;
  const droppedCount = finalCards.filter(
    (c) => c.qualityStatus === "UNSUPPORTED_CLAIM" || c.qualityStatus === "REPAIRABLE_DEFECT",
  ).length;
  const conflictsCount = alignmentResult.conflicts.length;
  const unresolvedCriticalOrHighConflicts = alignmentResult.conflicts.filter(
    (c) =>
      (c.severity === "critical" || c.severity === "high") &&
      c.resolutionStatus === "unresolved",
  ).length;

  // Aggregate token usage across stages
  const stageTokensRecord: Record<string, StageTokenMetrics> = {
    transcript_cleaning: cleanerTokenUsage,
    alignment: alignmentTokenUsage,
    generation: generationTokenUsage,
    review: reviewTokenUsage,
    repair: repairTokenUsage,
  };

  const totalUsage = aggregateStageTokenMetrics([
    cleanerTokenUsage,
    alignmentTokenUsage,
    generationTokenUsage,
    reviewTokenUsage,
    repairTokenUsage,
  ]);
  stageTokensRecord.total = totalUsage;

  const executionDurationMs = Date.now() - startTime;

  const rawMetadata: MaterialMetadata = {
    pipelineVersion: "gemini-3.8-source-aware-v1",
    modelUsed: model,
    executionDurationMs,
    pipelineCheckpoint: checkpoint as any,
    tokenUsage: stageTokensRecord,
    qualityReport: {
      totalCardsGenerated,
      acceptedCount,
      repairedCount,
      droppedCount,
      conflictsCount,
      unresolvedCriticalOrHighConflicts,
    },
    sourceConflicts: alignmentResult.conflicts,
    rejectedAuditTrail: reviewResult.rejectedAuditTrail.slice(0, 10),
  };

  const validatedMetadata = validateMaterialMetadata(rawMetadata);

  await markStageCompleted(
    "validation_and_storage",
    {
      qualityReport: validatedMetadata.qualityReport,
      totalUsage,
    },
    "finished",
  );

  return {
    globalSummary: generationResult.global_summary,
    subtopics: finalSubtopics,
    metadata: validatedMetadata,
    checkpoint,
    isSuspended: false,
    nextStepGroup: "finished",
  };
}

/**
 * Resumes pipeline from an existing checkpoint, skipping already completed stages.
 */
export async function resumePipelineFromCheckpoint(
  existingCheckpoint: PipelineCheckpoint,
  options: PipelineOptions,
): Promise<PipelineResult> {
  return await runFlashCardPipeline({
    ...options,
    checkpoint: existingCheckpoint,
  });
}
