import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import DeliveryDialog from "./delivery-dialog";

afterEach(() => {
  cleanup();
});

describe("DeliveryDialog", () => {
  test("renders as a modal dialog with an accessible name and description", () => {
    render(
      <DeliveryDialog
        destinationType="question_bank"
        events={[]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        open
        taxonomy={[
          {
            id: "block-1",
            name: "Clinical Science",
            slug: "clinical-science",
            topics: [{ id: "topic-1", name: "Kardiologi", slug: "kardiologi" }],
          },
        ]}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: /kirim ke bank soal/i });
    expect(dialog).toHaveTextContent(/pilih blok dan materi tujuan sebelum mengirim soal/i);
  });

  test("requires blok and materi before allowing bank soal delivery", () => {
    const onSubmit = vi.fn();

    render(
      <DeliveryDialog
        destinationType="question_bank"
        events={[]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        open
        taxonomy={[
          {
            id: "block-1",
            name: "Clinical Science",
            slug: "clinical-science",
            topics: [{ id: "topic-1", name: "Kardiologi", slug: "kardiologi" }],
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /kirim ke bank soal/i }));

    expect(screen.getByText(/pilih blok sebelum mengirim ke bank soal/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/blok/i), {
      target: { value: "block-1" },
    });
    fireEvent.change(screen.getByLabelText(/materi/i), {
      target: { value: "topic-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /kirim ke bank soal/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      blockId: "block-1",
      topicId: "topic-1",
    });
  });

  test("requires sesi selection before allowing scheduled-event delivery", () => {
    const onSubmit = vi.fn();

    render(
      <DeliveryDialog
        destinationType="scheduled_event"
        events={[
          {
            id: "event-1",
            title: "TO Klinik Juni",
            status: "draft",
            statusLabel: "Draft",
            editorialStatus: "draft",
            accessStartAt: "2026-06-05T01:00:00.000Z",
            accessEndAt: "2026-06-05T03:00:00.000Z",
            currentCycle: 1,
            questionCount: 10,
            questionCountLabel: "10 soal",
            durationMinutes: 90,
            durationLabel: "90 menit",
            windowLabel: "05 Jun 08:00 - 05 Jun 10:00 WIB",
            description: "Event uji klinik.",
          },
        ]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        open
        taxonomy={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /kirim ke sesi/i }));

    expect(screen.getByText(/pilih sesi sebelum mengirim soal/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/sesi tujuan/i), {
      target: { value: "event-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /kirim ke sesi/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      eventId: "event-1",
    });
  });

  test("disables controls while a delivery request is being submitted", () => {
    render(
      <DeliveryDialog
        destinationType="question_bank"
        events={[]}
        isSubmitting
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        open
        taxonomy={[
          {
            id: "block-1",
            name: "Clinical Science",
            slug: "clinical-science",
            topics: [{ id: "topic-1", name: "Kardiologi", slug: "kardiologi" }],
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: /mengirim/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /tutup/i })).toBeDisabled();
    expect(screen.getByLabelText(/blok/i)).toBeDisabled();
    expect(screen.getByLabelText(/materi/i)).toBeDisabled();
  });

  test("uses outline and primary button hierarchy", () => {
    render(
      <DeliveryDialog
        destinationType="question_bank"
        events={[]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        open
        taxonomy={[
          {
            id: "block-1",
            name: "Clinical Science",
            slug: "clinical-science",
            topics: [{ id: "topic-1", name: "Kardiologi", slug: "kardiologi" }],
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: /tutup/i })).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("button", { name: /kirim ke bank soal/i })).toHaveAttribute("data-variant", "primary");
  });

  test("closes on escape and restores focus to the trigger when it is safe", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Buka distribusi
          </button>
          <DeliveryDialog
            destinationType="question_bank"
            events={[]}
            onClose={() => setOpen(false)}
            onSubmit={vi.fn()}
            open={open}
            taxonomy={[
              {
                id: "block-1",
                name: "Clinical Science",
                slug: "clinical-science",
                topics: [{ id: "topic-1", name: "Kardiologi", slug: "kardiologi" }],
              },
            ]}
          />
        </>
      );
    }

    render(<Harness />);

    const trigger = screen.getByRole("button", { name: /buka distribusi/i });
    trigger.focus();
    fireEvent.click(trigger);

    const blockSelect = await screen.findByLabelText(/blok/i);
    await waitFor(() => {
      expect(blockSelect).toHaveFocus();
    });

    fireEvent.keyDown(document, {
      key: "Escape",
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  test("keeps the dialog open while submitting even when escape is pressed", async () => {
    const onClose = vi.fn();

    render(
      <DeliveryDialog
        destinationType="question_bank"
        events={[]}
        isSubmitting
        onClose={onClose}
        onSubmit={vi.fn()}
        open
        taxonomy={[
          {
            id: "block-1",
            name: "Clinical Science",
            slug: "clinical-science",
            topics: [{ id: "topic-1", name: "Kardiologi", slug: "kardiologi" }],
          },
        ]}
      />,
    );

    fireEvent.keyDown(document, {
      key: "Escape",
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: /kirim ke bank soal/i })).toBeInTheDocument();
  });
});
