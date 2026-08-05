import { resolveManualDraftStatus, type NormalizedUploadItem } from "../_shared/question-authoring.ts";
import { extractOcrText } from "../ocr-question-pdf/ocr-question-pdf.ts";

export type DocumentUploadPayload = {
  fileName: string;
  textContent?: string | null;
  imagePages?: string[];
};

export type NormalizedDocumentUploadItem = NormalizedUploadItem & {
  textExtractionMode: "direct_text" | "ocr";
  ocrConfidence: number | null;
  parseConfidence: number;
  parseError: string | null;
};

function readText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function parseQuestionText(text: string) {
  const stemMatch = text.match(/^\s*(?:\d+\.\s*)?(.+?)(?=\n[A-E][\.\)]\s+)/is);
  const optionMatches = [...text.matchAll(/(?:^|\n)([A-E])[\.\)]\s*(.+)/g)];
  const answerMatch = text.match(/jawaban\s*:\s*([A-E])/i);
  const explanationMatch = text.match(/pembahasan\s*:\s*([\s\S]+)/i);
  const stem = readText(stemMatch?.[1] ?? null) ?? readText(text.split("\n")[0] ?? null) ?? "";
  const options = optionMatches
    .map((match) => ({
      key: match[1] ?? "",
      text: (match[2] ?? "").trim(),
    }))
    .filter((option) => option.key && option.text);
  const correctOptionKey = (answerMatch?.[1] ?? "").trim().toUpperCase() || null;
  const explanation = readText(explanationMatch?.[1] ?? null);
  const hasStrongStructure = stem.length > 0 && options.length >= 2 && correctOptionKey !== null;

  return {
    stem,
    options,
    correctOptionKey,
    explanation,
    parseConfidence: hasStrongStructure && explanation ? 0.92 : hasStrongStructure ? 0.68 : 0.41,
  };
}

export function normalizeDocumentBatchPayload(
  {
    inputFormat,
    documents,
  }: {
    inputFormat: "pdf" | "docx";
    documents: DocumentUploadPayload[];
  },
): {
  inputFormat: "pdf" | "docx";
  items: NormalizedDocumentUploadItem[];
} {
  return {
    inputFormat,
    items: documents.map((document, index) => {
      const directText = readText(document.textContent);
      const ocrResult = directText
        ? null
        : extractOcrText({
          fileName: document.fileName,
          imagePages: document.imagePages ?? [],
        });
      const extractedText = directText ?? ocrResult?.extractedText ?? "";
      const parsed = parseQuestionText(extractedText);
      const parseError = ocrResult?.lowConfidence
        ? "ocr_low_confidence"
        : parsed.stem.length === 0
          ? "parse_failed"
          : null;
      const workflowStatus = ocrResult?.lowConfidence
        ? "needs_review"
        : parseError === "parse_failed"
          ? "needs_review"
          : resolveManualDraftStatus(parsed.correctOptionKey, parsed.explanation);

      return {
        sourceRowNumber: index + 1,
        stem: parsed.stem,
        options: parsed.options,
        correctOptionKey: parsed.correctOptionKey,
        explanation: parsed.explanation,
        explanationSource: parsed.explanation ? "upload_original" : null,
        blockId: null,
        topicId: null,
        suggestedTopicName: null,
        topicSuggestionStatus: "pending",
        workflowStatus,
        rawPayload: {
          fileName: document.fileName,
          extractedText,
        },
        textExtractionMode: directText ? "direct_text" : "ocr",
        ocrConfidence: ocrResult?.ocrConfidence ?? null,
        parseConfidence: ocrResult?.lowConfidence ? ocrResult.ocrConfidence : parsed.parseConfidence,
        parseError,
      };
    }),
  };
}
