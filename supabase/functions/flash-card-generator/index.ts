import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  HttpError,
  createServiceClient,
  requireQuestionBankManager,
} from "../_shared/auth.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { collectFlashCardSourcePathsForCleanup } from "../_shared/flash-card.ts";
import { generateGeminiText, isGeminiCredentialError, testGeminiConnection } from "../_shared/gemini-client.ts";
import {
  assertFlashCardMaterialEditable,
  assertFlashCardMaterialRetryable,
  buildFlashCardCredentialWritePayload,
  buildFlashCardFailureUpdate,
  buildFlashCardGenerationPrompt,
  buildFlashCardMaterialInsert,
  buildFlashCardPublishUpdate,
  buildFlashCardReadyForReviewUpdate,
  buildFlashCardSourceFileRows,
  createFlashCardResponseSchema,
  ensureFlashCardManagerAccess,
  FlashCardManagerAccessError,
  validateGeneratedFlashCardOutput,
  validateFlashCardMaterialDraftInput,
  validateFlashCardReviewUpdate,
} from "./handler.ts";

type ServiceClient = ReturnType<typeof createServiceClient>;

type UserAiCredentialRow = {
  id: string;
  model: string;
  secret_id: string | null;
  last_validated_at: string | null;
  last_error: string | null;
};

type MaterialRow = {
  id: string;
  title: string;
  academic_group: string;
  status: string;
  global_summary: string | null;
  processing_error: string | null;
  created_by: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type SourceFileRow = {
  id: string;
  material_id: string;
  file_kind: "transcript" | "slide_pdf";
  storage_bucket: string;
  storage_path: string;
  original_file_name: string;
  mime_type: string;
  size_bytes: number;
  extraction_status: string;
  delete_after_publish: boolean;
};

type SubtopicRow = {
  id: string;
  material_id: string;
  title: string;
  summary: string;
  sort_order: number;
};

type CardRow = {
  id: string;
  subtopic_id: string;
  front_text: string;
  back_text: string;
  sort_order: number;
};

function encodeBase64(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function mapFlashCardGeneratorStatus(credential: UserAiCredentialRow | null) {
  return {
    hasCredential: Boolean(credential?.secret_id),
    model: credential?.model ?? "gemini-2.5-flash",
    lastValidatedAt: credential?.last_validated_at ?? null,
    lastError: credential?.last_error ?? null,
  };
}

async function readUserCredential(service: ServiceClient, userId: string) {
  const { data, error } = await service
    .from("user_ai_credentials")
    .select("id, model, secret_id, last_validated_at, last_error")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "BYOK_READ_FAILED", error.message);
  }

  return (data as UserAiCredentialRow | null) ?? null;
}

async function createVaultSecret(service: ServiceClient, apiKey: string, name: string, description: string) {
  const { data, error } = await service.rpc("create_vault_secret", {
    secret: apiKey,
    name,
    description,
  });

  if (error) {
    throw new HttpError(500, "VAULT_WRITE_FAILED", error.message);
  }

  return data as string;
}

async function readVaultSecret(service: ServiceClient, secretId: string) {
  const { data, error } = await service.rpc("read_vault_secret", {
    target_secret_id: secretId,
  });

  if (error || typeof data !== "string" || data.length === 0) {
    throw new HttpError(500, "VAULT_READ_FAILED", error?.message ?? "Secret BYOK belum tersedia.");
  }

  return data;
}

async function deleteVaultSecret(service: ServiceClient, secretId: string) {
  const { error } = await service.rpc("delete_vault_secret", {
    target_secret_id: secretId,
  });

  if (error) {
    throw new HttpError(500, "VAULT_DELETE_FAILED", error.message);
  }
}

async function upsertUserCredential(
  service: ServiceClient,
  {
    credential,
    userId,
    apiKey,
    model,
  }: {
    credential: UserAiCredentialRow | null;
    userId: string;
    apiKey: string;
    model?: string;
  },
) {
  const previousSecretId = credential?.secret_id ?? null;
  const nextSecretId = await createVaultSecret(
    service,
    apiKey.trim(),
    `flash-card-generator-byok-${userId}-${Date.now()}`,
    `Flash Card Generator BYOK for ${userId}`,
  );
  const writePayload = {
    ...buildFlashCardCredentialWritePayload({
      apiKey,
      model: model ?? "",
      userId,
    }),
    secret_id: nextSecretId,
  };

  if (credential?.id) {
    const { error } = await service
      .from("user_ai_credentials")
      .update(writePayload)
      .eq("id", credential.id);

    if (error) {
      throw new HttpError(500, "BYOK_WRITE_FAILED", error.message);
    }
  } else {
    const { error } = await service
      .from("user_ai_credentials")
      .insert(writePayload);

    if (error) {
      throw new HttpError(500, "BYOK_WRITE_FAILED", error.message);
    }
  }

  if (previousSecretId && previousSecretId !== nextSecretId) {
    await deleteVaultSecret(service, previousSecretId);
  }
}

