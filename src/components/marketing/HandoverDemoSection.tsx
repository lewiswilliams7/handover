"use client";

import { useRef, useState, type ReactNode } from "react";

type PriorityLevel = "high" | "medium";

type ActionItem = {
  task: string;
  owner: string;
  due: string;
  priority: PriorityLevel;
};

type RiskItem = {
  risk: string;
  impact: string;
  mitigation: string;
  client: string;
  rag: "red" | "amber" | "green";
};

type QbrPriority = {
  num: string;
  action: string;
  risk: string;
  owner: string;
  target: string;
};

const ACTIONS: ActionItem[] = [
  {
    task: "Monitor Office 365 outbound email delivery for sales team following SPF record update - confirm no further delivery failures before closure",
    owner: "Alex Thompson",
    due: "02 Jun 2026",
    priority: "high",
  },
  {
    task: "Follow up on procurement approval for hardware tokens to complete MFA rollout for 3 remote workers",
    owner: "Jamie Clarke",
    due: "05 Jun 2026",
    priority: "medium",
  },
  {
    task: "Prepare for Fortigate 200F firewall migration - migration window scheduled for Saturday 14 June",
    owner: "Alex Thompson",
    due: "09 Jun 2026",
    priority: "medium",
  },
  {
    task: "Begin Phase 2 (archive migration) for SharePoint migration in planning department next week",
    owner: "Jamie Clarke",
    due: "11 Jun 2026",
    priority: "medium",
  },
  {
    task: "Chase partner sign-off for Osprey case management system upgrade before production deployment",
    owner: "Alex Thompson",
    due: "14 Jun 2026",
    priority: "high",
  },
  {
    task: "Complete number porting and deliver user training for Teams Direct Routing VoIP — target go-live 30 June",
    owner: "Alex Thompson",
    due: "18 Jun 2026",
    priority: "medium",
  },
  {
    task: "Chase client IT manager for approval to close MFA gap on 2 admin accounts for Cyber Essentials recertification",
    owner: "Alex Thompson",
    due: "21 Jun 2026",
    priority: "high",
  },
];

const RISKS: RiskItem[] = [
  {
    risk: "Office 365 outbound email may still fail if SPF/DKIM changes do not fully resolve propagation issues",
    impact:
      "Continued disruption to external communications for 12 sales users, potential loss of business",
    mitigation: "Monitor delivery for 24h post-DNS change and escalate if failures persist",
    client: "Northwood Manufacturing",
    rag: "amber",
  },
  {
    risk: "MFA rollout blocked for 3 remote users without smartphones, delaying full enforcement",
    impact: "Security risk from incomplete MFA coverage; 8 accounts remain vulnerable",
    mitigation: "Chase procurement for hardware tokens and complete rollout",
    client: "Northwood Manufacturing",
    rag: "red",
  },
  {
    risk: "Firewall migration may be delayed if pre-migration checks identify issues or council IT availability changes",
    impact: "Extended exposure on unsupported Cisco ASA; risk to network security",
    mitigation: "Confirm all pre-migration checks and maintain close coordination with council IT",
    client: "Bridgewater Council",
    rag: "amber",
  },
  {
    risk: "Case management system upgrade delayed pending partner sign-off",
    impact: "Missed upgrade window; potential disruption to legal operations",
    mitigation: "Follow up for timely approval and prepare for rapid deployment",
    client: "Acme Legal LLP",
    rag: "red",
  },
  {
    risk: "Cyber Essentials recertification at risk if MFA gap for admin accounts is not closed before 15 June deadline",
    impact: "Failure to achieve CE+ certification; reputational and compliance impact",
    mitigation:
      "Chase IT manager for approval and close remaining remediation item promptly",
    client: "Hartley and Sons",
    rag: "red",
  },
];

const SUMMARY = `Delivery across the portfolio is progressing well, with 18 tickets managed across five clients and four active projects. Key themes this period include cloud migration, security compliance, and infrastructure modernisation.

Notable completions include resolution of backup failures at Northwood Manufacturing, a ransomware incident response at Acme Legal LLP, and successful server decommission at Hartley & Sons. Three major initiatives are awaiting client-side action: MFA procurement approval at Northwood, partner sign-off for Acme Legal's case management upgrade, and closure of the final Cyber Essentials remediation item at Hartley & Sons.

Areas requiring attention in the next quarter: completing the Fortigate firewall migration for Bridgewater Council, driving the Teams Voice go-live for Ashfield Energy Ltd, and closing the CE+ certification for Hartley & Sons before the 15 June deadline.`;

