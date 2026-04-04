import { PlannerShell } from "@/components/planner/planner-shell";

export default function Home() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? null;
  return <PlannerShell mapToken={token} />;
}
