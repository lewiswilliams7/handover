"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Settings, Database, Upload, Download, X, Globe, Check, Loader2, Copy, FlaskConical, Palette, Plug } from "lucide-react"
import { usePSAStatus } from "@/hooks/usePSAStatus"
import { PSAEmptyState } from "@/components/psa-empty-state"
import { useToast } from "@/components/toasts"
import { createClient } from "@/lib/supabase"

type DashboardViewMode = "paginated" | "continuous"

type ConfigSection =
  | "general"
  | "custom-fields"
  | "client-portal"
  | "branding"
  | "integrations"
  | "demo-mode"

export type ConfigurationTargetSection = "branding" | "integrations"

type Props = {
  userEmail: string | null
  plan: string | null
  hasProAccess: boolean
  hasPortalPlanAccess?: boolean
  demoModeActive?: boolean
  demoEnabled?: boolean
  demoForceEnabled?: boolean
  psaConnected?: boolean
  onToggleDemo?: (enabled: boolean) => void
  /** Shown when `hasProAccess`; Pro+ branding controls from the parent. */
  brandingSection?: ReactNode | null
  /** PSA and notification integrations hub (Configuration → Integrations). */
  integrationsSection?: ReactNode | null
  /** When set, switches to this section once (then call `onTargetSectionApplied`). */
  targetSection?: ConfigurationTargetSection | null
  onTargetSectionApplied?: () => void
  dashboardViewMode?: DashboardViewMode
  onDashboardViewModeChange?: (mode: DashboardViewMode) => void
}

const OUTPUT_OPTIONS = [
  { value: "actions", label: "Action Log" },
  { value: "risks", label: "Risk Log" },
  { value: "summary", label: "Summary" },
  { value: "status_report", label: "Status Report" },
  { value: "client_email", label: "Client Email" },
  { value: "qbr", label: "QBR Pack" },
  { value: "excel", label: "Excel Export" },
  { value: "scheduled", label: "Scheduled Reports" },
]

type FieldMapping = {
  id: string
  psa: "halopsa" | "connectwise"
  fieldName: string
  displayName: string
  outputs: string[]
}

const BASE_NAV_ITEMS: Array<{
  id: ConfigSection
  label: string
  icon: React.ElementType
  description: string
}> = [
  { id: "general", label: "General", icon: Settings, description: "Workspace preferences and performance" },
  { id: "integrations", label: "Integrations", icon: Plug, description: "Connect and configure your tools" },
  { id: "custom-fields", label: "Custom Fields", icon: Database, description: "Map PSA custom fields to report outputs" },
  { id: "client-portal", label: "Client Portal", icon: Globe, description: "Set and manage your customer portal URL" },
  { id: "branding", label: "Branding", icon: Palette, description: "Logo, colours, and white label for exports and client-facing output" },
]

