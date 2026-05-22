"use client";

import {
  PROJECT_TYPE_LABELS,
  projectTypeIdSchema,
  type ProjectTypeId,
} from "@/lib/types/site-feasibility";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRESET_TYPES = projectTypeIdSchema.options.filter((id) => id !== "custom") as Exclude<
  ProjectTypeId,
  "custom"
>[];

type Props = {
  value: ProjectTypeId;
  onChange: (value: ProjectTypeId) => void;
  customDescription: string;
  onCustomDescriptionChange: (value: string) => void;
  disabled?: boolean;
};

export function ProjectTypeSelector({
  value,
  onChange,
  customDescription,
  onCustomDescriptionChange,
  disabled,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="project-type">Proposed project</Label>
        <select
          id="project-type"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value as ProjectTypeId)}
        >
          {PRESET_TYPES.map((id) => (
            <option key={id} value={id}>
              {PROJECT_TYPE_LABELS[id]}
            </option>
          ))}
          <option value="custom">{PROJECT_TYPE_LABELS.custom}</option>
        </select>
      </div>
      {value === "custom" ? (
        <div className="space-y-2">
          <Label htmlFor="custom-project">Describe your project</Label>
          <Input
            id="custom-project"
            placeholder="e.g. cultural museum with plaza"
            value={customDescription}
            disabled={disabled}
            onChange={(e) => onCustomDescriptionChange(e.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}
