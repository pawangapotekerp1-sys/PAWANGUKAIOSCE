import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MentorLiveClassView } from "./mentor-live-class-view";
import { LiveClassFormModal } from "./live-class-form-modal";
import type { LiveClass, LiveClassPayload } from "../../lib/api/live-class-api";

describe("MentorLiveClassView", () => {
  const mockClasses: LiveClass[] = [
    {
      id: "class-1",
      title: "Bimbingan OSCE Praktik",
      startTime: "2026-11-01T10:00:00Z",
      endTime: "2026-11-01T12:00:00Z",
      zoomLink: "https://zoom.us/j/999888",
      targetRoles: ["osce_pro"],
      createdAt: "2026-10-30T10:00:00Z",
      updatedAt: "2026-10-30T10:00:00Z",
    },
    {
      id: "class-2",
      title: "Kuliah Umum Farmasi",
      startTime: "2026-11-02T13:00:00Z",
      endTime: "2026-11-02T15:00:00Z",
      zoomLink: "https://zoom.us/j/777666",
      targetRoles: ["pro", "osce_pro"],
      createdAt: "2026-10-30T10:00:00Z",
      updatedAt: "2026-10-30T10:00:00Z",
    },
  ];

  it("renders mentor table with manage controls and add button", () => {
    const onAdd = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <MentorLiveClassView
        classes={mockClasses}
        isLoading={false}
        onAdd={onAdd}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText("Bimbingan OSCE Praktik")).toBeInTheDocument();
    expect(screen.getByText("OSCE")).toBeInTheDocument();
    expect(screen.getByText("Kuliah Umum Farmasi")).toBeInTheDocument();
    expect(screen.getByText("Semua Siswa")).toBeInTheDocument();

    const addBtn = screen.getByRole("button", { name: /Tambah Jadwal/i });
    fireEvent.click(addBtn);
    expect(onAdd).toHaveBeenCalled();

    const editBtns = screen.getAllByRole("button", { name: /Edit/i });
    fireEvent.click(editBtns[0]);
    expect(onEdit).toHaveBeenCalledWith(mockClasses[0]);

    const deleteBtns = screen.getAllByRole("button", { name: /Hapus/i });
    fireEvent.click(deleteBtns[0]);
    expect(onDelete).toHaveBeenCalledWith(mockClasses[0]);
  });

  it("renders empty state when no classes are present", () => {
    const onAdd = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <MentorLiveClassView
        classes={[]}
        isLoading={false}
        onAdd={onAdd}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText("Belum ada kelas yang dibuat")).toBeInTheDocument();
  });
});

describe("LiveClassFormModal", () => {
  it("renders modal form and allows creating a new class", async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <LiveClassFormModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
      />
    );

    expect(screen.getByText("Tambah Jadwal Live Class")).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByLabelText(/Judul Sesi/i), {
      target: { value: "Review Farmakoterapi" },
    });
    fireEvent.change(screen.getByLabelText(/Waktu Mulai/i), {
      target: { value: "2026-11-05T09:00" },
    });
    fireEvent.change(screen.getByLabelText(/Waktu Selesai/i), {
      target: { value: "2026-11-05T11:00" },
    });
    fireEvent.change(screen.getByLabelText(/Link Zoom/i), {
      target: { value: "https://zoom.us/j/12345678" },
    });

    const submitBtn = screen.getByRole("button", { name: /Simpan Jadwal/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        title: "Review Farmakoterapi",
        startTime: expect.any(String),
        endTime: expect.any(String),
        zoomLink: "https://zoom.us/j/12345678",
        targetRoles: ["pro", "osce_pro"],
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("populates initial data when editing", () => {
    const initialData: LiveClass = {
      id: "class-edit",
      title: "Konseling Pasien OSCE",
      startTime: "2026-11-10T14:00:00.000Z",
      endTime: "2026-11-10T16:00:00.000Z",
      zoomLink: "https://zoom.us/j/888999",
      targetRoles: ["osce_pro"],
      createdAt: "2026-10-30T10:00:00Z",
      updatedAt: "2026-10-30T10:00:00Z",
    };

    render(
      <LiveClassFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialData={initialData}
      />
    );

    expect(screen.getByText("Edit Jadwal Live Class")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Konseling Pasien OSCE")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://zoom.us/j/888999")).toBeInTheDocument();
  });
});
