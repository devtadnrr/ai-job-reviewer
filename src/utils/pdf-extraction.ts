import fs from "fs";
import path from "path";
import { getDocument, PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { TextItem } from "pdfjs-dist/types/src/display/api";

export async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const absolutePath = path.resolve(filePath);
    const fileData = new Uint8Array(fs.readFileSync(absolutePath));

    const pdfDocument = getDocument({ data: fileData });
    const pdf: PDFDocumentProxy = await pdfDocument.promise;
    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item) => ((item as TextItem).str ? (item as TextItem).str : ""))
        .join(" ");

      pages.push(pageText);
    }

    return pages.join("\n");
  } catch (error) {
    console.error(`Error extracting text from PDF "${filePath}":`, error);
    throw error;
  }
}

export async function cleanPdfText(text: string): Promise<string> {
  return text
    .replace(/\s+(?=\S)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
