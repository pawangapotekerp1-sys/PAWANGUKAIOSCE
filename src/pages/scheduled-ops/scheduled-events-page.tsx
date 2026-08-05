import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { Loader2, AlertCircle, Calendar, PlusCircle, Clock, FileText, Sparkles, RefreshCw, Trash2, Edit3, ArrowRight, ArrowLeft, Layers } from "lucide-react";
import Button, { getButtonStyleProps } from "../../components/ui/button";
import ConfirmDialog from "../../components/ui/confirm-dialog";
import { Card } from "../../components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import {
  deleteScheduledEvent,
  listScheduledOpsEvents,
  reactivateScheduledEvent,
} from "../../lib/api/scheduled-tryout-api";
import ScheduledOpsShell from "./scheduled-ops-shell";

function resolveStatusTone(status: "draft" | "upcoming" | "active" | "expired") {
  if (status === "active") {
    return "default";
  }

  if (status === "expired") {
    return "secondary";
  }

  return "outline";
}

function resolveStudentLaneVisibilityNote(status: "draft" | "upcoming" | "active" | "expired") {
  if (status === "draft") {
    return "Belum tampil ke peserta. Terbitkan dulu lalu tunggu jadwal mulai.";
  }

  if (status === "upcoming") {
    return "Belum tampil ke peserta. Event akan muncul saat jadwal mulai.";
  }

  if (status === "expired") {
    return "Sudah tidak tampil karena jadwalnya selesai.";
  }

  return "Sudah tampil untuk peserta yang memenuhi akses.";
}

function ScheduledEventsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const isListView = searchParams.get("view") === "list";

  const [pendingDeleteEvent, setPendingDeleteEvent] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const eventsQueryKey = ["scheduled-ops-events"] as const;
  const eventsQuery = useQuery({
    queryKey: eventsQueryKey,
    queryFn: () => listScheduledOpsEvents(),
  });

  const reactivateMutation = useMutation({
    mutationFn: ({
      eventId,
      accessStartAt,
      accessEndAt,
    }: {
      eventId: string;
      accessStartAt: string;
      accessEndAt: string;
    }) =>
      reactivateScheduledEvent({
        eventId,
        accessStartAt,
        accessEndAt,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: eventsQueryKey,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ eventId }: { eventId: string }) =>
      deleteScheduledEvent({
        eventId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: eventsQueryKey,
      });
    },
  });

  async function handleReactivate(eventId: string) {
    const accessStartAt = window.prompt("Masukkan akses mulai baru (YYYY-MM-DDTHH:mm)");

    if (!accessStartAt) {
      return;
    }

    const accessEndAt = window.prompt("Masukkan akses selesai baru (YYYY-MM-DDTHH:mm)");

    if (!accessEndAt) {
      return;
    }

    reactivateMutation.mutate({
      eventId,
      accessStartAt,
      accessEndAt,
    });
  }

  function handleDelete(eventId: string) {
    deleteMutation.mutate({
      eventId,
    });
  }

  function handleDeleteRequest(eventId: string, eventTitle: string) {
    setPendingDeleteEvent({
      id: eventId,
      title: eventTitle,
    });
  }

  function handleConfirmDelete() {
    if (!pendingDeleteEvent) {
      return;
    }

    handleDelete(pendingDeleteEvent.id);
    setPendingDeleteEvent(null);
  }

  const events = eventsQuery.data ?? [];
  const summaryItems = [
    {
      label: "Draft",
      value: events.filter((event) => event.status === "draft").length,
      note: "Masih dirapikan sebelum dibuka.",
      tone: "secondary" as const,
    },
    {
      label: "Akan tayang",
      value: events.filter((event) => event.status === "upcoming").length,
      note: "Sudah siap dengan jadwal berikutnya.",
      tone: "outline" as const,
    },
    {
      label: "Sedang aktif",
      value: events.filter((event) => event.status === "active").length,
      note: "Perlu dipantau selama akses berjalan.",
      tone: "default" as const,
    },
    {
      label: "Selesai",
      value: events.filter((event) => event.status === "expired").length,
      note: "Bisa diatur ulang bila perlu.",
      tone: "secondary" as const,
    },
  ];

  return (
    <ScheduledOpsShell
      activeHref="/scheduled-ops/events"
      title="Kelola Event Terjadwal"
      description="Pantau event aktif, draft, dan yang sudah selesai dari satu halaman kerja."
    >
      <div className="space-y-8">
        {!isListView ? (
          /* Feature Selection Landing View (Only 2 Cards shown) */
          <section className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Pemilihan Fitur Event Terjadwal
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Pilih salah satu fitur di bawah ini untuk melihat daftar event atau menyusun event baru.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Feature Card 1: Daftar Event */}
              <Card className="p-6 border-primary/30 bg-card shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/50 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Calendar className="h-6 w-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                      Daftar Event
                    </h3>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                      Lihat, kelola, dan pantau status event terjadwal yang sedang aktif, upcoming, draft, maupun yang sudah selesai.
                    </p>
                  </div>
                </div>
                <div className="pt-4 mt-6 border-t border-border/40 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground font-mono">
                    {events.length} Total Event
                  </span>
                  <Link
                    {...getButtonStyleProps({
                      size: "sm",
                      variant: "primary",
                      className: "h-9 px-4 text-xs font-bold shadow-xs cursor-pointer gap-1.5",
                    })}
                    to="/scheduled-ops/events?view=list"
                  >
                    Daftar Event
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>

              {/* Feature Card 2: Buat Event */}
              <Card className="p-6 border-amber-500/30 bg-card shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-amber-500/50 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                      <PlusCircle className="h-6 w-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                      Buat Event
                    </h3>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                      Susun dan terbitkan sesi event terjadwal baru lengkap dengan durasi, tanggal akses, dan bank soal.
                    </p>
                  </div>
                </div>
                <div className="pt-4 mt-6 border-t border-border/40 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Konfigurasi Baru
                  </span>
                  <Link
                    {...getButtonStyleProps({
                      size: "sm",
                      variant: "primary",
                      className: "h-9 px-4 text-xs font-bold shadow-xs cursor-pointer gap-1.5",
                    })}
                    to="/scheduled-ops/events/new?fresh=1"
                  >
                    Event baru
                    <PlusCircle className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>
            </div>
          </section>
        ) : (
          /* Event List Page View (Opened after clicking Daftar Event card) */
          <div className="space-y-6">
            {/* Top Back Navigation */}
            <div className="flex items-center justify-between">
              <Link
                to="/scheduled-ops/events"
                className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Kembali ke Pemilihan Fitur
              </Link>
            </div>

            {/* List Overview & Status Stats */}
            {eventsQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border rounded-2xl bg-card/60 shadow-xs backdrop-blur-sm">
                <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Menyiapkan daftar event</p>
              </div>
            ) : eventsQuery.isError ? (
              <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Daftar event belum bisa dimuat</AlertTitle>
                <AlertDescription>Daftar event belum bisa ditampilkan saat ini.</AlertDescription>
              </Alert>
            ) : !eventsQuery.data?.length ? (
              <Alert className="border-border/80 bg-card/60 p-5">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertTitle>Belum ada event</AlertTitle>
                <AlertDescription>Belum ada event yang dibuat.</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-6">
                {/* Stats Overview */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {summaryItems.map((item) => (
                    <Card
                      key={item.label}
                      className="flex min-h-[9rem] flex-col justify-between gap-3 p-5 border-border/80 bg-card shadow-xs transition-all hover:border-primary/30"
                    >
                      <Badge className="w-fit text-[10px] font-bold uppercase tracking-wider px-2 py-0.5" variant={item.tone}>
                        {item.label}
                      </Badge>
                      <div className="space-y-1">
                        <p className="text-3xl font-extrabold tracking-tight text-foreground">
                          {item.value}
                        </p>
                        <p className="text-xs text-muted-foreground leading-normal">{item.note}</p>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* List Control Bar */}
                <Card className="p-6 border-border/80 bg-card shadow-xs">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-lg font-extrabold tracking-tight text-foreground flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" />
                        Daftar event
                      </h2>
                      <p className="mt-1 max-w-2xl text-xs text-muted-foreground leading-relaxed">
                        Buka event yang perlu dirapikan, pantau status aksesnya, lalu lanjutkan aksi dari satu control bar.
                      </p>
                    </div>
                    <Link
                      {...getButtonStyleProps({
                        size: "sm",
                        variant: "primary",
                        className: "sm:min-w-[10.5rem] h-9 text-xs font-bold cursor-pointer gap-1.5",
                      })}
                      to="/scheduled-ops/events/new?fresh=1"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Event baru
                    </Link>
                  </div>
                </Card>

                {/* Event Items Grid */}
                <div className="grid gap-4">
                  {events.map((event) => (
                    <Card key={event.id} className="p-6 border-border/80 bg-card shadow-xs transition-all duration-300 hover:border-primary/30">
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1 space-y-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge 
                              variant={resolveStatusTone(event.status)}
                              className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 ${
                                event.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  : event.status === "upcoming"
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                    : ""
                              }`}
                            >
                              {event.statusLabel}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] font-mono font-semibold px-2 py-0.5">
                              Cycle {event.currentCycle}
                            </Badge>
                          </div>
                          <div className="space-y-1.5">
                            <h3 className="text-xl font-extrabold leading-tight tracking-tight text-foreground">
                              {event.title}
                            </h3>
                            <p className="max-w-3xl text-xs text-muted-foreground leading-relaxed">
                              {event.description}
                            </p>
                          </div>

                          <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-1">
                            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-primary" />
                              Jadwal akses
                            </p>
                            <p className="text-xs font-semibold text-foreground font-mono">
                              {event.windowLabel}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="default" className="text-[10px] font-semibold px-2.5 py-0.5">
                              <FileText className="h-3 w-3 mr-1 inline-block" />
                              {event.questionCountLabel}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] font-semibold px-2.5 py-0.5">
                              <Clock className="h-3 w-3 mr-1 inline-block" />
                              {event.durationLabel}
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed italic">
                            {resolveStudentLaneVisibilityNote(event.status)}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col gap-2 border-t border-border/40 pt-4 xl:min-w-[12rem] xl:border-t-0 xl:border-l xl:pl-5 xl:pt-0">
                          <Link
                            {...getButtonStyleProps({
                              size: "sm",
                              variant: "primary",
                              className: "h-9 text-xs font-bold cursor-pointer gap-1.5 justify-center",
                            })}
                            to={`/scheduled-ops/events/${event.id}/edit`}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Ubah event
                          </Link>
                          {event.status === "expired" ? (
                            <>
                              <Button
                                disabled={reactivateMutation.isPending}
                                onClick={() => {
                                  void handleReactivate(event.id);
                                }}
                                size="sm"
                                variant="secondary"
                                className="h-9 text-xs font-semibold cursor-pointer gap-1.5 justify-center"
                              >
                                <RefreshCw className="h-3.5 w-3.5 text-primary" />
                                Aktifkan lagi
                              </Button>
                              <Button
                                disabled={deleteMutation.isPending}
                                onClick={() => handleDeleteRequest(event.id, event.title)}
                                size="sm"
                                variant="destructive"
                                className="h-9 text-xs font-semibold cursor-pointer gap-1.5 justify-center"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Hapus event
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <ConfirmDialog
          confirmLabel="Hapus event"
          description={
            pendingDeleteEvent
              ? `${pendingDeleteEvent.title} akan dihapus dari daftar event. Tindakan ini tidak bisa dibatalkan.`
              : "Event ini akan dihapus dari daftar event. Tindakan ini tidak bisa dibatalkan."
          }
          isPending={deleteMutation.isPending}
          onClose={() => setPendingDeleteEvent(null)}
          onConfirm={handleConfirmDelete}
          open={Boolean(pendingDeleteEvent)}
          pendingLabel="Menghapus..."
          title="Hapus event ini?"
        />
      </div>
    </ScheduledOpsShell>
  );
}

export default ScheduledEventsPage;
