import type { DriveStep } from "driver.js";

export type BuildOnboardingTourStepsOptions = {
  /** Step 1 — Generate button (onboarding auto-start only). Default true. */
  includeGenerateStep?: boolean;
  /** Steps 2–3 — output tabs and report quality (require a generation result). Default true. */
  includeOutputSteps?: boolean;
};

const STEP_GENERATE: DriveStep = {
  element: "#handover-generate-outputs-btn",
  disableActiveInteraction: false,
  popover: {
    title: "Let's generate your first report",
    description:
      "Click here — we'll use a sample client so you can see exactly what Handover produces.",
    side: "top",
    align: "center",
    showButtons: ["close"],
  },
};

const STEP_OUTPUT_TABS: DriveStep = {
  element: '[data-tour="output-tabs-region"]',
  popover: {
    title: "Five outputs, one click",
    description:
      "Every report gives you five client-ready outputs — actions, risks, summary, status report, and a client email — all generated together from the same ticket data.",
    side: "bottom",
    align: "start",
  },
};

const STEP_REPORT_QUALITY: DriveStep = {
  element: '[data-tour="report-quality-badge"]',
  popover: {
    title: "We never invent what isn't there",
    description:
      "This score reflects how complete your ticket data was. If something's thin, we tell you — not guess.",
    side: "bottom",
    align: "start",
  },
};

const STEP_CLIENT_INTELLIGENCE: DriveStep = {
  element: '[data-tour="nav-client-intelligence"]',
  popover: {
    title: "Your portfolio, watched automatically",
    description:
      "Client Intelligence tracks account health, risks, and trends across every client — without you lifting a finger.",
    side: "right",
    align: "start",
  },
};

const STEP_SCHEDULED: DriveStep = {
  element: '[data-tour="nav-scheduled"]',
  popover: {
    title: "Set it once, it runs itself",
    description:
      "Schedule reports to send automatically. Want a final check first? Approvals holds them for your sign-off before anything goes out.",
    side: "right",
    align: "start",
  },
};

export function buildOnboardingTourSteps(
  options: BuildOnboardingTourStepsOptions = {},
): DriveStep[] {
  const { includeGenerateStep = true, includeOutputSteps = true } = options;
  const steps: DriveStep[] = [];

  if (includeGenerateStep) steps.push(STEP_GENERATE);
  if (includeOutputSteps) steps.push(STEP_OUTPUT_TABS, STEP_REPORT_QUALITY);
  steps.push(STEP_CLIENT_INTELLIGENCE, STEP_SCHEDULED);

  return steps;
}
