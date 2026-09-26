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
  const rows = [];
  for(let t=0; t<tables.length; t++) {
    const table = tables[t];
    const trs = Array.from(table.getElementsByTagName("w:tr"));
    rows.push(...trs);
  }
  
  const questions = [];
  const KEYS = ["A", "B", "C", "D", "E", "F", "G"];
  let currentQ = null;
  
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
       currentQ = { stem: "", options: [], correctOptionKey: null, explanationText: "" };
    }
    
    if (!currentQ) continue;
    
    const hasThreeColumns = cells.length >= 3;
    const leftCell = hasThreeColumns ? cells[1] : cells[0];
    const rightCell = hasThreeColumns ? cells[2] : cells[1];
    
    const leftPars = Array.from(leftCell.getElementsByTagName("w:p"));
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
        currentQ.options.push({ key, text: optionMatch[2].trim() });
        if (hasYellow) currentQ.correctOptionKey = key;
      } else if (isNumList) {
        foundOption = true;
        const key = KEYS[currentQ.options.length] || "A";
        currentQ.options.push({ key, text: pText });
        if (hasYellow) currentQ.correctOptionKey = key;
      } else {
        if (!foundOption) currentQ.stem += (currentQ.stem ? "\n" : "") + pText;
        else if (currentQ.options.length > 0) currentQ.options[currentQ.options.length - 1].text += "\n" + pText;
      }
    }
    
    const rightPars = Array.from(rightCell.getElementsByTagName("w:p"));
    for (const p of rightPars) {
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
  return questions;
}

parseDocx("E:/Projek OSCE/PEMBAHSAN TO 9 (KHUSUS KLINIS)-1.docx").then(async q => {
  console.log(`Mengekstrak ${q.length} soal.`);
  await fs.writeFile("E:/Projek OSCE/tmp_questions.json", JSON.stringify(q, null, 2));
  const missingKeys = q.filter(x => !x.correctOptionKey);
  console.log(`Ada ${missingKeys.length} soal tanpa kunci jawaban.`);
  
  // Show 3 random questions for review
  console.log("\n=== REVIEW SAMPEL 3 SOAL PERTAMA ===");
  for(let i=0; i<3; i++) {
     console.log(`\nSOAL ${i+1}: ${q[i].stem}`);
     q[i].options.forEach(o => console.log(`  ${o.key}. ${o.text} ${o.key === q[i].correctOptionKey ? ' <--- KUNCI' : ''}`));
     console.log(`PEMBAHASAN: ${q[i].explanationText}`);
  }
}).catch(console.error);
