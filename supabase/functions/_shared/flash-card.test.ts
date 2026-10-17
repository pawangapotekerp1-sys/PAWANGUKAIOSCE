import { describe, expect, test } from "vitest";
import {
  CardClinicalVerificationSchema,
  CardMetadataSchema,
  CardSourceReferenceSchema,
  MaterialMetadataSchema,
  SourceConflictRecordSchema,
  StageTokenMetricsSchema,
  assertFlashCardOutputQuality,
  collectFlashCardSourcePathsForCleanup,
  classifyFlashCardPdfSource,
  normalizeFlashCardAcademicGroup,
  validateCardMetadata,
  validateFlashCardOutput,
  validateMaterialMetadata,
  validateSourceConflictRecord,
} from "./flash-card";

describe("normalizeFlashCardAcademicGroup", () => {
  test("normalizes the three supported academic groups", () => {
    expect(normalizeFlashCardAcademicGroup("Pharmaceutical Science")).toBe("pharmaceutical_science");
    expect(normalizeFlashCardAcademicGroup("clinical science")).toBe("clinical_science");
    expect(normalizeFlashCardAcademicGroup("Social Behavioral and Administration")).toBe(
      "social_behavioral_and_administration",
    );
  });
});

describe("validateFlashCardOutput", () => {
  test("rejects ai output missing required summaries and card fields", () => {
    expect(() =>
      validateFlashCardOutput({
        global_summary: "",
        subtopics: [
          {
            title: "",
            summary: "Ringkasan submateri",
            cards: [
              {
                front_text: "Apa itu ACE inhibitor?",
                back_text: "",
              },
            ],
          },
        ],
      }),
    ).toThrow(/summary|title|card/i);
  });

  test("rejects empty subtopic lists and subtopics without cards", () => {
    expect(() =>
      validateFlashCardOutput({
        global_summary: "Ringkasan materi utama.",
        subtopics: [],
      }),
    ).toThrow(/subtopic/i);

    expect(() =>
      validateFlashCardOutput({
        global_summary: "Ringkasan materi utama.",
        subtopics: [
          {
            title: "RAS",
            summary: "Ringkasan submateri",
            cards: [],
          },
        ],
      }),
    ).toThrow(/card/i);
  });
});

describe("assertFlashCardOutputQuality", () => {
  test("rejects ai output with one-word summaries and duplicate card fronts", () => {
    expect(() =>
      assertFlashCardOutputQuality({
        global_summary: "Ringkas",
        subtopics: [
          {
            title: "Hipertensi",
            summary: "Dasar",
            cards: [
              {
                front_text: "Apa target tekanan darah?",
                back_text: "Kurang dari 130/80 mmHg pada banyak kasus CKD.",
              },
              {
                front_text: "Apa target tekanan darah?",
                back_text: "ACE inhibitor sering dipilih pada albuminuria.",
              },
            ],
          },
        ],
      }),
    ).toThrow(/quality|duplicate|summary/i);
  });
});

describe("classifyFlashCardPdfSource", () => {
  test("uses direct text mode when the pdf already has readable text", () => {
    expect(classifyFlashCardPdfSource({
      mimeType: "application/pdf",
      extractedText: "Slide 1: Terapi hipertensi lini pertama.",
    })).toBe("text");
  });

  test("falls back to ocr mode when the pdf has no usable extracted text", () => {
    expect(classifyFlashCardPdfSource({
      mimeType: "application/pdf",
      extractedText: "   ",
    })).toBe("ocr");
  });
});

describe("collectFlashCardSourcePathsForCleanup", () => {
  test("returns only source files marked for cleanup", () => {
    expect(collectFlashCardSourcePathsForCleanup([
      {
        storageBucket: "flash-card-sources",
        storagePath: "mentor-1/material-1/transcript.txt",
        deleteAfterPublish: true,
      },
      {
        storageBucket: "flash-card-sources",
        storagePath: "mentor-1/material-1/slide.pdf",
        deleteAfterPublish: false,
      },
    ])).toEqual([
      {
        storageBucket: "flash-card-sources",
        storagePath: "mentor-1/material-1/transcript.txt",
      },
    ]);
  });
});

