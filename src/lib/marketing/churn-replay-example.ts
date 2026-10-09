import type { ChurnReplayResult } from "@/lib/psa/churn-replay";

/**
 * Illustrative Churn Replay used on marketing pages. Invented clients and
 * figures, shaped exactly like a real result so the page shows the real panel.
 */
export const CHURN_REPLAY_EXAMPLE: ChurnReplayResult = {
  version: 1,
  generatedAt: "2026-10-01T00:00:00.000Z",
  windowStart: "2025-10-01",
  windowEnd: "2026-10-01",
  checkpointDays: [150, 120, 90, 60, 30],
  sources: { contracts: true, billing: true, activity: true },
  summary: {
    detected: 4,
    lostClients: 4,
    flagged: 3,
    missed: 1,
    insufficientHistory: 0,
    replayable: 4,
    lostAnnualValue: 98400,
    flaggedAnnualValue: 79200,
    clientsWithValue: 4,
    medianDaysWarning: 90,
    retainedChecked: 52,
    retainedFlagged: 7,
  },
  clients: [
    {
      clientId: 101,
      clientName: "Northgate Logistics",
      lossSignal: "contract_ended",
      lossDate: "2026-08-31",
      monthlyValue: 3200,
      outcome: "flagged",
      daysWarning: 120,
      firstFlaggedAt: "2026-05-03",
      ticketsBeforeLoss: 214,
      findings: [
        {
          type: "response_drift",
          drivers: [
            {
              fact: "6.5h median first response in the last 3 months, against a baseline of 1.2h",
              value: 6.5,
              baseline: 1.2,
              unit: "hours",
            },
          ],
        },
        {
          type: "backlog_growth",
          drivers: [
            {
              fact: "14 open tickets a month recently, against 5 a month before",
              value: 14,
              baseline: 5,
              unit: "open_per_month",
            },
          ],
        },
      ],
    },
    {
      clientId: 102,
      clientName: "Harbour Dental Group",
      lossSignal: "billing_ended",
      lossDate: "2026-07-31",
      monthlyValue: 1950,
      outcome: "flagged",
      daysWarning: 90,
      firstFlaggedAt: "2026-05-02",
      ticketsBeforeLoss: 131,
      findings: [
        {
          type: "contact_gap",
          drivers: [
            {
              fact: "4 tickets a month recently, against 17 a month in the earlier period",
              value: 4,
              baseline: 17,
              unit: "tickets_per_month",
            },
          ],
        },
      ],
    },
    {
      clientId: 103,
      clientName: "Pennine Accountants",
      lossSignal: "contract_ended",
      lossDate: "2026-06-30",
      monthlyValue: 1450,
      outcome: "flagged",
      daysWarning: 60,
      firstFlaggedAt: "2026-05-01",
      ticketsBeforeLoss: 88,
      findings: [
        {
          type: "resolution_time_trend",
          drivers: [
            {
              fact: "41h median resolution time in the last 3 months, against 9h before",
              value: 41,
              baseline: 9,
              unit: "hours",
            },
          ],
        },
      ],
    },
    {
      clientId: 104,
      clientName: "Brookside Veterinary",
      lossSignal: "contract_ended",
      lossDate: "2026-04-30",
      monthlyValue: 1600,
      outcome: "missed",
      daysWarning: null,
      firstFlaggedAt: null,
      ticketsBeforeLoss: 96,
      findings: [],
    },
  ],
};
