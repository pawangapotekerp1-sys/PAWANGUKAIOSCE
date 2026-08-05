export type OcrQuestionPdfInput = {
  fileName: string;
  imagePages: string[];
};

export type OcrQuestionPdfResult = {
  fileName: string;
  textExtractionMode: "ocr";
  extractedText: string;
  ocrConfidence: number;
  lowConfidence: boolean;
};

function normalizeOcrText(imagePages: string[]): string {
  return imagePages
    .map((page) => page.trim())
    .filter((page) => page.length > 0)
    .join("\n")
    .trim();
}

function deriveOcrConfidence(text: string): number {
  if (!text) {
    return 0.2;
  }

  if (text.includes("???")) {
    return 0.38;
  }

  return 0.72;
}

export function extractOcrText(input: OcrQuestionPdfInput): OcrQuestionPdfResult {
  const extractedText = normalizeOcrText(input.imagePages);
  const ocrConfidence = deriveOcrConfidence(extractedText);

  return {
    fileName: input.fileName,
    textExtractionMode: "ocr",
    extractedText,
    ocrConfidence,
    lowConfidence: ocrConfidence < 0.6,
  };
}
