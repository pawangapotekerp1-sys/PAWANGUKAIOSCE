import React, { useState, useRef } from 'react';
import { FileText, Sparkles, Upload, Loader2 } from 'lucide-react';

interface Props {
  onGenerate: (prompt?: string, file?: File, scenarioType?: string) => void;
  isGenerating: boolean;
}

export function StationBuilderForm({ onGenerate, isGenerating }: Props) {
  const [mode, setMode] = useState<'prompt' | 'upload'>('prompt');
  const [prompt, setPrompt] = useState('');
  const [scenarioType, setScenarioType] = useState('pemeran_standar');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isGenerating) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleBoxClick = () => {
    if (!isGenerating && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Pilih Metode Pembuatan</h2>
      
      <div className="flex gap-4 mb-6">
        <button 
          type="button"
          disabled={isGenerating}
          onClick={() => setMode('prompt')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${mode === 'prompt' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700 font-semibold' : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
        >
          <Sparkles size={20} /> AI Generator
        </button>
        <button 
          type="button"
          disabled={isGenerating}
          onClick={() => setMode('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${mode === 'upload' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700 font-semibold' : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
        >
          <Upload size={20} /> Upload Dokumen
        </button>
      </div>

      {mode === 'prompt' ? (
        <div className="space-y-4">
          <textarea 
            value={prompt}
            disabled={isGenerating}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Masukkan instruksi skenario OSCE... (Contoh: Pasien dengan asma eksaserbasi akut)"
            className="w-full h-32 p-4 rounded-lg border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none resize-none text-slate-700 bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          
          <div className="flex flex-col gap-3 py-2">
            <label className="text-sm font-semibold text-slate-700">Jenis Stase / Skenario</label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="scenarioType" 
                  value="pemeran_standar" 
                  checked={scenarioType === 'pemeran_standar'} 
                  onChange={(e) => setScenarioType(e.target.value)} 
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-600 border-slate-300" 
                  disabled={isGenerating}
                />
                <span className="text-sm text-slate-700">Pemeran Standar</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="scenarioType" 
                  value="dokumen" 
                  checked={scenarioType === 'dokumen'} 
                  onChange={(e) => setScenarioType(e.target.value)} 
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-600 border-slate-300" 
                  disabled={isGenerating}
                />
                <span className="text-sm text-slate-700">Dokumen</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="scenarioType" 
                  value="hybrid" 
                  checked={scenarioType === 'hybrid'} 
                  onChange={(e) => setScenarioType(e.target.value)} 
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-600 border-slate-300" 
                  disabled={isGenerating}
                />
                <span className="text-sm text-slate-700">Hybrid (Keduanya)</span>
              </label>
            </div>
          </div>

          <button 
            type="button"
            disabled={isGenerating || !prompt.trim()}
            onClick={() => onGenerate(prompt.trim(), undefined, scenarioType)}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {isGenerating ? 'Memproses...' : 'Generate Skenario'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".pdf,.docx" 
            className="hidden" 
            disabled={isGenerating}
          />
          <div 
            onClick={handleBoxClick}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
             <FileText size={40} className="mb-3 text-slate-400" />
             {selectedFile ? (
               <p className="font-medium text-emerald-700">File terpilih: {selectedFile.name}</p>
             ) : (
               <>
                 <p className="font-medium">Klik atau drop file DOCX/PDF ke sini</p>
                 <p className="text-sm mt-1">Sistem AI akan mengekstrak data menjadi JSON</p>
               </>
             )}
          </div>
          <button 
            type="button"
            disabled={isGenerating || !selectedFile}
            onClick={() => selectedFile && onGenerate(undefined, selectedFile, scenarioType)}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isGenerating ? <Loader2 className="animate-spin" /> : <Upload />}
            {isGenerating ? 'Mengekstrak Dokumen...' : 'Proses Dokumen'}
          </button>
        </div>
      )}
    </div>
  );
}

