import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import StudyAreaPage from "./study-area-page";

vi.mock("./use-student-shell", () => ({
  useStudentShell: () => ({
    navItems: [],
    tierLabel: "Student Plan",
    role: "student",
  }),
}));

vi.mock("../../lib/auth/use-session", () => ({
  useSession: () => ({
    status: "authenticated",
    user: { id: "student-1", email: "student@example.com" },
  }),
}));

describe("StudyAreaPage", () => {
  it("renders Area Belajar header and 3 learning feature cards", () => {
    render(
      <MemoryRouter>
        <StudyAreaPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Area Belajar")).toBeInTheDocument();
    expect(
      screen.getByText("Selesaikan materi pembelajaran, pemahaman konsep, dan kartu belajar.")
    ).toBeInTheDocument();

    // 3 feature titles
    expect(screen.getByText("Rekaman")).toBeInTheDocument();
    expect(screen.getByText("Materi")).toBeInTheDocument();
    expect(screen.getByText("Flash Card")).toBeInTheDocument();

    // Access links
    expect(screen.getByRole("link", { name: /Pilih Rekaman/i })).toHaveAttribute(
      "href",
      "/app/rekaman-kelas"
    );
    expect(screen.getByRole("link", { name: /Pilih Materi/i })).toHaveAttribute(
      "href",
      "/app/materi-ppt"
    );
    expect(screen.getByRole("link", { name: /Pilih Flash Card/i })).toHaveAttribute(
      "href",
      "/app/flash-cards"
    );
  });
});
