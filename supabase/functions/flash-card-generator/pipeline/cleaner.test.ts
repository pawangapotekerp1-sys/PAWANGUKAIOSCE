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

  it("substantially reduces Gemini requests for a 300-segment lecture using default chunkSize 250 (making only 2 calls)", async () => {
    // Generate 300 lines of lecture transcript
    const lines = Array.from({ length: 300 }, (_, i) => `Kalimat kuliah farmasi ke-${i + 1} tentang terapi obat.`);
    const rawTranscript = lines.join("\n");

    let callCount = 0;
    const mockGemini = vi.fn().mockImplementation(() => {
      callCount += 1;
      return Promise.resolve({
        text: JSON.stringify({
          noiseSegmentIds: [],
          uncertainSegments: [],
        }),
        usage: {
          isAvailable: true,
          promptTokenCount: 150,
          candidatesTokenCount: 20,
          totalTokenCount: 170,
        },
      });
    });

    const result = await cleanTranscript(rawTranscript, {
      apiKey: "test",
      geminiClient: mockGemini as any,
    });

    // 300 segments divided into chunks of 250 -> exactly 2 Gemini calls
    expect(callCount).toBe(2);
    expect(result.segments).toHaveLength(300);
    // All segments defaulted to relevant
    expect(result.retainedSegments).toHaveLength(300);
    expect(result.droppedNoiseCount).toBe(0);
  });

  it("processes a 500-segment transcript in exactly 2 Gemini calls with default chunkSize 250", async () => {
    // Generate 500 lines of lecture transcript
    const lines = Array.from({ length: 500 }, (_, i) => `Kalimat kuliah farmasi ke-${i + 1} tentang terapi obat.`);
    const rawTranscript = lines.join("\n");

    let callCount = 0;
    const mockGemini = vi.fn().mockImplementation(() => {
      callCount += 1;
      return Promise.resolve({
        text: JSON.stringify({
          noiseSegmentIds: [],
          uncertainSegments: [],
        }),
        usage: {
          isAvailable: true,
          promptTokenCount: 220,
          candidatesTokenCount: 20,
          totalTokenCount: 240,
        },
      });
    });

    const result = await cleanTranscript(rawTranscript, {
      apiKey: "test",
      geminiClient: mockGemini as any,
    });

    // 500 segments divided into chunks of 250 -> exactly 2 Gemini calls
    expect(callCount).toBe(2);
    expect(result.segments).toHaveLength(500);
    expect(result.retainedSegments).toHaveLength(500);
    expect(result.droppedNoiseCount).toBe(0);
  });

  it("accurately parses sparse output: identifies noise IDs, uncertain objects, and defaults unlisted to relevant", async () => {
    const rawTranscript = [
      "Selamat pagi rekan-rekan apoteker semua.", // seg-001 -> unlisted relevant (or conversational if model lists it)
      "Halo cek satu dua mikrofon sudah terdengar ya.", // seg-002 -> noise
      "Pengobatan lini pertama gagal jantung sistolik adalah ACE inhibitor.", // seg-003 -> unlisted relevant
      "Jika pasien mengalami batuk kering persisten akibat ACEi...", // seg-004 -> uncertain (corrupted phrase)
      "Jangan lupa absen pada tautan berikut.", // seg-005 -> noise
    ].join("\n");

    const mockGemini = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        noiseSegmentIds: ["seg-002", "seg-005"],
        uncertainSegments: [
          {
            segmentId: "seg-004",
            reason: "Pernyataan klinis terpotong mid-sentence",
            suspectedTranscriptionError: true,
          },
        ],
      }),
      usage: {
        isAvailable: true,
        promptTokenCount: 100,
        candidatesTokenCount: 30,
        totalTokenCount: 130,
      },
    });

    const result = await cleanTranscript(rawTranscript, {
      apiKey: "test",
      geminiClient: mockGemini as any,
    });

    expect(result.segments).toHaveLength(5);

    // seg-001 and seg-003: unlisted -> default relevant
    const seg1 = result.segments.find((s) => s.segmentId === "seg-001")!;
    expect(seg1.classification).toBe("relevant");
    const seg3 = result.segments.find((s) => s.segmentId === "seg-003")!;
    expect(seg3.classification).toBe("relevant");

    // seg-002 and seg-005: in noiseSegmentIds -> noise
    const seg2 = result.segments.find((s) => s.segmentId === "seg-002")!;
    expect(seg2.classification).toBe("noise");
    const seg5 = result.segments.find((s) => s.segmentId === "seg-005")!;
    expect(seg5.classification).toBe("noise");

    // seg-004: in uncertainSegments -> uncertain with reason and error flag
    const seg4 = result.segments.find((s) => s.segmentId === "seg-004")!;
    expect(seg4.classification).toBe("uncertain");
    expect(seg4.reason).toBe("Pernyataan klinis terpotong mid-sentence");
    expect(seg4.suspectedTranscriptionError).toBe(true);

    // Retained segments = relevant + uncertain = 3
    expect(result.retainedSegments).toHaveLength(3);
    expect(result.droppedNoiseCount).toBe(2);
  });

  it("strictly enforces Clinical Entity Shield when a clinical entity segment is listed in noiseSegmentIds", async () => {
    const rawTranscript = [
      "Selamat pagi semua peserta kuliah.",
      "Berikan captopril 12.5 mg dua kali sehari untuk dosis awal hipertensi.", // has clinical entities
    ].join("\n");

    // Model erroneously classifies seg-002 as noise
    const mockGemini = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        noiseSegmentIds: ["seg-001", "seg-002"],
        uncertainSegments: [],
      }),
      usage: {
        isAvailable: true,
        promptTokenCount: 50,
        candidatesTokenCount: 15,
        totalTokenCount: 65,
      },
    });

    const result = await cleanTranscript(rawTranscript, {
      apiKey: "test",
      geminiClient: mockGemini as any,
    });

    // seg-001 has no clinical entity -> noise
    const seg1 = result.segments.find((s) => s.segmentId === "seg-001")!;
    expect(seg1.classification).toBe("noise");

    // seg-002 has clinical entity (captopril 12.5 mg) -> shielded to uncertain!
    const seg2 = result.segments.find((s) => s.segmentId === "seg-002")!;
    expect(seg2.classification).toBe("uncertain");
    expect(seg2.reason).toBe("Protected by Clinical Entity Shield");
  });

  it("stops adaptive subdivision at bounded depth (depth 2) when MAX_TOKENS error persists", async () => {
    const lines = Array.from({ length: 40 }, (_, i) => `Kalimat ke-${i + 1}`).join("\n");

    let callCount = 0;
    const mockGemini = vi.fn().mockImplementation(() => {
      callCount += 1;
      const err: any = new Error("Output truncated: MAX_TOKENS exceeded");
      err.code = "GEMINI_MAX_TOKENS";
      return Promise.reject(err);
    });

    await expect(() =>
      cleanTranscript(lines, {
        apiKey: "test",
        chunkSize: 40,
        geminiClient: mockGemini as any,
      }),
    ).rejects.toThrow(/MAX_TOKENS/i);

    // Subdivides:
    // depth 0: 1 call (40 items) -> fails
    // depth 1: first half (20 items) -> fails
    // depth 2: first quarter (10 items) -> not subdivided because 10 <= 15, throws
    // Total calls is small and bounded, definitively terminating without call stack exhaustion
    expect(callCount).toBeLessThanOrEqual(5);
  });

  it("caps total subdivision calls across the entire material to avoid quota explosion", async () => {
    // 3 chunks of 40 segments each = 120 lines
    const lines = Array.from({ length: 120 }, (_, i) => `Kalimat kuliah nomor ${i + 1}`).join("\n");

    let callCount = 0;
    const mockGemini = vi.fn().mockImplementation(() => {
      callCount += 1;
      const err: any = new Error("Output truncated: MAX_TOKENS exceeded");
      err.code = "GEMINI_MAX_TOKENS";
      return Promise.reject(err);
    });

    await expect(() =>
      cleanTranscript(lines, {
        apiKey: "test",
        chunkSize: 40,
        geminiClient: mockGemini as any,
      }),
    ).rejects.toThrow(/MAX_TOKENS/i);

    // Global subdivision cap (max 4 subdivision calls) ensures total calls across material stays small (<= 5)
    // Chunk 1 makes depth 0 (1 call) + depth 1 (2 calls) + depth 2 (2 calls) = 5 calls, exhausts budget, then throws
    expect(callCount).toBeLessThanOrEqual(5);
  });

  it("preserves partial chunk progress when a subsequent chunk exhausts subdivision budget", async () => {
    // 2 chunks: Chunk 1 succeeds, Chunk 2 fails with MAX_TOKENS and exhausts subdivision
    const lines = Array.from({ length: 80 }, (_, i) => `Kalimat materi ${i + 1}`).join("\n");
    let completedChunksCount = 0;
    let savedCompletedSegments: any[] = [];

    let callIndex = 0;
    const mockGemini = vi.fn().mockImplementation(() => {
      callIndex += 1;
      if (callIndex === 1) {
        // Chunk 1 succeeds
        return Promise.resolve({
          text: JSON.stringify({ noiseSegmentIds: [], uncertainSegments: [] }),
          usage: { isAvailable: false },
        });
      }
      // Subsequent calls fail with MAX_TOKENS
      const err: any = new Error("Output truncated: MAX_TOKENS exceeded");
      err.code = "GEMINI_MAX_TOKENS";
      return Promise.reject(err);
    });

    await expect(() =>
      cleanTranscript(lines, {
        apiKey: "test",
        chunkSize: 40,
        geminiClient: mockGemini as any,
        onChunkComplete: async (completedSegments) => {
          completedChunksCount += 1;
          savedCompletedSegments = completedSegments;
        },
      }),
    ).rejects.toThrow(/MAX_TOKENS/i);

    // Chunk 1 was saved via onChunkComplete
    expect(completedChunksCount).toBe(1);
    expect(savedCompletedSegments.length).toBeGreaterThanOrEqual(40);
  });
});

