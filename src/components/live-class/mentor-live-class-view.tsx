import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Video, ExternalLink, Calendar, Clock } from "lucide-react";
import type { LiveClass } from "../../lib/api/live-class-api";
import { computeLiveClassStatus, formatLiveClassSchedule } from "../../lib/api/live-class-api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

type MentorLiveClassViewProps = {
  classes: LiveClass[];
  isLoading?: boolean;
  onAdd: () => void;
  onEdit: (liveClass: LiveClass) => void;
  onDelete: (liveClass: LiveClass) => void;
};

export function MentorLiveClassView({
  classes,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
}: MentorLiveClassViewProps) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const renderRoleBadge = (roles: string[]) => {
    if (roles.includes("pro") && roles.includes("osce_pro")) {
      return <Badge variant="outline" className="text-slate-700 border-slate-300">Semua Siswa</Badge>;
    }
    if (roles.includes("osce_pro")) {
      return <Badge className="bg-purple-100 text-purple-700 border-purple-200">OSCE</Badge>;
    }
    if (roles.includes("pro")) {
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Apoteker</Badge>;
    }
    return <Badge variant="outline">Semua Siswa</Badge>;
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Manajemen Live Class</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola jadwal webinar Zoom, target peserta, dan waktu pelaksanaan kelas.
          </p>
        </div>
        <Button
          onClick={onAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Jadwal Kelas</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-xl border border-dashed border-slate-200 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Belum ada kelas yang dibuat</h3>
          <p className="text-sm text-slate-500 max-w-md mt-1 mb-4">
            Mulai jadwalkan sesi tatap muka online pertama untuk siswa dengan klik tombol di bawah.
          </p>
          <Button onClick={onAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Jadwal Kelas
          </Button>
        </div>
      ) : (
        <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/75">
                <TableRow>
                  <TableHead className="w-12 text-center font-semibold text-slate-700">No</TableHead>
                  <TableHead className="font-semibold text-slate-700 min-w-[200px]">Judul Sesi</TableHead>
                  <TableHead className="font-semibold text-slate-700 w-32 text-center">Target Siswa</TableHead>
                  <TableHead className="font-semibold text-slate-700 min-w-[220px]">Waktu Pelaksanaan</TableHead>
                  <TableHead className="font-semibold text-slate-700 w-36 text-center">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700 w-32 text-center">Zoom Link</TableHead>
                  <TableHead className="font-semibold text-slate-700 w-28 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((item, index) => {
                  const status = computeLiveClassStatus(item.startTime, item.endTime, now);

                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="text-center font-medium text-slate-500">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-800">{item.title}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        {renderRoleBadge(item.targetRoles)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{formatLiveClassSchedule(item.startTime, item.endTime)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {status === "ongoing" && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 animate-pulse font-medium">
                            ● Berlangsung
                          </Badge>
                        )}
                        {status === "upcoming" && (
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                            Mendatang
                          </Badge>
                        )}
                        {status === "ended" && (
                          <Badge variant="outline" className="text-slate-400 border-slate-200 font-normal">
                            Selesai
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <a
                          href={item.zoomLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Buka Zoom</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(item)}
                            title="Edit Jadwal"
                            className="h-8 w-8 text-slate-600 hover:text-slate-900"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(item)}
                            title="Hapus Jadwal"
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sr-only">Hapus</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
