import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { StudyWorkspace } from "@/components/study-workspace";
import { Button } from "@/components/ui/button";

export default function DemoPage() {
  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[60] flex justify-start p-3">
        <Button
          asChild
          variant="secondary"
          size="sm"
          className="pointer-events-auto gap-1 shadow-md"
        >
          <Link href="/">
            <ArrowLeft className="size-4" aria-hidden />
            Home
          </Link>
        </Button>
      </div>
      <StudyWorkspace />
    </div>
  );
}
