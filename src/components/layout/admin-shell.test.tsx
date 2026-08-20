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
    expect(screen.getAllByRole("link", { name: /profil/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /logout/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /logout/i })[0]).toHaveAttribute("data-variant", "outline");
    expect(screen.queryByText(/mode admin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sumber data aktif/i)).not.toBeInTheDocument();

    const main = container.querySelector("main");
    const frame = container.querySelector("main > div");
    expect(main).toBeInTheDocument();
    expect(frame).toBeInTheDocument();
  });
});
