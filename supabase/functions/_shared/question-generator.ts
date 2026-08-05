import { z } from "npm:zod";

const optionKeys = ["A", "B", "C", "D", "E"] as const;
const variationModes = [
  "new_case_same_concept",
  "different_trap_same_objective",
  "reverse_reasoning",
] as const;
const trustedReferenceHosts = new Set([
  "pubmed.ncbi.nlm.nih.gov",
  "ncbi.nlm.nih.gov",
  "www.ncbi.nlm.nih.gov",
  "cochranelibrary.com",
  "www.cochranelibrary.com",
  "who.int",
  "www.who.int",
  "kdigo.org",
  "www.kdigo.org",
  "escardio.org",
  "www.escardio.org",
  "perki.id",
  "papdi.or.id",
  "kemkes.go.id",
  "www.kemkes.go.id",
  "jdih.kemkes.go.id",
  "peraturan.bpk.go.id",
]);
const trustedReferenceHostList = Array.from(trustedReferenceHosts).sort();

const optionSetSchema = z.object({
  A: z.string().trim().min(1),
  B: z.string().trim().min(1),
  C: z.string().trim().min(1),
  D: z.string().trim().min(1),
  E: z.string().trim().min(1),
});

const generatedReferenceSchema = z.object({
  label: z.string().trim().min(1),
  url: z.string().trim().min(1),
});

const generatedItemSchema = z.object({
  stem: z.string().trim().min(1),
  options: optionSetSchema,
  correctOptionKey: z.enum(optionKeys),
  explanationText: z.string(),
  variationMode: z.enum(variationModes),
  reference: generatedReferenceSchema,
});
const editableGeneratedItemSchema = generatedItemSchema.omit({
  reference: true,
});

export type QuestionGeneratorReference = {
  stem: string;
  correctOptionKey: typeof optionKeys[number];
  explanationText: string;
  options: Record<typeof optionKeys[number], string>;
};

export type GeneratedQuestionItem = z.infer<typeof generatedItemSchema>;
export type EditableGeneratedQuestionItem = z.infer<typeof editableGeneratedItemSchema>;
export type ParsedExplanationBibliography = {
  explanationBody: string;
  bibliographyBlock: string | null;
  bibliographyLabel: "Pustaka" | "Referensi" | "Sumber" | null;
};

const ignoredTopicTerms = new Set([
  "yang",
  "dan",
  "untuk",
  "pada",
  "dengan",
  "atau",
  "karena",
  "pasien",
  "adalah",
  "dari",
  "terapi",
  "obat",
  "soal",
  "pembahasan",
  "seorang",
  "datang",
  "paling",
  "tepat",
  "mungkin",
  "diagnosis",
  "klasik",
  "anak",
  "pria",
  "wanita",
  "laki",
  "perempuan",
  "nyeri",
  "akut",
  "kronik",
  "sesuai",
  "pemeriksaan",
  "menunjukkan",
  "diberikan",
  "mengalami",
  "terhadap",
  "berikut",
  "melalui",
  "dapat",
  "harus",
  "tahun",
  "bulan",
]);

export function splitQuestionGenerationCount(targetQuestionCount: number) {
  const baseCount = Math.floor(targetQuestionCount / variationModes.length);
  const remainder = targetQuestionCount % variationModes.length;

  return {
    newCaseSameConceptCount: baseCount + (remainder > 0 ? 1 : 0),
    differentTrapSameObjectiveCount: baseCount + (remainder > 1 ? 1 : 0),
    reverseReasoningCount: baseCount,
  };
}

export function buildQuestionGeneratorPrompt({
  newCaseSameConceptCount,
  differentTrapSameObjectiveCount,
  reverseReasoningCount,
  references,
  targetQuestionCount,
}: {
  newCaseSameConceptCount: number;
  differentTrapSameObjectiveCount: number;
  reverseReasoningCount: number;
  references: QuestionGeneratorReference[];
  targetQuestionCount: number;
}) {
  const referenceBlock = references.map((reference, index) =>
    [
      `Referensi ${index + 1}`,
      `Stem: ${reference.stem}`,
      `Opsi A: ${reference.options.A}`,
      `Opsi B: ${reference.options.B}`,
      `Opsi C: ${reference.options.C}`,
      `Opsi D: ${reference.options.D}`,
      `Opsi E: ${reference.options.E}`,
      `Kunci: ${reference.correctOptionKey}`,
      `Pembahasan: ${reference.explanationText}`,
    ].join("\n")).join("\n\n");

  return [
    "You are an expert instructional designer and pharmacy board exam question generator operating with strict fidelity to provided references.",
    "CRITICAL INSTRUCTION: ALL generated content (stems, options, explanations) MUST be written in formal Indonesian (Bahasa Indonesia). Do NOT generate the content in English.",
    `Generate exactly ${targetQuestionCount} new questions comprising ${newCaseSameConceptCount} 'new_case_same_concept', ${differentTrapSameObjectiveCount} 'different_trap_same_objective', and ${reverseReasoningCount} 'reverse_reasoning'.`,
    "Maintain the exact topic neighborhood, core concepts, learning objectives, difficulty level, and distractor quality of the references.",
    "Do not drift into alternative disease families, therapeutic targets, or concept domains absent from the references. All outputs must remain strictly within the provided conceptual boundary.",
    "Use the input references solely to comprehend the topic, core concept, and question patterns. The input references are not required to be validated URLs.",
    "Each question MUST contain exactly five options (A-E), one correct answer, a consistent explanation, one approved variationMode, and exactly one primary reference.url.",
    "Provide only ONE primary HTTPS link per question in the OUTPUT. Do not output bare DOIs, book titles without links, ISBNs, or multiple links per question.",
    `Select the reference.url that most directly supports the answer, exclusively from this allowed domain list: ${trustedReferenceHostList.join(", ")}.`,
    "If the input reference only contains a book citation, DOI, ISBN, or non-link bibliography, use it only for conceptual understanding. However, the OUTPUT reference.url MUST still utilize one of the allowed domains above.",
    "For 'new_case_same_concept', alter the clinical vignette or case context while preserving the underlying clinical concept.",
    "For 'different_trap_same_objective', maintain the learning objective but refresh the traps and distractors.",
    "For 'reverse_reasoning', invert the diagnostic or therapeutic reasoning direction while staying within the same competency and topic.",
    "Return purely structural JSON matching the schema. Do not include any supplementary prose.",
    referenceBlock,
  ].join("\n\n");
}

