import {
  buildTaxonomyMaps,
  normalizeTaxonomyName,
  type TaxonomyLookup,
} from "./taxonomy.ts";

type StructuredUploadRow = Record<string, unknown>;

export type NormalizedUploadItem = {
  sourceRowNumber: number;
  stem: string;
  options: Array<{ key: string; text: string }>;
  correctOptionKey: string | null;
  explanation: string | null;
  explanationSource: string | null;
  blockId: string | null;
  topicId: string | null;
  suggestedTopicName: string | null;
  topicSuggestionStatus: "accepted_from_upload" | "pending";
  workflowStatus: string;
  rawPayload: StructuredUploadRow;
};

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function resolveOptionValue(row: StructuredUploadRow, key: string) {
  return readString(row[key]);
}

function buildOptions(row: StructuredUploadRow) {
  return ["A", "B", "C", "D", "E"]
    .map((key) => ({
      key,
      text: resolveOptionValue(row, `option_${key.toLowerCase()}`),
    }))
    .filter((option) => option.text)
    .map((option) => ({
      key: option.key,
      text: option.text as string,
    }));
}

export function resolveManualDraftStatus(
  correctOptionKey: string | null,
  explanation: string | null | undefined,
): string {
  if (correctOptionKey && explanation?.trim()) {
    return "draft_ready";
  }

  return "needs_enrichment";
}

export function normalizeStructuredUploadRows(
  {
    inputFormat,
    rows,
    taxonomy,
  }: {
    inputFormat: "csv" | "xlsx";
    rows: StructuredUploadRow[];
    taxonomy: TaxonomyLookup;
  },
): {
  inputFormat: "csv" | "xlsx";
  items: NormalizedUploadItem[];
} {
  const taxonomyMaps = buildTaxonomyMaps(taxonomy);
  const items = rows.map((row, index) => {
    const stem = readString(row.question_text) ?? readString(row.stem) ?? "";
    const correctOptionKey = readString(row.correct_answer)?.toUpperCase() ?? null;
    const explanation = readString(row.explanation);
    const blockName = readString(row.block);
    const topicName = readString(row.topic);
    const matchedBlock = blockName
      ? taxonomyMaps.blockByName.get(normalizeTaxonomyName(blockName)) ?? null
      : null;
    const matchedTopic = topicName
      ? taxonomyMaps.topicByName.get(normalizeTaxonomyName(topicName)) ?? null
      : null;

    return {
      sourceRowNumber: index + 1,
      stem,
      options: buildOptions(row),
      correctOptionKey,
      explanation,
      explanationSource: explanation ? "upload_original" : null,
      blockId: matchedBlock?.id ?? matchedTopic?.blockId ?? null,
      topicId: matchedTopic?.id ?? null,
      suggestedTopicName: null,
      topicSuggestionStatus: matchedTopic ? "accepted_from_upload" : "pending",
      workflowStatus: resolveManualDraftStatus(correctOptionKey, explanation),
      rawPayload: row,
    };
  });

  return {
    inputFormat,
    items,
  };
}
