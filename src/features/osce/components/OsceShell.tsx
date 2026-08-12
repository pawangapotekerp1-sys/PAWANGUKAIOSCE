import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import type { StationConfig } from '../schemas/stationConfig';
import { Clock, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface OsceShellProps {
  config: StationConfig;
  children: React.ReactNode;
  onExit?: () => void;
}

export function OsceShell({ config, children, onExit }: OsceShellProps) {
  const [timeLeft, setTimeLeft] = useState(config.durationMinutes * 60);

  useEffect(() => {
    // Reset timer if config changes
    setTimeLeft(config.durationMinutes * 60);
  }, [config]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (onExit) {
        toast.info("Waktu habis! Stase otomatis diselesaikan.");
        onExit();
      }
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, onExit]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isWarning = timeLeft < 60; // Merah kalau kurang dari 1 menit

  return (
    <div className="flex h-full w-full bg-slate-50 overflow-hidden">
      {/* Left Panel: Instructions */}
      <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-100">
          <h1 className="text-lg font-bold text-slate-800">{config.title}</h1>
          <div className={`flex items-center gap-2 font-mono font-bold ${isWarning ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
            <Clock size={18} />
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </div>
        <div className="p-6 flex-grow overflow-y-auto space-y-6">
          {config.objective && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Tujuan Station</h2>
              <p className="text-slate-700 text-sm">{config.objective}</p>
            </div>
          )}
          {config.competence && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Kompetensi Spesifik</h2>
              <p className="text-slate-700 text-sm whitespace-pre-line">{config.competence}</p>
            </div>
          )}
          {config.practiceArea && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Praktek Kefarmasian</h2>
              <p className="text-slate-700 text-sm">{config.practiceArea}</p>
            </div>
          )}
          
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Instruksi Kandidat (Skenario & Tugas)</h2>
            <div className="prose prose-sm text-slate-700 max-w-none bg-blue-50/50 p-4 rounded-lg border border-blue-100">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {config.instructions}
              </ReactMarkdown>
            </div>
          </div>

          {config.reference && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Referensi</h2>
              <p className="text-slate-700 text-sm italic">{config.reference}</p>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={onExit}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <CheckCircle size={18} />
            Selesai & Submit
          </button>
        </div>
      </div>
      
      {/* Right Panel: Dynamic Workspace */}
      <div className="w-2/3 flex flex-col bg-slate-50">
        {children}
      </div>
    </div>
  );
}
