export default function DashboardHeroMockup() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        viewBox="0 0 900 580"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto rounded-xl shadow-2xl"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        {/* Outer shell */}
        <rect width="900" height="580" rx="12" fill="#0D1117" />

        {/* Sidebar */}
        <rect width="200" height="580" fill="#111827" />

        {/* Sidebar logo area */}
        <rect x="16" y="18" width="22" height="22" rx="4" fill="#0EA5E9" />
        <text x="46" y="33" fill="white" fontSize="14" fontWeight="700">Handover</text>

        {/* New Generation button */}
        <rect x="12" y="56" width="176" height="34" rx="6" fill="#0EA5E9" />
        <text x="40" y="78" fill="white" fontSize="12" fontWeight="600">+ New Generation</text>

        {/* Sidebar nav items */}
        <text x="20" y="118" fill="#94A3B8" fontSize="12">Generate</text>
        <text x="20" y="148" fill="#94A3B8" fontSize="12">Reports</text>

        {/* Dashboard active nav item */}
        <rect x="8" y="158" width="184" height="28" rx="5" fill="#1E293B" />
        <rect x="20" y="165" width="14" height="14" rx="2" fill="#0EA5E9" opacity="0.3" />
        <text x="40" y="176" fill="white" fontSize="12" fontWeight="600">Dashboard</text>

        {/* Main content area */}
        <rect x="200" y="0" width="700" height="580" fill="#0F172A" />

        {/* Top navbar */}
        <rect x="200" y="0" width="700" height="48" fill="#111827" />
        <rect x="212" y="13" width="18" height="18" rx="3" fill="#0EA5E9" />
        <text x="236" y="26" fill="white" fontSize="13" fontWeight="600">Panacea</text>
        <text x="700" y="26" fill="white" fontSize="13" fontWeight="600">Dashboard</text>
        <circle cx="840" cy="24" r="12" fill="#0EA5E9" />
        <text x="836" y="29" fill="white" fontSize="11" fontWeight="700">L</text>

        {/* Last refreshed */}
        <text x="216" y="68" fill="#94A3B8" fontSize="11">Last refreshed: <tspan fill="white" fontWeight="600">just now</tspan></text>
        <rect x="830" y="56" width="60" height="22" rx="5" fill="#1E293B" />
        <text x="845" y="71" fill="#94A3B8" fontSize="10">↻ Refresh</text>

        {/* Stats cards */}
        {/* Card 1 - Active Items */}
        <rect x="216" y="82" width="120" height="72" rx="6" fill="#1E293B" stroke="#334155" strokeWidth="1" />
        <text x="228" y="100" fill="#94A3B8" fontSize="9" letterSpacing="0.5">ACTIVE ITEMS</text>
        <text x="228" y="138" fill="white" fontSize="26" fontWeight="700">847</text>

        {/* Card 2 - SLA At Risk */}
        <rect x="344" y="82" width="120" height="72" rx="6" fill="#1E293B" stroke="#334155" strokeWidth="1" />
        <text x="356" y="100" fill="#94A3B8" fontSize="9" letterSpacing="0.5">SLA AT RISK</text>
        <text x="356" y="138" fill="white" fontSize="26" fontWeight="700">3</text>

        {/* Card 3 - Open Risks */}
        <rect x="472" y="82" width="120" height="72" rx="6" fill="#1E293B" stroke="#334155" strokeWidth="1" />
        <text x="484" y="100" fill="#94A3B8" fontSize="9" letterSpacing="0.5">OPEN RISKS</text>
        <text x="484" y="138" fill="white" fontSize="26" fontWeight="700">14</text>

        {/* Card 4 - Overdue */}
        <rect x="600" y="82" width="120" height="72" rx="6" fill="#1E293B" stroke="#334155" strokeWidth="1" />
        <text x="612" y="100" fill="#94A3B8" fontSize="9" letterSpacing="0.5">OVERDUE</text>
        <text x="612" y="138" fill="white" fontSize="26" fontWeight="700">8</text>

        {/* Card 5 - Avg Hrs */}
        <rect x="728" y="82" width="158" height="72" rx="6" fill="#1E293B" stroke="#334155" strokeWidth="1" />
        <text x="740" y="100" fill="#94A3B8" fontSize="9" letterSpacing="0.5">AVG HRS / DAY TO TARGET</text>
        <text x="740" y="130" fill="white" fontSize="22" fontWeight="700">2.4</text>
        <text x="740" y="146" fill="#94A3B8" fontSize="8">Hours logged per day</text>

        {/* Portfolio toggle */}
        <rect x="216" y="168" width="78" height="24" rx="12" fill="#0EA5E9" />
        <text x="228" y="184" fill="white" fontSize="10" fontWeight="600">All (847)</text>
        <text x="306" y="184" fill="#94A3B8" fontSize="10">Tickets (631)</text>
        <text x="406" y="184" fill="#94A3B8" fontSize="10">Projects (216)</text>

        {/* Filter row 1 */}
        <rect x="216" y="202" width="200" height="24" rx="5" fill="#1E293B" stroke="#334155" strokeWidth="1" />
        <text x="228" y="218" fill="#475569" fontSize="10">🔍 Filter by client</text>
        <rect x="424" y="202" width="200" height="24" rx="5" fill="#1E293B" stroke="#334155" strokeWidth="1" />
        <text x="436" y="218" fill="#475569" fontSize="10">👤 Filter by owner</text>
        <rect x="632" y="202" width="100" height="24" rx="5" fill="#1E293B" stroke="#334155" strokeWidth="1" />
        <text x="644" y="218" fill="#94A3B8" fontSize="10">RAG: All ▾</text>

        {/* Filter row 2 */}
        <rect x="216" y="232" width="150" height="24" rx="5" fill="#1E293B" stroke="#334155" strokeWidth="1" />
        <text x="228" y="248" fill="#94A3B8" fontSize="10">STATUS: All ▾</text>
        <rect x="374" y="232" width="150" height="24" rx="5" fill="#1E293B" stroke="#334155" strokeWidth="1" />
        <text x="386" y="248" fill="#94A3B8" fontSize="10">PRIORITY: All ▾</text>
        <rect x="532" y="232" width="150" height="24" rx="5" fill="#1E293B" stroke="#334155" strokeWidth="1" />
        <text x="544" y="248" fill="#94A3B8" fontSize="10">SLA: All ▾</text>

        {/* Table header */}
        <rect x="216" y="264" width="670" height="22" fill="#1E293B" />
        <text x="220" y="279" fill="#64748B" fontSize="8" letterSpacing="0.3">CLIENT/ACCOUNT</text>
        <text x="378" y="279" fill="#64748B" fontSize="8" letterSpacing="0.3">RAG</text>
        <text x="418" y="279" fill="#64748B" fontSize="8" letterSpacing="0.3">OPEN</text>
        <text x="458" y="279" fill="#64748B" fontSize="8" letterSpacing="0.3">OVERDUE</text>
        <text x="506" y="279" fill="#64748B" fontSize="8" letterSpacing="0.3">AVG RESP</text>
        <text x="556" y="279" fill="#64748B" fontSize="8" letterSpacing="0.3">THIS WK</text>
        <text x="600" y="279" fill="#64748B" fontSize="8" letterSpacing="0.3">PROJECTS</text>
        <text x="648" y="279" fill="#64748B" fontSize="8" letterSpacing="0.3">HEALTH</text>
        <text x="694" y="279" fill="#64748B" fontSize="8" letterSpacing="0.3">LAST SENT</text>
        <text x="748" y="279" fill="#64748B" fontSize="8" letterSpacing="0.3">NEXT</text>
        <text x="806" y="279" fill="#64748B" fontSize="8" letterSpacing="0.3">ACTIONS</text>

        {/* Row 1 - Meridian - GREEN */}
        <rect x="216" y="286" width="670" height="36" fill="#0F172A" />
        <text x="220" y="300" fill="white" fontSize="10" fontWeight="600">Meridian Technolo...</text>
        <text x="220" y="314" fill="#64748B" fontSize="9">Azure AD Migration - Ph...</text>
        <rect x="318" y="308" width="36" height="14" rx="3" fill="#166534" />
        <text x="322" y="319" fill="#4ADE80" fontSize="8" fontWeight="600">Project</text>
        <rect x="376" y="296" width="34" height="16" rx="3" fill="#14532D" />
        <text x="383" y="308" fill="#4ADE80" fontSize="9" fontWeight="700">GREEN</text>
        <text x="424" y="308" fill="white" fontSize="10">4</text>
        <text x="468" y="308" fill="white" fontSize="10">0</text>
        <text x="510" y="308" fill="white" fontSize="10">48m</text>
        <text x="562" y="308" fill="white" fontSize="10">6</text>
        <text x="608" y="308" fill="white" fontSize="10">2</text>
        <text x="652" y="302" fill="white" fontSize="10" fontWeight="700">91%</text>
        <rect x="648" y="316" width="40" height="3" rx="1.5" fill="#1E293B" />
        <rect x="648" y="316" width="36" height="3" rx="1.5" fill="#22C55E" />
        <text x="696" y="308" fill="#94A3B8" fontSize="9">18 Apr 2026</text>
        <text x="750" y="308" fill="#94A3B8" fontSize="9">25 Apr 2026</text>
        <rect x="808" y="297" width="32" height="16" rx="3" fill="transparent" stroke="#0EA5E9" strokeWidth="1" />
        <text x="815" y="309" fill="#0EA5E9" fontSize="9">View</text>

        {/* Row 1 divider */}
        <line x1="216" y1="322" x2="886" y2="322" stroke="#1E293B" strokeWidth="1" />

        {/* Row 2 - Clearview - AMBER */}
        <rect x="216" y="322" width="670" height="36" fill="#111827" />
        <text x="220" y="336" fill="white" fontSize="10" fontWeight="600">Clearview Solutions</text>
        <text x="220" y="350" fill="#64748B" fontSize="9">Network Infrastructure R...</text>
        <rect x="318" y="344" width="36" height="14" rx="3" fill="#78350F" />
        <text x="322" y="355" fill="#FCD34D" fontSize="8" fontWeight="600">Project</text>
        <rect x="376" y="330" width="34" height="16" rx="3" fill="#78350F" />
        <text x="381" y="342" fill="#FCD34D" fontSize="9" fontWeight="700">AMBER</text>
        <text x="424" y="342" fill="white" fontSize="10">11</text>
        <text x="468" y="342" fill="white" fontSize="10">2</text>
        <text x="510" y="342" fill="white" fontSize="10">3h 12m</text>
        <text x="562" y="342" fill="white" fontSize="10">9</text>
        <text x="608" y="342" fill="white" fontSize="10">3</text>
        <text x="652" y="336" fill="white" fontSize="10" fontWeight="700">67%</text>
        <rect x="648" y="350" width="40" height="3" rx="1.5" fill="#1E293B" />
        <rect x="648" y="350" width="27" height="3" rx="1.5" fill="#F59E0B" />
        <text x="696" y="342" fill="#94A3B8" fontSize="9">14 Apr 2026</text>
        <text x="750" y="342" fill="#94A3B8" fontSize="9">21 Apr 2026</text>
        <rect x="808" y="331" width="32" height="16" rx="3" fill="transparent" stroke="#0EA5E9" strokeWidth="1" />
        <text x="815" y="343" fill="#0EA5E9" fontSize="9">View</text>

        <line x1="216" y1="358" x2="886" y2="358" stroke="#1E293B" strokeWidth="1" />

        {/* Row 3 - Apex - AMBER */}
        <rect x="216" y="358" width="670" height="36" fill="#0F172A" />
        <text x="220" y="372" fill="white" fontSize="10" fontWeight="600">Apex Group</text>
        <text x="220" y="386" fill="#64748B" fontSize="9">Recurring VPN disconnect...</text>
        <rect x="290" y="380" width="32" height="14" rx="3" fill="#1E3A5F" />
        <text x="296" y="391" fill="#38BDF8" fontSize="8" fontWeight="600">Ticket</text>
        <rect x="376" y="366" width="34" height="16" rx="3" fill="#78350F" />
        <text x="381" y="378" fill="#FCD34D" fontSize="9" fontWeight="700">AMBER</text>
        <text x="424" y="378" fill="white" fontSize="10">7</text>
        <text x="468" y="378" fill="white" fontSize="10">1</text>
        <text x="510" y="378" fill="white" fontSize="10">1h 54m</text>
        <text x="562" y="378" fill="white" fontSize="10">5</text>
        <text x="608" y="378" fill="white" fontSize="10">1</text>
        <text x="652" y="372" fill="white" fontSize="10" fontWeight="700">74%</text>
        <rect x="648" y="386" width="40" height="3" rx="1.5" fill="#1E293B" />
        <rect x="648" y="386" width="30" height="3" rx="1.5" fill="#F59E0B" />
        <text x="696" y="378" fill="#94A3B8" fontSize="9">17 Apr 2026</text>
        <text x="750" y="378" fill="#94A3B8" fontSize="9">24 Apr 2026</text>
        <rect x="808" y="367" width="32" height="16" rx="3" fill="transparent" stroke="#0EA5E9" strokeWidth="1" />
        <text x="815" y="379" fill="#0EA5E9" fontSize="9">View</text>

        <line x1="216" y1="394" x2="886" y2="394" stroke="#1E293B" strokeWidth="1" />

        {/* Row 4 - Birchwood - GREEN */}
        <rect x="216" y="394" width="670" height="36" fill="#111827" />
        <text x="220" y="408" fill="white" fontSize="10" fontWeight="600">Birchwood Financial</text>
        <text x="220" y="422" fill="#64748B" fontSize="9">M365 licensing audit - r...</text>
        <rect x="310" y="416" width="32" height="14" rx="3" fill="#1E3A5F" />
        <text x="316" y="427" fill="#38BDF8" fontSize="8" fontWeight="600">Ticket</text>
        <rect x="376" y="402" width="34" height="16" rx="3" fill="#14532D" />
        <text x="383" y="414" fill="#4ADE80" fontSize="9" fontWeight="700">GREEN</text>
        <text x="424" y="414" fill="white" fontSize="10">2</text>
        <text x="468" y="414" fill="white" fontSize="10">0</text>
        <text x="510" y="414" fill="white" fontSize="10">22m</text>
        <text x="562" y="414" fill="white" fontSize="10">3</text>
        <text x="608" y="414" fill="white" fontSize="10">0</text>
        <text x="652" y="408" fill="white" fontSize="10" fontWeight="700">88%</text>
        <rect x="648" y="422" width="40" height="3" rx="1.5" fill="#1E293B" />
        <rect x="648" y="422" width="35" height="3" rx="1.5" fill="#22C55E" />
        <text x="696" y="414" fill="#94A3B8" fontSize="9">19 Apr 2026</text>
        <text x="750" y="414" fill="#94A3B8" fontSize="9">26 Apr 2026</text>
        <rect x="808" y="403" width="32" height="16" rx="3" fill="transparent" stroke="#0EA5E9" strokeWidth="1" />
        <text x="815" y="415" fill="#0EA5E9" fontSize="9">View</text>
      </svg>
    </div>
  )
}

