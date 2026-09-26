import path from "path";
import { fileURLToPath } from "url";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function testLogin() {
  const email = "fahminaser18@gmail.com";
  const password = "12345";

  console.log(`Mencoba login sebagai ${email} ke ${supabaseUrl}...`);
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "apikey": supabaseKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Gagal login:", error.error_description || error.msg || error.message);
    process.exit(1);
  }

  const authData = await response.json();
  console.log("Login berhasil! Mengecek role profile...");

  // Cek profile role
  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${authData.user.id}&select=role,full_name`, {
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${authData.access_token}`
    }
  });

  if (!profileResponse.ok) {
    const profileError = await profileResponse.json();
    console.error("Gagal mengambil data profil:", profileError);
    process.exit(1);
  }

  const profiles = await profileResponse.json();
  const profile = profiles[0];

  console.log("Data Profil:", profile);
  
  if (profile && (profile.role === "admin" || profile.role === "mentor")) {
    console.log(`✅ Akses valid (Role: ${profile.role}). Anda memiliki izin untuk upload soal.`);
  } else {
    console.log(`⚠️ Akses berhasil, tetapi role Anda adalah '${profile?.role}'. Anda mungkin tidak memiliki izin.`);
  }
}

testLogin().catch(console.error);
