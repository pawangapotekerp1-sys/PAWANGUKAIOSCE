import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import LoginPage from "./auth/login-page";
import SubscriptionPage from "./subscription-page";

const mockUseSession = vi.fn();
const mockBootstrapProfile = vi.fn();
const mockGetSubscriptionOverview = vi.fn();
const mockSubmitPaymentProof = vi.fn();

vi.mock("../lib/auth/use-session", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("../lib/api/auth-api", () => ({
  bootstrapProfile: (...args: unknown[]) => mockBootstrapProfile(...args),
  logout: vi.fn(),
}));

vi.mock("../lib/api/subscription-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api/subscription-api")>();

  return {
    ...actual,
    getSubscriptionOverview: (...args: unknown[]) => mockGetSubscriptionOverview(...args),
    submitPaymentProof: (...args: unknown[]) => mockSubmitPaymentProof(...args),
  };
});

function createSession(email = "baru@pawang.test"): Session {
  return {
    access_token: "token",
    refresh_token: "refresh",
    expires_in: 3600,
    expires_at: 1_777_700_000,
    token_type: "bearer",
    user: {
      id: "user-1",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-05-01T00:00:00.000Z",
      email,
    },
  } as Session;
}

function setAnonymousSession() {
  mockUseSession.mockReturnValue({
    status: "anonymous",
    session: null,
    user: null,
  });
}

function setAuthenticatedSession() {
  const session = createSession();

  mockUseSession.mockReturnValue({
    status: "authenticated",
    session,
    user: session.user,
  });
  mockBootstrapProfile.mockResolvedValue({
    id: session.user.id,
    email: session.user.email ?? null,
    fullName: "Pendaftar Baru",
    role: "pendaftar_baru",
  });
}

function renderSubscriptionPage(initialEntry = "/subscription") {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SubscriptionPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  setAnonymousSession();
  mockGetSubscriptionOverview.mockResolvedValue({
    subscription: null,
    latestSubmission: null,
  });
});

