"use client";

import { ArrowRight, Check, ExternalLink, LockKeyhole } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SignOutButton } from "@/app/onboarding/sign-out-button";
import { HaloCredentialsFields } from "@/components/halo-credentials-fields";
import { normalizeHaloUrlForSubmit } from "@/lib/halo-url";
import { createClient } from "@/lib/supabase/client";

type PsaType = "halo" | "connectwise";

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10";
const labelClass = "text-xs font-semibold uppercase tracking-[0.12em] text-white/55";

const instructions = {
  halo: {
    title: "Create a read-only HaloPSA application",
    steps: [
      "In HaloPSA, open Configuration → Integrations → Halo API and create an application.",
      "Choose client-credentials authentication. Do not grant write, action, or administration permissions.",
      "Grant read access to Tickets, TicketType, and ClientContract. Tickets supplies the historical scan; TicketType is used to classify the records; ClientContract supplies recurring value when your instance stores it.",
      "Copy the HaloPSA base URL, Client ID, and Client Secret here. Add a tenant only if your HaloPSA installation asks for one.",
    ],
  },
  connectwise: {
    title: "Create a read-only ConnectWise application",
    steps: [
      "In ConnectWise Manage, open System → Members → API Members and create a dedicated API member for Handover.",
      "Create a security role with Inquire (read) access to Service Desk → Service Tickets and Finance → Agreements. No Add, Edit, Delete, or execute permissions are needed.",
      "Assign the role to the API member, create its public/private API keys, and copy the company ID and site URL here.",
      "Leave Client ID blank unless your ConnectWise admin gave you one. Handover reads ticket dates, time and agreement billing values only.",
    ],
  },
} as const;

