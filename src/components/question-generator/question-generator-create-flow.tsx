import { useContext, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import Button from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";
import { AlertCircle, Key, Cpu, Zap, Plus, Sparkles, CheckCircle2, ShieldAlert } from "lucide-react";
import {
  generateQuestionBatch,
  type QuestionGeneratorReferenceInput,
} from "../../lib/api/question-generator-api";
import { getGlobalAiCredentialStatus } from "../../lib/api/global-ai-credential-api";
import ReferenceQuestionForm, { type ReferenceQuestionValue } from "./reference-question-form";

type QuestionGeneratorCreateFlowProps = {
  basePath: "/admin/question-generator" | "/app/question-generator";
};

const MAX_TARGET_QUESTION_COUNT = 20;

function createEmptyReference(): ReferenceQuestionValue {
  return {
    stem: "",
    options: {
      A: "",
      B: "",
      C: "",
      D: "",
      E: "",
    },
    correctOptionKey: "A",
    explanationText: "",
  };
}

function isReferenceComplete(reference: ReferenceQuestionValue) {
  return Boolean(
    reference.stem.trim()
      && reference.explanationText.trim()
      && reference.options.A.trim()
      && reference.options.B.trim()
      && reference.options.C.trim()
      && reference.options.D.trim()
      && reference.options.E.trim(),
  );
}

function splitQuestionCount(targetQuestionCount: number) {
  const baseCount = Math.floor(targetQuestionCount / 3);
  const remainder = targetQuestionCount % 3;

  return {
    newCaseSameConceptCount: baseCount + (remainder > 0 ? 1 : 0),
    differentTrapSameObjectiveCount: baseCount + (remainder > 1 ? 1 : 0),
    reverseReasoningCount: baseCount,
  };
}

function QuestionGeneratorCreateFlow({ basePath }: QuestionGeneratorCreateFlowProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [references, setReferences] = useState<ReferenceQuestionValue[]>([createEmptyReference()]);
  const [targetQuestionCount, setTargetQuestionCount] = useState(3);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const statusQuery = useQuery({
    queryKey: ["global-ai-credential-status"],
    queryFn: () => getGlobalAiCredentialStatus(),
  });
  const generateMutation = useMutation({
    mutationFn: (input: { references: QuestionGeneratorReferenceInput[]; targetQuestionCount: number }) =>
      generateQuestionBatch(input),
    onSuccess: (result) => {
      setSubmitError(null);
      navigate(`${basePath}/${result.batchId}`);
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : "Soal belum bisa dibuat.");
    },
  });

  function updateReference(index: number, nextValue: ReferenceQuestionValue) {
    setReferences((current) => current.map((reference, currentIndex) => currentIndex === index ? nextValue : reference));
  }

  // Removed useEffect for storageUserId

  function addReference() {
    setReferences((current) => current.length >= 3 ? current : [...current, createEmptyReference()]);
  }

  function removeReference(index: number) {
    setReferences((current) => current.length <= 1 ? current : current.filter((_, currentIndex) => currentIndex !== index));
  }

  function handleSubmit() {
    const completeReferences = references.filter(isReferenceComplete);

    if (!completeReferences.length) {
      setSubmitError("Lengkapi minimal satu referensi soal sebelum membuat soal.");
      return;
    }

    if (safeTargetQuestionCount > MAX_TARGET_QUESTION_COUNT) {
      setSubmitError(`Maksimal ${MAX_TARGET_QUESTION_COUNT} soal per proses agar hasil tetap stabil.`);
      return;
    }

    setSubmitError(null);
    generateMutation.mutate({
      references: completeReferences,
      targetQuestionCount: safeTargetQuestionCount,
    });
  }

  const safeTargetQuestionCount = Number.isFinite(targetQuestionCount) && targetQuestionCount > 0
    ? Math.max(1, Math.floor(targetQuestionCount))
    : 1;
  const {
    newCaseSameConceptCount,
    differentTrapSameObjectiveCount,
    reverseReasoningCount,
  } = splitQuestionCount(safeTargetQuestionCount);
  const hasCredential = statusQuery.data?.hasCredential ?? false;

  return (
    <div className="space-y-6">
      {/* Gemini Status Card */}
      <div className="space-y-5 rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              Status Koneksi Gemini
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Penyusun soal menggunakan <strong>Gemini AI</strong>. Hasilnya tetap mengikuti referensi yang Anda masukkan.
            </p>
          </div>
          {statusQuery.isLoading ? (
            <Badge variant="secondary" className="px-3.5 py-1.5 text-xs font-semibold">
              Memeriksa koneksi...
            </Badge>
          ) : (
            <Badge 
              variant={statusQuery.data?.hasCredential ? "outline" : "secondary"}
              className={`px-3.5 py-1.5 text-xs font-bold ${
                statusQuery.data?.hasCredential 
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" 
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 inline-block" />
              {statusQuery.data?.hasCredential ? "Koneksi Gemini Aktif" : "Koneksi Gemini Belum Aktif"}
            </Badge>
          )}
        </div>

        {statusQuery.isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Status koneksi belum tersedia</AlertTitle>
            <AlertDescription>Status koneksi Gemini belum bisa dimuat. Muat ulang lalu coba lagi.</AlertDescription>
          </Alert>
        ) : null}

        {!statusQuery.isLoading && !hasCredential ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              Kredensial AI Belum Diatur
            </div>
            <p className="text-sm text-amber-800/80 dark:text-amber-300/80">
              Anda membutuhkan kunci API Gemini untuk dapat membuat soal. 
              Sistem menggunakan skema Bring Your Own Key (BYOK) secara global.
            </p>
            <button
              onClick={() => navigate("/app/settings/ai-config")}
              className="mt-2 w-fit px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Atur Kredensial AI Sekarang
            </button>
          </div>
        ) : null}
      </div>

      {/* References Section */}
      <div className="space-y-5 rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Referensi Soal Acuan
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Masukkan 1-3 soal acuan lengkap agar topik dan tingkat kesulitannya tetap sejalan.
            </p>
          </div>
          {references.length < 3 ? (
            <Button
              onClick={addReference}
              size="sm"
              variant="outline"
              className="text-xs font-semibold"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Tambah referensi
            </Button>
          ) : null}
        </div>

        <div className="space-y-4">
          {references.map((reference, index) => (
            <ReferenceQuestionForm
              key={`reference-${index}`}
              index={index}
              onChange={(nextValue) => updateReference(index, nextValue)}
              onRemove={references.length > 1 ? () => removeReference(index) : undefined}
              value={reference}
            />
          ))}
        </div>
      </div>

      {/* Question Count & Submit */}
      <div className="space-y-5 rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] items-start">
          <div className="grid gap-2 text-sm font-semibold text-foreground">
            <label htmlFor="target-question-count-input">
              Jumlah soal yang ingin dibuat
            </label>
            <input
              id="target-question-count-input"
              className="h-11 rounded-xl border border-border/80 bg-background px-4 text-sm font-bold text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              max={MAX_TARGET_QUESTION_COUNT}
              min={1}
              onChange={(event) => setTargetQuestionCount(Number(event.target.value))}
              type="number"
              value={targetQuestionCount}
            />
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground space-y-1 font-medium">
            <p className="text-foreground font-semibold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Rincian Variasi Soal:
            </p>
            <p>
              Proses ini akan membuat {newCaseSameConceptCount} kasus baru, {differentTrapSameObjectiveCount}
              {" "}
              variasi jebakan, dan {reverseReasoningCount} variasi penalaran.
            </p>
            <p className="text-muted-foreground/80">Maksimal {MAX_TARGET_QUESTION_COUNT} soal per proses agar hasil tetap konsisten.</p>
          </div>
        </div>

        {submitError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-semibold text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {submitError}
          </div>
        ) : null}

        <Button
          disabled={!hasCredential || generateMutation.isPending}
          loading={generateMutation.isPending}
          loadingLabel="Membuat soal..."
          onClick={handleSubmit}
          className="w-full sm:w-auto h-11 px-8 text-sm font-bold shadow-md shadow-primary/20"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Buat Soal Sekarang
        </Button>
      </div>
    </div>
  );
}

export default QuestionGeneratorCreateFlow;
