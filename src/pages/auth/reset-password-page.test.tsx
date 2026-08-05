import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import LoginPage from "./login-page";
import ResetPasswordPage from "./reset-password-page";

const mockRequestPasswordReset = vi.fn();
const mockUpdatePasswordAfterRecovery = vi.fn();

vi.mock("../../lib/api/auth-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api/auth-api")>();

  return {
    ...actual,
    requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args),
    updatePasswordAfterRecovery: (...args: unknown[]) => mockUpdatePasswordAfterRecovery(...args),
  };
});

function renderResetPasswordPage() {
  render(
    <MemoryRouter initialEntries={["/auth/reset-password"]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockRequestPasswordReset.mockResolvedValue(undefined);
  mockUpdatePasswordAfterRecovery.mockResolvedValue(undefined);
});

describe("password recovery flow pages", () => {
  test("requests a password reset email from login", async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /lupa password/i }));
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: {
        value: "user@example.com",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /kirim link reset/i }));

    await waitFor(() => {
      expect(mockRequestPasswordReset).toHaveBeenCalledWith({
        email: "user@example.com",
      });
    });
  });

  test("submits a new password from the reset page", async () => {
    renderResetPasswordPage();

    expect(
      screen.getByText(/buat kata sandi baru/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/masukkan kata sandi baru untuk menyelesaikan aktivasi atau pemulihan akun/i),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^kata sandi baru$/i), {
      target: {
        value: "Baru12345!",
      },
    });
    fireEvent.change(screen.getByLabelText(/konfirmasi kata sandi baru/i), {
      target: {
        value: "Baru12345!",
      },
    });
    const savePasswordButton = screen.getByRole("button", { name: /simpan kata sandi/i });
    fireEvent.click(savePasswordButton);

    expect(savePasswordButton).toHaveAttribute(
      "data-variant",
      "primary",
    );
    expect(savePasswordButton).toHaveAttribute(
      "data-size",
      "lg",
    );

    await waitFor(() => {
      expect(mockUpdatePasswordAfterRecovery).toHaveBeenCalledWith({
        nextPassword: "Baru12345!",
      });
    });
  });
});