describe("Subscription flow pages", () => {
  test("renders the login page with the active email login controls only", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/masuk untuk lanjut belajar/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/kata sandi/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /masuk dengan email/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: /daftar/i,
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/belum punya akun/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /google login menyusul/i,
      }),
    ).not.toBeInTheDocument();
  });

  test("shows package cards, transfer instructions, and upload controls for pending review users", async () => {
    setAuthenticatedSession();
    mockGetSubscriptionOverview.mockResolvedValue({
      subscription: {
        id: "subscription-1",
        userId: "user-1",
        packageCode: "pro_30_hari",
        state: "pending_review",
        startsAt: null,
        endsAt: null,
      },
      latestSubmission: {
        id: "submission-1",
        userId: "user-1",
        packageCode: "pro_30_hari",
        paymentProofPath: "user-1/proof.png",
        proofFileName: "proof.png",
        status: "pending_review",
        reviewerId: null,
        reviewedAt: null,
        reviewerNotes: null,
        createdAt: "2026-05-01T08:00:00.000Z",
      },
    });

    renderSubscriptionPage();

    expect(
      await screen.findByText(/aktifkan akses belajar/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/bukti transfer sedang ditinjau/i)).toBeInTheDocument();
    expect(screen.getByText(/^pilih paket yang sesuai\.$/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/pilih paket, unggah bukti transfer, lalu pantau statusnya di sini/i)).toBeInTheDocument();
    expect(screen.getByText(/^cara bayar$/i)).toBeInTheDocument();
    expect(
      screen.getByText(/pro 30 hari/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/sprint 14 hari/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /^pilih file$/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /kirim bukti transfer/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /profil/i })).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("link", { name: /kembali ke login/i })).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("link", { name: /masuk akun/i })).toHaveAttribute("data-variant", "primary");
    expect(screen.getByRole("link", { name: /^lihat cara bayar$/i })).toHaveAttribute("data-variant", "primary");
    expect(screen.getByRole("button", { name: /keluar/i })).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("button", { name: /^pilih file$/i })).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("button", { name: /kirim bukti transfer/i })).toHaveAttribute("data-variant", "primary");
    expect(screen.getByText(/akun siap kirim bukti transfer/i)).toBeInTheDocument();
  });

  test("refreshes the live subscription status when the window regains focus", async () => {
    setAuthenticatedSession();
    mockGetSubscriptionOverview
      .mockResolvedValueOnce({
        subscription: {
          id: "subscription-1",
          userId: "user-1",
          packageCode: "pro_30_hari",
          state: "pending_review",
          startsAt: null,
          endsAt: null,
        },
        latestSubmission: {
          id: "submission-1",
          userId: "user-1",
          packageCode: "pro_30_hari",
          paymentProofPath: "user-1/proof.png",
          proofFileName: "proof.png",
          status: "pending_review",
          reviewerId: null,
          reviewedAt: null,
          reviewerNotes: null,
          createdAt: "2026-05-01T08:00:00.000Z",
        },
      })
      .mockResolvedValueOnce({
        subscription: {
          id: "subscription-1",
          userId: "user-1",
          packageCode: "pro_30_hari",
          state: "active",
          startsAt: "2026-05-01T00:00:00.000Z",
          endsAt: "2026-06-01T00:00:00.000Z",
        },
        latestSubmission: {
          id: "submission-1",
          userId: "user-1",
          packageCode: "pro_30_hari",
          paymentProofPath: "user-1/proof.png",
          proofFileName: "proof.png",
          status: "active",
          reviewerId: "admin-1",
          reviewedAt: "2026-05-01T08:00:00.000Z",
          reviewerNotes: "Pembayaran valid.",
          createdAt: "2026-05-01T07:00:00.000Z",
        },
      });

    renderSubscriptionPage();

    expect(await screen.findByText(/bukti transfer sedang ditinjau/i)).toBeInTheDocument();

    fireEvent(window, new Event("focus"));

    await waitFor(() => {
      expect(mockGetSubscriptionOverview).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText(/akses belajar sudah aktif/i)).toBeInTheDocument();
  });

  test("shows a profile shortcut for authenticated users", async () => {
    setAuthenticatedSession();

    renderSubscriptionPage();

    expect(await screen.findByRole("link", {
      name: /profil/i,
    })).toHaveAttribute("href", "/profile");
  });

  test("shows distinct helper copy when the previous payment was rejected", async () => {
    setAuthenticatedSession();
    mockGetSubscriptionOverview.mockResolvedValue({
      subscription: {
        id: "subscription-1",
        userId: "user-1",
        packageCode: "sprint_14_hari",
        state: "rejected",
        startsAt: null,
        endsAt: null,
      },
      latestSubmission: {
        id: "submission-1",
        userId: "user-1",
        packageCode: "sprint_14_hari",
        paymentProofPath: "user-1/rejected.png",
        proofFileName: "rejected.png",
        status: "rejected",
        reviewerId: "admin-1",
        reviewedAt: "2026-05-01T08:00:00.000Z",
        reviewerNotes: "Nominal belum terlihat.",
        createdAt: "2026-05-01T07:00:00.000Z",
      },
    });

    renderSubscriptionPage();

    expect(await screen.findByText(/bukti transfer perlu diperbaiki/i)).toBeInTheDocument();
    expect(screen.getByText(/unggah ulang bukti yang lebih jelas agar pembayaran bisa kami cek/i)).toBeInTheDocument();
  });

  test("shows renewal-oriented helper copy when access is expired", async () => {
    setAuthenticatedSession();
    mockGetSubscriptionOverview.mockResolvedValue({
      subscription: {
        id: "subscription-1",
        userId: "user-1",
        packageCode: "pro_30_hari",
        state: "expired",
        startsAt: "2026-04-01T00:00:00.000Z",
        endsAt: "2026-04-30T00:00:00.000Z",
      },
      latestSubmission: null,
    });

    renderSubscriptionPage();

    expect(await screen.findByText(/akses belum aktif lagi/i)).toBeInTheDocument();
    expect(screen.getByText(/pilih paket baru lalu kirim bukti transfer untuk mengaktifkan akses lagi/i)).toBeInTheDocument();
  });

  test("shows an active success state when access has already been approved", async () => {
    setAuthenticatedSession();
    mockGetSubscriptionOverview.mockResolvedValue({
      subscription: {
        id: "subscription-1",
        userId: "user-1",
        packageCode: "pro_30_hari",
        state: "active",
        startsAt: "2026-05-01T00:00:00.000Z",
        endsAt: "2026-06-01T00:00:00.000Z",
      },
      latestSubmission: {
        id: "submission-1",
        userId: "user-1",
        packageCode: "pro_30_hari",
        paymentProofPath: "user-1/proof.png",
        proofFileName: "proof.png",
        status: "active",
        reviewerId: "admin-1",
        reviewedAt: "2026-05-01T08:00:00.000Z",
        reviewerNotes: "Pembayaran valid.",
        createdAt: "2026-05-01T07:00:00.000Z",
      },
    });

    renderSubscriptionPage();

    expect(await screen.findByText(/akses belajar sudah aktif/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /buka dashboard/i,
      }),
    ).toHaveAttribute("data-variant", "primary");
  });

  test("does not show active access when only the latest submission is active but the subscription is expired", async () => {
    setAuthenticatedSession();
    mockGetSubscriptionOverview.mockResolvedValue({
      subscription: {
        id: "subscription-1",
        userId: "user-1",
        packageCode: "pro_30_hari",
        state: "expired",
        startsAt: "2026-04-01T00:00:00.000Z",
        endsAt: "2026-04-30T00:00:00.000Z",
      },
      latestSubmission: {
        id: "submission-1",
        userId: "user-1",
        packageCode: "pro_30_hari",
        paymentProofPath: "user-1/proof.png",
        proofFileName: "proof.png",
        status: "active",
        reviewerId: "admin-1",
        reviewedAt: "2026-05-01T08:00:00.000Z",
        reviewerNotes: "Pembayaran lama sudah valid.",
        createdAt: "2026-05-01T07:00:00.000Z",
      },
    });

    renderSubscriptionPage();

    expect(await screen.findByText(/akses belum aktif lagi/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: /buka dashboard/i,
      }),
    ).not.toBeInTheDocument();
  });

  test("requires auth before a payment proof can be submitted", async () => {
    renderSubscriptionPage();

    fireEvent.click(
      screen.getByRole("button", {
        name: /kirim bukti transfer/i,
      }),
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(/silakan login terlebih dahulu/i);
  });

  test("keeps upload success visible when the follow-up overview refresh fails", async () => {
    setAuthenticatedSession();
    mockGetSubscriptionOverview
      .mockResolvedValueOnce({
        subscription: null,
        latestSubmission: null,
      })
      .mockRejectedValueOnce(new Error("Status terbaru belum berhasil dimuat."));
    mockSubmitPaymentProof.mockResolvedValue({
      id: "submission-1",
      userId: "user-1",
      packageCode: "pro_30_hari",
      paymentProofPath: "user-1/proof.png",
      proofFileName: "proof.png",
      status: "pending_review",
      reviewerId: null,
      reviewedAt: null,
      reviewerNotes: null,
      createdAt: "2026-05-01T08:00:00.000Z",
    });

    renderSubscriptionPage();

    await screen.findByRole("button", {
      name: /kirim bukti transfer/i,
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput as HTMLInputElement, {
      target: {
        files: [
          new File(["proof"], "proof.png", {
            type: "image/png",
          }),
        ],
      },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: /kirim bukti transfer/i,
      }),
    );

    await waitFor(() => {
      expect(mockSubmitPaymentProof).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.queryByText(/bukti transfer untuk pro 30 hari berhasil dikirim dan sedang kami tinjau/i),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByText(/bukti transfer paket pro 30 hari sudah dikirim dan sedang ditinjau/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByText(/bukti transfer berhasil dikirim, tetapi status terbaru belum berhasil dimuat/i),
    ).toBeInTheDocument();
  });

  test("clears a stale overview load error after a later successful submit refresh", async () => {
    setAuthenticatedSession();
    mockGetSubscriptionOverview
      .mockRejectedValueOnce(new Error("Status langganan lama gagal dimuat."))
      .mockResolvedValueOnce({
        subscription: null,
        latestSubmission: {
          id: "submission-1",
          userId: "user-1",
          packageCode: "pro_30_hari",
          paymentProofPath: "user-1/proof.png",
          proofFileName: "proof.png",
          status: "pending_review",
          reviewerId: null,
          reviewedAt: null,
          reviewerNotes: null,
          createdAt: "2026-05-01T08:00:00.000Z",
        },
      });
    mockSubmitPaymentProof.mockResolvedValue({
      id: "submission-1",
      userId: "user-1",
      packageCode: "pro_30_hari",
      paymentProofPath: "user-1/proof.png",
      proofFileName: "proof.png",
      status: "pending_review",
      reviewerId: null,
      reviewedAt: null,
      reviewerNotes: null,
      createdAt: "2026-05-01T08:00:00.000Z",
    });

    renderSubscriptionPage();

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(/status langganan lama gagal dimuat/i);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput as HTMLInputElement, {
      target: {
        files: [
          new File(["proof"], "proof.png", {
            type: "image/png",
          }),
        ],
      },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: /kirim bukti transfer/i,
      }),
    );

    expect(
      await screen.findByText(/bukti transfer paket pro 30 hari sudah dikirim dan sedang ditinjau/i),
    ).toBeInTheDocument();
    await screen.findByText(/bukti transfer sedang ditinjau/i);
    expect(screen.queryByText(/status langganan lama gagal dimuat/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/status langganan belum berhasil dimuat/i)).not.toBeInTheDocument();
  });

  test("shows the real live overview error in the primary status hero on the ready path", async () => {
    setAuthenticatedSession();
    mockGetSubscriptionOverview.mockRejectedValueOnce(
      new Error("Koneksi ke status langganan sedang bermasalah."),
    );

    renderSubscriptionPage();

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(/koneksi ke status langganan sedang bermasalah/i);
    expect(
      screen.getByText(/status langganan belum berhasil dimuat/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /lihat cara bayar/i })).toHaveAttribute("data-variant", "primary");
    expect(
      screen.queryByText(/status pembayaran preview gagal dimuat/i),
    ).not.toBeInTheDocument();
  });

  test("renders the subscription loading fallback from preview query params", async () => {
    setAuthenticatedSession();
    mockGetSubscriptionOverview.mockResolvedValue({
      subscription: null,
      latestSubmission: null,
    });

    renderSubscriptionPage("/subscription?statusView=loading");

    expect(
      await screen.findByText(/status pembayaran sedang dicek/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
  });

  test("uses primary link styling for empty-state transfer guidance", async () => {
    setAuthenticatedSession();
    mockGetSubscriptionOverview.mockResolvedValue({
      subscription: null,
      latestSubmission: null,
    });

    renderSubscriptionPage("/subscription?statusView=empty");

    expect(
      await screen.findByRole("link", {
        name: /lihat cara bayar/i,
      }),
    ).toHaveAttribute("data-variant", "primary");
  });

  test("shows shorter loading and helper copy", async () => {
    setAuthenticatedSession();
    mockGetSubscriptionOverview.mockResolvedValue({
      subscription: null,
      latestSubmission: null,
    });

    renderSubscriptionPage("/subscription?statusView=loading");

    expect(await screen.findByText(/mohon tunggu sebentar/i)).toBeInTheDocument();
  });
});
