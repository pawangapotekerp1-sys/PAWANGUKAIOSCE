import { useEffect, useState } from "react";
import { ModularWorkspace } from "../../features/osce/components/ModularWorkspace";
import { OsceEvaluator } from "../../features/osce/components/OsceEvaluator";
import type { StationConfig } from "../../features/osce/schemas/stationConfig";
import ProductShell from "../../components/layout/product-shell";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser-client";

export default function OsceDemoPage() {
  const [stations, setStations] = useState<StationConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<StationConfig | null>(null);
  const [evalPayload, setEvalPayload] = useState<{ transcript: any[], formData: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const studentShell = useStudentShell("/app/osce-demo");

  useEffect(() => {
    async function loadStations() {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('osce_stations')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        const mappedStations: StationConfig[] = data.map((row: any) => ({
          id: row.id,
          title: row.title,
          type: row.type as any,
          durationMinutes: row.duration_minutes,
          objective: row.objective,
          competence: row.competence,
          practiceArea: row.practice_area,
          instructions: row.instructions,
          reference: row.reference,
          actorInstructions: row.actor_instructions,
          rubrics: row.rubrics,
          worksheetTemplate: row.worksheet_template,
          attachments: []
        }));
        
        setStations(mappedStations);
      }
      setIsLoading(false);
    }
    loadStations();
  }, []);

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
      disablePadding
    >
      <div className="flex flex-col w-full h-[calc(100vh-4rem)] p-6 overflow-y-auto">
        {!activeConfig ? (
          // SCREEN 1: SELECTION LIST
          <div className="w-full space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Area Belajar OSCE</h1>
              <p className="text-slate-500">Pilih skenario stase untuk mulai berlatih.</p>
            </div>
            
            {isLoading ? (
              <div className="text-slate-500">Memuat daftar stase...</div>
            ) : stations.length === 0 ? (
              <div className="p-8 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500">
                Belum ada stase yang dibuat. Silakan buat stase terlebih dahulu melalui menu Builder.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stations.map(station => (
                  <div key={station.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                    <div>
                      <div className="text-xs font-semibold text-blue-600 mb-1 uppercase tracking-wider">{station.type}</div>
                      <h3 className="text-lg font-bold text-slate-800 line-clamp-2">{station.title}</h3>
                    </div>
                    <div className="text-sm text-slate-600 flex-grow">
                      <span className="font-semibold">Durasi:</span> {station.durationMinutes} Menit
                    </div>
                    <button 
                      onClick={() => setActiveConfig(station)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors mt-auto cursor-pointer"
                    >
                      Pilih Stase
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : evalPayload ? (
          // SCREEN 3: EVALUATION RESULT
          <div className="flex flex-col h-full w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 overflow-y-auto">
            <OsceEvaluator 
              config={activeConfig} 
              payload={evalPayload} 
              onClose={() => { setActiveConfig(null); setEvalPayload(null); }} 
            />
          </div>
        ) : (
          // SCREEN 2: SIMULATION WORKSPACE
          <div className="flex flex-col h-full w-full">
            <div className="flex items-center gap-4 mb-4">
              <button 
                onClick={() => setActiveConfig(null)}
                className="text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
              >
                &larr; Kembali ke Daftar Stase
              </button>
              <h2 className="text-xl font-bold text-slate-800 border-l border-slate-300 pl-4">{activeConfig.title}</h2>
            </div>
            <div className="flex-grow bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <ModularWorkspace 
                config={activeConfig} 
                onExit={(payload) => {
                  setEvalPayload(payload);
                }} 
              />
            </div>
          </div>
        )}
      </div>
    </ProductShell>
  );
}
