import { z } from "npm:zod";

export const flashCardAcademicGroupSchema = z.enum([
  "pharmaceutical_science",
  "clinical_science",
  "social_behavioral_and_administration",
]);

const flashCardItemSchema = z.object({
  front_text: z.string().trim().min(1, "Flash card front text is required."),
  back_text: z.string().trim().min(1, "Flash card back text is required."),
});

const flashCardSubtopicSchema = z.object({
  title: z.string().trim().min(1, "Subtopic title is required."),
  summary: z.string().trim().min(1, "Subtopic summary is required."),
  cards: z.array(flashCardItemSchema).min(1, "Each subtopic requires at least one card."),
});

const flashCardOutputSchema = z.object({
  global_summary: z.string().trim().min(1, "Global summary is required."),
  subtopics: z.array(flashCardSubtopicSchema).min(1, "At least one subtopic is required."),
});

export type FlashCardAcademicGroup = z.infer<typeof flashCardAcademicGroupSchema>;
export type FlashCardOutput = z.infer<typeof flashCardOutputSchema>;

function countMeaningfulWords(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

export function normalizeFlashCardAcademicGroup(value: string): FlashCardAcademicGroup {
  const normalized = value.trim().toLowerCase().replace(/[^a-z]+/g, " ").trim();

  if (normalized === "pharmaceutical science") {
    return "pharmaceutical_science";
  }

  if (normalized === "clinical science") {
    return "clinical_science";
  }

  if (normalized === "social behavioral and administration") {
    return "social_behavioral_and_administration";
  }

  throw new Error("Academic group is not supported.");
}

export function validateFlashCardOutput(value: unknown): FlashCardOutput {
  return flashCardOutputSchema.parse(value);
}

export function assertFlashCardOutputQuality(output: FlashCardOutput) {
  if (countMeaningfulWords(output.global_summary) < 3) {
    throw new Error("Flash card output quality is too thin because the global summary is too short.");
  }

  const normalizedFronts = new Set<string>();

  for (const subtopic of output.subtopics) {
    if (countMeaningfulWords(subtopic.summary) < 2) {
      throw new Error("Flash card output quality is too thin because a subtopic summary is too short.");
    }

    for (const card of subtopic.cards) {
      const normalizedFront = card.front_text.trim().toLowerCase();

      if (normalizedFronts.has(normalizedFront)) {
        throw new Error("Flash card output quality is too thin because duplicate card fronts were generated.");
      }

      normalizedFronts.add(normalizedFront);
    }
  }

  return output;
}

export function classifyFlashCardPdfSource({
  mimeType,
  extractedText,
}: {
  mimeType: string;
  extractedText: string | null | undefined;
}) {
  if (mimeType !== "application/pdf") {
    throw new Error("Flash card PDF classifier only supports PDF inputs.");
  }

  return extractedText?.trim() ? "text" : "ocr";
}

export function collectFlashCardSourcePathsForCleanup(
  sourceFiles: Array<{
    storageBucket: string;
    storagePath: string;
    deleteAfterPublish: boolean;
  }>,
) {
  return sourceFiles
    .filter((file) => file.deleteAfterPublish)
    .map((file) => ({
      storageBucket: file.storageBucket,
      storagePath: file.storagePath,
    }));
}
