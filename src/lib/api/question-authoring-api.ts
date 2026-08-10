import { getSupabaseBrowserClient } from "../supabase/browser-client";
import {
  mapEnrichmentQueueItem,
  mapQuestionBankItem,
  mapQuestionBatchCard,
  mapQuestionBatchDetail,
  mapQuestionEditorData,
  mapQuestionDraftEditorViewModel,
  type EnrichmentQueueItemViewModel,
  type QuestionBankItemViewModel,
  type QuestionAuthoringOverviewCard,
  type QuestionBatchCard,
  type QuestionBatchDetailViewModel,
  type QuestionDraftEditorViewModel,
  type QuestionEditorDataViewModel,
} from "../mappers/question-authoring-mappers";

type QuestionAuthoringClient = Pick<ReturnType<typeof getSupabaseBrowserClient>, "from" | "functions" | "rpc" | "storage">;

type TaxonomyBlockRow = {
  id: string;
  name: string;
  slug: string;
  topics?: Array<{
    id: string;
    name: string;
    slug: string;
    is_active?: boolean;
  }> | null;
};

type BatchOverviewRow = {
  id: string;
  title: string;
  input_format: string;
  source_file_name: string | null;
  status: string;
  total_items: number;
  draft_ready_count: number;
  needs_enrichment_count: number;
  needs_review_count: number;
  enrichment_failed_count: number;
  ocr_item_count: number;
  created_at: string;
};

type UploadItemRow = {
  id: string;
  stem: string | null;
  workflow_status: string;
  text_extraction_mode: string | null;
  parse_confidence: number | null;
  ocr_confidence: number | null;
  topic_suggestion_confidence: number | null;
  topic_suggestion_reason: string | null;
  correct_option_key?: string | null;
  explanation_source?: string | null;
  block?: {
    id: string;
    name: string;
  } | Array<{
    id: string;
    name: string;
  }> | null;
  topic?: {
    id: string;
    name: string;
  } | Array<{
    id: string;
    name: string;
  }> | null;
  suggested_topic?: {
    id: string;
    name: string;
  } | Array<{
    id: string;
    name: string;
  }> | null;
};

type DraftDetailRow = {
  id: string;
  batch_id: string;
  stem: string | null;
  options_snapshot: Array<{ key: string; text: string }>;
  correct_option_key: string | null;
  explanation: string | null;
  explanation_source: string | null;
  workflow_status: string;
  batch?: {
    title: string;
    input_format: string;
  } | Array<{
    title: string;
    input_format: string;
  }> | null;
  block?: {
    id: string;
    name: string;
  } | Array<{
    id: string;
    name: string;
  }> | null;
  topic?: {
    id: string;
    name: string;
  } | Array<{
    id: string;
    name: string;
  }> | null;
  suggested_topic?: {
    id: string;
    name: string;
  } | Array<{
    id: string;
    name: string;
  }> | null;
  topic_suggestion_confidence: number | null;
  topic_suggestion_reason: string | null;
  references?: Array<{
    id: string;
    reference_origin: string;
    reference_label: string;
    reference_excerpt: string | null;
  }> | null;
  reviews?: Array<{
    decision: string;
    notes: string | null;
    created_at: string;
  }> | null;
};

