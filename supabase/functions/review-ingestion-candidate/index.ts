import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { HttpError, requireAdmin } from "../_shared/auth.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { resolveIngestionJobStatusAfterDecision } from "../_shared/review-queue.ts";

type ReviewDecision = "approve" | "reject";

type ReviewPayload = {
  candidateId?: string;
  decision?: ReviewDecision;
  notes?: string;
};

type CandidateRow = {
  id: string;
  ingestion_job_id: string;
};

function isReviewDecision(value: unknown): value is ReviewDecision {
  return value === "approve" || value === "reject";
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);

  if (corsResponse) {
    return corsResponse;
  }

  try {
    const { user, service } = await requireAdmin(req);
    const payload = await req.json() as ReviewPayload;

    if (!payload.candidateId) {
      throw new HttpError(400, "CANDIDATE_ID_REQUIRED", "candidateId wajib diisi.");
    }

    if (!isReviewDecision(payload.decision)) {
      throw new HttpError(400, "REVIEW_DECISION_INVALID", "decision wajib bernilai approve atau reject.");
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
        candidateError?.message ?? "Candidate tidak ditemukan untuk direview.",
      );
    }

    const candidateRow = candidate as CandidateRow;
    const trimmedNotes = payload.notes?.trim() || null;
    const nextCandidateStatus = payload.decision === "approve" ? "approved" : "rejected";

    const { error: verificationError } = await service
      .from("candidate_verifications")
      .insert({
        candidate_id: candidateRow.id,
        reviewer_id: user.id,
        decision: payload.decision,
        notes: trimmedNotes,
      });

    if (verificationError) {
      throw new HttpError(500, "REVIEW_VERIFICATION_FAILED", verificationError.message);
    }

    const { error: candidateUpdateError } = await service
      .from("ingested_question_candidates")
      .update({
        candidate_status: nextCandidateStatus,
      })
      .eq("id", candidateRow.id);

    if (candidateUpdateError) {
      throw new HttpError(500, "REVIEW_CANDIDATE_UPDATE_FAILED", candidateUpdateError.message);
    }

    const { count: remainingUndecidedCount, error: pendingCountError } = await service
      .from("ingested_question_candidates")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("ingestion_job_id", candidateRow.ingestion_job_id)
      .not("candidate_status", "in", '("approved","rejected")');

    if (pendingCountError) {
      throw new HttpError(500, "REVIEW_PENDING_COUNT_FAILED", pendingCountError.message);
    }

    const nextJobStatus = resolveIngestionJobStatusAfterDecision(remainingUndecidedCount ?? 0);
    const { error: jobUpdateError } = await service
      .from("ingestion_jobs")
      .update({
        status: nextJobStatus,
        error_message: nextJobStatus === "completed" ? null : undefined,
      })
      .eq("id", candidateRow.ingestion_job_id);

    if (jobUpdateError) {
      throw new HttpError(500, "REVIEW_JOB_UPDATE_FAILED", jobUpdateError.message);
    }

    return jsonResponse({
      job: {
        id: candidateRow.ingestion_job_id,
        status: nextJobStatus,
      },
      candidate: {
        id: candidateRow.id,
        status: nextCandidateStatus,
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
        message: error instanceof Error ? error.message : "Unexpected review ingestion error.",
      },
      500,
    );
  }
});
