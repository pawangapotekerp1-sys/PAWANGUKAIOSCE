import { describe, expect, it } from "vitest";
import {
  STANDARD_BLOCKS,
  findBlockDefinition,
  getBlockQuestionCount,
  getUniqueTopicsForBlock,
  isQuestionInBlock,
  filterBlockQuestions,
  type BlockDefinition,
} from "./questions-page-blocks";

describe("STANDARD_BLOCKS", () => {
  it("defines exactly 3 standard blocks with correct properties", () => {
    expect(STANDARD_BLOCKS).toHaveLength(3);

    const [clinical, pharmaceutical, social] = STANDARD_BLOCKS;

    expect(clinical).toEqual({
      id: "clinical-science",
      name: "Clinical Science",
      description:
        "Farmakoterapi, evaluasi kasus klinis, interaksi obat, dan interpretasi laboratorium klinis.",
      colorTheme: "teal",
      matchNames: ["clinical science"],
    });

    expect(pharmaceutical).toEqual({
      id: "pharmaceutical-science",
      name: "Pharmaceutical Science",
      description:
        "Formulasi teknologi sediaan padat, cair, dan steril, biofarmasetika, stabilitas, serta analisis farmasi.",
      colorTheme: "indigo",
      matchNames: ["pharmaceutical science"],
    });

    expect(social).toEqual({
      id: "social-behavioural-administration",
      name: "Social Behavioural Administration of Pharmacy",
      description:
        "Manajemen farmasi, regulasi & perundang-undangan farmasi, farmakoekonomi, etika, dan komunikasi profesi.",
      colorTheme: "amber",
      matchNames: [
        "social behavioural administration of pharmacy",
        "social, behavioral & administrative pharmacy",
        "social behavioural administrative pharmacy",
        "social behavioral administrative pharmacy",
        "social, behavioral and administrative pharmacy",
      ],
    });
  });
});

describe("findBlockDefinition", () => {
  it("finds block by id", () => {
    expect(findBlockDefinition("clinical-science")?.name).toBe("Clinical Science");
    expect(findBlockDefinition("pharmaceutical-science")?.name).toBe("Pharmaceutical Science");
    expect(findBlockDefinition("social-behavioural-administration")?.name).toBe(
      "Social Behavioural Administration of Pharmacy"
    );
  });

  it("finds block case-insensitively and with trimmed whitespace", () => {
    expect(findBlockDefinition("  CLINICAL-SCIENCE  ")?.id).toBe("clinical-science");
    expect(findBlockDefinition("pharmaceutical science")?.id).toBe("pharmaceutical-science");
  });

  it("finds block by matchNames aliases", () => {
    expect(
      findBlockDefinition("social, behavioral & administrative pharmacy")?.id
    ).toBe("social-behavioural-administration");
    expect(
      findBlockDefinition("Social Behavioral Administrative Pharmacy")?.id
    ).toBe("social-behavioural-administration");
  });

  it("returns null for non-matching, empty, or undefined input", () => {
    expect(findBlockDefinition(null)).toBeNull();
    expect(findBlockDefinition(undefined)).toBeNull();
    expect(findBlockDefinition("")).toBeNull();
    expect(findBlockDefinition("   ")).toBeNull();
    expect(findBlockDefinition("non-existent-block")).toBeNull();
  });
});

describe("isQuestionInBlock", () => {
  const clinicalBlock = STANDARD_BLOCKS[0];
  const sbaBlock = STANDARD_BLOCKS[2];

  it("returns true for matching blockName (case-insensitive and trimmed)", () => {
    expect(
      isQuestionInBlock({ blockName: "Clinical Science" }, clinicalBlock)
    ).toBe(true);
    expect(
      isQuestionInBlock({ blockName: "  clinical science  " }, clinicalBlock)
    ).toBe(true);
  });

  it("returns true for matching alias in matchNames", () => {
    expect(
      isQuestionInBlock(
        { blockName: "social, behavioral & administrative pharmacy" },
        sbaBlock
      )
    ).toBe(true);
    expect(
      isQuestionInBlock(
        { blockName: "Social Behavioral Administrative Pharmacy" },
        sbaBlock
      )
    ).toBe(true);
  });

  it("returns false for non-matching blockName", () => {
    expect(
      isQuestionInBlock({ blockName: "Pharmaceutical Science" }, clinicalBlock)
    ).toBe(false);
  });

  it("returns false for null, undefined, or empty blockName", () => {
    expect(isQuestionInBlock({ blockName: null }, clinicalBlock)).toBe(false);
    expect(isQuestionInBlock({ blockName: "" }, clinicalBlock)).toBe(false);
    expect(isQuestionInBlock({ blockName: "   " }, clinicalBlock)).toBe(false);
  });
});

