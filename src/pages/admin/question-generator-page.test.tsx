import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import QuestionGeneratorPage from "./question-generator-page";

const mockGenerateQuestionBatch = vi.fn();
const mockGetQuestionGeneratorStatus = vi.fn();
const mockSaveQuestionGeneratorCredential = vi.fn();
const mockTestQuestionGeneratorCredential = vi.fn();
const mockDeleteQuestionGeneratorCredential = vi.fn();

vi.mock("../../lib/api/question-generator-api", () => ({
  generateQuestionBatch: (...args: unknown[]) => mockGenerateQuestionBatch(...args),
  getQuestionGeneratorStatus: (...args: unknown[]) => mockGetQuestionGeneratorStatus(...args),
  saveQuestionGeneratorCredential: (...args: unknown[]) => mockSaveQuestionGeneratorCredential(...args),
  testQuestionGeneratorCredential: (...args: unknown[]) => mockTestQuestionGeneratorCredential(...args),
  deleteQuestionGeneratorCredential: (...args: unknown[]) => mockDeleteQuestionGeneratorCredential(...args),
}));

function renderQuestionGeneratorPage(initialEntry = "/admin/question-generator") {
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
        <Routes>
          <Route path="/admin/question-generator" element={<QuestionGeneratorPage />} />
          <Route path="/admin/question-generator/:batchId" element={<div>Review batch generator</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockGetQuestionGeneratorStatus.mockResolvedValue({
    hasCredential: true,
    model: "gemini-2.5-flash",
    modelLabel: "gemini-2.5-flash",
    lastValidatedAt: "2026-06-04T09:00:00.000Z",
    lastError: null,
  });
  mockGenerateQuestionBatch.mockResolvedValue({
    batchId: "batch-1",
    generatedCount: 3,
  });
  mockSaveQuestionGeneratorCredential.mockResolvedValue({
    hasCredential: true,
    model: "gemini-2.5-flash",
    modelLabel: "gemini-2.5-flash",
    lastValidatedAt: "2026-06-04T09:00:00.000Z",
    lastError: null,
  });
  mockTestQuestionGeneratorCredential.mockResolvedValue({
    status: {
      hasCredential: true,
      model: "gemini-2.5-flash",
      modelLabel: "gemini-2.5-flash",
      lastValidatedAt: "2026-06-04T09:02:00.000Z",
      lastError: null,
    },
    testResult: {
      ok: true,
      message: "Koneksi Gemini valid.",
      latencyMs: 480,
    },
  });
  mockDeleteQuestionGeneratorCredential.mockResolvedValue({
    hasCredential: false,
    model: "gemini-2.5-flash",
    modelLabel: "gemini-2.5-flash",
    lastValidatedAt: null,
    lastError: null,
  });
});

