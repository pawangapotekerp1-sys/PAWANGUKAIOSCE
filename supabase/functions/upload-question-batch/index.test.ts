import { describe, expect, test } from "vitest";
import { normalizeDocumentBatchPayload } from "./upload-question-batch";

describe("upload-question-batch document ingestion", () => {
  test("direct-text PDFs mark text_extraction_mode as direct_text and persist parse diagnostics", () => {
    const result = normalizeDocumentBatchPayload({
      inputFormat: "pdf",
      documents: [
        {
          fileName: "bank-soal-text.pdf",
          textContent:
            "1. Apa target tekanan darah pada CKD?\nA. <140/90\nB. <130/80\nJawaban: B\nPembahasan: Target lebih ketat dipilih untuk proteksi ginjal.",
        },
      ],
    });

    expect(result.items[0]).toMatchObject({
      textExtractionMode: "direct_text",
      workflowStatus: "draft_ready",
      parseConfidence: 0.92,
      parseError: null,
      correctOptionKey: "B",
    });
  });

  test("scan PDFs fall back to OCR and low-confidence results land in needs_review", () => {
    const result = normalizeDocumentBatchPayload({
      inputFormat: "pdf",
      documents: [
        {
          fileName: "scan-buram.pdf",
          imagePages: [
            "Px ??? edema paru akut / furosmide",
          ],
        },
      ],
    });

    expect(result.items[0]).toMatchObject({
      textExtractionMode: "ocr",
      ocrConfidence: 0.38,
      workflowStatus: "needs_review",
      parseError: "ocr_low_confidence",
    });
  });
});
