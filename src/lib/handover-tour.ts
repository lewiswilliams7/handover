import { driver, type Config, type Driver } from "driver.js";

export const HANDOVER_TOUR_POPOVER_CLASS = "handover-tour-popover";

/** Shared driver.js defaults aligned with Handover design tokens. */
export const HANDOVER_TOUR_DEFAULT_CONFIG: Config = {
  animate: true,
  allowClose: true,
  overlayColor: "#0f1525",
  overlayOpacity: 0.72,
  stagePadding: 8,
  stageRadius: 12,
  popoverClass: HANDOVER_TOUR_POPOVER_CLASS,
  popoverOffset: 12,
  showProgress: true,
  progressText: "{{current}} of {{total}}",
  nextBtnText: "Next",
  prevBtnText: "Back",
  doneBtnText: "Done",
  showButtons: ["next", "previous", "close"],
};

export function createHandoverTour(config: Config = {}): Driver {
  const popoverClass = [HANDOVER_TOUR_POPOVER_CLASS, config.popoverClass].filter(Boolean).join(" ");

  return driver({
    ...HANDOVER_TOUR_DEFAULT_CONFIG,
    ...config,
    popoverClass,
  });
}
