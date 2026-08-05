import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { PersistedDiagnosisSubtopicRanking } from "../../lib/mappers/analytics-mappers";
import SubtopicRankingList from "./subtopic-ranking-list";

function createRankings(): PersistedDiagnosisSubtopicRanking[] {
  return [
    {
      topicId: "topic-1",
      topicName: "Kardiologi",
      blockId: "block-1",
      blockName: "Clinical Science",
      rank: 1,
      weaknessScore: 90,
      confidence: "high",
      questionCount: 18,
      attemptCoverageCount: 3,
      accuracy: 42,
      averageTimePerQuestion: 92,
      behaviorFlags: ["frequent_ragu", "slow_pacing"],
      summary: "Akurasi paling rendah dan sering disertai pola terlalu lama.",
    },
    {
      topicId: "topic-2",
      topicName: "Pernafasan dan Pencernaan",
      blockId: "block-1",
      blockName: "Clinical Science",
      rank: 2,
      weaknessScore: 82,
      confidence: "medium",
      questionCount: 14,
      attemptCoverageCount: 3,
      accuracy: 48,
      averageTimePerQuestion: 88,
      behaviorFlags: ["slow_pacing"],
      summary: "Ketahanan waktu masih tertahan pada soal respirasi.",
    },
    {
      topicId: "topic-3",
      topicName: "Endokrin dan Tiroid",
      blockId: "block-1",
      blockName: "Clinical Science",
      rank: 3,
      weaknessScore: 74,
      confidence: "medium",
      questionCount: 12,
      attemptCoverageCount: 3,
      accuracy: 51,
      averageTimePerQuestion: 84,
      behaviorFlags: ["frequent_answer_changes"],
      summary: "Perubahan jawaban masih sering terjadi.",
    },
    {
      topicId: "topic-4",
      topicName: "Farmakoekonomi",
      blockId: "block-3",
      blockName: "Social, Behavioral & Administrative",
      rank: 4,
      weaknessScore: 69,
      confidence: "low",
      questionCount: 8,
      attemptCoverageCount: 2,
      accuracy: 55,
      averageTimePerQuestion: 77,
      behaviorFlags: ["correct_to_wrong_switches"],
      summary: "Masih ada perubahan jawaban dari benar menjadi salah.",
    },
    {
      topicId: "topic-5",
      topicName: "Standar Pelayanan Kefarmasian",
      blockId: "block-3",
      blockName: "Social, Behavioral & Administrative",
      rank: 5,
      weaknessScore: 66,
      confidence: "medium",
      questionCount: 10,
      attemptCoverageCount: 3,
      accuracy: 57,
      averageTimePerQuestion: 73,
      behaviorFlags: ["frequent_ragu"],
      summary: "Masih sering ragu pada konsep pelayanan.",
    },
    {
      topicId: "topic-6",
      topicName: "Farmakoterapi Geriatri",
      blockId: "block-1",
      blockName: "Clinical Science",
      rank: 6,
      weaknessScore: 58,
      confidence: "low",
      questionCount: 6,
      attemptCoverageCount: 2,
      accuracy: 60,
      averageTimePerQuestion: 70,
      behaviorFlags: ["slow_pacing"],
      summary: "Data masih tipis, tetapi pacing masih lambat.",
    },
  ];
}

describe("Subtopic ranking list", () => {
  test("shows only the first five items until the user expands the list", () => {
    render(<SubtopicRankingList rankings={createRankings()} />);

    expect(screen.getByText(/pernafasan dan pencernaan/i, { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByText(/farmakoterapi geriatri/i, { selector: "p" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /lihat semua topik/i })).toHaveAttribute("data-variant", "outline");

    fireEvent.click(screen.getByRole("button", { name: /lihat semua topik/i }));

    expect(screen.getByText(/farmakoterapi geriatri/i, { selector: "p" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /lihat lebih sedikit/i }),
    ).toBeInTheDocument();
  });

  test("shows the inline detail summary when a subtopic card is expanded", () => {
    render(<SubtopicRankingList rankings={createRankings()} />);

    const detailButton = screen.getAllByRole("button", { name: /lihat ringkasan kardiologi/i })[0];
    expect(detailButton).toHaveAttribute("data-variant", "outline");

    fireEvent.click(detailButton);

    expect(
      screen.getByText(/akurasi paling rendah dan sering disertai pola terlalu lama/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/rata-rata waktu 92 detik\/soal/i)).toBeInTheDocument();
    expect(screen.getByText(/dibahas di 3 sesi, total 18 soal/i)).toBeInTheDocument();
    expect(screen.getAllByText(/keyakinan tinggi/i).length).toBeGreaterThan(0);
  });
});
