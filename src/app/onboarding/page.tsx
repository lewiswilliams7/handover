"use client";

import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase";

const ONBOARDING_PAGE_SEEN_KEY = "handover_onboarding_page_seen";
const ONBOARDING_STYLE_ID = "handover-onboarding-styles";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-onboarding-sans",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-onboarding-mono",
  display: "swap",
});

type Step = 0 | 1 | 2 | 3;
type PsaChoice = "halo" | "cw" | "later";

type ClientOption = {
  name: string;
  ticketCount: number;
};

const REPORT_TYPES = [
  "Weekly Update",
  "Project Status",
  "QBR",
  "Monthly Review",
] as const;

const DEMO_CLIENT_OPTIONS: ClientOption[] = [
  { name: "Meridian Health", ticketCount: 24 },
  { name: "Northwood Manufacturing", ticketCount: 18 },
  { name: "Bridgewater Council", ticketCount: 11 },
  { name: "Meridian Logistics Co", ticketCount: 7 },
];

const DEMO_INPUTS: Record<string, string> = {
  "Meridian Health":
    "Client: Meridian Health\n\nTickets this week:\n- QBR preparation — slides drafted, awaiting client confirmation\n- Office 365 licence review — 3 unused licences identified\n- Firewall firmware update — scheduled for Saturday maintenance window",
  "Northwood Manufacturing":
    "Client: Northwood Manufacturing\n\nTickets this week:\n- SPF record update for sales team email delivery\n- SharePoint Phase 2 migration — 847GB migrated, archive phase next week\n- MFA hardware token procurement — awaiting approval",
  "Bridgewater Council":
    "Client: Bridgewater Council\n\nTickets this week:\n- Fortigate firewall migration — window confirmed Saturday 14 June\n- VPN tunnel documentation complete\n- Change request approved",
  "Meridian Logistics Co":
    "Client: Meridian Logistics Co\n\nTickets this week:\n- Azure Infrastructure Migration cutover planning\n- Legacy server decommission complete\n- Backup validation successful",
};

const FEATURES = [
  { label: "Actions", color: "blue" as const },
  { label: "Risks", color: "red" as const },
  { label: "Summary", color: "indigo" as const },
  { label: "Status Report", color: "green" as const },
  { label: "Client Email", color: "magenta" as const },
  { label: "QBR Pack", color: "blue" as const },
];

