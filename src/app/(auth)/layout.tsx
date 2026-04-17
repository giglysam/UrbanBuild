import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <div className="mx-auto w-full max-w-md px-4 pt-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1 text-muted-foreground hover:text-foreground">
          <Link href="/">
            <ArrowLeft className="size-4" aria-hidden />
            Home
          </Link>
        </Button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-4">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
