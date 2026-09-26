import fs from "fs/promises";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

async function parseDocx(filePath) {
  const content = await fs.readFile(filePath);
  const zip = await JSZip.loadAsync(content);
  const docXml = await zip.file("word/document.xml").async("string");
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, "application/xml");
  
  const tables = doc.getElementsByTagName("w:tbl");
  if (tables.length === 0) throw new Error("No table found in docx.");
  
  const rows = [];
  for(let t=0; t<tables.length; t++) {
    const table = tables[t];
    const trs = Array.from(table.getElementsByTagName("w:tr"));
    rows.push(...trs);
  }

  
  const questions = [];
  let currentQuestion = null;
  const KEYS = ["A", "B", "C", "D", "E", "F", "G"];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const cells = Array.from(row.childNodes).filter(n => n.nodeName === "w:tc");
    if (cells.length < 2) continue;
    
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
      if (!pText) continue;
      
      const optionMatch = pText.match(/^([A-Ea-e])[\.\)]\s*(.*)/);
      if (optionMatch) {
        foundOption = true;
        const key = optionMatch[1].toUpperCase();
        const text = optionMatch[2].trim();
        options.push({ key, text });
        if (hasYellow) correctOptionKey = key;
      } else if (isNumList) {
        // Option from numbering
        foundOption = true;
        const key = KEYS[options.length] || "A";
        options.push({ key, text: pText });
        if (hasYellow) correctOptionKey = key;
      } else {
        if (!foundOption) stemLines.push(pText);
        else if (options.length > 0) options[options.length - 1].text += "\n" + pText;
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
    if (!correctOptionKey) {
      const match = explanationText.match(/Jawaban\s*([A-E])/i);
      if (match) correctOptionKey = match[1].toUpperCase();
    }
    
    // Cleanup explanation prefix
    explanationText = explanationText.replace(/^Jawab:\s*/i, "");
    
    // Fallback if stem empty
    if (stemLines.join("").trim() === "" && options.length === 0) continue;
    
    questions.push({
      number: i,
      stem: stemLines.join("\n").trim(),
      options,
      correctOptionKey,
      explanationText
    });
  }
  return questions;
}

parseDocx("E:/Projek OSCE/PEMBAHSAN TO 9 (KHUSUS KLINIS)-1.docx").then(async q => {
  console.log(`Berhasil mengekstrak ${q.length} soal.`);
  
  await fs.writeFile("E:/Projek OSCE/tmp_questions.json", JSON.stringify(q, null, 2));
  console.log("Tersimpan di tmp_questions.json");
  
  const missingKeys = q.filter(x => !x.correctOptionKey);
  console.log(`Ada ${missingKeys.length} soal tanpa kunci jawaban.`);
  
  if (q.length > 0) {
    for(let i=0; i<Math.min(2, q.length); i++) {
        console.log(`\n=== SOAL ${i+1} ===`);
        console.log(`STEM: ${q[i].stem.substring(0, 50)}...`);
        console.log(`OPTIONS: ${q[i].options.length}`);
        console.log(`KUNCI: ${q[i].correctOptionKey}`);
    }
  }
}).catch(console.error);
