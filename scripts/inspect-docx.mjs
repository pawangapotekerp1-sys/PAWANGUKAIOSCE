import fs from "fs/promises";
import JSZip from "jszip";

async function inspectDocx() {
  const content = await fs.readFile("E:/Projek OSCE/PEMBAHSAN TO 9 (KHUSUS KLINIS)-1.docx");
  const zip = await JSZip.loadAsync(content);
  const docXml = await zip.file("word/document.xml").async("string");
  
  // Save the raw xml so we can read it
  await fs.writeFile("E:/Projek OSCE/tmp_document.xml", docXml);
  console.log("XML saved to tmp_document.xml");
}

inspectDocx().catch(console.error);
