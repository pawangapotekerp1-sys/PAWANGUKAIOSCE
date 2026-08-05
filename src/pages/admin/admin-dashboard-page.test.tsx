import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import AdminDashboardPage from "./admin-dashboard-page";

const mockGetAdminDashboardOverview = vi.fn();

vi.mock("../../lib/api/admin-api", () => ({
  getAdminDashboardOverview: (...args: unknown[]) => mockGetAdminDashboardOverview(...args),
}));

function renderAdminDashboard(initialEntry = "/admin") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AdminDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAdminDashboardOverview.mockResolvedValue({
    metrics: [
      {
        label: "Pembayaran menunggu",
        value: "12 pembayaran",
        tone: "gold",
      },
      {
        label: "Pengguna aktif",
        value: "842 pengguna",
        tone: "teal",
      },
      {
        label: "Attempt tercatat",
        value: "1.284 sesi",
        tone: "green",
      },
    ],
    userPulse: {
      title: "Pengguna aktif terpantau",
      detail: "842 akun sudah tercatat di funnel belajar dan langganan.",
    },
    reviewPulse: {
      title: "Tindak lanjut pembayaran",
      detail: "12 pembayaran masih menunggu keputusan admin.",
    },
    paymentQueuePreview: [
      {
        id: "submission-1",
        name: "Nadira Puspandari",
        packageName: "Pro 30 Hari",
        submittedAt: "08:14 WIB",
        statusLabel: "Pending",
        tone: "gold",
      },
    ],
    reviewQueueSummary: [],
  });
});

describe("Admin dashboard page", () => {
  test("renders the live operational monitoring summary for admin users", async () => {
    renderAdminDashboard();

    expect(
      await screen.findByText(/ringkasan admin hari ini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/pending payments/i)).not.toBeInTheDocument();
    expect(await screen.findByText(/^12 pembayaran$/i)).toBeInTheDocument();
    expect(screen.getByText(/842 pengguna/i)).toBeInTheDocument();
    expect(screen.getByText(/1.284 sesi/i)).toBeInTheDocument();
    expect(screen.getByText(/sorotan hari ini/i)).toBeInTheDocument();
    expect(screen.getByText(/nadira puspandari/i)).toBeInTheDocument();
    expect(screen.queryByText(/antrian ai/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/job gagal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/candidate conflict_found/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pulse operasi/i)).not.toBeInTheDocument();
  });

  test("renders the queue loading state from preview query params", () => {
    renderAdminDashboard("/admin?queueView=loading");

    expect(
      screen.getByText(/ringkasan admin sedang dimuat/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /lihat pembayaran/i })).toHaveAttribute(
      "href",
      "/admin/payments",
    );
    expect(screen.getByRole("link", { name: /lihat pembayaran/i })).toHaveAttribute("data-variant", "primary");
  });

  test("keeps the payments call to action when the live overview is empty", async () => {
    mockGetAdminDashboardOverview.mockResolvedValueOnce({
      metrics: [
        {
          label: "Pembayaran menunggu",
          value: "0 pembayaran",
          tone: "gold",
        },
      ],
      userPulse: {
        title: "Pengguna aktif terpantau",
        detail: "Tidak ada perubahan besar pada funnel hari ini.",
      },
      reviewPulse: {
        title: "Tindak lanjut pembayaran",
        detail: "Tidak ada pembayaran baru untuk ditindaklanjuti.",
      },
      paymentQueuePreview: [],
      reviewQueueSummary: [],
    });

    renderAdminDashboard();

    expect(
      await screen.findByText(/belum ada pembayaran yang perlu dicek/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /lihat pembayaran/i })).toHaveAttribute(
      "href",
      "/admin/payments",
    );
    expect(screen.getByRole("link", { name: /lihat pembayaran/i })).toHaveAttribute("data-variant", "primary");
  });

  test("keeps the preview empty fallback pointed at payments", () => {
    renderAdminDashboard("/admin?queueView=empty");

    expect(
      screen.getByText(/belum ada pembayaran yang perlu dicek/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /lihat pembayaran/i })).toHaveAttribute(
      "href",
      "/admin/payments",
    );
    expect(screen.getByRole("link", { name: /lihat pembayaran/i })).toHaveAttribute("data-variant", "primary");
  });

  test("keeps the preview error fallback pointed at payments", () => {
    renderAdminDashboard("/admin?queueView=error");

    expect(
      screen.getByText("Ringkasan admin belum bisa dimuat"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /lihat pembayaran/i })).toHaveAttribute(
      "href",
      "/admin/payments",
    );
    expect(screen.getByRole("link", { name: /lihat pembayaran/i })).toHaveAttribute("data-variant", "primary");
  });

  test("shows an operational error state when the live overview request fails", async () => {
    mockGetAdminDashboardOverview.mockRejectedValueOnce(new Error("boom"));
    renderAdminDashboard();

    expect(
      await screen.findByText(/ringkasan admin belum tersedia/i),
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /lihat pembayaran/i })).toHaveAttribute(
      "href",
      "/admin/payments",
    );
    expect(screen.getByRole("link", { name: /lihat pembayaran/i })).toHaveAttribute("data-variant", "primary");
  });
});
