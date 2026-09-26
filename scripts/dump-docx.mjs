import fs from "fs/promises";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

async function dumpDocx(filePath) {
  const content = await fs.readFile(filePath);
  const zip = await JSZip.loadAsync(content);
  const docXml = await zip.file("word/document.xml").async("string");
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, "application/xml");
  
  const tables = doc.getElementsByTagName("w:tbl");
  if (tables.length === 0) return console.log("No table");
  
  const table = tables[0];
  const rows = table.getElementsByTagName("w:tr");
  
  for (let i = 0; i < 3; i++) {
    const row = rows[i];
    if(!row) continue;
    const cells = Array.from(row.childNodes).filter(n => n.nodeName === "w:tc");
    console.log(`\n--- ROW ${i} ---`);
    cells.forEach((cell, cellIdx) => {
      console.log(`  CELL ${cellIdx}:`);
      const pars = Array.from(cell.getElementsByTagName("w:p"));
      pars.forEach((p, pIdx) => {
        let pText = "";
        let hasYellow = false;
        const runs = Array.from(p.getElementsByTagName("w:r"));
        for (const r of runs) {
          const rPr = Array.from(r.getElementsByTagName("w:rPr"))[0];
          if (rPr) {
             const highlight = Array.from(rPr.getElementsByTagName("w:highlight"))[0];
             const shading = Array.from(rPr.getElementsByTagName("w:shd"))[0];
             if (highlight && highlight.getAttribute("w:val") === "yellow") hasYellow = true;
             if (shading && shading.getAttribute("w:fill") === "FFFF00") hasYellow = true; // some exports use shading
          }
          const t = Array.from(r.getElementsByTagName("w:t"))[0];
          if (t && t.textContent) pText += t.textContent;
        }
        console.log(`    P${pIdx} [Yellow:${hasYellow}]: ${pText}`);
      });
    });
  }
}

dumpDocx("E:/Projek OSCE/Ujian CBT Blok CS 100 soal.docx").catch(console.error);
