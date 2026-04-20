import { getPrefersReducedMotion } from "@/lib/prefers-reduced-motion";

/** ~2s of light confetti bursts; no-op when reduced motion. */
export async function celebrateFirstGeneration(): Promise<void> {
  if (typeof window === "undefined" || getPrefersReducedMotion()) return;
  const confetti = (await import("canvas-confetti")).default;
  const end = Date.now() + 2000;
  const tick = () => {
    confetti({
      particleCount: 24,
      spread: 60,
      startVelocity: 26,
      origin: { y: 0.55 },
      colors: ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24"],
    });
    if (Date.now() < end) {
      window.setTimeout(tick, 320);
    }
  };
  tick();
}
