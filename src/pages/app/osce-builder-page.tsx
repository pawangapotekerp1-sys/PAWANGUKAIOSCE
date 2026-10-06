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
            competence: data.competence,
            practiceArea: data.practice_area,
            instructions: data.instructions,
            reference: data.reference,
            actorInstructions: data.actor_instructions,
            rubrics: data.rubrics || [],
            worksheetTemplate: data.worksheet_template,
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

  const handleGenerate = async (prompt?: string, file?: File, scenarioType?: string) => {
    setIsGenerating(true);
    
    try {
      const supabase = getSupabaseBrowserClient();
      
      let body: Record<string, unknown> = { 
        prompt, 
        mode: prompt ? "prompt" : "file",
        scenarioType 
      };
      
      if (file) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // get base64 part
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
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
        competence: savedConfig.competence,
        practice_area: savedConfig.practiceArea,
        instructions: savedConfig.instructions,
        reference: savedConfig.reference,
        actor_instructions: savedConfig.actorInstructions,
        rubrics: savedConfig.rubrics,
        worksheet_template: savedConfig.worksheetTemplate,
      };

      if (stationId) {
        const { error } = await supabase.from('osce_stations').update(payload).eq('id', stationId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('osce_stations').insert({
          id: savedConfig.id,
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
      disablePadding
    >
      <div className="flex flex-col gap-6 w-full h-full p-4 md:p-6 lg:p-8">

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
