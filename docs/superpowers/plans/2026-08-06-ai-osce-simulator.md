# AI OSCE Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundational Modular UI Workspace and Station Config Parser for the AI OSCE Simulator that dynamically renders Voice or Form widgets based on a JSON config.

**Architecture:** We will define Zod schemas for the Station Configuration. A main `OsceWorkspace` component will fetch/receive this config and conditionally render the `VoiceRoleplayWidget` and `InteractiveFormWidget` alongside the static instructions and timer.

**Tech Stack:** React 19, React Router v7, Tailwind CSS v4, Zod, Vitest.

## Global Constraints

- Must use Tailwind v4 for styling.
- All components must be strictly typed with TypeScript.
- Use Lucide React for icons.
- Testing is required for all business logic (schemas) and core components via Vitest.

---

### Task 1: Define Station Configuration Schemas

**Files:**
- Create: `src/features/osce/schemas/stationConfig.ts`
- Test: `tests/features/osce/schemas/stationConfig.test.ts`

**Interfaces:**
- Consumes: N/A
- Produces: `StationConfigSchema`, `StationConfig` type.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { StationConfigSchema } from '../../../../src/features/osce/schemas/stationConfig';

describe('StationConfigSchema', () => {
  it('validates a correct communication station config', () => {
    const validConfig = {
      id: 'stase-1',
      title: 'Konseling Hipertensi',
      type: 'komunikasi',
      durationMinutes: 8,
      instructions: 'Lakukan konseling kepada pasien.',
      aiPersona: { role: 'patient', prompt: 'You are an angry patient.' },
      attachments: [{ id: 'resep1', title: 'Resep Dokter', type: 'image', url: '/resep.jpg' }]
    };
    
    const result = StationConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('rejects invalid config', () => {
    const invalidConfig = { id: 'stase-1' };
    const result = StationConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/features/osce/schemas/stationConfig.test.ts`
Expected: FAIL with "StationConfigSchema is not defined"

- [ ] **Step 3: Write minimal implementation**

```typescript
import { z } from 'zod';

export const AttachmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['image', 'pdf']),
  url: z.string(),
});

export const AiPersonaSchema = z.object({
  role: z.enum(['patient', 'doctor', 'nurse']),
  prompt: z.string(),
});

export const StationConfigSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['komunikasi', 'dokumen', 'hybrid']),
  durationMinutes: z.number().min(1),
  instructions: z.string(),
  aiPersona: AiPersonaSchema.optional(),
  requiredForm: z.string().optional(),
  attachments: z.array(AttachmentSchema).default([]),
});

export type StationConfig = z.infer<typeof StationConfigSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/features/osce/schemas/stationConfig.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/features/osce/schemas/stationConfig.test.ts src/features/osce/schemas/stationConfig.ts
git commit -m "feat: add station config zod schemas"
```

### Task 2: Build Static Framework Shell (Timer & Instructions)

**Files:**
- Create: `src/features/osce/components/OsceShell.tsx`
- Test: `tests/features/osce/components/OsceShell.test.tsx`

**Interfaces:**
- Consumes: `StationConfig`
- Produces: `<OsceShell />` wrapper component.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { OsceShell } from '../../../../src/features/osce/components/OsceShell';
import type { StationConfig } from '../../../../src/features/osce/schemas/stationConfig';

const mockConfig: StationConfig = {
  id: 'stase-1',
  title: 'Konseling Hipertensi',
  type: 'komunikasi',
  durationMinutes: 8,
  instructions: 'Lakukan konseling',
  attachments: []
};

describe('OsceShell', () => {
  it('renders title and instructions', () => {
    render(<OsceShell config={mockConfig}><div>Child Content</div></OsceShell>);
    expect(screen.getByText('Konseling Hipertensi')).toBeInTheDocument();
    expect(screen.getByText('Lakukan konseling')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/features/osce/components/OsceShell.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/features/osce/components/OsceShell.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/features/osce/components/OsceShell.test.tsx src/features/osce/components/OsceShell.tsx
git commit -m "feat: add OsceShell component layout"
```

### Task 3: Build the Modular Workspace Entry

**Files:**
- Create: `src/features/osce/components/ModularWorkspace.tsx`
- Test: `tests/features/osce/components/ModularWorkspace.test.tsx`

**Interfaces:**
- Consumes: `StationConfig`, `OsceShell`
- Produces: `<ModularWorkspace />`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ModularWorkspace } from '../../../../src/features/osce/components/ModularWorkspace';
import type { StationConfig } from '../../../../src/features/osce/schemas/stationConfig';

describe('ModularWorkspace', () => {
  it('renders Voice UI for komunikasi type', () => {
    const config: StationConfig = {
      id: '1', title: 'Test', type: 'komunikasi', durationMinutes: 8, instructions: 'test', attachments: []
    };
    render(<ModularWorkspace config={config} />);
    expect(screen.getByText('AI Voice Roleplay (Mock)')).toBeInTheDocument();
  });

  it('renders Form UI for dokumen type', () => {
    const config: StationConfig = {
      id: '2', title: 'Test', type: 'dokumen', durationMinutes: 8, instructions: 'test', requiredForm: 'sp', attachments: []
    };
    render(<ModularWorkspace config={config} />);
    expect(screen.getByText('Interactive Form (Mock)')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/features/osce/components/ModularWorkspace.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```tsx
import React from 'react';
import type { StationConfig } from '../schemas/stationConfig';
import { OsceShell } from './OsceShell';

// Mock components for now
function VoiceWidget() {
  return <div className="p-8 h-full flex items-center justify-center bg-slate-900 text-white rounded-xl m-4 shadow-inner text-xl font-medium">AI Voice Roleplay (Mock)</div>;
}

function FormWidget() {
  return <div className="p-8 h-full bg-white rounded-xl m-4 shadow-sm border border-slate-200">Interactive Form (Mock)</div>;
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
           {config.attachments.length > 0 && <span>Lampiran ({config.attachments.length})</span>}
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/features/osce/components/ModularWorkspace.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/features/osce/components/ModularWorkspace.test.tsx src/features/osce/components/ModularWorkspace.tsx
git commit -m "feat: add ModularWorkspace orchestrator"
```