describe("Admin question generator page", () => {
  test("starts with one reference card and only allows adding up to three references", async () => {
    renderQuestionGeneratorPage();

    expect(await screen.findByText(/penyusun soal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/gunakan 1-3 soal acuan, lalu cek hasilnya sebelum disimpan ke bank soal atau sesi/i)).toBeInTheDocument();
    expect(await screen.findByText(/koneksi gemini aktif/i)).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: /^referensi \d+$/i })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /tambah referensi/i }));
    fireEvent.click(screen.getByRole("button", { name: /tambah referensi/i }));

    expect(screen.getAllByRole("heading", { name: /^referensi \d+$/i })).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /tambah referensi/i })).not.toBeInTheDocument();
  });

  test("allows submission with one fully completed reference question", async () => {
    renderQuestionGeneratorPage();

    await screen.findByText(/koneksi gemini aktif/i);

    fireEvent.change(screen.getByLabelText(/^pertanyaan$/i), {
      target: { value: "Pasien hipertensi dengan CKD membutuhkan terapi yang melindungi ginjal." },
    });
    fireEvent.change(screen.getByLabelText(/opsi a/i), {
      target: { value: "Amlodipin" },
    });
    fireEvent.change(screen.getByLabelText(/opsi b/i), {
      target: { value: "Lisinopril" },
    });
    fireEvent.change(screen.getByLabelText(/opsi c/i), {
      target: { value: "Parasetamol" },
    });
    fireEvent.change(screen.getByLabelText(/opsi d/i), {
      target: { value: "Metformin" },
    });
    fireEvent.change(screen.getByLabelText(/opsi e/i), {
      target: { value: "Omeprazol" },
    });
    fireEvent.change(screen.getByLabelText(/kunci jawaban/i), {
      target: { value: "B" },
    });
    fireEvent.change(screen.getByLabelText(/pembahasan/i), {
      target: { value: "ACE inhibitor membantu proteksi ginjal pada pasien ini." },
    });
    fireEvent.change(screen.getByLabelText(/jumlah soal/i), {
      target: { value: "3" },
    });

    fireEvent.click(screen.getByRole("button", { name: /buat soal/i }));

    await waitFor(() => {
      expect(mockGenerateQuestionBatch).toHaveBeenCalledWith({
        references: [
          {
            stem: "Pasien hipertensi dengan CKD membutuhkan terapi yang melindungi ginjal.",
            options: {
              A: "Amlodipin",
              B: "Lisinopril",
              C: "Parasetamol",
              D: "Metformin",
              E: "Omeprazol",
            },
            correctOptionKey: "B",
            explanationText: "ACE inhibitor membantu proteksi ginjal pada pasien ini.",
          },
        ],
        targetQuestionCount: 3,
      });
    });

    expect(await screen.findByText(/review batch generator/i)).toBeInTheDocument();
  });

  test("shows BYOK status and blocks generation when no valid key is available", async () => {
    mockGetQuestionGeneratorStatus.mockResolvedValueOnce({
      hasCredential: false,
      model: "gemini-2.5-flash",
      modelLabel: "gemini-2.5-flash",
      lastValidatedAt: null,
      lastError: "API key belum pernah divalidasi.",
    });

    renderQuestionGeneratorPage();

    expect(await screen.findByText(/koneksi gemini belum aktif/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buat soal/i })).toBeDisabled();
    expect(screen.getByText(/simpan dan tes api key gemini sebelum membuat soal/i)).toBeInTheDocument();
  });

  test("allows saving, testing, and deleting a personal Gemini credential from the generator page", async () => {
    mockGetQuestionGeneratorStatus.mockResolvedValueOnce({
      hasCredential: false,
      model: "gemini-2.5-flash",
      modelLabel: "gemini-2.5-flash",
      lastValidatedAt: null,
      lastError: "API key belum pernah divalidasi.",
    });

    renderQuestionGeneratorPage();

    expect(await screen.findByText(/koneksi gemini belum aktif/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/api key gemini/i), {
      target: { value: "AIzaSyDemoKey" },
    });
    fireEvent.click(screen.getByRole("button", { name: /simpan api key/i }));

    await waitFor(() => {
      expect(mockSaveQuestionGeneratorCredential).toHaveBeenCalledWith({
        apiKey: "AIzaSyDemoKey",
        model: "gemini-2.5-flash",
      });
    });

    fireEvent.click(screen.getByRole("button", { name: /tes koneksi/i }));

    await waitFor(() => {
      expect(mockTestQuestionGeneratorCredential).toHaveBeenCalled();
    });

    expect(await screen.findByText(/koneksi gemini valid/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /hapus api key/i }));

    await waitFor(() => {
      expect(mockDeleteQuestionGeneratorCredential).toHaveBeenCalled();
    });
  });

  test("explains how odd target counts are balanced across the three fresh variation modes", async () => {
    renderQuestionGeneratorPage();

    await screen.findByText(/koneksi gemini aktif/i);

    fireEvent.change(screen.getByLabelText(/jumlah soal/i), {
      target: { value: "5" },
    });

    expect(screen.getByText(/proses ini akan membuat 2 kasus baru, 2 variasi jebakan, dan 1 variasi penalaran/i)).toBeInTheDocument();
    expect(screen.getByText(/jika tidak habis dibagi tiga, variasi akan dibagi seimbang/i)).toBeInTheDocument();
  });

  test("blocks target counts above the per-batch limit before calling the generator API", async () => {
    renderQuestionGeneratorPage();

    await screen.findByText(/koneksi gemini aktif/i);

    fireEvent.change(screen.getByLabelText(/^pertanyaan$/i), {
      target: { value: "Pasien hipertensi dengan CKD membutuhkan terapi yang melindungi ginjal." },
    });
    fireEvent.change(screen.getByLabelText(/opsi a/i), {
      target: { value: "Amlodipin" },
    });
    fireEvent.change(screen.getByLabelText(/opsi b/i), {
      target: { value: "Lisinopril" },
    });
    fireEvent.change(screen.getByLabelText(/opsi c/i), {
      target: { value: "Parasetamol" },
    });
    fireEvent.change(screen.getByLabelText(/opsi d/i), {
      target: { value: "Metformin" },
    });
    fireEvent.change(screen.getByLabelText(/opsi e/i), {
      target: { value: "Omeprazol" },
    });
    fireEvent.change(screen.getByLabelText(/kunci jawaban/i), {
      target: { value: "B" },
    });
    fireEvent.change(screen.getByLabelText(/pembahasan/i), {
      target: { value: "ACE inhibitor membantu proteksi ginjal pada pasien ini." },
    });
    fireEvent.change(screen.getByLabelText(/jumlah soal/i), {
      target: { value: "21" },
    });

    fireEvent.click(screen.getByRole("button", { name: /buat soal/i }));

    expect(mockGenerateQuestionBatch).not.toHaveBeenCalled();
    expect(
      screen.getByText(/maksimal 20 soal per proses agar hasil tetap stabil/i),
    ).toBeInTheDocument();
  });
});
