import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StudentLiveClassView } from "./student-live-class-view";
import type { LiveClass } from "../../lib/api/live-class-api";

describe("StudentLiveClassView", () => {
  const mockClasses: LiveClass[] = [
    {
      id: "class-ongoing",
      title: "Sesi Diskusi Farmakologi",
      startTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30m ago
      endTime: new Date(Date.now() + 1000 * 60 * 30).toISOString(), // 30m from now
      zoomLink: "https://zoom.us/j/ongoing123",
      targetRoles: ["pro", "osce_pro"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "class-upcoming",
      title: "Sesi Persiapan OSCE",
      startTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // tomorrow
      endTime: new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString(),
      zoomLink: "https://zoom.us/j/upcoming123",
      targetRoles: ["osce_pro"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "class-ended",
      title: "Review Try Out Blok 1",
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // yesterday
      endTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      zoomLink: "https://zoom.us/j/ended123",
      targetRoles: ["pro"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  it("renders table with class list and correct action states", () => {
    render(<StudentLiveClassView classes={mockClasses} isLoading={false} />);

    expect(screen.getByText("Sesi Diskusi Farmakologi")).toBeInTheDocument();
    expect(screen.getByText("Sesi Persiapan OSCE")).toBeInTheDocument();
    expect(screen.getByText("Review Try Out Blok 1")).toBeInTheDocument();

    // Ongoing class has active button with link
    const zoomLink = screen.getByRole("link", { name: /Masuk Zoom/i });
    expect(zoomLink).toHaveAttribute("href", "https://zoom.us/j/ongoing123");
    expect(zoomLink).toHaveAttribute("target", "_blank");

    // Upcoming and Ended classes have disabled buttons
    const upcomingBtn = screen.getByRole("button", { name: /Belum Dimulai/i });
    expect(upcomingBtn).toBeDisabled();

    const endedBtn = screen.getByRole("button", { name: /Selesai/i });
    expect(endedBtn).toBeDisabled();
  });

  it("renders empty state when no classes available", () => {
    render(<StudentLiveClassView classes={[]} isLoading={false} />);
    expect(screen.getByText(/Belum ada jadwal live class/i)).toBeInTheDocument();
  });

  it("renders loading spinner when isLoading is true", () => {
    const { container } = render(<StudentLiveClassView classes={[]} isLoading={true} />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