export function ScanConnectForm() {
  const router = useRouter();
  const [psaType, setPsaType] = useState<PsaType>("halo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [resultsExpired, setResultsExpired] = useState(false);
  const [storedConnectionState, setStoredConnectionState] = useState<
    "checking" | "available" | "missing"
  >("checking");
  const [savedScanBusy, setSavedScanBusy] = useState(false);
  const [savedScanError, setSavedScanError] = useState<string | null>(null);

  const [haloUrl, setHaloUrl] = useState("");
  const [tenant, setTenant] = useState("");
  const [haloClientId, setHaloClientId] = useState("");
  const [haloClientSecret, setHaloClientSecret] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [cwClientId, setCwClientId] = useState("");

  useEffect(() => {
    const supabase = createClient();
    setResultsExpired(
      new URLSearchParams(window.location.search).get("reason") === "results-expired",
    );
    void supabase.auth.getUser().then(({ data: { user } }) => {
      const accountEmail = user?.email?.trim() ?? "";
      if (accountEmail) setEmail((current) => (current.trim() ? current : accountEmail));
    });
    let cancelled = false;
    void fetch("/onboarding/scan/start-stored", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          hasStoredConnection?: boolean;
        };
        if (!cancelled) {
          setStoredConnectionState(
            response.ok && data.hasStoredConnection ? "available" : "missing",
          );
        }
      })
      .catch(() => {
        if (!cancelled) setStoredConnectionState("missing");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runSavedScan = async () => {
    if (savedScanBusy) return;
    setSavedScanBusy(true);
    setSavedScanError(null);
    try {
      const response = await fetch("/onboarding/scan/start-stored", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!response.ok || !data.ok) {
        setSavedScanError(
          data.message ?? data.error ?? "We could not start a scan with the saved connection.",
        );
        return;
      }
      router.push("/onboarding/scan");
    } catch {
      setSavedScanError("We could not reach Handover. Please try again.");
    } finally {
      setSavedScanBusy(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const credentials =
      psaType === "halo"
        ? {
            psaType,
            haloUrl: normalizeHaloUrlForSubmit(haloUrl),
            tenant: tenant || null,
            clientId: haloClientId,
            clientSecret: haloClientSecret,
          }
        : {
            psaType,
            siteUrl,
            companyId,
            publicKey,
            privateKey,
            clientId: cwClientId,
          };

    try {
      const response = await fetch("/onboarding/scan/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), credentials }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!response.ok || !data.ok) {
        setError(data.message ?? data.error ?? "The PSA connection could not be validated.");
        return;
      }
      router.push("/onboarding/scan");
    } catch {
      setError("We could not reach Handover. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const copy = instructions[psaType];
  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white sm:px-6 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Image src="/icon2.png" alt="" width={30} height={30} className="rounded-lg" />
            Handover
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-[0.16em] text-white/35">Free PSA scan</span>
            <SignOutButton />
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <ScanSteps current={0} />
            <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
              See which clients are slipping.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/60">
              Connect a read-only API key. In about a minute you&apos;ll see your Revenue at Risk, what renews
              soon, your margin gap and a replay of last year&apos;s losses. You see the results before you
              make an account.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {(["halo", "connectwise"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setPsaType(type);
                    setError(null);
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${
                    psaType === type
                      ? "border-cyan-300/60 bg-cyan-300/10"
                      : "border-white/10 bg-black/10 hover:border-white/25"
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="font-semibold">{type === "halo" ? "HaloPSA" : "ConnectWise Manage"}</span>
                    {psaType === type ? <Check className="size-4 text-cyan-300" /> : null}
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-white/50">
                    {type === "halo" ? "Tickets, dates, and client contracts" : "Manage tickets and finance agreements"}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
              <div className="flex gap-3">
                <LockKeyhole className="mt-0.5 size-5 shrink-0 text-cyan-300" />
                <p className="text-xs leading-6 text-white/65">
                  Read-only access. Credentials are encrypted, never used to write to your PSA,
                  and deleted within one hour if you do not continue.{" "}
                  <a className="text-cyan-300 underline underline-offset-4" href="/security">
                    Read our security details
                  </a>
                  .
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#0d1b2d] p-6 sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Connection setup</p>
                <h2 className="mt-2 text-xl font-semibold">{copy.title}</h2>
              </div>
              <ExternalLink className="size-5 text-white/25" />
            </div>

            {resultsExpired && storedConnectionState === "missing" ? (
              <p className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-100/80">
                This scan has expired and no saved PSA connection is available. Enter a connection below to run a new scan.
              </p>
            ) : null}
            {resultsExpired && storedConnectionState === "available" ? (
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-5">
                <p className="text-sm font-semibold text-white">This scan has expired. Run a new one.</p>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Your saved PSA connection is ready, so you do not need to enter your credentials again.
                </p>
                <button
                  type="button"
                  onClick={() => void runSavedScan()}
                  disabled={savedScanBusy}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 disabled:cursor-wait disabled:opacity-60"
                >
                  {savedScanBusy ? "Starting scan…" : "Run a new scan"}
                  <ArrowRight className="size-4" />
                </button>
                {savedScanError ? (
                  <p className="mt-3 text-sm leading-6 text-red-200" role="alert">{savedScanError}</p>
                ) : null}
              </div>
            ) : (
              <>
                <ol className="mb-5 space-y-3 text-sm leading-6 text-white/60">
                  {copy.steps.map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs text-cyan-200">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <ShareSteps psaName={psaType === "halo" ? "HaloPSA" : "ConnectWise"} title={copy.title} steps={copy.steps} />
              <form onSubmit={submit} className="mt-6 space-y-4 border-t border-white/10 pt-6">
              <label htmlFor="scan-email" className="block">
                <span className={labelClass}>Work email</span>
                <input
                  id="scan-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                  className={inputClass}
                />
                <span className="mt-1.5 block text-xs text-white/40">So we can hand the results back to you. No marketing list.</span>
              </label>
              {psaType === "halo" ? (
                <HaloCredentialsFields
                  url={haloUrl}
                  onUrlChange={setHaloUrl}
                  tenant={tenant}
                  onTenantChange={setTenant}
                  clientId={haloClientId}
                  onClientIdChange={setHaloClientId}
                  clientSecret={haloClientSecret}
                  onClientSecretChange={setHaloClientSecret}
                  variant="onboarding"
                  idPrefix="halo"
                />
              ) : (
                <>
                  <Field label="ConnectWise site URL" id="cw-site-url" value={siteUrl} onChange={setSiteUrl} placeholder="https://na.myconnectwise.net" required />
                  <Field label="Company ID" id="cw-company-id" value={companyId} onChange={setCompanyId} required />
                  <Field label="Public key" id="cw-public-key" value={publicKey} onChange={setPublicKey} required />
                  <Field label="Private key" id="cw-private-key" type="password" value={privateKey} onChange={setPrivateKey} autoComplete="new-password" required />
                  <Field label="Client ID (optional)" id="cw-client-id" value={cwClientId} onChange={setCwClientId} placeholder="Leave blank to use Handover's" />
                </>
              )}

              {error ? (
                <p className="rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-3 text-sm leading-6 text-red-200" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={busy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"
              >
                {busy ? "Validating connection…" : "Validate and start scan"}
                {!busy ? <ArrowRight className="size-4" /> : null}
              </button>
              <p className="text-center text-xs text-white/35">The scan usually takes 20 to 60 seconds. Nothing in your PSA changes.</p>
              </form>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  autoComplete,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className={labelClass}>{label}</span>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className={inputClass}
      />
    </label>
  );
}

const SCAN_STEPS = ["Connect", "Scan", "Results"];

/** Where you are in the free scan: connect, scan, results. */
export function ScanSteps({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-xs font-medium" aria-label="Free scan steps">
      {SCAN_STEPS.map((step, index) => (
        <li key={step} className="flex items-center gap-2">
          <span
            className={`flex size-6 items-center justify-center rounded-full border text-[11px] ${
              index < current
                ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-200"
                : index === current
                  ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                  : "border-white/15 text-white/35"
            }`}
            aria-current={index === current ? "step" : undefined}
          >
            {index < current ? <Check className="size-3" /> : index + 1}
          </span>
          <span className={index === current ? "text-white" : "text-white/40"}>{step}</span>
          {index < SCAN_STEPS.length - 1 ? <span className="h-px w-6 bg-white/15" aria-hidden /> : null}
        </li>
      ))}
    </ol>
  );
}

/**
 * Most owners do not create API keys themselves. One click sends the exact
 * steps to whoever does, or copies them.
 */
function ShareSteps({ psaName, title, steps }: { psaName: string; title: string; steps: readonly string[] }) {
  const [copied, setCopied] = useState(false);
  const body = `Hi,\n\nCould you set up a read-only ${psaName} API key for Handover? It only needs read access and takes about two minutes.\n\n${title}:\n${steps
    .map((step, index) => `${index + 1}. ${step}`)
    .join("\n")}\n\nWhen it's done, send me the details, or enter them yourself at https://gethandover.uk/onboarding/connect\n\nThanks`;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
      <span className="text-white/60">Not the one who manages {psaName}?</span>
      <a
        href={`mailto:?subject=${encodeURIComponent(`Read-only ${psaName} API key for Handover`)}&body=${encodeURIComponent(body)}`}
        className="font-semibold text-cyan-200 hover:text-cyan-100"
      >
        Email these steps
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(body);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            setCopied(false);
          }
        }}
        className="min-h-0 font-semibold text-white/70 hover:text-white"
      >
        {copied ? "Copied" : "Copy them"}
      </button>
    </div>
  );
}
