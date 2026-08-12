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
          placeholder="Misal: Kandidat mampu melakukan pengumpulan data dan konseling..."
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="station-instructions" className="text-sm font-semibold text-slate-600">Instruksi Kandidat (Skenario Klinik & Tugas)</label>
        <textarea 
          id="station-instructions"
          value={config.instructions}
          onChange={(e) => handleChange('instructions', e.target.value)}
          className="w-full h-32 p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 resize-y"
          placeholder="Tuliskan skenario untuk dibaca kandidat..."
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

      {/* Rubrics Section */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Rubrik Penilaian</h3>
          <button 
            type="button"
            onClick={() => {
              const newRubric = { competency: '', score3: '', score2: '', score1: '', score0: '' };
              handleChange('rubrics', [...(config.rubrics || []), newRubric]);
            }}
            className="text-sm px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
          >
            + Tambah Kompetensi
          </button>
        </div>
        
        {(!config.rubrics || config.rubrics.length === 0) ? (
          <p className="text-sm text-slate-500 italic">Belum ada rubrik penilaian. Silakan buat menggunakan AI atau tambah secara manual.</p>
        ) : (
          <div className="space-y-6">
            {config.rubrics.map((rubric, index) => (
              <div key={index} className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-4">
                <div className="flex justify-between items-center">
                  <input 
                    type="text"
                    value={rubric.competency}
                    onChange={(e) => {
                      const newRubrics = [...(config.rubrics || [])];
                      newRubrics[index] = { ...rubric, competency: e.target.value };
                      handleChange('rubrics', newRubrics);
                    }}
                    placeholder="Nama Kompetensi (Misal: Pengumpulan Data)"
                    className="flex-1 p-2 border border-slate-300 rounded font-semibold text-slate-800"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const newRubrics = config.rubrics!.filter((_, i) => i !== index);
                      handleChange('rubrics', newRubrics);
                    }}
                    className="ml-4 text-red-500 hover:text-red-700 font-medium text-sm"
                  >
                    Hapus
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {[3, 2, 1, 0].map((score) => {
                    const fieldName = `score${score}` as keyof typeof rubric;
                    return (
                      <div key={score} className="flex gap-3">
                        <div className="w-16 shrink-0 pt-2 font-bold text-slate-600 text-right">Skor {score}</div>
                        <textarea 
                          value={rubric[fieldName]}
                          onChange={(e) => {
                            const newRubrics = [...(config.rubrics || [])];
                            newRubrics[index] = { ...rubric, [fieldName]: e.target.value };
                            handleChange('rubrics', newRubrics);
                          }}
                          className="flex-1 p-2 text-sm border border-slate-200 rounded resize-y min-h-[60px]"
                          placeholder={`Deskripsi untuk skor ${score}...`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

