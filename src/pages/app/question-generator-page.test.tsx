import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, test, vi } from "vitest";
import QuestionGeneratorPage from "./question-generator-page";

vi.mock("../../components/question-generator/question-generator-create-flow", () => ({
  default: ({ basePath }: { basePath: string }) => (
    <div data-testid="question-generator-flow">{basePath}</div>
  ),
}));

vi.mock("./use-student-shell", () => ({
  useStudentShell: () => ({
    navItems: [],
    tierLabel: "Mentor",
  }),
}));

describe("Mentor question generator page", () => {
  test("renders cleaner mentor copy and keeps the generator flow", () => {
    render(
      <MemoryRouter>
        <QuestionGeneratorPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/penyusun soal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/buat soal dari topik acuan, lalu cek hasilnya sebelum dikirim ke bank soal atau sesi terjadwal/i)).toBeInTheDocument();
    expect(screen.getByTestId("question-generator-flow")).toHaveTextContent("/app/question-generator");
  });
});
