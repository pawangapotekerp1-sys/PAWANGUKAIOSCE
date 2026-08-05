import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import UsersPage from "./users-page";

const mockListManagedUsers = vi.fn();
const mockCreateManagedUser = vi.fn();
const mockUpdateManagedUserRole = vi.fn();

vi.mock("../../lib/api/admin-api", () => ({
  listManagedUsers: (...args: unknown[]) => mockListManagedUsers(...args),
  createManagedUser: (...args: unknown[]) => mockCreateManagedUser(...args),
  updateManagedUserRole: (...args: unknown[]) => mockUpdateManagedUserRole(...args),
}));

function renderUsersPage(initialEntry = "/admin/users") {
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
        <UsersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockListManagedUsers.mockResolvedValue([
    {
      id: "user-1",
      email: "admin@example.com",
      fullName: "Admin Operasional",
      leaderboardAlias: null,
      role: "admin",
      createdAt: "2026-05-01T00:00:00.000Z",
      filterLabel: "admin",
    },
    {
      id: "user-2",
      email: "pro@example.com",
      fullName: "Peserta Pro",
      leaderboardAlias: "FarmasiPro",
      role: "pro",
      createdAt: "2026-05-02T00:00:00.000Z",
      filterLabel: "user_aktif",
    },
    {
      id: "user-3",
      email: "baru@example.com",
      fullName: "Peserta Baru",
      leaderboardAlias: null,
      role: "pendaftar_baru",
      createdAt: "2026-05-03T00:00:00.000Z",
      filterLabel: "belum_bayar",
    },
  ]);
  mockCreateManagedUser.mockResolvedValue({
    action: "create_user",
    user: {
      id: "user-4",
      email: "baru2@example.com",
      role: "pendaftar_baru",
      fullName: "Peserta Baru 2",
    },
  });
  mockUpdateManagedUserRole.mockResolvedValue({
    action: "update_role",
    profile: {
      id: "user-2",
      role: "admin",
    },
  });
});

describe("UsersPage", () => {
  test("shows clearer copy on the create account form", async () => {
    renderUsersPage();

    expect(await screen.findByText(/kelola pengguna/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /buka form akun/i }));

    expect(
      screen.getByText(/pengguna akan menerima email untuk membuat kata sandi/i),
    ).toBeInTheDocument();
  });

  test("filters users into user aktif, belum bayar, and admin groups", async () => {
    renderUsersPage();

    expect(await screen.findByText(/kelola pengguna/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buka form akun/i })).toHaveAttribute("data-variant", "primary");
    expect(screen.getByRole("button", { name: /^semua$/i })).toHaveAttribute("data-variant", "secondary");

    fireEvent.click(screen.getByRole("button", { name: /^aktif$/i }));

    expect(screen.getByText("pro@example.com")).toBeInTheDocument();
    expect(screen.queryByText("baru@example.com")).not.toBeInTheDocument();
  });

  test("creates a user and shows success feedback", async () => {
    renderUsersPage();

    expect(await screen.findByText(/kelola pengguna/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /buka form akun/i }));
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: {
        value: "baru2@example.com",
      },
    });
    fireEvent.change(screen.getByLabelText(/^nama$/i), {
      target: {
        value: "Peserta Baru 2",
      },
    });
    fireEvent.change(screen.getByLabelText(/peran awal/i), {
      target: {
        value: "pendaftar_baru",
      },
    });
    expect(screen.getByRole("button", { name: /buat akun/i })).toHaveAttribute("data-variant", "primary");
    fireEvent.click(screen.getByRole("button", { name: /buat akun/i }));

    await waitFor(() => {
      expect(mockCreateManagedUser).toHaveBeenCalled();
    });
    expect(mockCreateManagedUser.mock.calls[0]?.[0]).toEqual({
      email: "baru2@example.com",
      fullName: "Peserta Baru 2",
      role: "pendaftar_baru",
    });

    expect(
      await screen.findByText(/email untuk membuat kata sandi sudah dikirim/i),
    ).toBeInTheDocument();
  });

  test("updates a user's role inline", async () => {
    renderUsersPage();

    expect(await screen.findByText(/kelola pengguna/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(await screen.findByText("pro@example.com")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: /^peran-pro@example\.com$/i }), {
      target: {
        value: "admin",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /simpan peran-pro@example.com/i }));

    await waitFor(() => {
      expect(mockUpdateManagedUserRole).toHaveBeenCalledWith({
        userId: "user-2",
        role: "admin",
      });
    });
    expect(screen.getByRole("button", { name: /simpan peran-pro@example.com/i })).toHaveAttribute("data-variant", "primary");
  });

  test("supports assigning the mentor role from the admin user manager", async () => {
    renderUsersPage();

    expect(await screen.findByText("pro@example.com")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: /^peran-pro@example\.com$/i }), {
      target: {
        value: "mentor",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /simpan peran-pro@example.com/i }));

    await waitFor(() => {
      expect(mockUpdateManagedUserRole).toHaveBeenCalledWith({
        userId: "user-2",
        role: "mentor",
      });
    });
  });
});
