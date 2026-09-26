import fs from "fs/promises";
import { DOMParser } from "@xmldom/xmldom";

async function findXml() {
  const docXml = await fs.readFile("E:/Projek OSCE/tmp_document.xml", "utf-8");
  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, "application/xml");
  
  const paragraphs = doc.getElementsByTagName("w:p");
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const textContent = p.textContent;
    if (textContent && textContent.includes("Valsartan")) {
      console.log("FOUND PARAGRAPH WITH Valsartan:");
      console.log(p.toString());
    }
    if (textContent && textContent.includes("Furosemid")) {
      console.log("FOUND PARAGRAPH WITH Furosemid:");
      console.log(p.toString());
    }
  }
}

findXml().catch(console.error);
