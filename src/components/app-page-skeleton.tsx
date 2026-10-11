/**
 * Instant placeholder for server-rendered app pages, shown by loading.tsx
 * while scan data loads, so navigation never shows a blank screen.
 */
export function AppPageSkeleton({ cards = 4, rows = 3 }: { cards?: number; rows?: number }) {
  return (
    <main className="min-h-screen px-4 pb-16 sm:px-6 lg:px-10" aria-busy="true" aria-label="Loading">
      <div className="mx-auto max-w-6xl animate-pulse motion-reduce:animate-none">
        <div className="h-3 w-24 rounded bg-white/10" />
        <div className="mt-3 h-9 w-2/3 max-w-xl rounded-lg bg-white/10" />
        <div className="mt-3 h-4 w-1/2 max-w-md rounded bg-white/[0.06]" />
        <div className={`mt-8 grid gap-3 sm:grid-cols-2 ${cards >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          {Array.from({ length: cards }, (_, index) => (
            <div key={index} className="h-[98px] rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
          ))}
        </div>
        <div className="mt-8 space-y-3">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="h-28 rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
          ))}
        </div>
      </div>
    </main>
  );
}
