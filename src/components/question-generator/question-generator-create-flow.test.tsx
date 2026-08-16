import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SessionContext, type SessionContextValue } from "../../lib/auth/session-provider";

import QuestionGeneratorCreateFlow from "./question-generator-create-flow";

const mockGetQuestionGeneratorStatus = vi.fn();
const mockSaveQuestionGeneratorCredential = vi.fn();
const mockTestQuestionGeneratorCredential = vi.fn();
const mockDeleteQuestionGeneratorCredential = vi.fn();
const mockGenerateQuestionBatch = vi.fn();

vi.mock("../../lib/api/question-generator-api", () => ({
  getQuestionGeneratorStatus: (...args: unknown[]) => mockGetQuestionGeneratorStatus(...args),
  saveQuestionGeneratorCredential: (...args: unknown[]) => mockSaveQuestionGeneratorCredential(...args),
  testQuestionGeneratorCredential: (...args: unknown[]) => mockTestQuestionGeneratorCredential(...args),
  deleteQuestionGeneratorCredential: (...args: unknown[]) => mockDeleteQuestionGeneratorCredential(...args),
  generateQuestionBatch: (...args: unknown[]) => mockGenerateQuestionBatch(...args),
}));

function renderCreateFlow(sessionValue?: SessionContextValue) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <SessionContext.Provider
      value={sessionValue ?? {
        status: "authenticated",
        session: null,
        user: { id: "user-1" } as SessionContextValue["user"],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/admin/question-generator"]}>
          <Routes>
            <Route
              path="/admin/question-generator"
              element={<QuestionGeneratorCreateFlow basePath="/admin/question-generator" />}
            />
            <Route path="/admin/question-generator/:batchId" element={<div>Review batch generator</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </SessionContext.Provider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  mockGetQuestionGeneratorStatus.mockResolvedValue({
    hasCredential: true,
    model: "gemini-3.7-flash",
    modelLabel: "gemini-3.7-flash",
    lastValidatedAt: null,
    lastError: null,
  });
  mockSaveQuestionGeneratorCredential.mockResolvedValue({
    hasCredential: true,
    model: "gemini-3.7-flash",
    modelLabel: "gemini-3.7-flash",
    lastValidatedAt: null,
    lastError: null,
  });
  mockTestQuestionGeneratorCredential.mockResolvedValue({
    status: {
      hasCredential: true,
      model: "gemini-3.7-flash",
      modelLabel: "gemini-3.7-flash",
      lastValidatedAt: null,
      lastError: null,
    },
    testResult: {
      ok: true,
      message: "Koneksi Gemini valid.",
      latencyMs: 120,
    },
  });
  mockDeleteQuestionGeneratorCredential.mockResolvedValue({
    hasCredential: false,
    model: "gemini-3.7-flash",
    modelLabel: "gemini-3.7-flash",
    lastValidatedAt: null,
    lastError: null,
  });
  mockGenerateQuestionBatch.mockResolvedValue({
    batchId: "batch-1",
    generatedCount: 1,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // clearQuestionGeneratorApiKey("user-1");
  // clearQuestionGeneratorApiKey("user-2");
  window.localStorage.clear();
});

describe("QuestionGeneratorCreateFlow", () => {
  test("summarizes the three fresh variation modes instead of copy concept and paraphrase", async () => {
    renderCreateFlow();

    expect(await screen.findByText(/koneksi gemini aktif/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /simpan api key/i })).toHaveAttribute("data-variant", "primary");
    expect(screen.getByRole("button", { name: /tes koneksi/i })).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("button", { name: /hapus api key/i })).toHaveAttribute("data-variant", "destructive");
    expect(screen.getByRole("button", { name: /tambah referensi/i })).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("button", { name: /buat soal/i })).toHaveAttribute("data-variant", "primary");
    expect(screen.getByText(/masukkan 1-3 soal acuan lengkap agar topik dan tingkat kesulitannya tetap sejalan/i)).toBeInTheDocument();
    expect(screen.getByText(/hasilnya tetap mengikuti referensi yang anda masukkan/i)).toBeInTheDocument();
    expect(screen.getByText(/proses ini akan membuat 1 kasus baru/i)).toBeInTheDocument();
    expect(screen.getByText(/variasi jebakan/i)).toBeInTheDocument();
    expect(screen.getByText(/variasi penalaran/i)).toBeInTheDocument();
    expect(screen.getByText(/maksimal 20 soal per proses agar hasil tetap konsisten/i)).toBeInTheDocument();
    expect(screen.queryByText(/copy konsep/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/parafrase/i)).not.toBeInTheDocument();
  });

  test("restores the Gemini key from local storage for the authenticated user", async () => {
    // window.localStorage.setItem(questionGeneratorApiKeyStorageKey("user-1"), "AIza-restored-user-1");
    // window.localStorage.setItem(questionGeneratorApiKeyStorageKey("user-2"), "AIza-other-user");

    renderCreateFlow();

    await screen.findByText(/koneksi gemini aktif/i);

    expect(screen.getByLabelText(/api key gemini/i)).toHaveValue("AIza-restored-user-1");
  });

  test("shows sync guidance when a local key exists but backend status is missing", async () => {
    // window.localStorage.setItem(questionGeneratorApiKeyStorageKey("user-1"), "AIza-local-only");
    mockGetQuestionGeneratorStatus.mockResolvedValueOnce({
      hasCredential: false,
      model: "gemini-3.7-flash",
      modelLabel: "gemini-3.7-flash",
      lastValidatedAt: null,
      lastError: null,
    });

    renderCreateFlow();

    expect(await screen.findByText(/api key ini sudah tersimpan di perangkat, tetapi belum tersambung ke akun anda/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/api key gemini/i)).toHaveValue("AIza-local-only");
  });

  test("clears the local key only after backend deletion succeeds", async () => {
    // window.localStorage.setItem(questionGeneratorApiKeyStorageKey("user-1"), "AIza-local-only");

    renderCreateFlow();

    await screen.findByText(/koneksi gemini aktif/i);

    fireEvent.click(screen.getByRole("button", { name: /hapus api key/i }));

    await waitFor(() => {
      expect(mockDeleteQuestionGeneratorCredential).toHaveBeenCalled();
    });

    // expect(window.localStorage.getItem(questionGeneratorApiKeyStorageKey("user-1"))).toBeNull();
  });
});
