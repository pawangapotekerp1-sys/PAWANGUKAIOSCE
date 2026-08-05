import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { HttpError, requireQuestionBankManager } from "../_shared/auth.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { normalizeStructuredUploadRows } from "../_shared/question-authoring.ts";
import type { TaxonomyLookup } from "../_shared/taxonomy.ts";
import { normalizeDocumentBatchPayload, type DocumentUploadPayload } from "./upload-question-batch.ts";

type UploadBatchPayload = {
  title?: string;
  inputFormat?: "pdf" | "docx" | "csv" | "xlsx" | "manual";
  sourceFileName?: string | null;
  rows?: Array<Record<string, unknown>>;
  documents?: DocumentUploadPayload[];
};

type QuestionBankManagerContext = Awaited<ReturnType<typeof requireQuestionBankManager>>;

async function loadTaxonomy(service: QuestionBankManagerContext["service"]): Promise<TaxonomyLookup> {
  const [{ data: blocks, error: blockError }, { data: topics, error: topicError }] = await Promise.all([
    service
      .from("blocks")
      .select("id, name")
      .eq("is_active", true),
    service
      .from("topics")
      .select("id, name, block_id")
      .eq("is_active", true),
  ]);

  if (blockError) {
    throw new HttpError(500, "TAXONOMY_BLOCK_LOAD_FAILED", blockError.message);
  }

  if (topicError) {
    throw new HttpError(500, "TAXONOMY_TOPIC_LOAD_FAILED", topicError.message);
  }

  return {
    blocks: (blocks as Array<{ id: string; name: string }> | null) ?? [],
    topics: ((topics as Array<{ id: string; name: string; block_id: string | null }> | null) ?? []).map((topic) => ({
      id: topic.id,
      name: topic.name,
      blockId: topic.block_id,
    })),
  };
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);

  if (corsResponse) {
    return corsResponse;
  }

  try {
    const { user, service } = await requireQuestionBankManager(req);
    const payload = await req.json() as UploadBatchPayload;

    if (!payload.title?.trim()) {
      throw new HttpError(400, "BATCH_TITLE_REQUIRED", "title wajib diisi.");
    }

    if (!payload.inputFormat || !["pdf", "docx", "csv", "xlsx", "manual"].includes(payload.inputFormat)) {
      throw new HttpError(400, "INPUT_FORMAT_INVALID", "inputFormat wajib bernilai pdf, docx, csv, xlsx, atau manual.");
    }

    const rows = payload.rows ?? [];
    const documents = payload.documents ?? [];

    if ((payload.inputFormat === "csv" || payload.inputFormat === "xlsx") && rows.length === 0) {
      throw new HttpError(400, "ROWS_REQUIRED", "rows wajib diisi untuk upload terstruktur.");
    }

    if ((payload.inputFormat === "pdf" || payload.inputFormat === "docx") && documents.length === 0) {
      throw new HttpError(400, "DOCUMENTS_REQUIRED", "documents wajib diisi untuk upload dokumen.");
    }

    const normalized = payload.inputFormat === "pdf" || payload.inputFormat === "docx"
      ? normalizeDocumentBatchPayload({
        inputFormat: payload.inputFormat,
        documents,
      })
      : normalizeStructuredUploadRows({
        inputFormat: payload.inputFormat === "xlsx" ? "xlsx" : "csv",
        rows,
        taxonomy: await loadTaxonomy(service),
      });
    const hasIssues = normalized.items.some((item) => item.workflowStatus !== "draft_ready");
    const { data: batch, error: batchError } = await service
      .from("question_upload_batches")
      .insert({
        title: payload.title.trim(),
        input_format: payload.inputFormat,
        source_file_name: payload.sourceFileName ?? null,
        status: hasIssues ? "completed_with_issues" : "completed",
        total_items: normalized.items.length,
        created_by: user.id,
      })
      .select("id, status, total_items")
      .single();

    if (batchError || !batch) {
      throw new HttpError(500, "BATCH_CREATE_FAILED", batchError?.message ?? "Batch upload belum berhasil dibuat.");
    }

    if (normalized.items.length > 0) {
      const { error: itemError } = await service
        .from("question_upload_items")
        .insert(
          normalized.items.map((item) => ({
            batch_id: (batch as { id: string }).id,
            source_row_number: item.sourceRowNumber,
            stem: item.stem,
            options_snapshot: item.options,
            correct_option_key: item.correctOptionKey,
            explanation: item.explanation,
            explanation_source: item.explanationSource,
            block_id: item.blockId,
            topic_id: item.topicId,
            topic_suggestion_reason: item.topicSuggestionStatus === "pending"
              ? "Topic belum diisi saat upload dan menunggu AI suggestion."
              : "Topic sudah dipilih langsung dari upload batch.",
            workflow_status: item.workflowStatus,
            text_extraction_mode: "textExtractionMode" in item ? item.textExtractionMode : null,
            ocr_confidence: "ocrConfidence" in item ? item.ocrConfidence : null,
            parse_confidence: "parseConfidence" in item ? item.parseConfidence : null,
            parse_error: "parseError" in item ? item.parseError : null,
            raw_payload: item.rawPayload,
            created_by: user.id,
            updated_by: user.id,
          })),
        );

      if (itemError) {
        throw new HttpError(500, "ITEM_CREATE_FAILED", itemError.message);
      }
    }

    return jsonResponse({
      batch: {
        id: (batch as { id: string }).id,
        status: (batch as { status: string }).status,
        totalItems: (batch as { total_items: number }).total_items,
      },
      items: normalized.items.map((item, index) => ({
        id: `${(batch as { id: string }).id}-${index + 1}`,
        workflowStatus: item.workflowStatus,
      })),
    });
  } catch (error) {
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
        message: error instanceof Error ? error.message : "Unexpected upload batch error.",
      },
      500,
    );
  }
});
