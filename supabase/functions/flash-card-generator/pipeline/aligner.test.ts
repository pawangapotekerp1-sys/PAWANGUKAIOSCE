import { describe, expect, it, vi } from "vitest";
import {
  alignSourcesAndDetectConflicts,
  buildKnowledgeGraph,
  buildSourceReferences,
  detectContraindicationMismatch,
  detectGuidelineMismatch,
  detectSourceConflicts,
  extractDosageEntities,
  isCompatibleElaboration,
  KnowledgeGraph,
} from "./aligner.ts";
import { CardSourceReferenceSchema } from "../../_shared/flash-card.ts";

describe("KnowledgeGraph - In-Memory Concept Mapping & Traversal", () => {
  it("builds an in-memory directed knowledge graph from extracted concepts and relations", () => {
    const rawConcepts = [
      {
        id: "cpt-1",
        name: "Hipertensi",
        domain: "clinical_science",
        level: "subtopic",
      },
      {
        id: "cpt-2",
        name: "Captopril",
        domain: "pharmaceutical_science",
        level: "core_concept",
        attributes: { class: "ACE-inhibitor" },
      },
      {
        id: "cpt-3",
        name: "Batuk Kering",
        academicDomain: "clinical_science",
        hierarchyLevel: "attribute" as const,
      },
    ];

    const relations = [
      {
        sourceId: "cpt-2",
        targetId: "cpt-1",
        relationType: "first_line_for" as const,
      },
      {
        sourceId: "cpt-2",
        targetId: "cpt-3",
        relationType: "mechanism_of" as const,
      },
    ];

    const graph = buildKnowledgeGraph(rawConcepts, relations);

    // Node retrieval
    const captopril = graph.getNode("cpt-2");
    expect(captopril).toBeDefined();
    expect(captopril?.name).toBe("Captopril");
    expect(captopril?.academicDomain).toBe("pharmaceutical_science");
    expect(captopril?.hierarchyLevel).toBe("core_concept");
    expect(captopril?.attributes?.class).toBe("ACE-inhibitor");

    // Traversal: Outgoing relations
    const outgoing = graph.getOutgoingRelations("cpt-2");
    expect(outgoing).toHaveLength(2);
    expect(outgoing.map((r) => r.relationType)).toContain("first_line_for");
    expect(outgoing.map((r) => r.relationType)).toContain("mechanism_of");

    // Traversal: Incoming relations
    const incomingToHypertension = graph.getIncomingRelations("cpt-1");
    expect(incomingToHypertension).toHaveLength(1);
    expect(incomingToHypertension[0].sourceId).toBe("cpt-2");

    // List all nodes
    const allNodes = graph.getAllNodes();
    expect(allNodes).toHaveLength(3);
    expect(graph.hasNode("cpt-1")).toBe(true);
    expect(graph.hasNode("non-existent")).toBe(false);
  });

  it("handles nodes with empty relations gracefully", () => {
    const graph = new KnowledgeGraph();
    graph.addNode({
      id: "solo-1",
      name: "Metformin",
      academicDomain: "pharmaceutical_science",
      hierarchyLevel: "core_concept",
    });

    expect(graph.getOutgoingRelations("solo-1")).toEqual([]);
    expect(graph.getIncomingRelations("solo-1")).toEqual([]);
    expect(graph.getNode("unknown")).toBeUndefined();
  });
});

