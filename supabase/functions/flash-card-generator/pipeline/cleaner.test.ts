import { describe, expect, it, vi } from "vitest";
import {
  cleanTranscript,
  normalizeDeterministicTranscript,
  scanClinicalEntities,
  segmentTranscript,
} from "./cleaner.ts";

describe("Transcript Cleaner - Deterministic Normalizer", () => {
  it("strips ASR timestamps and speaker labels without mutating clinical negations", () => {
    const raw =
      "[00:14:20] Speaker 1: Pasien gagal ginjal tidak boleh diberikan kombinasi ini.\n\n[00:14:35] Speaker 1: Catat ya.";
    const result = normalizeDeterministicTranscript(raw);
    expect(result).toContain(
      "Pasien gagal ginjal tidak boleh diberikan kombinasi ini.",
    );
    expect(result).toContain("Catat ya.");
    expect(result).not.toContain("[00:14:20]");
    expect(result).not.toContain("[00:14:35]");
    expect(result).not.toContain("Speaker 1:");
  });

  it("strips various timestamp formats including parenthesized and SRT/VTT timecodes", () => {
    const rawSrt = `WEBVTT

1
00:01:10.500 --> 00:01:14.200
Mentor: Berikan amlodipine 5 mg sekali sehari.

2
00:01:15,000 --> 00:01:18,000
(14:20) Dosen: Jangan diberikan pada pasien syok kardiogenik.`;

    const result = normalizeDeterministicTranscript(rawSrt);
    expect(result).not.toContain("WEBVTT");
    expect(result).not.toContain("-->");
    expect(result).not.toContain("(14:20)");
    expect(result).not.toContain("Mentor:");
    expect(result).not.toContain("Dosen:");
    expect(result).toContain("Berikan amlodipine 5 mg sekali sehari.");
    expect(result).toContain(
      "Jangan diberikan pada pasien syok kardiogenik.",
    );
  });

  it("safely deduplicates common stutters but NEVER mutates clinical negations or dosages", () => {
    const rawStutter =
      "Obat ini dan dan ini yang yang sangat penting, tidak tidak boleh diganti dan 500 mg 500 mg jangan digandakan.";
    const result = normalizeDeterministicTranscript(rawStutter);

    // Stutters deduplicated
    expect(result).toContain("Obat ini dan ini yang sangat penting");

    // Clinical negations & dosages preserved exactly
    expect(result).toContain("tidak tidak boleh");
    expect(result).toContain("500 mg 500 mg");
    expect(result).toContain("jangan digandakan");
  });

  it("handles empty or whitespace-only raw text gracefully", () => {
    expect(normalizeDeterministicTranscript("")).toBe("");
    expect(normalizeDeterministicTranscript("   \n\n  ")).toBe("");
  });
});

describe("Transcript Cleaner - Clinical Entity Scanner", () => {
  it("identifies clinical entities and prevents false removal into noise", () => {
    const textWithDose = "eh anu, dikasih 500 mg sehari 2x1 sesudah makan";
    const entities = scanClinicalEntities(textWithDose);
    expect(entities.hasClinicalEntities).toBe(true);
    expect(entities.matchedEntities).toEqual(
      expect.arrayContaining(["500 mg", "2x1"]),
    );
  });

  it("detects various dosage units, routes, and frequencies", () => {
    const text =
      "Injeksi subkutan insulin 10 iu/ml prn, dan sirup paracetamol 2.5 ml 3x sehari ac, sediaan salep 10%";
    const entities = scanClinicalEntities(text);
    expect(entities.hasClinicalEntities).toBe(true);
    expect(entities.matchedEntities).toEqual(
      expect.arrayContaining([
        "subkutan",
        "10 iu/ml",
        "prn",
        "2.5 ml",
        "3x sehari",
        "ac",
        "10%",
      ]),
    );
  });

  it("detects pharmacology stems reliably", () => {
    const text =
      "Kombinasi bisoprolol, captopril, candesartan, atorvastatin, amoxicillin, dan omeprazole.";
    const entities = scanClinicalEntities(text);
    expect(entities.hasClinicalEntities).toBe(true);
    expect(entities.matchedEntities).toEqual(
      expect.arrayContaining([
        "bisoprolol",
        "captopril",
        "candesartan",
        "atorvastatin",
        "amoxicillin",
        "omeprazole",
      ]),
    );
  });

  it("returns hasClinicalEntities: false for casual banter and logistics", () => {
    const banter =
      "Halo teman-teman semua, tes mic satu dua tiga. Slide selanjutnya tolong dibuka.";
    const entities = scanClinicalEntities(banter);
    expect(entities.hasClinicalEntities).toBe(false);
    expect(entities.matchedEntities).toHaveLength(0);
  });
});