const ONBOARDING_CSS = `
.ho-root {
  --bg: #0a0f1c;
  --surface: #111a2e;
  --accent: #3bc0f0;
  --accent-2: #1aa3e0;
  --border: rgba(255, 255, 255, 0.07);
  --text: rgba(255, 255, 255, 0.92);
  --muted: rgba(255, 255, 255, 0.55);
  --success: #4e9c6f;
  --danger: #f87171;
  --mono: var(--font-onboarding-mono), "JetBrains Mono", monospace;
  --sans: var(--font-onboarding-sans), "Hanken Grotesk", system-ui, sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
}
.ho-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.ho-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 140px;
}
.ho-brand-name {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.ho-progress {
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 6px;
}
.ho-progress-seg {
  height: 4px;
  width: 72px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  transition: background 0.3s ease;
}
.ho-progress-seg.on {
  background: var(--accent);
}
.ho-header-actions {
  min-width: 140px;
  display: flex;
  justify-content: flex-end;
}
.ho-skip {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.45);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}
.ho-skip:hover { color: rgba(255, 255, 255, 0.8); }
.ho-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.ho-step {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.ho-step [data-anim] {
  opacity: 0;
}
.ho-step.play [data-anim] {
  animation: ho-rise 0.55s cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
  animation-delay: calc(var(--d, 0) * 70ms);
}
@keyframes ho-rise {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.ho-split {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr;
  min-height: 0;
}
@media (min-width: 1024px) {
  .ho-split { grid-template-columns: 1fr 1fr; }
}
.ho-split-left {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2.5rem 2rem;
}
@media (min-width: 1024px) {
  .ho-split-left { padding: 3rem 3.5rem; }
}
.ho-split-right {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2.5rem 2rem;
  border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 45%, var(--bg));
}
@media (min-width: 1024px) {
  .ho-split-right {
    border-top: none;
    border-left: 1px solid var(--border);
    padding: 3rem 2.5rem;
  }
}
.ho-eyebrow {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 0.75rem;
}
.ho-h1 {
  font-size: clamp(2rem, 4vw, 2.5rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.03em;
  margin: 0;
}
.ho-lede {
  margin-top: 1rem;
  max-width: 28rem;
  font-size: 15px;
  line-height: 1.65;
  color: var(--muted);
}
.ho-grid-label {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 1rem;
}
.ho-feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}
@media (min-width: 640px) {
  .ho-feature-grid { grid-template-columns: repeat(3, 1fr); }
}
.ho-feature-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1rem;
  font-size: 13px;
  font-weight: 500;
}
.ho-feature-card.blue { background: rgba(59, 192, 240, 0.1); border-color: rgba(59, 192, 240, 0.2); }
.ho-feature-card.red { background: rgba(248, 113, 113, 0.1); border-color: rgba(248, 113, 113, 0.2); }
.ho-feature-card.indigo { background: rgba(129, 140, 248, 0.1); border-color: rgba(129, 140, 248, 0.2); }
.ho-feature-card.green { background: rgba(52, 211, 153, 0.1); border-color: rgba(52, 211, 153, 0.2); }
.ho-feature-card.magenta { background: rgba(244, 114, 182, 0.1); border-color: rgba(244, 114, 182, 0.2); }
.ho-centered {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2.5rem 1.5rem;
  max-width: 52rem;
  margin: 0 auto;
  width: 100%;
}
.ho-centered h1 {
  font-size: clamp(1.75rem, 3vw, 2rem);
  font-weight: 700;
  text-align: center;
  margin: 0;
  letter-spacing: -0.02em;
}
.ho-centered .ho-sub {
  margin-top: 0.5rem;
  text-align: center;
  font-size: 15px;
  color: var(--muted);
  max-width: 32rem;
}
.ho-psa-grid {
  display: grid;
  gap: 1rem;
  width: 100%;
  margin-top: 2.5rem;
}
@media (min-width: 640px) {
  .ho-psa-grid { grid-template-columns: repeat(3, 1fr); }
}
.ho-psa-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1.5rem 1.25rem;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  color: inherit;
  font: inherit;
}
.ho-psa-card:hover {
  transform: translateY(-5px);
}
.ho-psa-card.halo:hover {
  border-color: rgba(248, 113, 113, 0.45);
  box-shadow: 0 12px 40px -12px rgba(248, 113, 113, 0.35);
}
.ho-psa-card.cw:hover {
  border-color: rgba(99, 102, 241, 0.45);
  box-shadow: 0 12px 40px -12px rgba(99, 102, 241, 0.35);
}
.ho-psa-card.later:hover {
  border-color: rgba(59, 192, 240, 0.35);
  box-shadow: 0 12px 40px -12px rgba(59, 192, 240, 0.2);
}
.ho-psa-card.selected.halo {
  border-color: rgba(248, 113, 113, 0.55);
  box-shadow: 0 0 0 1px rgba(248, 113, 113, 0.35);
}
.ho-psa-card.selected.cw {
  border-color: rgba(99, 102, 241, 0.55);
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.35);
}
.ho-psa-logo-wrap {
  min-height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}
.ho-psa-name {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
}
.ho-psa-desc {
  margin: 0.5rem 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--muted);
}
.ho-later-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  margin: 0 auto 1rem;
}
.ho-instructions h2 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 1.5rem;
}
.ho-instructions ol {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 14px;
  line-height: 1.65;
  color: var(--muted);
}
.ho-instructions li { margin-bottom: 1rem; }
.ho-instructions strong { color: rgba(255, 255, 255, 0.85); font-weight: 600; }
.ho-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.ho-field label {
  display: block;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
  margin-bottom: 0.4rem;
}
.ho-field input {
  width: 100%;
  box-sizing: border-box;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  padding: 0.65rem 0.75rem;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}
.ho-field input:focus {
  border-color: rgba(59, 192, 240, 0.55);
}
.ho-form-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.25rem;
}
.ho-btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 10px;
  padding: 0.6rem 1rem;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.ho-btn-ghost:hover:not(:disabled) { background: rgba(255, 255, 255, 0.05); }
.ho-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
.ho-error {
  margin-top: 0.75rem;
  font-size: 13px;
  color: var(--danger);
}
.ho-success {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 13px;
  color: var(--success);
}
.ho-check-svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.ho-check-svg path {
  stroke: currentColor;
  stroke-width: 2.5;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
}
.ho-check-svg.draw path {
  animation: ho-check-draw 0.45s ease forwards 0.1s;
}
@keyframes ho-check-draw {
  to { stroke-dashoffset: 0; }
}
.ho-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: ho-spin 0.7s linear infinite;
  display: inline-block;
  vertical-align: middle;
  margin-right: 6px;
}
@keyframes ho-spin {
  to { transform: rotate(360deg); }
}
.ho-client-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
  width: 100%;
  margin-top: 1.75rem;
}
.ho-client-chip {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;
  transition: border-color 0.15s, background 0.15s;
}
.ho-client-chip:hover { border-color: rgba(59, 192, 240, 0.35); }
.ho-client-chip.on {
  border-color: rgba(59, 192, 240, 0.65);
  background: rgba(59, 192, 240, 0.08);
}
.ho-client-initial {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(59, 192, 240, 0.15);
  color: var(--accent);
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ho-pills {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
  width: 100%;
}
.ho-pill {
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  padding: 0.4rem 0.85rem;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.ho-pill.on {
  border-color: rgba(59, 192, 240, 0.65);
  background: rgba(59, 192, 240, 0.12);
  color: #7dd3fc;
}
.ho-generate-btn {
  width: 100%;
  margin-top: 1.75rem;
  border: none;
  border-radius: 12px;
  padding: 0.9rem 1.25rem;
  font-size: 15px;
  font-weight: 600;
  color: #042233;
  cursor: pointer;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  box-shadow: 0 8px 32px -8px rgba(59, 192, 240, 0.45);
  transition: opacity 0.15s, transform 0.15s;
}
.ho-generate-btn:hover:not(:disabled) { transform: translateY(-1px); }
.ho-generate-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.ho-generate-note {
  margin-top: 0.75rem;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}
.ho-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  gap: 1rem;
}
.ho-footer-end { margin-left: auto; display: flex; gap: 0.75rem; }
.ho-back {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.45);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}
.ho-back:hover { color: rgba(255, 255, 255, 0.75); }
.ho-btn-primary {
  border: none;
  border-radius: 10px;
  padding: 0.6rem 1.25rem;
  font-size: 14px;
  font-weight: 600;
  color: #042233;
  background: var(--accent);
  cursor: pointer;
  transition: opacity 0.15s;
}
.ho-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ho-loading-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0f1c;
}
.ho-loading-spinner {
  width: 32px;
  height: 32px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: #3bc0f0;
  border-radius: 50%;
  animation: ho-spin 0.7s linear infinite;
}
`;