describe("Multi-Source Provenance Builder", () => {
  it("builds both slide and transcript references on a single card respecting zero-hallucination", () => {
    const references = buildSourceReferences({
      slideMatch: {
        pdfPageIndex: 4,
        printedSlideNumber: 3,
        quote: "Dosis pemeliharaan kaptopril 25 mg 2x sehari",
        confidence: "high",
        isExact: true,
      },
      transcriptMatch: {
        segmentId: "seg-015",
        quote: "Mentor menegaskan dosis pada lansia diawali 12.5 mg",
        confidence: "high",
        isExact: true,
      },
    });

    expect(references).toHaveLength(2);

    // Slide reference assertion
    const slideRef = references[0];
    expect(slideRef.sourceType).toBe("slide_pdf");
    expect(slideRef.sourceId).toBe("slide-page-4");
    expect(slideRef.provenanceStatus).toBe("verified_exact");
    expect(slideRef.location.pdfPageIndex).toBe(4);
    expect(slideRef.location.printedSlideNumber).toBe(3);
    expect(slideRef.location.segmentId).toBeNull();
    expect(slideRef.location.textQuote).toBe(
      "Dosis pemeliharaan kaptopril 25 mg 2x sehari",
    );
    expect(slideRef.alignmentConfidence).toBe("high");

    // Transcript reference assertion
    const transcriptRef = references[1];
    expect(transcriptRef.sourceType).toBe("transcript");
    expect(transcriptRef.sourceId).toBe("transcript-seg-015");
    expect(transcriptRef.provenanceStatus).toBe("verified_exact");
    expect(transcriptRef.location.pdfPageIndex).toBeNull();
    expect(transcriptRef.location.printedSlideNumber).toBeUndefined();
    expect(transcriptRef.location.segmentId).toBe("seg-015");
    expect(transcriptRef.location.textQuote).toBe(
      "Mentor menegaskan dosis pada lansia diawali 12.5 mg",
    );
    expect(transcriptRef.alignmentConfidence).toBe("high");

    // Must validate through Zod schema
    for (const ref of references) {
      expect(() => CardSourceReferenceSchema.parse(ref)).not.toThrow();
    }
  });

  it("strictly caps quotes at 300 characters and sets unanchored for missing page numbers", () => {
    const longQuote = "A".repeat(450);
    const references = buildSourceReferences({
      slideMatch: {
        pdfPageIndex: null, // Unanchored / no page number
        quote: longQuote,
        isExact: false,
      },
    });

    expect(references).toHaveLength(1);
    const ref = references[0];
    expect(ref.location.pdfPageIndex).toBeNull();
    expect(ref.provenanceStatus).toBe("unanchored");
    expect(ref.sourceId).toBe("slide-unanchored");
    expect(ref.location.textQuote.length).toBe(300);
    expect(ref.location.textQuote).toBe("A".repeat(300));
  });

  it("rejects non-positive integers as page numbers to prevent hallucinated page 0 or negative index", () => {
    const references = buildSourceReferences({
      slideMatch: {
        pdfPageIndex: 0,
        quote: "Definisi hipertensi",
      },
    });

    expect(references[0].location.pdfPageIndex).toBeNull();
    expect(references[0].provenanceStatus).toBe("unanchored");
  });
});

