"use client";

import Link from "next/link";
import { Database } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description: string;
  showButton?: boolean;
};

export function PSAEmptyState({ title, description, showButton = true }: Props) {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] px-4 py-12 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)]">
        <Database className="size-5" aria-hidden />
      </div>
      <p className="mt-3 text-[15px] font-bold text-[var(--text-primary)]">{title}</p>
      <p className="mx-auto mt-1 max-w-xl text-[13px] text-[var(--text-muted)]">{description}</p>
      {showButton ? (
        <div className="mt-4">
          <Link href="/?openSettings=integrations">
            <Button type="button" className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]">
              Connect your PSA
            </Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