describe("Transcript Cleaner - Segmenter", () => {
  it("segments transcript into structured units with IDs and clinical tags", () => {
    const input =
      "Tes mic satu dua... Dosisnya 500 mg tapi...\nBaris kedua pasien minum captopril.";
    const segments = segmentTranscript(input);

    expect(segments.length).toBeGreaterThanOrEqual(3);
    expect(segments[0].segmentId).toBe("seg-001");
    expect(segments[0].hasClinicalEntities).toBe(false);

    const dosageSeg = segments.find((s) => s.normalizedText.includes("500 mg"));
    expect(dosageSeg).toBeDefined();
    expect(dosageSeg?.hasClinicalEntities).toBe(true);
    expect(dosageSeg?.matchedEntities).toContain("500 mg");

    const captoprilSeg = segments.find((s) =>
      s.normalizedText.includes("captopril")
    );
    expect(captoprilSeg).toBeDefined();
    expect(captoprilSeg?.hasClinicalEntities).toBe(true);
    expect(captoprilSeg?.matchedEntities).toContain("captopril");
  });
});

describe("Transcript Cleaner - Pipeline & Clinical Entity Shield Guardrail", () => {
  it("classifies tech noise as noise but clinical ambiguity as uncertain", async () => {
    const mockGemini = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        classifications: [
          {
            segmentId: "seg-001",
            classification: "noise",
            reason: "Audio test",
          },
          {
            segmentId: "seg-002",
            classification: "uncertain",
            reason: "Cutoff dosage sentence",
          },
        ],
      }),
      usage: {
        isAvailable: true,
        promptTokenCount: 100,
        candidatesTokenCount: 40,
        totalTokenCount: 140,
        thoughtsTokenCount: 0,
      },
    });

    const result = await cleanTranscript(
      "Tes mic satu dua... Dosisnya 500 mg tapi...",
      {
        apiKey: "test",
        model: "gemini-3.8-flash",
        geminiClient: mockGemini as any,
      },
    );

    expect(result.droppedNoiseCount).toBeGreaterThanOrEqual(0);
    expect(
      result.retainedSegments.some((s) => s.classification === "uncertain"),
    ).toBe(true);
    expect(result.metrics.totalTokenCount).toBe(140);
    expect(result.tokenUsage.totalTokenCount).toBe(140);
  });

  it("CRITICAL GUARDRAIL: overrides model noise classification when clinical entities are present", async () => {
    // Model aggressively flags a segment with dosage as noise
    const mockGemini = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        classifications: [
          {
            segmentId: "seg-001",
            classification: "noise",
            reason: "Casual banter",
          },
          {
            segmentId: "seg-002",
            classification: "noise", // Model mistakenly calls dosage noise!
            reason: "Off-topic remark",
          },
        ],
      }),
      usage: {
        isAvailable: true,
        promptTokenCount: 80,
        candidatesTokenCount: 30,
        totalTokenCount: 110,
        thoughtsTokenCount: 10,
      },
    });

    const raw =
      "Tes mic halo halo...\nEh anu, dikasih bisoprolol 2.5 mg 1x sehari ya.";
    const result = await cleanTranscript(raw, {
      apiKey: "test-key",
      model: "gemini-3.8-flash",
      geminiClient: mockGemini as any,
    });

    // seg-001 (mic test) should be dropped as noise
    expect(result.droppedNoiseCount).toBe(1);

    // seg-002 MUST NOT be dropped because bisoprolol 2.5 mg is clinical!
    const clinicalSeg = result.segments.find((s) =>
      s.normalizedText.includes("bisoprolol")
    );
    expect(clinicalSeg).toBeDefined();
    expect(clinicalSeg?.classification).toBe("uncertain");
    expect(clinicalSeg?.reason).toContain(
      "Protected by Clinical Entity Shield",
    );

    // It must be in retainedSegments
    expect(result.retainedSegments).toContainEqual(clinicalSeg);
    expect(result.retainedText).toContain("bisoprolol 2.5 mg");
  });

  it("flags incomplete transcription with suspected_transcription_error", async () => {
    const mockGemini = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        classifications: [
          {
            segmentId: "seg-001",
            classification: "uncertain",
            reason: "Audio cut off mid-sentence (suspected_transcription_error)",
            suspectedTranscriptionError: true,
          },
        ],
      }),
      usage: {
        isAvailable: true,
        promptTokenCount: 50,
        candidatesTokenCount: 20,
        totalTokenCount: 70,
        thoughtsTokenCount: 0,
      },
    });

    const result = await cleanTranscript("Dosis metformin pada pasien dengan eGFR...", {
      apiKey: "test",
      geminiClient: mockGemini as any,
    });

    expect(result.retainedSegments[0].suspectedTranscriptionError).toBe(true);
    expect(result.retainedSegments[0].classification).toBe("uncertain");
  });

  it("handles empty or blank transcripts without invoking Gemini", async () => {
    const mockGemini = vi.fn();
    const result = await cleanTranscript("   \n\n  ", {
      apiKey: "test",
      geminiClient: mockGemini as any,
    });

    expect(mockGemini).not.toHaveBeenCalled();
    expect(result.segments).toHaveLength(0);
    expect(result.retainedSegments).toHaveLength(0);
    expect(result.retainedText).toBe("");
    expect(result.droppedNoiseCount).toBe(0);
    expect(result.uncertainCount).toBe(0);
    expect(result.metrics.totalTokenCount).toBe(0);
  });

  it("processes multiple chunks with sliding context overlap and aggregates metrics", async () => {
    // 4 sentences with chunkSize = 2, so 2 chunks
    const lines = [
      "Kalimat pertama materi farmakologi.",
      "Kalimat kedua penjelasan obat.",
      "Kalimat ketiga efek samping.",
      "Kalimat keempat kontraindikasi.",
    ].join("\n");

    const mockGemini = vi.fn()
      .mockResolvedValueOnce({
        text: JSON.stringify({
          classifications: [
            { segmentId: "seg-001", classification: "relevant", reason: "Materi" },
            { segmentId: "seg-002", classification: "relevant", reason: "Obat" },
          ],
        }),
        usage: {
          isAvailable: true,
          promptTokenCount: 60,
          candidatesTokenCount: 25,
          totalTokenCount: 85,
          thoughtsTokenCount: 5,
        },
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          classifications: [
            { segmentId: "seg-003", classification: "relevant", reason: "Efek" },
            { segmentId: "seg-004", classification: "relevant", reason: "Kontraindikasi" },
          ],
        }),
        usage: {
          isAvailable: true,
          promptTokenCount: 70,
          candidatesTokenCount: 30,
          totalTokenCount: 100,
          thoughtsTokenCount: 10,
        },
      });

    const result = await cleanTranscript(lines, {
      apiKey: "test",
      chunkSize: 2,
      chunkOverlap: 1,
      geminiClient: mockGemini as any,
    });

    expect(mockGemini).toHaveBeenCalledTimes(2);
    expect(result.segments).toHaveLength(4);
    expect(result.retainedSegments).toHaveLength(4);
    expect(result.metrics.promptTokenCount).toBe(130);
    expect(result.metrics.candidatesTokenCount).toBe(55);
    expect(result.metrics.totalTokenCount).toBe(185);
    expect(result.metrics.thoughtsTokenCount).toBe(15);
  });

  it("gracefully falls back when Gemini response contains markdown code fences or raw json", async () => {
    const mockGemini = vi.fn().mockResolvedValue({
      text: "```json\n{\"classifications\": [{\"segmentId\": \"seg-001\", \"classification\": \"relevant\", \"reason\": \"Materi inti\"}]}\n```",
      usage: {
        isAvailable: true,
        promptTokenCount: 40,
        candidatesTokenCount: 15,
        totalTokenCount: 55,
        thoughtsTokenCount: 0,
      },
    });

    const result = await cleanTranscript("Penjelasan mekanisme kerja obat.", {
      apiKey: "test",
      geminiClient: mockGemini as any,
    });

    expect(result.retainedSegments).toHaveLength(1);
    expect(result.retainedSegments[0].classification).toBe("relevant");
  });

  it("passes maxOutputTokens: 8192 and adaptively subdivides large slices when encountering errors", async () => {
    // Generate 20 segments
    const lines = Array.from({ length: 20 }, (_, i) => `Segmen materi perkuliahan farmakologi ${i + 1}`).join("\n");
    let callCount = 0;

    const mockGemini = vi.fn().mockImplementation((req) => {
      callCount += 1;
      expect(req.maxOutputTokens).toBe(8192);

      // First call with all 20 segments throws GeminiRequestError
      if (callCount === 1) {
        throw new Error("Output Gemini terpotong karena batas token.");
      }

      // Subdivided calls succeed
      return Promise.resolve({
        text: JSON.stringify({
          classifications: [
            { segmentId: "seg-001", classification: "relevant", reason: "Materi inti" },
          ],
        }),
        usage: {
          isAvailable: true,
          promptTokenCount: 20,
          candidatesTokenCount: 10,
          totalTokenCount: 30,
          thoughtsTokenCount: 0,
        },
      });
    });

    const result = await cleanTranscript(lines, {
      apiKey: "test",
      chunkSize: 50,
      geminiClient: mockGemini as any,
    });

    // Should have subdivided because 20 > 15
    expect(callCount).toBeGreaterThan(1);
    expect(result.segments.length).toBe(20);
  });

  it("preserves classifications and assigns fallback reasons when Gemini response omits the reason field", async () => {
    const rawText = [
      "Halo cek suara satu dua tiga.",
      "Dosis captopril adalah 12.5 mg dua kali sehari.",
      "Penjelasan mekanisme kerja obat pada reseptor...",
    ].join("\n");

    const mockGemini = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        classifications: [
          { segmentId: "seg-001", classification: "noise", suspectedTranscriptionError: false },
          { segmentId: "seg-002", classification: "relevant", suspectedTranscriptionError: false },
          { segmentId: "seg-003", classification: "uncertain", suspectedTranscriptionError: true },
        ],
      }),
      usage: {
        isAvailable: true,
        promptTokenCount: 50,
        candidatesTokenCount: 20,
        totalTokenCount: 70,
        thoughtsTokenCount: 0,
      },
    });

    const result = await cleanTranscript(rawText, {
      apiKey: "test",
      geminiClient: mockGemini as any,
    });

    expect(result.segments).toHaveLength(3);

    // Segment 1: noise -> has fallback reason "Conversational noise", classification untouched
    const seg1 = result.segments.find((s) => s.segmentId === "seg-001")!;
    expect(seg1.classification).toBe("noise");
    expect(seg1.reason).toBe("Conversational noise");

    // Segment 2: relevant with clinical entities -> fallback reason indicates clinical entity, classification untouched
    const seg2 = result.segments.find((s) => s.segmentId === "seg-002")!;
    expect(seg2.classification).toBe("relevant");
    expect(seg2.reason).toBe("Clinical entity detected");

    // Segment 3: uncertain -> fallback reason indicates ambiguous/fragmented transcript, classification untouched
    const seg3 = result.segments.find((s) => s.segmentId === "seg-003")!;
    expect(seg3.classification).toBe("uncertain");
    expect(seg3.reason).toBe("Ambiguous or fragmented transcript");
  });
});


