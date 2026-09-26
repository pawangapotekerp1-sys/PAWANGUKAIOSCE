import fs from "fs/promises";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const email = "fahminaser18@gmail.com";
const password = "12345";
const EVENT_TITLE = "TRY OUT CBT CS PART 2";

async function main() {
  const loginRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "apikey": supabaseKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const token = (await loginRes.json()).access_token;

  const eventRes = await fetch(`${supabaseUrl}/rest/v1/scheduled_tryout_events?select=*&title=ilike.*${encodeURIComponent(EVENT_TITLE)}*`, {
    headers: { "apikey": supabaseKey, "Authorization": `Bearer ${token}` }
  });
  const event = (await eventRes.json())[0];
  
  const draftsRes = await fetch(`${supabaseUrl}/rest/v1/scheduled_event_question_drafts?scheduled_event_id=eq.${event.id}`, {
    headers: { "apikey": supabaseKey, "Authorization": `Bearer ${token}` }
  });
  const drafts = await draftsRes.json();
  
  console.log("Total drafts:", drafts.length);
  const withImages = drafts.filter(d => d.explanation_image_path);
  console.log("Drafts with images:", withImages.length);
  
  if (withImages.length > 0) {
      console.log("First draft with image:");
      console.log(withImages[0].stem.substring(0, 50));
      console.log(withImages[0].explanation_image_path);
  }
}

main().catch(console.error);
