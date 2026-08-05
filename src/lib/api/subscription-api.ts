import type { User } from "@supabase/supabase-js";
import { deriveSubscriptionState, type SubscriptionState, type UserRole, type UserSubscription } from "../auth/permissions";
import { getSupabaseBrowserClient } from "../supabase/browser-client";

type SubscriptionClient = Pick<ReturnType<typeof getSupabaseBrowserClient>, "from" | "storage" | "rpc">;

type SubscriptionRow = {
  id: string;
  user_id: string;
  package_code: string;
  state: SubscriptionState;
  starts_at: string | null;
  ends_at: string | null;
  created_at?: string;
  updated_at?: string;
};

type PaymentSubmissionRow = {
  id: string;
  user_id: string;
  package_code: string;
  payment_proof_path: string;
  proof_file_name: string | null;
  status: SubscriptionState;
  reviewer_id: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at?: string;
};

export type PaymentSubmission = {
  id: string;
  userId: string;
  packageCode: string;
  paymentProofPath: string;
  proofFileName: string | null;
  status: SubscriptionState;
  reviewerId: string | null;
  reviewedAt: string | null;
  reviewerNotes: string | null;
  createdAt: string;
};

export type SubscriptionOverview = {
  subscription: UserSubscription | null;
  latestSubmission: PaymentSubmission | null;
};

export type ReviewDecision = "approve" | "reject";

export type ReviewActor = {
  id: string;
  role: UserRole;
};

export type SubscriptionPackageOption = {
  code: string;
  name: string;
  durationDays: number;
};

export const subscriptionPackageOptions: SubscriptionPackageOption[] = [
  {
    code: "sprint_14_hari",
    name: "Sprint 14 Hari",
    durationDays: 14,
  },
  {
    code: "pro_30_hari",
    name: "Pro 30 Hari",
    durationDays: 30,
  },
];

const REVIEW_DECISIONS: ReviewDecision[] = ["approve", "reject"];

