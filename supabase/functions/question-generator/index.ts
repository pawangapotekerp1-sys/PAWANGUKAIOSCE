import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  HttpError,
  createServiceClient,
  requireQuestionBankManager,
} from "../_shared/auth.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  GeminiRequestError,
  generateGeminiStructuredData,
  isGeminiCredentialError,
  testGeminiConnection,
} from "../_shared/gemini-client.ts";
import {
  assertQuestionTopicProximity,
  buildQuestionGeneratorPrompt,
  createQuestionGeneratorResponseSchema,
  createQuestionGeneratorSchema,
  splitQuestionGenerationCount,
  validateEditableGeneratedQuestionItem,
  validateGeneratedQuestionItems,
  type GeneratedQuestionItem,
  type QuestionGeneratorReference,
} from "../_shared/question-generator.ts";
import {
  buildGeneratorCredentialWritePayload,
  buildQuestionBankDeliveryPayload,
  buildQuestionGenerationBatchInsert,
  buildScheduledEventDeliveryPayload,
  ensureQuestionGeneratorAccess,
  validateQuestionGeneratorReferences,
} from "./handler.ts";
import {
  GeneratedReferenceValidationError,
  repairGeneratedReferenceFromPubMed,
  validateGeneratedReferenceBatch,
} from "./reference-validation.ts";

type ServiceClient = ReturnType<typeof createServiceClient>;

type GeneratorCredentialRow = {
  id: string;
  model: string;
  secret_id: string | null;
  last_validated_at: string | null;
  last_error: string | null;
};

type GeneratorBatchRow = {
  id: string;
  created_by: string;
  model: string;
  target_question_count: number;
  reference_count: number;
  status: string;
  generated_count: number;
  failed_reason: string | null;
  created_at: string;
  updated_at: string;
};

type GeneratorReferenceRow = {
  id: string;
  batch_id: string;
  reference_order: number;
  stem: string;
  options_snapshot: Record<string, string>;
  correct_option_key: string;
  explanation_text: string;
};

type GeneratorItemRow = {
  id: string;
  batch_id: string;
  draft_question_id: string | null;
  item_order: number;
  generation_mode: string;
  reference_label: string | null;
  reference_url: string | null;
  status: string;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
};

type DeliveryRow = {
  id: string;
  generation_item_id: string;
  destination_type: string;
  destination_question_id: string | null;
  destination_event_id: string | null;
  destination_event_question_id: string | null;
  block_id: string | null;
  topic_id: string | null;
  delivered_by: string | null;
  created_at: string;
};

type DraftRow = {
  id: string;
  stem: string | null;
  options_snapshot: Array<{ key: string; text: string }>;
  correct_option_key: string | null;
  explanation: string | null;
};

const MAX_TARGET_QUESTION_COUNT = 20;
const MIN_QUESTION_GENERATION_OUTPUT_TOKENS = 8192;
const OUTPUT_TOKENS_PER_GENERATED_QUESTION = 1400;

function mapGeneratedReferenceValidationError(error: GeneratedReferenceValidationError) {
  switch (error.code) {
    case "INVALID_REFERENCE_URL_FORMAT":
      return new HttpError(422, "INVALID_REFERENCE_URL_FORMAT", error.message);
    case "REFERENCE_DOMAIN_NOT_ALLOWED":
      return new HttpError(422, "REFERENCE_DOMAIN_NOT_ALLOWED", error.message);
    case "REFERENCE_URL_UNREACHABLE":
      return new HttpError(422, "REFERENCE_URL_UNREACHABLE", error.message);
  }
}

function mapGeneratorStatus(credential: GeneratorCredentialRow | null) {
  return {
    hasCredential: Boolean(credential?.secret_id),
    model: credential?.model ?? "gemini-3.7-flash",
    lastValidatedAt: credential?.last_validated_at ?? null,
    lastError: credential?.last_error ?? null,
  };
}

