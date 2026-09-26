import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Pastikan dijalankan dengan flag: node --env-file=.env.local scripts/bulk-upload-questions.mjs
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY tidak ditemukan di .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runUpload() {
  // 1. Masukkan kredensial Admin atau Mentor Anda di sini
  const email = "admin@example.com"; 
  const password = "password123";

  console.log("Melakukan login...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error("Gagal login:", authError.message);
    return;
  }
  console.log("Login berhasil sebagai:", authData.user.email);

  // 2. Baca file soal (JSON)
  // Pastikan Anda sudah membuat file soal.json di root project
  const soalFilePath = path.resolve(__dirname, "../soal.json");
  let rows;
  
  try {
    const rawData = await fs.readFile(soalFilePath, "utf-8");
    rows = JSON.parse(rawData);
  } catch (err) {
    console.error(`Gagal membaca file ${soalFilePath}:`, err.message);
    console.log(`
Contoh format soal.json:
[
  {
    "stem": "Seorang pasien datang dengan keluhan pusing...",
    "option_a": "Parasetamol",
    "option_b": "Ibuprofen",
    "option_c": "Aspirin",
    "option_d": "Antasida",
    "option_e": "Amoksisilin",
    "correct_answer": "A",
    "explanation": "Parasetamol aman untuk ...",
    "block": "Farmakologi",
    "topic": "Analgesik"
  }
]
    `);
    return;
  }

  console.log(`Mengunggah ${rows.length} soal ke Supabase...`);

  // 3. Panggil Edge Function upload-question-batch
  const { data, error } = await supabase.functions.invoke("upload-question-batch", {
    body: {
      title: `Bulk Upload ${new Date().toISOString()}`,
      inputFormat: "csv", // Menggunakan format structured row
      rows: rows,
    },
  });

  if (error) {
    console.error("Gagal mengunggah soal:", error);
    return;
  }

  console.log("Upload berhasil disubmit! Draf telah dibuat di Supabase.");
  console.log("Detail hasil:", JSON.stringify(data, null, 2));
}

runUpload().catch(console.error);
