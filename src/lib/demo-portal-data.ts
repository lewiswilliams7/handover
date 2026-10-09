import type { PortalData, PortalReportRow } from "@/components/portal-customer/portal-customer-dashboard";

const LAST_UPDATED = new Date().toISOString();

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function daysFromNowYmd(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const ACME_LEGAL_DATA: PortalData = {
  lastUpdated: LAST_UPDATED,
  rag: "red",
  tickets: [
    {
      id: 1014,
      summary: "Osprey case management upgrade — SQL migration",
      status: "Awaiting Client",
      priority: "High",
      engineer: "Jamie Clarke",
      lastUpdated: daysAgoIso(1),
      notes: [
        {
          date: daysAgoIso(2),
          author: "Jamie Clarke",
          content: "Staging migration completed successfully. Performance testing passed.",
        },
        {
          date: daysAgoIso(1),
          author: "Jamie Clarke",
          content: "Partner sign-off email sent. Chasing Friday if no response.",
        },
      ],
    },
    {
      id: 1015,
      summary: "Ransomware alert — isolated endpoint investigation",
      status: "Resolved",
      priority: "Critical",
      engineer: "Alex Thompson",
      lastUpdated: daysAgoIso(2),
      notes: [
        {
          date: daysAgoIso(2),
          author: "Alex Thompson",
          content:
            "Confirmed false positive — legitimate Osprey process flagged by updated AV signatures. Endpoint restored.",
        },
      ],
    },
    {
      id: 1017,
      summary: "Document management — iManage Cloud migration planning",
      status: "In Progress",
      priority: "Low",
      engineer: "Alex Thompson",
      lastUpdated: daysAgoIso(4),
      notes: [
        {
          date: daysAgoIso(4),
          author: "Alex Thompson",
          content: "Discovery meeting held. Data estate approx 4TB. Integration with Osprey confirmed supported.",
        },
      ],
    },
    {
      id: 1018,
      summary: "Email encryption — Mimecast deployment",
      status: "Scheduled",
      priority: "Medium",
      engineer: "Jamie Clarke",
      lastUpdated: daysAgoIso(1),
      notes: [
        {
          date: daysAgoIso(1),
          author: "Jamie Clarke",
          content: "Licences procured. Pilot group of 5 fee earners identified for initial deployment.",
        },
      ],
    },
    {
      id: 1016,
      summary: "Remote access setup — new paralegal",
      status: "Resolved",
      priority: "Medium",
      engineer: "Jamie Clarke",
      lastUpdated: daysAgoIso(3),
      notes: [
        {
          date: daysAgoIso(3),
          author: "Jamie Clarke",
          content: "All access provisioned. DPA training link sent. Confirmed with HR paralegal starts Monday.",
        },
      ],
    },
  ],
  projects: [
    {
      id: 201,
      name: "Mimecast email encryption rollout",
      status: "In Progress",
      percentComplete: 35,
      engineer: "Jamie Clarke",
      targetDate: daysFromNowYmd(10),
      notes: [
        {
          date: daysAgoIso(2),
          author: "Jamie Clarke",
          content: "Pilot group mail flow rules configured. Awaiting client approval to expand to all fee earners.",
        },
        {
          date: daysAgoIso(1),
          author: "Jamie Clarke",
          content: "Training session scheduled for pilot users next Tuesday.",
        },
      ],
    },
    {
      id: 202,
      name: "iManage Cloud discovery",
      status: "Scheduled",
      percentComplete: 15,
      engineer: "Alex Thompson",
      targetDate: daysFromNowYmd(30),
      notes: [
        {
          date: daysAgoIso(4),
          author: "Alex Thompson",
          content: "Discovery report draft shared with practice manager for review.",
        },
      ],
    },
  ],
  stats: {
    openTickets: 3,
    highPriority: 1,
    mediumPriority: 1,
    lowPriority: 1,
    activeProjects: 2,
    avgProjectProgress: 25,
    rag: "red",
    resolvedThisMonth: 2,
    monthlyVolume: {
      "2026-03": 4,
      "2026-04": 6,
      "2026-05": 5,
    },
  },
  recentActivity: [
    {
      date: daysAgoIso(1),
      author: "Jamie Clarke",
      summary: "Staging migration completed for Osprey upgrade — awaiting partner sign-off",
    },
    {
      date: daysAgoIso(2),
      author: "Alex Thompson",
      summary: "Ransomware alert closed as false positive; AV exception created",
    },
    {
      date: daysAgoIso(4),
      author: "Alex Thompson",
      summary: "iManage Cloud discovery meeting held — 4TB data estate confirmed",
    },
  ],
};

const DEFAULT_PORTAL_DATA: PortalData = {
  lastUpdated: LAST_UPDATED,
  rag: "green",
  tickets: [
    {
      id: 1001,
      summary: "Office 365 outbound email delivery failure",
      status: "In Progress",
      priority: "High",
      engineer: "Alex Thompson",
      lastUpdated: daysAgoIso(1),
      notes: [
        {
          date: daysAgoIso(2),
          author: "Alex Thompson",
          content: "SPF record updated to include new mail relay. Monitoring delivery for 24h.",
        },
        {
          date: daysAgoIso(1),
          author: "Alex Thompson",
          content: "Two further bounce reports received. Escalating monitoring window.",
        },
      ],
    },
    {
      id: 1002,
      summary: "MFA rollout — hardware tokens for remote workers",
      status: "Awaiting Client",
      priority: "Medium",
      engineer: "Jamie Clarke",
      lastUpdated: daysAgoIso(7),
      notes: [
        {
          date: daysAgoIso(7),
          author: "Jamie Clarke",
          content: "Sent procurement options to IT manager. Awaiting sign-off. Suggested YubiKey 5 NFC.",
        },
      ],
    },
    {
      id: 1003,
      summary: "SharePoint Phase 2 migration — archive library",
      status: "Scheduled",
      priority: "Medium",
      engineer: "Alex Thompson",
      lastUpdated: daysAgoIso(1),
      notes: [
        {
          date: daysAgoIso(1),
          author: "Alex Thompson",
          content: "Phase 1 verified complete. Phase 2 migration window booked for Monday.",
        },
      ],
    },
    {
      id: 1004,
      summary: "Printer offline — production floor",
      status: "Resolved",
      priority: "High",
      engineer: "Jamie Clarke",
      lastUpdated: daysAgoIso(1),
      notes: [
        {
          date: daysAgoIso(1),
          author: "Jamie Clarke",
          content: "Port replaced on switch. Printer online and test pages printing successfully.",
        },
      ],
    },
  ],
  projects: [
    {
      id: 101,
      name: "SharePoint archive migration",
      status: "In Progress",
      percentComplete: 62,
      engineer: "Alex Thompson",
      targetDate: daysFromNowYmd(14),
      notes: [
        {
          date: daysAgoIso(3),
          author: "Alex Thompson",
          content: "847GB migrated in Phase 1. Permissions validated on migrated content.",
        },
        {
          date: daysAgoIso(1),
          author: "Alex Thompson",
          content: "Archive library scan complete — estimated 1.2TB for Phase 2.",
        },
      ],
    },
  ],
  stats: {
    openTickets: 3,
    highPriority: 1,
    mediumPriority: 2,
    lowPriority: 0,
    activeProjects: 1,
    avgProjectProgress: 62,
    rag: "green",
    resolvedThisMonth: 1,
    monthlyVolume: {
      "2026-03": 5,
      "2026-04": 7,
      "2026-05": 4,
    },
  },
  recentActivity: [
    {
      date: daysAgoIso(1),
      author: "Alex Thompson",
      summary: "SharePoint Phase 2 migration window booked for Monday",
    },
    {
      date: daysAgoIso(2),
      author: "Alex Thompson",
      summary: "SPF record updated — monitoring outbound email delivery",
    },
  ],
};

const DEMO_REPORTS: PortalReportRow[] = [
  {
    id: "demo-1",
    title: "Monthly Service Review — May 2026",
    created_at: daysAgoIso(5),
    content: {
      period: "May 2026",
      relationship_health: "green",
      account_narrative:
        "Northwood Manufacturing's account is performing well this period. SharePoint Phase 1 migration is complete and Phase 2 is scheduled for next week. Office 365 email delivery has been stabilised following SPF remediation. The MFA rollout is progressing with hardware tokens on order for remaining remote users.",
      key_achievements: [
        "SharePoint Phase 1 migration (847GB) completed and permissions validated",
        "Office 365 outbound email delivery restored following SPF record update",
        "NAS backup restored after VSS writer error — two consecutive successful overnight runs confirmed",
      ],
      open_risks: [
        "MFA hardware token delivery pending — three remote users remain without secure MFA until approval and delivery confirmed",
      ],
      recommended_actions: [
        "Confirm hardware token delivery date and chase procurement approval",
        "Monitor SharePoint Phase 2 migration scheduled for Monday and confirm completion",
      ],
    },
  },
  {
    id: "demo-2",
    title: "QBR Summary — Q2 2026",
    created_at: daysAgoIso(20),
    content: {
      period: "Q2 2026",
      relationship_health: "green",
      account_narrative:
        "Q2 2026 delivered strong service performance across active accounts. Ticket volume decreased 19% quarter on quarter with average response times improving. Two major infrastructure projects progressed to completion with no SLA breaches recorded. Key focus areas for Q3 include completing the MFA rollout and preparing for the annual Cyber Essentials recertification.",
      key_achievements: [
        "Zero SLA breaches recorded across all active tickets",
        "Ticket volume reduced 19% QoQ through improved first-contact resolution",
        "Two major infrastructure projects delivered on schedule",
      ],
      open_risks: [
        "MFA rollout incomplete — remote users remain exposed until hardware tokens delivered and configured",
      ],
      recommended_actions: [
        "Complete MFA rollout before end of Q3 to close security gap",
        "Begin Cyber Essentials recertification preparation in advance of renewal date",
      ],
    },
  },
];

const ACME_REPORTS: PortalReportRow[] = [
  {
    id: "demo-acme-1",
    title: "Monthly Service Review — May 2026",
    created_at: daysAgoIso(7),
    created_by: "Handover",
    content: {
      period: "May 2026",
      relationship_health: "red",
      account_narrative:
        "Acme Legal LLP's account requires attention this period. The Osprey SQL migration is production-ready but has been blocked by outstanding partner sign-off for three consecutive weeks, creating escalating delivery risk. Mimecast encryption deployment is progressing well with the pilot group identified and licences secured. The iManage Cloud migration remains in discovery phase with no blockers.",
      key_achievements: [
        "Osprey case management staging migration completed and performance tested successfully",
        "Mimecast encryption licences procured and pilot group of five fee earners identified",
        "iManage Cloud migration discovery phase completed — data volumes and integration requirements confirmed",
      ],
      open_risks: [
        "Osprey SQL migration blocked pending partner sign-off — production window at risk of further delay",
        "Cyber Essentials recertification deadline approaching with MFA outstanding on admin accounts",
      ],
      recommended_actions: [
        "Escalate Osprey partner sign-off to senior contact with hard deadline by 21 June",
        "Obtain IT manager approval and enable MFA on remaining admin accounts within one week",
        "Schedule account review call to discuss approval process improvements for future migrations",
      ],
    },
  },
];

export const DEMO_PORTAL_DATA: Record<string, PortalData> = {
  "Acme Legal LLP": ACME_LEGAL_DATA,
  "Bridgewater Council": {
    ...DEFAULT_PORTAL_DATA,
    rag: "amber",
    stats: {
      ...DEFAULT_PORTAL_DATA.stats,
      openTickets: DEFAULT_PORTAL_DATA.stats?.openTickets ?? 0,
      activeProjects: DEFAULT_PORTAL_DATA.stats?.activeProjects ?? 0,
      avgProjectProgress: DEFAULT_PORTAL_DATA.stats?.avgProjectProgress ?? 0,
      rag: "amber",
    },
  },
  "Osprey Financial": {
    ...DEFAULT_PORTAL_DATA,
    rag: "green",
    stats: {
      ...DEFAULT_PORTAL_DATA.stats,
      openTickets: DEFAULT_PORTAL_DATA.stats?.openTickets ?? 0,
      activeProjects: DEFAULT_PORTAL_DATA.stats?.activeProjects ?? 0,
      avgProjectProgress: DEFAULT_PORTAL_DATA.stats?.avgProjectProgress ?? 0,
      rag: "green",
    },
  },
  default: DEFAULT_PORTAL_DATA,
};

export const DEMO_PORTAL_REPORTS: Record<string, PortalReportRow[]> = {
  "Acme Legal LLP": ACME_REPORTS,
  default: DEMO_REPORTS,
};
