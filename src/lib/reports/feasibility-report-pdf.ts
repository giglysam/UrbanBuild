import "server-only";

import PDFDocument from "pdfkit";

import { FINAL_RECOMMENDATION_LABELS, finalRecommendationFromFeasibility } from "@/lib/planning/pre-project-readiness";
import { feasibilityVerdictLabel } from "@/lib/planning/project-feasibility-labels";
import type { StructuredSiteAnalysis } from "@/lib/types/site-feasibility";

export function renderFeasibilityReportPdf(site: StructuredSiteAnalysis): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50 });
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    const f = site.projectFeasibility;
    const loc = site.location;

    doc.fontSize(18).text("Pre-Feasibility Readiness Report", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Coordinates: ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`);
    doc.text(`Study radius: ${loc.studyRadiusMeters} m`);
    if (loc.city) doc.text(`City: ${loc.city}`);
    if (loc.neighborhood) doc.text(`Area: ${loc.neighborhood}`);
    doc.moveDown();

    if (f) {
      const hasBuffer =
        (site.bufferMetrics?.buildingCount ?? 0) + (site.bufferMetrics?.roadCount ?? 0) > 0;
      const zoningUnknown = site.landUseAndZoning.zoningConfidence === "unknown";
      doc.fontSize(14).text("Project readiness");
      doc.fontSize(10);
      doc.text(`Project: ${f.projectTypeLabel}`);
      doc.text(
        `Verdict: ${feasibilityVerdictLabel(f.verdict, f.feasibilityScore, hasBuffer)}`,
      );
      doc.text(`Score: ${f.feasibilityScore} / 100`);
      doc.text(
        `Recommendation: ${FINAL_RECOMMENDATION_LABELS[finalRecommendationFromFeasibility(f, hasBuffer, zoningUnknown)]}`,
      );
      doc.text(f.scoreRationale);
      doc.moveDown();

      const sections: [string, string[]][] = [
        ["Site opportunities", f.siteOpportunities],
        ["Site constraints", f.siteConstraints],
        ["Project risks", f.projectRisks],
        ["Missing data", f.missingData],
        ["Required studies", f.requiredStudies],
        ["Alternatives", f.alternativeRecommendations],
      ];
      for (const [title, items] of sections) {
        doc.fontSize(12).text(title);
        doc.fontSize(10);
        for (const item of items) doc.text(`• ${item}`, { paragraphGap: 2 });
        doc.moveDown(0.5);
      }

      doc.fontSize(12).text("Planning brief");
      doc.fontSize(10);
      for (const line of f.planningBrief.split("\n")) {
        const t = line.trim();
        if (t.startsWith("## ")) {
          doc.moveDown(0.4);
          doc.fontSize(11).text(t.slice(3));
          doc.fontSize(10);
        } else if (t.length > 0) {
          doc.text(line, { paragraphGap: 2 });
        }
      }
      doc.moveDown();
    }

    doc.fontSize(12).text("Site data confidence");
    doc.fontSize(10);
    doc.text(`Overall: ${site.dataConfidence.overall}`);
    doc.text("Known: " + site.dataConfidence.knownData.join("; "));
    doc.text("Missing: " + site.dataConfidence.missingData.join("; "));

    doc.end();
  });
}