type EnrichmentQueueRow = {
  id: string;
  batch_id: string;
  batch_title: string;
  input_format: string;
  stem: string | null;
  workflow_status: string;
  text_extraction_mode: string | null;
  ocr_confidence: number | null;
  parse_confidence: number | null;
  topic_suggestion_confidence: number | null;
  suggested_topic_name: string | null;
  topic_suggestion_reason: string | null;
  reference_count: number;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type FinalQuestionListRow = {
  id: string;
  stem: string;
  status: string;
  updated_at: string;
  question_image_path: string | null;
  block?: {
    id: string;
    name: string;
  } | Array<{
    id: string;
    name: string;
  }> | null;
  topic?: {
    id: string;
    name: string;
  } | Array<{
    id: string;
    name: string;
  }> | null;
  explanation?: {
    explanation: string | null;
    explanation_image_path: string | null;
  } | Array<{
    explanation: string | null;
    explanation_image_path: string | null;
  }> | null;
};

type FinalQuestionEditorRow = {
  id: string;
  stem: string;
  status: string;
  updated_at: string;
  question_image_path: string | null;
  block?: {
    id: string;
    name: string;
  } | Array<{
    id: string;
    name: string;
  }> | null;
  topic?: {
    id: string;
    name: string;
  } | Array<{
    id: string;
    name: string;
  }> | null;
  options?: Array<{
    id: string;
    option_key: string;
    option_text: string;
    is_correct: boolean;
    sort_order: number;
  }> | null;
  explanation?: {
    explanation: string | null;
    explanation_image_path: string | null;
  } | Array<{
    explanation: string | null;
    explanation_image_path: string | null;
  }> | null;
};

export type QuestionTaxonomyBlock = {
  id: string;
  name: string;
  slug: string;
  topics: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

export type ManualQuestionDraftInput = {
  stem: string;
  options: Array<{ key: string; text: string }>;
  correctOptionKey: string | null;
  explanation?: string;
  blockId?: string | null;
  topicId?: string | null;
  createdBy?: string | null;
};

export type ManualQuestionDraftResult = {
  batchId: string;
  itemId: string;
  workflowStatus: string;
};

export type UploadQuestionBatchInput = {
  title: string;
  inputFormat: "pdf" | "docx" | "csv" | "xlsx" | "manual";
  sourceFileName?: string | null;
  rows?: Array<Record<string, unknown>>;
  documents?: Array<{
    fileName: string;
    textContent?: string | null;
    imagePages?: string[];
  }>;
};

export type UploadQuestionBatchResult = {
  batch: {
    id: string;
    status: string;
    totalItems: number;
  };
  items: Array<{
    id: string;
    workflowStatus: string;
  }>;
};

export type QuestionFormOptionInput = {
  key: string;
  text: string;
  isCorrect: boolean;
};

export type QuestionFormInput = {
  stem: string;
  blockId: string | null;
  topicId: string | null;
  status: "draft" | "published" | "archived";
  questionImagePath?: string | null;
  options: QuestionFormOptionInput[];
  explanationText?: string | null;
  explanationImagePath?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

type DeleteQuestionRow = {
  id: string;
  question_image_path: string | null;
  explanation_image_path: string | null;
};

type DeleteQuestionLookupRow = {
  id: string;
  question_image_path: string | null;
  explanation?: {
    explanation_image_path: string | null;
  } | Array<{
    explanation_image_path: string | null;
  }> | null;
};

function resolveRelatedRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function sanitizeFileName(value: string) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "image";
}

async function createSignedMediaUrl(
  client: QuestionAuthoringClient,
  path: string | null,
): Promise<string | null> {
  if (!path) {
    return null;
  }

  const { data, error } = await client.storage
    .from("question-media")
    .createSignedUrl(path, 3600);

  if (error) {
    if (/object not found/i.test(error.message)) {
      return null;
    }

    throw new Error(error.message);
  }

  return data?.signedUrl ?? null;
}

function mapOptionInputForInsert(questionId: string, options: QuestionFormOptionInput[]) {
  return options.map((option, index) => ({
    question_id: questionId,
    option_key: option.key,
    option_text: option.text,
    is_correct: option.isCorrect,
    sort_order: index + 1,
  }));
}

async function syncQuestionExplanation(
  client: QuestionAuthoringClient,
  {
    questionId,
    explanationText,
    explanationImagePath,
    actorId,
  }: {
    questionId: string;
    explanationText?: string | null;
    explanationImagePath?: string | null;
    actorId?: string | null;
  },
) {
  if (!explanationText?.trim() && !explanationImagePath) {
    return;
  }

  const { error } = await client
    .from("question_explanations")
    .upsert({
      question_id: questionId,
      explanation: explanationText?.trim() || null,
      explanation_source: "manual",
      explanation_image_path: explanationImagePath ?? null,
      created_by: actorId ?? null,
      updated_by: actorId ?? null,
    }, {
      onConflict: "question_id",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }
}

function mapBatchOverviewRow(row: BatchOverviewRow) {
  return {
    id: row.id,
    title: row.title,
    inputFormat: row.input_format,
    sourceFileName: row.source_file_name,
    status: row.status,
    totalItems: row.total_items,
    draftReadyCount: row.draft_ready_count,
    needsEnrichmentCount: row.needs_enrichment_count,
    needsReviewCount: row.needs_review_count,
    enrichmentFailedCount: row.enrichment_failed_count,
    ocrItemCount: row.ocr_item_count,
    createdAt: row.created_at,
  };
}

function mapUploadItemRow(row: UploadItemRow) {
  const block = resolveRelatedRow(row.block);
  const topic = resolveRelatedRow(row.topic);
  const suggestedTopic = resolveRelatedRow(row.suggested_topic);

  return {
    id: row.id,
    stem: row.stem,
    workflowStatus: row.workflow_status,
    textExtractionMode: row.text_extraction_mode,
    parseConfidence: row.parse_confidence,
    ocrConfidence: row.ocr_confidence,
    topicSuggestionConfidence: row.topic_suggestion_confidence,
    topicSuggestionReason: row.topic_suggestion_reason,
    blockName: block?.name ?? null,
    topicName: topic?.name ?? null,
    suggestedTopicName: suggestedTopic?.name ?? null,
    correctOptionKey: row.correct_option_key ?? null,
    explanationSource: row.explanation_source ?? null,
  };
}

function deriveManualWorkflowStatus(
  correctOptionKey: string | null,
  explanation: string | undefined,
): string {
  if (correctOptionKey && explanation?.trim()) {
    return "draft_ready";
  }

  return "needs_enrichment";
}

export async function listQuestionTaxonomy(
  client: QuestionAuthoringClient = getSupabaseBrowserClient(),
): Promise<QuestionTaxonomyBlock[]> {
  const { data, error } = await client
    .from("blocks")
    .select("id, name, slug, topics:topics(id, name, slug, is_active)")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as TaxonomyBlockRow[] | null) ?? []).map((block) => ({
    id: block.id,
    name: block.name,
    slug: block.slug,
    topics: (block.topics ?? [])
      .filter((topic) => topic.is_active ?? true)
      .map((topic) => ({
        id: topic.id,
        name: topic.name,
        slug: topic.slug,
      }))
      .sort((left, right) => left.name.localeCompare(right.name, "id-ID")),
  }));
}

export async function listQuestionBank(
  client: QuestionAuthoringClient = getSupabaseBrowserClient(),
): Promise<QuestionBankItemViewModel[]> {
  const { data, error } = await client
    .from("questions")
    .select("id, stem, status, updated_at, question_image_path, block:blocks(id, name), topic:topics(id, name), explanation:question_explanations(explanation, explanation_image_path)")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data as FinalQuestionListRow[] | null) ?? [];

  return Promise.all(rows.map(async (row) => {
    const block = resolveRelatedRow(row.block);
    const topic = resolveRelatedRow(row.topic);
    const explanation = resolveRelatedRow(row.explanation);
    const questionImageUrl = await createSignedMediaUrl(client, row.question_image_path);
    const explanationImageUrl = await createSignedMediaUrl(client, explanation?.explanation_image_path ?? null);

    return mapQuestionBankItem({
      id: row.id,
      stem: row.stem,
      status: row.status,
      blockId: block?.id ?? null,
      blockName: block?.name ?? null,
      topicId: topic?.id ?? null,
      topicName: topic?.name ?? null,
      questionImageUrl,
      explanationText: explanation?.explanation ?? null,
      explanationImageUrl,
      updatedAt: row.updated_at,
    });
  }));
}

