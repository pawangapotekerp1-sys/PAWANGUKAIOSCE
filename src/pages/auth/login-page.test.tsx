import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, test, vi } from "vitest";
import LoginPage from "./login-page";

vi.mock("../../lib/api/auth-api", () => ({
  loginWithPassword: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("Login page", () => {
  test("keeps the active email login controls and links Lupa password to WhatsApp support", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/selamat datang/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/kata sandi/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /masuk dengan email/i,
      }),
    ).toHaveAttribute("data-variant", "primary");
    
    const forgotPasswordLink = screen.getByRole("link", { name: /lupa password/i });
    expect(forgotPasswordLink).toBeInTheDocument();
    expect(forgotPasswordLink).toHaveAttribute(
      "href",
      "https://wa.me/6281313683288?text=Assalamualaikum%20A%20saya%20tidak%20bisa%20login%20di%20web%20pawangapt.%20Mohon%20bantuannya",
    );

    expect(
      screen.queryByText(/masuk dengan email dan kata sandi supabase-mu/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/belum punya akun/i)).not.toBeInTheDocument();
  });
});
