import type { DriveStep } from "driver.js";
import { createHandoverTour } from "@/lib/handover-tour";

/** Placeholder steps for dev-only visual verification of tour theming. */
export const HANDOVER_TOUR_DEV_PREVIEW_STEPS: DriveStep[] = [
  {
    element: '[data-tour="generate-chooser"]',
    popover: {
      title: "Choose how to start",
      description: "Import from your PSA, add notes manually, or try demo data.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#handover-generate-outputs-btn",
    popover: {
      title: "Generate outputs",
      description: "When your notes are ready, generate client-ready deliverables in one click.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "#app-sidebar-nav",
    popover: {
      title: "Navigate the workspace",
      description: "Use the sidebar to move between Generate, Delivery Health, and the rest of Handover.",
      side: "right",
      align: "start",
    },
  },
];

function ensureGenerateOutputsVisible(): void {
  if (document.getElementById("handover-generate-outputs-btn")) return;
  document.querySelector<HTMLElement>('[data-tour="generate-manual-card"]')?.click();
}

function waitForElement(selector: string, attempts = 12): Promise<Element | null> {
  return new Promise((resolve) => {
    let remaining = attempts;
    const tick = () => {
      const el = document.querySelector(selector);
      if (el || remaining <= 0) {
        resolve(el);
        return;
      }
      remaining -= 1;
      requestAnimationFrame(tick);
    };
    tick();
  });
}

/** Dev-only: run a 3-step placeholder tour on the Generate page. */
export async function startHandoverTourDevPreview(): Promise<void> {
  if (process.env.NODE_ENV === "production") return;

  ensureGenerateOutputsVisible();
  await waitForElement("#handover-generate-outputs-btn");

  const tour = createHandoverTour({ steps: HANDOVER_TOUR_DEV_PREVIEW_STEPS });
  tour.drive();
}