describe("getBlockQuestionCount", () => {
  const clinicalBlock = STANDARD_BLOCKS[0];
  const questions = [
    { blockName: "Clinical Science" },
    { blockName: "clinical science" },
    { blockName: "Pharmaceutical Science" },
    { blockName: null },
    { blockName: "Social Behavioural Administration of Pharmacy" },
  ];

  it("counts questions belonging to the block", () => {
    expect(getBlockQuestionCount(questions, clinicalBlock)).toBe(2);
  });

  it("returns 0 if no questions match", () => {
    expect(
      getBlockQuestionCount(
        [{ blockName: "Other" }, { blockName: null }],
        clinicalBlock
      )
    ).toBe(0);
  });
});

describe("getUniqueTopicsForBlock", () => {
  const clinicalBlock = STANDARD_BLOCKS[0];
  const questions = [
    { blockName: "Clinical Science", topicName: "Kardiovaskular" },
    { blockName: "Clinical Science", topicName: "Endokrin" },
    { blockName: "clinical science", topicName: "Kardiovaskular" }, // Duplicate
    { blockName: "Clinical Science", topicName: "  Pernapasan  " }, // Needs trimming
    { blockName: "Clinical Science", topicName: null }, // Null topic ignored
    { blockName: "Clinical Science", topicName: "   " }, // Empty whitespace ignored
    { blockName: "Pharmaceutical Science", topicName: "Teknologi Sediaan Padat" }, // Different block
  ];

  it("returns unique sorted topic names for questions matching the block", () => {
    const topics = getUniqueTopicsForBlock(questions, clinicalBlock);
    // Should be sorted A-Z in id-ID locale: Endokrin, Kardiovaskular, Pernapasan
    expect(topics).toEqual(["Endokrin", "Kardiovaskular", "Pernapasan"]);
  });

  it("returns empty array if no topics are present in block", () => {
    const emptyQuestions = [
      { blockName: "Clinical Science", topicName: null },
      { blockName: "Clinical Science", topicName: "" },
    ];
    expect(getUniqueTopicsForBlock(emptyQuestions, clinicalBlock)).toEqual([]);
  });
});

describe("filterBlockQuestions", () => {
  const clinicalBlock = STANDARD_BLOCKS[0];
  const sbaBlock = STANDARD_BLOCKS[2];

  const questions = [
    { id: "1", blockName: "Clinical Science", topicName: "Kardiovaskular" },
    { id: "2", blockName: "Clinical Science", topicName: "Endokrin" },
    { id: "3", blockName: "Clinical Science", topicName: null },
    { id: "4", blockName: "Clinical Science", topicName: "   " },
    { id: "5", blockName: "Pharmaceutical Science", topicName: "Kardiovaskular" },
    { id: "6", blockName: "Social Behavioural Administration of Pharmacy", topicName: "Manajemen" },
  ];

  it("returns all questions in block when topicFilter is 'all', empty, or undefined", () => {
    const resAll = filterBlockQuestions(questions, clinicalBlock, "all");
    expect(resAll.map((q) => q.id)).toEqual(["1", "2", "3", "4"]);

    const resEmpty = filterBlockQuestions(questions, clinicalBlock, "");
    expect(resEmpty.map((q) => q.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("returns only questions with unassigned topics when topicFilter is 'unassigned'", () => {
    const resUnassigned = filterBlockQuestions(questions, clinicalBlock, "unassigned");
    expect(resUnassigned.map((q) => q.id)).toEqual(["3", "4"]);
  });

  it("strictly filters questions matching the selected topic", () => {
    const resKardio = filterBlockQuestions(questions, clinicalBlock, "Kardiovaskular");
    expect(resKardio.map((q) => q.id)).toEqual(["1"]);

    // Case-insensitive & trimmed matching
    const resKardioCase = filterBlockQuestions(questions, clinicalBlock, "  kardiovaskular  ");
    expect(resKardioCase.map((q) => q.id)).toEqual(["1"]);
  });

  it("excludes questions from other blocks even if they share the same topic", () => {
    const resKardio = filterBlockQuestions(questions, clinicalBlock, "Kardiovaskular");
    // Question 5 has topic "Kardiovaskular" but block "Pharmaceutical Science" -> must NOT be included
    expect(resKardio.some((q) => q.id === "5")).toBe(false);
  });

  it("returns empty array when topic filter matches nothing in block", () => {
    const resNone = filterBlockQuestions(questions, clinicalBlock, "Non-existent Topic");
    expect(resNone).toEqual([]);
  });
});
