import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import {
  assertTrustedReferenceUrl,
  assertQuestionTopicProximity,
  buildQuestionGeneratorPrompt,
  createQuestionGeneratorResponseSchema,
  createQuestionGeneratorSchema,
  isTrustedReferenceHost,
  splitQuestionGenerationCount,
  validateEditableGeneratedQuestionItem,
  validateGeneratedQuestionItems,
} from "./question-generator";

describe("splitQuestionGenerationCount", () => {
  test("uses a Deno-compatible zod import for edge runtime", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./question-generator.ts"), "utf8");

    expect(source).toContain('from "npm:zod"');
  });

  test("balances even target counts across the three fresh variation modes", () => {
    expect(splitQuestionGenerationCount(6)).toEqual({
      newCaseSameConceptCount: 2,
      differentTrapSameObjectiveCount: 2,
      reverseReasoningCount: 2,
    });
  });

  test("keeps odd target counts within one item difference across the three fresh variation modes", () => {
    expect(splitQuestionGenerationCount(5)).toEqual({
      newCaseSameConceptCount: 2,
      differentTrapSameObjectiveCount: 2,
      reverseReasoningCount: 1,
    });
  });
});

describe("buildQuestionGeneratorPrompt", () => {
  test("locks output to the same topic neighborhood, uses the three new modes, and demands one trusted https link per item from the explicit allowlist", () => {
    const prompt = buildQuestionGeneratorPrompt({
      newCaseSameConceptCount: 1,
      differentTrapSameObjectiveCount: 1,
      reverseReasoningCount: 1,
      references: [
        {
          stem: "Pasien hipertensi dengan gagal ginjal kronik membutuhkan penyesuaian terapi.",
          correctOptionKey: "B",
          explanationText: "ACE inhibitor dipilih karena perlindungan ginjal.",
          options: {
            A: "Amlodipin",
            B: "Lisinopril",
            C: "Parasetamol",
            D: "Metformin",
            E: "Omeprazol",
          },
        },
      ],
      targetQuestionCount: 3,
    } as any);

    expect(prompt).toMatch(/topik yang sama|topic neighborhood|learning objective/i);
    expect(prompt).toMatch(/new_case_same_concept/i);
    expect(prompt).toMatch(/different_trap_same_objective/i);
    expect(prompt).toMatch(/reverse_reasoning/i);
    expect(prompt).toMatch(/tepat satu|exactly one/i);
    expect(prompt).toMatch(/https/i);
    expect(prompt).toMatch(/jangan.*doi polos|do not output bare doi/i);
    expect(prompt).toMatch(/jangan.*nama buku|book-only|book titles/i);
    expect(prompt).toMatch(/hanya.*output|trusted link.*output|only.*output/i);
    expect(prompt).toMatch(/pubmed\.ncbi\.nlm\.nih\.gov/i);
    expect(prompt).toMatch(/cochranelibrary\.com/i);
    expect(prompt).toMatch(/who\.int/i);
    expect(prompt).toMatch(/kdigo\.org/i);
    expect(prompt).toMatch(/escardio\.org/i);
    expect(prompt).toMatch(/kemkes\.go\.id/i);
  });
});

describe("createQuestionGeneratorResponseSchema", () => {
  test("requires variationMode and a structured reference object", () => {
    expect(createQuestionGeneratorResponseSchema(2)).toMatchObject({
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "object",
        properties: {
          variationMode: {
            type: "string",
            enum: [
              "new_case_same_concept",
              "different_trap_same_objective",
              "reverse_reasoning",
            ],
          },
          reference: {
            type: "object",
            properties: {
              label: { type: "string" },
              url: { type: "string" },
            },
            required: ["label", "url"],
          },
        },
        required: [
          "stem",
          "options",
          "correctOptionKey",
          "explanationText",
          "variationMode",
          "reference",
        ],
      },
    });
  });
});

