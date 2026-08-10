import { useEffect, useState } from "react";
import Button from "../ui/button";

type FlashCardReviewEditorProps = {
  detail: {
    material: {
      id: string;
      title: string;
      academicGroupLabel: string;
      status: string;
      statusLabel: string;
      globalSummary: string | null;
      processingError: string | null;
    };
    subtopics: Array<{
      id: string;
      title: string;
      summary: string;
      sortOrder: number;
      cards: Array<{
        id: string;
        frontText: string;
        backText: string;
        sortOrder: number;
      }>;
    }>;
  };
  isPublishing?: boolean;
  isSaving?: boolean;
  isRetrying?: boolean;
  onPublish: () => Promise<void> | void;
  onRetryProcessing?: () => Promise<void> | void;
  onSave: (input: {
    title: string;
    globalSummary: string;
    subtopics: Array<{
      title: string;
      summary: string;
      cards: Array<{
        frontText: string;
        backText: string;
      }>;
    }>;
  }) => Promise<void> | void;
};

type EditableCard = {
  id: string;
  frontText: string;
  backText: string;
};

type EditableSubtopic = {
  id: string;
  title: string;
  summary: string;
  cards: EditableCard[];
};

function buildEditableSubtopics(detail: FlashCardReviewEditorProps["detail"]) {
  return detail.subtopics.map((subtopic) => ({
    id: subtopic.id,
    title: subtopic.title,
    summary: subtopic.summary,
    cards: subtopic.cards.map((card) => ({
      id: card.id,
      frontText: card.frontText,
      backText: card.backText,
    })),
  }));
}