const CLIENT_EMAILS = [
  {
    client: "Northwood Manufacturing",
    subject: "Delivery Update — Northwood Manufacturing",
    body: `Hi,

Our team has updated the SPF record for your Office 365 environment and is monitoring outbound email delivery for the sales team. We expect to confirm resolution after a 24-hour window.

For the MFA rollout, we have proposed hardware tokens for the three remote users without smartphones and are waiting for procurement approval to proceed. All other outstanding items have been completed this period.

I will provide a further update once email delivery is confirmed.

Kind regards,
Alex Thompson
Northwind IT · Service Delivery Manager`,
  },
  {
    client: "Bridgewater Council",
    subject: "Delivery Update — Bridgewater Council",
    body: `Hi,

The pre-migration configuration review for the Fortigate firewall is complete and the migration window is set for Saturday 14 June. VPN tunnels have been documented and the change request is approved.

Phase 1 of the SharePoint migration for the planning department is finished with 847GB migrated. Phase 2 (archive) is scheduled to begin next week.

We will keep you updated as we approach the migration dates.

Kind regards,
Alex Thompson
Northwind IT · Service Delivery Manager`,
  },
  {
    client: "Acme Legal LLP",
    subject: "Delivery Update — Acme Legal LLP",
    body: `Hi,

The SQL migration for your Osprey case management system upgrade has been successfully tested in staging. We are currently awaiting partner sign-off before proceeding to production deployment.

All other recent requests including the ransomware alert and remote access setup have been resolved.

I will be in touch as soon as we have confirmation to proceed.

Kind regards,
Jamie Clarke
Northwind IT · Project Lead`,
  },
  {
    client: "Ashfield Energy Ltd",
    subject: "Delivery Update — Ashfield Energy Ltd",
    body: `Hi,

The Teams Direct Routing VoIP system replacement project is progressing well. The SBC is configured, number porting has been submitted to the carrier, and user training sessions are scheduled for the week commencing 23 June.

We are on track for the 30 June go-live.

Kind regards,
Alex Thompson
Northwind IT · Service Delivery Manager`,
  },
  {
    client: "Hartley and Sons",
    subject: "Delivery Update — Hartley and Sons",
    body: `Hi,

Three of the four remediation items for Cyber Essentials recertification are complete. The remaining item is closing the MFA gap on two admin accounts, which is currently with your IT manager for approval.

We are on track for recertification ahead of the 15 June deadline.

Kind regards,
Alex Thompson
Northwind IT · Service Delivery Manager`,
  },
];

const QBR_PRIORITIES: QbrPriority[] = [
  {
    num: "01",
    action:
      "Complete Office 365 SPF/DKIM remediation for Northwood Manufacturing sales team (Ticket #1001) and verify external mail flow restoration",
    risk: "Delays prolong external communication outages for 12 sales users, risking revenue and client relationships.",
    owner: "Service Delivery Manager",
    target: "11 Jun 2026",
  },
  {
    num: "02",
    action:
      "Finalise MFA rollout for remaining 8 accounts at Northwood Manufacturing (Ticket #1002), prioritising remote workers without smartphones",
    risk: "Outstanding MFA gaps leave Northwood exposed to credential compromise, as evidenced by stalled progress in #1002.",
    owner: "Account Manager",
    target: "28 Jun 2026",
  },
  {
    num: "03",
    action:
      "Execute Fortigate 200F firewall migration for Bridgewater Council (Project #2002, Ticket #1007) during agreed window and document post-migration validation",
    risk: "Delayed replacement extends life of unsupported hardware, increasing security vulnerability for Bridgewater Council.",
    owner: "Project Lead",
    target: "12 Jul 2026",
  },
  {
    num: "04",
    action:
      "Drive Cyber Essentials Plus remediation completion for Hartley & Sons (Project #2004), ensuring MFA and firewall rules are fully addressed before deadline",
    risk: "Incomplete remediation risks certification failure and potential loss of compliance-driven contracts.",
    owner: "Service Delivery Manager",
    target: "27 Jul 2026",
  },
  {
    num: "05",
    action:
      "Accelerate Microsoft Teams Voice deployment for Ashfield Energy Ltd (Project #2003, Ticket #1015), resolving go-live blockers for 45 extensions",
    risk: "Delays hinder Ashfield Energy's transition from end-of-life telephony, risking business continuity.",
    owner: "Project Lead",
    target: "11 Aug 2026",
  },
];

