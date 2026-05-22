import { UserPreferencesForm } from "@/components/user-preferences-form";

export default function PreferencesPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4 p-6 md:p-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Planner profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preferences for pre-feasibility answers — project types, scale, and how you like risks framed.
        </p>
      </div>
      <UserPreferencesForm />
    </div>
  );
}
