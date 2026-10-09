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
      "Click here. We'll use a sample client so you can see exactly what Handover produces.",
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
      "Every report gives you five client-ready outputs: actions, risks, summary, status report and a client email, all from the same ticket data.",
    side: "bottom",
    align: "start",
  },
};

const STEP_REPORT_QUALITY: DriveStep = {
  element: '[data-tour="report-quality-badge"]',
  popover: {
    title: "We never invent what isn't there",
    description:
      "This score reflects how complete your ticket data was. If something's thin, we tell you rather than guess.",
    side: "bottom",
    align: "start",
  },
};

const STEP_REVENUE_AT_RISK: DriveStep = {
  element: '[data-tour="nav-revenue-at-risk"]',
  popover: {
    title: "Start each week here",
    description:
      "Revenue at Risk ranks every client whose service or relationship has changed, with the annual revenue it holds. Act on a flag and Handover tracks whether it cleared.",
    side: "right",
    align: "start",
  },
};

const STEP_CHURN_REPLAY: DriveStep = {
  element: '[data-tour="nav-churn-replay"]',
  popover: {
    title: "See what you could have kept",
    description:
      "Churn Replay rewinds your PSA to before each client you lost and shows whether Handover would have warned you, and how early.",
    side: "right",
    align: "start",
  },
};

const STEP_CLIENT_INTELLIGENCE: DriveStep = {
  element: '[data-tour="nav-client-intelligence"]',
  popover: {
    title: "Every client in one place",
    description:
      "Account history, health and the signals behind each flag, client by client.",
    side: "right",
    align: "start",
  },
};

const STEP_SCHEDULED: DriveStep = {
  element: '[data-tour="nav-scheduled"]',
  popover: {
    title: "Show your value on a schedule",
    description:
      "Service reviews and QBR packs go out automatically to the people who renew. Want a final check first? Approvals holds them for your sign-off.",
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
  steps.push(STEP_REVENUE_AT_RISK, STEP_CHURN_REPLAY, STEP_CLIENT_INTELLIGENCE, STEP_SCHEDULED);

  return steps;
}