function mapSubscriptionRow(row: SubscriptionRow): UserSubscription {
  return {
    id: row.id,
    userId: row.user_id,
    packageCode: row.package_code,
    state: deriveSubscriptionState({
      state: row.state,
      endsAt: row.ends_at,
    }),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPaymentSubmissionRow(row: PaymentSubmissionRow): PaymentSubmission {
  return {
    id: row.id,
    userId: row.user_id,
    packageCode: row.package_code,
    paymentProofPath: row.payment_proof_path,
    proofFileName: row.proof_file_name,
    status: row.status,
    reviewerId: row.reviewer_id,
    reviewedAt: row.reviewed_at,
    reviewerNotes: row.reviewer_notes,
    createdAt: row.created_at,
  };
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase();
}

function getPackageOption(packageCode: string) {
  return subscriptionPackageOptions.find((item) => item.code === packageCode) ?? null;
}

function assertValidPackageCode(packageCode: string) {
  if (!getPackageOption(packageCode)) {
    throw new Error("Kode paket langganan tidak valid.");
  }
}

function assertValidReviewDecision(decision: string): asserts decision is ReviewDecision {
  if (!REVIEW_DECISIONS.includes(decision as ReviewDecision)) {
    throw new Error("Keputusan review tidak valid.");
  }
}

function ensureAdmin(actor: ReviewActor) {
  if (actor.role !== "admin") {
    throw new Error("Aksi ini hanya tersedia untuk admin.");
  }
}

export async function getUserSubscription(
  {
    client = getSupabaseBrowserClient(),
    userId,
  }: {
    client?: SubscriptionClient;
    userId: string;
  },
): Promise<UserSubscription | null> {
  const { data, error } = await client
    .from("subscriptions")
    .select("id, user_id, package_code, state, starts_at, ends_at, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapSubscriptionRow(data as SubscriptionRow);
}

export async function getLatestPaymentSubmission(
  {
    client = getSupabaseBrowserClient(),
    userId,
  }: {
    client?: SubscriptionClient;
    userId: string;
  },
): Promise<PaymentSubmission | null> {
  const { data, error } = await client
    .from("payment_submissions")
    .select(
      "id, user_id, package_code, payment_proof_path, proof_file_name, status, reviewer_id, reviewed_at, reviewer_notes, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapPaymentSubmissionRow(data as PaymentSubmissionRow);
}

export async function getSubscriptionOverview(
  {
    client = getSupabaseBrowserClient(),
    user,
  }: {
    client?: SubscriptionClient;
    user: User;
  },
): Promise<SubscriptionOverview> {
  const [subscription, latestSubmission] = await Promise.all([
    getUserSubscription({
      client,
      userId: user.id,
    }),
    getLatestPaymentSubmission({
      client,
      userId: user.id,
    }),
  ]);

  return {
    subscription,
    latestSubmission,
  };
}

export async function getPaymentProofPreviewUrl(
  {
    client = getSupabaseBrowserClient(),
    paymentProofPath,
    expiresInSeconds = 300,
  }: {
    client?: SubscriptionClient;
    paymentProofPath: string;
    expiresInSeconds?: number;
  },
): Promise<string> {
  if (!paymentProofPath.trim()) {
    throw new Error("Path bukti transfer tidak valid.");
  }

  const { data, error } = await client.storage
    .from("payment-proofs")
    .createSignedUrl(paymentProofPath, expiresInSeconds);

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.signedUrl) {
    throw new Error("Preview bukti transfer belum berhasil dibuat.");
  }

  return data.signedUrl;
}

export async function submitPaymentProof(
  {
    client = getSupabaseBrowserClient(),
    user,
    packageCode,
    file,
  }: {
    client?: SubscriptionClient;
    user: User | null;
    packageCode: string;
    file: File;
  },
): Promise<PaymentSubmission> {
  if (!user) {
    throw new Error("Silakan login terlebih dahulu sebelum mengunggah bukti transfer.");
  }

  assertValidPackageCode(packageCode);

  const storageBucket = client.storage.from("payment-proofs");
  const proofPath = `${user.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { data: uploadData, error: uploadError } = await storageBucket.upload(proofPath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const storedProofPath = uploadData?.path ?? proofPath;

  try {
    const { data, error } = await client
      .from("payment_submissions")
      .insert({
        user_id: user.id,
        package_code: packageCode,
        payment_proof_path: storedProofPath,
        proof_file_name: file.name,
        status: "pending_review",
      })
      .select(
        "id, user_id, package_code, payment_proof_path, proof_file_name, status, reviewer_id, reviewed_at, reviewer_notes, created_at, updated_at",
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapPaymentSubmissionRow(data as PaymentSubmissionRow);
  } catch (error) {
    const { error: removeError } = await storageBucket.remove([storedProofPath]);

    if (removeError) {
      const baseMessage =
        error instanceof Error
          ? error.message
          : "Payment submission belum berhasil dibuat.";
      throw new Error(`${baseMessage} File bukti transfer yang terunggah juga belum berhasil dibersihkan.`);
    }

    throw error;
  }
}

export async function listPaymentSubmissionsForReview(
  {
    client = getSupabaseBrowserClient(),
  }: {
    client?: SubscriptionClient;
  } = {},
): Promise<PaymentSubmission[]> {
  const { data, error } = await client
    .from("payment_submissions")
    .select(
      "id, user_id, package_code, payment_proof_path, proof_file_name, status, reviewer_id, reviewed_at, reviewer_notes, created_at, updated_at",
    )
    .eq("status", "pending_review")
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data as PaymentSubmissionRow[] | null)?.map(mapPaymentSubmissionRow) ?? [];
}

export async function reviewPaymentSubmission(
  {
    client = getSupabaseBrowserClient(),
    actor,
    submissionId,
    decision,
    notes,
  }: {
    client?: SubscriptionClient;
    actor: ReviewActor;
    submissionId: string;
    decision: ReviewDecision;
    notes?: string;
  },
) {
  ensureAdmin(actor);
  assertValidReviewDecision(decision);

  const { data, error } = await client.rpc("review_payment_submission", {
    review_decision: decision,
    reviewer_notes: notes?.trim() || null,
    submission_id: submissionId,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Submission pembayaran belum berhasil direview.");
  }

  const submission = data as PaymentSubmissionRow;
  assertValidPackageCode(submission.package_code);

  return mapPaymentSubmissionRow(submission);
}
