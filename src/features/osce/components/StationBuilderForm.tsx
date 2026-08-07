import React, { useState } from 'react';
import { FileText, Sparkles, Upload, Loader2 } from 'lucide-react';

interface Props {
  onGenerate: (prompt?: string, file?: File) => void;
  isGenerating: boolean;
}

export function StationBuilderForm({ onGenerate, isGenerating }: Props) {
  const [mode, setMode] = useState<'prompt' | 'upload'>('prompt');
  const [prompt, setPrompt] = useState('');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Pilih Metode Pembuatan</h2>
      
      <div className="flex gap-4 mb-6">
        <button 
          type="button"
          onClick={() => setMode('prompt')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-colors cursor-pointer ${mode === 'prompt' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700 font-semibold' : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
        >
          <Sparkles size={20} /> AI Generator
        </button>
        <button 
          type="button"
          onClick={() => setMode('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-colors cursor-pointer ${mode === 'upload' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700 font-semibold' : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
        >
          <Upload size={20} /> Upload Dokumen
        </button>
      </div>

      {mode === 'prompt' ? (
        <div className="space-y-4">
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Masukkan instruksi skenario OSCE... (Contoh: Pasien dengan asma eksaserbasi akut)"
            className="w-full h-32 p-4 rounded-lg border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none resize-none text-slate-700 bg-slate-50"
          />
          <button 
            type="button"
            disabled={isGenerating || !prompt}
            onClick={() => onGenerate(prompt, undefined)}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {isGenerating ? 'Memproses...' : 'Generate Skenario'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
             <FileText size={40} className="mb-3 text-slate-400" />
             <p className="font-medium">Klik atau drop file DOCX/PDF ke sini</p>
             <p className="text-sm mt-1">Sistem AI akan mengekstrak data menjadi JSON</p>
          </div>
          <button 
            type="button"
            disabled={isGenerating}
            onClick={() => onGenerate(undefined, new File([''], 'dummy.pdf'))}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isGenerating ? <Loader2 className="animate-spin" /> : <Upload />}
            {isGenerating ? 'Mengekstrak Dokumen...' : 'Proses Dokumen'}
          </button>
        </div>
      )}
    </div>
  );
}
