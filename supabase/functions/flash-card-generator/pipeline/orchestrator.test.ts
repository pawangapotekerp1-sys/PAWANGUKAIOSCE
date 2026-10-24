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

  it("supports step-by-step execution across 3 HTTP steps using checkpoints", async () => {
    const mockGeminiClient = vi.fn().mockImplementation(async (req: GeminiRequest) => {
      if (req.prompt.includes("classify transcript segments")) {
        return {
          text: JSON.stringify({
            noiseSegmentIds: [],
            uncertainSegments: [],
          }),
          usage: { isAvailable: true, promptTokenCount: 50, candidatesTokenCount: 20, totalTokenCount: 70 },
        };
      }
      if (req.prompt.includes("Susun subtopik komprehensif")) {
        return {
          text: JSON.stringify({
            global_summary: "Ringkasan materi farmakoterapi.",
            subtopics: [
              {
                title: "Antihipertensi",
                summary: "Golongan obat penurun tekanan darah",
                cards: [
                  {
                    id: "c-1",
                    front_text: "Apa mekanisme kaptopril?",
                    back_text: "Menghambat enzim konversi angiotensin.",
                    conceptId: "c-captopril",
                  },
                ],
              },
            ],
          }),
          usage: { isAvailable: true, promptTokenCount: 100, candidatesTokenCount: 40, totalTokenCount: 140 },
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
          usage: { isAvailable: true, promptTokenCount: 80, candidatesTokenCount: 20, totalTokenCount: 100 },
        };
      }
      return { text: "{}", usage: { isAvailable: false } };
    });

    const baseOptions: PipelineOptions = {
      title: "Kuliah Hipertensi",
      transcriptText: "Kaptopril adalah obat antihipertensi golongan ACE inhibitor.",
      geminiClient: mockGeminiClient,
      apiKey: "test-key",
      model: "gemini-3.8-flash",
    };

    // STEP 1: cleaning
    const step1Result = await runFlashCardPipeline({
      ...baseOptions,
      stepGroup: "cleaning",
    });

    expect(step1Result.isSuspended).toBe(true);
    expect(step1Result.nextStepGroup).toBe("generation");
    expect(step1Result.checkpoint.completedStages).toContain("ingestion");
    expect(step1Result.checkpoint.completedStages).toContain("transcript_cleaning");
    expect(step1Result.checkpoint.completedStages).not.toContain("candidate_generation");

    // STEP 2: generation (resuming from step 1 checkpoint)
    const step2Result = await runFlashCardPipeline({
      ...baseOptions,
      checkpoint: step1Result.checkpoint,
      stepGroup: "generation",
    });

    expect(step2Result.isSuspended).toBe(true);
    expect(step2Result.nextStepGroup).toBe("review");
    expect(step2Result.checkpoint.completedStages).toContain("candidate_generation");
    expect(step2Result.checkpoint.completedStages).not.toContain("adversarial_review");
    expect(step2Result.subtopics).toHaveLength(1);

    // STEP 3: review (resuming from step 2 checkpoint)
    const step3Result = await runFlashCardPipeline({
      ...baseOptions,
      checkpoint: step2Result.checkpoint,
      stepGroup: "review",
    });

    expect(step3Result.isSuspended).toBe(false);
    expect(step3Result.nextStepGroup).toBe("finished");
    expect(step3Result.checkpoint.completedStages).toContain("adversarial_review");
    expect(step3Result.checkpoint.completedStages).toContain("validation_and_storage");
    expect(step3Result.subtopics[0].cards).toHaveLength(1);
    expect(step3Result.metadata.qualityReport?.acceptedCount).toBe(1);
  });

  it("handles corrupted or partial checkpoint with missing completedStages safely without TypeError", async () => {
    const mockGeminiClient = vi.fn().mockResolvedValue({
      text: JSON.stringify({ noiseSegmentIds: [], uncertainSegments: [] }),
      usage: { isAvailable: false },
    });

    const malformedCheckpoint = {
      currentStage: "transcript_cleaning",
      completedStages: null as any,
      stageArtifacts: null as any,
    };

    const options: PipelineOptions = {
      title: "Uji Checkpoint Rusak",
      transcriptText: "Teks transkrip farmasi.",
      checkpoint: malformedCheckpoint as any,
      geminiClient: mockGeminiClient,
      apiKey: "test-key",
      model: "gemini-3.8-flash",
      stepGroup: "cleaning",
    };

    const result = await runFlashCardPipeline(options);
    expect(result).toBeDefined();
    expect(Array.isArray(result.checkpoint.completedStages)).toBe(true);
    expect(result.checkpoint.completedStages).toContain("transcript_cleaning");
  });
});