async function loadOwnedMaterial(service: ServiceClient, materialId: string, userId: string) {
  const { data, error } = await service
    .from("flashcard_materials")
    .select("id, title, academic_group, status, global_summary, processing_error, created_by, published_at, created_at, updated_at")
    .eq("id", materialId)
    .eq("created_by", userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "FLASHCARD_MATERIAL_READ_FAILED", error.message);
  }

  if (!data) {
    throw new HttpError(404, "FLASHCARD_MATERIAL_NOT_FOUND", "Materi flash card tidak ditemukan.");
  }

  return data as MaterialRow;
}

async function loadMaterialChildren(service: ServiceClient, materialId: string) {
  const [{ data: sourceFiles, error: sourceError }, { data: subtopics, error: subtopicError }] = await Promise.all([
    service
      .from("flashcard_source_files")
      .select("id, material_id, file_kind, storage_bucket, storage_path, original_file_name, mime_type, size_bytes, extraction_status, delete_after_publish")
      .eq("material_id", materialId)
      .order("created_at", { ascending: true }),
    service
      .from("flashcard_subtopics")
      .select("id, material_id, title, summary, sort_order")
      .eq("material_id", materialId)
      .order("sort_order", { ascending: true }),
  ]);

  if (sourceError || subtopicError) {
    throw new HttpError(500, "FLASHCARD_CHILDREN_READ_FAILED", sourceError?.message ?? subtopicError?.message ?? "Detail materi belum berhasil dimuat.");
  }

  const subtopicIds = ((subtopics as SubtopicRow[] | null) ?? []).map((subtopic) => subtopic.id);
  const { data: cards, error: cardsError } = subtopicIds.length > 0
    ? await service
      .from("flashcard_cards")
      .select("id, subtopic_id, front_text, back_text, sort_order")
      .in("subtopic_id", subtopicIds)
      .order("sort_order", { ascending: true })
    : { data: [], error: null };

  if (cardsError) {
    throw new HttpError(500, "FLASHCARD_CARD_READ_FAILED", cardsError.message);
  }

  return {
    sourceFiles: (sourceFiles as SourceFileRow[] | null) ?? [],
    subtopics: (subtopics as SubtopicRow[] | null) ?? [],
    cards: (cards as CardRow[] | null) ?? [],
  };
}

async function downloadTextFromStorage(service: ServiceClient, sourceFile: SourceFileRow) {
  const { data, error } = await service.storage
    .from(sourceFile.storage_bucket)
    .download(sourceFile.storage_path);

  if (error || !data) {
    throw new HttpError(500, "FLASHCARD_SOURCE_DOWNLOAD_FAILED", error?.message ?? "Source transcript belum berhasil diunduh.");
  }

  return await data.text();
}

async function downloadBytesFromStorage(service: ServiceClient, sourceFile: SourceFileRow) {
  const { data, error } = await service.storage
    .from(sourceFile.storage_bucket)
    .download(sourceFile.storage_path);

  if (error || !data) {
    throw new HttpError(500, "FLASHCARD_SOURCE_DOWNLOAD_FAILED", error?.message ?? "Source PDF belum berhasil diunduh.");
  }

  return new Uint8Array(await data.arrayBuffer());
}

async function replaceMaterialContent(
  service: ServiceClient,
  {
    ownerId,
    materialId,
    globalSummary,
    subtopics,
  }: {
    ownerId: string;
    materialId: string;
    globalSummary: string;
    subtopics: Array<{
      title: string;
      summary: string;
      cards: Array<{
        frontText: string;
        backText: string;
      }>;
    }>;
  },
) {
  const validatedOutput = validateFlashCardReviewUpdate({
    globalSummary,
    subtopics,
  });
  const { error } = await service.rpc("replace_flashcard_material_content", {
    target_material_id: materialId,
    target_owner_id: ownerId,
    target_subtopics: validatedOutput.subtopics.map((subtopic) => ({
      title: subtopic.title,
      summary: subtopic.summary,
      cards: subtopic.cards.map((card) => ({
        front_text: card.front_text,
        back_text: card.back_text,
      })),
    })),
  });

  if (error) {
    throw new HttpError(500, "FLASHCARD_CONTENT_REPLACE_FAILED", error.message);
  }

  return validatedOutput;
}

