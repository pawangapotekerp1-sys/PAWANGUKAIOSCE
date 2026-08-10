import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { StationBuilderForm } from "../../features/osce/components/StationBuilderForm";
import { StationManualEditor } from "../../features/osce/components/StationManualEditor";
import { StationConfig } from "../../features/osce/schemas/stationConfig";
import { Settings2, ArrowLeft, ShieldAlert } from "lucide-react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser-client";
import { useQuery } from "@tanstack/react-query";
import { getGlobalAiCredentialStatus } from "../../lib/api/global-ai-credential-api";

export default function OsceBuilderPage() {
  const navigate = useNavigate();
  const studentShell = useStudentShell("/app/area-mentor");

  const [searchParams] = useSearchParams();
  const stationId = searchParams.get("id");

  const [mode, setMode] = useState<"build" | "edit">("build");
  const [isGenerating, setIsGenerating] = useState(false);
  const [config, setConfig] = useState<StationConfig | null>(null);

  useEffect(() => {
    if (stationId) {
      const fetchStation = async () => {
        try {
          const supabase = getSupabaseBrowserClient();
          const { data, error } = await supabase
            .from('osce_stations')
            .select('*')
            .eq('id', stationId)
            .single();

          if (error) throw error;
          
          setConfig({
            id: data.id,
            title: data.title,
            type: data.type,
            durationMinutes: data.duration_minutes,
            objective: data.objective,
            instructions: data.instructions,
            actorInstructions: data.actor_instructions,
            rubrics: data.rubrics || [],
            attachments: [],
          });
          setMode("edit");
        } catch (err: any) {
          console.error(err);
          toast.error("Gagal memuat stase OSCE: " + err.message);
        }
      };
      fetchStation();
    }
  }, [stationId]);

  const statusQuery = useQuery({
    queryKey: ["global-ai-credential-status"],
    queryFn: () => getGlobalAiCredentialStatus(),
  });
  
  const hasCredential = statusQuery.data?.hasCredential ?? false;

  const handleGenerate = async (prompt?: string, file?: File) => {
    setIsGenerating(true);
    
    try {
      const supabase = getSupabaseBrowserClient();
      
      let body: Record<string, unknown> = { prompt, mode: prompt ? "prompt" : "file" };
      
      if (file) {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        body = { ...body, fileName: file.name, fileBase64: base64, fileType: file.type };
      }
      
      const { data, error } = await supabase.functions.invoke("generate-osce", {
        body
      });

      if (error) {
        throw new Error(error.message || "Gagal menghubungi AI");
      }
      
      setConfig(data);
      setMode("edit");
    } catch (err: any) {
      console.error(err);
      toast.error("Terjadi kesalahan saat memproses skenario dengan AI: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (savedConfig: StationConfig) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        title: savedConfig.title,
        type: savedConfig.type,
        duration_minutes: savedConfig.durationMinutes,
        objective: savedConfig.objective,
        instructions: savedConfig.instructions,
        actor_instructions: savedConfig.actorInstructions,
        rubrics: savedConfig.rubrics,
      };

      if (stationId || savedConfig.id) {
        const idToUpdate = stationId || savedConfig.id;
        const { error } = await supabase.from('osce_stations').update(payload).eq('id', idToUpdate);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('osce_stations').insert({
          ...payload,
          created_by: user?.id
        });
        if (error) throw error;
      }

      toast.success("Konfigurasi OSCE berhasil disimpan!");
      navigate("/app/mentor/osce");
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal menyimpan konfigurasi: " + err.message);
    }
  };

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <div className="flex flex-col gap-6 w-full py-4 max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/app/mentor/osce")}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} /> Kembali ke Daftar Stase
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                  Pengatur OSCE (Station Builder)
                </h1>
                <p className="text-sm text-muted-foreground">
                  Buat dan sesuaikan stase OSCE dengan bantuan AI atau unggah dokumen skenario.
                </p>
              </div>
            </div>
          </div>

          {mode === "edit" && (
            <button
              type="button"
              onClick={() => setMode("build")}
              className="self-start md:self-auto px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              + Buat Ulang Skenario
            </button>
          )}
        </div>

        {/* API Key Settings (BYOK) Alert */}
        {mode === "build" && !statusQuery.isLoading && !hasCredential && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              Kredensial AI Belum Diatur
            </div>
            <p className="text-sm text-amber-800/80 dark:text-amber-300/80">
              Anda membutuhkan kunci API Gemini untuk dapat membuat skenario OSCE. 
              Sistem menggunakan skema Bring Your Own Key (BYOK) secara global.
            </p>
            <button
              onClick={() => navigate("/app/settings/ai-config")}
              className="mt-2 w-fit px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Atur Kredensial AI Sekarang
            </button>
          </div>
        )}

        {/* Dynamic Content */}
        {mode === "build" ? (
          <div className={!hasCredential ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
            <StationBuilderForm onGenerate={handleGenerate} isGenerating={isGenerating} />
          </div>
        ) : (
          config && <StationManualEditor initialConfig={config} onSave={handleSave} />
        )}
      </div>
    </ProductShell>
  );
}
