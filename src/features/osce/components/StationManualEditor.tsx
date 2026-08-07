import React, { useState } from 'react';
import type { StationConfig } from '../schemas/stationConfig';
import { Save } from 'lucide-react';

interface Props {
  initialConfig: StationConfig;
  onSave: (config: StationConfig) => void;
}

export function StationManualEditor({ initialConfig, onSave }: Props) {
  const [config, setConfig] = useState<StationConfig>(initialConfig);

  const handleChange = <K extends keyof StationConfig>(field: K, value: StationConfig[K]) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const sanitizedConfig: StationConfig = {
      ...config,
      durationMinutes: Math.max(1, config.durationMinutes)
    };
    setConfig(sanitizedConfig);
    onSave(sanitizedConfig);
  };

  const handleDurationBlur = () => {
    handleChange('durationMinutes', Math.max(1, config.durationMinutes));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-800">Editor Manual (Draft)</h2>
        <button 
          onClick={handleSave}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Save size={18} /> Simpan Konfigurasi
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="station-title" className="text-sm font-semibold text-slate-600">Judul Stase</label>
          <input 
            id="station-title"
            type="text" 
            value={config.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="station-duration" className="text-sm font-semibold text-slate-600">Durasi (Menit)</label>
          <input 
            id="station-duration"
            type="number" 
            value={config.durationMinutes || ''}
            onChange={(e) => handleChange('durationMinutes', parseInt(e.target.value, 10) || 0)}
            onBlur={handleDurationBlur}
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <label htmlFor="station-instructions" className="text-sm font-semibold text-slate-600">Instruksi Kandidat</label>
        <textarea 
          id="station-instructions"
          value={config.instructions}
          onChange={(e) => handleChange('instructions', e.target.value)}
          className="w-full h-24 p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 resize-none"
        />
      </div>
    </div>
  );
}

