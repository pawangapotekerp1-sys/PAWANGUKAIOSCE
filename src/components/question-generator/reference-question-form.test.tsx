import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import ReferenceQuestionForm from "./reference-question-form";

afterEach(() => {
  cleanup();
});

describe("ReferenceQuestionForm", () => {
  test("renders one complete reference editor with A-E fields and guidance that trusted links are required only for the final question output", () => {
    const onChange = vi.fn();

    render(
      <ReferenceQuestionForm
        index={0}
        onChange={onChange}
        value={{
          stem: "",
          options: {
            A: "",
            B: "",
            C: "",
            D: "",
            E: "",
          },
          correctOptionKey: "A",
          explanationText: "",
        }}
      />,
    );

    expect(screen.getByText(/referensi 1/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^pertanyaan$/i)).toBeRequired();
    expect(screen.getByLabelText(/opsi a/i)).toBeRequired();
    expect(screen.getByLabelText(/opsi e/i)).toBeRequired();
    expect(screen.getByLabelText(/kunci jawaban/i)).toBeRequired();
    expect(screen.getByLabelText(/pembahasan/i)).toBeRequired();
    expect(screen.getByText(/satu referensi lengkap sudah cukup untuk menyusun soal/i)).toBeInTheDocument();
    expect(screen.getByText(/sumber tepercaya wajib ada di hasil soal/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/referensi di sini tidak wajib berupa tautan tepercaya/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tambahkan template pustaka/i })).toHaveAttribute("data-variant", "outline");

    fireEvent.change(screen.getByLabelText(/opsi c/i), {
      target: { value: "Pilihan C" },
    });

    expect(onChange).toHaveBeenCalledWith({
      stem: "",
      options: {
        A: "",
        B: "",
        C: "Pilihan C",
        D: "",
        E: "",
      },
      correctOptionKey: "A",
      explanationText: "",
    });
  });

  test("inserts a bibliography template into the explanation field", () => {
    const onChange = vi.fn();

    render(
      <ReferenceQuestionForm
        index={0}
        onChange={onChange}
        value={{
          stem: "",
          options: {
            A: "",
            B: "",
            C: "",
            D: "",
            E: "",
          },
          correctOptionKey: "A",
          explanationText: "Pembahasan inti.",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /tambahkan template pustaka/i }));

    expect(onChange).toHaveBeenCalledWith({
      stem: "",
      options: {
        A: "",
        B: "",
        C: "",
        D: "",
        E: "",
      },
      correctOptionKey: "A",
      explanationText: "Pembahasan inti.\n\nPustaka:\n1. ",
    });
  });

  test("shows a destructive remove action when more than one reference is allowed", () => {
    render(
      <ReferenceQuestionForm
        index={1}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        value={{
          stem: "",
          options: {
            A: "",
            B: "",
            C: "",
            D: "",
            E: "",
          },
          correctOptionKey: "A",
          explanationText: "",
        }}
      />,
    );

    expect(screen.getByRole("button", { name: /hapus referensi/i })).toHaveAttribute("data-variant", "destructive");
  });
});
