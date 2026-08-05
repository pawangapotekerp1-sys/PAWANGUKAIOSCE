import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { HttpError, requireAdmin } from "../_shared/auth.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

type RetryPayload = {
  candidateId?: string;
  notes?: string;
};

type CandidateRow = {
  id: string;
  ingestion_job_id: string;
};

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);

  if (corsResponse) {
    return corsResponse;
  }

  try {
    const { user, service } = await requireAdmin(req);
    const payload = await req.json() as RetryPayload;

    if (!payload.candidateId) {
      throw new HttpError(400, "CANDIDATE_ID_REQUIRED", "candidateId wajib diisi.");
    }

    const { data: candidate, error: candidateError } = await service
      .from("ingested_question_candidates")
      .select("id, ingestion_job_id")
      .eq("id", payload.candidateId)
      .maybeSingle();

    if (candidateError || !candidate) {
      throw new HttpError(
        404,
        "CANDIDATE_NOT_FOUND",
        candidateError?.message ?? "Candidate tidak ditemukan untuk retry.",
      );
    }

    const candidateRow = candidate as CandidateRow;
    const notes = payload.notes?.trim() || "Retry diminta admin untuk ingestion ulang.";
    const { error: verificationError } = await service
      .from("candidate_verifications")
      .insert({
        candidate_id: candidateRow.id,
        reviewer_id: user.id,
        decision: "retry",
        notes,
      });

    if (verificationError) {
      throw new HttpError(500, "RETRY_VERIFICATION_FAILED", verificationError.message);
    }

    const { error: candidateUpdateError } = await service
      .from("ingested_question_candidates")
      .update({
        candidate_status: "needs_review",
      })
      .eq("id", candidateRow.id);

    if (candidateUpdateError) {
      throw new HttpError(500, "RETRY_CANDIDATE_UPDATE_FAILED", candidateUpdateError.message);
    }

    const { error: jobUpdateError } = await service
      .from("ingestion_jobs")
      .update({
        status: "needs_review",
        error_message: null,
      })
      .eq("id", candidateRow.ingestion_job_id);

    if (jobUpdateError) {
      throw new HttpError(500, "RETRY_JOB_UPDATE_FAILED", jobUpdateError.message);
    }

    return jsonResponse({
      job: {
        id: candidateRow.ingestion_job_id,
        status: "needs_review",
      },
      candidate: {
        id: candidateRow.id,
        status: "needs_review",
      },
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
        message: error instanceof Error ? error.message : "Unexpected retry ingestion error.",
      },
      500,
    );
  }
});