describe("validateGeneratedQuestionItems", () => {
  test("accepts only the three approved variation modes", () => {
    expect(() =>
      validateGeneratedQuestionItems([
        {
          stem: "Soal 1",
          correctOptionKey: "A",
          explanationText: "Pembahasan",
          variationMode: "copy_concept",
          reference: {
            label: "KDIGO 2024 guideline",
            url: "https://kdigo.org/guidelines/ckd",
          },
          options: {
            A: "Pilihan A",
            B: "Pilihan B",
            C: "Pilihan C",
            D: "Pilihan D",
            E: "Pilihan E",
          },
        },
      ], createQuestionGeneratorSchema(1)),
    ).toThrow(/variationMode|mode/i);
  });

  test("requires each item to include reference.label and reference.url", () => {
    expect(() =>
      validateGeneratedQuestionItems([
        {
          stem: "Soal 1",
          correctOptionKey: "A",
          explanationText: "Pembahasan",
          variationMode: "new_case_same_concept",
          options: {
            A: "Pilihan A",
            B: "Pilihan B",
            C: "Pilihan C",
            D: "Pilihan D",
            E: "Pilihan E",
          },
        },
      ], createQuestionGeneratorSchema(1)),
    ).toThrow(/reference|label|url/i);
  });

  test("defers reference url format enforcement to the strict reference gate", () => {
    expect(validateGeneratedQuestionItems([
      {
        stem: "Soal 1",
        correctOptionKey: "A",
        explanationText: "Pembahasan",
        variationMode: "different_trap_same_objective",
        reference: {
          label: "WHO guideline",
          url: "http://www.who.int/publications/example",
        },
        options: {
          A: "Pilihan A",
          B: "Pilihan B",
          C: "Pilihan C",
          D: "Pilihan D",
          E: "Pilihan E",
        },
      },
    ], createQuestionGeneratorSchema(1))).toHaveLength(1);
  });

  test("accepts generated items with the new structured trusted reference shape", () => {
    expect(validateGeneratedQuestionItems([
      {
        stem: "Soal fresh dengan kasus klinis baru",
        correctOptionKey: "B",
        explanationText: "ACE inhibitor dipilih karena proteksi ginjal.",
        variationMode: "new_case_same_concept",
        reference: {
          label: "KDIGO CKD guideline",
          url: "https://kdigo.org/guidelines/ckd/",
        },
        options: {
          A: "Amlodipin",
          B: "Lisinopril",
          C: "Parasetamol",
          D: "Metformin",
          E: "Omeprazol",
        },
      },
    ], createQuestionGeneratorSchema(1))).toHaveLength(1);
  });

  test("defers trusted reference url policy to the edge strict gate after shape validation passes", () => {
    expect(validateGeneratedQuestionItems([
      {
        stem: "Soal dengan link yang nanti akan ditolak strict gate",
        correctOptionKey: "B",
        explanationText: "Pembahasan tetap ada.",
        variationMode: "different_trap_same_objective",
        reference: {
          label: "Blog acak",
          url: "https://example.org/post",
        },
        options: {
          A: "Amlodipin",
          B: "Lisinopril",
          C: "Parasetamol",
          D: "Metformin",
          E: "Omeprazol",
        },
      },
    ], createQuestionGeneratorSchema(1))).toHaveLength(1);
  });
});

describe("validateEditableGeneratedQuestionItem", () => {
  test("accepts legacy draft edits that keep a valid question shape even when historical batches lack stored reference metadata", () => {
    expect(validateEditableGeneratedQuestionItem({
      stem: "Soal hasil edit mentor tetap lengkap.",
      correctOptionKey: "B",
      explanationText: "Pembahasan hasil edit mentor tetap tersedia.",
      variationMode: "new_case_same_concept",
      options: {
        A: "Pilihan A",
        B: "Pilihan B",
        C: "Pilihan C",
        D: "Pilihan D",
        E: "Pilihan E",
      },
    })).toMatchObject({
      variationMode: "new_case_same_concept",
      correctOptionKey: "B",
    });
  });
});

