"use client";

import { FlaskConical } from "lucide-react";

import { DEMO_DISCLAIMER } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  onConnectPSA?: () => void;
  className?: string;
};

export function DemoBanner({ onConnectPSA, className }: Props) {
  return (
    <div
      className={cn(
        "w-full rounded-[var(--radius)] border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-amber-400",
        className,
      )}
      role="status"
      aria-label="Demo data disclaimer"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex min-w-0 items-center gap-2 truncate text-[12px] font-medium sm:text-[13px]">
          <FlaskConical className="size-4 shrink-0" />
          <span className="truncate">{DEMO_DISCLAIMER}</span>
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 shrink-0 px-2 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/15 hover:text-amber-200"
          onClick={() => onConnectPSA?.()}
        >
          Connect PSA
        </Button>
      </div>
    </div>
  );
}