async function processMaterialGeneration(
  service: ServiceClient,
  material: MaterialRow,
  credential: UserAiCredentialRow,
) {
  const { sourceFiles } = await loadMaterialChildren(service, material.id);
  const transcriptSource = sourceFiles.find((sourceFile) => sourceFile.file_kind === "transcript");
  const slidePdfSource = sourceFiles.find((sourceFile) => sourceFile.file_kind === "slide_pdf");

  if (!transcriptSource || !slidePdfSource) {
    throw new HttpError(400, "FLASHCARD_SOURCE_INCOMPLETE", "Materi flash card wajib memiliki satu transcript dan satu slide PDF.");
  }

  await service
    .from("flashcard_materials")
    .update({
      status: "processing",
      processing_error: null,
    })
    .eq("id", material.id);

  try {
    const [transcriptText, pdfBytes, apiKey] = await Promise.all([
      downloadTextFromStorage(service, transcriptSource),
      downloadBytesFromStorage(service, slidePdfSource),
      readVaultSecret(service, credential.secret_id!),
    ]);
    const responseText = await generateGeminiText({
      apiKey,
      model: credential.model,
      prompt: buildFlashCardGenerationPrompt({
        title: material.title,
        academicGroup: material.academic_group as MaterialRow["academic_group"],
        transcriptText,
      }),
      parts: [
        {
          text: buildFlashCardGenerationPrompt({
            title: material.title,
            academicGroup: material.academic_group as MaterialRow["academic_group"],
            transcriptText,
          }),
        },
        {
          inlineData: {
            mimeType: slidePdfSource.mime_type,
            data: encodeBase64(pdfBytes),
          },
        },
      ],
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
      responseSchema: createFlashCardResponseSchema(),
    });
    const aiOutput = validateGeneratedFlashCardOutput(JSON.parse(responseText));

    await replaceMaterialContent(service, {
      ownerId: material.created_by,
      materialId: material.id,
      globalSummary: aiOutput.global_summary,
      subtopics: aiOutput.subtopics.map((subtopic) => ({
        title: subtopic.title,
        summary: subtopic.summary,
        cards: subtopic.cards.map((card) => ({
          frontText: card.front_text,
          backText: card.back_text,
        })),
      })),
    });

    const { error: materialUpdateError } = await service
      .from("flashcard_materials")
      .update(buildFlashCardReadyForReviewUpdate(aiOutput.global_summary))
      .eq("id", material.id);

    if (materialUpdateError) {
      throw new HttpError(500, "FLASHCARD_MATERIAL_UPDATE_FAILED", materialUpdateError.message);
    }

    await service
      .from("flashcard_source_files")
      .update({
        extraction_status: "completed",
      })
      .eq("material_id", material.id);

    return jsonResponse({
      materialId: material.id,
      status: "ready_for_review",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Flash card processing failed.";
    await service
      .from("flashcard_materials")
      .update(buildFlashCardFailureUpdate(message))
      .eq("id", material.id);
    throw error;
  }
}

function mapMaterialDetail({
  material,
  sourceFiles,
  subtopics,
  cards,
}: {
  material: MaterialRow;
  sourceFiles: SourceFileRow[];
  subtopics: SubtopicRow[];
  cards: CardRow[];
}) {
  return {
    material: {
      id: material.id,
      title: material.title,
      academicGroup: material.academic_group,
      status: material.status,
      globalSummary: material.global_summary,
      processingError: material.processing_error,
      publishedAt: material.published_at,
      createdAt: material.created_at,
      updatedAt: material.updated_at,
    },
    sourceFiles: sourceFiles.map((sourceFile) => ({
      id: sourceFile.id,
      fileKind: sourceFile.file_kind,
      storageBucket: sourceFile.storage_bucket,
      storagePath: sourceFile.storage_path,
      originalFileName: sourceFile.original_file_name,
      mimeType: sourceFile.mime_type,
      sizeBytes: sourceFile.size_bytes,
      extractionStatus: sourceFile.extraction_status,
      deleteAfterPublish: sourceFile.delete_after_publish,
    })),
    subtopics: subtopics.map((subtopic) => ({
      id: subtopic.id,
      title: subtopic.title,
      summary: subtopic.summary,
      sortOrder: subtopic.sort_order,
      cards: cards
        .filter((card) => card.subtopic_id === subtopic.id)
        .map((card) => ({
          id: card.id,
          frontText: card.front_text,
          backText: card.back_text,
          sortOrder: card.sort_order,
        })),
    })),
  };
}

async function deletePublishedSourceFiles(service: ServiceClient, sourceFiles: SourceFileRow[]) {
  const cleanupTargets = collectFlashCardSourcePathsForCleanup(sourceFiles.map((sourceFile) => ({
    storageBucket: sourceFile.storage_bucket,
    storagePath: sourceFile.storage_path,
    deleteAfterPublish: sourceFile.delete_after_publish,
  })));
  const bucketToPaths = new Map<string, string[]>();

  for (const target of cleanupTargets) {
    bucketToPaths.set(target.storageBucket, [...(bucketToPaths.get(target.storageBucket) ?? []), target.storagePath]);
  }

  for (const [bucket, paths] of bucketToPaths.entries()) {
    const { error } = await service.storage
      .from(bucket)
      .remove(paths);

    if (error) {
      throw new HttpError(500, "FLASHCARD_SOURCE_DELETE_FAILED", error.message);
    }
  }

  if (cleanupTargets.length > 0) {
    const { error: updateSourceError } = await service
      .from("flashcard_source_files")
      .update({
        extraction_status: "deleted",
      })
      .in("storage_path", cleanupTargets.map((target) => target.storagePath));

    if (updateSourceError) {
      throw new HttpError(500, "FLASHCARD_SOURCE_STATUS_UPDATE_FAILED", updateSourceError.message);
    }
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);

  if (corsResponse) {
    return corsResponse;
  }

  try {
    const { user, profile, service } = await requireQuestionBankManager(req);
    ensureFlashCardManagerAccess(profile.role as "admin" | "mentor" | "pro" | "pendaftar_baru");
    const payload = await req.json();
    const credential = await readUserCredential(service, user.id);

    if (payload.action === "get-status") {
      return jsonResponse({
        status: mapFlashCardGeneratorStatus(credential),
      });
    }

    if (payload.action === "save-credential") {
      if (typeof payload.apiKey !== "string" || payload.apiKey.trim().length === 0) {
        throw new HttpError(400, "BYOK_REQUIRED", "Gemini API key pribadi wajib diisi.");
      }

      await upsertUserCredential(service, {
        credential,
        userId: user.id,
        apiKey: payload.apiKey,
        model: typeof payload.model === "string" ? payload.model : undefined,
      });

      return jsonResponse({
        status: mapFlashCardGeneratorStatus(await readUserCredential(service, user.id)),
      });
    }

    if (payload.action === "delete-credential") {
      if (credential?.secret_id) {
        await deleteVaultSecret(service, credential.secret_id);
      }

      if (credential?.id) {
        const { error } = await service
          .from("user_ai_credentials")
          .delete()
          .eq("id", credential.id);

        if (error) {
          throw new HttpError(500, "BYOK_DELETE_FAILED", error.message);
        }
      }

      return jsonResponse({
        status: mapFlashCardGeneratorStatus(null),
      });
    }

    if (payload.action === "test-credential") {
      if (!credential?.secret_id) {
        throw new HttpError(400, "BYOK_MISSING", "Belum ada BYOK yang bisa dites.");
      }

      const apiKey = await readVaultSecret(service, credential.secret_id);

      try {
        const testResult = await testGeminiConnection(apiKey, credential.model);
        await service
          .from("user_ai_credentials")
          .update({
            last_validated_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", credential.id);

        return jsonResponse({
          status: mapFlashCardGeneratorStatus(await readUserCredential(service, user.id)),
          testResult,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "BYOK test failed.";
        await service
          .from("user_ai_credentials")
          .update({
            last_error: message,
          })
          .eq("id", credential.id);

        if (isGeminiCredentialError(error)) {
          throw new HttpError(400, "BYOK_INVALID", message);
        }

        throw error;
      }
    }

    if (payload.action === "create-material") {
      const draftInput = validateFlashCardMaterialDraftInput({
        title: typeof payload.title === "string" ? payload.title : "",
        academicGroup: typeof payload.academicGroup === "string" ? payload.academicGroup : "",
        sourceFiles: Array.isArray(payload.sourceFiles) ? payload.sourceFiles : [],
      });
      const { data: materialData, error: materialError } = await service
        .from("flashcard_materials")
        .insert(buildFlashCardMaterialInsert({
          title: draftInput.title,
          academicGroup: draftInput.academicGroup,
          createdBy: user.id,
        }))
        .select("id, status")
        .single();

      if (materialError || !materialData) {
        throw new HttpError(500, "FLASHCARD_MATERIAL_CREATE_FAILED", materialError?.message ?? "Materi flash card belum berhasil dibuat.");
      }

      const { error: sourceError } = await service
        .from("flashcard_source_files")
        .insert(buildFlashCardSourceFileRows({
          materialId: (materialData as { id: string }).id,
          sourceFiles: draftInput.sourceFiles,
        }));

      if (sourceError) {
        throw new HttpError(500, "FLASHCARD_SOURCE_CREATE_FAILED", sourceError.message);
      }

      return jsonResponse({
        materialId: (materialData as { id: string }).id,
        status: (materialData as { status: string }).status,
      });
    }

    if (payload.action === "process-material") {
      if (!credential?.secret_id) {
        throw new HttpError(400, "BYOK_MISSING", "Belum ada BYOK tersimpan untuk flash card.");
      }

      const materialId = typeof payload.materialId === "string" ? payload.materialId : "";
      const material = await loadOwnedMaterial(service, materialId, user.id);
      return await processMaterialGeneration(service, material, credential);
    }

    if (payload.action === "get-material") {
      const materialId = typeof payload.materialId === "string" ? payload.materialId : "";
      const material = await loadOwnedMaterial(service, materialId, user.id);
      const children = await loadMaterialChildren(service, material.id);

      return jsonResponse({
        detail: mapMaterialDetail({
          material,
          sourceFiles: children.sourceFiles,
          subtopics: children.subtopics,
          cards: children.cards,
        }),
      });
    }

    if (payload.action === "update-material") {
      const materialId = typeof payload.materialId === "string" ? payload.materialId : "";
      const material = await loadOwnedMaterial(service, materialId, user.id);
      assertFlashCardMaterialEditable(material.status);
      const title = typeof payload.title === "string" ? payload.title.trim() : "";

      if (!title) {
        throw new HttpError(400, "FLASHCARD_TITLE_REQUIRED", "Judul materi flash card wajib diisi.");
      }

      const validatedOutput = await replaceMaterialContent(service, {
        ownerId: user.id,
        materialId,
        globalSummary: typeof payload.globalSummary === "string" ? payload.globalSummary : "",
        subtopics: Array.isArray(payload.subtopics) ? payload.subtopics : [],
      });
      const { error: materialError } = await service
        .from("flashcard_materials")
        .update({
          title,
          global_summary: validatedOutput.global_summary,
          processing_error: null,
        })
        .eq("id", materialId);

      if (materialError) {
        throw new HttpError(500, "FLASHCARD_MATERIAL_UPDATE_FAILED", materialError.message);
      }

      return jsonResponse({
        materialId,
        status: "ready_for_review",
      });
    }

    if (payload.action === "retry-processing") {
      if (!credential?.secret_id) {
        throw new HttpError(400, "BYOK_MISSING", "Belum ada BYOK tersimpan untuk flash card.");
      }

      const materialId = typeof payload.materialId === "string" ? payload.materialId : "";
      const material = await loadOwnedMaterial(service, materialId, user.id);
      assertFlashCardMaterialRetryable(material.status);
      return await processMaterialGeneration(service, material, credential);
    }

    if (payload.action === "publish-material") {
      const materialId = typeof payload.materialId === "string" ? payload.materialId : "";
      const material = await loadOwnedMaterial(service, materialId, user.id);

      if (material.status !== "ready_for_review") {
        throw new HttpError(400, "FLASHCARD_NOT_READY", "Materi flash card belum siap dipublikasikan.");
      }

      const children = await loadMaterialChildren(service, material.id);
      await deletePublishedSourceFiles(service, children.sourceFiles);
      const { error } = await service
        .from("flashcard_materials")
        .update(buildFlashCardPublishUpdate(new Date().toISOString()))
        .eq("id", material.id);

      if (error) {
        throw new HttpError(500, "FLASHCARD_PUBLISH_FAILED", error.message);
      }

      return jsonResponse({
        materialId: material.id,
        status: "published",
      });
    }

    throw new HttpError(400, "INVALID_ACTION", "Aksi flash card generator tidak dikenali.");
  } catch (error) {
    if (error instanceof FlashCardManagerAccessError) {
      return jsonResponse(
        {
          error: "FORBIDDEN",
          message: error.message,
        },
        403,
      );
    }

    if (error instanceof HttpError) {
      return jsonResponse(
        {
          error: error.code,
          message: error.message,
        },
        error.status,
      );
    }

    return jsonResponse(
      {
        error: "UNEXPECTED_ERROR",
        message: error instanceof Error ? error.message : "Unexpected flash card generator error.",
      },
      500,
    );
  }
});
