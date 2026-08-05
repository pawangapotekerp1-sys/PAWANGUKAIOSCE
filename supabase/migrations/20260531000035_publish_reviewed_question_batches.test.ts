import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const migrationPath = resolve(
  dirname(currentFilePath),
  "20260531000035_publish_reviewed_question_batches.sql",
);

describe("20260531000035 publish reviewed question batches migration", () => {
  test("exists and includes both reviewed docx sources", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const normalizedSql = readFileSync(migrationPath, "utf8")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    expect(normalizedSql).toContain("e:/soal/infeksi.docx");
    expect(normalizedSql).toContain("e:/soal/tulang dan sendi.docx");
    expect(normalizedSql).toContain("antiinfeksi, antivirus dan antiparasit");
    expect(normalizedSql).toContain("mata, kulit, tulang dan sendi");
  });

  test("ships the expected number of questions, options, and explanations", () => {
    const migrationSql = readFileSync(migrationPath, "utf8");

    const questionInsertCount = (migrationSql.match(/insert into public\.questions /g) ?? []).length;
    const optionInsertCount = (migrationSql.match(/insert into public\.question_options /g) ?? []).length;
    const explanationInsertCount = (
      migrationSql.match(/insert into public\.question_explanations /g) ?? []
    ).length;

    expect(questionInsertCount).toBe(116);
    expect(optionInsertCount).toBe(580);
    expect(explanationInsertCount).toBe(116);
  });

  test("publishes imported questions directly", () => {
    const normalizedSql = readFileSync(migrationPath, "utf8")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    expect(normalizedSql).toContain("'published'");
    expect(normalizedSql).toContain("insert into public.question_sources");
    expect(normalizedSql).toContain("insert into public.questions");
    expect(normalizedSql).toContain("insert into public.question_options");
    expect(normalizedSql).toContain("insert into public.question_explanations");
  });

  test("bootstraps required clinical taxonomy rows so clean resets do not depend on seed ordering", () => {
    const normalizedSql = readFileSync(migrationPath, "utf8")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    expect(normalizedSql).toContain("insert into public.blocks");
    expect(normalizedSql).toContain("'44444444-4444-4444-4444-444444444441'");
    expect(normalizedSql).toContain("'clinical-science'");
    expect(normalizedSql).toContain("insert into public.topics");
    expect(normalizedSql).toContain("'55555555-5555-5555-5555-555555555552'");
    expect(normalizedSql).toContain("'antiinfeksi-antivirus-antiparasit'");
    expect(normalizedSql).toContain("'55555555-5555-5555-5555-555555555554'");
    expect(normalizedSql).toContain("'mata-kulit-tulang-dan-sendi'");
  });
});
