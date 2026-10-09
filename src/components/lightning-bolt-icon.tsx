import { cn } from "@/lib/utils";

export function LightningBoltIcon({ className }: { className?: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}
