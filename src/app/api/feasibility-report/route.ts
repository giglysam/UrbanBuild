import { renderFeasibilityReportPdf } from "@/lib/reports/feasibility-report-pdf";
import { jsonError } from "@/lib/api/http";
import { structuredSiteAnalysisSchema } from "@/lib/types/site-feasibility";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = structuredSiteAnalysisSchema.safeParse(
    (json as { siteAnalysis?: unknown })?.siteAnalysis ?? json,
  );
  if (!parsed.success) {
    return jsonError("Invalid siteAnalysis payload", 400, parsed.error.flatten());
  }

  if (!parsed.data.projectFeasibility) {
    return jsonError("Run feasibility analysis with a project type before exporting", 400);
  }

  try {
    const buffer = await renderFeasibilityReportPdf(parsed.data);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="site-feasibility-report.pdf"',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "PDF export failed";
    return jsonError(message, 500);
  }
}
