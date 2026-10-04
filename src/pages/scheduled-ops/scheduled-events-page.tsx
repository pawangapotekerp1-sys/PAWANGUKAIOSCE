import { useState, FormEvent, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { Loader2, AlertCircle, Calendar, Eye, Edit3, Trash2, Plus, Search } from "lucide-react";
import Button from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import ConfirmDialog from "../../components/ui/confirm-dialog";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog";
import {
  deleteScheduledEvent,
  listScheduledOpsEvents,
  createScheduledEvent,
  updateScheduledEvent,
  type ScheduledOpsEventSummary,
  type ScheduledEventMutationInput,
} from "../../lib/api/scheduled-tryout-api";
import ScheduledOpsShell from "./scheduled-ops-shell";

function formatDateTimeForInput(dateString: string | null) {
  if (!dateString) return { date: "", time: "" };
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return { date: "", time: "" };
  // Expected local input format: YYYY-MM-DD and HH:mm
  const date = d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }); // YYYY-MM-DD
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }); // HH:mm
  return { date, time };
}

function combineDateTimeForOutput(date: string, time: string) {
  if (!date || !time) return new Date().toISOString();
  return `${date}T${time}`;
}

function resolveStatusTone(status: "draft" | "upcoming" | "active" | "expired"): "default" | "secondary" | "outline" | "destructive" {
  if (status === "active") return "default";
  if (status === "expired") return "secondary";
  if (status === "upcoming") return "outline";
  return "outline";
}

function ScheduledEventsPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  
  const [pendingDeleteEvent, setPendingDeleteEvent] = useState<{ id: string; title: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    editorialStatus: "draft",
    totalQuestions: "",
    durationMinutes: "",
    maxAttempts: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: ""
  });

  const eventsQueryKey = ["scheduled-ops-events"] as const;
  const eventsQuery = useQuery({
    queryKey: eventsQueryKey,
    queryFn: () => listScheduledOpsEvents(),
  });

  const createMutation = useMutation({
    mutationFn: (input: ScheduledEventMutationInput) => createScheduledEvent({ input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: eventsQueryKey });
      setIsModalOpen(false);
      alert("Tryout berhasil dibuat!");
    },
    onError: (err) => {
      alert("Gagal membuat tryout: " + err.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ eventId, input }: { eventId: string; input: ScheduledEventMutationInput }) => updateScheduledEvent({ eventId, input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: eventsQueryKey });
      setIsModalOpen(false);
      alert("Tryout berhasil diperbarui!");
    },
    onError: (err) => {
      alert("Gagal memperbarui tryout: " + err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ eventId }: { eventId: string }) => deleteScheduledEvent({ eventId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: eventsQueryKey });
      setPendingDeleteEvent(null);
    },
    onError: (err) => {
      alert("Gagal menghapus tryout: " + err.message);
    }
  });

  function handleDeleteRequest(eventId: string, eventTitle: string) {
    setPendingDeleteEvent({ id: eventId, title: eventTitle });
  }

  function handleConfirmDelete() {
    if (!pendingDeleteEvent) return;
    deleteMutation.mutate({ eventId: pendingDeleteEvent.id });
  }

  function handleOpenCreateModal() {
    setEditingEventId(null);
    setFormData({
      title: "",
      description: "",
      editorialStatus: "draft",
      totalQuestions: "",
      durationMinutes: "",
      maxAttempts: "",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: ""
    });
    setIsModalOpen(true);
  }

  function handleOpenEditModal(event: ScheduledOpsEventSummary) {
    setEditingEventId(event.id);
    const start = formatDateTimeForInput(event.accessStartAt);
    const end = formatDateTimeForInput(event.accessEndAt);
    
    setFormData({
      title: event.title,
      description: event.description || "",
      editorialStatus: event.editorialStatus || "draft",
      totalQuestions: event.questionCount.toString(),
      durationMinutes: event.durationMinutes.toString(),
      maxAttempts: (event.maxAttempts ?? 1).toString(),
      startDate: start.date,
      startTime: start.time,
      endDate: end.date,
      endTime: end.time
    });
    setIsModalOpen(true);
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    
    const accessStartAt = combineDateTimeForOutput(formData.startDate, formData.startTime);
    const accessEndAt = combineDateTimeForOutput(formData.endDate, formData.endTime);

    if (new Date(accessStartAt) >= new Date(accessEndAt)) {
      alert("Waktu mulai harus sebelum waktu selesai.");
      return;
    }

    const input: ScheduledEventMutationInput = {
      title: formData.title,
      description: formData.description, 
      editorialStatus: formData.editorialStatus as "draft" | "published",
      accessStartAt,
      accessEndAt,
      totalQuestions: parseInt(formData.totalQuestions) || 0,
      durationMinutes: parseInt(formData.durationMinutes) || 0,
      maxAttempts: parseInt(formData.maxAttempts) || 1,
    };

    if (editingEventId) {
      updateMutation.mutate({ eventId: editingEventId, input });
    } else {
      createMutation.mutate(input);
    }
  }

  const events = eventsQuery.data ?? [];
  const filteredEvents = useMemo(() => {
    return events.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [events, searchQuery]);

  return (
    <ScheduledOpsShell
      activeHref="/scheduled-ops/events"
      title="Kelola Event Terjadwal"
      description="Pantau event aktif, draft, dan yang sudah selesai."
    >
      <div className="space-y-6">
        {eventsQuery.isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border rounded-2xl bg-card/60 shadow-sm backdrop-blur-sm">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Menyiapkan daftar event</p>
          </div>
        ) : eventsQuery.isError ? (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Daftar event belum bisa dimuat</AlertTitle>
            <AlertDescription>Daftar event belum bisa ditampilkan saat ini.</AlertDescription>
          </Alert>
        ) : (
          <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
            {/* Table Header Controls */}
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border bg-muted/50 relative">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Cari tryout..."
                  aria-label="Cari tryout"
                  className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-background text-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <h2 className="text-lg font-bold text-foreground hidden md:block absolute left-1/2 -translate-x-1/2">
                Daftar Tryout
              </h2>
              <Button 
                onClick={handleOpenCreateModal}
                variant="default"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Tryout
              </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-4 text-center whitespace-nowrap">NO</th>
                    <th className="px-4 py-4 min-w-[200px]">JUDUL TRYOUT</th>
                    <th className="px-4 py-4 text-center whitespace-nowrap">SOAL</th>
                    <th className="px-4 py-4 text-center whitespace-nowrap">DURASI</th>
                    <th className="px-4 py-4 text-center whitespace-nowrap">LIMIT</th>
                    <th className="px-4 py-4 text-center whitespace-nowrap">TOTAL KELAS</th>
                    <th className="px-4 py-4 text-center whitespace-nowrap">MULAI AKSES</th>
                    <th className="px-4 py-4 text-center whitespace-nowrap">SELESAI AKSES</th>
                    <th className="px-4 py-4 text-center whitespace-nowrap">STATUS</th>
                    <th className="px-4 py-4 text-center whitespace-nowrap">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                        Tidak ada data event.
                      </td>
                    </tr>
                  ) : filteredEvents.map((event, index) => {
                    const startInfo = formatDateTimeForInput(event.accessStartAt);
                    const endInfo = formatDateTimeForInput(event.accessEndAt);
                    
                    return (
                      <tr key={event.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-4 text-center font-medium">{index + 1}</td>
                        <td className="px-4 py-4 font-bold text-foreground">{event.title}</td>
                        <td className="px-4 py-4 text-center font-bold text-blue-600">{event.questionCount}</td>
                        <td className="px-4 py-4 text-center">{event.durationMinutes} mnt</td>
                        <td className="px-4 py-4 text-center">{event.maxAttempts ?? 1}x</td>
                        <td className="px-4 py-4 text-center">
                          <Badge variant="outline">
                            0 KELAS
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-center text-xs">
                          <div className="font-bold text-emerald-600 mb-0.5">Start:</div>
                          <div className="text-muted-foreground whitespace-nowrap">
                            {startInfo.date} {startInfo.time}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-xs">
                          <div className="font-bold text-rose-600 mb-0.5">End:</div>
                          <div className="text-muted-foreground whitespace-nowrap">
                            {endInfo.date} {endInfo.time}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                           <Badge variant={resolveStatusTone(event.status)}>
                            {event.statusLabel}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button variant="outline" size="icon-sm" asChild title="Lihat Soal" aria-label="Lihat soal">
                              <Link to={`/scheduled-ops/events/${event.id}/questions`}>
                                <Eye className="w-4 h-4" />
                              </Link>
                            </Button>
                            <Button 
                              onClick={() => handleOpenEditModal(event)}
                              title="Ubah Event"
                              aria-label="Ubah event"
                              variant="outline"
                              size="icon-sm"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button 
                              onClick={() => handleDeleteRequest(event.id, event.title)}
                              title="Hapus Event"
                              aria-label="Hapus event"
                              variant="destructive"
                              size="icon-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Placeholder (Mocked for visual match) */}
            <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>LIMIT: 20</span>
                <span>Total: {filteredEvents.length} Data | Hal 1 / 1</span>
              </div>
              <div className="flex items-center gap-2">
                 <button className="px-3 py-1 rounded border border-border text-muted-foreground cursor-not-allowed">Previous</button>
                 <button className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center">1</button>
                 <button className="px-3 py-1 rounded border border-border text-muted-foreground cursor-not-allowed">Next</button>
              </div>
            </div>
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

        {/* Create/Edit Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-card rounded-xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <DialogTitle className="text-xl font-bold text-foreground text-center w-full">
                {editingEventId ? "Ubah Tryout" : "Tambah Tryout Baru"}
              </DialogTitle>
            </div>
            
            <form onSubmit={handleFormSubmit}>
              <div className="px-6 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
                
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-primary leading-relaxed">
                    Tryout akan <strong className="font-semibold">terbuka otomatis</strong> sesuai rentang tanggal yang dipilih.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-semibold text-foreground mb-1.5">Judul Tryout</label>
                    <input 
                      id="title"
                      required
                      type="text"
                      className="w-full px-4 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-background text-foreground"
                      placeholder="Contoh: Tryout UKAI Batch 1"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="totalQuestions" className="block text-sm font-semibold text-foreground mb-1.5">Jumlah Soal</label>
                      <input 
                        id="totalQuestions"
                        required
                        type="number"
                        min="1"
                        className="w-full px-4 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-background text-foreground"
                        placeholder="Contoh: 10"
                        value={formData.totalQuestions}
                        onChange={(e) => setFormData({...formData, totalQuestions: e.target.value})}
                      />
                    </div>
                    <div>
                      <label htmlFor="durationMinutes" className="block text-sm font-semibold text-foreground mb-1.5">Durasi (menit)</label>
                      <input 
                        id="durationMinutes"
                        required
                        type="number"
                        min="1"
                        className="w-full px-4 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-background text-foreground"
                        placeholder="Contoh: 90"
                        value={formData.durationMinutes}
                        onChange={(e) => setFormData({...formData, durationMinutes: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                     <label htmlFor="maxAttempts" className="block text-sm font-semibold text-foreground mb-1.5">Maksimum Percobaan</label>
                      <input 
                        id="maxAttempts"
                        required
                        type="number"
                        min="1"
                        className="w-full px-4 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-background text-foreground"
                        placeholder="Contoh: 3"
                        value={formData.maxAttempts}
                        onChange={(e) => setFormData({...formData, maxAttempts: e.target.value})}
                      />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="startDate" className="block text-sm font-semibold text-foreground mb-1.5">Tanggal Mulai (Access Start Date)</label>
                      <div className="relative">
                        <input 
                          id="startDate"
                          required
                          type="date"
                          className="w-full pl-4 pr-10 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-background text-foreground"
                          value={formData.startDate}
                          onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="endDate" className="block text-sm font-semibold text-foreground mb-1.5">Tanggal Selesai (Access End Date)</label>
                      <div className="relative">
                        <input 
                          id="endDate"
                          required
                          type="date"
                          className="w-full pl-4 pr-10 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-background text-foreground"
                          value={formData.endDate}
                          onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="startTime" className="block text-sm font-semibold text-foreground mb-1.5">Waktu Mulai</label>
                      <div className="relative">
                        <input 
                          id="startTime"
                          required
                          type="time"
                          className="w-full pl-4 pr-10 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-background text-foreground"
                          value={formData.startTime}
                          onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="endTime" className="block text-sm font-semibold text-foreground mb-1.5">Waktu Selesai</label>
                      <div className="relative">
                        <input 
                          id="endTime"
                          required
                          type="time"
                          className="w-full pl-4 pr-10 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-background text-foreground"
                          value={formData.endTime}
                          onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-border bg-muted/50 flex items-center justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  variant="default"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    editingEventId ? "Simpan Perubahan" : "Simpan"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </ScheduledOpsShell>
  );
}

export default ScheduledEventsPage;
