export const isDemoData = true;

export const DEMO_DISCLAIMER =
  "⚠ You're viewing demo data. Connect your PSA to see your real tickets, projects and clients.";

type DemoNote = {
  id: number;
  note: string;
  dateoccurred: string;
  who: string;
};

type DemoTicket = {
  id: number;
  summary: string;
  details: string | null;
  status: { name: string };
  client: { name: string };
  agent: { name: string };
  dateoccurred: string;
  targetdate: string;
  timetaken: number;
  priority: { name: string };
  priorityLevel: 1 | 2 | 3;
  overdue: boolean;
  flagged: boolean;
  slaTargetSet?: boolean;
  notes: DemoNote[];
};

type DemoProject = {
  id: number;
  name: string;
  client: { name: string };
  status: { name: string };
  percentcomplete: number;
  completionpercent: number;
  dateoccurred: string;
  targetdate: string;
  timetaken: number;
  agent: { name: string };
  projectmanager: { name: string };
  description: string;
  slaTargetSet?: boolean;
  notes: [];
};

type DemoClient = {
  id: number;
  name: string;
  ticketCount: number;
  projectCount: number;
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function ymdDaysFromNow(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function demoNote(
  id: number,
  date: string,
  author: string,
  content: string,
): DemoNote {
  return { id, note: content, dateoccurred: date, who: author };
}

export const DEMO_TICKETS: DemoTicket[] = [
  {
    id: 1001,
    summary: "Office 365 email delivery failure - Contoso Ltd",
    details:
      "Client reporting emails not being delivered externally. SPF records may be misconfigured following recent DNS changes.",
    status: { name: "In Progress" },
    client: { name: "Contoso Ltd" },
    agent: { name: "Sarah Mitchell" },
    dateoccurred: isoDaysAgo(3),
    targetdate: ymdDaysFromNow(2),
    timetaken: 180,
    priority: { name: "High" },
    priorityLevel: 1,
    overdue: false,
    flagged: true,
    slaTargetSet: true,
    notes: [
      demoNote(
        1,
        "2026-05-19T09:15:00",
        "Sarah Mitchell",
        "Initial investigation complete. SPF record is failing validation — DNS changes made by client's IT team last week appear to have overwritten the existing SPF entry. Client has been notified and asked to provide DNS access.",
      ),
      demoNote(
        2,
        "2026-05-20T14:30:00",
        "Sarah Mitchell",
        "DNS access received. SPF record corrected and propagation confirmed. Running 24-hour monitoring to confirm delivery rates normalise before closing.",
      ),
      demoNote(
        3,
        "2026-05-21T09:00:00",
        "James Cooper",
        "Delivery rates confirmed normal. Client signed off. Awaiting formal confirmation from client contact before closing ticket.",
      ),
    ],
  },
  {
    id: 1002,
    summary: "Network switch failure - Floor 2 connectivity loss - Riverside Academy",
    details:
      "Floor 2 network switch has failed causing connectivity loss for approximately 40 users. Replacement unit required.",
    status: { name: "In Progress" },
    client: { name: "Riverside Academy" },
    agent: { name: "James Cooper" },
    dateoccurred: isoDaysAgo(2),
    targetdate: ymdDaysFromNow(1),
    timetaken: 240,
    priority: { name: "High" },
    priorityLevel: 1,
    overdue: false,
    flagged: true,
    slaTargetSet: true,
    notes: [
      demoNote(
        1,
        "2026-05-20T08:45:00",
        "James Cooper",
        "On-site investigation complete. Netgear GS748T switch on floor 2 has failed — no power, unit unresponsive. Replacement unit ordered from supplier. ETA tomorrow AM. Temporary connectivity provided to critical users via floor 1 switch uplink.",
      ),
      demoNote(
        2,
        "2026-05-21T10:00:00",
        "James Cooper",
        "Replacement switch arrived. Installation scheduled for this afternoon during lunch break to minimise disruption. VLAN configuration from failed unit has been backed up and will be restored to new hardware.",
      ),
    ],
  },
  {
    id: 1003,
    summary: "Azure AD Conditional Access policy blocking remote workers - Meridian Consulting",
    details:
      "Following security policy update, remote workers are being blocked by Conditional Access policies. Client needs to confirm which users require remote access before exclusions can be applied.",
    status: { name: "Awaiting Client" },
    client: { name: "Meridian Consulting" },
    agent: { name: "Rachel Turner" },
    dateoccurred: isoDaysAgo(4),
    targetdate: ymdDaysFromNow(5),
    timetaken: 120,
    priority: { name: "Medium" },
    priorityLevel: 2,
    overdue: false,
    flagged: false,
    slaTargetSet: true,
    notes: [
      demoNote(
        1,
        "2026-05-18T11:20:00",
        "Rachel Turner",
        "Root cause identified — new Conditional Access policy deployed last week requires compliant device. Several remote workers are on personal devices not enrolled in Intune. Two options available: (1) Enrol devices in Intune, (2) Create named location exclusion for approved home IP ranges. Awaiting client decision.",
      ),
      demoNote(
        2,
        "2026-05-20T09:30:00",
        "Rachel Turner",
        "Chased client for decision. Account manager has escalated internally. Expecting response by end of week. Affected users have been provided with temporary web-only access via browser as workaround.",
      ),
    ],
  },
  {
    id: 1004,
    summary: "Server backup failures - weekly backup job not completing - Hartley Manufacturing",
    details:
      "Weekly backup job for primary file server has been failing for 3 consecutive weeks. Backup software reporting VSS writer errors.",
    status: { name: "In Progress" },
    client: { name: "Hartley Manufacturing" },
    agent: { name: "Daniel Walsh" },
    dateoccurred: isoDaysAgo(8),
    targetdate: ymdDaysFromNow(3),
    timetaken: 300,
    priority: { name: "High" },
    priorityLevel: 1,
    overdue: false,
    flagged: false,
    slaTargetSet: true,
    notes: [
      demoNote(
        1,
        "2026-05-14T08:00:00",
        "Daniel Walsh",
        "VSS writer error confirmed — SQL VSS writer is in failed state following a SQL Server service crash 3 weeks ago. Re-registered VSS writers and restarted services. Running manual backup now to verify fix.",
      ),
      demoNote(
        2,
        "2026-05-14T12:30:00",
        "Daniel Walsh",
        "Manual backup completed successfully. Scheduled weekly backup re-enabled. Will monitor next automated run on Sunday night. Client informed of root cause and resolution.",
      ),
      demoNote(
        3,
        "2026-05-19T08:15:00",
        "Daniel Walsh",
        "Sunday backup completed successfully. Backup logs show full completion with no errors. Monitoring for a further week before closing. Client has been updated.",
      ),
    ],
  },
  {
    id: 1005,
    summary: "New starter onboarding - user account setup and device configuration - Apex Financial",
    details:
      "New employee starting Monday. Requires M365 account, laptop setup, MFA configuration, and access to shared drives and financial systems.",
    status: { name: "In Progress" },
    client: { name: "Apex Financial" },
    agent: { name: "Sarah Mitchell" },
    dateoccurred: isoDaysAgo(2),
    targetdate: ymdDaysFromNow(4),
    timetaken: 150,
    priority: { name: "Medium" },
    priorityLevel: 2,
    overdue: false,
    flagged: false,
    slaTargetSet: true,
    notes: [
      demoNote(
        1,
        "2026-05-19T14:00:00",
        "Sarah Mitchell",
        "M365 account created and licensed. MFA enrolled via Authenticator app. SharePoint and Teams access granted. Laptop imaging in progress — standard Apex Financial build being applied.",
      ),
      demoNote(
        2,
        "2026-05-20T16:00:00",
        "Sarah Mitchell",
        "Laptop build complete. Sage access requested from client's finance manager — awaiting approval. Device will be couriered to office Thursday for Monday start. All M365 configuration verified.",
      ),
    ],
  },
];

/** HaloPSA-shaped tickets for import modal and PSA caches. */
export function mapDemoTicketsToHaloTickets() {
  return DEMO_TICKETS.map((t) => ({
    id: t.id,
    summary: t.summary,
    details: t.details,
    status: t.status,
    client: t.client,
    agent: t.agent,
    dateoccurred: t.dateoccurred,
    targetdate: t.targetdate,
    timetaken: t.timetaken,
    priority: t.priority,
    notes: t.notes.map((n) => ({
      id: n.id,
      note: n.note,
      who: n.who,
      dateoccurred: n.dateoccurred,
    })),
  }));
}

export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: 2001,
    name: "Azure Tenant Migration",
    client: { name: "Contoso Ltd" },
    status: { name: "In Progress" },
    percentcomplete: 45,
    completionpercent: 45,
    dateoccurred: isoDaysAgo(24),
    targetdate: ymdDaysFromNow(12),
    timetaken: 420,
    agent: { name: "Sarah Mitchell" },
    projectmanager: { name: "Sarah Mitchell" },
    description: "Mailbox and identity migration to consolidated Azure tenant.",
    slaTargetSet: true,
    notes: [],
  },
  {
    id: 2002,
    name: "Network Infrastructure Refresh",
    client: { name: "Riverside Academy" },
    status: { name: "In Progress" },
    percentcomplete: 30,
    completionpercent: 30,
    dateoccurred: isoDaysAgo(20),
    targetdate: ymdDaysFromNow(9),
    timetaken: 480,
    agent: { name: "James Cooper" },
    projectmanager: { name: "James Cooper" },
    description: "Core and edge replacement across HQ and satellite sites.",
    slaTargetSet: true,
    notes: [],
  },
];

export const DEMO_CLIENTS: DemoClient[] = [
  { id: 1, name: "Contoso Ltd", ticketCount: 1, projectCount: 1 },
  { id: 2, name: "Riverside Academy", ticketCount: 1, projectCount: 1 },
  { id: 3, name: "Meridian Consulting", ticketCount: 1, projectCount: 0 },
  { id: 4, name: "Hartley Manufacturing", ticketCount: 1, projectCount: 0 },
  { id: 5, name: "Apex Financial", ticketCount: 1, projectCount: 0 },
];

export const DEMO_EXAMPLE_INPUT = `Service desk handover notes - mixed accounts this week.
Contoso Ltd: Office 365 external delivery failing after DNS change — SPF corrected, monitoring before close.
Riverside Academy: Floor 2 switch failed — replacement arriving, install scheduled lunch today.
Meridian Consulting: Conditional Access blocking remote workers — awaiting client decision on Intune vs IP exclusions.
Hartley Manufacturing: Weekly backup failures — VSS writer fixed, last Sunday run successful.
Apex Financial: New starter Monday — M365 and laptop ready, Sage access pending finance approval.`;