describe("Deterministic Source Alignment & Conflict Detector", () => {
  it("detects substantive conflict when slide and transcript contradict on dosage", () => {
    const slideInfo = [
      {
        pdfPageIndex: 4,
        printedSlideNumber: 4,
        textSummary: "Dosis pemeliharaan 25 mg 2x sehari",
      },
    ];
    const transcriptSegments = [
      {
        segmentId: "seg-010",
        text: "Mentor menegaskan dosis pemeliharaan 50 mg 2x sehari",
      },
    ];

    const result = alignSourcesAndDetectConflicts({
      slides: slideInfo,
      segments: transcriptSegments,
      candidateComparisons: [
        {
          conceptId: "cpt-captopril",
          slideClaim: "Dosis pemeliharaan 25 mg 2x sehari",
          slidePageIndex: 4,
          transcriptClaim: "Mentor menegaskan dosis pemeliharaan 50 mg 2x sehari",
          segmentId: "seg-010",
        },
      ],
    });

    expect(result.conflicts).toHaveLength(1);
    const conflict = result.conflicts[0];
    expect(conflict.severity).toBe("critical");
    expect(conflict.category).toBe("dosage_discrepancy");
    expect(conflict.resolutionStatus).toBe("unresolved");
    expect(conflict.distinctionType).toBe("substantive_contradiction");
    expect(conflict.slideEvidence.pdfPageIndex).toBe(4);
    expect(conflict.slideEvidence.exactQuote).toBe(
      "Dosis pemeliharaan 25 mg 2x sehari",
    );
    expect(conflict.transcriptEvidence.segmentId).toBe("seg-010");
    expect(conflict.transcriptEvidence.exactQuote).toBe(
      "Mentor menegaskan dosis pemeliharaan 50 mg 2x sehari",
    );
  });

  it("detects critical contraindication mismatch (safe on slide vs contraindicated on transcript)", () => {
    const result = detectSourceConflicts({
      candidateComparisons: [
        {
          conceptId: "cpt-acei-pregnancy",
          conceptName: "ACE Inhibitor pada Kehamilan",
          slideClaim: "Aman digunakan untuk ibu hamil trimester pertama",
          slidePageIndex: 8,
          transcriptClaim:
            "Jangan pernah berikan, kontraindikasi mutlak pada ibu hamil karena risiko teratogenik fatal",
          segmentId: "seg-088",
        },
      ],
    });

    expect(result.conflicts).toHaveLength(1);
    const conflict = result.conflicts[0];
    expect(conflict.severity).toBe("critical");
    expect(conflict.category).toBe("contraindication_mismatch");
    expect(conflict.resolutionStatus).toBe("unresolved");
  });

  it("detects high severity guideline / line of therapy discrepancy", () => {
    const result = alignSourcesAndDetectConflicts({
      candidateComparisons: [
        {
          conceptId: "cpt-ht-line",
          conceptName: "Lini Terapi Hipertensi",
          slideClaim: "Terapi lini pertama untuk pasien diabetes dengan hipertensi",
          slidePageIndex: 12,
          transcriptClaim:
            "Dosen menegaskan obat ini menjadi lini kedua setelah pemberian tiazid",
          segmentId: "seg-102",
        },
      ],
    });

    expect(result.conflicts).toHaveLength(1);
    const conflict = result.conflicts[0];
    expect(conflict.severity).toBe("high");
    expect(conflict.category).toBe("clinical_guideline");
    expect(conflict.resolutionStatus).toBe("unresolved");
  });

  it("assigns moderate severity for minor technical terminology difference", () => {
    const result = alignSourcesAndDetectConflicts({
      candidateComparisons: [
        {
          conceptId: "cpt-synonym",
          conceptName: "Nomenklatur Kimia",
          slideClaim: "Nama resmi: Asam asetilsalisilat",
          slidePageIndex: 3,
          transcriptClaim: "Istilah teknis: Asetilsalisilat anhidrat",
          segmentId: "seg-007",
          category: "drug_identity",
        },
      ],
    });

    expect(result.conflicts).toHaveLength(1);
    const conflict = result.conflicts[0];
    expect(conflict.severity).toBe("moderate");
    expect(conflict.category).toBe("drug_identity");
  });

  it("distinguishes compatible elaboration when transcript explains MOA (no conflict created)", () => {
    const result = alignSourcesAndDetectConflicts({
      candidateComparisons: [
        {
          conceptId: "cpt-captopril-moa",
          conceptName: "Mekanisme Captopril",
          slideClaim: "Captopril adalah ACE inhibitor untuk terapi hipertensi",
          slidePageIndex: 5,
          transcriptClaim:
            "Mekanisme kerjanya adalah menghambat konversi angiotensin I menjadi angiotensin II pada endotel pembuluh darah",
          segmentId: "seg-044",
        },
      ],
    });

    expect(result.conflicts).toHaveLength(0);
    expect(result.alignedSources).toHaveLength(1);
    expect(result.alignedSources[0].alignmentType).toBe("compatible_elaboration");
    expect(result.alignedSources[0].references).toHaveLength(2);
  });

  it("distinguishes compatible elaboration when transcript provides hospital practical case context", () => {
    const result = alignSourcesAndDetectConflicts({
      candidateComparisons: [
        {
          conceptId: "cpt-amlodipine-case",
          conceptName: "Amlodipine Geriatri",
          slideClaim: "Amlodipine 5 mg untuk hipertensi esensial",
          slidePageIndex: 9,
          transcriptClaim:
            "Pengalaman klinis dan contoh kasus di rumah sakit menunjukkan amlodipine 5 mg sangat cocok untuk pasien lansia",
          segmentId: "seg-051",
        },
      ],
    });

    expect(result.conflicts).toHaveLength(0);
    expect(result.alignedSources).toHaveLength(1);
    expect(result.alignedSources[0].alignmentType).toBe("compatible_elaboration");
  });

  it("handles unanchored transcript segments gracefully when slidePage is null", () => {
    const result = alignSourcesAndDetectConflicts({
      candidateComparisons: [
        {
          conceptId: "cpt-unanchored-note",
          slideClaim: "",
          slidePageIndex: null,
          transcriptClaim:
            "Ingat ya kawan-kawan, selalu monitor fungsi ginjal sebelum memulai ACE-i",
          segmentId: "seg-099",
        },
      ],
    });

    expect(result.conflicts).toHaveLength(0);
    expect(result.alignedSources).toHaveLength(1);
    const aligned = result.alignedSources[0];
    expect(aligned.slidePageIndex).toBeNull();
    expect(aligned.references).toHaveLength(2);
    expect(aligned.references[0].location.pdfPageIndex).toBeNull();
    expect(aligned.references[0].provenanceStatus).toBe("unanchored");
  });

  it("handles automatic correlation when candidateComparisons is not provided", () => {
    const slides = [
      {
        pdfPageIndex: 2,
        printedSlideNumber: 1,
        textSummary: "Furosemid dosis 40 mg iv untuk edema paru akut",
        keyTerms: ["Furosemid", "edema paru"],
      },
    ];
    const segments = [
      {
        segmentId: "seg-100",
        normalizedText:
          "Pada pasien di rumah sakit, furosemid 40 mg diberikan secara bolus perlahan",
        hasClinicalEntities: true,
      },
      {
        segmentId: "seg-101",
        normalizedText: "Diskusi bebas tentang jadwal ujian minggu depan",
        hasClinicalEntities: false,
      },
    ];

    const result = alignSourcesAndDetectConflicts({ slides, segments });
    expect(result.conflicts).toHaveLength(0);
    // seg-100 matched slide 2; seg-101 is unanchored
    expect(result.alignedSources.length).toBeGreaterThanOrEqual(1);
  });
});

