import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, test } from "vitest";
import WelcomeTutorialPage from "./welcome-tutorial-page";

afterEach(() => {
  cleanup();
});

describe("WelcomeTutorialPage", () => {
  test("renders hero, roadmap, feature cards, FAQ, and CTA button with cursor-pointer", () => {
    const { container } = render(
      <MemoryRouter>
        <WelcomeTutorialPage />
      </MemoryRouter>
    );

    // Hero headline check
    expect(
      screen.getByText(/panduan lengkap menuju kelulusan ukai/i)
    ).toBeInTheDocument();

    // 4-Step Roadmap check
    expect(screen.getByText(/4-step learning roadmap/i)).toBeInTheDocument();
    expect(screen.getByText(/1\. uji kemampuan awal/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. bedah pembahasan/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. perdalam materi/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. evaluasi to akbar/i)).toBeInTheDocument();

    // Feature Exploration Hub check
    expect(screen.getByText(/eksplorasi fitur utama/i)).toBeInTheDocument();
    expect(screen.getAllByText(/simulasi try out/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/analitik & laporan performa/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/flash cards ai/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/area belajar & material drive/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/scheduled try out & leaderboard/i).length).toBeGreaterThan(0);

    // Dashboard CTA link check
    const dashboardCta = screen.getAllByRole("link", { name: /masuk ke dashboard/i });
    expect(dashboardCta.length).toBeGreaterThan(0);
    expect(dashboardCta[0]).toHaveAttribute("href", "/app");

    // Cursor-pointer check on buttons and links
    const interactiveButtons = container.querySelectorAll("button, a");
    expect(interactiveButtons.length).toBeGreaterThan(0);
    interactiveButtons.forEach((btn) => {
      expect(btn.className).toContain("cursor-pointer");
    });
  });

  test("faq accordion toggles open and closed on click", () => {
    render(
      <MemoryRouter>
        <WelcomeTutorialPage />
      </MemoryRouter>
    );

    // Item 0 is initially open
    expect(screen.getByText(/simulasi try out rutin dapat diakses kapan saja/i)).toBeInTheDocument();

    const faqQuestion = screen.getByText(/apa bedanya simulasi try out rutin dan scheduled try out/i);
    const trigger = faqQuestion.closest("button");
    expect(trigger).not.toBeNull();

    // Click trigger to close item 0
    if (trigger) {
      fireEvent.click(trigger);
      expect(screen.queryByText(/simulasi try out rutin dapat diakses kapan saja/i)).not.toBeInTheDocument();
    }
  });
});
