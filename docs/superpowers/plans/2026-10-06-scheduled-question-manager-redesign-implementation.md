# Scheduled Question Manager Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah UI pengelola soal try out terjadwal menjadi "popup page" berisikan grid kartu soal (read-only preview), dengan form input soal 1-per-1 berbasis modal.

**Architecture:** Halaman `/events/:id/questions` akan di-*styling* menyerupai *fullscreen modal* dengan *backdrop* gelap. Halaman ini menyimpan state `questions` dari database. Setiap kali modal "Tambah/Edit Soal" disimpan, state lokal di-*update* dan langsung di-*commit* ke backend via `updateScheduledEvent`.

**Tech Stack:** React, TypeScript, Supabase, Tailwind CSS, Lucide React, Shadcn UI (Dialog)

## Global Constraints

- Tampilan layout dan struktur informasi (Card grid, header, warning badges) harus mengikuti *screenshot* baru yang diunggah pengguna.
- Styling (tone warna, font, shadows) harus diadaptasikan dengan sistem UI yang sudah ada di aplikasi (menggunakan token Tailwind).
- Modal editor soal 1-by-1 harus mempertahankan fungsionalitas upload gambar yang sudah ada.

---

### Task 1: Create ScheduledQuestionCard Component

**Files:**
- Create: `src/pages/scheduled-ops/components/scheduled-question-card.tsx`

**Interfaces:**
- Consumes: Props `question: ScheduledEventQuestionDraftInput`, `index: number`, `onEdit: () => void`, `onDelete: () => void`.
- Produces: Komponen `<ScheduledQuestionCard />` yang merender preview soal dalam bentuk *card*.

- [ ] **Step 1: Write the component file**

```tsx
import { Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { ScheduledEventQuestionDraftInput } from "../../../lib/api/scheduled-tryout-api";

interface Props {
  question: ScheduledEventQuestionDraftInput;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function ScheduledQuestionCard({ question, index, onEdit, onDelete }: Props) {
  // Option rendering logic
  const hasCorrectAnswer = !!question.correctOptionKey;
  const isInvalid = !hasCorrectAnswer || !question.stem;
  
  return (
    <div className={`flex flex-col border rounded-xl p-4 bg-card ${isInvalid ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}>
      <div className="flex justify-between items-start gap-4 mb-2">
        <div className="flex gap-2">
          <span className="font-semibold text-primary">{index + 1}.</span>
          <p className="text-sm font-medium line-clamp-3 overflow-hidden text-ellipsis whitespace-pre-wrap">
            {question.stem || <span className="text-muted-foreground italic">Soal kosong</span>}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!hasCorrectAnswer && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium w-fit">
          <AlertTriangle className="h-3 w-3" />
          Belum menentukan jawaban benar
        </div>
      )}

      {question.options && question.options.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {question.options.map((opt) => (
            <div key={opt.key} className={`text-xs p-2 rounded border ${opt.key === question.correctOptionKey ? 'border-primary bg-primary/5 font-medium' : 'border-border bg-background'}`}>
              <span className="font-semibold mr-1">{opt.key}.</span> 
              <span className="line-clamp-2">{opt.text}</span>
            </div>
          ))}
        </div>
      )}

      {question.explanationText && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs font-semibold text-primary mb-1">Pembahasan:</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{question.explanationText}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/scheduled-ops/components/scheduled-question-card.tsx
git commit -m "feat(ui): add ScheduledQuestionCard component for grid preview"
```

---

### Task 2: Create Single Question Form Modal

**Files:**
- Create: `src/pages/scheduled-ops/components/scheduled-question-form-modal.tsx`

**Interfaces:**
- Consumes: Ekstraksi UI form soal dari `ScheduledQuestionDraggableList` lama.
- Produces: `<ScheduledQuestionFormModal />` yang menangani 1 soal lengkap (Stem, Gambar, Opsi, Pembahasan, Gambar Pembahasan).

- [ ] **Step 1: Create the modal component**

*(We will use the existing Dialog components and adapt the form fields from the old editor)*

```tsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "../../../components/ui/radio-group";
import { ScheduledEventQuestionDraftInput } from "../../../lib/api/scheduled-tryout-api";
import { emptyQuestion } from "../../../lib/scheduled-event-editor-draft";
import { ImageUploadField } from "../../../components/image-upload-field";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  question: ScheduledEventQuestionDraftInput | null;
  onSave: (question: ScheduledEventQuestionDraftInput) => void;
  eventId: string;
}