export async function getQuestionEditorData(
  {
    questionId,
    client = getSupabaseBrowserClient(),
  }: {
    questionId: string;
    client?: QuestionAuthoringClient;
  },
): Promise<QuestionEditorDataViewModel | null> {
  const { data, error } = await client
    .from("questions")
    .select("id, stem, status, updated_at, question_image_path, block:blocks(id, name), topic:topics(id, name), options:question_options(id, option_key, option_text, is_correct, sort_order), explanation:question_explanations(explanation, explanation_image_path)")
    .eq("id", questionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const row = data as FinalQuestionEditorRow;
  const block = resolveRelatedRow(row.block);
  const topic = resolveRelatedRow(row.topic);
  const explanation = resolveRelatedRow(row.explanation);

  return mapQuestionEditorData({
    id: row.id,
    stem: row.stem,
    status: row.status,
    blockId: block?.id ?? null,
    blockName: block?.name ?? null,
    topicId: topic?.id ?? null,
    topicName: topic?.name ?? null,
    questionImagePath: row.question_image_path,
    questionImageUrl: await createSignedMediaUrl(client, row.question_image_path),
    explanationText: explanation?.explanation ?? null,
    explanationImagePath: explanation?.explanation_image_path ?? null,
    explanationImageUrl: await createSignedMediaUrl(client, explanation?.explanation_image_path ?? null),
    options: (row.options ?? []).map((option) => ({
      id: option.id,
      key: option.option_key,
      text: option.option_text,
      isCorrect: option.is_correct,
      sortOrder: option.sort_order,
    })),
    updatedAt: row.updated_at,
  });
}

export async function createQuestion(
  {
    input,
    client = getSupabaseBrowserClient(),
  }: {
    input: QuestionFormInput;
    client?: QuestionAuthoringClient;
  },
): Promise<{ id: string }> {
  const { data, error } = await client
    .from("questions")
    .insert({
      stem: input.stem,
      block_id: input.blockId || null,
      topic_id: input.topicId || null,
      status: input.status,
      question_image_path: input.questionImagePath ?? null,
      created_by: input.createdBy ?? null,
      updated_by: input.updatedBy ?? input.createdBy ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Soal belum berhasil dibuat.");
  }

  const questionId = (data as { id: string }).id;
  const { error: optionError } = await client
    .from("question_options")
    .insert(mapOptionInputForInsert(questionId, input.options))
    .select("id");

  if (optionError) {
    throw new Error(optionError.message);
  }

  if (input.explanationText?.trim() || input.explanationImagePath) {
    const { error: explanationError } = await client
      .from("question_explanations")
      .insert({
        question_id: questionId,
        explanation: input.explanationText?.trim() || null,
        explanation_source: "manual",
        explanation_image_path: input.explanationImagePath ?? null,
        created_by: input.createdBy ?? null,
        updated_by: input.updatedBy ?? input.createdBy ?? null,
      })
      .select("id")
      .single();

    if (explanationError) {
      throw new Error(explanationError.message);
    }
  }

  return {
    id: questionId,
  };
}

export async function updateQuestion(
  {
    questionId,
    input,
    client = getSupabaseBrowserClient(),
  }: {
    questionId: string;
    input: QuestionFormInput;
    client?: QuestionAuthoringClient;
  },
): Promise<{ id: string }> {
  const { data, error } = await client
    .from("questions")
    .update({
      stem: input.stem,
      block_id: input.blockId || null,
      topic_id: input.topicId || null,
      status: input.status,
      question_image_path: input.questionImagePath ?? null,
      updated_by: input.updatedBy ?? null,
    })
    .eq("id", questionId)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Soal belum berhasil diperbarui.");
  }

  const { error: deleteError } = await client
    .from("question_options")
    .delete()
    .eq("question_id", questionId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const { error: optionError } = await client
    .from("question_options")
    .insert(mapOptionInputForInsert(questionId, input.options))
    .select("id");

  if (optionError) {
    throw new Error(optionError.message);
  }

  await syncQuestionExplanation(client, {
    questionId,
    explanationText: input.explanationText,
    explanationImagePath: input.explanationImagePath,
    actorId: input.updatedBy ?? null,
  });

  return {
    id: (data as { id: string }).id,
  };
}

export async function archiveQuestion(
  {
    questionId,
    client = getSupabaseBrowserClient(),
  }: {
    questionId: string;
    client?: QuestionAuthoringClient;
  },
): Promise<{ id: string; status: string }> {
  const { data, error } = await client
    .from("questions")
    .update({
      status: "archived",
    })
    .eq("id", questionId)
    .select("id, status")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Soal belum berhasil diarsipkan.");
  }

  return data as { id: string; status: string };
}

async function cleanupDeletedQuestionMedia(
  client: QuestionAuthoringClient,
  row: DeleteQuestionRow,
): Promise<void> {
  await cleanupDeletedQuestionMediaRows(client, [row]);
}

async function cleanupDeletedQuestionMediaRows(
  client: QuestionAuthoringClient,
  rows: DeleteQuestionRow[],
): Promise<void> {
  const mediaPaths = rows
    .flatMap((row) => [row.question_image_path, row.explanation_image_path])
    .filter((value): value is string => Boolean(value));

  if (!mediaPaths.length) {
    return;
  }

  const { error } = await client.storage
    .from("question-media")
    .remove(mediaPaths);

  if (error) {
    console.warn("Question media cleanup failed after delete:", error.message);
  }
}

function isMissingDeleteQuestionRpcError(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return error?.code === "PGRST202" || /could not find the function public\.delete_question/i.test(message);
}

function isMissingDeleteQuestionsRpcError(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return error?.code === "PGRST202" || /could not find the function public\.delete_questions/i.test(message);
}

function mapDeleteQuestionErrorMessage(message: string) {
  if (
    /violates foreign key constraint/i.test(message)
    || /exam_template_items_question_id_fkey/i.test(message)
    || /attempt_items_question_id_fkey/i.test(message)
  ) {
    return "Soal ini sudah dipakai di template atau riwayat try out sehingga tidak dapat dihapus.";
  }

  return message;
}

async function lookupQuestionDeleteMeta(
  client: QuestionAuthoringClient,
  questionId: string,
): Promise<DeleteQuestionRow> {
  const { data, error } = await client
    .from("questions")
    .select("id, question_image_path, explanation:question_explanations(explanation_image_path)")
    .eq("id", questionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Soal yang ingin dihapus tidak ditemukan.");
  }

  const row = data as DeleteQuestionLookupRow;
  const explanation = resolveRelatedRow(row.explanation);

  return {
    id: row.id,
    question_image_path: row.question_image_path,
    explanation_image_path: explanation?.explanation_image_path ?? null,
  };
}

async function deleteQuestionDirectly(
  client: QuestionAuthoringClient,
  questionId: string,
): Promise<{ deletedIds: string[] }> {
  const deleteMeta = await lookupQuestionDeleteMeta(client, questionId);
  const { data, error } = await client
    .from("questions")
    .delete()
    .eq("id", questionId)
    .select("id")
    .single();

  if (error) {
    throw new Error(mapDeleteQuestionErrorMessage(error.message));
  }

  if (!(data as { id?: string } | null)?.id) {
    throw new Error("Soal belum berhasil dihapus.");
  }

  await cleanupDeletedQuestionMedia(client, deleteMeta);

  return {
    deletedIds: [deleteMeta.id],
  };
}

export async function deleteQuestion(
  {
    questionId,
    client = getSupabaseBrowserClient(),
  }: {
    questionId: string;
    client?: QuestionAuthoringClient;
  },
): Promise<{ deletedIds: string[] }> {
  const { data, error } = await client.rpc("delete_question", {
    target_question_id: questionId,
  });

  if (error) {
    if (isMissingDeleteQuestionRpcError(error)) {
      return deleteQuestionDirectly(client, questionId);
    }

    throw new Error(mapDeleteQuestionErrorMessage(error.message));
  }

  const deletedRow = ((data as DeleteQuestionRow[] | null) ?? [])[0];

  if (!deletedRow?.id) {
    throw new Error("Soal belum berhasil dihapus.");
  }

  await cleanupDeletedQuestionMedia(client, deletedRow);

  return {
    deletedIds: [deletedRow.id],
  };
}

export async function deleteQuestions(
  {
    questionIds,
    client = getSupabaseBrowserClient(),
  }: {
    questionIds: string[];
    client?: QuestionAuthoringClient;
  },
): Promise<{ deletedIds: string[] }> {
  const { data, error } = await client.rpc("delete_questions", {
    target_question_ids: questionIds,
  });

  if (error) {
    if (isMissingDeleteQuestionsRpcError(error)) {
      throw new Error("Hapus bulk belum tersedia. Jalankan migration terbaru lalu coba lagi.");
    }

    throw new Error(mapDeleteQuestionErrorMessage(error.message));
  }

  const deletedRows = (data as DeleteQuestionRow[] | null) ?? [];
  const deletedIds = deletedRows.map((row) => row.id).filter((value): value is string => Boolean(value));

  if (deletedIds.length !== questionIds.length) {
    throw new Error("Soal terpilih belum berhasil dihapus.");
  }

  await cleanupDeletedQuestionMediaRows(client, deletedRows);

  return {
    deletedIds,
  };
}

export async function uploadQuestionMedia(
  {
    questionId,
    kind,
    file,
    client = getSupabaseBrowserClient(),
  }: {
    questionId: string;
    kind: "question" | "explanation";
    file: File;
    client?: QuestionAuthoringClient;
  },
): Promise<{ path: string; signedUrl: string | null }> {
  const path = `${kind}/questions/${questionId}-${sanitizeFileName(file.name)}`;
  const { error } = await client.storage
    .from("question-media")
    .upload(path, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    path,
    signedUrl: await createSignedMediaUrl(client, path),
  };
}

export async function removeQuestionMedia(
  {
    path,
    client = getSupabaseBrowserClient(),
  }: {
    path: string;
    client?: QuestionAuthoringClient;
  },
): Promise<void> {
  const { error } = await client.storage
    .from("question-media")
    .remove([path]);

  if (error) {
    throw new Error(error.message);
  }
}

export async function listQuestionBatches(
  client: QuestionAuthoringClient = getSupabaseBrowserClient(),
): Promise<QuestionBatchCard[]> {
  const { data, error } = await client
    .from("admin_question_batch_overview")
    .select("id, title, input_format, source_file_name, status, total_items, draft_ready_count, needs_enrichment_count, needs_review_count, enrichment_failed_count, ocr_item_count, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as BatchOverviewRow[] | null) ?? []).map((row) =>
    mapQuestionBatchCard(mapBatchOverviewRow(row)));
}

export async function getQuestionBatchDetail(
  {
    batchId,
    client = getSupabaseBrowserClient(),
  }: {
    batchId: string;
    client?: QuestionAuthoringClient;
  },
): Promise<QuestionBatchDetailViewModel> {
  const [batchResponse, itemsResponse] = await Promise.all([
    client
      .from("admin_question_batch_overview")
      .select("id, title, input_format, source_file_name, status, total_items, draft_ready_count, needs_enrichment_count, needs_review_count, enrichment_failed_count, ocr_item_count, created_at")
      .eq("id", batchId)
      .single(),
    client
      .from("question_upload_items")
      .select("id, stem, workflow_status, text_extraction_mode, parse_confidence, ocr_confidence, topic_suggestion_confidence, topic_suggestion_reason, correct_option_key, explanation_source, block:blocks(id, name), topic:topics(id, name), suggested_topic:topics!question_upload_items_suggested_topic_id_fkey(id, name)")
      .eq("batch_id", batchId)
      .order("created_at", { ascending: true }),
  ]);

  if (batchResponse.error) {
    throw new Error(batchResponse.error.message);
  }

  if (itemsResponse.error) {
    throw new Error(itemsResponse.error.message);
  }

  return mapQuestionBatchDetail({
    ...mapBatchOverviewRow(batchResponse.data as BatchOverviewRow),
    items: ((itemsResponse.data as UploadItemRow[] | null) ?? []).map(mapUploadItemRow),
  });
}

export async function getQuestionDraftDetail(
  {
    draftId,
    client = getSupabaseBrowserClient(),
  }: {
    draftId: string;
    client?: QuestionAuthoringClient;
  },
): Promise<QuestionDraftEditorViewModel | null> {
  const { data, error } = await client
    .from("question_upload_items")
    .select("id, batch_id, stem, options_snapshot, correct_option_key, explanation, explanation_source, workflow_status, batch:question_upload_batches(title, input_format), block:blocks(id, name), topic:topics(id, name), suggested_topic:topics!question_upload_items_suggested_topic_id_fkey(id, name), topic_suggestion_confidence, topic_suggestion_reason, references:question_draft_references(id, reference_origin, reference_label, reference_excerpt), reviews:question_draft_reviews(decision, notes, created_at)")
    .eq("id", draftId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const row = data as DraftDetailRow;
  const batch = resolveRelatedRow(row.batch);
  const block = resolveRelatedRow(row.block);
  const topic = resolveRelatedRow(row.topic);
  const suggestedTopic = resolveRelatedRow(row.suggested_topic);
  const latestReview = [...(row.reviews ?? [])].sort((left, right) =>
    right.created_at.localeCompare(left.created_at))[0] ?? null;

  return mapQuestionDraftEditorViewModel({
    id: row.id,
    batchId: row.batch_id,
    batchTitle: batch?.title ?? "Batch tanpa nama",
    batchFormat: batch?.input_format ?? "manual",
    stem: row.stem,
    workflowStatus: row.workflow_status,
    blockId: block?.id ?? null,
    blockName: block?.name ?? null,
    topicId: topic?.id ?? null,
    topicName: topic?.name ?? null,
    suggestedTopicId: suggestedTopic?.id ?? null,
    suggestedTopicName: suggestedTopic?.name ?? null,
    topicSuggestionConfidence: row.topic_suggestion_confidence,
    topicSuggestionReason: row.topic_suggestion_reason,
    options: row.options_snapshot ?? [],
    correctOptionKey: row.correct_option_key,
    explanation: row.explanation,
    explanationSource: row.explanation_source,
    references: (row.references ?? []).map((reference) => ({
      id: reference.id,
      origin: reference.reference_origin,
      label: reference.reference_label,
      excerpt: reference.reference_excerpt,
    })),
    lastReview: latestReview
      ? {
        decision: latestReview.decision,
        notes: latestReview.notes,
        createdAt: latestReview.created_at,
      }
      : null,
  });
}

export async function createManualQuestionDraft(
  input: ManualQuestionDraftInput,
  client: QuestionAuthoringClient = getSupabaseBrowserClient(),
): Promise<ManualQuestionDraftResult> {
  const workflowStatus = deriveManualWorkflowStatus(input.correctOptionKey, input.explanation);
  const { data: batch, error: batchError } = await client
    .from("question_upload_batches")
    .insert({
      title: "Manual draft",
      input_format: "manual",
      source_file_name: null,
      status: "completed",
      total_items: 1,
      created_by: input.createdBy ?? null,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    throw new Error(batchError?.message ?? "Batch manual belum berhasil dibuat.");
  }

  const { data: item, error: itemError } = await client
    .from("question_upload_items")
    .insert({
      batch_id: (batch as { id: string }).id,
      stem: input.stem,
      options_snapshot: input.options,
      correct_option_key: input.correctOptionKey,
      explanation: input.explanation?.trim() || null,
      explanation_source: input.explanation?.trim() ? "upload_original" : null,
      block_id: input.blockId ?? null,
      topic_id: input.topicId ?? null,
      workflow_status: workflowStatus,
      created_by: input.createdBy ?? null,
      updated_by: input.createdBy ?? null,
      raw_payload: {
        source: "manual",
      },
    })
    .select("id, workflow_status")
    .single();

  if (itemError || !item) {
    throw new Error(itemError?.message ?? "Draft manual belum berhasil dibuat.");
  }

  return {
    batchId: (batch as { id: string }).id,
    itemId: (item as { id: string }).id,
    workflowStatus: (item as { workflow_status: string }).workflow_status,
  };
}

export async function reviewQuestionTopicSuggestion(
  input: {
    draftId: string;
    topicId: string;
    reviewerId?: string | null;
  },
  client: QuestionAuthoringClient = getSupabaseBrowserClient(),
): Promise<{
  id: string;
  topicId: string | null;
  workflowStatus: string;
}> {
  const { data, error } = await client
    .from("question_upload_items")
    .update({
      topic_id: input.topicId,
      updated_by: input.reviewerId ?? null,
    })
    .eq("id", input.draftId)
    .select("id, topic_id, workflow_status")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Review topic suggestion belum berhasil disimpan.");
  }

  const row = data as {
    id: string;
    topic_id: string | null;
    workflow_status: string;
  };

  return {
    id: row.id,
    topicId: row.topic_id,
    workflowStatus: row.workflow_status,
  };
}

export async function listQuestionEnrichmentQueue(
  client: QuestionAuthoringClient = getSupabaseBrowserClient(),
): Promise<EnrichmentQueueItemViewModel[]> {
  const { data, error } = await client
    .from("admin_question_enrichment_queue")
    .select("id, batch_id, batch_title, input_format, stem, workflow_status, text_extraction_mode, ocr_confidence, parse_confidence, topic_suggestion_confidence, suggested_topic_name, topic_suggestion_reason, reference_count, last_reviewed_at, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as EnrichmentQueueRow[] | null) ?? []).map((row) =>
    mapEnrichmentQueueItem({
      id: row.id,
      batchId: row.batch_id,
      batchTitle: row.batch_title,
      inputFormat: row.input_format,
      stem: row.stem,
      workflowStatus: row.workflow_status,
      textExtractionMode: row.text_extraction_mode,
      ocrConfidence: row.ocr_confidence,
      parseConfidence: row.parse_confidence,
      topicSuggestionConfidence: row.topic_suggestion_confidence,
      suggestedTopicName: row.suggested_topic_name,
      topicSuggestionReason: row.topic_suggestion_reason,
      referenceCount: row.reference_count,
      lastReviewedAt: row.last_reviewed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
}

export async function uploadQuestionBatch(
  input: UploadQuestionBatchInput,
  client: QuestionAuthoringClient = getSupabaseBrowserClient(),
): Promise<UploadQuestionBatchResult> {
  const { data, error } = await client.functions.invoke("upload-question-batch", {
    body: {
      title: input.title,
      inputFormat: input.inputFormat,
      sourceFileName: input.sourceFileName ?? null,
      rows: input.rows ?? [],
      documents: input.documents ?? [],
    },
  });

  if (error) {
    throw error;
  }

  return data as UploadQuestionBatchResult;
}

export async function listQuestionAuthoringOverviewCards(
  client: QuestionAuthoringClient = getSupabaseBrowserClient(),
): Promise<QuestionAuthoringOverviewCard[]> {
  const countQuery = (workflowStatus: string) =>
    client
      .from("question_upload_items")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("workflow_status", workflowStatus);

  const publishedTemplateQuery = client
    .from("exam_templates")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("status", "published");

  const [draftReadyResponse, needsEnrichmentResponse, publishedTemplateResponse] = await Promise.all([
    countQuery("draft_ready"),
    countQuery("needs_enrichment"),
    publishedTemplateQuery,
  ]);

  if (draftReadyResponse.error) {
    throw new Error(draftReadyResponse.error.message);
  }

  if (needsEnrichmentResponse.error) {
    throw new Error(needsEnrichmentResponse.error.message);
  }

  if (publishedTemplateResponse.error) {
    throw new Error(publishedTemplateResponse.error.message);
  }

  return [
    {
      id: "draft-ready",
      title: "Draft siap dicek",
      detail: `${draftReadyResponse.count ?? 0} soal siap masuk editor dan review akhir.`,
    },
    {
      id: "needs-enrichment",
      title: "Butuh enrichment",
      detail: `${needsEnrichmentResponse.count ?? 0} soal masih perlu jawaban atau pembahasan tambahan.`,
    },
    {
      id: "published-templates",
      title: "Template live",
      detail: `${publishedTemplateResponse.count ?? 0} template try out sudah siap dipakai di katalog student.`,
    },
  ];
}
