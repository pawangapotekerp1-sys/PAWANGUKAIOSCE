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
});
