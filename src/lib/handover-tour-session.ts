import type { Driver } from "driver.js";

import { createHandoverTour } from "@/lib/handover-tour";
import {
  buildOnboardingTourSteps,
  type BuildOnboardingTourStepsOptions,
} from "@/lib/handover-tour-steps";

export const HANDOVER_TOUR_STARTED_STORAGE_KEY = "handover_tour_started";

/** Wall-clock wait aligned with auto-fire polling (~40 × 50ms). */
export const HANDOVER_TOUR_ELEMENT_WAIT_MS = 2000;

/** Re-measure Step 2 spotlight after output panel entrance animations (~500ms). */
const HANDOVER_TOUR_STEP2_LAYOUT_CORRECTION_MS = 700;

/** Allow smooth scroll to finish before driver.js measures Step 1 target. */
const HANDOVER_TOUR_GENERATE_SCROLL_SETTLE_MS = 300;

let activeTour: Driver | null = null;
let awaitingGenerationAdvance = false;
let tourCompletionHandler: (() => void) | null = null;
let tourEndNotified = false;
let suppressTourCompletion = false;

export function registerHandoverTourCompletionHandler(handler: () => void): void {
  tourCompletionHandler = handler;
}

export function isHandoverTourActive(): boolean {
  return activeTour?.isActive() ?? false;
}

export function hasHandoverTourStartedThisSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(HANDOVER_TOUR_STARTED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markTourStartedThisSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(HANDOVER_TOUR_STARTED_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function waitForHandoverTourElement(
  selector: string,
  timeoutMs = HANDOVER_TOUR_ELEMENT_WAIT_MS,
): Promise<Element | null> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const tick = () => {
      const el = document.querySelector(selector);
      if (el) {
        resolve(el);
        return;
      }
      if (Date.now() >= deadline) {
        resolve(null);
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function notifyTourEnd(): void {
  if (tourEndNotified) return;
  tourEndNotified = true;
  tourCompletionHandler?.();
  tourCompletionHandler = null;
}

function destroyActiveTourWithoutCompletion(): void {
  if (!activeTour?.isActive()) {
    activeTour = null;
    awaitingGenerationAdvance = false;
    tourCompletionHandler = null;
    return;
  }
  suppressTourCompletion = true;
  activeTour.destroy();
}

export async function startHandoverProductTour(
  options: BuildOnboardingTourStepsOptions = {},
): Promise<Driver | null> {
  const steps = buildOnboardingTourSteps(options);
  if (steps.length === 0) return null;

  if (activeTour?.isActive()) {
    activeTour.destroy();
  }
  activeTour = null;
  awaitingGenerationAdvance = false;
  tourEndNotified = false;
  awaitingGenerationAdvance = options.includeGenerateStep !== false;

  markTourStartedThisSession();

  activeTour = createHandoverTour({
    steps,
    onDestroyed: () => {
      activeTour = null;
      awaitingGenerationAdvance = false;
      if (suppressTourCompletion) {
        suppressTourCompletion = false;
        tourCompletionHandler = null;
        return;
      }
      notifyTourEnd();
    },
    onCloseClick: (_element, _step, { driver: tourDriver }) => {
      tourDriver.destroy();
    },
  });

  if (options.includeGenerateStep !== false) {
    const generateBtn = document.getElementById("handover-generate-outputs-btn");
    if (generateBtn) {
      generateBtn.scrollIntoView({ behavior: "smooth", block: "center" });
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, HANDOVER_TOUR_GENERATE_SCROLL_SETTLE_MS);
      });
    }
  }

  activeTour.drive(0);
  return activeTour;
}

export async function advanceHandoverTourAfterGeneration(): Promise<void> {
  if (!activeTour?.isActive() || !awaitingGenerationAdvance) return;

  awaitingGenerationAdvance = false;

  const [tabsEl, badgeEl] = await Promise.all([
    waitForHandoverTourElement('[data-tour="output-tabs-region"]'),
    waitForHandoverTourElement('[data-tour="report-quality-badge"]'),
  ]);

  if (!activeTour?.isActive()) return;

  if (!tabsEl && !badgeEl) {
    destroyActiveTourWithoutCompletion();
    return;
  }

  activeTour.refresh();
  if (activeTour.getActiveIndex() === 0) {
    activeTour.moveNext();
    window.setTimeout(() => {
      if (!activeTour?.isActive()) return;
      if (activeTour.getActiveIndex() !== 1) return;
      activeTour.refresh();
    }, HANDOVER_TOUR_STEP2_LAYOUT_CORRECTION_MS);
  }
}
