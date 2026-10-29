import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import AiConfigPage from "./ai-config-page";

const mockGetGlobalAiCredentialStatus = vi.fn();
const mockSaveGlobalAiCredential = vi.fn();
const mockTestGlobalAiCredential = vi.fn();
const mockDeleteGlobalAiCredential = vi.fn();

vi.mock("../../lib/api/global-ai-credential-api", () => ({
  getGlobalAiCredentialStatus: (...args: unknown[]) => mockGetGlobalAiCredentialStatus(...args),
  saveGlobalAiCredential: (...args: unknown[]) => mockSaveGlobalAiCredential(...args),
  testGlobalAiCredential: (...args: unknown[]) => mockTestGlobalAiCredential(...args),
  deleteGlobalAiCredential: (...args: unknown[]) => mockDeleteGlobalAiCredential(...args),
}));

vi.mock("./use-student-shell", () => ({
  useStudentShell: () => ({
    navItems: [],
    tierLabel: "Apoteker",
  }),
}));

describe("AiConfigPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockGetGlobalAiCredentialStatus.mockResolvedValue({
      hasCredential: false,
      lastValidatedAt: null,
      lastError: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AiConfigPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  test("verifies gemini-3.8-flash is rendered as the default model description", async () => {
    renderPage();

    expect(await screen.findByText(/gemini-3.8-flash/i)).toBeInTheDocument();
    expect(screen.getByText(/model bawaan/i)).toBeInTheDocument();
  });

  test("saves credential with gemini-3.8-flash as the target model", async () => {
    mockSaveGlobalAiCredential.mockResolvedValue({
      hasCredential: true,
      lastValidatedAt: "2026-10-17T06:00:00Z",
      lastError: null,
    });

    renderPage();

    const input = await screen.findByLabelText(/API key Gemini/i);
    fireEvent.change(input, { target: { value: "AIzaSyTest12345" } });

    const saveButton = screen.getByRole("button", { name: /simpan kredensial/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveGlobalAiCredential).toHaveBeenCalledWith({
        apiKey: "AIzaSyTest12345",
        model: "gemini-3.8-flash",
      });
    });
  });

  test("renders amber warning and deferred validation feedback when credential is saved during Gemini 503 high demand", async () => {
    const transientMsg =
      "Layanan Gemini mengalami gangguan sementara dari sisi Google (This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.). Sistem akan mencoba kembali dalam beberapa saat.";

    mockSaveGlobalAiCredential.mockResolvedValue({
      hasCredential: true,
      model: "gemini-3.8-flash",
      lastValidatedAt: null,
      lastError: transientMsg,
    });

    renderPage();

    const input = await screen.findByLabelText(/API key Gemini/i);
    fireEvent.change(input, { target: { value: "AIzaSyTest12345" } });

    const saveButton = screen.getByRole("button", { name: /simpan kredensial/i });
    fireEvent.click(saveButton);

    expect(
      await screen.findByText(/API key Gemini berhasil disimpan ke Vault \(validasi otomatis tertunda karena server Google sedang sibuk\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Status: Tersimpan di Vault \(belum tervalidasi otomatis\)/i)).toBeInTheDocument();

    const warningBox = screen.getByText(transientMsg);
    expect(warningBox.className).toContain("amber");
    expect(warningBox.className).not.toContain("destructive");
  });
  test("renders amber degraded badge when credential is saved but has transient error", async () => {
    mockGetGlobalAiCredentialStatus.mockResolvedValue({
      hasCredential: true,
      lastValidatedAt: "2026-10-29T10:29:27.000Z",
      lastError: "Waktu tunggu respons Gemini habis (timeout). Sistem akan mencoba kembali dalam beberapa saat.",
    });

    renderPage();

    expect(await screen.findByText(/Koneksi Mengalami Gangguan Sementara/i)).toBeInTheDocument();
  });

  test("renders green active badge when credential is fully valid without error", async () => {
    mockGetGlobalAiCredentialStatus.mockResolvedValue({
      hasCredential: true,
      lastValidatedAt: "2026-10-29T10:29:27.000Z",
      lastError: null,
    });

    renderPage();

    expect(await screen.findByText(/Koneksi Gemini Aktif/i)).toBeInTheDocument();
  });
  test("deletes credential and shows success feedback", async () => {
    mockGetGlobalAiCredentialStatus.mockResolvedValue({
      hasCredential: true,
      lastValidatedAt: "2026-10-20T00:00:00.000Z",
      lastError: null,
    });
    mockDeleteGlobalAiCredential.mockResolvedValue({
      hasCredential: false,
      lastValidatedAt: null,
      lastError: null,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /hapus kredensial/i })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /hapus kredensial/i }));

    await waitFor(() => {
      expect(mockDeleteGlobalAiCredential).toHaveBeenCalled();
    });
    expect(await screen.findByText(/API key Gemini berhasil dihapus dari sistem/i)).toBeInTheDocument();
  });
});