async function readGeneratorCredential(service: ServiceClient, userId: string) {
  const { data, error } = await service
    .from("user_ai_credentials")
    .select("id, model, secret_id, last_validated_at, last_error")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "BYOK_READ_FAILED", error.message);
  }

  return (data as GeneratorCredentialRow | null) ?? null;
}

// Deprecated: Credential management is now handled centrally by global-ai-credential-api

async function readVaultSecret(service: ServiceClient, secretId: string) {
  const { data, error } = await service
    .rpc("read_vault_secret", {
      target_secret_id: secretId,
    });

  if (error || typeof data !== "string" || data.length === 0) {
    throw new HttpError(500, "VAULT_READ_FAILED", error?.message ?? "Secret BYOK belum tersedia.");
  }

  return data;
}


function isPostgresDomainError(error: { code?: string | null } | null | undefined) {
  return error?.code === "P0001" || error?.code === "P0002" || error?.code === "23505";
}

async function persistGeneratedQuestionBatch(
  service: ServiceClient,
  {
    batchId,
    generatedItems,
    references,
    userId,
  }: {
    batchId: string;
    generatedItems: GeneratedQuestionItem[];
    references: QuestionGeneratorReference[];
    userId: string;
  },
) {
  const { data, error } = await service
    .rpc("persist_generated_question_batch", {
      target_batch_id: batchId,
      target_generated_items: generatedItems,
      target_references: references,
      target_user_id: userId,
    });

  if (error) {
    if (isPostgresDomainError(error)) {
      throw new HttpError(400, "GENERATION_PERSIST_INVALID", error.message);
    }

    throw new HttpError(500, "GENERATION_PERSIST_FAILED", error.message);
  }

  const persistedRow = Array.isArray(data) ? data[0] : data;

  if (!persistedRow || typeof persistedRow.generated_count !== "number") {
    throw new HttpError(500, "GENERATION_PERSIST_FAILED", "Hasil generator belum berhasil dipersist secara atomik.");
  }

  return {
    batchId: persistedRow.batch_id as string,
    generatedCount: persistedRow.generated_count as number,
  };
}

async function deliverGeneratedItemToQuestionBankRpc(
  service: ServiceClient,
  {
    blockId,
    generationItemId,
    topicId,
    userId,
  }: {
    blockId: string;
    generationItemId: string;
    topicId: string;
    userId: string;
  },
) {
  const { data, error } = await service
    .rpc("deliver_generated_item_to_question_bank", {
      target_block_id: blockId,
      target_generation_item_id: generationItemId,
      target_topic_id: topicId,
      target_user_id: userId,
    });

  if (error) {
    if (isPostgresDomainError(error)) {
      throw new HttpError(error.code === "P0002" ? 404 : 409, "DELIVERY_CONFLICT", error.message);
    }

    throw new HttpError(500, "DELIVERY_CREATE_FAILED", error.message);
  }

  const deliveryRow = Array.isArray(data) ? data[0] : data;

  if (!deliveryRow?.delivery_id || !deliveryRow?.question_id) {
    throw new HttpError(500, "DELIVERY_CREATE_FAILED", "Distribusi ke bank soal tidak mengembalikan data yang lengkap.");
  }

  return {
    deliveryId: deliveryRow.delivery_id as string,
    questionId: deliveryRow.question_id as string,
  };
}

