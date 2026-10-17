import { describe, expect, it, vi } from "vitest";
import { generateCandidateCards } from "./generator.ts";
import { reviewCandidateCards } from "./reviewer.ts";
import { repairDefectiveCards } from "./repairer.ts";
import type { AlignedSourceRecord } from "./aligner.ts";
import type { SourceConflictRecord } from "../../_shared/flash-card.ts";

describe("Generation, Reviewer, and Repair Pipeline", () => {
  describe("generator.ts", () => {
    it("generates candidate cards with clean front and back text without citation tags", async () => {
      const mockGemini = vi.fn().mockResolvedValue({
        text: JSON.stringify({
          global_summary: "Ringkasan komprehensif kardiovaskular",
          subtopics: [
            {
              title: "Farmakologi Kardiovaskular",
              summary: "Ringkasan subtopik",
              cards: [
                {
                  front_text: "[Slide 3] Apa indikasi utama Captopril?",
                  back_text: "Hipertensi dan gagal jantung kongestif. [Slide 3, seg-10]",
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
          thoughtsTokenCount: 10,
        },
      });

      const result = await generateCandidateCards({
        title: "Kardio",
        academicGroup: "clinical_science",
        alignedContext: "...",
        geminiClient: mockGemini as any,
        apiKey: "test-key",
        model: "gemini-3.8-flash",
      });

      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].front_text).not.toContain("[Slide");
      expect(result.cards[0].back_text).not.toContain("[Slide");
      expect(result.cards[0].front_text).toBe("Apa indikasi utama Captopril?");
      expect(result.cards[0].back_text).toBe("Hipertensi dan gagal jantung kongestif.");
      expect(result.tokenUsage.thoughtsTokenCount).toBe(10);
      expect(result.tokenUsage.isAvailable).toBe(true);

      expect(mockGemini).toHaveBeenCalledWith(
        expect.objectContaining({
          thinkingLevel: "low",
          model: "gemini-3.8-flash",
        }),
      );
    });

    it("attaches multi-source references from alignedSources to generated cards", async () => {
      const alignedSources: AlignedSourceRecord[] = [
        {
          conceptId: "cpt-captopril",
          conceptName: "Captopril",
          alignmentType: "compatible_elaboration",
          slidePageIndex: 4,
          printedSlideNumber: 3,
          slideClaim: "Captopril ACE inhibitor 25 mg",
          segmentId: "seg-05",
          transcriptClaim: "Captopril diminum 1 jam sebelum makan",
          references: [
            {
              sourceId: "slide-page-4",
              sourceType: "slide_pdf",
              provenanceStatus: "verified_exact",
              location: {
                pdfPageIndex: 4,
                printedSlideNumber: 3,
                segmentId: null,
                textQuote: "Captopril ACE inhibitor 25 mg",
              },
              alignmentConfidence: "high",
              confidenceReason: "Kutipan slide",
            },
            {
              sourceId: "transcript-seg-05",
              sourceType: "transcript",
              provenanceStatus: "verified_exact",
              location: {
                pdfPageIndex: null,
                segmentId: "seg-05",
                textQuote: "Captopril diminum 1 jam sebelum makan",
              },
              alignmentConfidence: "high",
              confidenceReason: "Kutipan transkrip",
            },
          ],
        },
      ];

      const mockGemini = vi.fn().mockResolvedValue({
        text: JSON.stringify({
          subtopics: [
            {
              title: "Hipertensi",
              summary: "Ringkasan hipertensi",
              cards: [
                {
                  front_text: "Kapan waktu terbaik minum Captopril?",
                  back_text: "Satu jam sebelum makan untuk absorbsi optimal.",
                  conceptId: "cpt-captopril",
                },
              ],
            },
          ],
        }),
        usage: { isAvailable: true, promptTokenCount: 150, candidatesTokenCount: 40, totalTokenCount: 190 },
      });

      const result = await generateCandidateCards({
        title: "Hipertensi",
        academicGroup: "clinical_science",
        alignedSources,
        geminiClient: mockGemini as any,
        apiKey: "test-key",
      });

      expect(result.cards[0].sources).toHaveLength(2);
      expect(result.cards[0].sources[0].sourceType).toBe("slide_pdf");
      expect(result.cards[0].sources[1].sourceType).toBe("transcript");
      expect(result.cards[0].metadata?.sources).toHaveLength(2);
    });

    it("supports multimodal input when pdfBytes is provided", async () => {
      const mockGemini = vi.fn().mockResolvedValue({
        text: JSON.stringify({
          subtopics: [
            {
              title: "Multimodal Subtopic",
              summary: "Ringkasan",
              cards: [{ front_text: "Tanya?", back_text: "Jawab." }],
            },
          ],
        }),
        usage: { isAvailable: true, promptTokenCount: 300, candidatesTokenCount: 60, totalTokenCount: 360 },
      });

      const dummyPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

      await generateCandidateCards({
        title: "Slide PDF Kardio",
        academicGroup: "clinical_science",
        pdfBytes: dummyPdfBytes,
        geminiClient: mockGemini as any,
        apiKey: "test-key",
      });

      expect(mockGemini).toHaveBeenCalledWith(
        expect.objectContaining({
          parts: expect.arrayContaining([
            expect.objectContaining({
              inlineData: expect.objectContaining({
                mimeType: "application/pdf",
              }),
            }),
          ]),
        }),
      );
    });
  });

  describe("reviewer.ts", () => {
    it("reviewer flags substantive conflict and prevents auto-repair", async () => {
      const cards = [
        { id: "c1", front_text: "Dosis Captopril?", back_text: "Langsung 50 mg", conceptId: "cpt-1" },
      ];
      const conflicts: SourceConflictRecord[] = [
        {
          conflictId: "cnf-1",
          conceptId: "cpt-1",
          severity: "critical",
          category: "dosage_discrepancy",
          slideEvidence: { pdfPageIndex: 4, exactQuote: "25 mg" },
          transcriptEvidence: { segmentId: "seg-10", exactQuote: "50 mg" },
          distinctionType: "substantive_contradiction",
          resolutionStatus: "unresolved",
          clinicalClarificationNotes: "Perbedaan dosis antara slide dan mentor",
        },
      ];

      const reviewResult = await reviewCandidateCards({
        cards: cards as any,
        conflicts: conflicts as any,
        geminiClient: vi.fn() as any,
        apiKey: "key",
        model: "gemini-3.8-flash",
      });

      expect(reviewResult.reviewedCards[0].qualityStatus).toBe("SUBSTANTIVE_CONFLICT");
      expect(reviewResult.reviewedCards[0].conflictRefId).toBe("cnf-1");
      expect(reviewResult.conflictCount).toBe(1);
    });

    it("reviewer classifies ACCEPTED, REPAIRABLE_DEFECT, and UNSUPPORTED_CLAIM with audit trail", async () => {
      const cards = [
        { id: "c-good", front_text: "Mekanisme kerja Furosemid?", back_text: "Inhibitor kotransporter Na+/K+/2Cl- pada ansa Henle asenden tebal." },
        { id: "c-vague", front_text: "Obat ginjal?", back_text: "Ada banyak jenisnya." },
        { id: "c-hallucinated", front_text: "Dosis obat fiktif X?", back_text: "1000 mg sehari tiga kali." },
      ];

      const mockGemini = vi.fn().mockResolvedValue({
        text: JSON.stringify({
          reviews: [
            {
              cardId: "c-good",
              status: "ACCEPTED",
            },
            {
              cardId: "c-vague",
              status: "REPAIRABLE_DEFECT",
              defectNotes: "Pertanyaan terlalu ambigu dan jawaban terlalu singkat.",
            },
            {
              cardId: "c-hallucinated",
              status: "UNSUPPORTED_CLAIM",
              rejectionReason: "Obat fiktif X tidak terdapat dalam slide maupun transkrip kuliah.",
            },
          ],
        }),
        usage: {
          isAvailable: true,
          promptTokenCount: 400,
          candidatesTokenCount: 120,
          totalTokenCount: 520,
          thoughtsTokenCount: 30,
        },
      });

      const reviewResult = await reviewCandidateCards({
        cards: cards as any,
        geminiClient: mockGemini as any,
        apiKey: "key",
        model: "gemini-3.8-flash",
      });

      expect(mockGemini).toHaveBeenCalledWith(
        expect.objectContaining({
          thinkingLevel: "medium",
        }),
      );

      expect(reviewResult.acceptedCount).toBe(1);
      expect(reviewResult.repairableCount).toBe(1);
      expect(reviewResult.unsupportedCount).toBe(1);

      const vagueCard = reviewResult.reviewedCards.find((c) => c.id === "c-vague");
      expect(vagueCard?.qualityStatus).toBe("REPAIRABLE_DEFECT");
      expect(vagueCard?.defectNotes).toContain("ambigu");

      expect(reviewResult.rejectedAuditTrail).toHaveLength(1);
      expect(reviewResult.rejectedAuditTrail[0].draftFront).toBe("Dosis obat fiktif X?");
      expect(reviewResult.rejectedAuditTrail[0].rejectionReason).toContain("fiktif X");
      expect(reviewResult.tokenUsage.thoughtsTokenCount).toBe(30);
    });
  });

  describe("repairer.ts", () => {
    it("repairer runs exactly 1 cycle and repairs defective card into ACCEPTED", async () => {
      const defectiveCard = {
        id: "c2",
        front_text: "Ambigu?",
        back_text: "Ya",
        qualityStatus: "REPAIRABLE_DEFECT",
        defectNotes: "Terlalu singkat",
      };

      const mockRepairClient = vi.fn().mockResolvedValue({
        text: JSON.stringify({
          repairedCards: [
            {
              id: "c2",
              front_text: "Pertanyaan jelas dan spesifik?",
              back_text: "Jawaban komprehensif farmasi klinis yang tepat.",
            },
          ],
        }),
        usage: {
          isAvailable: true,
          promptTokenCount: 100,
          candidatesTokenCount: 30,
          totalTokenCount: 130,
          thoughtsTokenCount: 0,
        },
      });

      const repairResult = await repairDefectiveCards({
        defectiveCards: [defectiveCard] as any,
        geminiClient: mockRepairClient as any,
        apiKey: "key",
        model: "gemini-3.8-flash",
      });

      expect(mockRepairClient).toHaveBeenCalledWith(
        expect.objectContaining({
          thinkingLevel: "low",
        }),
      );

      expect(repairResult.repairedCards).toHaveLength(1);
      expect(repairResult.repairedCards[0].qualityStatus).toBe("ACCEPTED");
      expect(repairResult.repairedCards[0].front_text).toBe("Pertanyaan jelas dan spesifik?");
      expect(repairResult.repairedCards[0].defectNotes).toBeUndefined();
    });

    it("repairer strictly skips ACCEPTED and SUBSTANTIVE_CONFLICT cards without touching them", async () => {
      const cards = [
        { id: "c-acc", front_text: "Kartu bagus?", back_text: "Jawaban bagus.", qualityStatus: "ACCEPTED" },
        { id: "c-conf", front_text: "Kartu konflik?", back_text: "Jawaban konflik.", qualityStatus: "SUBSTANTIVE_CONFLICT", conflictRefId: "cnf-1" },
        { id: "c-def", front_text: "Kartu rusak?", back_text: "Singkat", qualityStatus: "REPAIRABLE_DEFECT", defectNotes: "Terlalu singkat" },
      ];

      const mockRepairClient = vi.fn().mockResolvedValue({
        text: JSON.stringify({
          repairedCards: [
            { id: "c-def", front_text: "Kartu diperbaiki secara lengkap?", back_text: "Jawaban lengkap dan jelas." },
          ],
        }),
        usage: { isAvailable: true, promptTokenCount: 80, candidatesTokenCount: 25, totalTokenCount: 105 },
      });

      const repairResult = await repairDefectiveCards({
        cards: cards as any,
        geminiClient: mockRepairClient as any,
        apiKey: "key",
      });

      // Ensure mock only received the defective card
      const passedPrompt = mockRepairClient.mock.calls[0][0].prompt;
      expect(passedPrompt).toContain("c-def");
      expect(passedPrompt).not.toContain("c-conf");
      expect(passedPrompt).not.toContain("c-acc");

      expect(repairResult.repairedCount).toBe(1);
      const repaired = repairResult.repairedCards.find((c) => c.id === "c-def");
      expect(repaired?.qualityStatus).toBe("ACCEPTED");
    });

    it("drops or flags cards that still fail validation after 1 cycle without infinite looping", async () => {
      const defectiveCard = {
        id: "c-fail",
        front_text: "Buruk?",
        back_text: "X",
        qualityStatus: "REPAIRABLE_DEFECT",
        defectNotes: "Terlalu singkat",
      };

      // Mock repair client returns another invalid card (e.g. empty or too short)
      const mockRepairClient = vi.fn().mockResolvedValue({
        text: JSON.stringify({
          repairedCards: [
            { id: "c-fail", front_text: "A", back_text: "B" }, // Fails min word validation
          ],
        }),
        usage: { isAvailable: true, promptTokenCount: 50, candidatesTokenCount: 10, totalTokenCount: 60 },
      });

      const repairResult = await repairDefectiveCards({
        defectiveCards: [defectiveCard] as any,
        geminiClient: mockRepairClient as any,
        apiKey: "key",
      });

      // Exactly 1 call was made (hard cap: no 2nd cycle)
      expect(mockRepairClient).toHaveBeenCalledTimes(1);
      expect(repairResult.repairedCards).toHaveLength(0);
      expect(repairResult.droppedCards).toHaveLength(1);
      expect(repairResult.droppedCount).toBe(1);
    });
  });
});
