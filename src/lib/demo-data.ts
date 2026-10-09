export const isDemoData = true;

export const DEMO_DISCLAIMER =
  "⚠ You're viewing demo data. Connect your PSA to see your real tickets, projects and clients.";

type DemoNote = {
  id: number;
  note: string;
  dateoccurred?: string;
  date?: string;
  who: string;
};

type DemoTicket = {
  id: number;
  summary: string;
  details: string | null;
  status: { name: string };
  client: { id: number; name: string };
  agent: { name: string };
  dateoccurred: string;
  targetdate: string;
  target_date?: string;
  timetaken: number;
  priority: { name: string };
  priorityLevel?: 1 | 2 | 3;
  overdue?: boolean;
  flagged?: boolean;
  slaTargetSet?: boolean;
  sla_response_breached?: boolean;
  sla_resolution_breached?: boolean;
  sla_resolve_breached?: boolean;
  response_time_hours?: number;
  resolution_time_hours: number | null;
  notes: DemoNote[];
};

type DemoProject = {
  id: number;
  name: string;
  summary?: string;
  client: { name: string; id?: number };
  clientId?: number;
  status: { name: string };
  percentcomplete: number;
  completionpercent: number;
  dateoccurred?: string;
  targetdate: string;
  timetaken: number;
  agent?: { name: string };
  projectmanager: { name: string };
  description?: string;
  slaTargetSet?: boolean;
  notes?: [];
  tasks?: Array<{ id: number; status: string; name: string }>;
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

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function demoNote(
  id: number,
  date: string,
  author: string,
  content: string,
): DemoNote {
  return { id, note: content, dateoccurred: date, who: author };
}

export const DEMO_TICKETS = [

  // ── Northwood Manufacturing (8 tickets) ──────────────────────────────
  {
    id: 1001,
    summary: "Office 365 outbound email delivery failure — sales team",
    details: "Sales team reporting external emails not being received by clients. SPF record misconfiguration identified following DNS migration last week.",
    status: { name: "In Progress" },
    priority: { name: "High" },
    client: { id: 101, name: "Northwood Manufacturing" },
    agent: { name: "Alex Thompson" },
    startdate: isoDaysAgo(5),
    dateoccurred: isoDaysAgo(5),
    duedate: ymdDaysFromNow(2),
    targetdate: ymdDaysFromNow(2),
    timetaken: 180,
    slastate: "at_risk",
    resolution_time_hours: null,
    notes: [
      { id: 9001, note: "SPF record updated to include new mail relay. Monitoring delivery for 24h before closing.", who: "Alex Thompson", dateoccurred: isoDaysAgo(2) },
      { id: 9002, note: "Two further bounce reports received from Hartigan & Co. Escalating monitoring window.", who: "Alex Thompson", dateoccurred: isoDaysAgo(1) },
    ],
  },
  {
    id: 1002,
    summary: "MFA rollout — hardware tokens for remote workers",
    details: "Phase 2 of MFA rollout requires hardware tokens for 3 remote users who do not have smartphones. Procurement approval needed from client.",
    status: { name: "Awaiting Client" },
    priority: { name: "Medium" },
    client: { id: 101, name: "Northwood Manufacturing" },
    agent: { name: "Jamie Clarke" },
    startdate: isoDaysAgo(10),
    dateoccurred: isoDaysAgo(10),
    duedate: ymdDaysFromNow(7),
    targetdate: ymdDaysFromNow(7),
    timetaken: 90,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9003, note: "Sent procurement options to IT manager. Awaiting sign-off. Suggested YubiKey 5 NFC.", who: "Jamie Clarke", dateoccurred: isoDaysAgo(7) },
    ],
  },
  {
    id: 1003,
    summary: "SharePoint Phase 2 migration — archive document library",
    details: "Phase 1 complete (847GB migrated). Phase 2 covers archive library estimated at 1.2TB. Scheduled to begin next week.",
    status: { name: "Scheduled" },
    priority: { name: "Medium" },
    client: { id: 101, name: "Northwood Manufacturing" },
    agent: { name: "Alex Thompson" },
    startdate: isoDaysAgo(3),
    dateoccurred: isoDaysAgo(3),
    duedate: ymdDaysFromNow(14),
    targetdate: ymdDaysFromNow(14),
    timetaken: 420,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9004, note: "Phase 1 verified complete. Permissions validated on migrated content. Phase 2 migration window booked for Monday.", who: "Alex Thompson", dateoccurred: isoDaysAgo(1) },
    ],
  },
  {
    id: 1004,
    summary: "Printer offline — production floor Building 3",
    details: "HP LaserJet on production floor reporting offline. Likely network port fault following weekend cable works.",
    status: { name: "Resolved" },
    priority: { name: "High" },
    client: { id: 101, name: "Northwood Manufacturing" },
    agent: { name: "Jamie Clarke" },
    startdate: isoDaysAgo(2),
    dateoccurred: isoDaysAgo(2),
    duedate: isoDaysAgo(1),
    targetdate: isoDaysAgo(1),
    timetaken: 60,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9005, note: "Port replaced on switch. Printer online and test pages printing successfully. Closed.", who: "Jamie Clarke", dateoccurred: isoDaysAgo(1) },
    ],
  },
  {
    id: 1005,
    summary: "New starter onboarding — Production Manager",
    details: "New Production Manager starting Monday. Requires M365 account, laptop build, ERP access (Sage 200), and VPN profile.",
    status: { name: "In Progress" },
    priority: { name: "Medium" },
    client: { id: 101, name: "Northwood Manufacturing" },
    agent: { name: "Alex Thompson" },
    startdate: isoDaysAgo(1),
    dateoccurred: isoDaysAgo(1),
    duedate: ymdDaysFromNow(3),
    targetdate: ymdDaysFromNow(3),
    timetaken: 120,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9006, note: "M365 account created, laptop imaging in progress. Sage 200 access request sent to finance.", who: "Alex Thompson", dateoccurred: isoDaysAgo(1) },
    ],
  },
  {
    id: 1006,
    summary: "Backup failure — NAS unit server room",
    details: "Scheduled backup jobs failing since Tuesday. VSS writer error on SQL instance. Last successful backup 4 days ago.",
    status: { name: "In Progress" },
    priority: { name: "High" },
    client: { id: 101, name: "Northwood Manufacturing" },
    agent: { name: "Jamie Clarke" },
    startdate: isoDaysAgo(4),
    dateoccurred: isoDaysAgo(4),
    duedate: ymdDaysFromNow(1),
    targetdate: ymdDaysFromNow(1),
    timetaken: 150,
    slastate: "at_risk",
    resolution_time_hours: null,
    notes: [
      { id: 9007, note: "VSS writer restarted, backup job rerun manually — completed successfully. Monitoring overnight job.", who: "Jamie Clarke", dateoccurred: isoDaysAgo(1) },
    ],
  },
  {
    id: 1007,
    summary: "Conditional Access policy blocking CAD software licence server",
    details: "CAD workstations unable to reach licence server after Conditional Access policy update. 6 engineers affected.",
    status: { name: "Resolved" },
    priority: { name: "High" },
    client: { id: 101, name: "Northwood Manufacturing" },
    agent: { name: "Alex Thompson" },
    startdate: isoDaysAgo(6),
    dateoccurred: isoDaysAgo(6),
    duedate: isoDaysAgo(5),
    targetdate: isoDaysAgo(5),
    timetaken: 95,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9008, note: "IP exclusion added for licence server subnet. All 6 workstations confirmed operational. Policy documentation updated.", who: "Alex Thompson", dateoccurred: isoDaysAgo(5) },
    ],
  },
  {
    id: 1008,
    summary: "WiFi dead spots — warehouse expansion area",
    details: "New warehouse extension has no WiFi coverage. Handheld scanners unable to connect. 2 additional APs required.",
    status: { name: "Awaiting Parts" },
    priority: { name: "Medium" },
    client: { id: 101, name: "Northwood Manufacturing" },
    agent: { name: "Jamie Clarke" },
    startdate: isoDaysAgo(8),
    dateoccurred: isoDaysAgo(8),
    duedate: ymdDaysFromNow(5),
    targetdate: ymdDaysFromNow(5),
    timetaken: 60,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9009, note: "Site survey completed. 2x Ubiquiti U6-Pro ordered. Estimated delivery Thursday.", who: "Jamie Clarke", dateoccurred: isoDaysAgo(3) },
    ],
  },

  // ── Bridgewater Council (5 tickets) ──────────────────────────────────
  {
    id: 1009,
    summary: "Fortigate 200F firewall migration — pre-migration checks",
    details: "Full firewall replacement scheduled Saturday 14 June. Pre-migration config review, VPN documentation, and change request approval required.",
    status: { name: "In Progress" },
    priority: { name: "High" },
    client: { id: 102, name: "Bridgewater Council" },
    agent: { name: "Alex Thompson" },
    startdate: isoDaysAgo(7),
    dateoccurred: isoDaysAgo(7),
    duedate: ymdDaysFromNow(4),
    targetdate: ymdDaysFromNow(4),
    timetaken: 310,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9010, note: "VPN tunnels documented (14 site-to-site). Change request submitted and approved by IT governance board.", who: "Alex Thompson", dateoccurred: isoDaysAgo(2) },
      { id: 9011, note: "Pre-migration config review complete. No blockers. Rollback plan confirmed with client.", who: "Alex Thompson", dateoccurred: isoDaysAgo(1) },
    ],
  },
  {
    id: 1010,
    summary: "Planning department — slow file server access",
    details: "Planning team reporting 30-60 second delays accessing shared drives. Issue began after server patching 2 weeks ago.",
    status: { name: "In Progress" },
    priority: { name: "Medium" },
    client: { id: 102, name: "Bridgewater Council" },
    agent: { name: "Jamie Clarke" },
    startdate: isoDaysAgo(9),
    dateoccurred: isoDaysAgo(9),
    duedate: ymdDaysFromNow(3),
    targetdate: ymdDaysFromNow(3),
    timetaken: 180,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9012, note: "Identified SMB signing negotiation delay caused by patch KB5034441. Testing registry fix in dev environment.", who: "Jamie Clarke", dateoccurred: isoDaysAgo(3) },
    ],
  },
  {
    id: 1011,
    summary: "Council website SSL certificate expiry warning",
    details: "SSL certificate for council public website expires in 18 days. Renewal required to avoid public-facing security warning.",
    status: { name: "Scheduled" },
    priority: { name: "High" },
    client: { id: 102, name: "Bridgewater Council" },
    agent: { name: "Alex Thompson" },
    startdate: isoDaysAgo(1),
    dateoccurred: isoDaysAgo(1),
    duedate: ymdDaysFromNow(12),
    targetdate: ymdDaysFromNow(12),
    timetaken: 30,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9013, note: "Certificate renewal initiated via DigiCert portal. Validation email sent to council webmaster.", who: "Alex Thompson", dateoccurred: isoDaysAgo(1) },
    ],
  },
  {
    id: 1012,
    summary: "Remote working — councillor VPN access issues",
    details: "3 councillors unable to connect to VPN from home. Likely certificate issue following recent PKI changes.",
    status: { name: "Resolved" },
    priority: { name: "Medium" },
    client: { id: 102, name: "Bridgewater Council" },
    agent: { name: "Jamie Clarke" },
    startdate: isoDaysAgo(4),
    dateoccurred: isoDaysAgo(4),
    duedate: isoDaysAgo(2),
    targetdate: isoDaysAgo(2),
    timetaken: 120,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9014, note: "New client certificates issued and installed remotely for all 3 councillors. VPN connectivity confirmed.", who: "Jamie Clarke", dateoccurred: isoDaysAgo(2) },
    ],
  },
  {
    id: 1013,
    summary: "CCTV system upgrade — town centre cameras",
    details: "Legacy CCTV NVR reaching end of life. Replacement with IP camera system and new NVR. 12 cameras across 4 locations.",
    status: { name: "Awaiting Client" },
    priority: { name: "Low" },
    client: { id: 102, name: "Bridgewater Council" },
    agent: { name: "Alex Thompson" },
    startdate: isoDaysAgo(14),
    dateoccurred: isoDaysAgo(14),
    duedate: ymdDaysFromNow(21),
    targetdate: ymdDaysFromNow(21),
    timetaken: 90,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9015, note: "Quotation submitted. Awaiting council procurement approval. Budget confirmed verbally.", who: "Alex Thompson", dateoccurred: isoDaysAgo(5) },
    ],
  },

  // ── Acme Legal LLP (5 tickets) ────────────────────────────────────────
  {
    id: 1014,
    summary: "Osprey case management upgrade — SQL migration",
    details: "Major version upgrade of Osprey case management system. SQL database migration required. Partner sign-off needed before production deployment.",
    status: { name: "Awaiting Client" },
    priority: { name: "High" },
    client: { id: 103, name: "Acme Legal LLP" },
    agent: { name: "Jamie Clarke" },
    startdate: isoDaysAgo(11),
    dateoccurred: isoDaysAgo(11),
    duedate: ymdDaysFromNow(5),
    targetdate: ymdDaysFromNow(5),
    timetaken: 380,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9016, note: "Staging migration completed successfully. Performance testing passed. Production window proposed for Thursday evening.", who: "Jamie Clarke", dateoccurred: isoDaysAgo(2) },
      { id: 9017, note: "Partner sign-off email sent. Chasing Friday if no response.", who: "Jamie Clarke", dateoccurred: isoDaysAgo(1) },
    ],
  },
  {
    id: 1015,
    summary: "Ransomware alert — isolated endpoint investigation",
    details: "Suspicious process detected on paralegal workstation. Endpoint isolated. Forensic investigation underway. No lateral movement detected.",
    status: { name: "Resolved" },
    priority: { name: "Critical" },
    client: { id: 103, name: "Acme Legal LLP" },
    agent: { name: "Alex Thompson" },
    startdate: isoDaysAgo(3),
    dateoccurred: isoDaysAgo(3),
    duedate: isoDaysAgo(3),
    targetdate: isoDaysAgo(3),
    timetaken: 240,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9018, note: "Confirmed false positive — legitimate Osprey process flagged by updated AV signatures. Endpoint restored. AV exception created.", who: "Alex Thompson", dateoccurred: isoDaysAgo(2) },
    ],
  },
  {
    id: 1016,
    summary: "Remote access setup — new paralegal",
    details: "New paralegal joining Monday. Requires M365 account, Osprey access, remote desktop profile, and DPA training completion tracking.",
    status: { name: "Resolved" },
    priority: { name: "Medium" },
    client: { id: 103, name: "Acme Legal LLP" },
    agent: { name: "Jamie Clarke" },
    startdate: isoDaysAgo(5),
    dateoccurred: isoDaysAgo(5),
    duedate: isoDaysAgo(3),
    targetdate: isoDaysAgo(3),
    timetaken: 90,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9019, note: "All access provisioned. DPA training link sent. Confirmed with HR paralegal starts Monday.", who: "Jamie Clarke", dateoccurred: isoDaysAgo(3) },
    ],
  },
  {
    id: 1017,
    summary: "Document management — iManage Cloud migration planning",
    details: "Acme Legal exploring migration from on-premise DMS to iManage Cloud. Discovery phase — data volumes, integration requirements, and timeline.",
    status: { name: "In Progress" },
    priority: { name: "Low" },
    client: { id: 103, name: "Acme Legal LLP" },
    agent: { name: "Alex Thompson" },
    startdate: isoDaysAgo(12),
    dateoccurred: isoDaysAgo(12),
    duedate: ymdDaysFromNow(30),
    targetdate: ymdDaysFromNow(30),
    timetaken: 180,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9020, note: "Discovery meeting held. Data estate approx 4TB. Integration with Osprey confirmed supported. Report being prepared.", who: "Alex Thompson", dateoccurred: isoDaysAgo(4) },
    ],
  },
  {
    id: 1018,
    summary: "Email encryption — Mimecast deployment",
    details: "Regulatory requirement for encrypted email on client communications. Mimecast Content Control and Encryption being deployed.",
    status: { name: "Scheduled" },
    priority: { name: "Medium" },
    client: { id: 103, name: "Acme Legal LLP" },
    agent: { name: "Jamie Clarke" },
    startdate: isoDaysAgo(2),
    dateoccurred: isoDaysAgo(2),
    duedate: ymdDaysFromNow(10),
    targetdate: ymdDaysFromNow(10),
    timetaken: 60,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9021, note: "Licences procured. Pilot group of 5 fee earners identified for initial deployment.", who: "Jamie Clarke", dateoccurred: isoDaysAgo(1) },
    ],
  },

  // ── Ashfield Energy Ltd (4 tickets) ──────────────────────────────────
  {
    id: 1019,
    summary: "Teams Direct Routing — number porting in progress",
    details: "Migration from legacy PBX to Microsoft Teams Direct Routing. Number porting submitted to carrier. SBC configured.",
    status: { name: "In Progress" },
    priority: { name: "High" },
    client: { id: 104, name: "Ashfield Energy Ltd" },
    agent: { name: "Alex Thompson" },
    startdate: isoDaysAgo(14),
    dateoccurred: isoDaysAgo(14),
    duedate: ymdDaysFromNow(9),
    targetdate: ymdDaysFromNow(9),
    timetaken: 520,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9022, note: "Carrier confirmed porting date 14 June. User training sessions booked for week commencing 9 June.", who: "Alex Thompson", dateoccurred: isoDaysAgo(3) },
    ],
  },
  {
    id: 1020,
    summary: "SCADA network isolation — OT/IT boundary review",
    details: "Annual review of SCADA network segmentation. Ensuring OT network remains isolated from corporate IT. Compliance requirement.",
    status: { name: "Resolved" },
    priority: { name: "High" },
    client: { id: 104, name: "Ashfield Energy Ltd" },
    agent: { name: "Jamie Clarke" },
    startdate: isoDaysAgo(10),
    dateoccurred: isoDaysAgo(10),
    duedate: isoDaysAgo(5),
    targetdate: isoDaysAgo(5),
    timetaken: 300,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9023, note: "Full boundary audit completed. 2 unauthorised cross-connections found and removed. Compliance report issued to HSSEQ team.", who: "Jamie Clarke", dateoccurred: isoDaysAgo(5) },
    ],
  },
  {
    id: 1021,
    summary: "Laptop replacement — field operations team",
    details: "4 laptops for field operations team reaching end of life. Replacement Panasonic Toughbooks specified. Ordering and build required.",
    status: { name: "Awaiting Parts" },
    priority: { name: "Medium" },
    client: { id: 104, name: "Ashfield Energy Ltd" },
    agent: { name: "Alex Thompson" },
    startdate: isoDaysAgo(6),
    dateoccurred: isoDaysAgo(6),
    duedate: ymdDaysFromNow(8),
    targetdate: ymdDaysFromNow(8),
    timetaken: 90,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9024, note: "4x Panasonic CF-54 ordered. Delivery expected next week. Build checklist prepared.", who: "Alex Thompson", dateoccurred: isoDaysAgo(4) },
    ],
  },
  {
    id: 1022,
    summary: "Azure AD — stale account audit",
    details: "Quarterly stale account review. Identifying accounts inactive for 90+ days for review and disablement per security policy.",
    status: { name: "Resolved" },
    priority: { name: "Low" },
    client: { id: 104, name: "Ashfield Energy Ltd" },
    agent: { name: "Jamie Clarke" },
    startdate: isoDaysAgo(7),
    dateoccurred: isoDaysAgo(7),
    duedate: isoDaysAgo(3),
    targetdate: isoDaysAgo(3),
    timetaken: 120,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9025, note: "14 stale accounts identified. 11 disabled after HR confirmation. 3 retained as service accounts — documented.", who: "Jamie Clarke", dateoccurred: isoDaysAgo(3) },
    ],
  },

  // ── Hartley and Sons (4 tickets) ─────────────────────────────────────
  {
    id: 1023,
    summary: "Cyber Essentials recertification — remediation items",
    details: "Annual Cyber Essentials recertification due. 4 remediation items identified in pre-assessment. MFA gap on admin accounts is highest risk.",
    status: { name: "In Progress" },
    priority: { name: "High" },
    client: { id: 105, name: "Hartley and Sons" },
    agent: { name: "Alex Thompson" },
    startdate: isoDaysAgo(8),
    dateoccurred: isoDaysAgo(8),
    duedate: ymdDaysFromNow(6),
    targetdate: ymdDaysFromNow(6),
    timetaken: 210,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9026, note: "3 of 4 remediation items complete. MFA on 2 admin accounts pending — IT manager approval required.", who: "Alex Thompson", dateoccurred: isoDaysAgo(2) },
    ],
  },
  {
    id: 1024,
    summary: "Server decommission — legacy file server FS01",
    details: "FS01 to be decommissioned following completion of SharePoint migration. Data verified migrated. Server to be wiped and returned to leasing company.",
    status: { name: "Resolved" },
    priority: { name: "Low" },
    client: { id: 105, name: "Hartley and Sons" },
    agent: { name: "Jamie Clarke" },
    startdate: isoDaysAgo(5),
    dateoccurred: isoDaysAgo(5),
    duedate: isoDaysAgo(1),
    targetdate: isoDaysAgo(1),
    timetaken: 180,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9027, note: "FS01 wiped (NIST 800-88 compliant). Destruction certificate issued. Server collected by leasing company.", who: "Jamie Clarke", dateoccurred: isoDaysAgo(1) },
    ],
  },
  {
    id: 1025,
    summary: "Microsoft 365 licence optimisation",
    details: "Annual licence review. Currently on E3 across all users — some users identified as light users suitable for F3 downgrade, saving ~£180/month.",
    status: { name: "Awaiting Client" },
    priority: { name: "Low" },
    client: { id: 105, name: "Hartley and Sons" },
    agent: { name: "Alex Thompson" },
    startdate: isoDaysAgo(9),
    dateoccurred: isoDaysAgo(9),
    duedate: ymdDaysFromNow(14),
    targetdate: ymdDaysFromNow(14),
    timetaken: 120,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9028, note: "Licence usage report shared with MD. Recommended downgrading 8 users to F3. Awaiting approval to proceed.", who: "Alex Thompson", dateoccurred: isoDaysAgo(4) },
    ],
  },
  {
    id: 1026,
    summary: "Phishing simulation — staff awareness training",
    details: "Quarterly phishing simulation campaign. 12% click rate on last campaign. Targeted training for repeat clickers required.",
    status: { name: "Resolved" },
    priority: { name: "Medium" },
    client: { id: 105, name: "Hartley and Sons" },
    agent: { name: "Jamie Clarke" },
    startdate: isoDaysAgo(12),
    dateoccurred: isoDaysAgo(12),
    duedate: isoDaysAgo(6),
    targetdate: isoDaysAgo(6),
    timetaken: 150,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9029, note: "Campaign complete. 7% click rate — improvement on last quarter. 4 repeat clickers enrolled in targeted KnowBe4 training module.", who: "Jamie Clarke", dateoccurred: isoDaysAgo(6) },
    ],
  },

  // ── Pennine Logistics (5 tickets) ─────────────────────────────────────
  {
    id: 1027,
    summary: "Fleet tracking system integration — Samsara to TMS",
    details: "Integration between Samsara GPS fleet tracking and new TMS (Transport Management System). API connector required. 47 vehicles.",
    status: { name: "In Progress" },
    priority: { name: "High" },
    client: { id: 106, name: "Pennine Logistics" },
    agent: { name: "Alex Thompson" },
    startdate: isoDaysAgo(10),
    dateoccurred: isoDaysAgo(10),
    duedate: ymdDaysFromNow(11),
    targetdate: ymdDaysFromNow(11),
    timetaken: 420,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9030, note: "API connector built and tested in staging. 47 vehicles syncing correctly. Production deployment planned for Saturday.", who: "Alex Thompson", dateoccurred: isoDaysAgo(2) },
    ],
  },
  {
    id: 1028,
    summary: "Depot WiFi — Bradford site dead zones",
    details: "Forklift operators reporting WiFi dropout in racking aisles C and D. Handheld scanners losing connection mid-pick.",
    status: { name: "Resolved" },
    priority: { name: "High" },
    client: { id: 106, name: "Pennine Logistics" },
    agent: { name: "Jamie Clarke" },
    startdate: isoDaysAgo(4),
    dateoccurred: isoDaysAgo(4),
    duedate: isoDaysAgo(2),
    targetdate: isoDaysAgo(2),
    timetaken: 180,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9031, note: "2x additional APs installed in aisles C and D. Channel planning updated to avoid interference. Signal verified across full racking area.", who: "Jamie Clarke", dateoccurred: isoDaysAgo(2) },
    ],
  },
  {
    id: 1029,
    summary: "GDPR data retention — driver records purge",
    details: "Legal hold lifted on driver records from 2019. Records to be purged in line with retention policy. Audit trail required.",
    status: { name: "Resolved" },
    priority: { name: "Medium" },
    client: { id: 106, name: "Pennine Logistics" },
    agent: { name: "Alex Thompson" },
    startdate: isoDaysAgo(6),
    dateoccurred: isoDaysAgo(6),
    duedate: isoDaysAgo(3),
    targetdate: isoDaysAgo(3),
    timetaken: 90,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9032, note: "1,247 records purged. Deletion log produced and stored per DPA requirements. DPO notified.", who: "Alex Thompson", dateoccurred: isoDaysAgo(3) },
    ],
  },
  {
    id: 1030,
    summary: "ERP upgrade — Dynamics 365 Business Central migration",
    details: "Moving from NAV 2016 to Dynamics 365 Business Central Online. Discovery and data mapping phase underway.",
    status: { name: "In Progress" },
    priority: { name: "Medium" },
    client: { id: 106, name: "Pennine Logistics" },
    agent: { name: "Jamie Clarke" },
    startdate: isoDaysAgo(20),
    dateoccurred: isoDaysAgo(20),
    duedate: ymdDaysFromNow(45),
    targetdate: ymdDaysFromNow(45),
    timetaken: 680,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9033, note: "Data mapping 60% complete. Custom NAV reports identified for redevelopment in BC. Timeline on track.", who: "Jamie Clarke", dateoccurred: isoDaysAgo(3) },
    ],
  },
  {
    id: 1031,
    summary: "Ransomware readiness assessment",
    details: "Board-requested assessment of ransomware resilience. Covering backup integrity, segmentation, detection, and response plan.",
    status: { name: "In Progress" },
    priority: { name: "High" },
    client: { id: 106, name: "Pennine Logistics" },
    agent: { name: "Alex Thompson" },
    startdate: isoDaysAgo(5),
    dateoccurred: isoDaysAgo(5),
    duedate: ymdDaysFromNow(7),
    targetdate: ymdDaysFromNow(7),
    timetaken: 240,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9034, note: "Backup integrity testing complete — 3 recovery points validated. Segmentation gaps identified in depot OT network.", who: "Alex Thompson", dateoccurred: isoDaysAgo(1) },
    ],
  },

  // ── Solent Academies Trust (5 tickets) ───────────────────────────────
  {
    id: 1032,
    summary: "SIMS to Bromcom migration — MAT-wide rollout",
    details: "Full MIS migration across 6 academies from SIMS to Bromcom. Data migration, staff training, and go-live support required.",
    status: { name: "In Progress" },
    priority: { name: "High" },
    client: { id: 107, name: "Solent Academies Trust" },
    agent: { name: "Jamie Clarke" },
    startdate: isoDaysAgo(30),
    dateoccurred: isoDaysAgo(30),
    duedate: ymdDaysFromNow(21),
    targetdate: ymdDaysFromNow(21),
    timetaken: 980,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9035, note: "4 of 6 academies live on Bromcom. Remaining 2 (Fareham and Gosport sites) scheduled for half-term.", who: "Jamie Clarke", dateoccurred: isoDaysAgo(4) },
    ],
  },
  {
    id: 1033,
    summary: "Safeguarding filtering — CIPA compliance review",
    details: "Annual review of web filtering across all trust sites. Ensuring safeguarding policies meet DfE requirements and Prevent duty obligations.",
    status: { name: "Resolved" },
    priority: { name: "High" },
    client: { id: 107, name: "Solent Academies Trust" },
    agent: { name: "Alex Thompson" },
    startdate: isoDaysAgo(8),
    dateoccurred: isoDaysAgo(8),
    duedate: isoDaysAgo(3),
    targetdate: isoDaysAgo(3),
    timetaken: 360,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9036, note: "All 6 sites reviewed. Filtering policies updated. Report submitted to DSL and trust board. No critical gaps found.", who: "Alex Thompson", dateoccurred: isoDaysAgo(3) },
    ],
  },
  {
    id: 1034,
    summary: "Interactive display replacements — Fareham Academy",
    details: "12 aging Promethean boards to be replaced with 75-inch interactive displays across maths and science departments.",
    status: { name: "Awaiting Parts" },
    priority: { name: "Low" },
    client: { id: 107, name: "Solent Academies Trust" },
    agent: { name: "Jamie Clarke" },
    startdate: isoDaysAgo(7),
    dateoccurred: isoDaysAgo(7),
    duedate: ymdDaysFromNow(14),
    targetdate: ymdDaysFromNow(14),
    timetaken: 60,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9037, note: "12x Samsung QMB-T ordered. Delivery week commencing 16 June. Installation booked during INSET day 20 June.", who: "Jamie Clarke", dateoccurred: isoDaysAgo(2) },
    ],
  },
  {
    id: 1035,
    summary: "Staff phishing awareness — post-incident follow up",
    details: "Finance admin at Gosport site clicked phishing link. Credentials potentially compromised. Password reset and investigation underway.",
    status: { name: "Resolved" },
    priority: { name: "Critical" },
    client: { id: 107, name: "Solent Academies Trust" },
    agent: { name: "Alex Thompson" },
    startdate: isoDaysAgo(3),
    dateoccurred: isoDaysAgo(3),
    duedate: isoDaysAgo(2),
    targetdate: isoDaysAgo(2),
    timetaken: 210,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9038, note: "Password reset, MFA enforced, audit log reviewed — no evidence of account access post-click. User referred for mandatory awareness training.", who: "Alex Thompson", dateoccurred: isoDaysAgo(2) },
    ],
  },
  {
    id: 1036,
    summary: "Network infrastructure refresh — Gosport site",
    details: "Core switching infrastructure at Gosport site 8 years old. Full refresh with HPE Aruba stack. Planning phase.",
    status: { name: "In Progress" },
    priority: { name: "Medium" },
    client: { id: 107, name: "Solent Academies Trust" },
    agent: { name: "Jamie Clarke" },
    startdate: isoDaysAgo(5),
    dateoccurred: isoDaysAgo(5),
    duedate: ymdDaysFromNow(60),
    targetdate: ymdDaysFromNow(60),
    timetaken: 180,
    slastate: null,
    resolution_time_hours: null,
    notes: [
      { id: 9039, note: "Site survey booked for next Tuesday. Quote being prepared — expecting £28k-£35k range.", who: "Jamie Clarke", dateoccurred: isoDaysAgo(1) },
    ],
  },
] as unknown as DemoTicket[];

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
    target_date: t.target_date,
    timetaken: t.timetaken,
    priority: t.priority,
    sla_response_breached: t.sla_response_breached,
    sla_resolution_breached: t.sla_resolution_breached,
    response_time_hours: t.response_time_hours,
    resolution_time_hours: t.resolution_time_hours,
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
    summary: "Azure Tenant Migration",
    status: { name: "In Progress" },
    completionpercent: 62,
    percentcomplete: 62,
    client: { id: 101, name: "Northwood Manufacturing" },
    clientId: 101,
    targetdate: ymdDaysFromNow(28),
    timetaken: 1240,
    projectmanager: { name: "Alex Thompson" },
    tasks: [
      { id: 3001, status: "Completed", name: "Discovery and assessment" },
      { id: 3002, status: "Completed", name: "Tenant provisioning and DNS" },
      { id: 3003, status: "Completed", name: "Exchange Online migration — phase 1" },
      { id: 3004, status: "In Progress", name: "SharePoint and OneDrive migration" },
      { id: 3005, status: "In Progress", name: "Azure AD Connect configuration" },
      { id: 3006, status: "Not Started", name: "Teams migration and telephony" },
      { id: 3007, status: "Not Started", name: "Legacy app compatibility testing" },
      { id: 3008, status: "Not Started", name: "Cutover and decommission" },
    ],
  },
  {
    id: 2002,
    name: "Fortigate 200F Firewall Replacement",
    summary: "Fortigate 200F Firewall Replacement",
    status: { name: "In Progress" },
    completionpercent: 78,
    percentcomplete: 78,
    client: { id: 102, name: "Bridgewater Council" },
    clientId: 102,
    targetdate: ymdDaysFromNow(5),
    timetaken: 860,
    projectmanager: { name: "Alex Thompson" },
    tasks: [
      { id: 3009, status: "Completed", name: "Requirements gathering and design" },
      { id: 3010, status: "Completed", name: "Hardware procurement" },
      { id: 3011, status: "Completed", name: "Config build and lab testing" },
      { id: 3012, status: "Completed", name: "VPN tunnel documentation" },
      { id: 3013, status: "Completed", name: "Change request approval" },
      { id: 3014, status: "Completed", name: "Pre-migration site checks" },
      { id: 3015, status: "Not Started", name: "Migration weekend — cutover" },
    ],
  },
  {
    id: 2003,
    name: "Microsoft Teams Voice — Direct Routing",
    summary: "Microsoft Teams Voice — Direct Routing",
    status: { name: "In Progress" },
    completionpercent: 55,
    percentcomplete: 55,
    client: { id: 104, name: "Ashfield Energy Ltd" },
    clientId: 104,
    targetdate: ymdDaysFromNow(12),
    timetaken: 920,
    projectmanager: { name: "Jamie Clarke" },
    tasks: [
      { id: 3016, status: "Completed", name: "Legacy PBX audit" },
      { id: 3017, status: "Completed", name: "SBC procurement and configuration" },
      { id: 3018, status: "Completed", name: "Teams Phone licencing" },
      { id: 3019, status: "Completed", name: "Number porting submission" },
      { id: 3020, status: "In Progress", name: "User training programme" },
      { id: 3021, status: "Not Started", name: "Porting completion and go-live" },
      { id: 3022, status: "Not Started", name: "PBX decommission" },
    ],
  },
  {
    id: 2004,
    name: "Cyber Essentials Plus Certification",
    summary: "Cyber Essentials Plus Certification",
    status: { name: "In Progress" },
    completionpercent: 75,
    percentcomplete: 75,
    client: { id: 105, name: "Hartley and Sons" },
    clientId: 105,
    targetdate: ymdDaysFromNow(8),
    timetaken: 480,
    projectmanager: { name: "Alex Thompson" },
    tasks: [
      { id: 3023, status: "Completed", name: "Pre-assessment and gap analysis" },
      { id: 3024, status: "Completed", name: "Patch compliance remediation" },
      { id: 3025, status: "Completed", name: "Firewall rule review" },
      { id: 3026, status: "Completed", name: "Malware protection validation" },
      { id: 3027, status: "In Progress", name: "MFA enforcement — admin accounts" },
      { id: 3028, status: "Not Started", name: "External vulnerability scan" },
      { id: 3029, status: "Not Started", name: "Certification submission" },
    ],
  },
  {
    id: 2005,
    name: "Dynamics 365 Business Central Migration",
    summary: "Dynamics 365 Business Central Migration",
    status: { name: "In Progress" },
    completionpercent: 30,
    percentcomplete: 30,
    client: { id: 106, name: "Pennine Logistics" },
    clientId: 106,
    targetdate: ymdDaysFromNow(45),
    timetaken: 680,
    projectmanager: { name: "Jamie Clarke" },
    tasks: [
      { id: 3030, status: "Completed", name: "Current state discovery" },
      { id: 3031, status: "Completed", name: "Data mapping and cleansing plan" },
      { id: 3032, status: "In Progress", name: "Custom report redevelopment" },
      { id: 3033, status: "In Progress", name: "Data migration — master records" },
      { id: 3034, status: "Not Started", name: "UAT with key users" },
      { id: 3035, status: "Not Started", name: "Staff training" },
      { id: 3036, status: "Not Started", name: "Cutover and hypercare" },
    ],
  },
  {
    id: 2006,
    name: "SIMS to Bromcom MIS Migration",
    summary: "SIMS to Bromcom MIS Migration",
    status: { name: "In Progress" },
    completionpercent: 67,
    percentcomplete: 67,
    client: { id: 107, name: "Solent Academies Trust" },
    clientId: 107,
    targetdate: ymdDaysFromNow(21),
    timetaken: 980,
    projectmanager: { name: "Jamie Clarke" },
    tasks: [
      { id: 3037, status: "Completed", name: "Discovery and data mapping" },
      { id: 3038, status: "Completed", name: "Bromcom environment provisioning" },
      { id: 3039, status: "Completed", name: "Fareham Academy go-live" },
      { id: 3040, status: "Completed", name: "Portsmouth Academy go-live" },
      { id: 3041, status: "In Progress", name: "Fareham and Gosport sites" },
      { id: 3042, status: "Not Started", name: "Post-migration support period" },
      { id: 3043, status: "Not Started", name: "SIMS decommission" },
    ],
  },
];

export const DEMO_CLIENTS = [
  { id: 101, name: "Northwood Manufacturing" },
  { id: 102, name: "Bridgewater Council" },
  { id: 103, name: "Acme Legal LLP" },
  { id: 104, name: "Ashfield Energy Ltd" },
  { id: 105, name: "Hartley and Sons" },
  { id: 106, name: "Pennine Logistics" },
  { id: 107, name: "Solent Academies Trust" },
  { id: 108, name: "Harbour IT Group" },
  { id: 109, name: "Riverside Trust" },
  { id: 110, name: "Kestrel Dental Group" },
];

export const DEMO_EXAMPLE_INPUT = `Service desk handover notes - mixed accounts this week.
Contoso Ltd: Office 365 external delivery failing after DNS change — SPF corrected, monitoring before close.
Riverside Academy: Floor 2 switch failed — replacement arriving, install scheduled lunch today.
Meridian Consulting: Conditional Access blocking remote workers — awaiting client decision on Intune vs IP exclusions.
Hartley Manufacturing: Weekly backup failures — VSS writer fixed, last Sunday run successful.
Apex Financial: New starter Monday — M365 and laptop ready, Sage access pending finance approval.`;