function FlashCardReviewEditor({
  detail,
  isPublishing = false,
  isSaving = false,
  isRetrying = false,
  onPublish,
  onRetryProcessing,
  onSave,
}: FlashCardReviewEditorProps) {
  const isPublished = detail.material.status === "published";
  const [title, setTitle] = useState(detail.material.title);
  const [globalSummary, setGlobalSummary] = useState(detail.material.globalSummary ?? "");
  const [subtopics, setSubtopics] = useState<EditableSubtopic[]>(buildEditableSubtopics(detail));

  useEffect(() => {
    setTitle(detail.material.title);
    setGlobalSummary(detail.material.globalSummary ?? "");
    setSubtopics(buildEditableSubtopics(detail));
  }, [detail]);

  function updateSubtopic(
    subtopicId: string,
    updater: (subtopic: EditableSubtopic) => EditableSubtopic,
  ) {
    setSubtopics((current) =>
      current.map((subtopic) => (subtopic.id === subtopicId ? updater(subtopic) : subtopic)));
  }

  async function handleSave() {
    await onSave({
      title,
      globalSummary,
      subtopics: subtopics.map((subtopic) => ({
        title: subtopic.title,
        summary: subtopic.summary,
        cards: subtopic.cards.map((card) => ({
          frontText: card.frontText,
          backText: card.backText,
        })),
      })),
    });
  }

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-teal-soft)]">
          {detail.material.academicGroupLabel}
        </p>
        <h1 className="text-3xl font-semibold leading-tight text-[var(--color-outline)]">Tinjau materi flash card</h1>
        <p className="text-sm font-medium text-[var(--color-outline)]">{detail.material.statusLabel}</p>
        {detail.material.processingError ? (
          <p className="text-sm leading-7 text-rose-700">{detail.material.processingError}</p>
        ) : null}
        {isPublished ? (
          <p className="text-sm leading-7 text-[var(--color-ink-muted)]">
            Materi yang sudah diterbitkan tidak bisa diubah agar kartu yang dipakai siswa tetap konsisten.
          </p>
        ) : null}
      </header>

      <div className="grid gap-5">
        <label className="grid gap-2 text-sm font-medium text-[var(--color-outline)]">
          Judul materi
          <input
            aria-label="Judul materi"
            className="min-h-11 rounded-2xl border border-[var(--color-outline-soft)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
            value={title}
            disabled={isPublished}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-[var(--color-outline)]">
          Ringkasan materi
          <textarea
            aria-label="Ringkasan materi"
            className="min-h-32 rounded-3xl border border-[var(--color-outline-soft)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
            value={globalSummary}
            disabled={isPublished}
            onChange={(event) => setGlobalSummary(event.target.value)}
          />
        </label>

        {subtopics.map((subtopic, subtopicIndex) => (
          <article
            key={subtopic.id}
            className="space-y-4 rounded-3xl border border-[var(--color-outline-soft)] bg-white px-4 py-4"
          >
            <label className="grid gap-2 text-sm font-medium text-[var(--color-outline)]">
              Judul submateri {subtopicIndex + 1}
              <input
                aria-label={`Judul submateri ${subtopicIndex + 1}`}
                className="min-h-11 rounded-2xl border border-[var(--color-outline-soft)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
                value={subtopic.title}
                disabled={isPublished}
                onChange={(event) =>
                  updateSubtopic(subtopic.id, (current) => ({
                    ...current,
                    title: event.target.value,
                  }))}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[var(--color-outline)]">
              Ringkasan submateri {subtopicIndex + 1}
              <textarea
                aria-label={`Ringkasan submateri ${subtopicIndex + 1}`}
                className="min-h-28 rounded-3xl border border-[var(--color-outline-soft)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
                value={subtopic.summary}
                disabled={isPublished}
                onChange={(event) =>
                  updateSubtopic(subtopic.id, (current) => ({
                    ...current,
                    summary: event.target.value,
                  }))}
              />
            </label>

            <div className="grid gap-4">
              {subtopic.cards.map((card, cardIndex) => (
                <div
                  key={card.id}
                  className="grid gap-3 rounded-3xl border border-[rgba(31,111,115,0.12)] bg-[rgba(31,111,115,0.04)] px-4 py-4"
                >
                  <label className="grid gap-2 text-sm font-medium text-[var(--color-outline)]">
                    Kartu {cardIndex + 1} depan
                    <input
                      aria-label={`Kartu ${cardIndex + 1} depan`}
                      className="min-h-11 rounded-2xl border border-[var(--color-outline-soft)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
                      value={card.frontText}
                      disabled={isPublished}
                      onChange={(event) =>
                        updateSubtopic(subtopic.id, (current) => ({
                          ...current,
                          cards: current.cards.map((currentCard) =>
                            currentCard.id === card.id
                              ? {
                                ...currentCard,
                                frontText: event.target.value,
                              }
                              : currentCard),
                        }))}
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-[var(--color-outline)]">
                    Kartu {cardIndex + 1} belakang
                    <textarea
                      aria-label={`Kartu ${cardIndex + 1} belakang`}
                      className="min-h-24 rounded-3xl border border-[var(--color-outline-soft)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
                      value={card.backText}
                      disabled={isPublished}
                      onChange={(event) =>
                        updateSubtopic(subtopic.id, (current) => ({
                          ...current,
                          cards: current.cards.map((currentCard) =>
                            currentCard.id === card.id
                              ? {
                                ...currentCard,
                                backText: event.target.value,
                              }
                              : currentCard),
                        }))}
                    />
                  </label>

                  <Button
                    disabled={isPublished}
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() =>
                      updateSubtopic(subtopic.id, (current) => ({
                        ...current,
                        cards: current.cards.filter((currentCard) => currentCard.id !== card.id),
                        }))} 
                  >
                    Hapus kartu {cardIndex + 1}
                  </Button>
                </div>
              ))}
            </div>

            <Button
              disabled={isPublished}
              size="sm"
              type="button"
              variant="outline"
              onClick={() =>
                updateSubtopic(subtopic.id, (current) => ({
                  ...current,
                  cards: [
                    ...current.cards,
                    {
                      id: crypto.randomUUID(),
                      frontText: "",
                      backText: "",
                    },
                  ],
                }))}
            >
              Tambah kartu
            </Button>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {!isPublished ? (
          <Button
            loading={isSaving}
            loadingLabel="Menyimpan..."
            type="button"
            variant="primary"
            onClick={() => {
              void handleSave();
            }}
          >
            Simpan perubahan
          </Button>
        ) : null}

        {detail.material.status === "failed" && onRetryProcessing ? (
          <Button
            loading={isRetrying}
            loadingLabel="Memproses..."
            type="button"
            variant="outline"
            onClick={() => {
              void onRetryProcessing();
            }}
          >
            Coba Proses Ulang
          </Button>
        ) : null}

        {detail.material.status === "ready_for_review" ? (
          <Button
            loading={isPublishing || isSaving}
            loadingLabel="Menerbitkan..."
            type="button"
            variant="outline"
            onClick={async () => {
              await handleSave();
              await onPublish();
            }}
          >
            Terbitkan untuk siswa
          </Button>
        ) : null}
      </div>
    </section>
  );
}

export default FlashCardReviewEditor;