describe("validateCardMetadata", () => {
  test("validates card metadata with single and multiple sources and separate clinical verification", () => {
    const validMetadata = {
      sources: [
        {
          sourceId: "pdf-page-3",
          sourceType: "slide_pdf",
          provenanceStatus: "verified_exact",
          location: {
            pdfPageIndex: 3,
            printedSlideNumber: 2,
            segmentId: null,
            textQuote: "Dosis pemeliharaan 25 mg 2x sehari",
          },
          alignmentConfidence: "high",
          confidenceReason: "Kutipan harfiah pada slide tabel dosis",
        },
        {
          sourceId: "transcript-seg-015",
          sourceType: "transcript",
          provenanceStatus: "semantic_match",
          location: {
            pdfPageIndex: null,
            printedSlideNumber: null,
            segmentId: "seg-015",
            textQuote: "mentor menegaskan dosis pada lansia diturunkan setengahnya",
          },
          alignmentConfidence: "medium",
          confidenceReason: "Elaborasi lisan terhubung ke slide 2",
        },
      ],
      clinicalVerification: {
        status: "source_supported_only",
        notes: "Sesuai materi slide dan penjelasan kelas",
      },
      qualityStatus: "ACCEPTED",
      cardType: "concept",
      mentorCustomNotes: "Perhatikan fungsi ginjal pasien",
    };

    const parsed = validateCardMetadata(validMetadata);
    expect(parsed.sources).toHaveLength(2);
    expect(parsed.sources[0].provenanceStatus).toBe("verified_exact");
    expect(parsed.sources[1].provenanceStatus).toBe("semantic_match");
    expect(parsed.clinicalVerification.status).toBe("source_supported_only");
    expect(parsed.qualityStatus).toBe("ACCEPTED");
    expect(parsed.cardType).toBe("concept");
  });

  test("validates unanchored card with defaults", () => {
    const unanchored = {
      sources: [
        {
          sourceId: "unanchored-note",
          sourceType: "transcript",
          provenanceStatus: "unanchored",
          location: {
            pdfPageIndex: null,
            segmentId: "seg-99",
            textQuote: "",
          },
          alignmentConfidence: "low",
          confidenceReason: "Klaim umum tanpa rujukan langsung",
        },
      ],
      qualityStatus: "UNSUPPORTED_CLAIM",
      conflictRefId: "cnf-001",
    };

    const parsed = validateCardMetadata(unanchored);
    expect(parsed.sources[0].provenanceStatus).toBe("unanchored");
    expect(parsed.clinicalVerification.status).toBe("not_assessed");
    expect(parsed.qualityStatus).toBe("UNSUPPORTED_CLAIM");
    expect(parsed.conflictRefId).toBe("cnf-001");
  });

  test("applies schema defaults when empty metadata is provided", () => {
    const parsed = validateCardMetadata({});
    expect(parsed.sources).toEqual([]);
    expect(parsed.clinicalVerification).toEqual({ status: "not_assessed" });
    expect(parsed.qualityStatus).toBe("ACCEPTED");
  });

  test("rejects invalid provenance or location values", () => {
    expect(() =>
      validateCardMetadata({
        sources: [
          {
            sourceId: "src-1",
            sourceType: "unsupported_type",
            provenanceStatus: "verified_exact",
            location: {
              pdfPageIndex: 1,
              textQuote: "valid quote",
            },
            alignmentConfidence: "high",
            confidenceReason: "reason",
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      validateCardMetadata({
        sources: [
          {
            sourceId: "src-1",
            sourceType: "slide_pdf",
            provenanceStatus: "verified_exact",
            location: {
              pdfPageIndex: -1,
              textQuote: "quote",
            },
            alignmentConfidence: "high",
            confidenceReason: "reason",
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      validateCardMetadata({
        sources: [
          {
            sourceId: "src-1",
            sourceType: "slide_pdf",
            provenanceStatus: "verified_exact",
            location: {
              pdfPageIndex: 1,
              textQuote: "a".repeat(501),
            },
            alignmentConfidence: "high",
            confidenceReason: "reason",
          },
        ],
      }),
    ).toThrow();
  });
});

describe("validateSourceConflictRecord", () => {
  test("validates source conflict records with critical severity and evidence pairs", () => {
    const conflict = {
      conflictId: "cnf-001",
      conceptId: "cpt-captopril-dose",
      category: "dosage_discrepancy",
      severity: "critical",
      slideEvidence: {
        pdfPageIndex: 5,
        printedSlideNumber: 5,
        exactQuote: "Dosis awal 12.5 mg",
      },
      transcriptEvidence: {
        segmentId: "seg-034",
        exactQuote: "Kasih dosis awal langsung 50 mg",
      },
      distinctionType: "substantive_contradiction",
      resolutionStatus: "unresolved",
    };

    const parsed = validateSourceConflictRecord(conflict);
    expect(parsed.conflictId).toBe("cnf-001");
    expect(parsed.severity).toBe("critical");
    expect(parsed.distinctionType).toBe("substantive_contradiction");
    expect(parsed.resolutionStatus).toBe("unresolved");
    expect(parsed.slideEvidence.exactQuote).toBe("Dosis awal 12.5 mg");
    expect(parsed.transcriptEvidence.segmentId).toBe("seg-034");
  });

  test("validates resolution workflow and high/moderate categories", () => {
    const resolvedConflict = {
      conflictId: "cnf-002",
      conceptId: "cpt-metformin-ckd",
      category: "contraindication_mismatch",
      severity: "high",
      slideEvidence: {
        pdfPageIndex: 12,
        exactQuote: "Kontraindikasi pada eGFR < 30",
      },
      transcriptEvidence: {
        segmentId: "seg-089",
        exactQuote: "Metformin aman di semua stage",
      },
      resolutionStatus: "mentor_clarified",
      clinicalClarificationNotes: "Slide benar, transcript salah ucap oleh mentor pengganti",
      resolvedAt: "2026-10-17T10:00:00Z",
      resolvedBy: "dr-mentor-id",
    };

    const parsed = validateSourceConflictRecord(resolvedConflict);
    expect(parsed.severity).toBe("high");
    expect(parsed.resolutionStatus).toBe("mentor_clarified");
    expect(parsed.resolvedBy).toBe("dr-mentor-id");
  });

  test("rejects invalid conflict category, missing quotes, or long quotes", () => {
    expect(() =>
      validateSourceConflictRecord({
        conflictId: "cnf-003",
        conceptId: "cpt-1",
        category: "invalid_category",
        severity: "moderate",
        slideEvidence: {
          pdfPageIndex: 1,
          exactQuote: "ok",
        },
        transcriptEvidence: {
          segmentId: "seg-1",
          exactQuote: "ok",
        },
      }),
    ).toThrow();

    expect(() =>
      validateSourceConflictRecord({
        conflictId: "cnf-004",
        conceptId: "cpt-2",
        category: "formula_conflict",
        severity: "moderate",
        slideEvidence: {
          pdfPageIndex: 1,
          exactQuote: "a".repeat(501),
        },
        transcriptEvidence: {
          segmentId: "seg-1",
          exactQuote: "ok",
        },
      }),
    ).toThrow();
  });
});

describe("validateMaterialMetadata", () => {
  test("validates material metadata with defaults and token usage accounting", () => {
    const minimal = validateMaterialMetadata({});
    expect(minimal.pipelineVersion).toBe("gemini-3.8-source-aware-v1");
    expect(minimal.modelUsed).toBe("gemini-3.8-flash");
    expect(minimal.sourceConflicts).toEqual([]);
    expect(minimal.rejectedAuditTrail).toEqual([]);

    const full = validateMaterialMetadata({
      pipelineVersion: "gemini-3.8-source-aware-v1",
      modelUsed: "gemini-3.8-flash",
      executionDurationMs: 4250,
      tokenUsage: {
        transcriptCleaning: {
          isAvailable: true,
          promptTokenCount: 1200,
          candidatesTokenCount: 400,
          totalTokenCount: 1600,
          thoughtsTokenCount: 150,
        },
        cardGeneration: {
          isAvailable: true,
          promptTokenCount: 3000,
          candidatesTokenCount: 1200,
          totalTokenCount: 4200,
          thoughtsTokenCount: 320,
        },
      },
      qualityReport: {
        totalCardsGenerated: 15,
        acceptedCount: 12,
        repairedCount: 2,
        droppedCount: 1,
        conflictsCount: 1,
        unresolvedCriticalOrHighConflicts: 1,
      },
      pipelineCheckpoint: {
        lastCompletedStage: "crossSourceVerification",
        savedAt: "2026-10-17T10:15:00Z",
      },
    });

    expect(full.executionDurationMs).toBe(4250);
    expect(full.tokenUsage?.transcriptCleaning.thoughtsTokenCount).toBe(150);
    expect(full.qualityReport?.totalCardsGenerated).toBe(15);
    expect(full.pipelineCheckpoint?.lastCompletedStage).toBe("crossSourceVerification");
  });

  test("enforces rejectedAuditTrail cap of at most 10 items", () => {
    const tenItems = Array.from({ length: 10 }, (_, i) => ({
      draftFront: `Front ${i + 1}`,
      rejectionReason: `Reason ${i + 1}`,
      triggerSourceId: `src-${i + 1}`,
    }));

    const valid = validateMaterialMetadata({
      rejectedAuditTrail: tenItems,
    });
    expect(valid.rejectedAuditTrail).toHaveLength(10);

    const elevenItems = [
      ...tenItems,
      {
        draftFront: "Front 11",
        rejectionReason: "Reason 11",
      },
    ];

    expect(() =>
      validateMaterialMetadata({
        rejectedAuditTrail: elevenItems,
      }),
    ).toThrow();
  });
});

