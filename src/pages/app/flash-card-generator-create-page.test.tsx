import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup } from "@testing-library/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import FlashCardGeneratorCreatePage from "./flash-card-generator-create-page";
import {
  clearFlashCardGeneratorApiKey,
  flashCardGeneratorApiKeyStorageKey,
} from "../../lib/flash-card-generator-byok-storage";

const mockCreateFlashCardMaterialDraft = vi.fn();
const mockProcessFlashCardMaterial = vi.fn();
const mockGetFlashCardGeneratorStatus = vi.fn();
const mockSaveFlashCardGeneratorCredential = vi.fn();
const mockTestFlashCardGeneratorCredential = vi.fn();
const mockDeleteFlashCardGeneratorCredential = vi.fn();

vi.mock("../../lib/api/flash-card-api", () => ({
  createFlashCardMaterialDraft: (...args: unknown[]) => mockCreateFlashCardMaterialDraft(...args),
  processFlashCardMaterial: (...args: unknown[]) => mockProcessFlashCardMaterial(...args),
  getFlashCardGeneratorStatus: (...args: unknown[]) => mockGetFlashCardGeneratorStatus(...args),
  saveFlashCardGeneratorCredential: (...args: unknown[]) => mockSaveFlashCardGeneratorCredential(...args),
  testFlashCardGeneratorCredential: (...args: unknown[]) => mockTestFlashCardGeneratorCredential(...args),
  deleteFlashCardGeneratorCredential: (...args: unknown[]) => mockDeleteFlashCardGeneratorCredential(...args),
}));

afterEach(() => {
  cleanup();
});

vi.mock("../../lib/auth/use-session", () => ({
  useSession: () => ({
    user: {
      id: "mentor-1",
    },
  }),
}));