function progressSegments(step: Step): number {
  if (step <= 0) return 1;
  if (step === 1) return 2;
  return 3;
}

function clientInitial(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

function CheckIcon({ draw }: { draw: boolean }) {
  return (
    <svg className={`ho-check-svg${draw ? " draw" : ""}`} viewBox="0 0 24 24" aria-hidden>
      <path d="M20 6 9 17 4 12" />
    </svg>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [stepPlay, setStepPlay] = useState(false);
  const [psaChoice, setPsaChoice] = useState<PsaChoice | null>(null);
  const [connectionTested, setConnectionTested] = useState(false);
  const [checkDraw, setCheckDraw] = useState(false);

  const [haloUrl, setHaloUrl] = useState("");
  const [haloTenant, setHaloTenant] = useState("");
  const [haloClientId, setHaloClientId] = useState("");
  const [haloClientSecret, setHaloClientSecret] = useState("");
  const [haloLoading, setHaloLoading] = useState(false);
  const [haloError, setHaloError] = useState<string | null>(null);

  const [cwSiteUrl, setCwSiteUrl] = useState("");
  const [cwCompanyId, setCwCompanyId] = useState("");
  const [cwPublicKey, setCwPublicKey] = useState("");
  const [cwPrivateKey, setCwPrivateKey] = useState("");
  const [cwClientId, setCwClientId] = useState("");
  const [cwLoading, setCwLoading] = useState(false);
  const [cwError, setCwError] = useState<string | null>(null);

  const [clientOptions, setClientOptions] = useState<ClientOption[]>(DEMO_CLIENT_OPTIONS);
  const [selectedClient, setSelectedClient] = useState(DEMO_CLIENT_OPTIONS[0]!.name);
  const [reportType, setReportType] = useState<(typeof REPORT_TYPES)[number]>("Weekly Update");
  const [finishing, setFinishing] = useState(false);

  const goToStep = useCallback((next: Step) => {
    setStepPlay(false);
    setStep(next);
  }, []);

  const markOnboardingComplete = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
  }, []);

  const skipOnboarding = useCallback(async () => {
    await markOnboardingComplete();
    try {
      sessionStorage.setItem(ONBOARDING_PAGE_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    router.push("/");
  }, [markOnboardingComplete, router]);

  const invalidateConnectionTest = () => {
    setConnectionTested(false);
    setCheckDraw(false);
  };

  useEffect(() => {
    document.body.classList.add("onboarding-fullscreen");
    return () => document.body.classList.remove("onboarding-fullscreen");
  }, []);

  useEffect(() => {
    if (document.getElementById(ONBOARDING_STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = ONBOARDING_STYLE_ID;
    el.textContent = ONBOARDING_CSS;
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(ONBOARDING_PAGE_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (profile?.onboarding_completed === true) {
        router.replace("/");
        return;
      }
      setAuthReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    setStepPlay(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setStepPlay(true));
    });
    return () => cancelAnimationFrame(id);
  }, [step]);

  useEffect(() => {
    if (step !== 3) return;
    if (psaChoice === "later") {
      setClientOptions(DEMO_CLIENT_OPTIONS);
      setSelectedClient(DEMO_CLIENT_OPTIONS[0]!.name);
      return;
    }
    if (!connectionTested) return;

    let cancelled = false;
    void (async () => {
      try {
        const clientsUrl = psaChoice === "halo" ? "/api/halo/clients" : "/api/cw/clients";
        const ticketsUrl =
          psaChoice === "halo"
            ? { url: "/api/halo/tickets", init: { method: "POST" as const, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ includeDetails: false, count: 500 }) } }
            : { url: "/api/cw/tickets", init: { method: "GET" as const } };

        const [clientsRes, ticketsRes] = await Promise.all([
          fetch(clientsUrl, { credentials: "include" }),
          fetch(ticketsUrl.url, { credentials: "include", ...ticketsUrl.init }),
        ]);

        const clientsData = (await clientsRes.json()) as {
          clients?: Array<{ name?: string; id?: number }>;
        };
        const ticketsData = (await ticketsRes.json()) as {
          tickets?: Array<{ client?: { name?: string }; clientName?: string }>;
        };

        const clients = Array.isArray(clientsData.clients) ? clientsData.clients : [];
        const tickets = Array.isArray(ticketsData.tickets) ? ticketsData.tickets : [];
        const countByClient = new Map<string, number>();
        for (const t of tickets) {
          const name =
            (typeof t.client?.name === "string" && t.client.name.trim()) ||
            (typeof t.clientName === "string" && t.clientName.trim()) ||
            "";
          if (!name) continue;
          countByClient.set(name, (countByClient.get(name) ?? 0) + 1);
        }

        const built: ClientOption[] = clients
          .map((c) => {
            const name = typeof c.name === "string" ? c.name.trim() : "";
            if (!name) return null;
            return { name, ticketCount: countByClient.get(name) ?? 0 };
          })
          .filter((c): c is ClientOption => c != null)
          .slice(0, 4);

        if (cancelled) return;
        if (built.length > 0) {
          setClientOptions(built);
          setSelectedClient(built[0]!.name);
        } else {
          setClientOptions(DEMO_CLIENT_OPTIONS);
          setSelectedClient(DEMO_CLIENT_OPTIONS[0]!.name);
        }
      } catch {
        if (!cancelled) {
          setClientOptions(DEMO_CLIENT_OPTIONS);
          setSelectedClient(DEMO_CLIENT_OPTIONS[0]!.name);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, psaChoice, connectionTested]);

  const testHaloConnection = async () => {
    if (haloLoading) return;
    setHaloLoading(true);
    setHaloError(null);
    setConnectionTested(false);
    setCheckDraw(false);
    try {
      const res = await fetch("/api/halo/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          haloUrl: haloUrl.trim(),
          tenant: haloTenant.trim() || null,
          clientId: haloClientId.trim(),
          clientSecret: haloClientSecret,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setHaloError(data.error ?? "Connection failed — check your credentials.");
        return;
      }
      setHaloClientSecret("");
      setConnectionTested(true);
      setCheckDraw(true);
    } catch {
      setHaloError("Connection failed — check your credentials.");
    } finally {
      setHaloLoading(false);
    }
  };

  const testCwConnection = async () => {
    if (cwLoading) return;
    setCwLoading(true);
    setCwError(null);
    setConnectionTested(false);
    setCheckDraw(false);
    try {
      const res = await fetch("/api/cw/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          siteUrl: cwSiteUrl.trim(),
          companyId: cwCompanyId.trim(),
          publicKey: cwPublicKey.trim(),
          privateKey: cwPrivateKey,
          clientId: cwClientId.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setCwError(data.error ?? "Connection failed — check your credentials.");
        return;
      }
      setCwPrivateKey("");
      setConnectionTested(true);
      setCheckDraw(true);
    } catch {
      setCwError("Connection failed — check your credentials.");
    } finally {
      setCwLoading(false);
    }
  };

  const pickPsa = (choice: PsaChoice) => {
    setPsaChoice(choice);
    setConnectionTested(false);
    setCheckDraw(false);
    if (choice === "later") {
      setClientOptions(DEMO_CLIENT_OPTIONS);
      setSelectedClient(DEMO_CLIENT_OPTIONS[0]!.name);
      goToStep(3);
      return;
    }
    goToStep(2);
  };

  const finishOnboarding = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await markOnboardingComplete();
      try {
        sessionStorage.setItem(ONBOARDING_PAGE_SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
      const demoInput =
        DEMO_INPUTS[selectedClient] ??
        `Client: ${selectedClient}\n\nTickets this week:\n- Review open items and prepare your weekly client update.`;
      router.push(
        `/?demoInput=${encodeURIComponent(demoInput)}&reportType=${encodeURIComponent(reportType)}&onboarding=complete`,
      );
    } finally {
      setFinishing(false);
    }
  };

  const progressOn = progressSegments(step);
  const stepClass = `ho-step${stepPlay ? " play" : ""}`;

  if (!authReady) {
    return (
      <div className={`ho-loading-screen ${hanken.variable} ${jetbrains.variable}`}>
        <div className="ho-loading-spinner" aria-hidden />
      </div>
    );
  }

  return (
    <div className={`ho-root ${hanken.variable} ${jetbrains.variable}`}>
      <header className="ho-header">
        <div className="ho-brand" data-anim style={{ "--d": 0 } as React.CSSProperties}>
          <img
            src="/icon2.png"
            alt="Handover"
            style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 6 }}
          />
          <span className="ho-brand-name">Handover</span>
        </div>
        <div className="ho-progress" aria-label="Setup progress">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`ho-progress-seg${n <= progressOn ? " on" : ""}`} />
          ))}
        </div>
        <div className="ho-header-actions">
          <button type="button" className="ho-skip" onClick={() => void skipOnboarding()}>
            Skip onboarding
          </button>
        </div>
      </header>

      <main className="ho-main">
        {step === 0 ? (
          <div className={stepClass}>
            <div className="ho-split">
              <div className="ho-split-left">
                <p className="ho-eyebrow" data-anim style={{ "--d": 1 } as React.CSSProperties}>
                  Welcome to Handover
                </p>
                <h1 className="ho-h1" data-anim style={{ "--d": 2 } as React.CSSProperties}>
                  Client reports that write themselves.
                </h1>
                <p className="ho-lede" data-anim style={{ "--d": 3 } as React.CSSProperties}>
                  Connect your PSA, pick a client, and get structured actions, risks, summaries, and
                  client-ready emails in under a minute.
                </p>
              </div>
              <div className="ho-split-right">
                <p className="ho-grid-label" data-anim style={{ "--d": 1 } as React.CSSProperties}>
                  Every report includes
                </p>
                <div className="ho-feature-grid">
                  {FEATURES.map((f, i) => (
                    <div
                      key={f.label}
                      className={`ho-feature-card ${f.color}`}
                      data-anim
                      style={{ "--d": i + 2 } as React.CSSProperties}
                    >
                      {f.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className={stepClass}>
            <div className="ho-centered">
              <h1 data-anim style={{ "--d": 1 } as React.CSSProperties}>
                Which PSA do you use?
              </h1>
              <p className="ho-sub" data-anim style={{ "--d": 2 } as React.CSSProperties}>
                We&apos;ll tailor setup instructions and sync live tickets for your first report.
              </p>
              <div className="ho-psa-grid">
                <button
                  type="button"
                  className={`ho-psa-card halo${psaChoice === "halo" ? " selected" : ""}`}
                  data-anim
                  style={{ "--d": 3 } as React.CSSProperties}
                  onClick={() => pickPsa("halo")}
                >
                  <div className="ho-psa-logo-wrap">
                    <img src="/halopsa.png" alt="HaloPSA" width={120} height={32} className="h-8 w-auto object-contain" />
                  </div>
                  <p className="ho-psa-name">HaloPSA</p>
                  <p className="ho-psa-desc">Pull tickets &amp; projects, push notes back to Halo.</p>
                </button>
                <button
                  type="button"
                  className={`ho-psa-card cw${psaChoice === "cw" ? " selected" : ""}`}
                  data-anim
                  style={{ "--d": 4 } as React.CSSProperties}
                  onClick={() => pickPsa("cw")}
                >
                  <div className="ho-psa-logo-wrap">
                    <img
                      src="/connectwise.jpeg"
                      alt="ConnectWise"
                      className="h-8 w-auto object-contain"
                      style={{ background: "white", padding: "4px 6px", borderRadius: 4 }}
                    />
                  </div>
                  <p className="ho-psa-name">ConnectWise</p>
                  <p className="ho-psa-desc">Native Manage integration for tickets and companies.</p>
                </button>
                <button
                  type="button"
                  className={`ho-psa-card later${psaChoice === "later" ? " selected" : ""}`}
                  data-anim
                  style={{ "--d": 5 } as React.CSSProperties}
                  onClick={() => pickPsa("later")}
                >
                  <div className="ho-later-icon" aria-hidden>
                    ⏭
                  </div>
                  <p className="ho-psa-name">I&apos;ll connect later</p>
                  <p className="ho-psa-desc">Explore with demo data — connect your PSA anytime.</p>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 && psaChoice === "halo" ? (
          <div className={stepClass}>
            <div className="ho-split">
              <div className="ho-split-left ho-instructions">
                <h2 data-anim style={{ "--d": 1 } as React.CSSProperties}>
                  Connect HaloPSA
                </h2>
                <ol data-anim style={{ "--d": 2 } as React.CSSProperties}>
                  <li>
                    In HaloPSA go to{" "}
                    <strong>Configuration → Integrations → Halo API</strong> and create an
                    application.
                  </li>
                  <li>
                    Enable permissions for tickets, clients, and projects (read at minimum; write if
                    you want push-back).
                  </li>
                  <li>Copy your instance URL, Client ID, and Client Secret into the form.</li>
                </ol>
              </div>
              <div className="ho-split-right">
                <div className="ho-form" data-anim style={{ "--d": 1 } as React.CSSProperties}>
                  <div className="ho-field">
                    <label htmlFor="halo-url">HaloPSA URL</label>
                    <input
                      id="halo-url"
                      value={haloUrl}
                      onChange={(e) => {
                        setHaloUrl(e.target.value);
                        invalidateConnectionTest();
                      }}
                      placeholder="https://yourcompany.halopsa.com"
                    />
                  </div>
                  <div className="ho-field">
                    <label htmlFor="halo-tenant">Tenant (optional)</label>
                    <input
                      id="halo-tenant"
                      value={haloTenant}
                      onChange={(e) => {
                        setHaloTenant(e.target.value);
                        invalidateConnectionTest();
                      }}
                    />
                  </div>
                  <div className="ho-field">
                    <label htmlFor="halo-client-id">Client ID</label>
                    <input
                      id="halo-client-id"
                      value={haloClientId}
                      onChange={(e) => {
                        setHaloClientId(e.target.value);
                        invalidateConnectionTest();
                      }}
                    />
                  </div>
                  <div className="ho-field">
                    <label htmlFor="halo-secret">Client Secret</label>
                    <input
                      id="halo-secret"
                      type="password"
                      autoComplete="off"
                      value={haloClientSecret}
                      onChange={(e) => {
                        setHaloClientSecret(e.target.value);
                        invalidateConnectionTest();
                      }}
                    />
                  </div>
                </div>
                {haloError ? <p className="ho-error">{haloError}</p> : null}
                {connectionTested ? (
                  <div className="ho-success">
                    <CheckIcon draw={checkDraw} />
                    Connected successfully
                  </div>
                ) : null}
                <div className="ho-form-actions" data-anim style={{ "--d": 2 } as React.CSSProperties}>
                  <button
                    type="button"
                    className="ho-btn-ghost"
                    disabled={haloLoading}
                    onClick={() => void testHaloConnection()}
                  >
                    {haloLoading ? (
                      <>
                        <span className="ho-spinner" aria-hidden />
                        Testing…
                      </>
                    ) : (
                      "Test connection"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 && psaChoice === "cw" ? (
          <div className={stepClass}>
            <div className="ho-split">
              <div className="ho-split-left ho-instructions">
                <h2 data-anim style={{ "--d": 1 } as React.CSSProperties}>
                  Connect ConnectWise Manage
                </h2>
                <ol data-anim style={{ "--d": 2 } as React.CSSProperties}>
                  <li>
                    In ConnectWise go to{" "}
                    <strong>System → Members → API Members</strong> and create API keys.
                  </li>
                  <li>Use your company ID, site URL, and public/private keys from the member record.</li>
                  <li>Add a Client ID if your instance requires one for integrations.</li>
                </ol>
              </div>
              <div className="ho-split-right">
                <div className="ho-form" data-anim style={{ "--d": 1 } as React.CSSProperties}>
                  <div className="ho-field">
                    <label htmlFor="cw-site">Site URL</label>
                    <input
                      id="cw-site"
                      value={cwSiteUrl}
                      onChange={(e) => {
                        setCwSiteUrl(e.target.value);
                        invalidateConnectionTest();
                      }}
                      placeholder="https://na.myconnectwise.net"
                    />
                  </div>
                  <div className="ho-field">
                    <label htmlFor="cw-company">Company ID</label>
                    <input
                      id="cw-company"
                      value={cwCompanyId}
                      onChange={(e) => {
                        setCwCompanyId(e.target.value);
                        invalidateConnectionTest();
                      }}
                    />
                  </div>
                  <div className="ho-field">
                    <label htmlFor="cw-public">Public Key</label>
                    <input
                      id="cw-public"
                      value={cwPublicKey}
                      onChange={(e) => {
                        setCwPublicKey(e.target.value);
                        invalidateConnectionTest();
                      }}
                    />
                  </div>
                  <div className="ho-field">
                    <label htmlFor="cw-private">Private Key</label>
                    <input
                      id="cw-private"
                      type="password"
                      autoComplete="off"
                      value={cwPrivateKey}
                      onChange={(e) => {
                        setCwPrivateKey(e.target.value);
                        invalidateConnectionTest();
                      }}
                    />
                  </div>
                  <div className="ho-field">
                    <label htmlFor="cw-client-id">Client ID</label>
                    <input
                      id="cw-client-id"
                      value={cwClientId}
                      onChange={(e) => {
                        setCwClientId(e.target.value);
                        invalidateConnectionTest();
                      }}
                    />
                  </div>
                </div>
                {cwError ? <p className="ho-error">{cwError}</p> : null}
                {connectionTested ? (
                  <div className="ho-success">
                    <CheckIcon draw={checkDraw} />
                    Connected successfully
                  </div>
                ) : null}
                <div className="ho-form-actions" data-anim style={{ "--d": 2 } as React.CSSProperties}>
                  <button
                    type="button"
                    className="ho-btn-ghost"
                    disabled={cwLoading}
                    onClick={() => void testCwConnection()}
                  >
                    {cwLoading ? (
                      <>
                        <span className="ho-spinner" aria-hidden />
                        Testing…
                      </>
                    ) : (
                      "Test connection"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className={stepClass}>
            <div className="ho-centered" style={{ maxWidth: "28rem" }}>
              <p className="ho-eyebrow" data-anim style={{ "--d": 1 } as React.CSSProperties}>
                One last thing
              </p>
              <h1 data-anim style={{ "--d": 2 } as React.CSSProperties}>
                Generate your first report.
              </h1>
              <p className="ho-sub" data-anim style={{ "--d": 3 } as React.CSSProperties}>
                {psaChoice === "later"
                  ? "Using demo data — connect your PSA anytime from Settings."
                  : "We’ll use live PSA data for this client."}
              </p>
              <div className="ho-client-grid">
                {clientOptions.map((c, i) => (
                  <button
                    key={c.name}
                    type="button"
                    className={`ho-client-chip${selectedClient === c.name ? " on" : ""}`}
                    data-anim
                    style={{ "--d": i + 4 } as React.CSSProperties}
                    onClick={() => setSelectedClient(c.name)}
                  >
                    <span className="ho-client-initial shrink-0">{clientInitial(c.name)}</span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                      <span className="text-[14px] font-semibold leading-tight">{c.name}</span>
                      <span className="text-[11px] text-white/40">
                        {c.ticketCount} open tickets
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <p
                className="ho-grid-label"
                style={{ marginTop: "1.75rem", textAlign: "center", width: "100%" }}
                data-anim
              >
                Report type
              </p>
              <div className="ho-pills">
                {REPORT_TYPES.map((t, i) => (
                  <button
                    key={t}
                    type="button"
                    className={`ho-pill${reportType === t ? " on" : ""}`}
                    data-anim
                    style={{ "--d": i + 8 } as React.CSSProperties}
                    onClick={() => setReportType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="ho-generate-btn"
                disabled={finishing}
                data-anim
                style={{ "--d": 12 } as React.CSSProperties}
                onClick={() => void finishOnboarding()}
              >
                {finishing ? "Finishing…" : "Generate my first report →"}
              </button>
              <p className="ho-generate-note" data-anim style={{ "--d": 13 } as React.CSSProperties}>
                Takes about 30 seconds · Nothing to configure
              </p>
            </div>
          </div>
        ) : null}
      </main>

      <footer className="ho-footer">
        {step > 0 ? (
          <button
            type="button"
            className="ho-back"
            onClick={() => {
              if (step === 3) {
                if (psaChoice === "later") goToStep(1);
                else goToStep(2);
              } else if (step === 2) goToStep(1);
              else if (step === 1) goToStep(0);
            }}
          >
            ← Back
          </button>
        ) : (
          <span />
        )}
        <div className="ho-footer-end">
          {step === 0 ? (
            <button type="button" className="ho-btn-primary" onClick={() => goToStep(1)}>
              Begin setup →
            </button>
          ) : null}
          {step === 2 && psaChoice !== "later" ? (
            <button
              type="button"
              className="ho-btn-primary"
              disabled={!connectionTested}
              onClick={() => goToStep(3)}
            >
              Continue →
            </button>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
