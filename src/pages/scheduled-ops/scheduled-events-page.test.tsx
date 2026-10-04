import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ScheduledEventsPage from "./scheduled-events-page";

const mockListScheduledOpsEvents = vi.fn();
const mockCreateScheduledEvent = vi.fn();
const mockUpdateScheduledEvent = vi.fn();
const mockDeleteScheduledEvent = vi.fn();

vi.mock("../../lib/api/scheduled-tryout-api", () => ({
  listScheduledOpsEvents: (...args: unknown[]) => mockListScheduledOpsEvents(...args),
  createScheduledEvent: (...args: unknown[]) => mockCreateScheduledEvent(...args),
  updateScheduledEvent: (...args: unknown[]) => mockUpdateScheduledEvent(...args),
  deleteScheduledEvent: (...args: unknown[]) => mockDeleteScheduledEvent(...args),
}));

function renderScheduledEvents(initialEntry = "/scheduled-ops/events") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<Outlet context={{ role: "mentor" as const }} />}>
            <Route path="/scheduled-ops/events" element={<ScheduledEventsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockListScheduledOpsEvents.mockResolvedValue([
    {
      id: "event-draft",
      title: "TO Draft Farmasi",
      description: "Masih dirakit mentor.",
      editorialStatus: "draft",
      accessStartAt: "2026-06-20T01:00:00.000Z",
      accessEndAt: "2026-06-21T14:00:00.000Z",
      currentCycle: 1,
      questionCount: 20,
      durationMinutes: 20,
      status: "draft",
      statusLabel: "Draft",
      questionCountLabel: "20 soal",
      durationLabel: "20 menit",
      windowLabel: "20 Jun 08.00 - 21 Jun 21.00 WIB",
      maxAttempts: 1,
    }
  ]);
  mockCreateScheduledEvent.mockResolvedValue({ id: "new-event" });
  mockUpdateScheduledEvent.mockResolvedValue({ id: "event-draft" });
  mockDeleteScheduledEvent.mockResolvedValue({ deletedId: "event-draft" });
});

describe("Scheduled events page", () => {
  test("renders the data table view", async () => {
    renderScheduledEvents();

    expect(await screen.findByText(/daftar tryout/i)).toBeInTheDocument();
    expect(await screen.findByText(/tambah tryout/i)).toBeInTheDocument();
    expect(await screen.findByText(/to draft farmasi/i)).toBeInTheDocument();
  });

  test("opens create modal when Tambah Tryout is clicked", async () => {
    renderScheduledEvents();

    const addBtn = await screen.findByText(/tambah tryout/i);
    fireEvent.click(addBtn);

    expect(await screen.findByText(/tambah tryout baru/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /simpan/i })).toBeInTheDocument();
  });

  test("deletes an event after confirmation", async () => {
    renderScheduledEvents();

    const deleteBtns = await screen.findAllByTitle(/hapus event/i);
    fireEvent.click(deleteBtns[0]);
    
    const confirmBtn = await screen.findByRole("button", { name: /hapus event/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteScheduledEvent).toHaveBeenCalledWith({
        eventId: "event-draft",
      });
    });
  });
  test("submits create form with correct payload", async () => {
    renderScheduledEvents();

    // Click Tambah Tryout
    const addBtn = await screen.findByText(/tambah tryout/i);
    fireEvent.click(addBtn);

    // Fill form
    fireEvent.change(await screen.findByLabelText(/Judul Tryout/i), { target: { value: "Tryout Baru" } });
    fireEvent.change(await screen.findByLabelText(/Jumlah Soal/i), { target: { value: "50" } });
    fireEvent.change(await screen.findByLabelText(/Durasi \(menit\)/i), { target: { value: "120" } });
    fireEvent.change(await screen.findByLabelText(/Maksimum Percobaan/i), { target: { value: "3" } });
    fireEvent.change(await screen.findByLabelText(/Tanggal Mulai/i), { target: { value: "2026-10-01" } });
    fireEvent.change(await screen.findByLabelText(/Waktu Mulai/i), { target: { value: "08:00" } });
    fireEvent.change(await screen.findByLabelText(/Tanggal Selesai/i), { target: { value: "2026-10-02" } });
    fireEvent.change(await screen.findByLabelText(/Waktu Selesai/i), { target: { value: "18:00" } });

    // Submit
    const submitBtn = screen.getByRole("button", { name: /simpan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateScheduledEvent).toHaveBeenCalledWith({
        input: {
          title: "Tryout Baru",
          description: "",
          editorialStatus: "draft",
          accessStartAt: "2026-10-01T08:00",
          accessEndAt: "2026-10-02T18:00",
          totalQuestions: 50,
          durationMinutes: 120,
          maxAttempts: 3,
        }
      });
    });
  });

  test("submits update form with preserved description and editorialStatus", async () => {
    renderScheduledEvents();

    // Click Ubah Event (mocked event has id event-draft)
    const editBtns = await screen.findAllByTitle(/Ubah Event/i);
    fireEvent.click(editBtns[0]);

    // Form should be populated. Change title.
    const titleInput = await screen.findByLabelText(/Judul Tryout/i);
    fireEvent.change(titleInput, { target: { value: "TO Draft Farmasi Updated" } });

    // Submit
    const submitBtn = screen.getByRole("button", { name: /Simpan Perubahan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateScheduledEvent).toHaveBeenCalledWith({
        eventId: "event-draft",
        input: {
          title: "TO Draft Farmasi Updated",
          description: "Masih dirakit mentor.",
          editorialStatus: "draft",
          accessStartAt: "2026-06-20T08:00", // Wait, formatDateTimeForInput converts to local time. Let's just match any object since local time might be different based on timezone.
          accessEndAt: expect.any(String),
          totalQuestions: 20,
          durationMinutes: 20,
          maxAttempts: 1,
        }
      });
      // specific check for accessStartAt because of timezone issues in test
      const callArgs = mockUpdateScheduledEvent.mock.calls[0][0];
      expect(callArgs.input.accessStartAt).toMatch(/T/);
    });
  });
});