export function createQuestionGeneratorSchema(targetQuestionCount: number) {
  return z.array(generatedItemSchema).length(targetQuestionCount);
}

export function createQuestionGeneratorResponseSchema(targetQuestionCount: number) {
  return {
    type: "array",
    minItems: targetQuestionCount,
    maxItems: targetQuestionCount,
    items: {
      type: "object",
      properties: {
        stem: { type: "string" },
        options: {
          type: "object",
          properties: {
            A: { type: "string" },
            B: { type: "string" },
            C: { type: "string" },
            D: { type: "string" },
            E: { type: "string" },
          },
          required: ["A", "B", "C", "D", "E"],
        },
        correctOptionKey: {
          type: "string",
          enum: ["A", "B", "C", "D", "E"],
        },
        explanationText: { type: "string" },
        variationMode: {
          type: "string",
          enum: [...variationModes],
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
      required: ["stem", "options", "correctOptionKey", "explanationText", "variationMode", "reference"],
    },
  };
}

const bibliographyLabelPattern = /(?:^|\n\s*)(Pustaka|Referensi|Sumber)\s*:\s*([\s\S]+)$/i;
const traceableMarkerPattern = /(https?:\/\/\S+|doi\s*:\s*\S+|pmid\s*:\s*\d+|isbn(?:-1[03])?\s*[: ]\s*[\dxX-]+)/i;

export function isTrustedReferenceHost(hostname: string) {
  return trustedReferenceHosts.has(hostname.trim().toLowerCase());
}

export function parseSingleHttpsReferenceUrl(value: string) {
  const normalized = value.trim();
  const embeddedUrls = normalized.match(/https?:\/\/\S+/g) ?? [];

  if (!normalized || embeddedUrls.length !== 1 || embeddedUrls[0] !== normalized) {
    throw new Error("Reference URL harus berupa tepat satu link utama.");
  }

  let parsed: URL;

  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error("Reference URL harus berupa satu link https yang valid.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Reference URL harus berupa satu link https yang valid.");
  }

  return parsed;
}

export function assertTrustedReferenceUrl(value: string) {
  const parsed = parseSingleHttpsReferenceUrl(value);

  if (!isTrustedReferenceHost(parsed.hostname)) {
    throw new Error("Reference URL harus berasal dari domain tepercaya yang diizinkan.");
  }

  return parsed;
}

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\r\n/g, "\n");
}

function splitTrailingParagraphs(value: string) {
  return normalizeWhitespace(value).split(/\n\s*\n/);
}

