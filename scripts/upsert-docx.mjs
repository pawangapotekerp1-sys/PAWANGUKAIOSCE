import fs from "fs/promises";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const email = "fahminaser18@gmail.com";
const password = "12345";

async function parseDocx(filePath) {
  const content = await fs.readFile(filePath);
  const zip = await JSZip.loadAsync(content);
  const docXml = await zip.file("word/document.xml").async("string");
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, "application/xml");
  
  const tables = doc.getElementsByTagName("w:tbl");
  if (tables.length === 0) throw new Error("No table found in docx.");
  
  const table = tables[0];
  const rows = table.getElementsByTagName("w:tr");
  
  const questions = [];
  
  for (let i = 1; i < rows.length; i++) { // Skip header row 0
    const row = rows[i];
    if (!row) continue;
    const cells = Array.from(row.childNodes).filter(n => n.nodeName === "w:tc");
    
    // Usually Column 0 is Number, Column 1 is Soal, Column 2 is Pembahasan
    if (cells.length < 2) continue;
    
    // Sometimes it's exactly 2 columns, sometimes 3. Let's adapt based on available columns.
    const hasThreeColumns = cells.length >= 3;
    const leftCell = hasThreeColumns ? cells[1] : cells[0];
    const rightCell = hasThreeColumns ? cells[2] : cells[1];
    
    const leftPars = Array.from(leftCell.getElementsByTagName("w:p"));
    
    const stemLines = [];
    const options = [];
    let correctOptionKey = null;
    let foundOption = false;
    
    for (const p of leftPars) {
      let pText = "";
      let hasYellow = false;
      
      const runs = Array.from(p.getElementsByTagName("w:r"));
      for (const r of runs) {
        const rPr = Array.from(r.getElementsByTagName("w:rPr"))[0];
        if (rPr) {
          const highlight = Array.from(rPr.getElementsByTagName("w:highlight"))[0];
          const shading = Array.from(rPr.getElementsByTagName("w:shd"))[0];
          if (highlight && highlight.getAttribute("w:val") === "yellow") hasYellow = true;
          if (shading && shading.getAttribute("w:fill") === "FFFF00") hasYellow = true;
        }
        const t = Array.from(r.getElementsByTagName("w:t"))[0];
        if (t && t.textContent) pText += t.textContent;
      }
      
      pText = pText.trim();
      if (!pText) continue;
      
      // Match A., B., C., D., E.
      const optionMatch = pText.match(/^([A-Ea-e])[\.\)]\s*(.*)/);
      if (optionMatch) {
        foundOption = true;
        const key = optionMatch[1].toUpperCase();
        const text = optionMatch[2].trim();
        options.push({ key, text });
        if (hasYellow) {
          correctOptionKey = key;
        }
      } else {
        if (!foundOption) {
          stemLines.push(pText);
        } else {
          // Append to last option
          if (options.length > 0) {
             options[options.length - 1].text += "\n" + pText;
          }
        }
      }
    }
    
    const rightPars = Array.from(rightCell.getElementsByTagName("w:p"));
    const expLines = [];
    for (const p of rightPars) {
      let pText = "";
      const runs = Array.from(p.getElementsByTagName("w:r"));
      for (const r of runs) {
        const t = Array.from(r.getElementsByTagName("w:t"))[0];
        if (t && t.textContent) pText += t.textContent;
      }
      pText = pText.trim();
      if (pText) expLines.push(pText);
    }
    
    let explanationText = expLines.join("\n").trim();
    // Sometimes explanation has "Jawaban C\nPembahasan: ..." so we can use that to fallback if highlight is missing
    if (!correctOptionKey) {
      const match = explanationText.match(/Jawaban\s*([A-E])/i);
      if (match) {
        correctOptionKey = match[1].toUpperCase();
      }
    }

    // Clean up explanation text label
    explanationText = explanationText.replace(/^Jawaban\s*[A-E]\s*/i, "");
    explanationText = explanationText.replace(/^Pembahasan:\s*/i, "");
    
    const stem = stemLines.join("\n").trim();
    
    if (stem || options.length > 0 || explanationText) {
       // Ensure options A, B, C, D, E are present if not found?
       // Let's just push them as they are
       questions.push({
         stem,
         options,
         correctOptionKey: correctOptionKey || "A", // fallback to A to prevent API error
         explanationText,
         blockId: null,
         topicId: null
       });
    }
  }
  
  return questions;
}

async function main() {
  const filePath = "E:/Projek OSCE/Ujian CBT Blok CS 100 soal.docx";
  console.log(`Mengekstrak ${filePath}...`);
  const parsedQuestions = await parseDocx(filePath);
  console.log(`Berhasil mengekstrak ${parsedQuestions.length} soal.`);
  
  const uniqueQuestions = [];
  const seenStems = new Set();
  for (const q of parsedQuestions) {
    if (!seenStems.has(q.stem)) {
      seenStems.add(q.stem);
      uniqueQuestions.push(q);
    }
  }

  console.log(`Menghapus duplikat... Tersisa ${uniqueQuestions.length} soal unik.`);
  
  console.log("Mencoba login...");
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
  
  console.log(`Mengunggah soal ke event ${event.id}...`);
  
  // Prepare payload
  const payload = {
    title: event.title,
    description: event.description || "",
    editorialStatus: event.editorial_status,
    accessStartAt: event.access_start_at,
    accessEndAt: event.access_end_at,
    questions: uniqueQuestions
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
    console.error("Gagal upsert event:", await upsertRes.text());
    process.exit(1);
  }
  
  const result = await upsertRes.json();
  console.log("Sukses! Soal berhasil di-upload ke event.");
}

main().catch(console.error);
