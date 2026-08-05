import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, test } from "vitest";
import HomePage from "./home-page";

afterEach(() => {
  cleanup();
});

describe("Home page", () => {
  test("renders the public homepage sections with Indonesian labels and a start CTA", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/lolos ujian profesi apoteker/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/try out, analitik, dan insight ai/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/simulasi penuh dan try out per blok/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/analitik area lemah/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/insight ai opsional/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/pilih ritme belajar/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/ringkasan fitur/i)).toBeInTheDocument();
    expect(screen.getByText(/lapisan opsional/i)).toBeInTheDocument();
    expect(screen.getByText(/alur berbasis simulasi/i)).toBeInTheDocument();
    expect(screen.getByText(/pratinjau langganan/i)).toBeInTheDocument();
    expect(screen.getByText(/pemanasan 7 hari/i)).toBeInTheDocument();

    const journeyLinks = screen.getAllByRole("link", {
      name: /mulai perjalanan try out/i,
    });

    expect(journeyLinks.length).toBeGreaterThan(0);
    expect(journeyLinks.every((link) => link.getAttribute("href") === "/auth/login")).toBe(true);
    expect(journeyLinks.some((link) => link.getAttribute("data-variant") === "primary")).toBe(true);
    expect(journeyLinks.some((link) => link.getAttribute("data-variant") === "outline")).toBe(true);
    expect(screen.getByRole("link", { name: /^masuk$/i })).toHaveAttribute("data-variant", "primary");
    expect(screen.getByRole("link", { name: /lihat alur belajar/i })).toHaveAttribute("data-variant", "outline");
  });

  test("exposes the key homepage sections and navigation anchors", () => {
    const { container } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(container.querySelector("#fitur")).toBeInTheDocument();
    expect(container.querySelector("#simulasi")).toBeInTheDocument();
    expect(container.querySelector("#harga")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /fitur/i })).toHaveAttribute("href", "#fitur");
    expect(screen.getByRole("link", { name: /simulasi/i })).toHaveAttribute("href", "#simulasi");
    expect(screen.getByRole("link", { name: /harga/i })).toHaveAttribute("href", "#harga");
    expect(screen.queryByText(/sumber data aktif/i)).not.toBeInTheDocument();
  });
});
