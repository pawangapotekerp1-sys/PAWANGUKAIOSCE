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
    console.error("Gagal login", await loginRes.text());
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

  if (!eventRes.ok) {
    console.error("Gagal get event", await eventRes.text());
    process.exit(1);
  }

  const events = await eventRes.json();
  console.log("Ditemukan:", events.length, "event.");
  if (events.length > 0) {
    console.log(JSON.stringify(events[0], null, 2));
  }
}

main().catch(console.error);
