export type FlashCardAcademicGroup =
  | "pharmaceutical_science"
  | "clinical_science"
  | "social_behavioral_and_administration";

export type FlashCardDifficulty = "easy" | "medium" | "hard";

export type FlashCardMaterialStatus =
  | "draft"
  | "processing"
  | "ready_for_review"
  | "published"
  | "failed";

export type CardSourceReference = {
  sourceId: string;
  sourceType: "slide_pdf" | "transcript";
  provenanceStatus: "verified_exact" | "semantic_match" | "unanchored";
  location: {
    pdfPageIndex: number | null;
    printedSlideNumber?: number | null;
    segmentId?: string | null;
    textQuote: string;
  };
  alignmentConfidence: "high" | "medium" | "low";
  confidenceReason: string;
};

export type CardClinicalVerification = {
  status:
    | "not_assessed"
    | "source_supported_only"
    | "externally_verified"
    | "clinical_review_required";
  notes?: string | null;
};

export type CardMetadata = {
  sources: CardSourceReference[];
  clinicalVerification: CardClinicalVerification;
  qualityStatus:
    | "ACCEPTED"
    | "REPAIRABLE_DEFECT"
    | "SUBSTANTIVE_CONFLICT"
    | "UNSUPPORTED_CLAIM";
  conflictRefId?: string | null;
  cardType?: string;
  mentorCustomNotes?: string;
};

export type SourceConflictRecord = {
  conflictId: string;
  conceptId: string;
  category:
    | "dosage_discrepancy"
    | "contraindication_mismatch"
    | "drug_identity"
    | "formula_conflict"
    | "clinical_guideline";
  severity: "critical" | "high" | "moderate";
  slideEvidence: {
    pdfPageIndex: number | null;
    printedSlideNumber?: number | null;
    exactQuote: string;
  };
  transcriptEvidence: {
    segmentId: string;
    exactQuote: string;
  };
  distinctionType: "substantive_contradiction";
  resolutionStatus: "unresolved" | "mentor_clarified" | "externally_verified";
  clinicalClarificationNotes?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
};

export type StageTokenMetrics = {
  isAvailable: boolean;
  promptTokenCount?: number | null;
  candidatesTokenCount?: number | null;
  totalTokenCount?: number | null;
  thoughtsTokenCount?: number | null;
  statusText?: string;
};

export type MaterialMetadata = {
  pipelineVersion?: string;
  modelUsed?: string;
  executionDurationMs?: number;
  pipelineCheckpoint?: Record<string, unknown>;
  tokenUsage?: Record<string, StageTokenMetrics>;
  qualityReport?: {
    totalCardsGenerated?: number;
    acceptedCount?: number;
    repairedCount?: number;
    droppedCount?: number;
    conflictsCount?: number;
    unresolvedCriticalOrHighConflicts?: number;
  };
  sourceConflicts?: SourceConflictRecord[];
  rejectedAuditTrail?: Array<{
    draftFront: string;
    rejectionReason: string;
    triggerSourceId?: string;
  }>;
  mentorCustomNotes?: string;
};

type PublishedLibraryRow = {
  id: string;
  title: string;
  summary: string;
  sort_order: number;
  flashcard_materials: {
    id: string;
    title: string;
    academic_group: FlashCardAcademicGroup;
    global_summary?: string | null;
    status: FlashCardMaterialStatus;
    published_at: string | null;
  } | null;
  flashcard_cards: Array<{
    id: string;
  }> | null;
};

type PublishedDeckSubtopicRow = {
  id: string;
  title: string;
  summary: string;
  sort_order: number;
  flashcard_materials: {
    id: string;
    title: string;
    academic_group: FlashCardAcademicGroup;
    status: FlashCardMaterialStatus;
    published_at: string | null;
  } | null;
  flashcard_cards: Array<{
    id: string;
    front_text: string;
    back_text: string;
    sort_order: number;
  }> | null;
};

type StudentProgressRow = {
  card_id: string;
  difficulty: FlashCardDifficulty;
  last_reviewed_at: string;
};

export type MentorMaterialDetail = {
  material: {
    id: string;
    title: string;
    academicGroup: FlashCardAcademicGroup;
    status: FlashCardMaterialStatus;
    globalSummary: string | null;
    processingError: string | null;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    metadata?: MaterialMetadata | null;
  };
  sourceFiles: Array<{
    id: string;
    fileKind: "transcript" | "slide_pdf";
    storageBucket: string;
    storagePath: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
    extractionStatus: string;
    deleteAfterPublish: boolean;
  }>;
  subtopics: Array<{
    id: string;
    title: string;
    summary: string;
    sortOrder: number;
    cards: Array<{
      id: string;
      frontText: string;
      backText: string;
      sortOrder: number;
      metadata?: CardMetadata | null;
      sources?: CardSourceReference[];
    }>;
  }>;
};

type MentorMaterialListRow = {
  id: string;
  title: string;
  academic_group: FlashCardAcademicGroup;
  status: FlashCardMaterialStatus;
  global_summary: string | null;
  processing_error: string | null;
  published_at: string | null;
  updated_at: string;
  flashcard_subtopics: Array<{
    id: string;
    flashcard_cards: Array<{
      id: string;
    }> | null;
  }> | null;
};