function hasStructuredCitation(value: string) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return false;
  }

  const hasYear = /\b(19|20)\d{2}\b/.test(normalized);
  const hasEdition = /\b\d+(st|nd|rd|th)\s+ed\b/i.test(normalized);
  const hasTitleLikeText = /[A-Z][A-Za-z]+(?:\s+[A-Za-z][A-Za-z.&-]+){2,}/.test(normalized);
  const hasAuthorLikeLead = /^[A-Z][A-Za-z'`-]+(?:\s+[A-Z][A-Za-z'`-]+)*\s+[A-Z]{0,3}\.?\s*/.test(normalized);

  return hasYear && hasTitleLikeText && (hasEdition || hasAuthorLikeLead);
}

export function isTraceableBibliography(value: string) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return false;
  }

  return traceableMarkerPattern.test(normalized) || hasStructuredCitation(normalized);
}

export function parseExplanationBibliography(value: string): ParsedExplanationBibliography {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return {
      explanationBody: "",
      bibliographyBlock: null,
      bibliographyLabel: null,
    };
  }

  const labeledMatch = normalized.match(bibliographyLabelPattern);

  if (labeledMatch) {
    const bibliographyLabel = labeledMatch[1] as ParsedExplanationBibliography["bibliographyLabel"];
    const bibliographyBlock = normalizeWhitespace(labeledMatch[2] ?? "");
    const explanationBody = normalizeWhitespace(normalized.slice(0, labeledMatch.index ?? normalized.length));

    return {
      explanationBody,
      bibliographyBlock: bibliographyBlock || null,
      bibliographyLabel,
    };
  }

  const paragraphs = splitTrailingParagraphs(normalized);
  const trailingBlock = paragraphs.at(-1) ?? "";
  const leadingText = paragraphs.slice(0, -1).join("\n\n").trim();
  const looksLikeCitationList = /^(\d+\.\s+|[-*]\s+)/m.test(trailingBlock) && isTraceableBibliography(trailingBlock);

  if (paragraphs.length > 1 && looksLikeCitationList) {
    return {
      explanationBody: leadingText,
      bibliographyBlock: trailingBlock,
      bibliographyLabel: null,
    };
  }

  return {
    explanationBody: normalized,
    bibliographyBlock: null,
    bibliographyLabel: null,
  };
}

export function validateGeneratedQuestionItems(
  input: unknown,
  schema: ReturnType<typeof createQuestionGeneratorSchema>,
  context?: {
    references?: QuestionGeneratorReference[];
  },
) {
  if (!Array.isArray(input)) {
    throw new Error("Hasil generator harus berupa array soal.");
  }

  input.forEach((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Setiap hasil generator harus berupa objek soal.");
    }

    const rawItem = item as Record<string, unknown>;
    const options = rawItem.options;

    if (!options || typeof options !== "object") {
      throw new Error("Setiap soal harus memiliki opsi lengkap A-E.");
    }

    if (!optionKeys.every((key) => typeof (options as Record<string, unknown>)[key] === "string")) {
      throw new Error("Setiap soal harus memiliki opsi lengkap A-E.");
    }

    if (typeof rawItem.explanationText !== "string" || rawItem.explanationText.trim().length === 0) {
      throw new Error("Setiap soal harus memiliki pembahasan.");
    }

    if (
      typeof rawItem.variationMode !== "string"
      || !variationModes.includes(rawItem.variationMode as typeof variationModes[number])
    ) {
      throw new Error("Setiap soal harus memiliki variationMode yang termasuk mode approved.");
    }

    if (!rawItem.reference || typeof rawItem.reference !== "object") {
      throw new Error("Setiap soal harus memiliki reference.label dan reference.url.");
    }

    const reference = rawItem.reference as Record<string, unknown>;

    if (typeof reference.label !== "string" || typeof reference.url !== "string") {
      throw new Error("Setiap soal harus memiliki reference.label dan reference.url.");
    }

    if (
      typeof rawItem.correctOptionKey !== "string"
      || !optionKeys.includes(rawItem.correctOptionKey as typeof optionKeys[number])
    ) {
      throw new Error("Setiap soal harus memiliki correct option yang ada di opsi.");
    }
  });

  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(message || "Hasil generator belum valid.");
  }

  parsed.data.forEach((item) => {
    const optionEntries = Object.entries(item.options);

    if (optionEntries.length !== optionKeys.length) {
      throw new Error("Setiap soal harus memiliki tepat lima opsi A-E.");
    }

    if (!optionKeys.every((key) => Object.hasOwn(item.options, key))) {
      throw new Error("Setiap soal harus memiliki opsi lengkap A-E.");
    }

    if (!item.explanationText.trim()) {
      throw new Error("Setiap soal harus memiliki pembahasan.");
    }

    if (!Object.hasOwn(item.options, item.correctOptionKey)) {
      throw new Error("Setiap soal harus memiliki correct option yang ada di opsi.");
    }

  });

  return parsed.data;
}

export function validateEditableGeneratedQuestionItem(input: unknown) {
  const parsed = editableGeneratedItemSchema.safeParse(input);

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(message || "Draft generator belum valid.");
  }

  return parsed.data;
}

function tokenizeTopicTerms(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((term) => term.trim())
    .filter((term) => term.length >= 4 && !ignoredTopicTerms.has(term));
}

export function assertQuestionTopicProximity({
  references,
  generatedItems,
}: {
  references: QuestionGeneratorReference[];
  generatedItems: Array<{
    stem: string;
    explanationText: string;
  }>;
}) {
  const referenceTerms = new Set(
    references.flatMap((reference) =>
      tokenizeTopicTerms(
        `${reference.stem} ${reference.explanationText} ${Object.values(reference.options).join(" ")}`,
      )),
  );

  generatedItems.forEach((item) => {
    const generatedTerms = new Set(
      tokenizeTopicTerms(`${item.stem} ${item.explanationText}`),
    );
    const overlapCount = Array.from(generatedTerms).filter((term) => referenceTerms.has(term)).length;

    if (generatedTerms.size > 0 && overlapCount === 0) {
      throw new Error("Hasil generator terlalu jauh dari topik referensi. Coba kurangi jumlah soal atau perjelas referensi.");
    }
  });
}
