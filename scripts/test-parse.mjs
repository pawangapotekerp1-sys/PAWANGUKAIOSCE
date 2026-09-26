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
  if (tables.length === 0) {
    throw new Error("No table found in docx.");
  }
  
  // Use the first table
  const table = tables[0];
  const rows = table.getElementsByTagName("w:tr");
  
  const questions = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cells = Array.from(row.childNodes).filter(n => n.nodeName === "w:tc");
    
    // Skip rows that don't have exactly 2 columns, or handle headers?
    if (cells.length < 2) continue;
    
    // Extract left cell (Question + Options)
    const leftCell = cells[0];
    const rightCell = cells[1];
    
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
        // Check highlight
        const rPr = Array.from(r.getElementsByTagName("w:rPr"))[0];
        if (rPr) {
          const highlight = Array.from(rPr.getElementsByTagName("w:highlight"))[0];
          if (highlight && highlight.getAttribute("w:val") === "yellow") {
            hasYellow = true;
          }
        }
        
        const t = Array.from(r.getElementsByTagName("w:t"))[0];
        if (t && t.textContent) {
          pText += t.textContent;
        }
      }
      
      pText = pText.trim();
      if (!pText) continue;
      
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
          // Additional text for an option? Just append to last option or ignore.
          // Let's assume it's part of the last option
          if (options.length > 0) {
             options[options.length - 1].text += "\n" + pText;
          }
        }
      }
    }
    
    // Extract right cell (Explanation)
    const rightPars = Array.from(rightCell.getElementsByTagName("w:p"));
    const expLines = [];
    for (const p of rightPars) {
      let pText = "";
      const runs = Array.from(p.getElementsByTagName("w:r"));
      for (const r of runs) {
        const t = Array.from(r.getElementsByTagName("w:t"))[0];
        if (t && t.textContent) {
          pText += t.textContent;
        }
      }
      pText = pText.trim();
      if (pText) expLines.push(pText);
    }
    const explanationText = expLines.join("\n").trim();
    
    const stem = stemLines.join("\n").trim();
    
    if (stem || options.length > 0 || explanationText) {
       // Only add if it's not a purely empty row
       // Sometimes the first row is a header like "Soal | Pembahasan"
       if (stem.toLowerCase().includes("soal") && explanationText.toLowerCase().includes("pembahasan") && options.length === 0) {
         continue; // skip header
       }
       
       questions.push({
         stem,
         options,
         correctOptionKey,
         explanationText,
         blockId: null,
         topicId: null
       });
    }
  }
  
  return questions;
}

parseDocx("E:/Projek OSCE/Ujian CBT Blok CS 100 soal.docx")
  .then(q => {
    console.log(`Berhasil mengekstrak ${q.length} soal.`);
    if (q.length > 0) {
      console.log("Sample soal pertama:", JSON.stringify(q[0], null, 2));
      const noAnswer = q.filter(x => !x.correctOptionKey);
      console.log(`Ada ${noAnswer.length} soal tanpa jawaban kuning.`);
    }
  })
  .catch(console.error);
