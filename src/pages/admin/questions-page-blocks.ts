export interface BlockDefinition {
  id: string;
  name: string;
  description: string;
  colorTheme: "teal" | "indigo" | "amber";
  matchNames: string[];
}

export const STANDARD_BLOCKS: BlockDefinition[] = [
  {
    id: "clinical-science",
    name: "Clinical Science",
    description:
      "Farmakoterapi, evaluasi kasus klinis, interaksi obat, dan interpretasi laboratorium klinis.",
    colorTheme: "teal",
    matchNames: ["clinical science"],
  },
  {
    id: "pharmaceutical-science",
    name: "Pharmaceutical Science",
    description:
      "Formulasi teknologi sediaan padat, cair, dan steril, biofarmasetika, stabilitas, serta analisis farmasi.",
    colorTheme: "indigo",
    matchNames: ["pharmaceutical science"],
  },
  {
    id: "social-behavioural-administration",
    name: "Social Behavioural Administration of Pharmacy",
    description:
      "Manajemen farmasi, regulasi & perundang-undangan farmasi, farmakoekonomi, etika, dan komunikasi profesi.",
    colorTheme: "amber",
    matchNames: [
      "social behavioral administration of pharmacy",
      "social behavioural administration of pharmacy",
      "social, behavioral & administrative pharmacy",
      "social behavioural administrative pharmacy",
      "social behavioral administrative pharmacy",
      "social, behavioral and administrative pharmacy",
      "sba",
      "05871128-0ffa-4919-9483-6f0086e1c262",
    ],
  },
];

export function findBlockDefinition(blockParam?: string | null): BlockDefinition | null {
  if (!blockParam || !blockParam.trim()) {
    return null;
  }

  const normalized = blockParam.trim().toLowerCase();
  return (
    STANDARD_BLOCKS.find(
      (block) =>
        block.id.toLowerCase() === normalized ||
        block.name.toLowerCase() === normalized ||
        block.matchNames.some((m) => m.toLowerCase() === normalized)
    ) ?? null
  );
}

export function isQuestionInBlock(
  question: { blockName: string | null; blockId?: string | null },
  block: BlockDefinition
): boolean {
  if (question.blockId && block.matchNames.some((m) => m.toLowerCase() === question.blockId?.toLowerCase())) {
    return true;
  }

  if (!question.blockName || !question.blockName.trim()) {
    return false;
  }

  const normalized = question.blockName.trim().toLowerCase();
  return (
    block.id.toLowerCase() === normalized ||
    block.name.toLowerCase() === normalized ||
    block.matchNames.some((m) => m.toLowerCase() === normalized)
  );
}

export function getBlockQuestionCount(
  questions: Array<{ blockName: string | null }>,
  block: BlockDefinition
): number {
  return questions.filter((question) => isQuestionInBlock(question, block)).length;
}

export function getUniqueTopicsForBlock(
  questions: Array<{ blockName: string | null; topicName: string | null }>,
  block: BlockDefinition
): string[] {
  const topics = new Set<string>();

  for (const question of questions) {
    if (isQuestionInBlock(question, block) && question.topicName && question.topicName.trim()) {
      topics.add(question.topicName.trim());
    }
  }

  return Array.from(topics).sort((a, b) => a.localeCompare(b, "id-ID"));
}

export function filterBlockQuestions<
  T extends { blockName: string | null; topicName: string | null },
>(
  questions: T[],
  block: BlockDefinition,
  topicFilter: string
): T[] {
  return questions.filter((question) => {
    if (!isQuestionInBlock(question, block)) {
      return false;
    }

    if (!topicFilter || topicFilter === "all") {
      return true;
    }

    if (topicFilter === "unassigned") {
      return !question.topicName || !question.topicName.trim();
    }

    const normalizedQuestionTopic = question.topicName?.trim().toLowerCase() ?? "";
    const normalizedFilter = topicFilter.trim().toLowerCase();

    return normalizedQuestionTopic === normalizedFilter;
  });
}
