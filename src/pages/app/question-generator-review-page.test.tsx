import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, test, vi } from "vitest";
import QuestionGeneratorReviewPage from "./question-generator-review-page";

vi.mock("../../components/question-generator/question-generator-review-flow", () => ({
  default: () => <div data-testid="question-generator-review-flow">review-flow</div>,
}));

vi.mock("./use-student-shell", () => ({
  useStudentShell: () => ({
    navItems: [],
    tierLabel: "Mentor",
  }),
}));

describe("Mentor question generator review page", () => {
  test("renders shorter review copy and keeps the review flow", () => {
    render(
      <MemoryRouter>
        <QuestionGeneratorReviewPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/tinjau hasil/i)).toBeInTheDocument();
    expect(screen.getByText(/penyusun soal/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByText(/periksa hasil soal sebelum dikirim ke bank soal atau sesi/i)).toBeInTheDocument();
    expect(screen.getByTestId("question-generator-review-flow")).toBeInTheDocument();
  });
});
