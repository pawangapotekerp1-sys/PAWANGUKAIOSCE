import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import FlashCardViewer from "./flash-card-viewer";

const MOCK_CARDS = [
  {
    id: "card-1",
    frontText: "Neurotransmiter utama pada sistem saraf parasimpatis adalah _____.",
    backText: "Asetilkolin (ACh).",
    sortOrder: 1,
    savedDifficulty: null,
    lastReviewedAt: null,
  },
  {
    id: "card-2",
    frontText: "Mengapa ACEI sering menyebabkan efek samping batuk kering?",
    backText: "Karena terjadi penumpukan zat bradikinin.",
    sortOrder: 2,
    savedDifficulty: "medium" as const,
    lastReviewedAt: "2026-06-06T12:05:00.000Z",
  },
];

describe("FlashCardViewer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  test("renders initial card with 1/N counter, Belum dijawab status badge, and flips between front and back", () => {
    render(
      <MemoryRouter>
        <FlashCardViewer cards={MOCK_CARDS} />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("1/2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Belum dijawab").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/neurotransmiter utama pada sistem saraf parasimpatis/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sebelumnya/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /lihat jawaban/i }));
    expect(screen.getByText(/asetilkolin \(ach\)/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /lihat pertanyaan/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /berikutnya/i }));
    expect(screen.getAllByText("2/2").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/mengapa acei sering menyebabkan efek samping batuk kering/i),
    ).toBeInTheDocument();
  });

  test("updates status badge to Benar or Salah, increments counters, and shows recapitulation at the end", () => {
    const handleRateCard = vi.fn();

    render(
      <MemoryRouter>
        <FlashCardViewer cards={MOCK_CARDS} onRateCard={handleRateCard} />
      </MemoryRouter>,
    );

    // Rate card 1 as Benar
    fireEvent.click(screen.getByRole("button", { name: /tandai benar/i }));

    expect(handleRateCard).toHaveBeenCalledWith(MOCK_CARDS[0], "correct");
    expect(screen.getAllByText("Benar").length).toBeGreaterThan(0);
    expect(screen.getByTestId("correct-count")).toHaveTextContent("1");

    // Auto-advance to card 2 after animation delay
    act(() => {
      vi.advanceTimersByTime(450);
    });

    expect(screen.getAllByText("2/2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Belum dijawab").length).toBeGreaterThan(0);

    // Navigate back to card 1 to verify its badge remains "Benar"
    fireEvent.click(screen.getByRole("button", { name: /sebelumnya/i }));
    expect(screen.getAllByText("1/2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Benar").length).toBeGreaterThan(0);

    // Move back to card 2 and rate it as Salah
    fireEvent.click(screen.getByRole("button", { name: /berikutnya/i }));
    fireEvent.click(screen.getByRole("button", { name: /tandai salah/i }));

    expect(handleRateCard).toHaveBeenCalledWith(MOCK_CARDS[1], "wrong");
    expect(screen.getAllByText("Salah").length).toBeGreaterThan(0);
    expect(screen.getByTestId("wrong-count")).toHaveTextContent("1");

    // Auto-advance after final card opens Recapitulation screen
    act(() => {
      vi.advanceTimersByTime(450);
    });

    expect(screen.getByText(/rekapitulasi hasil belajar/i)).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ulangi kartu salah/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ulangi semua kartu/i })).toBeInTheDocument();

    // Retry only wrong cards
    fireEvent.click(screen.getByRole("button", { name: /ulangi kartu salah/i }));
    expect(screen.getAllByText("1/1").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/mengapa acei sering menyebabkan efek samping batuk kering/i),
    ).toBeInTheDocument();
  });
});