export function mapFlashCardAcademicGroupLabel(group: FlashCardAcademicGroup) {
  switch (group) {
    case "pharmaceutical_science":
      return "Pharmaceutical Science";
    case "clinical_science":
      return "Clinical Science";
    default:
      return "Social Behavioral and Administration";
  }
}

export function mapFlashCardMaterialStatusLabel(status: FlashCardMaterialStatus) {
  switch (status) {
    case "processing":
      return "Sedang diproses";
    case "ready_for_review":
      return "Siap direview";
    case "published":
      return "Sudah dipublikasikan";
    case "failed":
      return "Gagal diproses";
    default:
      return "Draft";
  }
}

export function mapPublishedFlashCardLibraryRows(rows: PublishedLibraryRow[]) {
  const publishedRows = rows.filter(
    (row) => row.flashcard_materials?.status === "published",
  );

  const groupedByMaterial = new Map<
    string,
    {
      material: NonNullable<PublishedLibraryRow["flashcard_materials"]>;
      subtopics: PublishedLibraryRow[];
    }
  >();

  for (const row of publishedRows) {
    const material = row.flashcard_materials!;
    const existing = groupedByMaterial.get(material.id);
    if (existing) {
      existing.subtopics.push(row);
    } else {
      groupedByMaterial.set(material.id, {
        material,
        subtopics: [row],
      });
    }
  }

  return Array.from(groupedByMaterial.values())
    .map(({ material, subtopics }) => {
      const sortedSubtopics = [...subtopics].sort(
        (left, right) => left.sort_order - right.sort_order,
      );
      const primarySubtopic = sortedSubtopics[0];
      const totalCardCount = sortedSubtopics.reduce(
        (sum, subtopic) => sum + (subtopic.flashcard_cards?.length ?? 0),
        0,
      );

      const combinedSummary =
        material.global_summary?.trim() ||
        (sortedSubtopics.length === 1
          ? primarySubtopic.summary
          : sortedSubtopics.map((s) => s.title).join(" • "));

      return {
        subtopicId: primarySubtopic.id,
        materialId: material.id,
        materialTitle: material.title,
        academicGroup: material.academic_group,
        academicGroupLabel: mapFlashCardAcademicGroupLabel(material.academic_group),
        subtopicTitle:
          sortedSubtopics.length === 1 ? primarySubtopic.title : material.title,
        subtopicSummary: combinedSummary,
        cardCount: totalCardCount,
        sortOrder: primarySubtopic.sort_order,
        publishedAt: material.published_at,
      };
    })
    .sort((a, b) => {
      const dateA = a.publishedAt ?? "";
      const dateB = b.publishedAt ?? "";
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      return a.sortOrder - b.sortOrder;
    });
}

export function mapPublishedFlashCardDeck({
  subtopic,
  progressRows,
}: {
  subtopic: PublishedDeckSubtopicRow;
  progressRows: StudentProgressRow[];
}) {
  const material = subtopic.flashcard_materials;

  if (!material || material.status !== "published") {
    throw new Error("Flash card deck belum dipublikasikan.");
  }

  const progressByCardId = new Map(progressRows.map((row) => [row.card_id, row]));

  return {
    subtopicId: subtopic.id,
    materialId: material.id,
    materialTitle: material.title,
    academicGroup: material.academic_group,
    academicGroupLabel: mapFlashCardAcademicGroupLabel(material.academic_group),
    subtopicTitle: subtopic.title,
    subtopicSummary: subtopic.summary,
    publishedAt: material.published_at,
    cards: [...(subtopic.flashcard_cards ?? [])]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((card) => {
        const progress = progressByCardId.get(card.id);

        return {
          id: card.id,
          frontText: card.front_text,
          backText: card.back_text,
          sortOrder: card.sort_order,
          savedDifficulty: progress?.difficulty ?? null,
          lastReviewedAt: progress?.last_reviewed_at ?? null,
        };
      }),
  };
}

export function mapFlashCardMaterialDetail(detail: MentorMaterialDetail) {
  return {
    material: {
      ...detail.material,
      metadata: detail.material.metadata ?? null,
      academicGroupLabel: mapFlashCardAcademicGroupLabel(detail.material.academicGroup),
      statusLabel: mapFlashCardMaterialStatusLabel(detail.material.status),
    },
    sourceFiles: detail.sourceFiles,
    subtopics: [...detail.subtopics]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((subtopic) => ({
        ...subtopic,
        cards: [...subtopic.cards]
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((card) => ({
            ...card,
            metadata: card.metadata ?? null,
            sources: card.metadata?.sources ?? card.sources ?? [],
          })),
      })),
  };
}

export function mapMentorFlashCardMaterialRows(rows: MentorMaterialListRow[]) {
  return [...rows]
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
    .map((row) => {
      const subtopicCount = row.flashcard_subtopics?.length ?? 0;
      const cardCount = (row.flashcard_subtopics ?? []).reduce(
        (total, subtopic) => total + (subtopic.flashcard_cards?.length ?? 0),
        0,
      );

      return {
        materialId: row.id,
        title: row.title,
        academicGroup: row.academic_group,
        academicGroupLabel: mapFlashCardAcademicGroupLabel(row.academic_group),
        status: row.status,
        statusLabel: mapFlashCardMaterialStatusLabel(row.status),
        globalSummary: row.global_summary,
        processingError: row.processing_error,
        publishedAt: row.published_at,
        updatedAt: row.updated_at,
        subtopicCount,
        cardCount,
      };
    });
}
