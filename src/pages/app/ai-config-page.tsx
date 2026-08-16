import { useContext, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "../../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { AlertCircle, Key, Cpu, CheckCircle2, ShieldAlert } from "lucide-react";
import {
  deleteGlobalAiCredential,
  getGlobalAiCredentialStatus,
  saveGlobalAiCredential,
  testGlobalAiCredential,
} from "../../lib/api/global-ai-credential-api";
import { SessionContext } from "../../lib/auth/session-provider";
import ProductShell from "../../components/layout/product-shell";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";

export default function AiConfigPage() {
  const queryClient = useQueryClient();
  const sessionState = useContext(SessionContext);
  const storageUserId = sessionState?.user?.id?.trim() ?? "";
  
  const studentShell = useStudentShell("/app/settings/ai-config");

  const [apiKey, setApiKey] = useState("");
  const [credentialFeedback, setCredentialFeedback] = useState<string | null>(null);
  
  const statusQuery = useQuery({
    queryKey: ["global-ai-credential-status"],
    queryFn: () => getGlobalAiCredentialStatus(),
  });

  const saveCredentialMutation = useMutation({
    mutationFn: (input: { apiKey: string; model: string }) => saveGlobalAiCredential(input),
    onSuccess: (status, variables) => {
      queryClient.setQueryData(["global-ai-credential-status"], status);
      const trimmedApiKey = variables.apiKey.trim();
      setCredentialFeedback("API key Gemini berhasil disimpan ke Vault secara aman.");
      setApiKey(trimmedApiKey);
    },
    onError: (error) => {
      setCredentialFeedback(error instanceof Error ? error.message : "API key Gemini belum berhasil disimpan.");
    },
  });

  const testCredentialMutation = useMutation({
    mutationFn: () => testGlobalAiCredential(),
    onSuccess: ({ status, testResult }) => {
      queryClient.setQueryData(["global-ai-credential-status"], status);
      setCredentialFeedback(testResult.message);
    },
    onError: (error) => {
      setCredentialFeedback(error instanceof Error ? error.message : "Koneksi Gemini belum berhasil dicek.");
    },
  });

  const deleteCredentialMutation = useMutation({
    mutationFn: () => deleteGlobalAiCredential(),
    onSuccess: (status) => {
      queryClient.setQueryData(["global-ai-credential-status"], status);
      setApiKey("");
      setCredentialFeedback("API key Gemini berhasil dihapus dari sistem.");
    },
    onError: (error) => {
      setCredentialFeedback(error instanceof Error ? error.message : "API key Gemini belum berhasil dihapus.");
    },
  });

  const hasCredential = statusQuery.data?.hasCredential ?? false;
  const credentialMutationPending = saveCredentialMutation.isPending
    || testCredentialMutation.isPending
    || deleteCredentialMutation.isPending;

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <div className="flex flex-col gap-6 w-full py-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
              Konfigurasi Sistem
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-3 text-foreground">Pengaturan AI Global</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Kelola Kredensial AI Anda di sini. Sistem menggunakan Bring Your Own Key (BYOK) untuk fitur cerdas.
            </p>
          </div>
        </div>

        <div className="space-y-5 rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-foreground flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                Status Koneksi Gemini
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Kredensial disimpan secara terenkripsi menggunakan <strong>Supabase Vault</strong>.
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

          {!statusQuery.isLoading && statusQuery.data?.hasCredential === false ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Simpan dan tes API key Gemini sebelum Anda bisa menggunakan fitur-fitur AI.
            </div>
          ) : null}

          <div className="grid gap-4 rounded-xl border border-border/80 bg-background/50 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-3">
              <div className="grid gap-1.5 text-sm font-semibold text-foreground">
                <label htmlFor="gemini-api-key-input" className="flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-primary" />
                  API key Gemini
                </label>
                <input
                  id="gemini-api-key-input"
                  autoComplete="off"
                  className="h-11 rounded-xl border border-border/80 bg-background px-4 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={hasCredential ? "•••••••••••••••••••••••••••• (Tersimpan)" : "Masukkan API key Gemini"}
                  type="password"
                  value={apiKey}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Model bawaan (<code className="font-mono text-primary font-bold">gemini-3.7-flash</code>) sudah ditetapkan agar hasil tetap konsisten dan super cepat.
              </p>
              {statusQuery.data?.lastValidatedAt ? (
                <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                  Tervalidasi terakhir: {new Date(statusQuery.data.lastValidatedAt).toLocaleString("id-ID")}
                </p>
              ) : null}
              {statusQuery.data?.lastError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
                  {statusQuery.data.lastError}
                </div>
              ) : null}
              {credentialFeedback ? (
                <div className="rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-xs text-foreground font-medium">
                  {credentialFeedback}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-start gap-2.5 lg:flex-col lg:justify-center">
              <Button
                disabled={!apiKey.trim() || credentialMutationPending}
                loading={saveCredentialMutation.isPending}
                loadingLabel="Menyimpan..."
                onClick={() =>
                  saveCredentialMutation.mutate({
                    apiKey: apiKey.trim(),
                    model: "gemini-3.7-flash",
                  })}
                className="text-xs font-semibold h-9 px-4 w-full justify-center"
              >
                Simpan Kredensial
              </Button>
              <Button
                disabled={!hasCredential || credentialMutationPending}
                loading={testCredentialMutation.isPending}
                loadingLabel="Mengetes..."
                onClick={() => testCredentialMutation.mutate()}
                variant="outline"
                className="text-xs font-semibold h-9 px-4 w-full justify-center"
              >
                Tes Koneksi
              </Button>
              <Button
                disabled={!hasCredential || credentialMutationPending}
                loading={deleteCredentialMutation.isPending}
                loadingLabel="Menghapus..."
                onClick={() => deleteCredentialMutation.mutate()}
                variant="destructive"
                className="text-xs font-semibold h-9 px-4 w-full justify-center"
              >
                Hapus Kredensial
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ProductShell>
  );
}
