"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Settings, Webhook, Users, FileText, Layers, Database, Upload, Download, X } from "lucide-react"

type ConfigSection = "custom-fields" | "report-templates" | "client-profiles" | "webhooks" | "integrations" | "data-sources"

type Props = {
  userEmail: string | null
  plan: string | null
  hasProAccess: boolean
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

const NAV_ITEMS: Array<{
  id: ConfigSection
  label: string
  icon: React.ElementType
  description: string
  comingSoon?: boolean
}> = [
  { id: "custom-fields", label: "Custom Fields", icon: Database, description: "Map PSA custom fields to report outputs" },
  { id: "report-templates", label: "Report Templates", icon: FileText, description: "Default sections, tone, and format per client type", comingSoon: true },
  { id: "client-profiles", label: "Client Profiles", icon: Users, description: "Per-client settings, portal links, and branding", comingSoon: true },
  { id: "webhooks", label: "Webhooks", icon: Webhook, description: "Slack and Teams notification rules", comingSoon: true },
  { id: "integrations", label: "Integrations", icon: Layers, description: "PSA connection settings and field mappings", comingSoon: true },
  { id: "data-sources", label: "Data Sources", icon: Settings, description: "HaloPSA statistics and custom report imports", comingSoon: true },
]

export function ConfigurationPanel({ hasProAccess }: Props) {
  const [activeSection, setActiveSection] = useState<ConfigSection>("custom-fields")
  const active = NAV_ITEMS.find(n => n.id === activeSection)

  return (
    <div className="flex w-full" style={{ minHeight: 'calc(100vh - 52px)' }}>
      {/* Left sidebar */}
      <div className="flex w-[220px] shrink-0 flex-col border-r border-[var(--border)] overflow-y-auto" style={{ backgroundColor: '#1e2d47' }}>
        <div className="shrink-0 border-b border-[var(--border)] px-4 py-4">
          <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">Configuration</h1>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Workspace settings</p>
        </div>
        <nav className="flex-1 p-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => !item.comingSoon && setActiveSection(item.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-[var(--radius)] px-3 py-2 text-left text-[13px] transition-colors",
                activeSection === item.id
                  ? "bg-[var(--accent)]/15 text-[var(--accent)] font-medium"
                  : item.comingSoon
                    ? "cursor-default opacity-50 text-[var(--text-muted)]"
                    : "text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
              )}
            >
              <item.icon className="size-[14px] shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.comingSoon && (
                <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Soon
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1 overflow-y-auto bg-[var(--bg-secondary)]">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{active?.label}</h2>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{active?.description}</p>
          </div>
          {activeSection === "custom-fields" && <CustomFieldsSection hasProAccess={hasProAccess} />}
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
                  — HaloPSA prefixes custom fields with "CF" e.g. CFCompanyType
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
  const [mappings, setMappings] = useState<FieldMapping[]>([])
  const [loadingMappings, setLoadingMappings] = useState(true)
  const [haloFields, setHaloFields] = useState<Array<{name: string; label: string}>>([])
  const [loadingHaloFields, setLoadingHaloFields] = useState(false)
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

      {/* ConnectWise */}
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
            <button type="button" onClick={() => { setAddingFor("connectwise"); setNewFieldName(""); setNewDisplayName(""); setNewOutputs(["actions"]) }} className="rounded-[var(--radius)] bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors">
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
            onCancel={() => { setAddingFor(null); setNewFieldName(""); setNewDisplayName(""); setNewOutputs(["actions"]); setTestResult(null) }}
            onTestField={testHaloField}
            testingField={testingField}
            testResult={testResult}
          />
        )}
      </div>

      <input ref={csvRef} type="file" accept=".csv" onChange={importCSV} className="hidden" />
    </div>
  )
}
