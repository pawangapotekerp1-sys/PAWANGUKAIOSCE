import { useEffect, useState } from "react";
import Button from "../ui/button";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertCircle } from "lucide-react";
import type {
  CardMetadata,
  CardSourceReference,
  MaterialMetadata,
} from "../../lib/mappers/flash-card-mappers";

export type FlashCardReviewEditorProps = {
  detail: {
    material: {
      id: string;
      title: string;
      academicGroupLabel: string;
      status: string;
      statusLabel: string;
      globalSummary: string | null;
      processingError: string | null;
      metadata?: MaterialMetadata | null;
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
        sources?: CardSourceReference[];
        metadata?: CardMetadata | null;
      }>;
    }>;
  };
  isPublishing?: boolean;
  isSaving?: boolean;
  isRetrying?: boolean;
  isAuditing?: boolean;
  onPublish: () => Promise<void> | void;
  onRetryProcessing?: () => Promise<void> | void;
  onAuditRepair?: () => Promise<void> | void;
  onResolveConflict?: (input: {
    conflictId: string;
    resolutionStatus: "mentor_clarified" | "externally_verified";
    clinicalClarificationNotes: string;
  }) => Promise<void> | void;
  onSave: (input: {
    title: string;
    globalSummary: string;
    subtopics: Array<{
      title: string;
      summary: string;
      cards: Array<{
        frontText: string;
        backText: string;
        metadata?: CardMetadata | null;
      }>;
    }>;
  }) => Promise<void> | void;
};

type EditableCard = {
  id: string;
  frontText: string;
  backText: string;
  sortOrder: number;
  sources?: CardSourceReference[];
  metadata?: CardMetadata | null;
};

type EditableSubtopic = {
  id: string;
  title: string;
  summary: string;
  sortOrder: number;
  cards: EditableCard[];
};

function buildEditableSubtopics(detail: FlashCardReviewEditorProps["detail"]): EditableSubtopic[] {
  return detail.subtopics.map((subtopic) => ({
    id: subtopic.id,
    title: subtopic.title,
    summary: subtopic.summary,
    sortOrder: subtopic.sortOrder,
    cards: subtopic.cards.map((card) => ({
      id: card.id,
      frontText: card.frontText,
      backText: card.backText,
      sortOrder: card.sortOrder,
      sources: card.sources ?? card.metadata?.sources ?? [],
      metadata: card.metadata !== undefined ? card.metadata : undefined,
    })),
  }));
}

