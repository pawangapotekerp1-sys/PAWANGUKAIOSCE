# Mentor Station Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Mentor Experience (Station Builder) allowing mentors to generate OSCE configurations via AI Prompt or File Upload, and manually edit them.

**Architecture:** A multi-step form consisting of a creation method selector (Prompt vs. File Upload), a loading state (simulating AI processing), and a manual JSON editor mapped to `StationConfigSchema`.

**Tech Stack:** React 19, React Router v7, Tailwind CSS v4, Lucide React, Vitest.

## Global Constraints

- Must use Tailwind v4 for styling.
- All components must be strictly typed with TypeScript.
- Use Lucide React for icons.
- Testing is required for all business logic and core components via Vitest.

---

### Task 1: Build the Station Builder Form (Input Modes)

**Files:**
- Create: `src/features/osce/components/StationBuilderForm.tsx`
- Test: `tests/features/osce/components/StationBuilderForm.test.tsx`

**Interfaces:**
- Consumes: N/A
- Produces: `StationBuilderForm` component that accepts `onGenerate(prompt?: string, file?: File)` callback.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StationBuilderForm } from '../../../../src/features/osce/components/StationBuilderForm';
import React from 'react';

describe('StationBuilderForm', () => {
  it('calls onGenerate when prompt is submitted', () => {
    const handleGenerate = vi.fn();
    render(<StationBuilderForm onGenerate={handleGenerate} isGenerating={false} />);
    
    const textarea = screen.getByPlaceholderText(/Masukkan instruksi/i);
    fireEvent.change(textarea, { target: { value: 'Test prompt' } });
    
    const generateBtn = screen.getByRole('button', { name: /Generate/i });
    fireEvent.click(generateBtn);
    
    expect(handleGenerate).toHaveBeenCalledWith('Test prompt', undefined);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/features/osce/components/StationBuilderForm.test.tsx`
Expected: FAIL (component not defined)

- [ ] **Step 3: Write minimal implementation**

```tsx
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
          onClick={() => setMode('prompt')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-colors ${mode === 'prompt' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
        >
          <Sparkles size={20} /> AI Generator
        </button>
        <button 
          onClick={() => setMode('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-colors ${mode === 'upload' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
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
            className="w-full h-32 p-4 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none text-slate-700 bg-slate-50"
          />
          <button 
            disabled={isGenerating || !prompt}
            onClick={() => onGenerate(prompt, undefined)}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
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
            disabled={isGenerating}
            onClick={() => onGenerate(undefined, new File([''], 'dummy.pdf'))}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {isGenerating ? <Loader2 className="animate-spin" /> : <Upload />}
            {isGenerating ? 'Mengekstrak Dokumen...' : 'Proses Dokumen'}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/features/osce/components/StationBuilderForm.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/features/osce/components/StationBuilderForm.test.tsx src/features/osce/components/StationBuilderForm.tsx
git commit -m "feat: add StationBuilderForm with prompt and upload modes"
```

---

### Task 2: Build the Station Manual Editor

**Files:**
- Create: `src/features/osce/components/StationManualEditor.tsx`
- Test: `tests/features/osce/components/StationManualEditor.test.tsx`

**Interfaces:**
- Consumes: `StationConfig`
- Produces: `StationManualEditor` component

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StationManualEditor } from '../../../../src/features/osce/components/StationManualEditor';
import type { StationConfig } from '../../../../src/features/osce/schemas/stationConfig';
import React from 'react';

const mockConfig: StationConfig = {
  id: 'stase-1', title: 'Test Stase', type: 'komunikasi', durationMinutes: 8, instructions: 'test', attachments: []
};

describe('StationManualEditor', () => {
  it('renders input fields populated with config data', () => {
    const handleSave = vi.fn();
    render(<StationManualEditor initialConfig={mockConfig} onSave={handleSave} />);
    expect(screen.getByDisplayValue('Test Stase')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/features/osce/components/StationManualEditor.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```tsx
import React, { useState } from 'react';
import type { StationConfig } from '../schemas/stationConfig';
import { Save } from 'lucide-react';

interface Props {
  initialConfig: StationConfig;
  onSave: (config: StationConfig) => void;
}

export function StationManualEditor({ initialConfig, onSave }: Props) {
  const [config, setConfig] = useState<StationConfig>(initialConfig);

  const handleChange = (field: keyof StationConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-800">Editor Manual (Draft)</h2>
        <button 
          onClick={() => onSave(config)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
        >
          <Save size={18} /> Simpan Konfigurasi
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-600">Judul Stase</label>
          <input 
            type="text" 
            value={config.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-600">Durasi (Menit)</label>
          <input 
            type="number" 
            value={config.durationMinutes}
            onChange={(e) => handleChange('durationMinutes', parseInt(e.target.value))}
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-600">Instruksi Kandidat</label>
        <textarea 
          value={config.instructions}
          onChange={(e) => handleChange('instructions', e.target.value)}
          className="w-full h-24 p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 resize-none"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/features/osce/components/StationManualEditor.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/features/osce/components/StationManualEditor.test.tsx src/features/osce/components/StationManualEditor.tsx
git commit -m "feat: add StationManualEditor component"
```

---

### Task 3: Integrate Mentor Builder Page

**Files:**
- Create: `src/pages/app/osce-builder-page.tsx`
- Modify: `src/router/app-router.tsx`, `src/pages/app/mentor-area-page.tsx`

**Interfaces:**
- Consumes: `StationBuilderForm`, `StationManualEditor`

- [ ] **Step 1: Write the builder page integration**

```tsx
// src/pages/app/osce-builder-page.tsx
import React, { useState } from 'react';
import { StationBuilderForm } from '../../features/osce/components/StationBuilderForm';
import { StationManualEditor } from '../../features/osce/components/StationManualEditor';
import type { StationConfig } from '../../features/osce/schemas/stationConfig';

export default function OsceBuilderPage() {
  const [draftConfig, setDraftConfig] = useState<StationConfig | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = (prompt?: string, file?: File) => {
    setIsGenerating(true);
    // Mock API processing delay
    setTimeout(() => {
      setDraftConfig({
        id: `stase-${Date.now()}`,
        title: prompt ? `Stase: ${prompt.substring(0, 15)}...` : 'Hasil Ekstraksi File',
        type: 'komunikasi',
        durationMinutes: 10,
        instructions: 'Instruksi otomatis hasil generate AI berdasarkan referensi.',
        attachments: []
      });
      setIsGenerating(false);
    }, 1500);
  };

  const handleSave = (config: StationConfig) => {
    alert('Konfigurasi berhasil disimpan: ' + config.title);
    setDraftConfig(null);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen bg-slate-50">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Pengatur OSCE (Mentor)</h1>
        <p className="text-slate-500 mt-2">Buat stase ujian menggunakan AI Prompt atau ekstraksi dokumen OSCE lama.</p>
      </div>

      {!draftConfig ? (
        <StationBuilderForm onGenerate={handleGenerate} isGenerating={isGenerating} />
      ) : (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-start gap-3">
             <span className="text-xl">⚠️</span>
             <div>
               <p className="font-semibold">Review Diperlukan (Draft)</p>
               <p className="text-sm">Silakan tinjau dan sunting hasil generate AI sebelum menyimpannya ke database.</p>
             </div>
          </div>
          <StationManualEditor initialConfig={draftConfig} onSave={handleSave} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update the route and mentor area link**

Update `src/router/app-router.tsx`:
Add this import: `const OsceBuilderPage = lazy(() => import("../pages/app/osce-builder-page"));`
Add the route under `/app`: `<Route path="osce-builder" element={<OsceBuilderPage />} />`

Update `src/pages/app/mentor-area-page.tsx`:
Change `href: "/app/osce-demo",` to `href: "/app/osce-builder",` under the `pengatur-osce` feature card.

```bash
git add src/pages/app/osce-builder-page.tsx src/router/app-router.tsx src/pages/app/mentor-area-page.tsx
git commit -m "feat: integrate osce builder page into mentor routing"
```