vi.mock("./use-student-shell", () => ({
  useStudentShell: () => ({
    navItems: [],
    tierLabel: "Mentor",
  }),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/app/flash-card-generator/new"]}>
        <Routes>
          <Route path="/app/flash-card-generator/new" element={<FlashCardGeneratorCreatePage />} />
          <Route path="/app/flash-card-generator/:materialId" element={<div>Review route</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  mockCreateFlashCardMaterialDraft.mockResolvedValue({
    materialId: "material-1",
    status: "draft",
  });
  mockProcessFlashCardMaterial.mockResolvedValue({
    materialId: "material-1",
    status: "processing",
  });
  mockGetFlashCardGeneratorStatus.mockResolvedValue({
    hasCredential: true,
    model: "gemini-2.5-flash",
    modelLabel: "gemini-2.5-flash",
    lastValidatedAt: null,
    lastError: null,
  });
  mockSaveFlashCardGeneratorCredential.mockResolvedValue({
    hasCredential: true,
    model: "gemini-2.5-flash",
    modelLabel: "gemini-2.5-flash",
    lastValidatedAt: null,
    lastError: null,
  });
  mockTestFlashCardGeneratorCredential.mockResolvedValue({
    status: {
      hasCredential: true,
      model: "gemini-2.5-flash",
      modelLabel: "gemini-2.5-flash",
      lastValidatedAt: null,
      lastError: null,
    },
    testResult: {
      ok: true,
      message: "Koneksi Gemini valid.",
      latencyMs: 120,
    },
  });
  mockDeleteFlashCardGeneratorCredential.mockResolvedValue({
    hasCredential: false,
    model: "gemini-2.5-flash",
    modelLabel: "gemini-2.5-flash",
    lastValidatedAt: null,
    lastError: null,
  });
});

describe("FlashCardGeneratorCreatePage", () => {
  test("restores the Gemini key from local storage for the authenticated user", async () => {
    window.localStorage.setItem(flashCardGeneratorApiKeyStorageKey("mentor-1"), "AIza-restored-mentor-1");

    renderPage();

    await screen.findByText(/koneksi gemini aktif/i);

    expect(screen.getByLabelText(/api key gemini/i)).toHaveValue("AIza-restored-mentor-1");
  });

  test("blocks flash card processing when no validated BYOK is available", async () => {
    mockGetFlashCardGeneratorStatus.mockResolvedValueOnce({
      hasCredential: false,
      model: "gemini-2.5-flash",
      modelLabel: "gemini-2.5-flash",
      lastValidatedAt: null,
      lastError: null,
    });

    renderPage();

    await screen.findByText(/koneksi gemini belum aktif/i);

    expect(screen.getByRole("button", { name: /buat materi kartu belajar/i })).toBeDisabled();
    expect(screen.getByText(/simpan dan tes api key gemini sebelum memproses materi/i)).toBeInTheDocument();
  });

  test("shows cleaner Gemini access guidance for mentors", async () => {
    renderPage();

    expect(await screen.findByText(/status koneksi gemini/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/simpan api key sebelum materi diproses/i)).toBeInTheDocument();
    expect(screen.getByText(/model bawaan sudah ditetapkan agar hasil flash card tetap stabil/i)).toBeInTheDocument();
  });

  test("saves, tests, and deletes the user Gemini key from the flash card workflow", async () => {
    renderPage();

    await screen.findByText(/koneksi gemini aktif/i);
    expect(screen.getByRole("button", { name: /simpan api key/i })).toHaveAttribute("data-variant", "primary");
    expect(screen.getByRole("button", { name: /tes koneksi/i })).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("button", { name: /hapus api key/i })).toHaveAttribute("data-variant", "destructive");

    fireEvent.change(screen.getByLabelText(/api key gemini/i), {
      target: {
        value: "AIza-flash-card-user",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /simpan api key/i }));

    await waitFor(() => {
      expect(mockSaveFlashCardGeneratorCredential).toHaveBeenCalledWith({
        apiKey: "AIza-flash-card-user",
        model: "gemini-2.5-flash",
      });
    });

    fireEvent.click(screen.getByRole("button", { name: /tes koneksi/i }));

    await waitFor(() => {
      expect(mockTestFlashCardGeneratorCredential).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: /hapus api key/i }));

    await waitFor(() => {
      expect(mockDeleteFlashCardGeneratorCredential).toHaveBeenCalled();
    });

    expect(window.localStorage.getItem(flashCardGeneratorApiKeyStorageKey("mentor-1"))).toBeNull();
  });

  test("validates create flow and submits upload plus processing actions", async () => {
    renderPage();

    await screen.findByText(/koneksi gemini aktif/i);
    expect(screen.getByRole("button", { name: /buat materi kartu belajar/i })).toHaveAttribute("data-variant", "primary");

    fireEvent.click(screen.getByRole("button", { name: /buat materi kartu belajar/i }));
    expect(await screen.findByText(/judul materi wajib diisi/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/judul materi/i), {
      target: {
        value: "Farmakoterapi Hipertensi",
      },
    });
    fireEvent.change(screen.getByLabelText(/kelompok materi/i), {
      target: {
        value: "clinical_science",
      },
    });
    fireEvent.change(screen.getByLabelText(/unggah transkrip/i), {
      target: {
        files: [new File(["Transcript"], "kelas.txt", { type: "text/plain" })],
      },
    });
    fireEvent.change(screen.getByLabelText(/unggah slide pdf/i), {
      target: {
        files: [new File(["%PDF-1.4"], "slide.pdf", { type: "application/pdf" })],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /buat materi kartu belajar/i }));

    await waitFor(() => {
      expect(mockCreateFlashCardMaterialDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: "mentor-1",
          title: "Farmakoterapi Hipertensi",
          academicGroup: "Clinical Science",
        }),
      );
    });
    await waitFor(() => {
      expect(mockProcessFlashCardMaterial).toHaveBeenCalledWith({
        materialId: "material-1",
      });
    });
    expect(await screen.findByText(/review route/i)).toBeInTheDocument();
  });

  test("shows a mentor-facing error when material creation or processing fails", async () => {
    mockCreateFlashCardMaterialDraft.mockRejectedValueOnce(new Error("Upload transcript gagal."));

    renderPage();

    await screen.findByText(/koneksi gemini aktif/i);

    fireEvent.change(screen.getByLabelText(/judul materi/i), {
      target: {
        value: "Farmakoterapi Hipertensi",
      },
    });
    fireEvent.change(screen.getByLabelText(/kelompok materi/i), {
      target: {
        value: "clinical_science",
      },
    });
    fireEvent.change(screen.getByLabelText(/unggah transkrip/i), {
      target: {
        files: [new File(["Transcript"], "kelas.txt", { type: "text/plain" })],
      },
    });
    fireEvent.change(screen.getByLabelText(/unggah slide pdf/i), {
      target: {
        files: [new File(["%PDF-1.4"], "slide.pdf", { type: "application/pdf" })],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /buat materi kartu belajar/i }));

    expect(await screen.findByText(/upload transcript gagal\./i)).toBeInTheDocument();
  });

  test("shows shorter sync copy when local key has not been connected", async () => {
    mockGetFlashCardGeneratorStatus
      .mockResolvedValueOnce({
        hasCredential: false,
        model: "gemini-2.5-flash",
        modelLabel: "gemini-2.5-flash",
        lastValidatedAt: null,
        lastError: null,
      })
      .mockResolvedValueOnce({
        hasCredential: false,
        model: "gemini-2.5-flash",
        modelLabel: "gemini-2.5-flash",
        lastValidatedAt: null,
        lastError: null,
      });

    window.localStorage.setItem(flashCardGeneratorApiKeyStorageKey("mentor-1"), "AIza-restored-mentor-1");

    renderPage();

    expect(await screen.findByText(/api key ini sudah tersimpan di perangkat, tetapi belum tersambung ke akun anda/i)).toBeInTheDocument();
  });

  test("shows shorter status error copy when Gemini access status cannot load", async () => {
    mockGetFlashCardGeneratorStatus.mockReset();
    mockGetFlashCardGeneratorStatus.mockRejectedValue(new Error("failed"));

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(/status koneksi belum tersedia/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/status koneksi gemini belum bisa dimuat\. muat ulang lalu coba lagi\./i);
  });
});

afterEach(() => {
  clearFlashCardGeneratorApiKey("mentor-1");
});
