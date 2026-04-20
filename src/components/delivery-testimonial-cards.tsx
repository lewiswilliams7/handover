"use client";

import { cn } from "@/lib/utils";

/** Two-column delivery testimonials - shared by homepage and pricing. */
export function DeliveryTestimonialCards({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-6 md:grid-cols-2", className)}>
      <div
        className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5 shadow-md sm:p-6 md:p-8"
        style={{
          boxShadow:
            "0 4px 24px -8px rgba(15, 23, 42, 0.12), 0 0 0 1px color-mix(in srgb, var(--accent) 12%, var(--border))",
        }}
      >
        <span className="block font-serif text-3xl leading-none text-[var(--accent)] md:text-5xl" aria-hidden>
          &ldquo;
        </span>
        <p className="-mt-1 text-[15px] font-medium leading-relaxed text-[var(--text-primary)] md:text-lg">
          A great concept with strong initial implementation. Exactly the kind of tool my team would use.
        </p>
        <p className="mt-5 text-sm text-[var(--text-muted)]">
          {" - Data &amp; AI Project Manager, IBM"}
        </p>
      </div>
      <div
        className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5 shadow-md sm:p-6 md:p-8"
        style={{
          boxShadow:
            "0 4px 24px -8px rgba(15, 23, 42, 0.12), 0 0 0 1px color-mix(in srgb, var(--accent) 12%, var(--border))",
        }}
      >
        <span className="block font-serif text-3xl leading-none text-[var(--accent)] md:text-5xl" aria-hidden>
          &ldquo;
        </span>
        <p className="-mt-1 text-[15px] font-medium leading-relaxed text-[var(--text-primary)] md:text-lg">
          A focused, well-conceived product with genuine early traction and a founder who clearly understands
          their market.
        </p>
        <p className="mt-5 text-sm text-[var(--text-muted)]">
          {" - Project Manager &amp; Product Consultant"}
        </p>
      </div>
    </div>
  );
}
