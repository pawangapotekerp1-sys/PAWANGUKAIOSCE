import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ScheduledEventsPage from "./scheduled-events-page";

const mockListScheduledOpsEvents = vi.fn();
const mockReactivateScheduledEvent = vi.fn();
const mockDeleteScheduledEvent = vi.fn();

vi.mock("../../lib/api/scheduled-tryout-api", () => ({
  listScheduledOpsEvents: (...args: unknown[]) => mockListScheduledOpsEvents(...args),
  reactivateScheduledEvent: (...args: unknown[]) => mockReactivateScheduledEvent(...args),
  deleteScheduledEvent: (...args: unknown[]) => mockDeleteScheduledEvent(...args),
}));

function renderScheduledEvents(initialEntry = "/scheduled-ops/events?view=list") {
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
    },
    {
      id: "event-upcoming",
      title: "TO Upcoming Klinik",
      description: "Akan dibuka pekan depan.",
      editorialStatus: "published",
      accessStartAt: "2026-06-22T01:00:00.000Z",
      accessEndAt: "2026-06-23T14:00:00.000Z",
      currentCycle: 1,
      questionCount: 30,
      durationMinutes: 30,
      status: "upcoming",
      statusLabel: "Upcoming",
      questionCountLabel: "30 soal",
      durationLabel: "30 menit",
      windowLabel: "22 Jun 08.00 - 23 Jun 21.00 WIB",
    },
    {
      id: "event-active",
      title: "TO Aktif UKAI",
      description: "Sedang live untuk peserta pro.",
      editorialStatus: "published",
      accessStartAt: "2026-06-10T01:00:00.000Z",
      accessEndAt: "2026-06-11T14:00:00.000Z",
      currentCycle: 2,
      questionCount: 40,
      durationMinutes: 40,
      status: "active",
      statusLabel: "Active",
      questionCountLabel: "40 soal",
      durationLabel: "40 menit",
      windowLabel: "10 Jun 08.00 - 11 Jun 21.00 WIB",
    },
    {
      id: "event-expired",
      title: "TO Expired Farmakoterapi",
      description: "Perlu diaktifkan ulang dengan reset cycle.",
      editorialStatus: "published",
      accessStartAt: "2026-06-01T01:00:00.000Z",
      accessEndAt: "2026-06-03T14:00:00.000Z",
      currentCycle: 3,
      questionCount: 50,
      durationMinutes: 50,
      status: "expired",
      statusLabel: "Expired",
      questionCountLabel: "50 soal",
      durationLabel: "50 menit",
      windowLabel: "01 Jun 08.00 - 03 Jun 21.00 WIB",
    },
  ]);
  mockReactivateScheduledEvent.mockResolvedValue({
    id: "event-expired",
    title: "TO Expired Farmakoterapi",
  });
  mockDeleteScheduledEvent.mockResolvedValue({
    deletedId: "event-expired",
  });
});

describe("Scheduled events page", () => {
  test("renders 2 feature selection cards on default entry without showing event list", async () => {
    renderScheduledEvents("/scheduled-ops/events");

    expect(await screen.findByText(/pemilihan fitur event terjadwal/i)).toBeInTheDocument();
    const daftarEventLinks = screen.getAllByRole("link", { name: /daftar event/i });
    expect(daftarEventLinks.some((link) => link.getAttribute("href") === "/scheduled-ops/events?view=list")).toBe(true);
    expect(screen.getByRole("link", { name: /event baru/i })).toHaveAttribute(
      "href",
      "/scheduled-ops/events/new?fresh=1",
    );
    expect(screen.queryByText(/to draft farmasi/i)).not.toBeInTheDocument();
  });

  test("renders the scheduled ops shell with draft, upcoming, active, and expired rows in list view", async () => {
    renderScheduledEvents();

    expect(await screen.findByText(/kelola event terjadwal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(
      screen.getByText(/pantau event aktif, draft, dan yang sudah selesai dari satu halaman kerja/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /event terjadwal/i })).toHaveAttribute(
      "href",
      "/scheduled-ops/events",
    );
    expect(await screen.findByText(/to draft farmasi/i)).toBeInTheDocument();
    expect(screen.getAllByText(/daftar event/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /event baru/i })).toHaveAttribute("data-variant", "primary");
    expect(screen.getByText(/to upcoming klinik/i)).toBeInTheDocument();
    expect(screen.getByText(/to aktif ukai/i)).toBeInTheDocument();
    expect(screen.getByText(/to expired farmakoterapi/i)).toBeInTheDocument();
    expect(screen.getAllByText("Draft").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Upcoming").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Expired").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /ubah event/i })).toSatisfy((links: HTMLElement[]) =>
      links.every((link) => link.getAttribute("data-variant") === "primary"),
    );
    expect(screen.getByRole("link", { name: /event baru/i })).toHaveAttribute(
      "href",
      "/scheduled-ops/events/new?fresh=1",
    );
    expect(screen.getByRole("button", { name: /aktifkan lagi/i })).toHaveAttribute(
      "data-variant",
      "secondary",
    );
    expect(screen.getByRole("button", { name: /hapus event/i })).toHaveAttribute("data-variant", "destructive");
  });

  test("explains that upcoming events stay hidden from the student lane until the access window is active", async () => {
    renderScheduledEvents("/scheduled-ops/events?view=list");

    expect(await screen.findByText(
      /belum tampil ke peserta\. event akan muncul saat jadwal mulai/i,
    )).toBeInTheDocument();
  });

  test("shows concise loading state copy while the event list is still loading", async () => {
    mockListScheduledOpsEvents.mockImplementationOnce(() => new Promise(() => {}));

    renderScheduledEvents("/scheduled-ops/events?view=list");

    expect(await screen.findByText(/menyiapkan daftar event/i)).toBeInTheDocument();
  });

  test("shows concise empty state copy when no event has been created yet", async () => {
    mockListScheduledOpsEvents.mockResolvedValueOnce([]);

    renderScheduledEvents("/scheduled-ops/events?view=list");

    expect(await screen.findByText(/belum ada event/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/belum ada event yang dibuat/i)).toBeInTheDocument();
  });

  test("re-activates an expired event with new start and end datetimes", async () => {
    const promptSpy = vi.spyOn(window, "prompt")
      .mockReturnValueOnce("2026-06-15T08:00")
      .mockReturnValueOnce("2026-06-17T21:00");

    renderScheduledEvents("/scheduled-ops/events?view=list");

    fireEvent.click(await screen.findByRole("button", { name: /aktifkan lagi/i }));

    await waitFor(() => {
      expect(mockReactivateScheduledEvent).toHaveBeenCalledWith({
        eventId: "event-expired",
        accessStartAt: "2026-06-15T08:00",
        accessEndAt: "2026-06-17T21:00",
      });
    });

    expect(promptSpy).toHaveBeenCalledTimes(2);
  });

  test("deletes an expired event after confirmation in an accessible dialog", async () => {
    renderScheduledEvents("/scheduled-ops/events?view=list");

    fireEvent.click(await screen.findByRole("button", { name: /hapus event/i }));
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: /hapus event/i }),
    );

    await waitFor(() => {
      expect(mockDeleteScheduledEvent).toHaveBeenCalledWith({
        eventId: "event-expired",
      });
    });
  });
});
