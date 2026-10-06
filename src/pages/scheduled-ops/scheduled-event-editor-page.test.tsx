import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ScheduledEventEditorPage from "./scheduled-event-editor-page";

const mockGetScheduledEventEditorData = vi.fn();
const mockUpdateScheduledEvent = vi.fn();
const mockUploadScheduledQuestionMedia = vi.fn();

vi.mock("../../lib/api/scheduled-tryout-api", () => ({
  getScheduledEventEditorData: (...args: unknown[]) => mockGetScheduledEventEditorData(...args),
  updateScheduledEvent: (...args: unknown[]) => mockUpdateScheduledEvent(...args),
  uploadScheduledQuestionMedia: (...args: unknown[]) => mockUploadScheduledQuestionMedia(...args),
}));

// Mock ResizeObserver for modal
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

function renderScheduledEventEditor(initialEntry = "/scheduled-ops/events/event-1/questions") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const renderResult = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<Outlet />}>
            <Route path="/scheduled-ops/events" element={<div>Scheduled events list</div>} />
            <Route path="/scheduled-ops/events/:id/questions" element={<ScheduledEventEditorPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { ...renderResult, queryClient };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("confirm", () => true); // Auto-confirm deletions
  
  mockGetScheduledEventEditorData.mockResolvedValue({
    event: {
      id: "event-1",
      title: "TO Klinik Juni",
      description: "Deskripsi",
      editorialStatus: "draft",
      accessStartAt: "2026-06-01T07:00:00Z",
      accessEndAt: "2026-06-01T10:00:00Z",
      durationMinutes: 100,
      questionCount: 1,
      maxAttempts: 1,
      updatedAt: "2026-06-01T00:00:00Z",
      currentCycle: 1,
    },
    questions: [
      {
        id: "question-1",
        order: 1,
        stem: "Apa terapi awal yang paling rasional?",
        questionImagePath: null,
        questionImageUrl: null,
        explanationText: "ACE inhibitor dipilih sebagai fondasi awal.",
        explanationImagePath: null,
        explanationImageUrl: null,
        correctOptionKey: "B",
        options: [
          { key: "A", text: "Pilihan A" },
          { key: "B", text: "Pilihan B" },
          { key: "C", text: "" },
          { key: "D", text: "" },
          { key: "E", text: "" },
        ],
      }
    ],
  });
  mockUpdateScheduledEvent.mockResolvedValue({ id: "event-1" });
});

describe("Scheduled event editor page - Grid and Modal", () => {
  test("renders question cards and opens modal on add", async () => {
    renderScheduledEventEditor();
    
    // Check header
    expect(await screen.findByText("Daftar Soal Tryout")).toBeInTheDocument();
    
    // Check existing card
    expect(screen.getByText("Apa terapi awal yang paling rasional?")).toBeInTheDocument();
    
    // Click add
    fireEvent.click(screen.getByText("Tambah Soal Baru"));
    
    // Modal opens
    expect(await screen.findByText("Tambah Soal Baru", { selector: 'h2' })).toBeInTheDocument();
    
    // Fill and save modal
    const stemInput = screen.getByLabelText("Pertanyaan");
    fireEvent.change(stemInput, { target: { value: "Soal Baru?" } });
    
    fireEvent.click(screen.getByRole("button", { name: "Simpan Soal" }));
    
    // Modal closes, API called
    await waitFor(() => {
      expect(mockUpdateScheduledEvent).toHaveBeenCalled();
    });
    
    const updateCall = mockUpdateScheduledEvent.mock.calls[0][0];
    expect(updateCall.eventId).toBe("event-1");
    expect(updateCall.input.questions).toHaveLength(2);
    expect(updateCall.input.questions[1].stem).toBe("Soal Baru?");
  });

  test("can edit an existing question via modal", async () => {
    renderScheduledEventEditor();
    expect(await screen.findByText("Daftar Soal Tryout")).toBeInTheDocument();
    
    // Find edit button (Pencil icon inside card)
    const cards = document.querySelectorAll(".bg-card");
    const editBtn = within(cards[0] as HTMLElement).getAllByRole("button")[0];
    fireEvent.click(editBtn);
    
    // Modal opens with data
    expect(await screen.findByText("Edit Soal", { selector: 'h2' })).toBeInTheDocument();
    const stemInput = screen.getByLabelText("Pertanyaan");
    expect(stemInput).toHaveValue("Apa terapi awal yang paling rasional?");
    
    fireEvent.change(stemInput, { target: { value: "Soal Diedit?" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan Soal" }));
    
    await waitFor(() => {
      expect(mockUpdateScheduledEvent).toHaveBeenCalled();
    });
    
    const updateCall = mockUpdateScheduledEvent.mock.calls[0][0];
    expect(updateCall.input.questions[0].stem).toBe("Soal Diedit?");
  });

  test("can delete a question", async () => {
    renderScheduledEventEditor();
    expect(await screen.findByText("Daftar Soal Tryout")).toBeInTheDocument();
    
    const cards = document.querySelectorAll(".bg-card");
    const deleteBtn = within(cards[0] as HTMLElement).getAllByRole("button")[1];
    fireEvent.click(deleteBtn);
    
    await waitFor(() => {
      expect(mockUpdateScheduledEvent).toHaveBeenCalled();
    });
    
    const updateCall = mockUpdateScheduledEvent.mock.calls[0][0];
    expect(updateCall.input.questions).toHaveLength(0);
  });
});
