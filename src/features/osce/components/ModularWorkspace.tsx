import React, { useState, useRef } from 'react';
import type { StationConfig } from '../schemas/stationConfig';
import { OsceShell } from './OsceShell';
import { LiveCallWidget } from './LiveCallWidget';

function FormWidget({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="p-4 h-full bg-white rounded-xl m-4 shadow-sm border border-slate-200 text-slate-800 flex flex-col">
      <h3 className="font-bold mb-2">Lembar Kerja / Dokumen</h3>
      <textarea 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ketik jawaban tertulis, perhitungan, atau rencana asuhan di sini..."
        className="w-full flex-grow p-3 border rounded-lg resize-none outline-none focus:border-blue-500"
      />
    </div>
  );
}

interface ModularWorkspaceProps {
  config: StationConfig;
  onExit?: (payload: { transcript: any[], formData: string }) => void;
}

export function ModularWorkspace({ config, onExit }: ModularWorkspaceProps) {
  const isKomunikasi = config.type === 'komunikasi' || config.type === 'hybrid';
  const isDokumen = config.type === 'dokumen' || config.type === 'hybrid';
  const [formData, setFormData] = useState("");
  const transcriptRef = useRef<any[]>([]);

  return (
    <OsceShell config={config} onExit={() => onExit?.({ transcript: transcriptRef.current, formData })}>
      <div className="flex-grow flex flex-col p-2 h-full">
        {/* Attachments Tab Bar would go here */}
        <div className="bg-white px-6 py-3 border-b border-slate-200 text-sm font-medium text-slate-600 flex justify-between items-center">
          <div className="flex gap-6">
            <span className="text-emerald-600 border-b-2 border-emerald-600 pb-3 -mb-3">Workspace Utama</span>
            {(config.attachments?.length ?? 0) > 0 && <span>Lampiran ({config.attachments?.length})</span>}
          </div>
        </div>
        
        {/* Dynamic Widgets */}
        <div className={`flex-grow flex overflow-hidden ${config.type === 'hybrid' ? 'flex-col' : ''}`}>
          {isKomunikasi && (
            <div className="flex-1 h-full overflow-hidden">
              <LiveCallWidget config={config} onTranscriptUpdate={(t) => transcriptRef.current = t} />
            </div>
          )}
          {isDokumen && <div className="flex-1 overflow-y-auto"><FormWidget value={formData} onChange={setFormData} /></div>}
        </div>
      </div>
    </OsceShell>
  );
}
