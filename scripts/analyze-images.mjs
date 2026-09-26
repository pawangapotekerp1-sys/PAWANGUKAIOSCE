import fs from "fs/promises";
import JSZip from "jszip";

async function analyzeImages() {
  const content = await fs.readFile("E:/Projek OSCE/PEMBAHSAN TO 9 (KHUSUS KLINIS)-1.docx");
  const zip = await JSZip.loadAsync(content);
  
  const files = Object.keys(zip.files).filter(f => f.startsWith("word/media/"));
  
  for (const f of files) {
    const fileData = await zip.file(f).async("nodebuffer");
    console.log(`${f} : ${fileData.length} bytes`);
  }
}

analyzeImages().catch(console.error);