describe("cleanTranscript - bounded maxChunksPerRun", () => {
  it("pauses after maxChunksPerRun newly processed chunks and marks isComplete=false until final batch", async () => {
    const lines = Array.from(
      { length: 6 },
      (_, idx) => `Kalimat farmakoterapi nomor ${idx + 1} tentang dosis klinis.`,
    );
    const rawTranscript = lines.join("\n");

    const mockGemini = vi.fn().mockImplementation(async () => ({
      text: JSON.stringify({
        noiseSegmentIds: [],
        uncertainSegments: [],
      }),
      usage: {
        isAvailable: true,
        promptTokenCount: 40,
        candidatesTokenCount: 10,
        totalTokenCount: 50,
      },
    }));

    // 6 segments with chunkSize=2, chunkOverlap=0 -> 3 chunks total.
    // Batch 1: maxChunksPerRun=2 -> processes chunks 1 & 2 (4 segments), pauses with isComplete=false
    const batch1 = await cleanTranscript(rawTranscript, {
      apiKey: "test-key",
      chunkSize: 2,
      chunkOverlap: 0,
      maxChunksPerRun: 2,
      geminiClient: mockGemini,
    });

    expect(mockGemini).toHaveBeenCalledTimes(2);
    expect(batch1.isComplete).toBe(false);
    expect(batch1.totalSegmentsCount).toBe(6);
    expect(batch1.segments).toHaveLength(4);
    expect(batch1.retainedSegments).toHaveLength(4);

    // Batch 2: resume with cachedSegments from batch1 -> skips chunks 1 & 2, processes chunk 3, completes with isComplete=true
    const batch2 = await cleanTranscript(rawTranscript, {
      apiKey: "test-key",
      chunkSize: 2,
      chunkOverlap: 0,
      maxChunksPerRun: 2,
      cachedSegments: batch1.segments,
      geminiClient: mockGemini,
    });

    expect(mockGemini).toHaveBeenCalledTimes(3);
    expect(batch2.isComplete).toBe(true);
    expect(batch2.totalSegmentsCount).toBe(6);
    expect(batch2.segments).toHaveLength(6);
    expect(batch2.retainedSegments).toHaveLength(6);
  });
});

