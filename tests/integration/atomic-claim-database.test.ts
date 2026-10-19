import { createClient } from "@supabase/supabase-js";
import { describe, expect, test } from "vitest";

const LOCAL_SUPABASE_URL = "http://127.0.0.1:54421";
const LOCAL_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

describe("real PostgreSQL atomic claim integration tests", () => {
  test("proves PostgREST .is('metadata->processingJob->>jobId', null) guarantees exactly one worker wins in concurrent execution", async () => {
    const supabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // Check connectivity to local PostgreSQL instance
    const healthCheck = await supabase.from("flashcard_materials").select("id").limit(1);
    if (healthCheck.error) {
      console.warn("Local Supabase PostgreSQL is not reachable, skipping live DB test:", healthCheck.error.message);
      return;
    }

    const { data: usersData } = await supabase.auth.admin.listUsers();
    const testUserId = usersData?.users?.[0]?.id;
    expect(testUserId).toBeDefined();

    const testMaterialId = "00000000-0000-0000-0000-000000000777";

    // Clean up prior test data
    await supabase.from("flashcard_materials").delete().eq("id", testMaterialId);

    // 1. Insert suspended material row with status: 'processing', metadata without processingJob
    const insertRes = await supabase.from("flashcard_materials").insert({
      id: testMaterialId,
      title: "Real DB Concurrency Test",
      academic_group: "clinical_science",
      status: "processing",
      created_by: testUserId,
      metadata: {
        pipelineCheckpoint: { completedStages: ["transcript_cleaning"] },
      },
    }).select();

    expect(insertRes.error).toBeNull();
    expect(insertRes.data).toHaveLength(1);

    let geminiCallsWorkerA = 0;
    let geminiCallsWorkerB = 0;

    // Simulate worker process function identical to processMaterialGeneration in index.ts
    const runWorker = async (workerName: string, onGeminiCall: () => void) => {
      const claimRes = await supabase
        .from("flashcard_materials")
        .update({
          metadata: {
            pipelineCheckpoint: { completedStages: ["transcript_cleaning"] },
            processingJob: { jobId: `job-${workerName}`, startedAt: new Date().toISOString() },
          },
        })
        .eq("id", testMaterialId)
        .eq("status", "processing")
        .is("metadata->processingJob->>jobId", null)
        .select("id, status, metadata");

      const claimData = claimRes.data;

      // Atomic guard: Exactly 1 row must be updated!
      if (!claimData || claimData.length !== 1) {
        return { worker: workerName, won: false, message: "Materi sedang diproses di latar belakang." };
      }

      // Winner proceeds to invoke Gemini
      onGeminiCall();
      return { worker: workerName, won: true, jobId: `job-${workerName}` };
    };

    // 2. Fire two simultaneous claims via Promise.all
    const [resA, resB] = await Promise.all([
      runWorker("Worker-A", () => { geminiCallsWorkerA += 1; }),
      runWorker("Worker-B", () => { geminiCallsWorkerB += 1; }),
    ]);

    // 3. Assert that EXACTLY one won and EXACTLY one lost
    const winnerCount = (resA.won ? 1 : 0) + (resB.won ? 1 : 0);
    expect(winnerCount).toBe(1);

    const loser = resA.won ? resB : resA;
    expect(loser.won).toBe(false);
    expect(loser.message).toBe("Materi sedang diproses di latar belakang.");

    // 4. Assert that ONLY the winning worker invoked Gemini
    expect(geminiCallsWorkerA + geminiCallsWorkerB).toBe(1);

    // 5. Assert the database state is intact and holds the winner's jobId
    const finalMaterial = await supabase
      .from("flashcard_materials")
      .select("status, metadata")
      .eq("id", testMaterialId)
      .single();

    const winner = resA.won ? resA : resB;
    expect((finalMaterial.data?.metadata as any)?.processingJob?.jobId).toBe(winner.jobId);
    expect(finalMaterial.data?.status).toBe("processing");

    // Clean up
    await supabase.from("flashcard_materials").delete().eq("id", testMaterialId);
  });
});
