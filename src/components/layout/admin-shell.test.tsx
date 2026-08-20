import { House, UserCircle } from "@phosphor-icons/react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, test } from "vitest";
import AdminShell from "./admin-shell";

describe("AdminShell", () => {
  test("shows admin navigation without debug status chrome", () => {
    const { container } = render(
      <MemoryRouter>
        <AdminShell
          title="Dashboard"
          description="Ringkasan admin untuk hari ini."
          navItems={[
            { href: "/admin", label: "Dashboard", icon: House, active: true },
            { href: "/profile", label: "Profil", icon: UserCircle },
          ]}
        >
          <div>Konten admin</div>
        </AdminShell>
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/pawang apoteker/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/area admin/i)).toBeInTheDocument();
    expect(screen.getByText(/dashboard/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /profil/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toHaveAttribute("data-variant", "outline");
    expect(screen.queryByText(/mode admin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sumber data aktif/i)).not.toBeInTheDocument();

    const main = container.querySelector("main");
    const frame = container.querySelector("main > div");
    const sidebarColumn = container.querySelector("main > div > aside");
    const nav = container.querySelector("main > div > aside nav");
    expect(main).not.toHaveClass("px-4");
    expect(frame).toHaveClass("w-full");
    expect(frame).not.toHaveClass("mx-auto");
    expect(sidebarColumn).toHaveClass("xl:sticky");
    expect(sidebarColumn).toHaveClass("xl:top-0");
    expect(sidebarColumn).toHaveClass("xl:h-[100dvh]");
    expect(sidebarColumn).toHaveClass("min-h-0");
    expect(sidebarColumn).toHaveClass("overflow-hidden");
    expect(nav).toHaveClass("overflow-y-auto");
    expect(nav).toHaveClass("min-h-0");
  });
});