describe("LLM-based Semantic Alignment (with mock geminiClient)", () => {
  it("calls geminiClient with thinkingLevel 'low' and parses structured contradiction", async () => {
    const mockGeminiClient = vi.fn().mockResolvedValue({
      data: {
        evaluations: [
          {
            conceptId: "cpt-llm-1",
            distinctionType: "substantive_contradiction",
            category: "dosage_discrepancy",
            severity: "critical",
            reason: "Dosis slide 10 mg bertentangan dengan transkrip 80 mg.",
          },
        ],
      },
      usage: {
        isAvailable: true,
        promptTokenCount: 150,
        candidatesTokenCount: 60,
        totalTokenCount: 210,
        thoughtsTokenCount: 15,
      },
      latencyMs: 120,
    });

    const result = await alignSourcesAndDetectConflicts({
      geminiClient: mockGeminiClient,
      candidateComparisons: [
        {
          conceptId: "cpt-llm-1",
          slideClaim: "Dosis awal 10 mg",
          slidePageIndex: 3,
          transcriptClaim: "Mulai langsung dengan dosis 80 mg",
          segmentId: "seg-201",
        },
      ],
    });

    expect(mockGeminiClient).toHaveBeenCalledOnce();
    const callArgs = mockGeminiClient.mock.calls[0][0];
    expect(callArgs.thinkingLevel).toBe("low");
    expect(callArgs.responseMimeType).toBe("application/json");

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].severity).toBe("critical");
    expect(result.conflicts[0].category).toBe("dosage_discrepancy");
    expect(result.conflicts[0].clinicalClarificationNotes).toContain("Dosis slide 10 mg");

    expect(result.tokenUsage?.isAvailable).toBe(true);
    expect(result.tokenUsage?.thoughtsTokenCount).toBe(15);
  });

  it("aligns as compatible elaboration when LLM returns compatible_elaboration", async () => {
    const mockGeminiClient = vi.fn().mockResolvedValue({
      data: {
        evaluations: [
          {
            conceptId: "cpt-llm-2",
            distinctionType: "compatible_elaboration",
            reason: "Dosen memperjelas mekanisme kerja ACE inhibitor tanpa kontradiksi.",
          },
        ],
      },
      usage: {
        isAvailable: true,
        promptTokenCount: 120,
        candidatesTokenCount: 45,
        totalTokenCount: 165,
        thoughtsTokenCount: 10,
      },
      latencyMs: 95,
    });

    const result = await alignSourcesAndDetectConflicts({
      geminiClient: mockGeminiClient,
      candidateComparisons: [
        {
          conceptId: "cpt-llm-2",
          conceptName: "Captopril MOA",
          slideClaim: "Captopril menghambat ACE",
          slidePageIndex: 4,
          printedSlideNumber: 3,
          transcriptClaim: "Captopril bekerja dengan memblokir konversi angiotensin I ke II",
          segmentId: "seg-305",
        },
      ],
    });

    expect(mockGeminiClient).toHaveBeenCalledOnce();
    expect(result.conflicts).toHaveLength(0);
    expect(result.alignedSources).toHaveLength(1);
    expect(result.alignedSources[0].alignmentType).toBe("compatible_elaboration");
  });
});