describe("Zoom ASR Transcript Optimization, Pharmaceutics Entities & Wall-Clock Budget", () => {
  it("strips generic Zoom participant speaker prefixes at line start while preserving clinical headings", () => {
    const raw = [
      "00:18:10.000 --> 00:18:16.000",
      "Pawang_Royhan: Halo teman-teman semua, malam ini kita bahas sediaan solid.",
      "Eneng Sipa Pujia: Kak izin bertanya tentang granulasi basah.",
      "Dosis: Paracetamol 500 mg diberikan 3x sehari.",
      "Kontraindikasi: Pasien dengan gangguan fungsi hati berat.",
      "Catatan: Uji friabilitas harus kurang dari 1%.",
      "Paracetamol: Dosis dewasa 500 mg.",
      "Granulasi basah: menggunakan pengikat.",
    ].join("\n");

    const normalized = normalizeDeterministicTranscript(raw);

    expect(normalized).not.toContain("Pawang_Royhan:");
    expect(normalized).not.toContain("Eneng Sipa Pujia:");
    expect(normalized).toContain("Halo teman-teman semua, malam ini kita bahas sediaan solid.");
    expect(normalized).toContain("Kak izin bertanya tentang granulasi basah.");
    expect(normalized).toContain("Dosis: Paracetamol 500 mg diberikan 3x sehari.");
    expect(normalized).toContain("Kontraindikasi: Pasien dengan gangguan fungsi hati berat.");
    expect(normalized).toContain("Catatan: Uji friabilitas harus kurang dari 1%.");
    expect(normalized).toContain("Paracetamol: Dosis dewasa 500 mg.");
    expect(normalized).toContain("Granulasi basah: menggunakan pengikat.");
  });

  it("coalesces short non-ellipsis ASR sentence fragments on the same line when clinical entity status matches, but never coalesces across ellipses", () => {
    // Same line with short Zoom ASR fragments (no ellipses, same entity status) -> coalesced
    const zoomLine = "Assalamualaikum. Warahmatullahi. Wabarakatuh. Selamat malam teman-teman semua.";
    const zoomSegments = segmentTranscript(zoomLine);
    expect(zoomSegments.length).toBe(1);
    expect(zoomSegments[0].normalizedText).toBe(
      "Assalamualaikum. Warahmatullahi. Wabarakatuh. Selamat malam teman-teman semua.",
    );

    // Ellipsis line must NOT coalesce across '...'
    const ellipsisLine = "Tes mic satu dua... Dosisnya 500 mg tapi...\nBaris kedua pasien minum captopril.";
    const ellipsisSegments = segmentTranscript(ellipsisLine);
    expect(ellipsisSegments.length).toBe(3);
    expect(ellipsisSegments[0].normalizedText).toBe("Tes mic satu dua...");
    expect(ellipsisSegments[1].normalizedText).toBe("Dosisnya 500 mg tapi...");
    expect(ellipsisSegments[2].normalizedText).toBe("Baris kedua pasien minum captopril.");
  });

  it("detects Pharmaceutics / Sediaan Solid entities and spoken dosage units in scanClinicalEntities", () => {
    const solidText =
      "Pada metode granulasi basah, digunakan pengikat mucilago amili dan penghancur amprotab, lalu diuji friabilitas kurang dari satu persen serta waktu hancur.";
    const scan = scanClinicalEntities(solidText);

    expect(scan.hasClinicalEntities).toBe(true);
    expect(scan.matchedEntities.some((e) => /granulasi basah/i.test(e))).toBe(true);
    expect(scan.matchedEntities.some((e) => /pengikat/i.test(e))).toBe(true);
    expect(scan.matchedEntities.some((e) => /friabilitas/i.test(e))).toBe(true);
    expect(scan.matchedEntities.some((e) => /satu persen/i.test(e))).toBe(true);

    const defectText = "Masalah pencetakan tablet meliputi capping, laminating, mottling, dan sticking pada punch.";
    const defectScan = scanClinicalEntities(defectText);
    expect(defectScan.hasClinicalEntities).toBe(true);
    expect(defectScan.matchedEntities).toEqual(
      expect.arrayContaining(["capping", "laminating", "mottling", "sticking"]),
    );

    const spokenScan = scanClinicalEntities("lima ratus miligram paracetamol");
    expect(spokenScan.hasClinicalEntities).toBe(true);
    expect(spokenScan.matchedEntities).toContain("lima ratus miligram");

    const tensScan = scanClinicalEntities("diberikan dua puluh lima miligram dan dua ratus miligram");
    expect(tensScan.hasClinicalEntities).toBe(true);
    expect(tensScan.matchedEntities).toContain("dua puluh lima miligram");
    expect(tensScan.matchedEntities).toContain("dua ratus miligram");

    const casualText = "Halo teman-teman semua, cek suara apakah jelas di layar masing-masing?";
    expect(scanClinicalEntities(casualText).hasClinicalEntities).toBe(false);
  });

  it("stops early with isComplete=false when maxExecutionMs wall-clock budget is reached after completing at least 1 chunk", async () => {
    const lines = Array.from(
      { length: 6 },
      (_, idx) => `Segmen kuliah sediaan solid nomor ${idx + 1} tentang granulasi basah dan kempa langsung.`,
    );
    const rawTranscript = lines.join("\n");

    const mockClient = vi.fn().mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 25));
      return {
        text: JSON.stringify({
          noiseSegmentIds: [],
          uncertainSegments: [],
        }),
        usage: { isAvailable: true, promptTokenCount: 20, candidatesTokenCount: 5, totalTokenCount: 25 },
      };
    });

    const result = await cleanTranscript(rawTranscript, {
      chunkSize: 2,
      maxChunksPerRun: 10,
      maxExecutionMs: 15,
      geminiClient: mockClient,
    });

    expect(mockClient).toHaveBeenCalledTimes(1);
    expect(result.isComplete).toBe(false);
    expect(result.segments).toHaveLength(2);
    expect(result.totalSegmentsCount).toBe(6);
  });

  it("sends generationConfig.response_mime_type='application/json' in generateGeminiTextWithUsage even when responseSchema is omitted", async () => {
    vi.stubGlobal("Deno", {
      env: {
        get(name: string) {
          const values: Record<string, string> = {
            SUPABASE_URL: "http://127.0.0.1:54321",
            SUPABASE_SERVICE_ROLE_KEY: "service-role",
            SUPABASE_ANON_KEY: "anon-key",
          };
          return values[name];
        },
      },
    });
    const { generateGeminiTextWithUsage } = await import("../../_shared/gemini-client.ts");
    let capturedBody: any = null;

    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ noiseSegmentIds: [], uncertainSegments: [] }) }],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      await generateGeminiTextWithUsage({
        apiKey: "test-key",
        model: "gemini-3.8-flash",
        prompt: "Classify segments",
        responseMimeType: "application/json",
      });

      expect(capturedBody).not.toBeNull();
      expect(capturedBody.generationConfig?.response_mime_type).toBe("application/json");
      expect(capturedBody.generationConfig?.response_schema).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("defaults generationConfig.response_mime_type to 'application/json' when responseSchema is provided without responseMimeType", async () => {
    vi.stubGlobal("Deno", {
      env: {
        get(name: string) {
          const values: Record<string, string> = {
            SUPABASE_URL: "http://127.0.0.1:54321",
            SUPABASE_SERVICE_ROLE_KEY: "service-role",
            SUPABASE_ANON_KEY: "anon-key",
          };
          return values[name];
        },
      },
    });
    const { generateGeminiTextWithUsage } = await import("../../_shared/gemini-client.ts");
    let capturedBody: any = null;

    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ ok: true }) }],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      await generateGeminiTextWithUsage({
        apiKey: "test-key",
        model: "gemini-3.8-flash",
        prompt: "Generate with schema",
        responseSchema: {
          type: "OBJECT",
          properties: { ok: { type: "BOOLEAN" } },
        },
      });

      expect(capturedBody).not.toBeNull();
      expect(capturedBody.generationConfig?.response_mime_type).toBe("application/json");
      expect(capturedBody.generationConfig?.response_schema).toBeDefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});




