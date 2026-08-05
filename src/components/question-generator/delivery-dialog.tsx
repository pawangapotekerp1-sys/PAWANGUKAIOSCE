import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { QuestionTaxonomyBlock } from "../../lib/api/question-authoring-api";
import type { ScheduledOpsEventSummary } from "../../lib/api/scheduled-tryout-api";
import Button from "../ui/button";
import { getFocusableElements, trapFocus } from "../ui/dialog-utils";

type DeliveryDialogProps = {
  destinationType: "question_bank" | "scheduled_event";
  events: ScheduledOpsEventSummary[];
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (input: { blockId: string; topicId: string } | { eventId: string }) => void;
  open: boolean;
  taxonomy: QuestionTaxonomyBlock[];
};

function DeliveryDialog({
  destinationType,
  events,
  isSubmitting = false,
  onClose,
  onSubmit,
  open,
  taxonomy,
}: DeliveryDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstFieldRef = useRef<HTMLSelectElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [blockId, setBlockId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [eventId, setEventId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const topicOptions = useMemo(() => {
    const block = taxonomy.find((item) => item.id === blockId);
    return block?.topics ?? [];
  }, [blockId, taxonomy]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const preferredFocusTarget = firstFieldRef.current ?? closeButtonRef.current ?? getFocusableElements(dialogRef.current)[0];
    preferredFocusTarget?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (isSubmitting) {
          return;
        }

        event.preventDefault();
        onClose();
        return;
      }

      trapFocus(event, dialogRef.current);
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
  }, [isSubmitting, onClose, open]);

  if (!open) {
    return null;
  }

  function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    if (destinationType === "question_bank") {
      if (!blockId) {
        setErrorMessage("Pilih blok sebelum mengirim ke bank soal.");
        return;
      }

      if (!topicId) {
        setErrorMessage("Pilih materi sebelum mengirim ke bank soal.");
        return;
      }

      setErrorMessage(null);
      onSubmit({
        blockId,
        topicId,
      });
      return;
    }

    if (!eventId) {
      setErrorMessage("Pilih sesi sebelum mengirim soal.");
      return;
    }

    setErrorMessage(null);
    onSubmit({
      eventId,
    });
  }

  const title = destinationType === "question_bank"
    ? "Kirim ke bank soal"
    : "Kirim ke sesi";
  const description = destinationType === "question_bank"
    ? "Pilih blok dan materi tujuan sebelum mengirim soal."
    : "Pilih sesi tujuan sebelum mengirim soal.";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(15,46,47,0.48)] px-4 py-6">
      <div
        ref={dialogRef}
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-[34rem] rounded-[1.5rem] border border-[rgba(15,46,47,0.12)] bg-white px-4 py-4 shadow-[0_24px_60px_rgba(15,46,47,0.18)]"
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id={titleId} className="text-lg font-semibold text-[var(--color-outline)]">
              {title}
            </h3>
            <p id={descriptionId} className="mt-2 text-sm leading-6 text-[var(--color-ink-muted)]">
              {description}
            </p>
          </div>
          <Button
            ref={closeButtonRef}
            disabled={isSubmitting}
            onClick={onClose}
            size="sm"
            variant="outline"
          >
            Tutup
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          {destinationType === "question_bank" ? (
            <>
              <label className="grid gap-2 text-sm font-medium text-[var(--color-ink-muted)]">
                Blok
                <select
                  ref={firstFieldRef}
                  className="min-h-11 rounded-2xl border border-[rgba(15,46,47,0.15)] bg-white px-4 text-sm text-[var(--color-outline)] transition duration-200 ease-[var(--dashboard-ease)] focus-visible:border-[var(--color-focus-border)]"
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setBlockId(event.target.value);
                    setTopicId("");
                  }}
                  value={blockId}
                >
                  <option value="">Pilih blok</option>
                  {taxonomy.map((block) => (
                    <option key={block.id} value={block.id}>
                      {block.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-[var(--color-ink-muted)]">
                Materi
                <select
                  className="min-h-11 rounded-2xl border border-[rgba(15,46,47,0.15)] bg-white px-4 text-sm text-[var(--color-outline)] transition duration-200 ease-[var(--dashboard-ease)] focus-visible:border-[var(--color-focus-border)]"
                  disabled={isSubmitting}
                  onChange={(event) => setTopicId(event.target.value)}
                  value={topicId}
                >
                  <option value="">Pilih materi</option>
                  {topicOptions.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <label className="grid gap-2 text-sm font-medium text-[var(--color-ink-muted)]">
              Sesi tujuan
              <select
                ref={firstFieldRef}
                className="min-h-11 rounded-2xl border border-[rgba(15,46,47,0.15)] bg-white px-4 text-sm text-[var(--color-outline)] transition duration-200 ease-[var(--dashboard-ease)] focus-visible:border-[var(--color-focus-border)]"
                disabled={isSubmitting}
                onChange={(event) => setEventId(event.target.value)}
                value={eventId}
              >
                <option value="">Pilih sesi</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          {errorMessage ? (
            <div
              className="rounded-[1.2rem] border border-[rgba(180,84,61,0.18)] bg-[rgba(180,84,61,0.08)] px-4 py-3 text-sm text-[var(--color-outline)]"
              role="alert"
            >
              {errorMessage}
            </div>
          ) : null}

          <Button
            loading={isSubmitting}
            loadingLabel="Mengirim..."
            onClick={handleSubmit}
            size="sm"
            variant="primary"
          >
            {destinationType === "question_bank" ? "Kirim ke bank soal" : "Kirim ke sesi"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DeliveryDialog;
