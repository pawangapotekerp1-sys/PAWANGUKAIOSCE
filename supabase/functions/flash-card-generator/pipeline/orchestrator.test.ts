import { describe, expect, it, vi } from "vitest";
import {
  runFlashCardPipeline,
  resumePipelineFromCheckpoint,
  type PipelineCheckpoint,
  type PipelineOptions,
} from "./orchestrator.ts";
import type { GeminiRequest } from "../../_shared/gemini-client.ts";

describe("FlashCard Pipeline Orchestrator", () => {
  it("runs complete 8-stage pipeline with mock gemini client", async () => {
    const mockGeminiClient = vi.fn().mockImplementation(async (req: GeminiRequest) => {
      // Cleaner stage (plain text / json classifications)
      if (req.prompt.includes("classify transcript segments")) {
        return {
          text: JSON.stringify({
            classifications: [
              {
                segmentId: "seg-001",
                classification: "relevant",
                reason: "Clinical concept",
                suspectedTranscriptionError: false,
              },
            ],
          }),
          usage: {
            isAvailable: true,
            promptTokenCount: 50,
            candidatesTokenCount: 20,
            totalTokenCount: 70,
            thoughtsTokenCount: 5,
          },
        };
      }

      // Generator stage
      if (req.prompt.includes("Susun subtopik komprehensif")) {
        return {
          text: JSON.stringify({
            global_summary: "Ringkasan komprehensif hipertensi dan gagal jantung.",
            subtopics: [
              {
                title: "Terapi Farmakologi",
                summary: "Ringkasan terapi farmakologi",
                cards: [
                  {
                    id: "c-1",
                    front_text: "[Slide 1] Apa mekanisme kerja Captopril?",
                    back_text: "Menghambat enzim ACE sehingga mencegah konversi Angiotensin I menjadi II. [seg-001]",
                    conceptId: "cpt-captopril",
                  },
                ],
              },
            ],
          }),
          usage: {
            isAvailable: true,
            promptTokenCount: 150,
            candidatesTokenCount: 60,
            totalTokenCount: 210,
            thoughtsTokenCount: 15,
          },
        };
      }

      // Reviewer stage
      if (req.prompt.includes("Auditor Medis dan Reviewer Adversarial")) {
        return {
          text: JSON.stringify({
            reviews: [
              {
                cardId: "c-1",
                status: "ACCEPTED",
              },
            ],
          }),
          usage: {
            isAvailable: true,
            promptTokenCount: 100,
            candidatesTokenCount: 30,
            totalTokenCount: 130,
            thoughtsTokenCount: 10,
          },
        };
      }

      // Default fallback
      return {
        text: "{}",
        usage: {
          isAvailable: false,
          promptTokenCount: 0,
          candidatesTokenCount: 0,
          totalTokenCount: 0,
          thoughtsTokenCount: 0,
        },
      };
    });

    const options: PipelineOptions = {
      title: "Hipertensi dan Gagal Jantung",
      academicGroup: "clinical_science",
      transcriptText: "Captopril 25 mg diberikan untuk pasien gagal jantung.",
      pdfBytes: new Uint8Array([1, 2, 3]),
      slides: [
        {
          pdfPageIndex: 1,
          printedSlideNumber: 1,
          textSummary: "Captopril dosis 25 mg untuk hipertensi dan gagal jantung",
          keyTerms: ["Captopril", "gagal jantung"],
        },
      ],
      geminiClient: mockGeminiClient,
      apiKey: "test-api-key",
      model: "gemini-3.8-flash",
    };

    const result = await runFlashCardPipeline(options);

    expect(result).toBeDefined();
    expect(result.globalSummary).toContain("Ringkasan komprehensif");
    expect(result.subtopics).toHaveLength(1);
    expect(result.subtopics[0].cards).toHaveLength(1);

    const card = result.subtopics[0].cards[0];
    // Citation tags must be stripped
    expect(card.frontText).not.toContain("[Slide 1]");
    expect(card.backText).not.toContain("[seg-001]");
    expect(card.frontText).toBe("Apa mekanisme kerja Captopril?");
    expect(card.metadata).toBeDefined();
    expect(card.metadata?.qualityStatus).toBe("ACCEPTED");

    // Metadata checks
    expect(result.metadata.pipelineVersion).toBe("gemini-3.8-source-aware-v1");
    expect(result.metadata.modelUsed).toBe("gemini-3.8-flash");
    expect(result.metadata.qualityReport).toBeDefined();
    expect(result.metadata.qualityReport?.totalCardsGenerated).toBe(1);
    expect(result.metadata.qualityReport?.acceptedCount).toBe(1);
    expect(result.metadata.qualityReport?.repairedCount).toBe(0);
    expect(result.metadata.qualityReport?.unresolvedCriticalOrHighConflicts).toBe(0);

    // Checkpoint checks
    expect(result.checkpoint.completedStages).toEqual([
      "ingestion",
      "transcript_cleaning",
      "concept_mapping",
      "alignment_and_conflict_detection",
      "candidate_generation",
      "adversarial_review",
      "targeted_repair",
      "validation_and_storage",
    ]);
  });

  it("resumes pipeline from checkpoint skipping completed stages", async () => {
    const cleanerMock = vi.fn();
    const generatorMock = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        global_summary: "Ringkasan materi lanjutan",
        subtopics: [
          {
            title: "Subtopik 1",
            summary: "Ringkasan 1",
            cards: [
              {
                id: "card-resumed-1",
                front_text: "Pertanyaan resume?",
                back_text: "Jawaban resume.",
              },
            ],
          },
        ],
      }),
      usage: {
        isAvailable: true,
        promptTokenCount: 120,
        candidatesTokenCount: 40,
        totalTokenCount: 160,
        thoughtsTokenCount: 8,
      },
    });

    const reviewerMock = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        reviews: [
          {
            cardId: "card-resumed-1",
            status: "ACCEPTED",
          },
        ],
      }),
      usage: {
        isAvailable: true,
        promptTokenCount: 90,
        candidatesTokenCount: 20,
        totalTokenCount: 110,
        thoughtsTokenCount: 5,
      },
    });

    const mockGeminiClient = vi.fn().mockImplementation(async (req: GeminiRequest) => {
      if (req.prompt.includes("classify transcript segments")) {
        cleanerMock();
        return { text: "{}", usage: { isAvailable: false } };
      }
      if (req.prompt.includes("Susun subtopik komprehensif")) {
        return generatorMock();
      }
      if (req.prompt.includes("Auditor Medis dan Reviewer Adversarial")) {
        return reviewerMock();
      }
      return { text: "{}", usage: { isAvailable: false } };
    });

    const existingCheckpoint: PipelineCheckpoint = {
      currentStage: "candidate_generation",
      completedStages: [
        "ingestion",
        "transcript_cleaning",
        "concept_mapping",
        "alignment_and_conflict_detection",
      ],
      stageArtifacts: {
        ingestion: {
          transcriptText: "Transkrip tersimpan dari checkpoint.",
          pdfBytes: null,
          slides: [],
        },
        transcript_cleaning: {
          retainedText: "Transkrip tersimpan yang sudah dibersihkan.",
          retainedSegments: [
            {
              segmentId: "seg-cp-01",
              rawText: "Transkrip tersimpan yang sudah dibersihkan.",
              normalizedText: "Transkrip tersimpan yang sudah dibersihkan.",
              lineOffset: 1,
              hasClinicalEntities: true,
              matchedEntities: [],
              classification: "relevant",
            },
          ],
          tokenUsage: {
            isAvailable: true,
            promptTokenCount: 40,
            candidatesTokenCount: 10,
            totalTokenCount: 50,
            thoughtsTokenCount: 2,
          },
        },
        concept_mapping: {
          concepts: [],
          relations: [],
        },
        alignment_and_conflict_detection: {
          alignedSources: [],
          conflicts: [],
          tokenUsage: {
            isAvailable: false,
            promptTokenCount: 0,
            candidatesTokenCount: 0,
            totalTokenCount: 0,
            thoughtsTokenCount: 0,
          },
        },
      },
    };

    const options: PipelineOptions = {
      title: "Materi Resumed",
      academicGroup: "clinical_science",
      transcriptText: "Transkrip mentah yang harusnya dilewati.",
      geminiClient: mockGeminiClient,
      apiKey: "test-api-key",
      model: "gemini-3.8-flash",
    };

    const result = await resumePipelineFromCheckpoint(existingCheckpoint, options);

    // Cleaner must NOT have been called because it was already completed
    expect(cleanerMock).not.toHaveBeenCalled();

    // Generator and Reviewer must have been called
    expect(generatorMock).toHaveBeenCalled();
    expect(reviewerMock).toHaveBeenCalled();

    expect(result.subtopics[0].cards).toHaveLength(1);
    expect(result.subtopics[0].cards[0].frontText).toBe("Pertanyaan resume?");
    expect(result.checkpoint.completedStages).toContain("candidate_generation");
    expect(result.checkpoint.completedStages).toContain("adversarial_review");
    expect(result.checkpoint.completedStages).toContain("validation_and_storage");
  });

  it("aggregates token usage across all stages capturing thoughtsTokenCount without double counting", async () => {
    const mockGeminiClient = vi.fn().mockImplementation(async (req: GeminiRequest) => {
      if (req.prompt.includes("classify transcript segments")) {
        return {
          text: JSON.stringify({
            classifications: [
              {
                segmentId: "seg-001",
                classification: "relevant",
                reason: "Valid",
              },
            ],
          }),
          usage: {
            isAvailable: true,
            promptTokenCount: 100,
            candidatesTokenCount: 30,
            totalTokenCount: 130,
            thoughtsTokenCount: 25,
          },
        };
      }
      if (req.prompt.includes("Susun subtopik komprehensif")) {
        return {
          text: JSON.stringify({
            global_summary: "Ringkasan materi",
            subtopics: [
              {
                title: "Subtopik A",
                summary: "Ringkasan A",
                cards: [
                  {
                    id: "c-1",
                    front_text: "Pertanyaan 1?",
                    back_text: "Jawaban 1.",
                  },
                ],
              },
            ],
          }),
          usage: {
            isAvailable: true,
            promptTokenCount: 200,
            candidatesTokenCount: 50,
            totalTokenCount: 250,
            thoughtsTokenCount: 35,
          },
        };
      }
      if (req.prompt.includes("Auditor Medis dan Reviewer Adversarial")) {
        return {
          text: JSON.stringify({
            reviews: [
              {
                cardId: "c-1",
                status: "ACCEPTED",
              },
            ],
          }),
          usage: {
            isAvailable: true,
            promptTokenCount: 150,
            candidatesTokenCount: 40,
            totalTokenCount: 190,
            thoughtsTokenCount: 20,
          },
        };
      }
      return { text: "{}", usage: { isAvailable: false } };
    });

    const result = await runFlashCardPipeline({
      title: "Uji Token Aggregation",
      transcriptText: "Transkrip uji token.",
      geminiClient: mockGeminiClient,
      apiKey: "test-key",
      model: "gemini-3.8-flash",
    });

    const tokenUsage = result.metadata.tokenUsage;
    expect(tokenUsage).toBeDefined();

    // Individual stage usages
    expect(tokenUsage?.transcript_cleaning?.thoughtsTokenCount).toBe(25);
    expect(tokenUsage?.generation?.thoughtsTokenCount).toBe(35);
    expect(tokenUsage?.review?.thoughtsTokenCount).toBe(20);

    // Aggregated total
    const totalUsage = tokenUsage?.total;
    expect(totalUsage).toBeDefined();
    expect(totalUsage?.isAvailable).toBe(true);
    // 100 + 200 + 150 = 450 prompt tokens
    expect(totalUsage?.promptTokenCount).toBe(450);
    // 30 + 50 + 40 = 120 candidate tokens
    expect(totalUsage?.candidatesTokenCount).toBe(120);
    // 130 + 250 + 190 = 570 total tokens
    expect(totalUsage?.totalTokenCount).toBe(570);
    // 25 + 35 + 20 = 80 thoughts tokens
    expect(totalUsage?.thoughtsTokenCount).toBe(80);
  });
});