async function deliverGeneratedItemToScheduledEventRpc(
  service: ServiceClient,
  {
    eventId,
    generationItemId,
    userId,
  }: {
    eventId: string;
    generationItemId: string;
    userId: string;
  },
) {
  const { data, error } = await service
    .rpc("deliver_generated_item_to_scheduled_event", {
      target_event_id: eventId,
      target_generation_item_id: generationItemId,
      target_user_id: userId,
    });

  if (error) {
    if (isPostgresDomainError(error)) {
      throw new HttpError(error.code === "P0002" ? 404 : 409, "DELIVERY_CONFLICT", error.message);
    }

    throw new HttpError(500, "DELIVERY_CREATE_FAILED", error.message);
  }

  const deliveryRow = Array.isArray(data) ? data[0] : data;

  if (!deliveryRow?.delivery_id || !deliveryRow?.event_question_id) {
    throw new HttpError(500, "DELIVERY_CREATE_FAILED", "Distribusi ke event tidak mengembalikan data yang lengkap.");
  }

  return {
    deliveryId: deliveryRow.delivery_id as string,
    eventQuestionId: deliveryRow.event_question_id as string,
  };
}

async function loadOwnedGenerationItem(
  service: ServiceClient,
  {
    generationItemId,
    userId,
  }: {
    generationItemId: string;
    userId: string;
  },
) {
  const { data, error } = await service
    .from("question_generation_items")
    .select("id, batch_id, draft_question_id, generation_mode, reference_label, reference_url, batch:question_generation_batches!inner(created_by)")
    .eq("id", generationItemId)
    .eq("batch.created_by", userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "GENERATION_ITEM_READ_FAILED", error.message);
  }

  if (!data) {
    throw new HttpError(404, "GENERATION_ITEM_NOT_FOUND", "Draft generator tidak ditemukan.");
  }

  return data as {
    id: string;
    batch_id: string;
    draft_question_id: string | null;
    generation_mode: string;
    reference_label: string | null;
    reference_url: string | null;
  };
}

async function loadBatchReferences(service: ServiceClient, batchId: string): Promise<QuestionGeneratorReference[]> {
  const { data, error } = await service
    .from("question_generation_references")
    .select("stem, options_snapshot, correct_option_key, explanation_text")
    .eq("batch_id", batchId)
    .order("reference_order", { ascending: true });

  if (error) {
    throw new HttpError(500, "REFERENCE_READ_FAILED", error.message);
  }

  return ((data as Array<{
    stem: string;
    options_snapshot: Record<string, string>;
    correct_option_key: string;
    explanation_text: string;
  }> | null) ?? []).map((reference) => ({
    stem: reference.stem,
    options: reference.options_snapshot as QuestionGeneratorReference["options"],
    correctOptionKey: reference.correct_option_key as QuestionGeneratorReference["correctOptionKey"],
    explanationText: reference.explanation_text,
  }));
}

