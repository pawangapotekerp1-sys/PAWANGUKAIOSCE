import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import {
  assertFlashCardMaterialEditable,
  assertFlashCardMaterialRetryable,
  buildFlashCardCredentialWritePayload,
  buildFlashCardFailureUpdate,
  buildFlashCardMaterialInsert,
  buildFlashCardPublishUpdate,
  buildFlashCardSourceFileRows,
  ensureFlashCardManagerAccess,
  FlashCardManagerAccessError,
  validateGeneratedFlashCardOutput,
  validateFlashCardMaterialDraftInput,
} from "./handler";

describe("flash-card generator manager access", () => {
  test("uses explicit local .ts imports for runtime files", () => {
    const handlerSource = readFileSync(resolve(import.meta.dirname, "./handler.ts"), "utf8");
    const indexSource = readFileSync(resolve(import.meta.dirname, "./index.ts"), "utf8");

    expect(handlerSource).toContain('../_shared/flash-card.ts');
    expect(indexSource).toContain('.rpc("replace_flashcard_material_content"');
    expect(indexSource).toContain("async function processMaterialGeneration");
    expect(indexSource).toContain('payload.action === "create-material"');
    expect(indexSource).toContain('payload.action === "process-material"');
    expect(indexSource).toContain('payload.action === "get-material"');
    expect(indexSource).toContain('payload.action === "update-material"');
    expect(indexSource).toContain('payload.action === "retry-processing"');
    expect(indexSource).toContain('payload.action === "publish-material"');
    expect(indexSource).toContain('payload.action === "get-status"');
    expect(indexSource).toContain('payload.action === "save-credential"');
    expect(indexSource).toContain('payload.action === "test-credential"');
    expect(indexSource).toContain('payload.action === "delete-credential"');
    expect(indexSource).toContain("collectFlashCardSourcePathsForCleanup");
    expect(indexSource).toMatch(/payload\.action === "retry-processing"[\s\S]+processMaterialGeneration\(/);
    expect(indexSource).toContain('Belum ada BYOK tersimpan untuk flash card.');
  });

  test("rejects users who are not admin or mentor", () => {
    expect(() => ensureFlashCardManagerAccess("pro")).toThrow(FlashCardManagerAccessError);
    expect(() => ensureFlashCardManagerAccess("pendaftar_baru")).toThrow(/admin atau mentor/i);
  });

  test("prevents editing or retrying materials that are already published", () => {
    expect(() => assertFlashCardMaterialEditable("published")).toThrow(/sudah dipublikasikan/i);
    expect(() => assertFlashCardMaterialRetryable("published")).toThrow(/tidak bisa diproses ulang/i);
    expect(() => assertFlashCardMaterialEditable("ready_for_review")).not.toThrow();
    expect(() => assertFlashCardMaterialRetryable("failed")).not.toThrow();
  });
});

describe("validateFlashCardMaterialDraftInput", () => {
  test("accepts one transcript source and one slide pdf source", () => {
    expect(validateFlashCardMaterialDraftInput({
      title: "Hipertensi pada CKD",
      academicGroup: "Clinical Science",
      sourceFiles: [
        {
          fileKind: "transcript",
          storageBucket: "flash-card-sources",
          storagePath: "mentor-1/material-1/transcript.txt",
          originalFileName: "kelas.txt",
          mimeType: "text/plain",
          sizeBytes: 2048,
        },
        {
          fileKind: "slide_pdf",
          storageBucket: "flash-card-sources",
          storagePath: "mentor-1/material-1/slide.pdf",
          originalFileName: "slide.pdf",
          mimeType: "application/pdf",
          sizeBytes: 4096,
        },
      ],
    }).sourceFiles).toHaveLength(2);
  });

  test("rejects transcript files that are not stored as supported text formats", () => {
    expect(() =>
      validateFlashCardMaterialDraftInput({
        title: "Hipertensi pada CKD",
        academicGroup: "Clinical Science",
        sourceFiles: [
          {
            fileKind: "transcript",
            storageBucket: "flash-card-sources",
            storagePath: "mentor-1/material-1/transcript.docx",
            originalFileName: "kelas.docx",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            sizeBytes: 2048,
          },
          {
            fileKind: "slide_pdf",
            storageBucket: "flash-card-sources",
            storagePath: "mentor-1/material-1/slide.pdf",
            originalFileName: "slide.pdf",
            mimeType: "application/pdf",
            sizeBytes: 4096,
          },
        ],
      }),
    ).toThrow(/transcript source harus berupa file txt atau markdown/i);
  });

  test("rejects drafts that do not include exactly one transcript and one slide pdf", () => {
    expect(() =>
      validateFlashCardMaterialDraftInput({
        title: "Hipertensi pada CKD",
        academicGroup: "Clinical Science",
        sourceFiles: [
          {
            fileKind: "transcript",
            storageBucket: "flash-card-sources",
            storagePath: "mentor-1/material-1/transcript.txt",
            originalFileName: "kelas.txt",
            mimeType: "text/plain",
            sizeBytes: 2048,
          },
        ],
      }),
    ).toThrow(/transcript.*pdf|pdf.*transcript/i);
  });
});

describe("flash-card persistence payloads", () => {
  test("builds a flash-card BYOK payload with default gemini flash model and masked hint", () => {
    expect(buildFlashCardCredentialWritePayload({
      apiKey: "AIza-testing-key-4321",
      model: "",
      userId: "mentor-1",
    })).toEqual({
      user_id: "mentor-1",
      provider: "gemini",
      model: "gemini-3.6-flash",
      secret_hint: "â€¢â€¢â€¢â€¢4321",
      last_error: null,
    });
  });

  test("builds the material draft payload with normalized academic group", () => {
    expect(buildFlashCardMaterialInsert({
      title: "Hipertensi pada CKD",
      academicGroup: "Clinical Science",
      createdBy: "mentor-1",
    })).toEqual({
      title: "Hipertensi pada CKD",
      academic_group: "clinical_science",
      status: "draft",
      global_summary: null,
      processing_error: null,
      created_by: "mentor-1",
    });
  });

  test("stores source rows with pending extraction and publish cleanup enabled", () => {
    expect(buildFlashCardSourceFileRows({
      materialId: "material-1",
      sourceFiles: [
        {
          fileKind: "transcript",
          storageBucket: "flash-card-sources",
          storagePath: "mentor-1/material-1/transcript.txt",
          originalFileName: "kelas.txt",
          mimeType: "text/plain",
          sizeBytes: 2048,
        },
      ],
    })).toEqual([
      {
        material_id: "material-1",
        file_kind: "transcript",
        storage_bucket: "flash-card-sources",
        storage_path: "mentor-1/material-1/transcript.txt",
        original_file_name: "kelas.txt",
        mime_type: "text/plain",
        size_bytes: 2048,
        extraction_status: "pending",
        delete_after_publish: true,
      },
    ]);
  });

  test("marks failed materials with a practical processing error message", () => {
    expect(buildFlashCardFailureUpdate("OCR gagal membaca slide.")).toEqual({
      status: "failed",
      processing_error: "OCR gagal membaca slide.",
    });
  });

  test("marks published materials with published timestamp and cleared processing error", () => {
    expect(buildFlashCardPublishUpdate("2026-06-06T12:00:00.000Z")).toEqual({
      status: "published",
      published_at: "2026-06-06T12:00:00.000Z",
      processing_error: null,
    });
  });

  test("replaces malformed but json-valid ai output errors with a mentor-facing retry message", () => {
    expect(() =>
      validateGeneratedFlashCardOutput({
        global_summary: "Ringkas",
        subtopics: [
          {
            title: "Hipertensi",
            summary: "Dasar",
            cards: [
              {
                front_text: "Apa target tekanan darah?",
                back_text: "Kurang dari 130/80 mmHg.",
              },
              {
                front_text: "Apa target tekanan darah?",
                back_text: "ACE inhibitor membantu albuminuria.",
              },
            ],
          },
        ],
      }),
    ).toThrow(/hasil ai belum cukup rapi untuk direview/i);
  });
});
