import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { HttpError, requireAdmin } from "../_shared/auth.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  createReferenceSignedUrl,
  readReferenceDocumentVersion,
} from "../_shared/reference-retrieval.ts";

type IngestionPayload = {
  referenceDocumentId?: string;
  versionId?: string;
  storagePath?: string;
  jobMode?: "verification" | "generation";
};

function buildCandidateDrafts(input: {
  title: string;
  fileName: string;
  versionLabel: string;
  jobMode: "verification" | "generation";
  signedUrl: string | null;
}) {
  const baseEvidence = input.signedUrl
    ? `Sumber ${input.fileName} (${input.versionLabel}) siap direview dari signed URL backend.`
    : `Sumber ${input.fileName} (${input.versionLabel}) siap direview dari storage internal.`;

  const candidates = [
    {
      title: `Clinical Science draft dari ${input.title}`,
      block_label: "Clinical Science",
      topic_label: "Farmakoterapi",
      candidate_status: "needs_review",
      evidence_summary: `${baseEvidence} Fokus awal diarahkan ke pembacaan kasus klinis dan stabilitas jawaban pilihan terapi.`,
    },
    {
      title: `Pharmaceutical Science draft dari ${input.title}`,
      block_label: "Pharmaceutical Science",
      topic_label: "Sterilitas",
      candidate_status: "needs_review",
      evidence_summary: `${baseEvidence} Candidate kedua memotong area sediaan, evaluasi steril, dan kontrol mutu yang perlu verifikasi editor.`,
    },
  ];

  if (input.jobMode === "generation") {
    candidates.push({
      title: `Social, Behavioral and Administrative draft dari ${input.title}`,
      block_label: "Social, Behavioral and Administrative Pharmacy",
      topic_label: "Administrasi Layanan",
      candidate_status: "needs_review",
      evidence_summary: `${baseEvidence} Candidate tambahan dibuat untuk menutup area kebijakan layanan, dokumentasi, dan keputusan administratif.`,
    });
  }

  return candidates;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);

  if (corsResponse) {
    return corsResponse;
  }

  try {
    const { user, service } = await requireAdmin(req);
    const payload = await req.json() as IngestionPayload;

    if (!payload.referenceDocumentId) {
      throw new HttpError(400, "REFERENCE_DOCUMENT_REQUIRED", "referenceDocumentId wajib diisi.");
    }

    const jobMode = payload.jobMode === "generation" ? "generation" : "verification";
    const reference = await readReferenceDocumentVersion(service, {
      referenceDocumentId: payload.referenceDocumentId,
      versionId: payload.versionId ?? null,
      storagePath: payload.storagePath ?? null,
    });
    const signedUrl = await createReferenceSignedUrl(service, reference.version.storage_path);
    const { data: job, error: jobError } = await service
      .from("ingestion_jobs")
      .insert({
        reference_document_id: reference.document.id,
        job_mode: jobMode,
        status: "processing",
        created_by: user.id,
      })
      .select("id, status")
      .single();

    if (jobError || !job) {
      throw new HttpError(500, "INGESTION_JOB_CREATE_FAILED", jobError?.message ?? "Ingestion job belum berhasil dibuat.");
    }

    const drafts = buildCandidateDrafts({
      title: reference.document.title,
      fileName: reference.version.file_name,
      versionLabel: reference.version.version_label,
      jobMode,
      signedUrl,
    });

    const { error: candidateError } = await service
      .from("ingested_question_candidates")
      .insert(
        drafts.map((candidate) => ({
          ingestion_job_id: job.id,
          ...candidate,
        })),
      );

    if (candidateError) {
      await service
        .from("ingestion_jobs")
        .update({
          status: "failed",
          error_message: candidateError.message,
        })
        .eq("id", job.id);
      throw new HttpError(500, "INGESTION_CANDIDATE_CREATE_FAILED", candidateError.message);
    }

    const { error: finalizeError } = await service
      .from("ingestion_jobs")
      .update({
        status: "needs_review",
        error_message: null,
      })
      .eq("id", job.id);

    if (finalizeError) {
      throw new HttpError(500, "INGESTION_JOB_FINALIZE_FAILED", finalizeError.message);
    }

    return jsonResponse({
      job: {
        id: job.id,
        status: "needs_review",
      },
      candidatesCreated: drafts.length,
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
        message: error instanceof Error ? error.message : "Unexpected ingestion error.",
      },
      500,
    );
  }
});
