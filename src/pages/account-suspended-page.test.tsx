import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import AccountSuspendedPage from "./account-suspended-page";

const mockLogout = vi.fn();
const mockUseSession = vi.fn();

vi.mock("../lib/auth/use-session", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("../lib/api/auth-api", () => ({
  logout: () => mockLogout(),
  bootstrapProfile: vi.fn().mockResolvedValue({
    id: "user-123",
    email: "siswa@example.com",
    fullName: "Siswa Belum Lunas",
    role: "belum_bayar",
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockUseSession.mockReturnValue({
    status: "authenticated",
    user: {
      id: "user-123",
      email: "siswa@example.com",
      user_metadata: { full_name: "Siswa Belum Lunas" },
    },
  });
});

describe("AccountSuspendedPage", () => {
  test("renders the required suspended notice message verbatim", async () => {
    render(
      <MemoryRouter>
        <AccountSuspendedPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(
        "Akun anda nonaktif, silahkan hubungi admin untuk melunasi pembayaran",
      ),
    ).toBeInTheDocument();
  });

  test("calls logout when Keluar button is clicked", async () => {
    render(
      <MemoryRouter>
        <AccountSuspendedPage />
      </MemoryRouter>,
    );

    const logoutButton = await screen.findByRole("button", { name: /keluar/i });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });
});
