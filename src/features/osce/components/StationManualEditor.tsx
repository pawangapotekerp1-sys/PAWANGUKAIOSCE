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
        <label htmlFor="station-objective" className="text-sm font-semibold text-slate-600">Tujuan Station</label>
        <input 
          id="station-objective"
          type="text"
          value={config.objective || ''}
          onChange={(e) => handleChange('objective', e.target.value)}
          className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
          placeholder="Misal: Menguji kemampuan kandidat dalam pengumpulan data..."
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="station-competence" className="text-sm font-semibold text-slate-600">Kompetensi Spesifik</label>
          <textarea 
            id="station-competence"
            value={config.competence || ''}
            onChange={(e) => handleChange('competence', e.target.value)}
            className="w-full h-24 p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 resize-y"
            placeholder="Daftar kompetensi yang diuji..."
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="station-practice-area" className="text-sm font-semibold text-slate-600">Praktek Kefarmasian</label>
          <textarea 
            id="station-practice-area"
            value={config.practiceArea || ''}
            onChange={(e) => handleChange('practiceArea', e.target.value)}
            className="w-full h-24 p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 resize-y"
            placeholder="Area praktik kefarmasian..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="station-instructions" className="text-sm font-semibold text-slate-600">Instruksi Kandidat (Skenario & Tugas)</label>
        <textarea 
          id="station-instructions"
          value={config.instructions}
          onChange={(e) => handleChange('instructions', e.target.value)}
          className="w-full h-32 p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 resize-y"
          placeholder="Tuliskan skenario dan tugas untuk dibaca kandidat..."
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="station-reference" className="text-sm font-semibold text-slate-600">Referensi</label>
        <input 
          id="station-reference"
          type="text"
          value={config.reference || ''}
          onChange={(e) => handleChange('reference', e.target.value)}
          className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
          placeholder="Referensi (Misal: Farmakope Indonesia Edisi VI)"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="station-actor-instructions" className="text-sm font-semibold text-slate-600">Instruksi Pemeran (Pasien Standar)</label>
        <textarea 
          id="station-actor-instructions"
          value={config.actorInstructions || ''}
          onChange={(e) => handleChange('actorInstructions', e.target.value)}
          className="w-full h-48 p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 resize-y"
          placeholder="Identitas pasien, riwayat penyakit, skenario jawaban (Hal-hal yang harus dikatakan jika ditanya kandidat)..."
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="station-worksheet" className="text-sm font-semibold text-slate-600">Template Lembar Kerja OSCE Internal (Markdown)</label>
        <textarea 
          id="station-worksheet"
          value={config.worksheetTemplate || ''}
          onChange={(e) => handleChange('worksheetTemplate', e.target.value)}
          className="w-full h-48 p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 resize-y font-mono text-sm"
          placeholder="Tuliskan format markdown tabel, form kosong, dll..."
        />
      </div>

      {/* Rubrics Info — hidden from editing, managed by AI */}
      {config.rubrics && config.rubrics.length > 0 && (
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 shrink-0"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <p className="text-sm text-emerald-800">
              <span className="font-semibold">{config.rubrics.length} rubrik penilaian</span> telah di-generate oleh AI berdasarkan guideline 25 parameter. Rubrik akan digunakan secara otomatis saat simulasi OSCE.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

