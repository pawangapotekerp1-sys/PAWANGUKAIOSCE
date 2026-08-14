import { getSupabaseBrowserClient } from "../supabase/browser-client";

/** Typed transcript entry from OSCE simulation */
export interface OsceTranscriptEntry {
  role: string;
  text: string;
  timestamp?: string;
}

/** Typed rubric result from AI evaluation */
export interface OsceRubricResult {
  competency: string;
  score: number;
  reasoning: string;
}

export async function saveOsceAttempt(payload: {
  stationId: string;
  totalScore: number;
  maxScore: number;
  transcript: OsceTranscriptEntry[];
  formData: string;
  rubricResults: OsceRubricResult[];
  feedback: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase.from('osce_attempts').insert({
    station_id: payload.stationId,
    user_id: user.id,
    total_score: payload.totalScore,
    max_score: payload.maxScore,
    transcript: payload.transcript,
    form_data: payload.formData,
    rubric_results: payload.rubricResults,
    feedback: payload.feedback
  }).select('*').single();

  if (error) throw error;
  return data;
}

export async function deleteOsceStation(stationId: string) {
  const supabase = getSupabaseBrowserClient();
  
  const { error } = await supabase.from('osce_stations')
    .delete()
    .eq('id', stationId);

  if (error) throw error;
  return true;
}

export async function listOsceStations() {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase.from('osce_stations')
    .select('id, title, type, duration_minutes, objective')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getOsceAttemptDetail(attemptId: string) {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase.from('osce_attempts')
    .select(`
      *,
      station:osce_stations (*)
    `)
    .eq('id', attemptId)
    .single();

  if (error) throw error;
  return data;
}

export async function listOsceAttemptHistory() {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");
  
  const { data, error } = await supabase.from('osce_attempts')
    .select(`
      id,
      created_at,
      total_score,
      max_score,
      station:osce_stations ( title )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