export function ConfigurationPanel({
  hasProAccess,
  hasPortalPlanAccess = false,
  plan,
  demoEnabled = false,
  demoForceEnabled = false,
  psaConnected = false,
  onToggleDemo,
  brandingSection = null,
  integrationsSection = null,
  targetSection = null,
  onTargetSectionApplied,
  dashboardViewMode = "paginated",
  onDashboardViewModeChange,
}: Props) {
  const showClientPortal = hasPortalPlanAccess
  const navItems = useMemo(
    () => {
      const base = BASE_NAV_ITEMS.filter((item) => {
        if (item.id === "client-portal") return showClientPortal
        if (item.id === "branding") return hasProAccess && brandingSection != null
        if (item.id === "integrations") return integrationsSection != null
        return true
      })
      base.push({
        id: "demo-mode",
        label: "Demo Mode",
        icon: FlaskConical,
        description: "Control sample demo data visibility",
      })
      return base
    },
    [showClientPortal, hasProAccess, brandingSection, integrationsSection],
  )
  const [activeSection, setActiveSection] = useState<ConfigSection>("custom-fields")
  const active = navItems.find(n => n.id === activeSection) ?? navItems[0]

  useEffect(() => {
    if (!navItems.some((item) => item.id === activeSection)) {
      setActiveSection(navItems[0]?.id ?? "custom-fields")
    }
  }, [activeSection, navItems])

  useEffect(() => {
    if (!targetSection) return
    const match = navItems.find((item) => item.id === targetSection)
    if (!match) {
      onTargetSectionApplied?.()
      return
    }
    setActiveSection(targetSection)
    onTargetSectionApplied?.()
  }, [targetSection, navItems, onTargetSectionApplied])

  return (
    <div className="flex h-full w-full min-h-[calc(100dvh-52px)] md:min-h-[calc(100vh-52px)]">
      {/* Left sidebar */}
      <div className="flex h-full min-h-0 w-[220px] shrink-0 flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="shrink-0 border-b border-[var(--border)] px-4 py-4">
          <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">Configuration</h1>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Workspace settings</p>
        </div>
        <nav className="flex-1 p-2">
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-[var(--radius)] px-3 py-2 text-left text-[13px] transition-colors",
                activeSection === item.id
                  ? "bg-[var(--accent)]/15 text-[var(--accent)] font-medium"
                  : "text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]",
              )}
            >
              <item.icon className="size-[14px] shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--bg-secondary)]",
          activeSection === "integrations" && integrationsSection ? "overflow-hidden" : "overflow-y-auto",
        )}
      >
        <div
          className={cn(
            "mx-auto flex min-h-0 w-full min-w-0 flex-1 flex-col px-6 py-8",
            activeSection === "integrations" && integrationsSection
              ? "max-w-none overflow-y-auto"
              : "max-w-3xl",
          )}
        >
          {!(activeSection === "integrations" && integrationsSection) ? (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">{active?.label}</h2>
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{active?.description}</p>
            </div>
          ) : null}
          {activeSection === "general" ? (
            <GeneralSection
              dashboardViewMode={dashboardViewMode}
              onDashboardViewModeChange={onDashboardViewModeChange}
            />
          ) : null}
          {activeSection === "custom-fields" && <CustomFieldsSection hasProAccess={hasProAccess} />}
          {activeSection === "client-portal" && showClientPortal ? <ClientPortalSection /> : null}
          {activeSection === "branding" && hasProAccess && brandingSection ? brandingSection : null}
          {activeSection === "integrations" && integrationsSection ? integrationsSection : null}
          {activeSection === "demo-mode" ? (
            <DemoModeSection
              enabled={demoEnabled}
              forceEnabled={demoForceEnabled}
              psaConnected={psaConnected}
              onToggle={(enabled) => onToggleDemo?.(enabled)}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function GeneralSection({
  dashboardViewMode,
  onDashboardViewModeChange,
}: {
  dashboardViewMode: DashboardViewMode
  onDashboardViewModeChange?: (mode: DashboardViewMode) => void
}) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)

  const saveMode = async (mode: DashboardViewMode) => {
    if (mode === dashboardViewMode) return
    setSaving(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase
        .from("profiles")
        .update({ dashboard_view_mode: mode })
        .eq("id", user.id)
      if (error) {
        toast({ message: "Could not save dashboard view mode.", variant: "error" })
        return
      }
      onDashboardViewModeChange?.(mode)
      toast({ message: "Dashboard view mode saved", durationMs: 2000 })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Performance</h3>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">Dashboard view mode</span>
          <span className="mt-1 block text-[var(--text-secondary)]">
            Choose how clients are displayed in the Delivery Health dashboard. Paginated is
            recommended for MSPs with 50 or more clients.
          </span>
        </p>
        <div
          className="mt-4 inline-flex rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] p-0.5"
          role="group"
          aria-label="Dashboard view mode"
        >
          <button
            type="button"
            disabled={saving}
            className={cn(
              "rounded-[calc(var(--radius)-2px)] px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-50",
              dashboardViewMode === "paginated"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
            onClick={() => void saveMode("paginated")}
          >
            Paginated
          </button>
          <button
            type="button"
            disabled={saving}
            className={cn(
              "rounded-[calc(var(--radius)-2px)] px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-50",
              dashboardViewMode === "continuous"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
            onClick={() => void saveMode("continuous")}
          >
            Continuous
          </button>
        </div>
        <p className="mt-3 text-[12px] text-[var(--text-muted)]">
          Paginated shows 25 clients per page. Continuous shows all clients in one scrollable list.
        </p>
      </div>
    </div>
  )
}

function DemoModeSection({
  enabled,
  forceEnabled,
  psaConnected = false,
  onToggle,
}: {
  enabled: boolean
  forceEnabled?: boolean
  psaConnected?: boolean
  onToggle: (enabled: boolean) => void
}) {
  const checked = psaConnected ? Boolean(forceEnabled) : enabled
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5">
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Demo Mode</h3>
      <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
        You&apos;re currently viewing sample data. Connect a PSA to see your real data, or toggle
        demo mode off to use Handover with manual input only.
      </p>
      <div className="mt-4 flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-[var(--text-primary)]">Show demo data</p>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide",
              checked
                ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                : "bg-white/[0.06] text-[var(--text-muted)]",
            )}
          >
            {checked ? "On" : "Off"}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onToggle(!checked)}
          className={cn(
            "inline-flex h-7 min-w-[120px] items-center rounded-full border px-4 py-1.5 transition-colors",
            checked ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border)] bg-[var(--bg-primary)]",
          )}
        >
          <span
            className={cn(
              "mx-1 block size-5 rounded-full bg-white transition-transform",
              checked ? "translate-x-5" : "translate-x-0",
            )}
          />
        </button>
      </div>
    </div>
  )
}

