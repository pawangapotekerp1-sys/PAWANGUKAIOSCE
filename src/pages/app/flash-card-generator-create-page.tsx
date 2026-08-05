import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import FlashCardMaterialForm from "../../components/flash-cards/flash-card-material-form";
import ProductShell from "../../components/layout/product-shell";
import Button from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import {
  createFlashCardMaterialDraft,
  deleteFlashCardGeneratorCredential,
  getFlashCardGeneratorStatus,
  processFlashCardMaterial,
  saveFlashCardGeneratorCredential,
  testFlashCardGeneratorCredential,
} from "../../lib/api/flash-card-api";
import { useSession } from "../../lib/auth/use-session";
import {
  clearFlashCardGeneratorApiKey,
  readFlashCardGeneratorApiKey,
  writeFlashCardGeneratorApiKey,
} from "../../lib/flash-card-generator-byok-storage";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";

function FlashCardGeneratorCreatePage() {
  const studentShell = useStudentShell("/app/flash-card-generator/new");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useSession();
  const storageUserId = user?.id?.trim() ?? "";
  const [apiKey, setApiKey] = useState(() => storageUserId ? readFlashCardGeneratorApiKey(storageUserId) : "");
  const [hasLocalStoredKey, setHasLocalStoredKey] = useState(() =>
    Boolean(storageUserId && readFlashCardGeneratorApiKey(storageUserId)),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [credentialFeedback, setCredentialFeedback] = useState<string | null>(null);
  const statusQuery = useQuery({
    queryKey: ["flash-card-generator-status"],
    queryFn: () => getFlashCardGeneratorStatus(),
  });
  const saveCredentialMutation = useMutation({
    mutationFn: (input: { apiKey: string; model: string }) => saveFlashCardGeneratorCredential(input),
    onSuccess: (status, variables) => {
      queryClient.setQueryData(["flash-card-generator-status"], status);
      const trimmedApiKey = variables.apiKey.trim();

      if (storageUserId) {
        writeFlashCardGeneratorApiKey(storageUserId, trimmedApiKey);
        setHasLocalStoredKey(true);
      }

      setCredentialFeedback("API key Gemini berhasil disimpan.");
      setApiKey(trimmedApiKey);
    },
    onError: (error) => {
      setCredentialFeedback(error instanceof Error ? error.message : "API key Gemini belum berhasil disimpan.");
    },
  });
  const testCredentialMutation = useMutation({
    mutationFn: () => testFlashCardGeneratorCredential(),
    onSuccess: ({ status, testResult }) => {
      queryClient.setQueryData(["flash-card-generator-status"], status);
      setCredentialFeedback(testResult.message);
    },
    onError: (error) => {
      setCredentialFeedback(error instanceof Error ? error.message : "Koneksi Gemini belum berhasil dicek.");
    },
  });
  const deleteCredentialMutation = useMutation({
    mutationFn: () => deleteFlashCardGeneratorCredential(),
    onSuccess: (status) => {
      queryClient.setQueryData(["flash-card-generator-status"], status);
      if (storageUserId) {
        clearFlashCardGeneratorApiKey(storageUserId);
      }
      setHasLocalStoredKey(false);
      setApiKey("");
      setCredentialFeedback("API key Gemini berhasil dihapus.");
    },
    onError: (error) => {
      setCredentialFeedback(error instanceof Error ? error.message : "API key Gemini belum berhasil dihapus.");
    },
  });

  useEffect(() => {
    if (!storageUserId) {
      setApiKey("");
      setHasLocalStoredKey(false);
      return;
    }

    const restoredApiKey = readFlashCardGeneratorApiKey(storageUserId);
    setApiKey(restoredApiKey);
    setHasLocalStoredKey(Boolean(restoredApiKey));
  }, [storageUserId]);

  async function handleSubmit(input: {
    title: string;
    academicGroup: string;
    transcriptFile: File;
    slidePdfFile: File;
  }) {
    if (!user?.id) {
      throw new Error("Mentor harus login untuk membuat materi flash card.");
    }

    if (!hasCredential) {
      setSubmissionError("Simpan dan tes API key Gemini sebelum memproses materi.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const createdDraft = await createFlashCardMaterialDraft({
        ownerId: user.id,
        title: input.title,
        academicGroup: input.academicGroup,
        transcriptFile: input.transcriptFile,
        slidePdfFile: input.slidePdfFile,
      });

      await processFlashCardMaterial({
        materialId: createdDraft.materialId,
      });
      navigate(`/app/flash-card-generator/${createdDraft.materialId}`);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Materi flash card belum bisa dibuat.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasCredential = statusQuery.data?.hasCredential ?? false;
  const credentialMutationPending = saveCredentialMutation.isPending
    || testCredentialMutation.isPending
    || deleteCredentialMutation.isPending;
  const isSubmitDisabled = isSubmitting || statusQuery.isLoading || credentialMutationPending || !hasCredential;

  return (
    <ProductShell
      brand={productShellMeta.brand}
      navItems={studentShell.navItems}
      tierLabel={studentShell.tierLabel}
    >
      <Card className="space-y-4 px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Status koneksi Gemini</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Penyusun flash card menggunakan <strong>Gemini</strong>. Simpan API key sebelum materi diproses.
            </p>
          </div>
          {statusQuery.isLoading ? (
            <span className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-foreground">
              Memeriksa koneksi...
            </span>
          ) : (
            <span className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-foreground">
              {hasCredential ? "Koneksi Gemini aktif" : "Koneksi Gemini belum aktif"}
            </span>
          )}
        </div>

        {statusQuery.isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Status koneksi belum tersedia</AlertTitle>
            <AlertDescription>Status koneksi Gemini belum bisa dimuat. Muat ulang lalu coba lagi.</AlertDescription>
          </Alert>
        ) : null}

        {!statusQuery.isLoading && statusQuery.data?.hasCredential === false ? (
          <div className="rounded-[1.2rem] border border-destructive/20 bg-destructive/10 px-4 py-4 text-sm leading-7 text-foreground">
            Simpan dan tes API key Gemini sebelum memproses materi.
          </div>
        ) : null}

        {hasLocalStoredKey && !statusQuery.isLoading && statusQuery.data?.hasCredential === false ? (
          <div className="rounded-[1.2rem] border border-border bg-muted px-4 py-4 text-sm leading-7 text-foreground">
            API key ini sudah tersimpan di perangkat, tetapi belum tersambung ke akun Anda. Klik Simpan untuk menyinkronkan.
          </div>
        ) : null}

        <div className="grid gap-4 rounded-[1.2rem] border border-border bg-white/72 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-3">
            <label className="grid gap-2 text-sm font-medium text-muted-foreground">
              API key Gemini
              <input
                autoComplete="off"
                className="min-h-11 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Masukkan API key Gemini"
                type="password"
                value={apiKey}
              />
            </label>
            <p className="text-sm leading-7 text-muted-foreground">
              Model bawaan sudah ditetapkan agar hasil flash card tetap stabil.
            </p>
            {statusQuery.data?.lastValidatedAt ? (
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Tervalidasi terakhir: {new Date(statusQuery.data.lastValidatedAt).toLocaleString("id-ID")}
              </p>
            ) : null}
            {statusQuery.data?.lastError ? (
              <div className="rounded-[1rem] border border-destructive/20 bg-destructive/10 px-3 py-3 text-sm text-foreground">
                {statusQuery.data.lastError}
              </div>
            ) : null}
            {credentialFeedback ? (
              <div className="rounded-[1rem] border border-border bg-muted px-3 py-3 text-sm text-foreground">
                {credentialFeedback}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-start gap-3 lg:flex-col">
            <Button
              disabled={!apiKey.trim() || credentialMutationPending}
              loading={saveCredentialMutation.isPending}
              loadingLabel="Menyimpan..."
              onClick={() =>
                saveCredentialMutation.mutate({
                  apiKey: apiKey.trim(),
                  model: "gemini-2.5-flash",
                })}
              type="button"
              variant="primary"
            >
              Simpan API key
            </Button>
            <Button
              disabled={!hasCredential || credentialMutationPending}
              loading={testCredentialMutation.isPending}
              loadingLabel="Mengetes..."
              onClick={() => testCredentialMutation.mutate()}
              type="button"
              variant="outline"
            >
              Tes koneksi
            </Button>
            <Button
              disabled={!hasCredential || credentialMutationPending}
              loading={deleteCredentialMutation.isPending}
              loadingLabel="Menghapus..."
              onClick={() => deleteCredentialMutation.mutate()}
              type="button"
              variant="destructive"
            >
              Hapus API key
            </Button>
          </div>
        </div>
      </Card>

      <Card className="space-y-3 px-5 py-5">
        <h1 className="text-3xl font-semibold leading-tight text-foreground">Buat materi flash card</h1>
        <p className="text-sm leading-7 text-muted-foreground">
          Materi baru tampil ke siswa setelah ditinjau dan diterbitkan.
        </p>
        {submissionError ? <p className="text-sm leading-7 text-destructive">{submissionError}</p> : null}
        <FlashCardMaterialForm isSubmitDisabled={isSubmitDisabled} isSubmitting={isSubmitting} onSubmit={handleSubmit} />
      </Card>
    </ProductShell>
  );
}

export default FlashCardGeneratorCreatePage;
