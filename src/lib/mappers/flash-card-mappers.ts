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

type PublishedLibraryRow = {
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

type MentorMaterialDetail = {
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
  return rows
    .filter((row) => row.flashcard_materials?.status === "published")
    .map((row) => ({
      subtopicId: row.id,
      materialId: row.flashcard_materials!.id,
      materialTitle: row.flashcard_materials!.title,
      academicGroup: row.flashcard_materials!.academic_group,
      academicGroupLabel: mapFlashCardAcademicGroupLabel(row.flashcard_materials!.academic_group),
      subtopicTitle: row.title,
      subtopicSummary: row.summary,
      cardCount: row.flashcard_cards?.length ?? 0,
      sortOrder: row.sort_order,
      publishedAt: row.flashcard_materials!.published_at,
    }))
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
      academicGroupLabel: mapFlashCardAcademicGroupLabel(detail.material.academicGroup),
      statusLabel: mapFlashCardMaterialStatusLabel(detail.material.status),
    },
    sourceFiles: detail.sourceFiles,
    subtopics: [...detail.subtopics]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((subtopic) => ({
        ...subtopic,
        cards: [...subtopic.cards].sort((left, right) => left.sortOrder - right.sortOrder),
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
