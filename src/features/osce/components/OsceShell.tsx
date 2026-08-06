import React from 'react';
import type { StationConfig } from '../schemas/stationConfig';
import { Clock, CheckCircle } from 'lucide-react';

interface OsceShellProps {
  config: StationConfig;
  children: React.ReactNode;
}

export function OsceShell({ config, children }: OsceShellProps) {
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Left Panel: Instructions */}
      <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-100">
          <h1 className="text-lg font-bold text-slate-800">{config.title}</h1>
          <div className="flex items-center gap-2 text-rose-600 font-mono font-bold">
            <Clock size={18} />
            <span>{String(config.durationMinutes).padStart(2, '0')}:00</span>
          </div>
        </div>
        <div className="p-6 flex-grow overflow-y-auto">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Instruksi Kandidat</h2>
          <div className="prose prose-sm text-slate-700">
            {config.instructions}
          </div>
        </div>
        <div className="p-4 border-t border-slate-200">
          <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
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
