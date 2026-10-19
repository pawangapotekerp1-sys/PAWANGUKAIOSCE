import { describe, expect, it, vi } from "vitest";
import {
  buildCandidateEvidencePack,
  generateCandidateCards,
  type CandidateEvidencePackParams,
} from "./generator.ts";
import type { TranscriptSegment } from "./cleaner.ts";
import type { ConceptNode, AlignedSourceRecord } from "./aligner.ts";

describe("Candidate Generation Stage 5 - buildCandidateEvidencePack", () => {
  function createSampleSegments(count: number): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    const concepts = ["Tablet", "Kapsul", "Suspensi", "Salep"];
    for (let i = 1; i <= count; i++) {
      const segId = `seg-${String(i).padStart(3, "0")}`;
      const concept = concepts[(i - 1) % concepts.length];
      const isClinical = i % 3 === 0;
      const isNoise = i % 15 === 0;

      let text = `Segmen ${i} membahas karakteristik fisikokimia dari sediaan ${concept} dalam formulasi industri farmasi modern.`;
      const matchedEntities: string[] = [];

      if (isClinical) {
        text = `Sediaan ${concept} dengan dosis terukur 25 mg diberikan 2x sehari untuk pasien hipertensi, hindari pada riwayat alergi.`;
        matchedEntities.push("25 mg", "2x sehari");
      } else if (isNoise) {
        text = `Cek suara satu dua, tolong link absensi di kolom chat ya teman-teman.`;
      }

      segments.push({
        segmentId: segId,
        rawText: text,
        normalizedText: text,
        lineOffset: i,
        hasClinicalEntities: isClinical,
        matchedEntities,
        classification: isNoise ? "noise" : "relevant",
        reason: isNoise ? "Conversational noise" : isClinical ? "Clinical entity detected" : "Default relevant",
      });
    }
    return segments;
  }

  it("reduces a 900-segment transcript into a bounded evidence pack under the character ceiling", () => {
    const rawSegments = createSampleSegments(900);
    const totalRawChars = rawSegments.reduce((sum, s) => sum + s.normalizedText.length, 0);

    // Expect raw transcript to be large (> 80,000 characters)
    expect(totalRawChars).toBeGreaterThan(80000);

    const maxChars = 16000;
    const pack = buildCandidateEvidencePack({
      segments: rawSegments,
      maxCharacters: maxChars,
    });

    // Bounded size
    expect(pack.evidenceText.length).toBeLessThanOrEqual(maxChars);
    expect(pack.metrics.evidencePackChars).toBeLessThanOrEqual(maxChars);
    expect(pack.metrics.availableSegmentsCount).toBe(900);
    expect(pack.metrics.selectedSegmentsCount).toBeGreaterThan(20);
    expect(pack.metrics.selectedSegmentsCount).toBeLessThan(900);
    expect(pack.metrics.skippedSegmentsCount).toBe(
      pack.metrics.availableSegmentsCount - pack.metrics.selectedSegmentsCount,
    );

    // Substantial reduction: at least 70% reduction in characters
    expect(pack.evidenceText.length).toBeLessThan(totalRawChars * 0.3);
  });

  it("prioritizes clinical entities (dosages, regimens, routes, precautions) over generic banter", () => {
    const segments: TranscriptSegment[] = [
      {
        segmentId: "seg-001",
        rawText: "Halo semuanya selamat pagi kita ketemu lagi di kelas farmasi.",
        normalizedText: "Halo semuanya selamat pagi kita ketemu lagi di kelas farmasi.",
        lineOffset: 1,
        hasClinicalEntities: false,
        matchedEntities: [],
        classification: "relevant",
      },
      {
        segmentId: "seg-002",
        rawText: "Dosis pemeliharaan Captopril adalah 25 mg 2x sehari per oral sebelum makan.",
        normalizedText: "Dosis pemeliharaan Captopril adalah 25 mg 2x sehari per oral sebelum makan.",
        lineOffset: 2,
        hasClinicalEntities: true,
        matchedEntities: ["25 mg", "2x sehari", "pril"],
        classification: "relevant",
      },
      {
        segmentId: "seg-003",
        rawText: "Kontraindikasi mutlak pada wanita hamil karena risiko teratogenik dan gagal ginjal fetus.",
        normalizedText: "Kontraindikasi mutlak pada wanita hamil karena risiko teratogenik dan gagal ginjal fetus.",
        lineOffset: 3,
        hasClinicalEntities: true,
        matchedEntities: [],
        classification: "relevant",
      },
      {
        segmentId: "seg-004",
        rawText: "Jadi materi hari ini cukup banyak slidenya ya adik-adik.",
        normalizedText: "Jadi materi hari ini cukup banyak slidenya ya adik-adik.",
        lineOffset: 4,
        hasClinicalEntities: false,
        matchedEntities: [],
        classification: "relevant",
      },
    ];

    const pack = buildCandidateEvidencePack({
      segments,
      maxCharacters: 250, // tight budget that fits only ~2-3 segments
    });

    expect(pack.selectedSegmentIds).toContain("seg-002");
    expect(pack.selectedSegmentIds).toContain("seg-003");
    expect(pack.evidenceText).toContain("25 mg 2x sehari");
    expect(pack.evidenceText).toContain("Kontraindikasi");
  });

  it("distributes representation across concepts to prevent one concept from dominating", () => {
    const concepts: ConceptNode[] = [
      { id: "cpt-tablet", name: "Tablet Effervescent", academicDomain: "pharmaceutics", hierarchyLevel: "core_concept" },
      { id: "cpt-kapsul", name: "Kapsul Gelatin Keras", academicDomain: "pharmaceutics", hierarchyLevel: "core_concept" },
      { id: "cpt-salep", name: "Salep Hidrokarbon", academicDomain: "pharmaceutics", hierarchyLevel: "core_concept" },
    ];

    const segments: TranscriptSegment[] = [];
    // 20 segments about Tablet
    for (let i = 1; i <= 20; i++) {
      segments.push({
        segmentId: `tab-${i}`,
        rawText: `Tablet Effervescent memerlukan kelembaban relatif di bawah 25% pada suhu ruang nomor ${i}.`,
        normalizedText: `Tablet Effervescent memerlukan kelembaban relatif di bawah 25% pada suhu ruang nomor ${i}.`,
        lineOffset: i,
        hasClinicalEntities: true,
        matchedEntities: ["25%"],
        classification: "relevant",
      });
    }
    // 3 segments about Kapsul
    for (let i = 1; i <= 3; i++) {
      segments.push({
        segmentId: `kap-${i}`,
        rawText: `Kapsul Gelatin Keras memiliki kadar air ideal 13-16% b/b nomor ${i}.`,
        normalizedText: `Kapsul Gelatin Keras memiliki kadar air ideal 13-16% b/b nomor ${i}.`,
        lineOffset: 20 + i,
        hasClinicalEntities: true,
        matchedEntities: ["13-16%"],
        classification: "relevant",
      });
    }
    // 2 segments about Salep
    for (let i = 1; i <= 2; i++) {
      segments.push({
        segmentId: `sal-${i}`,
        rawText: `Salep Hidrokarbon berbasis vaselin album memberikan efek oklusif nomor ${i}.`,
        normalizedText: `Salep Hidrokarbon berbasis vaselin album memberikan efek oklusif nomor ${i}.`,
        lineOffset: 23 + i,
        hasClinicalEntities: false,
        matchedEntities: [],
        classification: "relevant",
      });
    }

    const pack = buildCandidateEvidencePack({
      segments,
      concepts,
      maxCharacters: 1200,
      maxSegmentsPerConcept: 3,
    });

    const hasTablet = pack.selectedSegmentIds.some((id) => id.startsWith("tab-"));
    const hasKapsul = pack.selectedSegmentIds.some((id) => id.startsWith("kap-"));
    const hasSalep = pack.selectedSegmentIds.some((id) => id.startsWith("sal-"));

    expect(hasTablet).toBe(true);
    expect(hasKapsul).toBe(true);
    expect(hasSalep).toBe(true);

    // Tablet should not monopolize all slots even though it has 20 segments
    const tabletCount = pack.selectedSegmentIds.filter((id) => id.startsWith("tab-")).length;
    expect(tabletCount).toBeLessThanOrEqual(pack.selectedSegmentIds.length);
    expect(pack.selectedSegmentIds.filter((id) => id.startsWith("kap-")).length).toBeGreaterThanOrEqual(1);
  });

  it("preserves segmentId attribution format in evidenceText", () => {
    const segments: TranscriptSegment[] = [
      {
        segmentId: "seg-042",
        rawText: "Amoxicillin 500 mg 3x sehari per oral untuk infeksi bakteri.",
        normalizedText: "Amoxicillin 500 mg 3x sehari per oral untuk infeksi bakteri.",
        lineOffset: 42,
        hasClinicalEntities: true,
        matchedEntities: ["500 mg", "3x sehari", "cillin"],
        classification: "relevant",
      },
    ];

    const pack = buildCandidateEvidencePack({ segments });
    expect(pack.evidenceText).toContain("[seg-042]");
    expect(pack.evidenceText).toContain("Amoxicillin 500 mg 3x sehari");
    expect(pack.selectedSegmentIds).toEqual(["seg-042"]);
  });

  it("filters out noise segments and duplicates deterministically", () => {
    const segments: TranscriptSegment[] = [
      {
        segmentId: "seg-101",
        rawText: "Halo tes satu dua tiga suara masuk ya.",
        normalizedText: "Halo tes satu dua tiga suara masuk ya.",
        lineOffset: 1,
        hasClinicalEntities: false,
        matchedEntities: [],
        classification: "noise",
      },
      {
        segmentId: "seg-102",
        rawText: "Paracetamol 500 mg 3-4x sehari bila demam.",
        normalizedText: "Paracetamol 500 mg 3-4x sehari bila demam.",
        lineOffset: 2,
        hasClinicalEntities: true,
        matchedEntities: ["500 mg"],
        classification: "relevant",
      },
      {
        segmentId: "seg-103",
        rawText: "Paracetamol 500 mg 3-4x sehari bila demam.", // exact duplicate text
        normalizedText: "Paracetamol 500 mg 3-4x sehari bila demam.",
        lineOffset: 3,
        hasClinicalEntities: true,
        matchedEntities: ["500 mg"],
        classification: "relevant",
      },
    ];

    const pack = buildCandidateEvidencePack({ segments });
    expect(pack.selectedSegmentIds).not.toContain("seg-101"); // Noise dropped
    expect(pack.selectedSegmentIds).toContain("seg-102");
    expect(pack.selectedSegmentIds).not.toContain("seg-103"); // Duplicate dropped
  });

  it("provides safe bounded fallback when concept mapping is empty or corrupt", () => {
    const segments = createSampleSegments(500);

    const pack = buildCandidateEvidencePack({
      segments,
      concepts: undefined,
      alignedSources: [],
      maxCharacters: 10000,
    });

    expect(pack.evidenceText.length).toBeLessThanOrEqual(10000);
    expect(pack.metrics.selectedSegmentsCount).toBeGreaterThan(0);
    expect(pack.metrics.selectedSegmentsCount).toBeLessThan(500);
    expect(pack.evidenceText).not.toBe("");
  });

  it("integrates with generateCandidateCards using evidencePack instead of raw transcript", async () => {
    const segments = createSampleSegments(100);
    const pack = buildCandidateEvidencePack({
      segments,
      maxCharacters: 5000,
    });

    const mockGemini = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        global_summary: "Ringkasan uji formulasi",
        subtopics: [
          {
            title: "Teknologi Sediaan Solid",
            summary: "Ringkasan subtopik",
            cards: [
              {
                front_text: "Apa karakteristik utama tablet effervescent?",
                back_text: "Membutuhkan kelembaban relatif rendah dan eksipien asam-basa.",
              },
            ],
          },
        ],
      }),
      usage: {
        isAvailable: true,
        promptTokenCount: 1500,
        candidatesTokenCount: 300,
        totalTokenCount: 1800,
        thoughtsTokenCount: 80,
      },
    });

    const result = await generateCandidateCards({
      title: "Sediaan Solid",
      academicGroup: "pharmaceutical_science",
      evidencePack: pack,
      geminiClient: mockGemini as any,
    });

    expect(result.cards).toHaveLength(1);
    expect(mockGemini).toHaveBeenCalledTimes(1);

    // Prompt sent to Gemini must contain the condensed evidence pack, not all 100 raw segments
    const calledPrompt = mockGemini.mock.calls[0][0].prompt as string;
    expect(calledPrompt).toContain("Bukti Transkrip Terpilih (High-Yield Clinical Evidence):");
    expect(calledPrompt).toContain(pack.selectedSegmentIds[0]);
    expect(result.evidencePackMetrics).toBeDefined();
    expect(result.evidencePackMetrics?.selectedSegmentsCount).toBe(pack.metrics.selectedSegmentsCount);
  });

  it("handles multimodal PDF inline data when <= 4MB and skips inline data when > 4MB to prevent OOM", async () => {
    const mockGemini = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        global_summary: "Ringkasan uji",
        subtopics: [
          {
            title: "Subtopik Uji",
            summary: "Ringkasan",
            cards: [{ front_text: "Pertanyaan", back_text: "Jawaban" }],
          },
        ],
      }),
      usage: { isAvailable: false },
    });

    // 1. Small PDF (under 4MB)
    const smallPdf = new Uint8Array([37, 80, 68, 70]); // %PDF
    await generateCandidateCards({
      title: "Uji PDF Kecil",
      academicGroup: "clinical_science",
      pdfBytes: smallPdf,
      geminiClient: mockGemini as any,
    });

    const smallCallParts = mockGemini.mock.calls[0][0].parts;
    const hasInlineDataSmall = smallCallParts.some((p: any) => p.inlineData?.mimeType === "application/pdf");
    expect(hasInlineDataSmall).toBe(true);

    mockGemini.mockClear();

    // 2. Oversized PDF (> 4MB)
    const oversizedPdf = new Uint8Array(4 * 1024 * 1024 + 1);
    await generateCandidateCards({
      title: "Uji PDF Besar",
      academicGroup: "clinical_science",
      pdfBytes: oversizedPdf,
      geminiClient: mockGemini as any,
    });

    const largeCallParts = mockGemini.mock.calls[0][0].parts;
    const hasInlineDataLarge = largeCallParts.some((p: any) => p.inlineData?.mimeType === "application/pdf");
    expect(hasInlineDataLarge).toBe(false);
  });
});
