import fs from "fs/promises";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const email = "fahminaser18@gmail.com";
const password = "12345";
const EVENT_TITLE = "TRY OUT CBT CS PART 2";

async function parseDocxWithImages(filePath, zip, eventId, token) {
  const relsXml = await zip.file("word/_rels/document.xml.rels").async("string");
  const relsParser = new DOMParser();
  const relsDoc = relsParser.parseFromString(relsXml, "application/xml");
  const relNodes = Array.from(relsDoc.getElementsByTagName("Relationship"));
  const relsMap = {};
  for (const r of relNodes) {
    relsMap[r.getAttribute("Id")] = r.getAttribute("Target");
  }

  const docXml = await zip.file("word/document.xml").async("string");
  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, "application/xml");
  
  const tables = doc.getElementsByTagName("w:tbl");
  const rows = [];
  for(let t=0; t<tables.length; t++) {
    const table = tables[t];
    const trs = Array.from(table.getElementsByTagName("w:tr"));
    rows.push(...trs);
  }
  
  const questions = [];
  const KEYS = ["A", "B", "C", "D", "E", "F", "G"];
  let currentQ = null;
  
  async function isValidImage(target) {
     if (!target.startsWith("media/")) return false;
     const file = zip.file("word/" + target);
     if (!file) return false;
     const buffer = await file.async("nodebuffer");
     // Watermarks are ~142KB
     if (buffer.length > 140000 && buffer.length < 145000) return false;
     
     // Skip the blank grey rectangles that OCR produced (size < 3000 bytes and certain known ones)
     // Actually, we can just skip if it's the specific broken eGFR image which we are replacing
     if (target.includes("image37.png") || target.includes("image22.png") || target.includes("image9.png")) return false;
     
     return true;
  }

  async function uploadImage(target, kind) {
    const file = zip.file("word/" + target);
    if (!file) return null;
    const buffer = await file.async("nodebuffer");
    return uploadBuffer(buffer, target, kind);
  }

  async function uploadBuffer(buffer, fileName, kind) {
    const ext = fileName.split(".").pop();
    const uniqueSuffix = Date.now() + "-" + Math.random().toString(36).substring(2, 10);
    const storagePath = `${kind}/scheduled-events/${eventId}/${uniqueSuffix}-${fileName}`;
    
    console.log(`Uploading valid image ${fileName} (${buffer.length} bytes) to ${storagePath}...`);
    let mime = "image/png";
    if (ext === "jpeg" || ext === "jpg") mime = "image/jpeg";
    
    const res = await fetch(`${supabaseUrl}/storage/v1/object/question-media/${storagePath}`, {
       method: "POST",
       headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${token}`,
          "Content-Type": mime
       },
       body: buffer
    });
    
    if (!res.ok) {
        console.error("Failed to upload image:", await res.text());
        return null;
    }
    return storagePath;
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const cells = Array.from(row.childNodes).filter(n => n.nodeName === "w:tc");
    if (cells.length < 2) continue;
    
    const cell0Text = cells[0].textContent?.trim() || "";
    if (cell0Text.toLowerCase() === "no") continue;
    
    const isNewQuestion = /^\d+$/.test(cell0Text);
    if (isNewQuestion) {
       if (currentQ) questions.push(currentQ);
       currentQ = { stem: "", options: [], correctOptionKey: null, explanationText: "", validStemTargets: [], validExpTargets: [] };
    }
    
    if (!currentQ) continue;
    
    const hasThreeColumns = cells.length >= 3;
    const leftCell = hasThreeColumns ? cells[1] : cells[0];
    const rightCell = hasThreeColumns ? cells[2] : cells[1];
    
    const leftPars = Array.from(leftCell.getElementsByTagName("w:p"));
    let foundOption = false;
    
    for (const p of leftPars) {
      const drawings = Array.from(p.getElementsByTagName("w:drawing"));
      const picts = Array.from(p.getElementsByTagName("w:pict"));
      let embedId = null;
      if (drawings.length > 0) {
          const blip = drawings[0].getElementsByTagName("a:blip")[0];
          if (blip) embedId = blip.getAttribute("r:embed");
      }
      if (picts.length > 0 && !embedId) {
          const imagedata = picts[0].getElementsByTagName("v:imagedata")[0];
          if (imagedata) embedId = imagedata.getAttribute("r:id");
      }
      if (embedId && relsMap[embedId]) {
         currentQ.validStemTargets.push(relsMap[embedId]);
      }

      let pText = "";
      let hasYellow = false;
      const pPr = Array.from(p.getElementsByTagName("w:pPr"))[0];
      let isNumList = false;
      if (pPr) {
         const numPr = Array.from(pPr.getElementsByTagName("w:numPr"))[0];
         if (numPr) isNumList = true;
      }
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
      
      const optionMatch = pText.match(/^([A-Ea-e])[\.\)]\s*(.*)/);
      if (optionMatch) {
        foundOption = true;
        const key = optionMatch[1].toUpperCase();
        currentQ.options.push({ key, text: optionMatch[2].trim() });
        if (hasYellow) currentQ.correctOptionKey = key;
      } else if (isNumList && pText) {
        foundOption = true;
        const key = KEYS[currentQ.options.length] || "A";
        currentQ.options.push({ key, text: pText });
        if (hasYellow) currentQ.correctOptionKey = key;
      } else if (pText) {
        if (!foundOption) currentQ.stem += (currentQ.stem ? "\n" : "") + pText;
        else if (currentQ.options.length > 0) currentQ.options[currentQ.options.length - 1].text += "\n" + pText;
      }
    }
    
    const rightPars = Array.from(rightCell.getElementsByTagName("w:p"));
    for (const p of rightPars) {
      const drawings = Array.from(p.getElementsByTagName("w:drawing"));
      const picts = Array.from(p.getElementsByTagName("w:pict"));
      let embedId = null;
      if (drawings.length > 0) {
          const blip = drawings[0].getElementsByTagName("a:blip")[0];
          if (blip) embedId = blip.getAttribute("r:embed");
      }
      if (picts.length > 0 && !embedId) {
          const imagedata = picts[0].getElementsByTagName("v:imagedata")[0];
          if (imagedata) embedId = imagedata.getAttribute("r:id");
      }
      if (embedId && relsMap[embedId]) {
         currentQ.validExpTargets.push(relsMap[embedId]);
      }
      
      let pText = "";
      const runs = Array.from(p.getElementsByTagName("w:r"));
      for (const r of runs) {
        const t = Array.from(r.getElementsByTagName("w:t"))[0];
        if (t && t.textContent) pText += t.textContent;
      }
      pText = pText.trim();
      if (pText) currentQ.explanationText += (currentQ.explanationText ? "\n" : "") + pText;
    }
  }
  if (currentQ) questions.push(currentQ);
  
  function cleanText(text) {
     if (!text) return "";
     text = text.replace(/\uf0e0/g, "→");
     text = text.replace(/([^\n.?!:])\s*\n\s*([^A-Ea-e0-9\-\u2022*])/g, "$1 $2");
     text = text.replace(/^(\d{8,})([A-Za-z])/gm, "$2");
     return text.trim();
  }

  for (const q of questions) {
      if (!q.correctOptionKey) {
          const match = q.explanationText.match(/Jawaban\s*([A-E])/i);
          if (match) q.correctOptionKey = match[1].toUpperCase();
      }
      q.explanationText = q.explanationText.replace(/^Jawab:\s*/i, "");
      q.correctOptionKey = q.correctOptionKey || "A"; 
      
      q.stem = cleanText(q.stem);
      q.explanationText = cleanText(q.explanationText);
      for (const opt of q.options) {
          opt.text = cleanText(opt.text);
      }
      
      q.questionImagePath = null; 
      q.explanationImagePath = null;
      
      // PERFECT eGFR equation fix
      if (q.stem.includes("kreatinin pasien 2,4mg/dl") && q.stem.includes("kaptopril 25 mg")) {
          // Remove the garbled OCR text for the equation
          q.explanationText = q.explanationText
            .split("\n")
            .filter(line => !line.includes("GFR =") && !line.includes("72"))
            .join("\n")
            .trim();
            
          // Upload the beautiful LaTeX eGFR equation!
          const egfrBuffer = await fs.readFile("egfr.png");
          q.explanationImagePath = await uploadBuffer(egfrBuffer, "egfr_formula.png", "explanation");
          
          // Clear validStemTargets so it doesn't upload the grey rectangle as questionImagePath
          q.validStemTargets = [];
      }
      
      // Upload genuine images for stem
      for (const target of q.validStemTargets) {
         if (await isValidImage(target)) {
             q.questionImagePath = await uploadImage(target, "question");
             break;
         }
      }
      // Upload genuine images for explanation
      for (const target of q.validExpTargets) {
         if (await isValidImage(target)) {
             if (!q.explanationImagePath) {
                 q.explanationImagePath = await uploadImage(target, "explanation");
             }
             break;
         }
      }
      
      delete q.validStemTargets;
      delete q.validExpTargets;
  }
  return questions;
}

async function main() {
  const filePath = "E:/Projek OSCE/PEMBAHSAN TO 9 (KHUSUS KLINIS)-1.docx";
  console.log(`Mengekstrak ${filePath}...`);
  
  const content = await fs.readFile(filePath);
  const zip = await JSZip.loadAsync(content);
  
  console.log("Mencoba login...");
  const loginRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "apikey": supabaseKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!loginRes.ok) { console.error("Gagal login"); process.exit(1); }
  const authData = await loginRes.json();
  const token = authData.access_token;

  console.log(`Mencari event ${EVENT_TITLE}...`);
  const eventRes = await fetch(`${supabaseUrl}/rest/v1/scheduled_tryout_events?select=*&title=ilike.*${encodeURIComponent(EVENT_TITLE)}*`, {
    headers: { "apikey": supabaseKey, "Authorization": `Bearer ${token}` }
  });
  const events = await eventRes.json();
  if (!events || events.length === 0) { console.error("Event tidak ditemukan!"); process.exit(1); }
  const event = events[0];
  
  const parsedQuestions = await parseDocxWithImages(filePath, zip, event.id, token);
  console.log(`Berhasil mengekstrak ${parsedQuestions.length} soal.`);
  
  const uniqueQuestions = [];
  const seenStems = new Set();
  for (const q of parsedQuestions) {
    if (!seenStems.has(q.stem)) {
      seenStems.add(q.stem);
      uniqueQuestions.push(q);
    }
  }

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
    headers: { "apikey": supabaseKey, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ target_event_id: event.id, payload })
  });
  
  if (!upsertRes.ok) { console.error("Gagal upsert event:", await upsertRes.text()); process.exit(1); }
  console.log("Sukses! Soal berhasil diperbarui dengan sempurna.");
}

main().catch(console.error);