function FlashCardReviewEditor({
  detail,
  isPublishing = false,
  isSaving = false,
  isRetrying = false,
  isAuditing = false,
  onPublish,
  onRetryProcessing,
  onAuditRepair,
  onResolveConflict,
  onSave,
}: FlashCardReviewEditorProps) {
  const isPublished = detail.material.status === "published";
  const [title, setTitle] = useState(detail.material.title);
  const [globalSummary, setGlobalSummary] = useState(detail.material.globalSummary ?? "");
  const [subtopics, setSubtopics] = useState<EditableSubtopic[]>(buildEditableSubtopics(detail));
  const [conflictNotes, setConflictNotes] = useState<Record<string, string>>({});
  const [resolvingConflictId, setResolvingConflictId] = useState<string | null>(null);

  const sourceConflicts = detail.material.metadata?.sourceConflicts ?? [];
  const unresolvedConflicts = sourceConflicts.filter((c) => c.resolutionStatus === "unresolved");
  const hasUnresolvedCriticalOrHigh = unresolvedConflicts.some(
    (c) => c.severity === "critical" || c.severity === "high",
  );

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
        cards: subtopic.cards.map((card) => {
          const cardPayload: {
            frontText: string;
            backText: string;
            metadata?: CardMetadata | null;
          } = {
            frontText: card.frontText,
            backText: card.backText,
          };
          if (card.metadata !== undefined) {
            cardPayload.metadata = card.metadata;
          }
          return cardPayload;
        }),
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

      {hasUnresolvedCriticalOrHigh ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Publikasi diblokir</AlertTitle>
          <AlertDescription>
            Publikasi diblokir: Ada konflik sumber klinis berderajat critical/high yang belum diselesaikan.
          </AlertDescription>
        </Alert>
      ) : null}

      {sourceConflicts.length > 0 ? (
        <section className="space-y-4 rounded-3xl border border-border/80 bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Resolusi Konflik Sumber ({sourceConflicts.length})
            </h2>
            {hasUnresolvedCriticalOrHigh ? (
              <Badge variant="destructive" className="font-semibold text-xs">
                Perlu Klarifikasi
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs font-semibold">
                Semua Konflik Selesai
              </Badge>
            )}
          </div>

          <div className="grid gap-4">
            {sourceConflicts.map((conflict) => {
              const isResolved = conflict.resolutionStatus !== "unresolved";
              const severityVariant =
                conflict.severity === "critical"
                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                  : conflict.severity === "high"
                    ? "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30"
                    : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";

              return (
                <div
                  key={conflict.conflictId}
                  className="rounded-2xl border border-border/80 bg-background/60 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`font-mono text-xs uppercase font-bold ${severityVariant}`}
                      >
                        {conflict.severity}
                      </Badge>
                      <span className="text-xs font-semibold text-foreground">
                        {conflict.category}
                      </span>
                    </div>
                    {isResolved ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs font-bold"
                      >
                        Terklarifikasi
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Belum Diselesaikan
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-2 text-xs">
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
                      <span className="font-semibold text-foreground">Bukti Slide:</span>
                      <p className="mt-1 italic text-muted-foreground">
                        "{conflict.slideEvidence?.exactQuote ?? ""}"
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
                      <span className="font-semibold text-foreground">Bukti Transkrip:</span>
                      <p className="mt-1 italic text-muted-foreground">
                        "{conflict.transcriptEvidence?.exactQuote ?? ""}"
                      </p>
                    </div>
                  </div>

                  {isResolved ? (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                        Catatan Klarifikasi Mentor:
                      </p>
                      <p className="mt-1 text-foreground/90">
                        {conflict.clinicalClarificationNotes || "Tidak ada catatan."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <label className="grid gap-1.5 text-xs font-semibold text-foreground">
                        Catatan Klarifikasi Mentor
                        <textarea
                          aria-label={`Catatan Klarifikasi ${conflict.conflictId}`}
                          placeholder="Tuliskan justifikasi klinis atau arahan rekonsiliasi..."
                          className="min-h-16 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                          value={conflictNotes[conflict.conflictId] ?? ""}
                          onChange={(e) =>
                            setConflictNotes((prev) => ({
                              ...prev,
                              [conflict.conflictId]: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <Button
                        size="sm"
                        type="button"
                        variant="primary"
                        disabled={isPublished}
                        loading={resolvingConflictId === conflict.conflictId}
                        loadingLabel="Mengklarifikasi..."
                        onClick={async () => {
                          if (!onResolveConflict) return;
                          setResolvingConflictId(conflict.conflictId);
                          try {
                            await onResolveConflict({
                              conflictId: conflict.conflictId,
                              resolutionStatus: "mentor_clarified",
                              clinicalClarificationNotes: conflictNotes[conflict.conflictId] ?? "",
                            });
                          } finally {
                            setResolvingConflictId(null);
                          }
                        }}
                      >
                        Klarifikasi Mentor
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {detail.material.metadata?.qualityReport || detail.material.metadata?.tokenUsage ? (
        <details className="rounded-3xl border border-border/80 bg-card p-5 group shadow-xs" open>
          <summary className="cursor-pointer font-bold text-foreground flex items-center justify-between text-sm select-none">
            <span>Metrik Token & Laporan Kualitas Pipeline</span>
            <span className="text-xs text-muted-foreground font-normal">Lipat / Buka</span>
          </summary>
          <div className="mt-4 space-y-5 pt-3 border-t border-border/60">
            {detail.material.metadata?.qualityReport ? (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Laporan Kualitas Kartu</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="rounded-xl border border-border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Kartu</p>
                    <p className="text-lg font-bold text-foreground">
                      {detail.material.metadata.qualityReport.totalCardsGenerated ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Diterima (Accepted)</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {detail.material.metadata.qualityReport.acceptedCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
                    <p className="text-xs text-amber-600 dark:text-amber-400">Diperbaiki (Repaired)</p>
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {detail.material.metadata.qualityReport.repairedCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-center">
                    <p className="text-xs text-rose-600 dark:text-rose-400">Ditolak (Dropped)</p>
                    <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                      {detail.material.metadata.qualityReport.droppedCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 text-center">
                    <p className="text-xs text-purple-600 dark:text-purple-400">Konflik Sumber</p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {detail.material.metadata.qualityReport.conflictsCount ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {detail.material.metadata?.tokenUsage && Object.keys(detail.material.metadata.tokenUsage).length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Penggunaan Token per Tahapan</h3>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/50 font-semibold text-muted-foreground">
                      <tr>
                        <th className="px-3.5 py-2">Tahapan</th>
                        <th className="px-3.5 py-2">Prompt Tokens</th>
                        <th className="px-3.5 py-2">Candidates Tokens</th>
                        <th className="px-3.5 py-2">Thoughts Tokens</th>
                        <th className="px-3.5 py-2">Total Tokens</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {Object.entries(detail.material.metadata.tokenUsage).map(([stage, metrics]) => (
                        <tr key={stage} className="hover:bg-muted/20">
                          <td className="px-3.5 py-2 font-medium capitalize text-foreground">{stage}</td>
                          <td className="px-3.5 py-2 font-mono text-muted-foreground">{metrics.promptTokenCount ?? 0}</td>
                          <td className="px-3.5 py-2 font-mono text-muted-foreground">{metrics.candidatesTokenCount ?? 0}</td>
                          <td className="px-3.5 py-2 font-mono text-primary font-semibold">{metrics.thoughtsTokenCount ?? 0}</td>
                          <td className="px-3.5 py-2 font-mono font-bold text-foreground">{metrics.totalTokenCount ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}

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
              {subtopic.cards.map((card, cardIndex) => {
                const sources = card.sources && card.sources.length > 0 ? card.sources : (card.metadata?.sources ?? []);
                const qualityStatus = card.metadata?.qualityStatus;

                return (
                  <div
                    key={card.id}
                    className="grid gap-3 rounded-3xl border border-[rgba(31,111,115,0.12)] bg-[rgba(31,111,115,0.04)] px-4 py-4"
                  >
                    {(sources.length > 0 || qualityStatus) ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {sources.map((source, sourceIdx) => {
                          const slideNumber = source.location?.printedSlideNumber ?? source.location?.pdfPageIndex ?? "";
                          const segmentId = source.location?.segmentId ?? "";
                          const isSlide = source.sourceType === "slide_pdf";
                          const badgeLabel = isSlide
                            ? (slideNumber !== "" ? `Slide ${slideNumber}` : "Slide (Tanpa Halaman)")
                            : source.sourceType === "transcript"
                              ? (segmentId ? `Segmen ${segmentId}` : "Segmen Transkrip")
                              : source.sourceType;

                          return (
                            <div key={sourceIdx} className="flex flex-wrap items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className="border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300 font-semibold text-xs"
                                title={source.location?.textQuote}
                              >
                                {badgeLabel}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className="text-[11px] font-mono text-muted-foreground border border-border"
                              >
                                {source.provenanceStatus}
                              </Badge>
                              {source.location?.textQuote ? (
                                <details className="w-full text-xs text-muted-foreground my-1">
                                  <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground/80 hover:text-foreground">
                                    Kutipan: "{source.location.textQuote.slice(0, 40)}..."
                                  </summary>
                                  <p className="mt-1 pl-2 border-l-2 border-primary/40 italic text-foreground/90">
                                    "{source.location.textQuote}"
                                  </p>
                                </details>
                              ) : null}
                            </div>
                          );
                        })}

                        {(() => {
                          const isConflictResolved = card.metadata?.conflictRefId
                            ? sourceConflicts.some(
                                (c) => c.conflictId === card.metadata?.conflictRefId && c.resolutionStatus !== "unresolved"
                              )
                            : false;

                          if (qualityStatus === "SUBSTANTIVE_CONFLICT") {
                            return isConflictResolved ? (
                              <Badge
                                variant="outline"
                                className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold"
                              >
                                Konflik Terklarifikasi
                              </Badge>
                            ) : (
                              <Badge
                                variant="destructive"
                                className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 font-bold"
                              >
                                Konflik Substantif
                              </Badge>
                            );
                          }
                          return null;
                        })()}

                        {qualityStatus === "REPAIRABLE_DEFECT" ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold"
                          >
                            Perlu Perbaikan
                          </Badge>
                        ) : null}
                      </div>
                    ) : null}

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
                );
              })}
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
                      sortOrder: current.cards.length + 1,
                      sources: [],
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

        {detail.material.status === "ready_for_review" && onAuditRepair ? (
          <Button
            loading={isAuditing}
            loadingLabel="Mengaudit..."
            type="button"
            variant="outline"
            onClick={() => {
              void onAuditRepair();
            }}
          >
            Audit & Perbaiki Kualitas (AI Reviewer)
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
            disabled={isPublished || hasUnresolvedCriticalOrHigh}
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
