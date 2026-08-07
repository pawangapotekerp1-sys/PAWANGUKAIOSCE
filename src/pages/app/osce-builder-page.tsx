import { useState } from "react";
import { useNavigate } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { StationBuilderForm } from "../../features/osce/components/StationBuilderForm";
import { StationManualEditor } from "../../features/osce/components/StationManualEditor";
import type { StationConfig } from "../../features/osce/schemas/stationConfig";
import { Settings2, ArrowLeft } from "lucide-react";

export default function OsceBuilderPage() {
  const navigate = useNavigate();
  const studentShell = useStudentShell("/app/area-mentor");

  const [mode, setMode] = useState<"build" | "edit">("build");
  const [isGenerating, setIsGenerating] = useState(false);
  const [config, setConfig] = useState<StationConfig | null>(null);

  const handleGenerate = (prompt?: string, file?: File) => {
    setIsGenerating(true);
    setTimeout(() => {
      const generatedTitle = prompt
        ? `Stase OSCE: ${prompt}`
        : file
        ? `Stase OSCE dari ${file.name}`
        : "Stase OSCE Baru";

      const mockConfig: StationConfig = {
        id: `stase-${Date.now()}`,
        title: generatedTitle,
        type: "komunikasi",
        durationMinutes: 10,
        instructions: prompt
          ? `Instruksi berdasarkan prompt: ${prompt}`
          : file
          ? `Instruksi diekstrak dari file: ${file.name}`
          : "Lakukan konseling dan edukasi pada pasien.",
        aiPersona: {
          role: "patient",
          prompt: prompt
            ? `Persona AI: ${prompt}`
            : "Anda adalah pasien yang membutuhkan pelayanan konsultasi farmasi.",
        },
        attachments: [],
      };

      setConfig(mockConfig);
      setIsGenerating(false);
      setMode("edit");
    }, 2000);
  };

  const handleSave = (_savedConfig: StationConfig) => {
    window.alert("Konfigurasi OSCE berhasil disimpan!");
    navigate("/app/area-mentor");
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
                onClick={() => navigate("/app/area-mentor")}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} /> Kembali ke Area Mentor
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

        {/* Dynamic Content */}
        {mode === "build" ? (
          <StationBuilderForm onGenerate={handleGenerate} isGenerating={isGenerating} />
        ) : (
          config && <StationManualEditor initialConfig={config} onSave={handleSave} />
        )}
      </div>
    </ProductShell>
  );
}
