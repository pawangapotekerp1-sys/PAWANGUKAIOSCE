import { useState, useEffect, useRef } from "react";
import { StationConfig } from "../schemas/stationConfig";
import { getRawAiCredentialKey, getGlobalAiCredentialStatus } from "../../../lib/api/global-ai-credential-api";
import { saveOsceAttempt } from "../../../lib/api/osce-api";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";

interface OsceEvaluatorProps {
  config: StationConfig;
  payload: { transcript: any[]; formData: string };
  onClose: () => void;
}

export function OsceEvaluator({ config, payload, onClose }: OsceEvaluatorProps) {
  const [isEvaluating, setIsEvaluating] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const hasEvaluatedRef = useRef(false);

  useEffect(() => {
    if (hasEvaluatedRef.current) return;
    hasEvaluatedRef.current = true;
    async function evaluate() {
      try {
        const apiKey = await getRawAiCredentialKey();
        if (!apiKey) throw new Error("API Key Gemini tidak ditemukan.");

        const status = await getGlobalAiCredentialStatus();
        const targetModel = status.model || "gemini-3.6-flash";

        const systemPrompt = `Anda adalah penguji OSCE yang sangat objektif dan ketat.
Nilai performa kandidat HANYA berdasarkan bukti dari Transkrip dan Lembar Kerja.
Jangan berasumsi. Jika bukti tidak ada, berikan skor 0.

RUBRIK PENILAIAN:
${JSON.stringify(config.rubrics, null, 2)}

BUKTI KANDIDAT:
Transkrip (Komunikasi):
${payload.transcript.map(t => t.role + ': ' + t.text).join('\n')}

Lembar Kerja (Dokumen):
${payload.formData}

Berikan output JSON dengan format:
{
  "results": [
    { "competency": "Nama kompetensi", "score": 2, "reasoning": "Alasan objektif berdasarkan bukti" }
  ],
  "totalScore": 8,
  "maxScore": 12,
  "feedback": "Saran perbaikan..."
}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        
        const jsonText = data.candidates[0].content.parts[0].text;
        const parsedResult = JSON.parse(jsonText);
        setResult(parsedResult);

        await saveOsceAttempt({
          stationId: config.id,
          totalScore: parsedResult.totalScore,
          maxScore: parsedResult.maxScore,
          transcript: payload.transcript,
          formData: payload.formData,
          rubricResults: parsedResult.results,
          feedback: parsedResult.feedback
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsEvaluating(false);
      }
    }
    evaluate();
  }, [config, payload]);

  if (isEvaluating) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-600" />
        <p>AI sedang mengevaluasi performa Anda secara objektif berdasarkan rubrik...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-xl flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 shrink-0" />
        <div>
          <h3 className="font-bold">Gagal Mengevaluasi</h3>
          <p className="text-sm">{error}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-red-600 text-white rounded">Kembali</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
        <h2 className="text-2xl font-bold text-slate-800">Evaluasi Selesai</h2>
        <p className="text-slate-600">Skor Total: <span className="font-bold text-xl text-blue-600">{result?.totalScore}</span> / {result?.maxScore}</p>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg text-slate-800">Detail Rubrik</h3>
        {result?.results?.map((r: any, idx: number) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <span className="font-bold text-slate-700">{r.competency}</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-full text-sm">Skor: {r.score}</span>
            </div>
            <p className="text-sm text-slate-600">{r.reasoning}</p>
          </div>
        ))}
      </div>

      <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
        <h4 className="font-bold text-orange-800 mb-1">Feedback Keseluruhan</h4>
        <p className="text-sm text-orange-700">{result?.feedback}</p>
      </div>

      <button 
        onClick={onClose}
        className="w-full py-3 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition-colors"
      >
        Tutup & Kembali ke Menu Utama
      </button>
    </div>
  );
}