describe("Heuristic Helper Functions", () => {
  it("extracts dosages accurately from Indonesian text", () => {
    const text = "Berikan amlodipine 5 mg atau 10 mg, jangan lebih dari 20 mg/hari";
    const doses = extractDosageEntities(text);
    expect(doses).toHaveLength(3);
    expect(doses[0].value).toBe(5);
    expect(doses[0].unit).toBe("mg");
    expect(doses[1].value).toBe(10);
    expect(doses[2].value).toBe(20);
  });

  it("detects contraindication mismatch accurately", () => {
    expect(
      detectContraindicationMismatch(
        "Aman untuk wanita hamil",
        "Kontraindikasi pada wanita hamil",
      ),
    ).toBe(true);
    expect(
      detectContraindicationMismatch(
        "Boleh diberikan pada lansia",
        "Dosis sama untuk dewasa dan lansia",
      ),
    ).toBe(false);
  });

  it("detects line of therapy mismatch", () => {
    expect(
      detectGuidelineMismatch(
        "Lini pertama hipertensi",
        "Merupakan lini kedua jika tiazid gagal",
      ),
    ).toBe(true);
    expect(
      detectGuidelineMismatch(
        "Pilihan pertama dokter spesialis",
        "Bekerja sebagai ACE inhibitor",
      ),
    ).toBe(false);
  });

  it("detects compatible elaboration correctly", () => {
    expect(
      isCompatibleElaboration(
        "Captopril menurunkan tekanan darah",
        "Mekanisme kerjanya adalah menghambat konversi angiotensin I menjadi angiotensin II",
      ),
    ).toBe(true);
    expect(
      isCompatibleElaboration(
        "Metformin 500 mg",
        "Di rumah sakit kami selalu evaluasi fungsi ginjal pasien",
      ),
    ).toBe(true);
  });
});