const TABS = [
  { id: "actions", label: "Actions" },
  { id: "risks", label: "Risks" },
  { id: "summary", label: "Summary" },
  { id: "email", label: "Client Email" },
  { id: "qbr", label: "QBR Pack" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  const isHigh = priority === "high";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "1px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: 0.2,
        border: `1px solid ${isHigh ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
        background: isHigh ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
        color: isHigh ? "#ef4444" : "#f59e0b",
      }}
    >
      {isHigh ? "High" : "Medium"}
    </span>
  );
}

function ActionsPanel() {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["TASK", "OWNER", "DUE DATE", "PRIORITY"].map((h) => (
              <th
                key={h}
                style={{
                  padding: "8px 12px",
                  textAlign: "left",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  letterSpacing: 0.5,
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ACTIONS.map((a, i) => (
            <tr
              key={i}
              style={{
                borderBottom: i !== ACTIONS.length - 1 ? "1px solid var(--border)" : "none",
                background: i % 2 === 1 ? "rgba(255,255,255,0.02)" : "transparent",
                transition: "background 0.15s",
              }}
            >
              <td
                className="line-clamp-2"
                style={{ padding: "10px 12px", color: "var(--text-primary)", lineHeight: 1.5 }}
              >
                {a.task}
              </td>
              <td
                className="whitespace-nowrap"
                style={{ padding: "10px 12px", color: "var(--text-secondary)" }}
              >
                {a.owner}
              </td>
              <td
                className="whitespace-nowrap"
                style={{
                  padding: "10px 12px",
                  color: "var(--text-secondary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {a.due}
              </td>
              <td style={{ padding: "10px 12px" }}>
                <PriorityBadge priority={a.priority} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RisksPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {RISKS.map((r, i) => (
        <div
          key={i}
          style={{
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6, lineHeight: 1.5 }}>
            <span style={{ display: "flex", alignItems: "flex-start" }}>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: r.rag === "red" ? "#C8553D" : r.rag === "amber" ? "#D9A441" : "#4E9C6F",
                  marginRight: 8,
                  flexShrink: 0,
                  marginTop: 4,
                }}
              />
              <span>{r.risk}</span>
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: "var(--text-secondary)" }}>
            <span>
              <span style={{ color: "var(--text-secondary)" }}>Impact: </span>
              {r.impact}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
            <span style={{ color: "var(--text-secondary)" }}>Mitigation: </span>
            {r.mitigation}
          </div>
          <div style={{ marginTop: 6 }}>
            <span
              style={{
                fontSize: 11,
                padding: "1px 6px",
                borderRadius: 4,
                background: "rgba(56,189,248,0.08)",
                border: "1px solid rgba(56,189,248,0.2)",
                color: "var(--accent)",
              }}
            >
              {r.client}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryPanel() {
  return (
    <div>
      <div
        style={{
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid var(--accent)",
          borderRadius: "var(--radius)",
          padding: "14px 16px",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 11, color: "var(--text-secondary)", letterSpacing: 1, marginBottom: 8, fontFamily: "monospace" }}>
          EXECUTIVE SUMMARY
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {[
            { label: "Total tickets", value: "18" },
            { label: "Open", value: "7" },
            { label: "Resolved", value: "11" },
            { label: "SLA compliance", value: "61%" },
            { label: "Active projects", value: "4" },
          ].map((k) => (
            <div
              key={k.label}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "6px 12px",
                textAlign: "center",
                minWidth: 80,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                {k.value}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, whiteSpace: "pre-line" }}>{SUMMARY}</div>
    </div>
  );
}

function EmailPanel() {
  const [copied, setCopied] = useState(false);
  const [emailIdx, setEmailIdx] = useState(0);
  const currentEmail = CLIENT_EMAILS[emailIdx];
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {CLIENT_EMAILS.map((e, i) => (
          <button
            key={e.client}
            onClick={() => setEmailIdx(i)}
            style={{
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 11,
              border: `1px solid ${emailIdx === i ? "var(--accent)" : "var(--border)"}`,
              background: emailIdx === i ? "rgba(56,189,248,0.1)" : "var(--bg-tertiary)",
              color: emailIdx === i ? "var(--accent)" : "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.15s",
              fontFamily: "inherit",
            }}
          >
            {e.client}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(currentEmail.body);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          style={{
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "4px 12px",
            fontSize: 12,
            color: copied ? "#22c55e" : "var(--text-primary)",
            opacity: copied ? 1 : 0.7,
            cursor: "pointer",
            transition: "color 0.2s",
          }}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <div style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 8, fontFamily: "monospace" }}>
        Subject: {currentEmail.subject}
      </div>
      <pre
        style={{
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "14px 16px",
          fontSize: 13,
          color: "var(--text-primary)",
          lineHeight: 1.8,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "inherit",
          margin: 0,
        }}
      >
        {currentEmail.body}
      </pre>
    </div>
  );
}

function QbrPanel({ onStartTrial }: { onStartTrial?: () => void }) {
  const [dlPptx, setDlPptx] = useState(false);
  const [dlXlsx, setDlXlsx] = useState(false);

  const download = (type: "pptx" | "xlsx") => {
    const set = type === "pptx" ? setDlPptx : setDlXlsx;
    set(true);
    const a = document.createElement("a");
    a.href = type === "pptx" ? "/demo/Example_QBR_Q2-2026.pptx" : "/demo/Excel Report.xlsx";
    a.download = type === "pptx" ? "Example_QBR_Q2-2026.pptx" : "Excel Report.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => set(false), 1500);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <button
          onClick={() => download("pptx")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: dlPptx ? "rgba(56,189,248,0.1)" : "var(--bg-tertiary)",
            border: `1px solid ${dlPptx ? "rgba(56,189,248,0.4)" : "var(--border)"}`,
            borderRadius: "var(--radius)",
            padding: "8px 16px",
            fontSize: 13,
            color: dlPptx ? "var(--accent)" : "var(--text-secondary)",
            cursor: "pointer",
            transition: "all 0.15s",
            fontFamily: "inherit",
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {dlPptx ? "Downloading…" : "Download QBR Pack (.pptx)"}
        </button>
        <button
          onClick={() => download("xlsx")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: dlXlsx ? "rgba(34,197,94,0.1)" : "var(--bg-tertiary)",
            border: `1px solid ${dlXlsx ? "rgba(34,197,94,0.4)" : "var(--border)"}`,
            borderRadius: "var(--radius)",
            padding: "8px 16px",
            fontSize: 13,
            color: dlXlsx ? "#22c55e" : "var(--text-secondary)",
            cursor: "pointer",
            transition: "all 0.15s",
            fontFamily: "inherit",
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {dlXlsx ? "Downloading…" : "Download Excel Report Pack (.xlsx)"}
        </button>
        <button
          onClick={() => onStartTrial?.()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--bg-tertiary)",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius)",
            padding: "8px 16px",
            fontSize: 13,
            color: "var(--text-muted)",
            cursor: "pointer",
            fontFamily: "inherit",
            position: "relative",
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Schedule automated report
          <span
            style={{
              position: "absolute",
              top: -7,
              right: -4,
              background: "var(--accent)",
              color: "#0f172a",
              fontSize: 9,
              padding: "1px 5px",
              borderRadius: 4,
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            PRO
          </span>
        </button>
      </div>

      <div
        style={{
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--border)",
            fontSize: 11,
            color: "var(--text-secondary)",
            letterSpacing: 1,
            fontFamily: "monospace",
          }}
        >
          NEXT QUARTER PRIORITIES · 5 COMMITMENTS
        </div>
        {QBR_PRIORITIES.map((r, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 14,
              padding: "12px 14px",
              borderBottom: i !== QBR_PRIORITIES.length - 1 ? "1px solid var(--border)" : "none",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "var(--accent)",
                fontFamily: "monospace",
                lineHeight: 1,
                opacity: 0.5,
                minWidth: 36,
              }}
            >
              {r.num}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 4 }}>
                {r.action}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{r.risk}</div>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                fontFamily: "monospace",
                whiteSpace: "nowrap",
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              <div style={{ marginBottom: 2 }}>{r.owner}</div>
              <div style={{ color: "var(--accent)" }}>{r.target}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HandoverDemoSection({ onStartTrial }: { onStartTrial?: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>("actions");
  const [demoNotice, setDemoNotice] = useState<string | null>(null);
  const clearNoticeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showDemoNotice = () => {
    setDemoNotice("Connect your PSA to use this feature — start free trial");
    if (clearNoticeRef.current) clearTimeout(clearNoticeRef.current);
    clearNoticeRef.current = setTimeout(() => setDemoNotice(null), 3000);
  };

  const panels: Record<TabId, ReactNode> = {
    actions: <ActionsPanel />,
    risks: <RisksPanel />,
    summary: <SummaryPanel />,
    email: <EmailPanel />,
    qbr: <QbrPanel onStartTrial={onStartTrial} />,
  };

  return (
    <section className="relative z-[1] px-6 py-16 md:px-8 md:py-24" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="mx-auto w-full max-w-[1100px]">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(56,189,248,0.3)] bg-[rgba(56,189,248,0.08)] px-3 py-1 text-[12px] font-medium text-[var(--accent)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            Live example — real demo data
          </div>
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] md:text-4xl">
            See exactly what your clients receive
          </h2>
          <p className="mx-auto max-w-[480px] text-base text-[var(--text-secondary)]">
            Generated from 18 tickets and 4 projects across 5 MSP clients. Every output, ready to send.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--border)] shadow-2xl" style={{ background: "var(--bg-secondary)" }}>
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5" style={{ background: "var(--bg-secondary)" }}>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--text-primary)]">Generate</span>
              <span className="rounded border border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                PSA data imported — 18 items
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.08)] px-2 py-0.5 text-[11px] text-[#22c55e]">
                ✓ Report quality: Excellent
              </span>
            </div>
          </div>

          <div className="border-b border-[var(--border)] px-4 py-2.5" style={{ background: "var(--bg-secondary)" }}>
            <div style={{ position: "relative" }}>
              {demoNotice && (
                <div
                  style={{
                    position: "absolute",
                    top: -36,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border)",
                    borderRadius: 999,
                    padding: "4px 12px",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    whiteSpace: "nowrap",
                    zIndex: 10,
                    pointerEvents: "none",
                  }}
                >
                  {demoNotice}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
              {[
                { label: "Email client", icon: "✉", action: "notice" as const },
                { label: "Push to PSA", icon: "↑", action: "notice" as const },
                { label: "Export Excel", icon: "⊞", action: "downloadExcel" as const },
                { label: "Schedule this", icon: "⏱", pro: true },
                { label: "Follow up email", icon: "↩", action: "notice" as const },
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={
                    btn.pro
                      ? () => {
                          window.location.href = "/auth?tab=signup";
                        }
                      : btn.action === "notice"
                        ? showDemoNotice
                        : btn.action === "downloadExcel"
                          ? () => {
                              const a = document.createElement("a");
                              a.href = "/demo/Excel Report.xlsx";
                              a.download = "Excel Report.xlsx";
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }
                          : undefined
                  }
                  className="relative flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                  style={{ background: "var(--bg-tertiary)" }}
                >
                  <span>{btn.icon}</span>
                  {btn.label}
                </button>
              ))}
            </div>
            </div>
          </div>

          <div
            className="flex overflow-x-auto gap-1 border-b border-white/10 px-3 pt-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:overflow-x-visible"
            style={{ background: "var(--bg-secondary)" }}
          >
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative flex-shrink-0 cursor-pointer justify-center rounded-none border-0 border-b-2 bg-transparent px-3 pb-2 pt-1 text-[13px] font-medium shadow-none transition-colors duration-150 ease-out"
                    style={{
                      borderColor: activeTab === tab.id ? "var(--accent)" : "transparent",
                      color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)",
                      marginBottom: -1,
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
          </div>

          <div
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto p-3 outline-none"
            style={{
              background: "var(--bg-secondary)",
              minHeight: 320,
              maxHeight: 440,
            }}
          >
            {panels[activeTab]}
          </div>

          <div className="flex items-center gap-3 border-t border-[var(--border)] px-4 py-2.5" style={{ background: "var(--bg-secondary)" }}>
            <button
              onClick={() => onStartTrial?.()}
              className="rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-4 py-1.5 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-lg"
            >
              Generate yours free →
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-6">
          {["18 tickets · 5 clients", "4 active projects", "5 structured commitments", "Zero manual writing"].map((item) => (
            <span key={item} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <span className="text-[#22c55e]">✓</span>
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
