import "server-only";

import PDFDocument from "pdfkit";

export function renderPlanningBriefPdf(markdown: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50 });
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(18).text("Planning brief", { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    for (const line of markdown.split("\n")) {
      const t = line.trim();
      if (t.startsWith("# ")) {
        doc.moveDown();
        doc.fontSize(14).text(t.slice(2), { continued: false });
        doc.fontSize(10);
      } else if (t.startsWith("## ")) {
        doc.moveDown(0.5);
        doc.fontSize(12).text(t.slice(3));
        doc.fontSize(10);
      } else if (t.length > 0) {
        doc.text(line, { paragraphGap: 4 });
      } else {
        doc.moveDown(0.25);
      }
    }
    doc.end();
  });
}
