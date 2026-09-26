import path from "path";
import { fileURLToPath } from "url";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const email = "fahminaser18@gmail.com";
const password = "12345";

async function main() {
  const loginRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "apikey": supabaseKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password })
  });

  if (!loginRes.ok) {
    console.error("Gagal login");
    process.exit(1);
  }

  const authData = await loginRes.json();
  const token = authData.access_token;

  console.log("Mencari event TRY OUT CBT CS PART 1...");
  const eventRes = await fetch(`${supabaseUrl}/rest/v1/scheduled_tryout_events?select=*&title=ilike.*TRY OUT CBT CS PART 1*`, {
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${token}`
    }
  });
  
  const events = await eventRes.json();
  if (!events || events.length === 0) {
     console.error("Event tidak ditemukan!");
     process.exit(1);
  }
  const event = events[0];
  
  console.log(`Menghapus semua soal di event ${event.id}...`);
  
  // Prepare payload with empty questions
  const payload = {
    title: event.title,
    description: event.description || "",
    editorialStatus: event.editorial_status,
    accessStartAt: event.access_start_at,
    accessEndAt: event.access_end_at,
    questions: []
  };
  
  const upsertRes = await fetch(`${supabaseUrl}/rest/v1/rpc/upsert_scheduled_tryout_event`, {
    method: "POST",
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target_event_id: event.id,
      payload
    })
  });
  
  if (!upsertRes.ok) {
    console.error("Gagal clear event:", await upsertRes.text());
    process.exit(1);
  }
  
  console.log("Sukses! Semua soal di event tersebut telah dihapus (dikosongkan).");
}

main().catch(console.error);
