import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import type { LiveClass, LiveClassPayload, LiveClassRoleTarget } from "../../lib/api/live-class-api";

type LiveClassFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: LiveClassPayload) => Promise<void>;
  initialData?: LiveClass | null;
  isSubmitting?: boolean;
};

function toLocalDatetimeString(isoString?: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().slice(0, 16);
}

export function LiveClassFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSubmitting,
}: LiveClassFormModalProps) {
  const [title, setTitle] = useState("");
  const [targetType, setTargetType] = useState<"all" | "pro" | "osce_pro">("all");
  const [startTimeLocal, setStartTimeLocal] = useState("");
  const [endTimeLocal, setEndTimeLocal] = useState("");
  const [zoomLink, setZoomLink] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setStartTimeLocal(toLocalDatetimeString(initialData.startTime));
      setEndTimeLocal(toLocalDatetimeString(initialData.endTime));
      setZoomLink(initialData.zoomLink);

      const roles = initialData.targetRoles || [];
      if (roles.includes("pro") && roles.includes("osce_pro")) {
        setTargetType("all");
      } else if (roles.includes("osce_pro")) {
        setTargetType("osce_pro");
      } else if (roles.includes("pro")) {
        setTargetType("pro");
      } else {
        setTargetType("all");
      }
    } else {
      setTitle("");
      setTargetType("all");
      setStartTimeLocal("");
      setEndTimeLocal("");
      setZoomLink("");
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Judul sesi wajib diisi");
      return;
    }
    if (!startTimeLocal) {
      setError("Waktu mulai wajib diisi");
      return;
    }
    if (!endTimeLocal) {
      setError("Waktu selesai wajib diisi");
      return;
    }

    const startDate = new Date(startTimeLocal);
    const endDate = new Date(endTimeLocal);

    if (endDate <= startDate) {
      setError("Waktu selesai harus setelah waktu mulai");
      return;
    }

    try {
      const parsed = new URL(zoomLink.trim());
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error();
      }
    } catch {
      setError("Link Zoom wajib diisi dengan URL valid (diawali https:// atau http://)");
      return;
    }

    let targetRoles: LiveClassRoleTarget[] = ["pro", "osce_pro"];
    if (targetType === "pro") {
      targetRoles = ["pro"];
    } else if (targetType === "osce_pro") {
      targetRoles = ["osce_pro"];
    }

    try {
      await onSave({
        title: title.trim(),
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        zoomLink: zoomLink.trim(),
        targetRoles,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Jadwal Live Class" : "Tambah Jadwal Live Class"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="title">Judul Sesi *</Label>
            <Input
              id="title"
              placeholder="Contoh: Bimbingan OSCE Stase Farmakologi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Target Siswa *</Label>
            <div
              role="radiogroup"
              aria-label="Target Siswa"
              className="grid grid-cols-3 gap-2"
            >
              <button
                type="button"
                role="radio"
                aria-checked={targetType === "all"}
                onClick={() => setTargetType("all")}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors ${
                  targetType === "all"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Semua Siswa
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={targetType === "pro"}
                onClick={() => setTargetType("pro")}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors ${
                  targetType === "pro"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Apoteker (Pro)
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={targetType === "osce_pro"}
                onClick={() => setTargetType("osce_pro")}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors ${
                  targetType === "osce_pro"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                OSCE Pro
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Waktu Mulai (WIB) *</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTimeLocal}
                onChange={(e) => setStartTimeLocal(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">Waktu Selesai (WIB) *</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={endTimeLocal}
                onChange={(e) => setEndTimeLocal(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="zoomLink">Link Zoom Meeting *</Label>
            <Input
              id="zoomLink"
              type="url"
              placeholder="https://zoom.us/j/..."
              value={zoomLink}
              onChange={(e) => setZoomLink(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmitting ? "Menyimpan..." : "Simpan Jadwal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