const PORTAL_SLUG_RE = /^[a-z0-9-]{3,30}$/
const PORTAL_DOMAIN_RE = /^(?=.{3,255}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/

function sanitizePortalSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 30)
}

function ClientPortalSection() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [savedSlug, setSavedSlug] = useState("")
  const [savedDomain, setSavedDomain] = useState("")
  const [selfServiceUrl, setSelfServiceUrl] = useState("")
  const [slug, setSlug] = useState("")
  const [domainInput, setDomainInput] = useState("")
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingDomain, setSavingDomain] = useState(false)
  const [savingSelfServiceUrl, setSavingSelfServiceUrl] = useState(false)
  const [editing, setEditing] = useState(true)
  const fullUrl = savedSlug ? `gethandover.uk/portal/${savedSlug}` : ""

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch("/api/portal/account", { credentials: "same-origin", cache: "no-store" })
        const data = (await res.json().catch(() => ({}))) as {
          portal?: { slug?: string | null; allowed_domain?: string | null; self_service_url?: string | null } | null
        }
        if (!cancelled) {
          const existing = typeof data.portal?.slug === "string" ? data.portal.slug : ""
          const existingDomain =
            typeof data.portal?.allowed_domain === "string" ? data.portal.allowed_domain.trim().toLowerCase() : ""
          const existingSelfServiceUrl =
            typeof data.portal?.self_service_url === "string" ? data.portal.self_service_url : ""
          setSavedSlug(existing)
          setSlug(existing)
          setSavedDomain(existingDomain)
          setDomainInput(existingDomain)
          setSelfServiceUrl(existingSelfServiceUrl)
          setEditing(!existing)
          setAvailable(existing ? null : null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!editing) return
    if (!slug || !PORTAL_SLUG_RE.test(slug)) {
      setChecking(false)
      setAvailable(slug ? false : null)
      return
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        setChecking(true)
        try {
          const res = await fetch(`/api/portal/check-slug?slug=${encodeURIComponent(slug)}`, {
            credentials: "same-origin",
          })
          const data = (await res.json().catch(() => ({}))) as { available?: boolean }
          setAvailable(res.ok ? data.available === true : false)
        } catch {
          setAvailable(false)
        } finally {
          setChecking(false)
        }
      })()
    }, 500)
    return () => window.clearTimeout(timer)
  }, [slug, editing])

  const onCopy = async () => {
    if (!fullUrl) return
    await navigator.clipboard.writeText(`https://${fullUrl}`)
    toast({ message: "Copied", variant: "success" })
  }

  const onSave = async () => {
    if (!PORTAL_SLUG_RE.test(slug)) return
    setSaving(true)
    try {
      const res = await fetch("/api/portal/save-slug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ slug }),
      })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string; slug?: string }
      if (!res.ok || data.success !== true) {
        toast({ message: data.error ?? "Could not save portal slug.", variant: "error" })
        return
      }
      const nextSlug = data.slug ?? slug
      setSlug(nextSlug)
      setSavedSlug(nextSlug)
      setEditing(false)
      setAvailable(true)
      toast({ message: "Portal URL saved", variant: "success" })
    } finally {
      setSaving(false)
    }
  }

  const onSaveDomain = async () => {
    const normalized = domainInput.trim().toLowerCase()
    if (normalized && !PORTAL_DOMAIN_RE.test(normalized)) {
      toast({
        message: "Enter a valid domain like acme.com (no @).",
        variant: "error",
      })
      return
    }
    setSavingDomain(true)
    try {
      const res = await fetch("/api/portal/update-domain", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ domain: normalized }),
      })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string }
      if (!res.ok || data.success !== true) {
        toast({ message: data.error ?? "Could not save domain.", variant: "error" })
        return
      }
      setSavedDomain(normalized)
      setDomainInput(normalized)
      toast({ message: "Allowed domain saved", variant: "success" })
    } finally {
      setSavingDomain(false)
    }
  }

  const saveSelfServiceUrl = async () => {
    setSavingSelfServiceUrl(true)
    try {
      const res = await fetch("/api/portal/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ self_service_url: selfServiceUrl }),
      })
      const data = (await res.json().catch(() => ({}))) as { portal?: { self_service_url?: string | null }; error?: string }
      if (!res.ok) {
        toast({ message: data.error ?? "Could not save self-service portal URL.", variant: "error" })
        return
      }
      setSelfServiceUrl(typeof data.portal?.self_service_url === "string" ? data.portal.self_service_url : "")
      toast({ message: "Self-service portal URL saved", variant: "success" })
    } finally {
      setSavingSelfServiceUrl(false)
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5">
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Client portal</h3>
      <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
        Set your MSP portal URL and which email domain may sign in. Add clients, visibility, and contacts from{" "}
        <span className="font-medium text-[var(--text-primary)]">Organisation</span> in the main sidebar.
      </p>
      <p className="mt-2 text-[12px] leading-snug text-[var(--text-muted)]">
        Company logo, brand colour, and white label are edited in{" "}
        <span className="font-medium text-[var(--text-secondary)]">Settings → Branding</span> (profile menu).
      </p>
      {loading ? (
        <p className="mt-4 text-[12px] text-[var(--text-muted)]">Loading portal settings...</p>
      ) : !editing && savedSlug && PORTAL_SLUG_RE.test(savedSlug) ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2">
            <input
              readOnly
              value={fullUrl}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text-primary)] outline-none"
            />
            <button
              type="button"
              onClick={() => void onCopy()}
              className="inline-flex items-center gap-1 rounded-[var(--radius)] border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <Copy className="size-3.5" />
              Copy
            </button>
            <button
              type="button"
              onClick={() => {
                setSlug(savedSlug)
                setEditing(true)
                setAvailable(null)
              }}
              className="inline-flex items-center rounded-[var(--radius)] border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Edit
            </button>
          </div>
          <a
            href={`https://${fullUrl}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex text-[12px] text-[var(--accent)] hover:underline"
          >
            View Portal
          </a>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">Portal slug</label>
            <div className="flex items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2">
              <span className="mr-2 shrink-0 text-[12px] text-[var(--text-muted)]">gethandover.uk/portal/</span>
              <input
                value={slug}
                onChange={(e) => setSlug(sanitizePortalSlug(e.target.value))}
                placeholder="your-msp"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text-primary)] outline-none"
              />
              {checking ? <Loader2 className="ml-2 size-4 animate-spin text-[var(--accent)]" /> : null}
              {!checking && available === true ? <Check className="ml-2 size-4 text-green-400" /> : null}
              {!checking && available === false && PORTAL_SLUG_RE.test(slug) ? <X className="ml-2 size-4 text-red-400" /> : null}
            </div>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              Lowercase letters, numbers, and hyphens only. 3-30 characters.
            </p>
          </div>
          <button
            type="button"
            disabled={!PORTAL_SLUG_RE.test(slug) || available !== true || saving}
            onClick={() => void onSave()}
            className="rounded-[var(--radius)] bg-[var(--accent)] px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      )}
      <div className="mt-5 space-y-3 border-t border-[var(--border)] pt-4">
        <div>
          <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">
            Allowed email domain
          </label>
          <input
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value.toLowerCase().replace(/@/g, "").trimStart())}
            placeholder="acme.com"
            className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            Only users with this email domain can access your portal. Leave blank to allow any authenticated user.
          </p>
          {savedDomain ? (
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">Current: {savedDomain}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void onSaveDomain()}
          disabled={savingDomain || (domainInput.trim().toLowerCase() === savedDomain && !loading)}
          className="rounded-[var(--radius)] bg-[var(--accent)] px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {savingDomain ? "Saving..." : "Save domain"}
        </button>
        <div className="space-y-1.5 border-t border-[var(--border)] pt-4">
          <label className="text-[13px] font-medium text-[var(--text-primary)]">Self-service portal URL</label>
          <p className="text-[12px] text-[var(--text-secondary)]">
            Optional. If set, clients can click &quot;View in portal&quot; on any ticket to open it in your self-service portal. Format: https://support.yourcompany.com
          </p>
          <input
            type="url"
            placeholder="https://support.yourcompany.com"
            value={selfServiceUrl}
            onChange={(e) => setSelfServiceUrl(e.target.value)}
            className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          <button
            type="button"
            onClick={() => void saveSelfServiceUrl()}
            disabled={savingSelfServiceUrl}
            className="text-[12px] text-[var(--accent)] hover:underline disabled:opacity-50"
          >
            {savingSelfServiceUrl ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddMappingForm({
  psa,
  newFieldName,
  setNewFieldName,
  newDisplayName,
  setNewDisplayName,
  newOutputs,
  toggleOutput,
  onSave,
  onCancel,
  onTestField,
  testingField,
  testResult,
  availableFields,
}: {
  psa: "halopsa" | "connectwise"
  newFieldName: string
  setNewFieldName: (v: string) => void
  newDisplayName: string
  setNewDisplayName: (v: string) => void
  newOutputs: string[]
  toggleOutput: (v: string) => void
  onSave: () => void
  onCancel: () => void
  onTestField: (fieldName: string) => void
  testingField: boolean
  testResult: { ok: boolean; message: string } | null
  availableFields?: Array<{ name: string; label: string }>
}) {
  const formatDisplayName = (name: string): string => {
    // Remove CF prefix, split camelCase into words
    const stripped = name.replace(/^CF/i, "")
    return stripped
      .replace(/([A-Z])/g, " $1")
      .replace(/([0-9]+)/g, " $1")
      .trim()
      .replace(/\s+/g, " ")
  }

  return (
    <div className="mt-3 rounded-[var(--radius-lg)] border border-[var(--accent)]/30 bg-[var(--bg-primary)] p-4">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">
              {psa === "halopsa" ? "Field name in HaloPSA" : "Field name in ConnectWise"}
              {psa === "halopsa" ? (
                <span className="ml-1 font-normal text-[var(--text-muted)]">
                  - HaloPSA prefixes custom fields with &ldquo;CF&rdquo;, e.g. CFCompanyType
                </span>
              ) : null}
            </label>
            <div className="flex items-center gap-2">
              {availableFields && availableFields.length > 0 ? (
                <select
                  value={newFieldName}
                  onChange={e => {
                    setNewFieldName(e.target.value)
                    const selected = availableFields?.find(f => f.name === e.target.value)
                    if (selected) {
                      setNewDisplayName(formatDisplayName(selected.name))
                    }
                  }}
                  className="flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                >
                  <option value="">Select a custom field...</option>
                  {availableFields.map((f, idx) => (
                    <option key={`${f.name}-${idx}`} value={f.name}>{f.label || f.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={newFieldName}
                  onChange={e => setNewFieldName(e.target.value)}
                  placeholder="e.g. CFCompanyType"
                  className="flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              )}
              <button
                type="button"
                onClick={() => onTestField(newFieldName)}
                disabled={testingField || !newFieldName.trim()}
                className="shrink-0 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
              >
                {testingField ? "Testing…" : "Test"}
              </button>
            </div>
            {testResult ? (
              <p
                className={cn(
                  "mt-1 text-[12px]",
                  testResult.ok ? "text-green-400" : "text-red-400",
                )}
              >
                {testResult.message}
              </p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[var(--text-secondary)]">
              Display name in reports <span className="text-[var(--text-muted)]">(optional)</span>
            </label>
            <input
              type="text"
              value={newDisplayName}
              onChange={e => setNewDisplayName(e.target.value)}
              placeholder="e.g. Contract Type"
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
        </div>
        <div>
          <label className="mb-2 block text-[12px] font-medium text-[var(--text-secondary)]">
            Include in outputs <span className="text-[var(--text-muted)]">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {OUTPUT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleOutput(opt.value)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  newOutputs.includes(opt.value)
                    ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={!newFieldName.trim() || newOutputs.length === 0}
            className="rounded-[var(--radius)] bg-[var(--accent)] px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            Save mapping
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-[12px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function CustomFieldsSection({ hasProAccess }: { hasProAccess: boolean }) {
  const psa = usePSAStatus()
  const toast = useToast()
  const [mappings, setMappings] = useState<FieldMapping[]>([])
  const [loadingMappings, setLoadingMappings] = useState(true)
  const [haloFields, setHaloFields] = useState<Array<{name: string; label: string}>>([])
  const [loadingHaloFields, setLoadingHaloFields] = useState(false)
  const [cwFields, setCwFields] = useState<Array<{ name: string; label: string }>>([])
  const [loadingCwFields, setLoadingCwFields] = useState(false)
  const [cwFieldPickerActive, setCwFieldPickerActive] = useState(false)
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const [useFieldPicker, setUseFieldPicker] = useState(false)
  const [testingField, setTestingField] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFieldName, setEditFieldName] = useState("")
  const [editDisplayName, setEditDisplayName] = useState("")
  const [editOutputs, setEditOutputs] = useState<string[]>([])
  const [addingFor, setAddingFor] = useState<"halopsa" | "connectwise" | null>(null)
  const [newFieldName, setNewFieldName] = useState("")
  const [newDisplayName, setNewDisplayName] = useState("")
  const [newOutputs, setNewOutputs] = useState<string[]>(["actions"])
  const csvRef = useRef<HTMLInputElement>(null)

  const hasNoPsa = !psa.loading && !psa.halo && !psa.connectwise

  useEffect(() => {
    fetch("/api/configuration/custom-fields", { credentials: "same-origin" })
      .then(r => r.json())
      .then(data => {
        const m = (data.mappings ?? []).map((row: {
          id: string
          psa: string
          field_name: string
          display_name: string
          outputs: string[]
        }) => ({
          id: row.id,
          psa: row.psa as "halopsa" | "connectwise",
          fieldName: row.field_name,
          displayName: row.display_name,
          outputs: row.outputs,
        }))
        setMappings(m)
      })
      .catch(console.error)
      .finally(() => setLoadingMappings(false))
  }, [])

  const addMapping = async (psa: "halopsa" | "connectwise") => {
    if (!newFieldName.trim() || newOutputs.length === 0) return
    const res = await fetch("/api/configuration/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        psa,
        field_name: newFieldName.trim(),
        display_name: newDisplayName.trim() || newFieldName.trim(),
        outputs: newOutputs,
      })
    })
    const data = await res.json() as { mapping?: { id: string; psa: string; field_name: string; display_name: string; outputs: string[] } }
    if (data.mapping) {
      const mapping = data.mapping
      setMappings(prev => [...prev, {
        id: mapping.id,
        psa: mapping.psa as "halopsa" | "connectwise",
        fieldName: mapping.field_name,
        displayName: mapping.display_name,
        outputs: mapping.outputs,
      }])
    }
    setNewFieldName("")
    setNewDisplayName("")
    setNewOutputs(["actions"])
    setAddingFor(null)
  }

  const removeMapping = async (id: string) => {
    await fetch("/api/configuration/custom-fields", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id })
    })
    setMappings(prev => prev.filter(m => m.id !== id))
  }

  const startEdit = (m: FieldMapping) => {
    setEditingId(m.id)
    setEditFieldName(m.fieldName)
    setEditDisplayName(m.displayName)
    setEditOutputs(m.outputs)
  }

  const saveEdit = async () => {
    if (!editingId) return
    await fetch("/api/configuration/custom-fields", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        id: editingId,
        field_name: editFieldName.trim(),
        display_name: editDisplayName.trim() || editFieldName.trim(),
        outputs: editOutputs,
      })
    })
    setMappings(prev => prev.map(m => m.id === editingId ? {
      ...m,
      fieldName: editFieldName.trim(),
      displayName: editDisplayName.trim() || editFieldName.trim(),
      outputs: editOutputs,
    } : m))
    setEditingId(null)
  }

  const toggleOutput = (val: string) => {
    setNewOutputs(prev =>
      prev.includes(val) ? prev.filter(o => o !== val) : [...prev, val]
    )
  }

  const testHaloField = async (fieldName: string) => {
    if (!fieldName.trim()) return
    setTestingField(true)
    setTestResult(null)
    try {
      const res = await fetch(`/api/halo/customfields/test?field=${encodeURIComponent(fieldName)}`, {
        credentials: "same-origin",
      })
      const data = await res.json() as { exists?: boolean; message?: string }
      if (res.ok && data.exists) {
        setTestResult({ ok: true, message: `✓ Field "${fieldName}" found in HaloPSA` })
      } else {
        setTestResult({
          ok: false,
          message: data.message ?? `Field "${fieldName}" not found. Check the name is correct and starts with "CF".`,
        })
      }
    } catch {
      setTestResult({ ok: false, message: "Could not connect to HaloPSA to test this field." })
    } finally {
      setTestingField(false)
    }
  }

  const testCwField = async (fieldName: string) => {
    if (!fieldName.trim()) return
    setTestingField(true)
    setTestResult(null)
    try {
      const res = await fetch(`/api/cw/customfields/test?field=${encodeURIComponent(fieldName)}`, {
        credentials: "same-origin",
      })
      const data = await res.json() as { exists?: boolean; message?: string }
      if (res.ok && data.exists) {
        setTestResult({ ok: true, message: `✓ Field "${fieldName}" found in ConnectWise` })
      } else {
        setTestResult({
          ok: false,
          message: data.message ?? `Field "${fieldName}" not found in ConnectWise user-defined fields.`,
        })
      }
    } catch {
      setTestResult({ ok: false, message: "Could not connect to ConnectWise to test this field." })
    } finally {
      setTestingField(false)
    }
  }

  const loadHaloFields = async () => {
    setLoadingHaloFields(true)
    try {
      const res = await fetch("/api/halo/customfields/list", { credentials: "same-origin" })
      if (res.ok) {
        const data = await res.json() as { fields: Array<{name: string; label: string}> }
        setHaloFields(data.fields ?? [])
        setShowFieldPicker(true)
        setAddingFor("halopsa")
      }
    } catch (e) {
      console.error("[loadHaloFields]", e)
    } finally {
      setLoadingHaloFields(false)
    }
  }

  const loadCwFields = async () => {
    setLoadingCwFields(true)
    try {
      const res = await fetch("/api/cw/customfields/list", { credentials: "same-origin" })
      const data = (await res.json().catch(() => ({}))) as {
        fields?: Array<{ name: string; label: string }>
        message?: string
        error?: string
      }
      const fields = Array.isArray(data.fields) ? data.fields : []
      setCwFields(fields)
      setCwFieldPickerActive(true)
      setAddingFor("connectwise")
      setNewFieldName("")
      setNewDisplayName("")
      setNewOutputs(["actions"])
      setTestResult(null)
      if (!res.ok) {
        toast({
          message: data.error ?? data.message ?? "Could not load ConnectWise custom fields.",
          variant: "error",
          durationMs: 6000,
        })
        return
      }
      if (fields.length === 0 && (data.message || data.error)) {
        toast({
          message: data.message ?? data.error ?? "No ConnectWise ticket fields returned.",
          variant: "error",
          durationMs: 8000,
        })
      }
    } catch (e) {
      console.error("[loadCwFields]", e)
      toast({ message: "Could not load ConnectWise custom fields.", variant: "error", durationMs: 6000 })
    } finally {
      setLoadingCwFields(false)
    }
  }

  const exportCSV = () => {
    const rows = [
      ["PSA", "Field Name", "Display Name", "Outputs"],
      ...mappings.map(m => [m.psa, m.fieldName, m.displayName, m.outputs.join("|")])
    ]
    const csv = rows.map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "custom-field-mappings.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const lines = text.trim().split("\n").slice(1) // skip header
      const imported: FieldMapping[] = lines.map(line => {
        const [psa, fieldName, displayName, outputs] = line.split(",")
        return {
          id: `${Date.now()}-${Math.random()}`,
          psa: (psa?.trim() as "halopsa" | "connectwise") || "halopsa",
          fieldName: fieldName?.trim() || "",
          displayName: displayName?.trim() || fieldName?.trim() || "",
          outputs: outputs?.trim().split("|").filter(Boolean) || ["actions"],
        }
      }).filter(m => m.fieldName)
      setMappings(prev => [...prev, ...imported])
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const MappingList = ({ psa }: { psa: "halopsa" | "connectwise" }) => {
    const psaMappings = mappings.filter(m => m.psa === psa)
    return psaMappings.length > 0 ? (
      <div className="flex flex-col gap-1.5">
        {psaMappings.map(m => (
          <div key={m.id} className="flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5">
            {editingId === m.id ? (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={editFieldName}
                    onChange={e => setEditFieldName(e.target.value)}
                    className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-1.5 text-[12px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    placeholder="Field name"
                  />
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={e => setEditDisplayName(e.target.value)}
                    className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-1.5 text-[12px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    placeholder="Display name"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {OUTPUT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEditOutputs(prev =>
                        prev.includes(opt.value) ? prev.filter(o => o !== opt.value) : [...prev, opt.value]
                      )}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                        editOutputs.includes(opt.value)
                          ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                          : "border-[var(--border)] text-[var(--text-muted)]"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void saveEdit()} className="rounded-[var(--radius)] bg-[var(--accent)] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors">
                    Save
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="rounded-[var(--radius)] border border-[var(--border)] px-3 py-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[13px] font-medium text-[var(--text-primary)]">{m.fieldName}</span>
                  {m.displayName !== m.fieldName && (
                    <span className="ml-2 text-[12px] text-[var(--text-muted)]">→ {m.displayName}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {m.outputs.map(o => (
                    <span key={o} className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] text-[var(--accent)]">
                      {OUTPUT_OPTIONS.find(opt => opt.value === o)?.label ?? o}
                    </span>
                  ))}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(m)}
                    className="rounded p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                    title="Edit"
                  >
                    <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMapping(m.id)}
                    className="rounded p-1 text-[var(--text-muted)] transition-colors hover:text-red-400"
                    title="Remove"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    ) : null
  }

  return (
    <div className="flex flex-col gap-4">
      {hasNoPsa ? (
        <PSAEmptyState
          title="No PSA connected"
          description="Connect HaloPSA or ConnectWise to map custom fields."
          showButton={true}
        />
      ) : null}
      {loadingMappings ? (
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-[12px] text-[var(--text-secondary)]">
          Loading custom field mappings...
        </div>
      ) : null}
      {/* Bulk import/export toolbar */}
      {mappings.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={exportCSV} className="flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <Download className="size-3.5" />
            Export CSV
          </button>
          <button type="button" onClick={() => csvRef.current?.click()} className="flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <Upload className="size-3.5" />
            Import CSV
          </button>
          <input ref={csvRef} type="file" accept=".csv" onChange={importCSV} className="hidden" />
        </div>
      )}

      {/* HaloPSA */}
      {psa.connectwise && !psa.halo ? null : (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">HaloPSA Custom Fields</h3>
            <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">Map HaloPSA custom fields to report outputs.</p>
          </div>
          <div className="flex gap-2">
            {mappings.filter(m => m.psa === "halopsa").length === 0 && (
              <button type="button" onClick={() => csvRef.current?.click()} className="flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] px-2.5 py-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <Upload className="size-3" />
                Import CSV
              </button>
            )}
            {psa.halo ? (
              <button
                type="button"
                onClick={async () => {
                  await loadHaloFields()
                  setUseFieldPicker(true)
                  setAddingFor("halopsa")
                }}
                disabled={loadingHaloFields}
                className="flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
              >
                <Database className="size-3.5" />
                {loadingHaloFields ? "Loading..." : "Load from HaloPSA"}
              </button>
            ) : null}
            <button type="button" onClick={() => {
              setAddingFor("halopsa")
              setUseFieldPicker(false)
              setNewFieldName("")
              setNewDisplayName("")
              setNewOutputs(["actions"])
            }} className="rounded-[var(--radius)] bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors">
              + Add mapping
            </button>
          </div>
        </div>
        <MappingList psa="halopsa" />
        {mappings.filter(m => m.psa === "halopsa").length === 0 && addingFor !== "halopsa" && (
          <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] px-4 py-8 text-center">
            <p className="text-[13px] text-[var(--text-muted)]">No HaloPSA field mappings yet.</p>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">Add a mapping or import from CSV.</p>
          </div>
        )}
        {addingFor === "halopsa" && (
          <AddMappingForm
            psa="halopsa"
            newFieldName={newFieldName}
            setNewFieldName={setNewFieldName}
            newDisplayName={newDisplayName}
            setNewDisplayName={setNewDisplayName}
            newOutputs={newOutputs}
            toggleOutput={toggleOutput}
            onSave={() => void addMapping("halopsa")}
            onCancel={() => { setAddingFor(null); setNewFieldName(""); setNewDisplayName(""); setNewOutputs(["actions"]); setTestResult(null) }}
            onTestField={testHaloField}
            testingField={testingField}
            testResult={testResult}
            availableFields={useFieldPicker ? haloFields : undefined}
          />
        )}
      </div>
      )}

      {/* ConnectWise */}
      {psa.halo && !psa.connectwise ? null : (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">ConnectWise Custom Fields</h3>
            <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">Map ConnectWise custom fields to report outputs.</p>
          </div>
          <div className="flex gap-2">
            {mappings.filter(m => m.psa === "connectwise").length === 0 && (
              <button type="button" onClick={() => csvRef.current?.click()} className="flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] px-2.5 py-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <Upload className="size-3" />
                Import CSV
              </button>
            )}
            {psa.connectwise ? (
              <button
                type="button"
                onClick={() => void loadCwFields()}
                disabled={loadingCwFields}
                className="flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
              >
                <Database className="size-3.5" />
                {loadingCwFields ? "Loading..." : "Load from ConnectWise"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setCwFieldPickerActive(false)
                setAddingFor("connectwise")
                setNewFieldName("")
                setNewDisplayName("")
                setNewOutputs(["actions"])
              }}
              className="rounded-[var(--radius)] bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors"
            >
              + Add mapping
            </button>
          </div>
        </div>
        <MappingList psa="connectwise" />
        {mappings.filter(m => m.psa === "connectwise").length === 0 && addingFor !== "connectwise" && (
          <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] px-4 py-8 text-center">
            <p className="text-[13px] text-[var(--text-muted)]">No ConnectWise field mappings yet.</p>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">Add a mapping or import from CSV.</p>
          </div>
        )}
        {addingFor === "connectwise" && (
          <AddMappingForm
            psa="connectwise"
            newFieldName={newFieldName}
            setNewFieldName={setNewFieldName}
            newDisplayName={newDisplayName}
            setNewDisplayName={setNewDisplayName}
            newOutputs={newOutputs}
            toggleOutput={toggleOutput}
            onSave={() => void addMapping("connectwise")}
            onCancel={() => {
              setAddingFor(null)
              setNewFieldName("")
              setNewDisplayName("")
              setNewOutputs(["actions"])
              setTestResult(null)
              setCwFieldPickerActive(false)
            }}
            onTestField={testCwField}
            testingField={testingField}
            testResult={testResult}
            availableFields={cwFieldPickerActive ? cwFields : undefined}
          />
        )}
      </div>
      )}

      <input ref={csvRef} type="file" accept=".csv" onChange={importCSV} className="hidden" />
    </div>
  )
}
