"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { BudgetLineItem, PlanningContext, PlanningRiskFlags, PopulationPoint } from "@/lib/types/planning";
import { planningContextSchema } from "@/lib/types/planning";

const textareaClass = cn(
  "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
);

function emptyContext(): PlanningContext {
  return {
    population: null,
    populationDensityPerHa: null,
    annualGrowthRatePercent: null,
    landUseSummary: null,
    zoningNotes: null,
    infrastructureNotes: null,
    budgetTotalUsd: null,
    budgetLineItems: [],
    riskFlags: {},
    cityChallenges: null,
    populationByYear: [],
  };
}

export function ProjectPlanningContextForm({
  projectId,
  initialContext,
}: {
  projectId: string;
  initialContext: PlanningContext;
}) {
  const router = useRouter();
  const [ctx, setCtx] = useState<PlanningContext>(() => ({
    ...emptyContext(),
    ...initialContext,
    riskFlags: { ...initialContext.riskFlags },
    budgetLineItems: initialContext.budgetLineItems?.length ? [...initialContext.budgetLineItems] : [],
    populationByYear: initialContext.populationByYear?.length ? [...initialContext.populationByYear] : [],
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedPreview = useMemo(() => planningContextSchema.safeParse(ctx), [ctx]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const normalized = planningContextSchema.parse({
      ...ctx,
      budgetLineItems: (ctx.budgetLineItems ?? []).filter((b) => b.category.trim().length > 0),
      populationByYear: (ctx.populationByYear ?? []).filter(
        (p) => Number.isFinite(p.year) && p.year > 0 && Number.isFinite(p.population) && p.population >= 0,
      ),
    });
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planningContext: normalized }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  function setRisk<K extends keyof PlanningRiskFlags>(key: K, value: boolean | undefined) {
    setCtx((c) => ({
      ...c,
      riskFlags: { ...c.riskFlags, [key]: value || undefined },
    }));
  }

  function updateBudgetLine(i: number, patch: Partial<BudgetLineItem>) {
    setCtx((c) => {
      const items = [...(c.budgetLineItems ?? [])];
      items[i] = { ...items[i], ...patch, category: patch.category ?? items[i]?.category ?? "" };
      return { ...c, budgetLineItems: items };
    });
  }

  function addBudgetLine() {
    setCtx((c) => ({
      ...c,
      budgetLineItems: [...(c.budgetLineItems ?? []), { category: "", amountUsd: null, priority: 3 }],
    }));
  }

  function removeBudgetLine(i: number) {
    setCtx((c) => ({
      ...c,
      budgetLineItems: (c.budgetLineItems ?? []).filter((_, j) => j !== i),
    }));
  }

  function updatePopYear(i: number, patch: Partial<PopulationPoint>) {
    setCtx((c) => {
      const arr = [...(c.populationByYear ?? [])];
      arr[i] = { ...arr[i], ...patch, year: patch.year ?? arr[i]?.year ?? new Date().getFullYear(), population: patch.population ?? arr[i]?.population ?? 0 };
      return { ...c, populationByYear: arr };
    });
  }

  function addPopYear() {
    setCtx((c) => ({
      ...c,
      populationByYear: [...(c.populationByYear ?? []), { year: new Date().getFullYear(), population: 0 }],
    }));
  }

  function removePopYear(i: number) {
    setCtx((c) => ({
      ...c,
      populationByYear: (c.populationByYear ?? []).filter((_, j) => j !== i),
    }));
  }

  return (
    <form onSubmit={(e) => void save(e)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="population">Population (optional)</Label>
          <Input
            id="population"
            type="number"
            min={0}
            step={1}
            value={ctx.population ?? ""}
            onChange={(e) =>
              setCtx((c) => ({
                ...c,
                population: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="density">Density (per ha)</Label>
          <Input
            id="density"
            type="number"
            min={0}
            step={0.1}
            value={ctx.populationDensityPerHa ?? ""}
            onChange={(e) =>
              setCtx((c) => ({
                ...c,
                populationDensityPerHa: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="growth">Annual growth (%)</Label>
          <Input
            id="growth"
            type="number"
            step={0.1}
            value={ctx.annualGrowthRatePercent ?? ""}
            onChange={(e) =>
              setCtx((c) => ({
                ...c,
                annualGrowthRatePercent: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="land">Land use summary</Label>
        <textarea
          id="land"
          className={textareaClass}
          rows={3}
          value={ctx.landUseSummary ?? ""}
          onChange={(e) => setCtx((c) => ({ ...c, landUseSummary: e.target.value || null }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="zoning">Zoning notes (non-official)</Label>
        <textarea
          id="zoning"
          className={textareaClass}
          rows={3}
          value={ctx.zoningNotes ?? ""}
          onChange={(e) => setCtx((c) => ({ ...c, zoningNotes: e.target.value || null }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="infra">Infrastructure</Label>
        <textarea
          id="infra"
          className={textareaClass}
          rows={3}
          value={ctx.infrastructureNotes ?? ""}
          onChange={(e) => setCtx((c) => ({ ...c, infrastructureNotes: e.target.value || null }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="challenges">City challenges</Label>
        <textarea
          id="challenges"
          className={textareaClass}
          rows={3}
          value={ctx.cityChallenges ?? ""}
          onChange={(e) => setCtx((c) => ({ ...c, cityChallenges: e.target.value || null }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="budgetTotal">Total budget (USD, optional)</Label>
        <Input
          id="budgetTotal"
          type="number"
          min={0}
          step={1000}
          value={ctx.budgetTotalUsd ?? ""}
          onChange={(e) =>
            setCtx((c) => ({
              ...c,
              budgetTotalUsd: e.target.value === "" ? null : Number(e.target.value),
            }))
          }
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label>Budget line items</Label>
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addBudgetLine}>
            <Plus className="size-3.5" aria-hidden />
            Add line
          </Button>
        </div>
        <ul className="space-y-2">
          {(ctx.budgetLineItems ?? []).map((line, i) => (
            <li key={i} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[140px] flex-1 space-y-1">
                <span className="text-xs text-muted-foreground">Category</span>
                <Input
                  value={line.category}
                  onChange={(e) => updateBudgetLine(i, { category: e.target.value })}
                  placeholder="e.g. Transit"
                />
              </div>
              <div className="w-28 space-y-1">
                <span className="text-xs text-muted-foreground">USD</span>
                <Input
                  type="number"
                  min={0}
                  value={line.amountUsd ?? ""}
                  onChange={(e) =>
                    updateBudgetLine(i, {
                      amountUsd: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="w-20 space-y-1">
                <span className="text-xs text-muted-foreground">Pri. 1–5</span>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={line.priority ?? ""}
                  onChange={(e) =>
                    updateBudgetLine(i, {
                      priority: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </div>
              <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => removeBudgetLine(i)} aria-label="Remove line">
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Risk flags (self-reported)</legend>
        <div className="flex flex-wrap gap-4">
          {(
            [
              ["floodProne", "Flood-prone"],
              ["coastal", "Coastal"],
              ["overcrowding", "Overcrowding"],
              ["infrastructureGap", "Infrastructure gap"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!ctx.riskFlags?.[key]}
                onChange={(e) => setRisk(key, e.target.checked)}
                className="size-4 rounded border-input"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label>Population by year (for charts)</Label>
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addPopYear}>
            <Plus className="size-3.5" aria-hidden />
            Add year
          </Button>
        </div>
        <ul className="space-y-2">
          {(ctx.populationByYear ?? []).map((row, i) => (
            <li key={i} className="flex flex-wrap items-end gap-2">
              <div className="w-28 space-y-1">
                <span className="text-xs text-muted-foreground">Year</span>
                <Input
                  type="number"
                  value={row.year}
                  onChange={(e) => updatePopYear(i, { year: Number(e.target.value) })}
                />
              </div>
              <div className="min-w-[120px] flex-1 space-y-1">
                <span className="text-xs text-muted-foreground">Population</span>
                <Input
                  type="number"
                  min={0}
                  value={row.population}
                  onChange={(e) => updatePopYear(i, { population: Number(e.target.value) })}
                />
              </div>
              <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => removePopYear(i)} aria-label="Remove row">
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {!parsedPreview.success ? (
        <p className="text-sm text-destructive">Fix validation before saving.</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={loading || !parsedPreview.success}>
        {loading ? "Saving…" : "Save planner context"}
      </Button>
    </form>
  );
}
