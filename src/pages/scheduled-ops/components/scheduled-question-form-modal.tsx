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
      const base = emptyQuestion();
      setFormData({
        ...base,
        ...question,
        options: question.options && question.options.length > 0 ? question.options : base.options,
      });
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
      <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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
          <Button variant="outline" type="button" onClick={onClose}>Batal</Button>
          <Button type="button" onClick={handleSave}>Simpan Soal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