export function ScheduledQuestionFormModal({ isOpen, onClose, question, onSave, eventId }: Props) {
  const [formData, setFormData] = useState<ScheduledEventQuestionDraftInput>(emptyQuestion());

  useEffect(() => {
    if (question && isOpen) {
      setFormData(question);
    } else if (isOpen) {
      setFormData(emptyQuestion());
    }
  }, [question, isOpen]);

  const handleOptionChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: (prev.options || []).map(opt => opt.key === key ? { ...opt, text: value } : opt)
    }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{question ? "Edit Soal" : "Tambah Soal Baru"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="stem">Pertanyaan</Label>
            <Textarea 
              id="stem"
              value={formData.stem} 
              onChange={e => setFormData(prev => ({ ...prev, stem: e.target.value }))} 
              placeholder="Tulis pertanyaan di sini..."
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Gambar Pertanyaan (Opsional)</Label>
            <ImageUploadField
              bucketName="question_images"
              folderPath={`scheduled_events/${eventId}`}
              value={formData.questionImagePath || ""}
              onChange={val => setFormData(prev => ({ ...prev, questionImagePath: val }))}
            />
          </div>

          <div className="space-y-3">
            <Label>Pilihan Ganda & Kunci Jawaban</Label>
            <RadioGroup 
              value={formData.correctOptionKey || ""} 
              onValueChange={val => setFormData(prev => ({ ...prev, correctOptionKey: val }))}
            >
              <div className="grid gap-3">
                {formData.options?.map(opt => (
                  <div key={opt.key} className="flex items-center gap-3">
                    <RadioGroupItem value={opt.key} id={`opt-${opt.key}`} />
                    <Label htmlFor={`opt-${opt.key}`} className="font-bold">{opt.key}.</Label>
                    <Input 
                      value={opt.text} 
                      onChange={e => handleOptionChange(opt.key, e.target.value)}
                      placeholder={`Opsi ${opt.key}`}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="explanation">Pembahasan</Label>
            <Textarea 
              id="explanation"
              value={formData.explanationText || ""} 
              onChange={e => setFormData(prev => ({ ...prev, explanationText: e.target.value }))} 
              placeholder="Tulis pembahasan jawaban di sini..."
            />
          </div>

           <div className="space-y-2">
            <Label>Gambar Pembahasan (Opsional)</Label>
            <ImageUploadField
              bucketName="question_images"
              folderPath={`scheduled_events/${eventId}/explanations`}
              value={formData.explanationImagePath || ""}
              onChange={val => setFormData(prev => ({ ...prev, explanationImagePath: val }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave}>Simpan Soal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/scheduled-ops/components/scheduled-question-form-modal.tsx
git commit -m "feat(ui): add single question form modal"
```

---

### Task 3: Refactor ScheduledEventEditorPage to Grid Modal-Like View

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx`
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx` (sesuaikan test dengan layout grid baru, hapus/update interaksi Drag & Drop yang usang).
- Delete (if unused): `src/pages/scheduled-ops/components/scheduled-question-draggable-list.tsx` (setelah fungsi-fungsinya dipindahkan sepenuhnya ke modal).

**Interfaces:**
- Halaman ini akan di-*wrap* dengan `div` yang memenuhi layar dengan *backdrop* gelap (`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto`).
- Di dalamnya, buat kontainer `div` utama (warna putih/gelap bg-background) yang memuat Header "Daftar Soal Tryout", stat ringkasan, dan Grid `<ScheduledQuestionCard />`.
- Gunakan `useMutation` untuk menembak `updateScheduledEvent` setiap kali array soal berubah (tambah, edit, atau hapus).

- [ ] **Step 1: Rewrite ScheduledEventEditorPage**

Gantikan fungsi `ScheduledEventEditorPage` sehingga terlihat seperti *modal overlay* penuh dan menampilkan grid kartu soal. Render komponen `ScheduledQuestionFormModal` dan *trigger* API simpan secara langsung setelah dikonfirmasi.

- [ ] **Step 2: Connect the API saving flow**

```tsx
  const handleSaveQuestion = (editedQuestion: ScheduledEventQuestionDraftInput) => {
    let newQuestions = [...formState.questions];
    if (editingIndex !== null) {
      newQuestions[editingIndex] = editedQuestion;
    } else {
      newQuestions.push(editedQuestion);
    }
    
    // Update local state
    setFormState(prev => ({ ...prev, questions: newQuestions }));
    
    // Auto-save to backend immediately
    const input = buildInputFromFormState({ ...formState, questions: newQuestions }, editorQuery.data?.event);
    if (input) {
      updateMutation.mutate({ eventId: eventId!, input });
    }
    
    setEditingIndex(null);
    setIsModalOpen(false);
  };
```

- [ ] **Step 3: Commit and run tests**

```bash
git add .
git commit -m "refactor(ui): transform question manager into fullscreen grid layout with modal editor"
```

---
### Self-Review and Subagent Handoff

Plan sudah mencakup semua komponen dari refactor grid list, pembuatan modal editor individu, dan penyesuaian UX seperti *screenshot*.
