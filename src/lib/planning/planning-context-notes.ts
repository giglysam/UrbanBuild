import type { PlanningContext } from "@/lib/types/planning";

/** Turn stored planner context into short bullet notes for LLM prompts. */
export function planningContextToNotes(ctx: PlanningContext | null | undefined): string[] {
  if (!ctx || typeof ctx !== "object") return [];

  const lines: string[] = [];

  if (ctx.population != null) lines.push(`Reported population (user): ${ctx.population}`);
  if (ctx.populationDensityPerHa != null) {
    lines.push(`Reported population density (user): ${ctx.populationDensityPerHa} per hectare`);
  }
  if (ctx.annualGrowthRatePercent != null) {
    lines.push(`Reported annual growth rate (user): ${ctx.annualGrowthRatePercent}%`);
  }
  if (ctx.landUseSummary?.trim()) lines.push(`Land use summary (user): ${ctx.landUseSummary.trim()}`);
  if (ctx.zoningNotes?.trim()) lines.push(`Zoning notes (user, non-official): ${ctx.zoningNotes.trim()}`);
  if (ctx.infrastructureNotes?.trim()) {
    lines.push(`Infrastructure notes (user): ${ctx.infrastructureNotes.trim()}`);
  }
  if (ctx.cityChallenges?.trim()) lines.push(`City challenges (user): ${ctx.cityChallenges.trim()}`);

  if (ctx.budgetTotalUsd != null) lines.push(`Total budget hint (user): USD ${ctx.budgetTotalUsd}`);
  if (ctx.budgetLineItems?.length) {
    const parts = ctx.budgetLineItems.map((b) => {
      const amt = b.amountUsd != null ? `$${b.amountUsd}` : "amount n/a";
      const pr = b.priority != null ? ` priority ${b.priority}/5` : "";
      return `${b.category}: ${amt}${pr}`;
    });
    lines.push(`Budget line items (user): ${parts.join("; ")}`);
  }

  const rf = ctx.riskFlags;
  if (rf) {
    const flags: string[] = [];
    if (rf.floodProne) flags.push("flood-prone (user flag)");
    if (rf.coastal) flags.push("coastal (user flag)");
    if (rf.overcrowding) flags.push("overcrowding concern (user flag)");
    if (rf.infrastructureGap) flags.push("infrastructure gap (user flag)");
    if (flags.length) lines.push(`Risk flags (user): ${flags.join(", ")}`);
  }

  if (ctx.populationByYear?.length) {
    const pts = ctx.populationByYear
      .slice()
      .sort((a, b) => a.year - b.year)
      .map((p) => `${p.year}: ${p.population}`);
    lines.push(`Population time series (user-supplied): ${pts.join(", ")}`);
  }

  return lines;
}
