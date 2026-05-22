import type { DesignConcept } from "@/lib/types/planning";

function Field({ label, value }: { label: string; value: string | string[] }) {
  const text = Array.isArray(value) ? value.join(", ") : value;
  if (!text.trim()) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 leading-snug">{text}</p>
    </div>
  );
}

/** Renders a design concept using the standard consultant structure. */
export function DesignConceptSummary({ concept, compact }: { concept: DesignConcept; compact?: boolean }) {
  if (compact) {
    return <Field label="Main idea" value={concept.designConcept} />;
  }

  return (
    <div className="space-y-2.5 text-sm">
      <Field label="Main idea" value={concept.designConcept} />
      <Field label="Program" value={concept.program} />
      <Field label="Material palette" value={concept.materials} />
      <Field label="Urban logic" value={`${concept.massingLogic} ${concept.publicRealmStrategy}`.trim()} />
      <Field label="Feasibility notes" value={concept.feasibilityAdaptations} />
      <Field label="Visual direction" value={concept.imagePrompt} />
    </div>
  );
}
