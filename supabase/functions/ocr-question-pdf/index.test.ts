import { describe, expect, test } from "vitest";
import { extractOcrText } from "./ocr-question-pdf";

describe("ocr-question-pdf helper", () => {
  test("routes scan-like PDFs through OCR and preserves confidence", () => {
    expect(
      extractOcrText({
        fileName: "scan-klinis.pdf",
        imagePages: [
          "Pasien dengan wheezing akut memerlukan penilaian bronkospasme.",
        ],
      }),
    ).toMatchObject({
      textExtractionMode: "ocr",
      extractedText: "Pasien dengan wheezing akut memerlukan penilaian bronkospasme.",
      ocrConfidence: 0.72,
      lowConfidence: false,
    });
  });

  test("flags low-confidence OCR results for review", () => {
    expect(
      extractOcrText({
        fileName: "scan-buram.pdf",
        imagePages: [
          "Px ??? edema paru akut / furosmide",
        ],
      }),
    ).toMatchObject({
      textExtractionMode: "ocr",
      lowConfidence: true,
      ocrConfidence: 0.38,
    });
  });
});
