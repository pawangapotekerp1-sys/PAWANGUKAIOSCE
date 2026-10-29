import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LiveClassPage from "./live-class-page";
import * as liveClassApi from "../../lib/api/live-class-api";

const mockUseStudentShell = vi.fn();

vi.mock("./use-student-shell", () => ({
  useStudentShell: (...args: unknown[]) => mockUseStudentShell(...args),
}));

vi.mock("../../lib/auth/use-session", () => ({
  useSession: () => ({
    status: "authenticated",
    user: { id: "user-1", email: "user@example.com" },
  }),
}));

describe("LiveClassPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStudentShell.mockReturnValue({
      navItems: [],
      tierLabel: "Student Plan",
      role: "student",
    });

    vi.spyOn(liveClassApi, "getLiveClasses").mockResolvedValue([
      {
        id: "class-1",
        title: "Webinar Pembahasan Try Out",
        startTime: "2026-10-30T10:00:00Z",
        endTime: "2026-10-30T12:00:00Z",
        zoomLink: "https://zoom.us/j/123",
        targetRoles: ["pro", "osce_pro"],
        createdAt: "2026-10-29T10:00:00Z",
        updatedAt: "2026-10-29T10:00:00Z",
      },
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders student view when mode=student", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/app/live-class?mode=student"]}>
          <LiveClassPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("Webinar Pembahasan Try Out")).toBeInTheDocument();
    expect(screen.getByText("Jadwal Live Class")).toBeInTheDocument();
  });

  it("renders mentor view when role=mentor and mode=manage", async () => {
    mockUseStudentShell.mockReturnValue({
      navItems: [],
      tierLabel: "Mentor Plan",
      role: "mentor",
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/app/live-class?mode=manage"]}>
          <LiveClassPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("Webinar Pembahasan Try Out")).toBeInTheDocument();
    expect(screen.getByText("Manajemen Live Class")).toBeInTheDocument();
    const addButtons = screen.getAllByRole("button", { name: /Tambah Jadwal Kelas/i });
    expect(addButtons.length).toBeGreaterThan(0);
  });

  it("opens create modal when clicking Tambah Jadwal Kelas in mentor mode", async () => {
    mockUseStudentShell.mockReturnValue({
      navItems: [],
      tierLabel: "Mentor Plan",
      role: "mentor",
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/app/live-class?mode=manage"]}>
          <LiveClassPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const addButtons = await screen.findAllByRole("button", { name: /Tambah Jadwal Kelas/i });
    fireEvent.click(addButtons[0]);

    expect(await screen.findByText("Tambah Jadwal Live Class")).toBeInTheDocument();
  });
});
