import fs from "fs/promises";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

async function dumpMissed(filePath) {
  const content = await fs.readFile(filePath);
  const zip = await JSZip.loadAsync(content);
  const docXml = await zip.file("word/document.xml").async("string");
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, "application/xml");
  
  const tables = doc.getElementsByTagName("w:tbl");
  const table = tables[0];
  const rows = table.getElementsByTagName("w:tr");
  
  let count = 0;
  for (let i = 1; i < rows.length; i++) {
    const cells = Array.from(rows[i].childNodes).filter(n => n.nodeName === "w:tc");
    if (cells.length < 2) continue;
    count++;
  }
  console.log("Total rows found (excluding header, with >1 cells):", count);
}

dumpMissed("E:/Projek OSCE/Ujian CBT Blok CS 100 soal.docx").catch(console.error);
