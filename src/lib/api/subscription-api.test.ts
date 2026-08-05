import type { User } from "@supabase/supabase-js";
import { describe, expect, test, vi } from "vitest";
import {
  getPaymentProofPreviewUrl,
  reviewPaymentSubmission,
  submitPaymentProof,
} from "./subscription-api";

describe("subscription-api", () => {
  test("payment proof previews are generated through signed URLs from the private bucket", async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: {
        signedUrl: "https://signed.example.com/payment-proof",
      },
      error: null,
    });
    const client = {
      storage: {
        from: vi.fn(() => ({
          createSignedUrl,
        })),
      },
    };

    await expect(
      getPaymentProofPreviewUrl({
        client: client as never,
        paymentProofPath: "user-1/proof.png",
      }),
    ).resolves.toBe("https://signed.example.com/payment-proof");

    expect(client.storage.from).toHaveBeenCalledWith("payment-proofs");
    expect(createSignedUrl).toHaveBeenCalledWith("user-1/proof.png", 300);
  });

  test("payment proof upload rejects unknown package codes before any storage write", async () => {
    const upload = vi.fn();
    const client = {
      storage: {
        from: vi.fn(() => ({
          upload,
        })),
      },
      from: vi.fn(),
    };

    await expect(
      submitPaymentProof({
        client: client as never,
        user: {
          id: "user-1",
          email: "student@example.com",
        } as User,
        packageCode: "paket_tidak_ada",
        file: new File(["proof"], "proof.png", {
          type: "image/png",
        }),
      }),
    ).rejects.toThrow(/paket/i);

    expect(client.storage.from).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  test("payment proof upload requires an authenticated user", async () => {
    await expect(
      submitPaymentProof({
        client: {} as never,
        user: null,
        packageCode: "pro_30_hari",
        file: new File(["proof"], "proof.png", {
          type: "image/png",
        }),
      }),
    ).rejects.toThrow(/login terlebih dahulu|auth/i);
  });

  test("payment proof upload removes the stored file when payment submission insert fails", async () => {
    const remove = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const upload = vi.fn().mockResolvedValue({
      data: {
        path: "user-1/uploaded-proof.png",
      },
      error: null,
    });
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: "Insert payment submission gagal.",
      },
    });
    const select = vi.fn(() => ({
      single,
    }));
    const insert = vi.fn(() => ({
      select,
    }));
    const storageBucket = {
      upload,
      remove,
    };
    const client = {
      storage: {
        from: vi.fn(() => storageBucket),
      },
      from: vi.fn(() => ({
        insert,
      })),
    };

    await expect(
      submitPaymentProof({
        client: client as never,
        user: {
          id: "user-1",
          email: "student@example.com",
        } as User,
        packageCode: "pro_30_hari",
        file: new File(["proof"], "proof.png", {
          type: "image/png",
        }),
      }),
    ).rejects.toThrow(/insert payment submission gagal/i);

    expect(remove).toHaveBeenCalledWith(["user-1/uploaded-proof.png"]);
  });

  test("admin-only review actions reject non-admin callers", async () => {
    await expect(
      reviewPaymentSubmission({
        client: {} as never,
        actor: {
          id: "user-1",
          role: "pro",
        },
        submissionId: "submission-1",
        decision: "approve",
      }),
    ).rejects.toThrow(/admin/i);
  });

  test("admin review actions call the hardened review RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: "submission-1",
        user_id: "student-1",
        package_code: "pro_30_hari",
        payment_proof_path: "student-1/proof.png",
        proof_file_name: "proof.png",
        status: "active",
        reviewer_id: "admin-1",
        reviewed_at: "2026-05-01T12:00:00.000Z",
        reviewer_notes: "Pembayaran valid.",
        created_at: "2026-05-01T08:00:00.000Z",
      },
      error: null,
    });

    await expect(
      reviewPaymentSubmission({
        client: {
          rpc,
        } as never,
        actor: {
          id: "admin-1",
          role: "admin",
        },
        submissionId: "submission-1",
        decision: "approve",
        notes: "Pembayaran valid.",
      }),
    ).resolves.toMatchObject({
      id: "submission-1",
      reviewerId: "admin-1",
      status: "active",
    });

    expect(rpc).toHaveBeenCalledWith("review_payment_submission", {
      review_decision: "approve",
      reviewer_notes: "Pembayaran valid.",
      submission_id: "submission-1",
    });
  });

  test("admin review actions reject already-reviewed submissions", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: "Submission pembayaran ini sudah direview.",
      },
    });

    await expect(
      reviewPaymentSubmission({
        client: {
          rpc,
        } as never,
        actor: {
          id: "admin-1",
          role: "admin",
        },
        submissionId: "submission-1",
        decision: "approve",
      }),
    ).rejects.toThrow(/sudah.*review/i);

    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
