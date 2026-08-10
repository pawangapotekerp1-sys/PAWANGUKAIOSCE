import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  mapFlashCardMaterialDetail,
  mapMentorFlashCardMaterialRows,
  mapPublishedFlashCardDeck,
  mapPublishedFlashCardLibraryRows,
  type FlashCardAcademicGroup,
  type FlashCardDifficulty,
} from "../mappers/flash-card-mappers";
import { getSupabaseBrowserClient } from "../supabase/browser-client";

type FlashCardApiClient = Pick<
  ReturnType<typeof getSupabaseBrowserClient>,
  "from" | "functions" | "storage"
>;

export type FlashCardGeneratorStatusViewModel = {
  hasCredential: boolean;
  model: string;
  modelLabel: string;
  lastValidatedAt: string | null;
  lastError: string | null;
};

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase();
}

function buildFlashCardStoragePath({
  ownerId,
  title,
  fileName,
}: {
  ownerId: string;
  title: string;
  fileName: string;
}) {
  return `${ownerId}/${Date.now()}-${sanitizeFileName(title)}-${sanitizeFileName(fileName)}`;
}

async function normalizeFunctionError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json() as {
        message?: string;
        error?: string;
      };
      const message = payload.message?.trim() || payload.error?.trim();

      if (message) {
        return new Error(message);
      }
    } catch {
      // Fall through to the generic error.
    }
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Flash card request failed.");
}

async function invokeFlashCardGenerator<TData>(
  body: Record<string, unknown>,
  client: FlashCardApiClient = getSupabaseBrowserClient(),
): Promise<TData> {
  const { data, error } = await client.functions.invoke("flash-card-generator", {
    body,
  });

  if (error) {
    throw await normalizeFunctionError(error);
  }

  return data as TData;
}

function mapFlashCardGeneratorStatus(input: {
  hasCredential: boolean;
  model: string;
  lastValidatedAt: string | null;
  lastError: string | null;
}): FlashCardGeneratorStatusViewModel {
  return {
    ...input,
    modelLabel: input.model,
  };
}

async function removeUploadedFlashCardSources(
  client: FlashCardApiClient,
  storagePaths: string[],
) {
  if (storagePaths.length === 0) {
    return;
  }

  await client.storage.from("flash-card-sources").remove(storagePaths);
}

