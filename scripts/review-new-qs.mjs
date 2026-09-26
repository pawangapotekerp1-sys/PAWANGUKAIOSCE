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
  const table = tables[0];
  const rows = table.getElementsByTagName("w:tr");
  
  const questions = [];
  
  for (let i = 1; i < rows.length; i++) { // Skip header
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

parseDocx("E:/Projek OSCE/Ujian CBT Blok CS 100 soal.docx").then(q => {
  // We want to see the last 10 questions (assuming they are the new ones).
  // Total 100 questions. So slice(-10).
  const newQs = q.slice(-10);
  newQs.forEach((q, idx) => {
    console.log(`\n=== SOAL ${91 + idx} ===`);
    console.log(`STEM:\n${q.stem}`);
    console.log(`OPTIONS:`);
    q.options.forEach(o => {
      console.log(`  ${o.key}. ${o.text} ${o.key === q.correctOptionKey ? ' <--- KUNCI' : ''}`);
    });
    console.log(`PEMBAHASAN:\n${q.explanationText}`);
  });
}).catch(console.error);