function mapBatchDetail({
  batch,
  references,
  items,
  drafts,
  deliveries,
}: {
  batch: GeneratorBatchRow;
  references: GeneratorReferenceRow[];
  items: GeneratorItemRow[];
  drafts: DraftRow[];
  deliveries: DeliveryRow[];
}) {
  const draftMap = new Map(drafts.map((draft) => [draft.id, draft]));

  return {
    batch: {
      id: batch.id,
      model: batch.model,
      targetQuestionCount: batch.target_question_count,
      referenceCount: batch.reference_count,
      status: batch.status,
      generatedCount: batch.generated_count,
      failedReason: batch.failed_reason,
      createdAt: batch.created_at,
      updatedAt: batch.updated_at,
    },
    references: references.map((reference) => ({
      id: reference.id,
      order: reference.reference_order,
      stem: reference.stem,
      options: reference.options_snapshot,
      correctOptionKey: reference.correct_option_key,
      explanationText: reference.explanation_text,
    })),
    items: items.map((item) => {
      const draft = item.draft_question_id ? draftMap.get(item.draft_question_id) ?? null : null;
      const itemDeliveries = deliveries.filter((delivery) => delivery.generation_item_id === item.id);

      return {
        id: item.id,
        draftQuestionId: item.draft_question_id,
        order: item.item_order,
        variationMode: item.generation_mode,
        reference: {
          label: item.reference_label ?? "",
          url: item.reference_url ?? "",
        },
        status: item.status,
        editedAt: item.edited_at,
        stem: draft?.stem ?? "",
        options: Object.fromEntries((draft?.options_snapshot ?? []).map((option) => [option.key, option.text])),
        correctOptionKey: draft?.correct_option_key ?? null,
        explanationText: draft?.explanation ?? "",
        deliveries: itemDeliveries.map((delivery) => ({
          id: delivery.id,
          destinationType: delivery.destination_type,
          destinationQuestionId: delivery.destination_question_id,
          destinationEventId: delivery.destination_event_id,
          destinationEventQuestionId: delivery.destination_event_question_id,
          blockId: delivery.block_id,
          topicId: delivery.topic_id,
          deliveredBy: delivery.delivered_by,
          createdAt: delivery.created_at,
        })),
      };
    }),
  };
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);

  if (corsResponse) {
    return corsResponse;
  }

  try {
    const { user, profile, service } = await requireQuestionBankManager(req);
    ensureQuestionGeneratorAccess(profile.role);
    const payload = await req.json();
    const credential = await readGeneratorCredential(service, user.id);

    // Endpoint for testing credential removed since it's centrally managed.


    if (payload.action === "generate") {
      if (!credential?.secret_id) {
        throw new HttpError(400, "BYOK_MISSING", "Belum ada BYOK tersimpan.");
      }

      const references = validateQuestionGeneratorReferences(Array.isArray(payload.references) ? payload.references : []);
      const targetQuestionCount = Number(payload.targetQuestionCount);

      if (
        !Number.isInteger(targetQuestionCount)
        || targetQuestionCount <= 0
        || targetQuestionCount > MAX_TARGET_QUESTION_COUNT
      ) {
        throw new HttpError(
          400,
          "TARGET_COUNT_INVALID",
          `Jumlah soal yang ingin dibuat harus berupa angka positif antara 1 sampai ${MAX_TARGET_QUESTION_COUNT}.`,
        );
      }

      const batchInsert = buildQuestionGenerationBatchInsert({
        createdBy: user.id,
        model: credential.model,
        references,
        targetQuestionCount,
      });
      const { data: batchData, error: batchError } = await service
        .from("question_generation_batches")
        .insert(batchInsert)
        .select("id")
        .single();

      if (batchError || !batchData) {
        throw new HttpError(500, "GENERATION_BATCH_CREATE_FAILED", batchError?.message ?? "Batch generator belum berhasil dibuat.");
      }

      const batchId = (batchData as { id: string }).id;

      try {
        const {
          newCaseSameConceptCount,
          differentTrapSameObjectiveCount,
          reverseReasoningCount,
        } = splitQuestionGenerationCount(targetQuestionCount);
        const apiKey = await readVaultSecret(service, credential.secret_id);
        const prompt = buildQuestionGeneratorPrompt({
          newCaseSameConceptCount,
          differentTrapSameObjectiveCount,
          reverseReasoningCount,
          references,
          targetQuestionCount,
        });
        const generatedPayload = await generateGeminiStructuredData<GeneratedQuestionItem[]>({
          apiKey,
          model: credential.model,
          prompt,
          maxOutputTokens: Math.max(
            MIN_QUESTION_GENERATION_OUTPUT_TOKENS,
            targetQuestionCount * OUTPUT_TOKENS_PER_GENERATED_QUESTION,
          ),
          responseMimeType: "application/json",
          responseSchema: createQuestionGeneratorResponseSchema(targetQuestionCount),
        });
        const generatedItems = validateGeneratedQuestionItems(
          generatedPayload,
          createQuestionGeneratorSchema(targetQuestionCount),
          { references },
        );
        const normalizedGeneratedItems = await validateGeneratedReferenceBatch(generatedItems, fetch, {
          repairReference: (item) => repairGeneratedReferenceFromPubMed(item),
        });

        assertQuestionTopicProximity({
          references,
          generatedItems: normalizedGeneratedItems,
        });

        const persistedBatch = await persistGeneratedQuestionBatch(service, {
          batchId,
          generatedItems: normalizedGeneratedItems,
          references,
          userId: user.id,
        });

        return jsonResponse({
          batchId: persistedBatch.batchId,
          generatedCount: persistedBatch.generatedCount,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Question generation failed.";
        await service
          .from("question_generation_batches")
          .update({
            status: "failed",
            failed_reason: message,
          })
          .eq("id", batchId);
        throw error;
      }
    }

    if (payload.action === "get-batch") {
      if (typeof payload.batchId !== "string" || payload.batchId.trim().length === 0) {
        throw new HttpError(400, "BATCH_ID_REQUIRED", "Batch generator yang ingin dibuka wajib dipilih.");
      }

      const [batchResponse, referenceResponse, itemResponse] = await Promise.all([
        service
          .from("question_generation_batches")
          .select("id, created_by, model, target_question_count, reference_count, status, generated_count, failed_reason, created_at, updated_at")
          .eq("id", payload.batchId)
          .eq("created_by", user.id)
          .maybeSingle(),
        service
          .from("question_generation_references")
          .select("id, batch_id, reference_order, stem, options_snapshot, correct_option_key, explanation_text")
          .eq("batch_id", payload.batchId)
          .order("reference_order", { ascending: true }),
        service
          .from("question_generation_items")
          .select("id, batch_id, draft_question_id, item_order, generation_mode, reference_label, reference_url, status, edited_at, created_at, updated_at")
          .eq("batch_id", payload.batchId)
          .order("item_order", { ascending: true }),
      ]);

      if (batchResponse.error || !batchResponse.data) {
        throw new HttpError(404, "BATCH_NOT_FOUND", batchResponse.error?.message ?? "Batch generator tidak ditemukan.");
      }

      if (referenceResponse.error || itemResponse.error) {
        throw new HttpError(500, "BATCH_DETAIL_READ_FAILED", referenceResponse.error?.message ?? itemResponse.error?.message ?? "Detail batch generator belum berhasil dimuat.");
      }

      const itemRows = (itemResponse.data as GeneratorItemRow[] | null) ?? [];
      const draftIds = itemRows.map((item) => item.draft_question_id).filter((value): value is string => Boolean(value));
      const [draftResponse, deliveryResponse] = await Promise.all([
        draftIds.length
          ? service
            .from("question_upload_items")
            .select("id, stem, options_snapshot, correct_option_key, explanation")
            .in("id", draftIds)
          : Promise.resolve({ data: [], error: null }),
        service
          .from("question_generation_deliveries")
          .select("id, generation_item_id, destination_type, destination_question_id, destination_event_id, destination_event_question_id, block_id, topic_id, delivered_by, created_at")
          .in("generation_item_id", itemRows.map((item) => item.id)),
      ]);

      if (draftResponse.error || deliveryResponse.error) {
        throw new HttpError(500, "BATCH_CHILDREN_READ_FAILED", draftResponse.error?.message ?? deliveryResponse.error?.message ?? "Detail draft generator belum berhasil dimuat.");
      }

      return jsonResponse({
        detail: mapBatchDetail({
          batch: batchResponse.data as GeneratorBatchRow,
          references: (referenceResponse.data as GeneratorReferenceRow[] | null) ?? [],
          items: itemRows,
          drafts: (draftResponse.data as DraftRow[] | null) ?? [],
          deliveries: (deliveryResponse.data as DeliveryRow[] | null) ?? [],
        }),
      });
    }

    if (payload.action === "update-item") {
      const generationItemId = typeof payload.generationItemId === "string" ? payload.generationItemId : "";
      const item = await loadOwnedGenerationItem(service, {
        generationItemId,
        userId: user.id,
      });

      if (!item.draft_question_id) {
        throw new HttpError(400, "DRAFT_LINK_MISSING", "Draft generator ini belum terhubung ke draft internal.");
      }

      const [validatedReference] = validateQuestionGeneratorReferences([
        {
          stem: typeof payload.stem === "string" ? payload.stem : "",
          options: typeof payload.options === "object" && payload.options ? payload.options as Record<string, string> : {},
          correctOptionKey: typeof payload.correctOptionKey === "string" ? payload.correctOptionKey : "",
          explanationText: typeof payload.explanationText === "string" ? payload.explanationText : "",
        },
      ]);
      const references = await loadBatchReferences(service, item.batch_id);
      const editableDraft = validateEditableGeneratedQuestionItem({
        ...validatedReference,
        variationMode: item.generation_mode as GeneratedQuestionItem["variationMode"],
      });

      try {
        assertQuestionTopicProximity({
          references,
          generatedItems: [editableDraft],
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Draft hasil edit terlalu jauh dari topik referensi.";
        throw new HttpError(400, "TOPIC_DRIFT", message);
      }

      const { error: draftError } = await service
        .from("question_upload_items")
        .update({
          stem: validatedReference.stem,
          options_snapshot: Object.entries(validatedReference.options).map(([key, text]) => ({ key, text })),
          correct_option_key: validatedReference.correctOptionKey,
          explanation: validatedReference.explanationText,
          updated_by: user.id,
        })
        .eq("id", item.draft_question_id);

      if (draftError) {
        throw new HttpError(500, "DRAFT_UPDATE_FAILED", draftError.message);
      }

      const { error: itemError } = await service
        .from("question_generation_items")
        .update({
          status: "draft_edited",
          edited_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (itemError) {
        throw new HttpError(500, "GENERATION_ITEM_UPDATE_FAILED", itemError.message);
      }

      return jsonResponse({
        itemId: item.id,
        status: "draft_edited",
      });
    }

    if (payload.action === "deliver-to-question-bank") {
      const generationItemId = typeof payload.generationItemId === "string" ? payload.generationItemId : "";
      const deliveryPayload = buildQuestionBankDeliveryPayload({
        generationItemId,
        deliveredBy: user.id,
        blockId: typeof payload.blockId === "string" ? payload.blockId : "",
        topicId: typeof payload.topicId === "string" ? payload.topicId : "",
      });
      const result = await deliverGeneratedItemToQuestionBankRpc(service, {
        blockId: deliveryPayload.block_id,
        generationItemId: deliveryPayload.generation_item_id,
        topicId: deliveryPayload.topic_id,
        userId: user.id,
      });

      return jsonResponse({
        deliveryId: result.deliveryId,
        questionId: result.questionId,
      });
    }

    if (payload.action === "deliver-to-scheduled-event") {
      const generationItemId = typeof payload.generationItemId === "string" ? payload.generationItemId : "";
      const deliveryPayload = buildScheduledEventDeliveryPayload({
        generationItemId,
        deliveredBy: user.id,
        eventId: typeof payload.eventId === "string" ? payload.eventId : "",
      });
      const result = await deliverGeneratedItemToScheduledEventRpc(service, {
        eventId: deliveryPayload.destination_event_id,
        generationItemId: deliveryPayload.generation_item_id,
        userId: user.id,
      });

      return jsonResponse({
        deliveryId: result.deliveryId,
        eventQuestionId: result.eventQuestionId,
      });
    }

    throw new HttpError(400, "INVALID_ACTION", "Aksi question generator tidak dikenali.");
  } catch (error) {
    if (error instanceof GeminiRequestError) {
      return jsonResponse(
        {
          error: "GEMINI_INVALID_RESPONSE",
          message: error.message,
        },
        error.status,
      );
    }

    if (error instanceof GeneratedReferenceValidationError) {
      const mappedError = mapGeneratedReferenceValidationError(error);

      return jsonResponse(
        {
          error: mappedError.code,
          message: mappedError.message,
        },
        mappedError.status,
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
        message: error instanceof Error ? error.message : "Unexpected question generator error.",
      },
      500,
    );
  }
});
