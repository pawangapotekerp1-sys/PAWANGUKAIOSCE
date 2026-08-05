import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import PaymentsPage from "./payments-page";

const mockUseSession = vi.fn();
const mockBootstrapProfile = vi.fn();
const mockLogout = vi.fn();
const mockGetPaymentProofPreviewUrl = vi.fn();
const mockListPaymentSubmissionsForReview = vi.fn();
const mockReviewPaymentSubmission = vi.fn();

vi.mock("../../lib/auth/use-session", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("../../lib/api/auth-api", () => ({
  bootstrapProfile: (...args: unknown[]) => mockBootstrapProfile(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
}));

vi.mock("../../lib/api/subscription-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api/subscription-api")>();

  return {
    ...actual,
    getPaymentProofPreviewUrl: (...args: unknown[]) => mockGetPaymentProofPreviewUrl(...args),
    listPaymentSubmissionsForReview: (...args: unknown[]) =>
      mockListPaymentSubmissionsForReview(...args),
    reviewPaymentSubmission: (...args: unknown[]) => mockReviewPaymentSubmission(...args),
  };
});

function createAdminSession(): Session {
  return {
    access_token: "token",
    refresh_token: "refresh",
    expires_in: 3600,
    expires_at: 1_777_700_000,
    token_type: "bearer",
    user: {
      id: "admin-1",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-05-01T00:00:00.000Z",
      email: "admin@pawang.test",
    },
  } as Session;
}

function setAdminSession() {
  const session = createAdminSession();

  mockUseSession.mockReturnValue({
    status: "authenticated",
    session,
    user: session.user,
  });
  mockBootstrapProfile.mockResolvedValue({
    id: session.user.id,
    email: session.user.email ?? null,
    fullName: "Admin Operasional",
    role: "admin",
  });
}

function renderPaymentsPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/payments"]}>
      <PaymentsPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  setAdminSession();
  mockListPaymentSubmissionsForReview.mockResolvedValue([
    {
      id: "submission-1",
      userId: "student-1",
      packageCode: "pro_30_hari",
      paymentProofPath: "student-1/proof.png",
      proofFileName: "proof.png",
      status: "pending_review",
      reviewerId: null,
      reviewedAt: null,
      reviewerNotes: null,
      createdAt: "2026-05-01T08:00:00.000Z",
    },
  ]);
  mockGetPaymentProofPreviewUrl.mockResolvedValue("https://signed.example.com/proof");
});