describe("Orchestrator Large Material & Resource Safety", () => {
  it("suspends with nextStepGroup='cleaning' when transcript cleaning exceeds maxCleaningChunksPerRun, then completes cleaning on next run and deletes partial artifact", async () => {
    const lines = Array.from(
      { length: 6 },
      (_, idx) => `Segmen kuliah farmakologi nomor ${idx + 1} dengan dosis ${idx + 10} mg.`,
    );
    const transcriptText = lines.join("\n");

    const mockGeminiClient = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        noiseSegmentIds: [],
        uncertainSegments: [],
      }),
      usage: { isAvailable: true, promptTokenCount: 30, candidatesTokenCount: 10, totalTokenCount: 40 },
    });

    // Run 1: stepGroup="cleaning" with cleaningChunkSize=2 and maxCleaningChunksPerRun=2 (processes 4 of 6 segments)
    const run1 = await runFlashCardPipeline({
      title: "Kuliah Panjang 3 Jam",
      transcriptText,
      geminiClient: mockGeminiClient,
      apiKey: "test-key",
      stepGroup: "cleaning",
      cleaningChunkSize: 2,
      maxCleaningChunksPerRun: 2,
    });

    expect(run1.isSuspended).toBe(true);
    expect(run1.nextStepGroup).toBe("cleaning");
    expect(run1.checkpoint.completedStages).toContain("ingestion");
    expect(run1.checkpoint.completedStages).not.toContain("transcript_cleaning");
    expect(run1.checkpoint.stageArtifacts["transcript_cleaning_partial"]).toBeDefined();
    expect((run1.checkpoint.stageArtifacts["ingestion"] as any).transcriptText).toBeUndefined();

    // Run 2: resume stepGroup="cleaning" -> finishes remaining chunk (segments 5-6), transitions nextStepGroup to "generation", deletes partial artifact
    const run2 = await runFlashCardPipeline({
      title: "Kuliah Panjang 3 Jam",
      transcriptText,
      checkpoint: run1.checkpoint,
      geminiClient: mockGeminiClient,
      apiKey: "test-key",
      stepGroup: "cleaning",
      cleaningChunkSize: 2,
      maxCleaningChunksPerRun: 2,
    });

    expect(run2.isSuspended).toBe(true);
    expect(run2.nextStepGroup).toBe("generation");
    expect(run2.checkpoint.completedStages).toContain("transcript_cleaning");
    expect(run2.checkpoint.stageArtifacts["transcript_cleaning_partial"]).toBeUndefined();
    expect((run2.checkpoint.stageArtifacts["transcript_cleaning"] as any).cleanedResult).toBeUndefined();
  });

  it("passes bounded evidencePack text instead of full raw retainedText to adversarial_review and targeted_repair", async () => {
    const longSegments = Array.from({ length: 400 }, (_, idx) => ({
      segmentId: `seg-${String(idx + 1).padStart(3, "0")}`,
      rawText: `Penjelasan panjang kuliah farmakoterapi segmen nomor ${idx + 1} tentang terapi hipertensi kronis dan gagal jantung.`,
      normalizedText: `Penjelasan panjang kuliah farmakoterapi segmen nomor ${idx + 1} tentang terapi hipertensi kronis dan gagal jantung.`,
      lineOffset: idx + 1,
      hasClinicalEntities: idx % 5 === 0,
      matchedEntities: idx % 5 === 0 ? ["10 mg"] : [],
      classification: "relevant" as const,
    }));
    const hugeRetainedText = longSegments.map((s) => s.normalizedText).join(" ");
    expect(hugeRetainedText.length).toBeGreaterThan(35000);

    let capturedReviewPrompt = "";
    const mockGeminiClient = vi.fn().mockImplementation(async (req: any) => {
      if (req.prompt.includes("Auditor Medis dan Reviewer Adversarial")) {
        capturedReviewPrompt = req.prompt;
        return {
          text: JSON.stringify({
            reviews: [{ cardId: "c-1", status: "ACCEPTED" }],
          }),
          usage: { isAvailable: true, totalTokenCount: 50 },
        };
      }
      return { text: "{}", usage: { isAvailable: false } };
    });

    const checkpointAfterGen: PipelineCheckpoint = {
      currentStage: "adversarial_review",
      completedStages: [
        "ingestion",
        "transcript_cleaning",
        "concept_mapping",
        "alignment_and_conflict_detection",
        "candidate_generation",
      ],
      stageArtifacts: {
        ingestion: { hasPdf: false, pdfByteLength: 0 },
        transcript_cleaning: {
          retainedText: hugeRetainedText,
          retainedSegments: longSegments,
        },
        concept_mapping: { concepts: [] },
        alignment_and_conflict_detection: { alignedSources: [], conflicts: [] },
        candidate_generation: {
          globalSummary: "Ringkasan",
          subtopics: [
            {
              title: "Hipertensi",
              summary: "Terapi",
              cards: [{ id: "c-1", front_text: "Apa obat lini pertama?", back_text: "ACE inhibitor." }],
            },
          ],
          cards: [{ id: "c-1", front_text: "Apa obat lini pertama?", back_text: "ACE inhibitor." }],
        },
      },
    };

    await runFlashCardPipeline({
      title: "Uji Review Bounded",
      checkpoint: checkpointAfterGen,
      geminiClient: mockGeminiClient,
      apiKey: "test-key",
      stepGroup: "review",
    });

    expect(capturedReviewPrompt.length).toBeGreaterThan(0);
    // Prompt must be bounded (well under hugeRetainedText.length)
    expect(capturedReviewPrompt.length).toBeLessThan(24000);
  });
});
