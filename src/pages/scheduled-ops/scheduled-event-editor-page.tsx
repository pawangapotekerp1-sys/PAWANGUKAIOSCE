import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Loader2 } from "lucide-react";

import { ScheduledQuestionCard } from "./components/scheduled-question-card";
import { ScheduledQuestionFormModal } from "./components/scheduled-question-form-modal";
import { Button } from "../../components/ui/button";
import { getScheduledEventEditorData, updateScheduledEvent, ScheduledEventQuestionDraftInput, ScheduledEventMutationInput } from "../../lib/api/scheduled-tryout-api";

export default function ScheduledEventEditorPage() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formState, setFormState] = useState<{ questions: ScheduledEventQuestionDraftInput[] }>({ questions: [] });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const editorQuery = useQuery({
    queryKey: ["scheduled-event-editor", eventId],
    enabled: !!eventId,
    queryFn: () => getScheduledEventEditorData({ eventId: eventId! }),
  });

  useEffect(() => {
    if (editorQuery.data) {
      const initialQuestions = editorQuery.data.questions.map(q => ({
        id: q.id,
        stem: q.stem,
        questionImagePath: q.questionImagePath,
        questionImageUrl: q.questionImageUrl,
        correctOptionKey: q.correctOptionKey || "",
        explanationText: q.explanationText || "",
        explanationImagePath: q.explanationImagePath,
        explanationImageUrl: q.explanationImageUrl,
        options: q.options.map(opt => ({ key: opt.key, text: opt.text })),
      }));
      setFormState({ questions: initialQuestions });
    }
  }, [editorQuery.data]);

  const buildInputFromFormState = (state: { questions: ScheduledEventQuestionDraftInput[] }, event: any): ScheduledEventMutationInput | null => {
    if (!event) return null;
    return {
      title: event.title,
      description: event.description,
      editorialStatus: event.editorialStatus,
      accessStartAt: event.accessStartAt,
      accessEndAt: event.accessEndAt,
      totalQuestions: event.questionCount || 100,
      durationMinutes: event.durationMinutes || 100,
      maxAttempts: event.maxAttempts || 1,
      questions: state.questions as ScheduledEventMutationInput["questions"]
    };
  };

  const updateMutation = useMutation({
    mutationFn: ({ eventId, input }: { eventId: string; input: ScheduledEventMutationInput }) => 
      updateScheduledEvent({ eventId, input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-event-editor", eventId] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-ops-events"] });
    }
  });

  const handleSaveQuestion = (editedQuestion: ScheduledEventQuestionDraftInput) => {
    const newQuestions = [...formState.questions];
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

  const handleDeleteQuestion = (index: number) => {
    if (!confirm("Yakin ingin menghapus soal ini?")) return;
    const newQuestions = formState.questions.filter((_, i) => i !== index);
    setFormState(prev => ({ ...prev, questions: newQuestions }));
    const input = buildInputFromFormState({ ...formState, questions: newQuestions }, editorQuery.data?.event);
    if (input) {
      updateMutation.mutate({ eventId: eventId!, input });
    }
  };

  const handleAddClick = () => {
    setEditingIndex(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (index: number) => {
    setEditingIndex(index);
    setIsModalOpen(true);
  };

  if (editorQuery.isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto flex justify-center p-4 sm:p-6 md:p-8">
      <div className="bg-background w-full max-w-5xl rounded-2xl shadow-xl flex flex-col my-auto max-h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background flex items-center justify-between border-b px-6 py-4 rounded-t-2xl shrink-0">
          <div>
            <h1 className="text-xl font-bold">Daftar Soal Tryout</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Total Soal: {formState.questions.length} / {editorQuery.data?.event.questionCount || 0}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {updateMutation.isPending && (
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Menyimpan...
              </span>
            )}
            <Button onClick={() => navigate("/scheduled-ops/events")} variant="outline" size="sm">
              Selesai
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/scheduled-ops/events")} className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto min-h-[300px]">
          {formState.questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-muted p-4 rounded-full mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">Belum ada soal</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                Mulai tambahkan soal untuk event tryout ini. Soal akan otomatis tersimpan.
              </p>
              <Button onClick={handleAddClick} className="mt-6">
                <Plus className="h-4 w-4 mr-2" /> Tambah Soal Pertama
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formState.questions.map((q, i) => (
                <ScheduledQuestionCard
                  key={q.id || `draft-${i}`}
                  question={q}
                  index={i}
                  onEdit={() => handleEditClick(i)}
                  onDelete={() => handleDeleteQuestion(i)}
                />
              ))}
              <div 
                onClick={handleAddClick}
                className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-primary transition-colors cursor-pointer min-h-[250px] p-6 text-center"
              >
                <Plus className="h-8 w-8 mb-2" />
                <span className="font-medium">Tambah Soal Baru</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <ScheduledQuestionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        question={editingIndex !== null ? formState.questions[editingIndex] : null}
        onSave={handleSaveQuestion}
        eventId={eventId!}
      />
    </div>
  );
}