describe("Payments page", () => {
  test("applies the reusable button hierarchy for queue actions", async () => {
    renderPaymentsPage();

    expect(
      await screen.findByRole("button", {
        name: /keluar/i,
      }),
    ).toHaveAttribute("data-variant", "outline");
    expect(
      screen.getByRole("button", {
        name: /lihat bukti/i,
      }),
    ).toHaveAttribute("data-variant", "outline");
    expect(
      screen.getByRole("button", {
        name: /setujui pembayaran/i,
      }),
    ).toHaveAttribute("data-variant", "primary");
    expect(
      screen.getByRole("button", {
        name: /tolak & minta ulang/i,
      }),
    ).toHaveAttribute("data-variant", "destructive");
  });

  test("keeps the loaded queue visible when opening a proof preview fails", async () => {
    mockGetPaymentProofPreviewUrl.mockRejectedValueOnce(
      new Error("Bukti transfer belum bisa dibuka."),
    );

    renderPaymentsPage();

    fireEvent.click(
      await screen.findByRole("button", {
        name: /lihat bukti/i,
      }),
    );

    expect(
      await screen.findByText(/bukti transfer belum bisa dibuka/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/pengguna student-1/i)).toBeInTheDocument();
    expect(screen.queryByText(/daftar pembayaran belum bisa dimuat/i)).not.toBeInTheDocument();
  });

  test("opens signed proof previews for admins from the private storage bucket", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    renderPaymentsPage();

    fireEvent.click(
      await screen.findByRole("button", {
        name: /lihat bukti/i,
      }),
    );

    await waitFor(() => {
      expect(mockGetPaymentProofPreviewUrl).toHaveBeenCalledWith({
        paymentProofPath: "student-1/proof.png",
      });
    });
    expect(openSpy).toHaveBeenCalledWith(
      "https://signed.example.com/proof",
      "_blank",
      "noopener,noreferrer",
    );
  });

  test("requests a fresh signed proof preview url each time the admin opens the proof", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    mockGetPaymentProofPreviewUrl
      .mockResolvedValueOnce("https://signed.example.com/proof-1")
      .mockResolvedValueOnce("https://signed.example.com/proof-2");

    renderPaymentsPage();

    const viewProofButton = await screen.findByRole("button", {
      name: /lihat bukti/i,
    });

    fireEvent.click(viewProofButton);
    await waitFor(() => {
      expect(mockGetPaymentProofPreviewUrl).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(viewProofButton);
    await waitFor(() => {
      expect(mockGetPaymentProofPreviewUrl).toHaveBeenCalledTimes(2);
    });

    expect(openSpy).toHaveBeenNthCalledWith(
      1,
      "https://signed.example.com/proof-1",
      "_blank",
      "noopener,noreferrer",
    );
    expect(openSpy).toHaveBeenNthCalledWith(
      2,
      "https://signed.example.com/proof-2",
      "_blank",
      "noopener,noreferrer",
    );
  });

  test("keeps the queue surface visible when a concurrent review error occurs", async () => {
    mockReviewPaymentSubmission.mockRejectedValueOnce(
      new Error("Submission pembayaran ini sudah direview."),
    );
    mockListPaymentSubmissionsForReview
      .mockResolvedValueOnce([
        {
          id: "submission-1",
          userId: "student-1",
          packageCode: "pro_30_hari",
          paymentProofPath: "student-1/proof.png",
          proofFileName: "proof.png",
          status: "pending_review",
          reviewerId: null,
          reviewedAt: null,
          reviewerNotes: null,
          createdAt: "2026-05-01T08:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "submission-1",
          userId: "student-1",
          packageCode: "pro_30_hari",
          paymentProofPath: "student-1/proof.png",
          proofFileName: "proof.png",
          status: "pending_review",
          reviewerId: null,
          reviewedAt: null,
          reviewerNotes: null,
          createdAt: "2026-05-01T08:00:00.000Z",
        },
      ]);

    renderPaymentsPage();

    fireEvent.click(
      await screen.findByRole("button", {
        name: /setujui/i,
      }),
    );

    expect(
      await screen.findByText(/pembayaran ini sudah direview/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/pengguna student-1/i)).toBeInTheDocument();
    expect(screen.queryByText(/daftar pembayaran belum bisa dimuat/i)).not.toBeInTheDocument();
  });

  test("surfaces an action error when already-reviewed recovery refresh also fails", async () => {
    mockReviewPaymentSubmission.mockRejectedValueOnce(
      new Error("Submission pembayaran ini sudah direview."),
    );
    mockListPaymentSubmissionsForReview
      .mockResolvedValueOnce([
        {
          id: "submission-1",
          userId: "student-1",
          packageCode: "pro_30_hari",
          paymentProofPath: "student-1/proof.png",
          proofFileName: "proof.png",
          status: "pending_review",
          reviewerId: null,
          reviewedAt: null,
          reviewerNotes: null,
          createdAt: "2026-05-01T08:00:00.000Z",
        },
      ])
      .mockRejectedValueOnce(new Error("Antrean terbaru belum berhasil dimuat."));

    renderPaymentsPage();

    fireEvent.click(
      await screen.findByRole("button", {
        name: /setujui/i,
      }),
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(/pembayaran ini sudah direview/i);
    expect(screen.getByText(/pengguna student-1/i)).toBeInTheDocument();
    expect(screen.queryByText(/daftar pembayaran belum bisa dimuat/i)).not.toBeInTheDocument();
  });

  test("shows shorter queue state copy", async () => {
    mockListPaymentSubmissionsForReview.mockImplementationOnce(() => new Promise(() => {}));

    renderPaymentsPage();

    expect(await screen.findByText(/daftar pembayaran sedang disiapkan/i)).toBeInTheDocument();

    cleanup();

    mockListPaymentSubmissionsForReview.mockResolvedValueOnce([]);
    renderPaymentsPage();

    expect(await screen.findByText("Belum ada pembayaran")).toBeInTheDocument();
    expect(screen.getByText(/belum ada pembayaran baru/i)).toBeInTheDocument();
  });
});
