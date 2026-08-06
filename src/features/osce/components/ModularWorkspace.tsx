import React from 'react';
import type { StationConfig } from '../schemas/stationConfig';
import { OsceShell } from './OsceShell';

// Mock components for now
function VoiceWidget() {
  return <div className="p-8 h-full flex items-center justify-center bg-slate-900 text-white rounded-xl m-4 shadow-inner text-xl font-medium">AI Voice Roleplay (Mock)</div>;
}

function FormWidget() {
  return <div className="p-8 h-full bg-white rounded-xl m-4 shadow-sm border border-slate-200 text-slate-800">Interactive Form (Mock)</div>;
}

interface ModularWorkspaceProps {
  config: StationConfig;
}

export function ModularWorkspace({ config }: ModularWorkspaceProps) {
  const isKomunikasi = config.type === 'komunikasi' || config.type === 'hybrid';
  const isDokumen = config.type === 'dokumen' || config.type === 'hybrid';

  return (
    <OsceShell config={config}>
      <div className="flex-grow flex flex-col p-2 h-full">
        {/* Attachments Tab Bar would go here */}
        <div className="bg-white px-6 py-3 border-b border-slate-200 text-sm font-medium text-slate-600 flex gap-6">
           <span className="text-emerald-600 border-b-2 border-emerald-600 pb-3 -mb-3">Workspace Utama</span>
           {(config.attachments?.length ?? 0) > 0 && <span>Lampiran ({config.attachments?.length})</span>}
        </div>
        
        {/* Dynamic Widgets */}
        <div className={`flex-grow flex ${config.type === 'hybrid' ? 'flex-col' : ''}`}>
          {isKomunikasi && <div className="flex-1"><VoiceWidget /></div>}
          {isDokumen && <div className="flex-1"><FormWidget /></div>}
        </div>
      </div>
    </OsceShell>
  );
}