function unwrapJoinedRecord<TRecord>(value: TRecord | TRecord[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export async function createFlashCardMaterialDraft(
  input: {
    ownerId: string;
    title: string;
    academicGroup: string;
    transcriptFile: File;
    slidePdfFile: File;
  },
  client: FlashCardApiClient = getSupabaseBrowserClient(),
) {
  if (!input.ownerId.trim()) {
    throw new Error("Owner flash card tidak valid.");
  }

  const bucket = client.storage.from("flash-card-sources");
  const transcriptPath = buildFlashCardStoragePath({
    ownerId: input.ownerId,
    title: input.title,
    fileName: input.transcriptFile.name,
  });
  const slidePdfPath = buildFlashCardStoragePath({
    ownerId: input.ownerId,
    title: input.title,
    fileName: input.slidePdfFile.name,
  });
  const uploadedPaths: string[] = [];

  try {
    const { data: transcriptUpload, error: transcriptError } = await bucket.upload(
      transcriptPath,
      input.transcriptFile,
      {
        cacheControl: "3600",
        upsert: false,
        contentType: input.transcriptFile.type || undefined,
      },
    );

    if (transcriptError) {
      throw new Error(transcriptError.message);
    }

    uploadedPaths.push(transcriptUpload?.path ?? transcriptPath);

    const { data: slideUpload, error: slideError } = await bucket.upload(
      slidePdfPath,
      input.slidePdfFile,
      {
        cacheControl: "3600",
        upsert: false,
        contentType: input.slidePdfFile.type || undefined,
      },
    );

    if (slideError) {
      throw new Error(slideError.message);
    }

    uploadedPaths.push(slideUpload?.path ?? slidePdfPath);

    return await invokeFlashCardGenerator<{
      materialId: string;
      status: string;
    }>({
      action: "create-material",
      title: input.title,
      academicGroup: input.academicGroup,
      sourceFiles: [
        {
          fileKind: "transcript",
          storageBucket: "flash-card-sources",
          storagePath: uploadedPaths[0],
          originalFileName: input.transcriptFile.name,
          mimeType: input.transcriptFile.type || "text/plain",
          sizeBytes: input.transcriptFile.size,
        },
        {
          fileKind: "slide_pdf",
          storageBucket: "flash-card-sources",
          storagePath: uploadedPaths[1],
          originalFileName: input.slidePdfFile.name,
          mimeType: input.slidePdfFile.type || "application/pdf",
          sizeBytes: input.slidePdfFile.size,
        },
      ],
    }, client);
  } catch (error) {
    await removeUploadedFlashCardSources(client, uploadedPaths);
    throw error;
  }
}

export async function getFlashCardGeneratorStatus(
  client: FlashCardApiClient = getSupabaseBrowserClient(),
): Promise<FlashCardGeneratorStatusViewModel> {
  const data = await invokeFlashCardGenerator<{
    status: {
      hasCredential: boolean;
      model: string;
      lastValidatedAt: string | null;
      lastError: string | null;
    };
  }>({
    action: "get-status",
  }, client);

  return mapFlashCardGeneratorStatus(data.status);
}

export async function saveFlashCardGeneratorCredential(
  input: {
    apiKey: string;
    model?: string;
  },
  client: FlashCardApiClient = getSupabaseBrowserClient(),
): Promise<FlashCardGeneratorStatusViewModel> {
  const data = await invokeFlashCardGenerator<{
    status: {
      hasCredential: boolean;
      model: string;
      lastValidatedAt: string | null;
      lastError: string | null;
    };
  }>({
    action: "save-credential",
    apiKey: input.apiKey,
    model: input.model,
  }, client);

  return mapFlashCardGeneratorStatus(data.status);
}

export async function deleteFlashCardGeneratorCredential(
  client: FlashCardApiClient = getSupabaseBrowserClient(),
): Promise<FlashCardGeneratorStatusViewModel> {
  const data = await invokeFlashCardGenerator<{
    status: {
      hasCredential: boolean;
      model: string;
      lastValidatedAt: string | null;
      lastError: string | null;
    };
  }>({
    action: "delete-credential",
  }, client);

  return mapFlashCardGeneratorStatus(data.status);
}

export async function testFlashCardGeneratorCredential(
  client: FlashCardApiClient = getSupabaseBrowserClient(),
): Promise<{
  status: FlashCardGeneratorStatusViewModel;
  testResult: {
    ok: boolean;
    message: string;
    latencyMs: number | null;
  };
}> {
  const data = await invokeFlashCardGenerator<{
    status: {
      hasCredential: boolean;
      model: string;
      lastValidatedAt: string | null;
      lastError: string | null;
    };
    testResult: {
      ok: boolean;
      message: string;
      latencyMs: number | null;
    };
  }>({
    action: "test-credential",
  }, client);

  return {
    status: mapFlashCardGeneratorStatus(data.status),
    testResult: data.testResult,
  };
}

export async function processFlashCardMaterial(
  input: {
    materialId: string;
  },
  client: FlashCardApiClient = getSupabaseBrowserClient(),
) {
  return invokeFlashCardGenerator<{
    materialId: string;
    status: string;
  }>({
    action: "process-material",
    materialId: input.materialId,
  }, client);
}

export async function getFlashCardMaterialDetail(
  input: {
    materialId: string;
  },
  client: FlashCardApiClient = getSupabaseBrowserClient(),
) {
  const data = await invokeFlashCardGenerator<{
    detail: Parameters<typeof mapFlashCardMaterialDetail>[0];
  }>({
    action: "get-material",
    materialId: input.materialId,
  }, client);

  return mapFlashCardMaterialDetail(data.detail);
}

export async function saveFlashCardMaterialReview(
  input: {
    materialId: string;
    title: string;
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
  client: FlashCardApiClient = getSupabaseBrowserClient(),
) {
  return invokeFlashCardGenerator<{
    materialId: string;
    status: string;
  }>({
    action: "update-material",
    ...input,
  }, client);
}

export async function retryFlashCardMaterialProcessing(
  input: {
    materialId: string;
  },
  client: FlashCardApiClient = getSupabaseBrowserClient(),
) {
  return invokeFlashCardGenerator<{
    materialId: string;
    status: string;
  }>({
    action: "retry-processing",
    materialId: input.materialId,
  }, client);
}

export async function publishFlashCardMaterial(
  input: {
    materialId: string;
  },
  client: FlashCardApiClient = getSupabaseBrowserClient(),
) {
  return invokeFlashCardGenerator<{
    materialId: string;
    status: string;
  }>({
    action: "publish-material",
    materialId: input.materialId,
  }, client);
}

export async function deleteFlashCardMaterial(
  input: {
    materialId: string;
  },
  client: FlashCardApiClient = getSupabaseBrowserClient(),
) {
  return invokeFlashCardGenerator<{
    materialId: string;
    status: string;
  }>({
    action: "delete-material",
    materialId: input.materialId,
  }, client);
}

export async function listPublishedFlashCardSubtopics(
  client: FlashCardApiClient = getSupabaseBrowserClient(),
) {
  const { data, error } = await client
    .from("flashcard_subtopics")
    .select(
      "id, title, summary, sort_order, flashcard_materials!inner(id, title, academic_group, status, published_at), flashcard_cards(id)",
    )
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return mapPublishedFlashCardLibraryRows(
    ((data ?? []) as Array<{
      id: string;
      title: string;
      summary: string;
      sort_order: number;
      flashcard_materials: Array<{
        id: string;
        title: string;
        academic_group: FlashCardAcademicGroup;
        status: string;
        published_at: string | null;
      }> | null;
      flashcard_cards: Array<{
        id: string;
      }> | null;
    }>).map((row) => ({
      ...row,
      flashcard_materials: unwrapJoinedRecord(row.flashcard_materials),
    })) as Parameters<typeof mapPublishedFlashCardLibraryRows>[0],
  );
}

export async function getPublishedFlashCardDeck(
  input: {
    subtopicId: string;
  },
  client: FlashCardApiClient = getSupabaseBrowserClient(),
) {
  const { data, error } = await client
    .from("flashcard_subtopics")
    .select(
      "id, title, summary, sort_order, flashcard_materials!inner(id, title, academic_group, status, published_at), flashcard_cards(id, front_text, back_text, sort_order)",
    )
    .eq("id", input.subtopicId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Deck flash card tidak ditemukan.");
  }

  const cardIds = ((data as { flashcard_cards?: Array<{ id: string }> }).flashcard_cards ?? []).map((card) => card.id);
  const progressResult = cardIds.length > 0
    ? await client
      .from("student_flashcard_progress")
      .select("card_id, difficulty, last_reviewed_at")
      .in("card_id", cardIds)
    : { data: [], error: null };

  if (progressResult.error) {
    throw new Error(progressResult.error.message);
  }

  return mapPublishedFlashCardDeck({
    subtopic: {
      ...(data as {
        id: string;
        title: string;
        summary: string;
        sort_order: number;
        flashcard_materials: Array<{
          id: string;
          title: string;
          academic_group: FlashCardAcademicGroup;
          status: string;
          published_at: string | null;
        }> | null;
        flashcard_cards: Array<{
          id: string;
          front_text: string;
          back_text: string;
          sort_order: number;
        }> | null;
      }),
      flashcard_materials: unwrapJoinedRecord(
        (data as {
          flashcard_materials: Array<{
            id: string;
            title: string;
            academic_group: FlashCardAcademicGroup;
            status: string;
            published_at: string | null;
          }> | null;
        }).flashcard_materials,
      ),
    } as Parameters<typeof mapPublishedFlashCardDeck>[0]["subtopic"],
    progressRows: (progressResult.data ?? []) as Parameters<typeof mapPublishedFlashCardDeck>[0]["progressRows"],
  });
}

export async function saveStudentFlashCardDifficulty(
  input: {
    userId: string;
    cardId: string;
    difficulty: FlashCardDifficulty;
  },
  client: FlashCardApiClient = getSupabaseBrowserClient(),
) {
  const { error } = await client
    .from("student_flashcard_progress")
    .upsert({
      user_id: input.userId,
      card_id: input.cardId,
      difficulty: input.difficulty,
      last_reviewed_at: new Date().toISOString(),
    }, {
      onConflict: "user_id,card_id",
    });

  if (error) {
    throw new Error(error.message);
  }
}

export async function listMentorFlashCardMaterials(
  client: FlashCardApiClient = getSupabaseBrowserClient(),
) {
  const { data, error } = await client
    .from("flashcard_materials")
    .select(
      "id, title, academic_group, status, global_summary, processing_error, published_at, updated_at, flashcard_subtopics(id, flashcard_cards(id))",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return mapMentorFlashCardMaterialRows((data ?? []) as Parameters<typeof mapMentorFlashCardMaterialRows>[0]);
}
