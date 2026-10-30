import React, { useEffect, useState } from "react";
import { Video, ExternalLink, Calendar, Clock } from "lucide-react";
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

export type StudentLiveClassViewProps = {
  classes: LiveClass[];
  isLoading?: boolean;
};

export function StudentLiveClassView({ classes, isLoading }: StudentLiveClassViewProps) {
  const [now, setNow] = useState<Date>(() => new Date());

  // Auto-refresh interval every 30 seconds to reactively update button state
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-xl border border-dashed border-slate-200 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
          <Calendar className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Belum ada jadwal live class</h3>
        <p className="text-sm text-slate-500 max-w-md mt-1">
          Saat ini belum ada sesi bimbingan live yang dijadwalkan. Silakan cek kembali secara berkala.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/75">
            <TableRow>
              <TableHead className="w-14 text-center font-semibold text-slate-700">No</TableHead>
              <TableHead className="font-semibold text-slate-700 min-w-[200px]">Judul Sesi</TableHead>
              <TableHead className="font-semibold text-slate-700 min-w-[240px]">Waktu Pelaksanaan</TableHead>
              <TableHead className="font-semibold text-slate-700 w-36 text-center">Status</TableHead>
              <TableHead className="font-semibold text-slate-700 w-44 text-center">Link Zoom</TableHead>
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
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{formatLiveClassSchedule(item.startTime, item.endTime)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {status === "ongoing" && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 animate-pulse font-medium">
                        ● Sedang Berlangsung
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
                    {status === "ongoing" ? (
                      <a
                        href={item.zoomLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm w-full"
                      >
                        <Video className="w-4 h-4" />
                        <span>Masuk Zoom</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                      </a>
                    ) : status === "upcoming" ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 bg-slate-100 cursor-not-allowed w-full"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Belum Dimulai</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 bg-slate-50 cursor-not-allowed border border-slate-200 w-full"
                      >
                        <span>Selesai</span>
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