describe("trusted reference helpers", () => {
  test("accepts exact approved hosts only", () => {
    expect(isTrustedReferenceHost("pubmed.ncbi.nlm.nih.gov")).toBe(true);
    expect(isTrustedReferenceHost("www.who.int")).toBe(true);
    expect(isTrustedReferenceHost("kdigo.org")).toBe(true);
  });

  test("rejects unknown hosts and unapproved subdomains", () => {
    expect(isTrustedReferenceHost("example.org")).toBe(false);
    expect(isTrustedReferenceHost("clinicaltrials.gov")).toBe(false);
    expect(isTrustedReferenceHost("subdomain.kdigo.org")).toBe(false);
  });

  test("accepts one exact https URL string", () => {
    expect(assertTrustedReferenceUrl("https://pubmed.ncbi.nlm.nih.gov/40012345/").hostname).toBe(
      "pubmed.ncbi.nlm.nih.gov",
    );
  });

  test("rejects malformed URLs and multiple links in one reference field", () => {
    expect(() => assertTrustedReferenceUrl("bukan-url")).toThrow(/url|link/i);
    expect(() =>
      assertTrustedReferenceUrl(
        "https://pubmed.ncbi.nlm.nih.gov/40012345/ https://www.who.int/publications/example",
      )
    ).toThrow(/satu|one/i);
  });
});

describe("assertQuestionTopicProximity", () => {
  test("rejects generated items that clearly drift away from the reference topic", () => {
    expect(() =>
      assertQuestionTopicProximity({
        references: [
          {
            stem: "Pasien hipertensi dengan CKD membutuhkan pemilihan antihipertensi yang melindungi ginjal.",
            correctOptionKey: "B",
            explanationText: "ACE inhibitor dipilih karena proteksi ginjal.",
            options: {
              A: "Amlodipin",
              B: "Lisinopril",
              C: "Parasetamol",
              D: "Metformin",
              E: "Omeprazol",
            },
          },
        ],
        generatedItems: [
          {
            stem: "Antibiotik lini pertama untuk tinea kapitis pada anak adalah?",
            correctOptionKey: "A",
            explanationText: "Griseofulvin dipakai untuk infeksi jamur kulit kepala.",
            variationMode: "reverse_reasoning",
            reference: {
              label: "WHO tinea document",
              url: "https://www.who.int/publications/example",
            },
            options: {
              A: "Griseofulvin",
              B: "Lisinopril",
              C: "Valsartan",
              D: "Amlodipin",
              E: "Furosemid",
            },
          },
        ],
      }),
    ).toThrow(/terlalu jauh dari topik referensi/i);
  });

  test("ignores generic clinical wording and still rejects edits that change the core topic", () => {
    expect(() =>
      assertQuestionTopicProximity({
        references: [
          {
            stem: "Seorang anak laki-laki 8 tahun datang dengan lesi bersisik di kulit kepala disertai rambut mudah patah. Pemeriksaan KOH menunjukkan hifa. Terapi paling tepat adalah?",
            correctOptionKey: "B",
            explanationText: "Tinea capitis membutuhkan terapi sistemik karena infeksi mengenai folikel rambut; griseofulvin oral adalah terapi klasik yang tepat.",
            options: {
              A: "Ketokonazol topikal saja",
              B: "Griseofulvin oral",
              C: "Asiklovir oral",
              D: "Mupirosin topikal",
              E: "Hidrokortison topikal",
            },
          },
        ],
        generatedItems: [
          {
            stem: "Seorang pria 60 tahun datang dengan nyeri dada menjalar ke lengan kiri dan elevasi segmen ST pada EKG. Diagnosis paling mungkin adalah?",
            correctOptionKey: "B",
            explanationText: "Nyeri dada tipikal dengan elevasi ST paling sesuai dengan infark miokard akut.",
            variationMode: "different_trap_same_objective",
            reference: {
              label: "ESC ACS guideline",
              url: "https://www.escardio.org/Guidelines/example",
            },
            options: {
              A: "GERD",
              B: "Infark miokard akut",
              C: "Kolesistitis",
              D: "Pankreatitis akut",
              E: "Costochondritis",
            },
          },
        ],
      }),
    ).toThrow(/terlalu jauh dari topik referensi/i);
  });
});
