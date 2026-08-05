import { FileText, LayoutDashboard } from "lucide-react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import ProductShell from "./product-shell";

describe("ProductShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  test("keeps product navigation visible without debug or sprint chrome", () => {
    const { container } = render(
      <MemoryRouter>
        <ProductShell
          brand="Pawang Masuk Apoteker"
          tierLabel="Mentor"
          navItems={[
            { href: "/app", label: "Ringkasan", icon: LayoutDashboard, active: true },
            { href: "/profile", label: "Profil", icon: FileText },
          ]}
        >
          <div>Konten halaman</div>
        </ProductShell>
      </MemoryRouter>,
    );

    expect(screen.getByText(/pawang masuk apoteker/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /ringkasan/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /profil/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /logout/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /logout/i })[0]).toHaveAttribute("data-variant", "outline");
    expect(screen.queryByText(/sesi aktif/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sumber data aktif/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sprint hari ini/i)).not.toBeInTheDocument();

    const main = container.querySelector("main");
    expect(main).toHaveClass("flex-1");
  });

  test("renders top navigation bar with brand, nav links, and logout button", () => {
    const { container } = render(
      <MemoryRouter>
        <ProductShell
          brand="Pawang Masuk Apoteker"
          tierLabel="Mentor"
          navItems={[
            { href: "/app", label: "Ringkasan", icon: LayoutDashboard, active: true },
            { href: "/profile", label: "Profil", icon: FileText },
          ]}
        >
          <div>Konten halaman</div>
        </ProductShell>
      </MemoryRouter>,
    );

    expect(screen.getByText(/pawang masuk apoteker/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /ringkasan/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /profil/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /logout/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /logout/i })[0]).toHaveAttribute("data-variant", "outline");

    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass("sticky");

    const main = container.querySelector("main");
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass("flex-1");
  });
});

