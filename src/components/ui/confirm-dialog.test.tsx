import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import ConfirmDialog from "./confirm-dialog";

afterEach(() => {
  cleanup();
});

function ConfirmDialogHarness() {
  const [open, setOpen] = useState(false);
  const onConfirm = vi.fn(() => {
    setOpen(false);
  });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Buka dialog
      </button>
      <ConfirmDialog
        cancelLabel="Batal"
        confirmLabel="Hapus soal"
        description="Soal akan dihapus permanen dari bank soal."
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        open={open}
        title="Hapus soal ini?"
      />
    </>
  );
}

describe("ConfirmDialog", () => {
  test("renders an alert dialog, traps focus, and restores focus after escape", async () => {
    render(<ConfirmDialogHarness />);

    const trigger = screen.getByRole("button", { name: /buka dialog/i });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("alertdialog", { name: /hapus soal ini/i });
    const cancelButton = within(dialog).getByRole("button", { name: /batal/i });
    const confirmButton = within(dialog).getByRole("button", { name: /hapus soal/i });

    await waitFor(() => {
      expect(cancelButton).toHaveFocus();
    });

    fireEvent.keyDown(document, {
      key: "Escape",
    });

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  test("uses outline and destructive button hierarchy with pending feedback", async () => {
    function PendingHarness() {
      const [open, setOpen] = useState(true);

      return (
        <ConfirmDialog
          cancelLabel="Batal"
          confirmLabel="Hapus soal"
          description="Soal akan dihapus permanen dari bank soal."
          isPending
          onClose={() => setOpen(false)}
          onConfirm={vi.fn()}
          open={open}
          pendingLabel="Menghapus..."
          title="Hapus soal ini?"
        />
      );
    }

    render(<PendingHarness />);

    const dialog = await screen.findByRole("alertdialog", { name: /hapus soal ini/i });
    const cancelButton = within(dialog).getByRole("button", { name: /batal/i });
    const confirmButton = within(dialog).getByRole("button", { name: /menghapus/i });

    expect(cancelButton).toHaveAttribute("data-variant", "outline");
    expect(confirmButton).toHaveAttribute("data-variant", "destructive");
    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
  });
});
