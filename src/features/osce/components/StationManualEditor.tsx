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

      {/* Rubrics Section */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Rubrik Penilaian</h3>
          <button 
            type="button"
            onClick={() => {
              const newRubric = { 
                competencyDomain: '',
                criterion: '',
                expectedEvidence: '',
                score3Anchor: '', 
                score2Anchor: '', 
                score1Anchor: '', 
                score0Anchor: '',
                criticalElements: [],
                supportingElements: [],
                acceptedSemanticVariants: [],
                acceptedClinicalAlternatives: [],
                unacceptableResponses: [],
                dangerousResponses: [],
                weight: 10,
                isCriticalItem: false,
                criticalErrorRule: '',
                patientSafetyRule: '',
                sequenceSensitive: false,
                conditionalRule: '',
                evidenceSource: '',
                reference: '',
                referenceVersion: '',
                humanReviewTrigger: '',
                rubricId: `RUBRIC-${Date.now().toString().slice(-4)}`
              };
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
                  <span className="text-sm font-bold text-slate-700">Rubrik #{index + 1}: {rubric.rubricId || '(Tanpa ID)'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newRubrics = [...(config.rubrics || [])];
                      newRubrics.splice(index, 1);
                      handleChange('rubrics', newRubrics);
                    }}
                    className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Domain Kompetensi / ID</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={rubric.competencyDomain || rubric.competency || ''}
                        onChange={(e) => {
                          const newRubrics = [...(config.rubrics || [])];
                          newRubrics[index] = { ...rubric, competencyDomain: e.target.value, competency: e.target.value };
                          handleChange('rubrics', newRubrics);
                        }}
                        placeholder="Misal: Pengumpulan Data"
                        className="flex-1 p-2 border border-slate-300 rounded font-semibold text-slate-800"
                      />
                      <input 
                        type="text"
                        value={rubric.rubricId || ''}
                        onChange={(e) => {
                          const newRubrics = [...(config.rubrics || [])];
                          newRubrics[index] = { ...rubric, rubricId: e.target.value };
                          handleChange('rubrics', newRubrics);
                        }}
                        placeholder="ID Unik"
                        className="w-24 p-2 border border-slate-300 rounded text-slate-600 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Kriteria Penilaian (Criterion)</label>
                    <input 
                      type="text"
                      value={rubric.criterion || ''}
                      onChange={(e) => {
                        const newRubrics = [...(config.rubrics || [])];
                        newRubrics[index] = { ...rubric, criterion: e.target.value };
                        handleChange('rubrics', newRubrics);
                      }}
                      placeholder="Kemampuan yang dinilai..."
                      className="w-full p-2 border border-slate-300 rounded text-slate-800"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Expected Evidence</label>
                  <textarea 
                    value={rubric.expectedEvidence || ''}
                    onChange={(e) => {
                      const newRubrics = [...(config.rubrics || [])];
                      newRubrics[index] = { ...rubric, expectedEvidence: e.target.value };
                      handleChange('rubrics', newRubrics);
                    }}
                    placeholder="Evidence minimal yang membuat kriteria terpenuhi..."
                    className="w-full p-2 border border-slate-300 rounded text-sm min-h-[60px]"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 mb-4">
                  {[3, 2, 1, 0].map((score) => {
                    const legacyFieldName = `score${score}` as keyof typeof rubric;
                    const newFieldName = `score${score}Anchor` as keyof typeof rubric;
                    return (
                      <div key={score} className="flex gap-3">
                        <div className="w-16 shrink-0 pt-2 font-bold text-slate-600 text-right">Skor {score}</div>
                        <textarea 
                          value={(rubric[newFieldName] as string) || (rubric[legacyFieldName] as string) || ''}
                          onChange={(e) => {
                            const newRubrics = [...(config.rubrics || [])];
                            newRubrics[index] = { ...rubric, [newFieldName]: e.target.value, [legacyFieldName]: e.target.value };
                            handleChange('rubrics', newRubrics);
                          }}
                          className="flex-1 p-2 text-sm border border-slate-200 rounded resize-y min-h-[60px]"
                          placeholder={`Definisi operasional untuk skor ${score}...`}
                        />
                      </div>
                    );
                  })}
                </div>

                <details className="group border border-slate-200 rounded-lg bg-white overflow-hidden">
                  <summary className="px-4 py-3 bg-slate-100/50 cursor-pointer text-sm font-semibold text-slate-700 hover:bg-slate-100 flex justify-between items-center list-none">
                    <span>Pengaturan Lanjutan (Guideline 25 Parameter)</span>
                    <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-white">
                    <div className="space-y-3">
                      <div>
                        <label className="font-semibold text-slate-600 block mb-1">Critical Elements (Pisahkan dgn enter)</label>
                        <textarea 
                          value={rubric.criticalElements?.join('\n') || ''}
                          onChange={(e) => {
                            const newRubrics = [...(config.rubrics || [])];
                            newRubrics[index] = { ...rubric, criticalElements: e.target.value.split('\n').filter(Boolean) };
                            handleChange('rubrics', newRubrics);
                          }}
                          className="w-full p-2 border border-slate-200 rounded min-h-[80px]"
                          placeholder="Elemen kritis penentu keselamatan..."
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-600 block mb-1">Accepted Clinical Alternatives</label>
                        <textarea 
                          value={rubric.acceptedClinicalAlternatives?.join('\n') || ''}
                          onChange={(e) => {
                            const newRubrics = [...(config.rubrics || [])];
                            newRubrics[index] = { ...rubric, acceptedClinicalAlternatives: e.target.value.split('\n').filter(Boolean) };
                            handleChange('rubrics', newRubrics);
                          }}
                          className="w-full p-2 border border-slate-200 rounded min-h-[80px]"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                       <div>
                        <label className="font-semibold text-red-600 block mb-1">Dangerous Responses (Pisahkan dgn enter)</label>
                        <textarea 
                          value={rubric.dangerousResponses?.join('\n') || ''}
                          onChange={(e) => {
                            const newRubrics = [...(config.rubrics || [])];
                            newRubrics[index] = { ...rubric, dangerousResponses: e.target.value.split('\n').filter(Boolean) };
                            handleChange('rubrics', newRubrics);
                          }}
                          className="w-full p-2 border border-red-200 rounded min-h-[80px]"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-amber-600 block mb-1">Human Review Trigger</label>
                        <textarea 
                          value={rubric.humanReviewTrigger || ''}
                          onChange={(e) => {
                            const newRubrics = [...(config.rubrics || [])];
                            newRubrics[index] = { ...rubric, humanReviewTrigger: e.target.value };
                            handleChange('rubrics', newRubrics);
                          }}
                          className="w-full p-2 border border-amber-200 rounded min-h-[80px]"
                          placeholder="Kondisi kapan AI harus escalation ke dosen..."
                        />
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

