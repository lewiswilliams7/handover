"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Database, Loader2, RefreshCw } from "lucide-react";

import { useToast } from "@/components/toasts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCwProjects, useCwTickets } from "@/lib/psa-cache";
import { formatLoggedHours } from "@/lib/format-logged-hours";
import { usePSAConnections } from "@/hooks/use-psa-connections";
import { cn } from "@/lib/utils";

type CwTicket = {
  id: number;
  summary: string;
  status?: { name?: string | null } | null;
  priority?: { name?: string | null } | null;
  client?: { name?: string | null } | null;
  agent?: { name?: string | null } | null;
  dateoccurred?: string | null;
  targetdate?: string | null;
  timetaken?: number | null;
  cwProjectId?: number | null;
};

type CwProject = {
  id: number;
  name: string;
  status?: { name?: string | null } | null;
  client?: { name?: string | null } | null;
  projectmanager?: { name?: string | null } | null;
  targetdate?: string | null;
  description?: string | null;
  notes?: CwNote[];
  tasks?: Array<{ id: number; summary: string; status: string }>;
  teamMembers?: Array<{ name: string; role: string | null }>;
};

type CwNote = {
  id: string;
  author: string;
  date: string | null;
  content: string;
};

function useDebouncedValue<T>(value: T, delayMs = 200): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dashboard source of truth; avoids stale global PSA cache so the dialog can mount when open. */
  connectwiseConnected?: boolean;
  onImport: (payload: {
    formatted: string;
    count: number;
    selectedClientName: string | null;
    dataType: "tickets" | "projects";
    importedItems: Array<{
      id: number;
      title: string;
      clientName: string;
      status: string;
      type: "ticket" | "project";
    }>;
  }) => void;
};

export function CwImportModal({ open, onOpenChange, connectwiseConnected, onImport }: Props) {
  const psaHook = usePSAConnections();
  const connectwiseLive =
    typeof connectwiseConnected === "boolean" ? connectwiseConnected : psaHook.connectwise;
  const toast = useToast();
  const [mode, setMode] = useState<"tickets" | "projects">("tickets");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketRows, setTicketRows] = useState<CwTicket[]>([]);
  const [projectRows, setProjectRows] = useState<CwProject[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedTicketIds, setExpandedTicketIds] = useState<number[]>([]);
  const [expandedProjectIds, setExpandedProjectIds] = useState<number[]>([]);
  const [ticketNotesById, setTicketNotesById] = useState<Record<number, CwNote[]>>({});
  const [notesLoadingById, setNotesLoadingById] = useState<Record<number, boolean>>({});
  const [selectedNotesById, setSelectedNotesById] = useState<Record<number, Record<string, boolean>>>({});
  const [loadedOnce, setLoadedOnce] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 220);
  const {
    data: cachedTickets,
    isLoading: ticketsLoading,
    mutate: refreshTickets,
  } = useCwTickets(open && connectwiseLive);
  const {
    data: cachedProjects,
    isLoading: projectsLoading,
    mutate: refreshProjects,
  } = useCwProjects(open && connectwiseLive);

  useEffect(() => {
    if (!open) {
      setLoadedOnce(false);
      return;
    }
    setSelectedIds([]);
    setExpandedTicketIds([]);
    setExpandedProjectIds([]);
    setTicketNotesById({});
    setNotesLoadingById({});
    setSelectedNotesById({});
    setSearch("");
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!connectwiseLive) return;
    if (loadedOnce) return;
    void loadRows();
  }, [open, loadedOnce, connectwiseLive]);

  useEffect(() => {
    if (!open) return;
    console.log("[cw-import-modal] dialog open", {
      connectwiseLive,
      hookConnectwise: psaHook.connectwise,
      connectwiseOverrideProp: connectwiseConnected,
    });
  }, [open, connectwiseLive, connectwiseConnected, psaHook.connectwise]);

  const rows = useMemo(() => {
    const list = mode === "tickets" ? ticketRows : projectRows;
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) => {
      const title = mode === "tickets" ? (row as CwTicket).summary : (row as CwProject).name;
      const client = row.client?.name ?? "";
      const status = row.status?.name ?? "";
      return `${title} ${client} ${status}`.toLowerCase().includes(q);
    });
  }, [mode, projectRows, debouncedSearch, ticketRows]);

  async function loadRows() {
    setLoading(true);
    setError(null);
    try {
      const [ticketData, projectData] = await Promise.all([
        refreshTickets(),
        refreshProjects(),
      ]);
      const rawTickets = Array.isArray(ticketData?.tickets)
        ? (ticketData.tickets as CwTicket[])
        : [];
      const rawProjects = Array.isArray(projectData?.projects)
        ? (projectData.projects as CwProject[])
        : [];
      // Service board tickets only; project-linked tickets belong under Projects.
      const serviceTickets = rawTickets.filter((t) => Number(t.cwProjectId ?? 0) <= 0);
      setTicketRows(serviceTickets);
      setProjectRows(rawProjects);
      setLoadedOnce(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ConnectWise items.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const rawTickets = Array.isArray(cachedTickets?.tickets)
      ? (cachedTickets.tickets as CwTicket[])
      : [];
    const rawProjects = Array.isArray(cachedProjects?.projects)
      ? (cachedProjects.projects as CwProject[])
      : [];
    if (rawTickets.length === 0 && rawProjects.length === 0) return;
    const serviceTickets = rawTickets.filter((t) => Number(t.cwProjectId ?? 0) <= 0);
    setTicketRows(serviceTickets);
    setProjectRows(rawProjects);
    setLoadedOnce(true);
  }, [open, cachedTickets, cachedProjects]);

  function toggleOne(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function toggleTicketExpanded(id: number) {
    setExpandedTicketIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    if (ticketNotesById[id] || notesLoadingById[id]) return;
    setNotesLoadingById((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/cw/ticket-detail?id=${id}`);
      const data = (await res.json().catch(() => ({}))) as {
        notes?: CwNote[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load notes.");
      const notes = Array.isArray(data.notes) ? data.notes : [];
      setTicketNotesById((prev) => ({ ...prev, [id]: notes }));
      setSelectedNotesById((prev) => ({
        ...prev,
        [id]: Object.fromEntries(notes.map((n) => [n.id, false])),
      }));
    } catch (e) {
      setTicketNotesById((prev) => ({ ...prev, [id]: [] }));
      toast({
        message: "Could not load ticket notes",
        subtitle: e instanceof Error ? e.message : "Unknown error",
        variant: "error",
      });
    } finally {
      setNotesLoadingById((prev) => ({ ...prev, [id]: false }));
    }
  }

  function toggleProjectExpanded(id: number) {
    setExpandedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleNote(ticketId: number, noteId: string, checked: boolean) {
    setSelectedNotesById((prev) => ({
      ...prev,
      [ticketId]: { ...(prev[ticketId] ?? {}), [noteId]: checked },
    }));
  }

  function toggleAllNotes(ticketId: number, checked: boolean) {
    const notes = ticketNotesById[ticketId] ?? [];
    setSelectedNotesById((prev) => ({
      ...prev,
      [ticketId]: Object.fromEntries(notes.map((n) => [n.id, checked])),
    }));
  }

  function importSelected() {
    if (selectedIds.length === 0) return;
    const selectedTickets = ticketRows.filter((t) => selectedIds.includes(t.id));
    const selectedProjects = projectRows.filter((p) => selectedIds.includes(p.id));
    const ticketBody = selectedTickets
      .map((t) => {
        const notes = (ticketNotesById[t.id] ?? [])
          .filter((n) => selectedNotesById[t.id]?.[n.id] === true)
          .map((n) => `  - [${n.date ?? "Unknown"}] ${n.author}: ${n.content || " - "}`)
          .join("\n");
        return [
            `═══ TICKET #${t.id} ═══`,
            `Source: ConnectWise`,
            `Title: ${t.summary}`,
            `Client: ${t.client?.name ?? "Unknown"}`,
            `Status: ${t.status?.name ?? "Unknown"}`,
            `Priority: ${t.priority?.name ?? "None"}`,
            `Assigned to: ${t.agent?.name ?? "Unassigned"}`,
            `Opened: ${t.dateoccurred ?? "Unknown"}`,
            `Target date: ${t.targetdate ?? "None"}`,
            `Time logged: ${formatLoggedHours(t.timetaken ?? 0)}`,
            "Notes:",
            notes || "  - None",
          ].join("\n");
      })
      .join("\n\n");
    const projectBody = selectedProjects
      .map((p) => {
        const noteLines = (p.notes ?? [])
          .map((n) => `  - [${n.date ?? "Unknown"}] ${n.author}: ${n.content || " - "}`)
          .join("\n");
        const taskLines = (p.tasks ?? [])
          .map((t) => `  - #${t.id} ${t.summary} (${t.status})`)
          .join("\n");
        const memberLines = (p.teamMembers ?? [])
          .map((m) => `  - ${m.name}${m.role ? ` (${m.role})` : ""}`)
          .join("\n");
        return [
          `═══ PROJECT #${p.id} ═══`,
          `Source: ConnectWise`,
          `Name: ${p.name}`,
          `Client: ${p.client?.name ?? "Unknown"}`,
          `Status: ${p.status?.name ?? "Unknown"}`,
          `Project manager: ${p.projectmanager?.name ?? "Unassigned"}`,
          `Target date: ${p.targetdate ?? "None"}`,
          `Description: ${p.description ?? "None"}`,
          "Project notes:",
          noteLines || "  - None",
          "Project tickets/tasks:",
          taskLines || "  - None",
          "Team members:",
          memberLines || "  - None",
        ].join("\n");
      })
      .join("\n\n");
    const sections = [ticketBody, projectBody].filter((s) => s.trim().length > 0).join("\n\n");
    const selectedItems = [
      ...selectedTickets.map((t) => ({
        id: t.id,
        title: t.summary,
        clientName: t.client?.name ?? "Unknown",
        status: t.status?.name ?? "Unknown",
        type: "ticket" as const,
      })),
      ...selectedProjects.map((p) => ({
        id: p.id,
        title: p.name,
        clientName: p.client?.name ?? "Unknown",
        status: p.status?.name ?? "Unknown",
        type: "project" as const,
      })),
    ];
    const selectedClientName =
      new Set(selectedItems.map((s) => s.clientName)).size === 1
        ? selectedItems[0]?.clientName ?? null
        : null;

    onImport({
      formatted: `ConnectWise Export - ${selectedItems.length} items\n\n${sections}`,
      count: selectedItems.length,
      selectedClientName,
      dataType: selectedProjects.length > 0 && selectedTickets.length === 0 ? "projects" : "tickets",
      importedItems: selectedItems,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="size-4" />
            Import from ConnectWise
          </DialogTitle>
        </DialogHeader>
        {!connectwiseLive ? (
          <p className="text-sm text-[var(--text-secondary)]">
            ConnectWise is not connected. Open{" "}
            <span className="font-medium text-[var(--text-primary)]">Integrations</span> in the sidebar, add your
            ConnectWise Manage API credentials, then try again.
          </p>
        ) : null}
        {connectwiseLive ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={mode === "tickets" ? "default" : "outline"}
              onClick={() => setMode("tickets")}
            >
              Tickets
            </Button>
            <Button
              type="button"
              variant={mode === "projects" ? "default" : "outline"}
              onClick={() => setMode("projects")}
            >
              Projects
            </Button>
            {loading || ticketsLoading || projectsLoading ? (
              <Loader2 className="size-4 animate-spin text-[var(--text-muted)]" />
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadRows()}
              className="ml-auto"
            >
              <RefreshCw className="mr-1 size-3.5" />
              Refresh
            </Button>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={mode === "tickets" ? "Search tickets..." : "Search projects..."}
          />
          {error ? (
            <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          ) : null}
          <div className="max-h-[420px] space-y-2 overflow-y-auto rounded border border-[var(--border)] p-2">
            {(loading || ticketsLoading || projectsLoading) && rows.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={`sk-${i}`} className="animate-pulse rounded border border-[var(--border)] p-3">
                  <div className="h-4 w-2/3 rounded bg-[var(--border)]/50" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-[var(--border)]/40" />
                  <div className="mt-1 h-3 w-1/3 rounded bg-[var(--border)]/30" />
                </div>
              ))
            ) : null}
            {rows.map((row) => {
              const title = mode === "tickets" ? (row as CwTicket).summary : (row as CwProject).name;
              return (
                <button
                  key={`${mode}-${row.id}`}
                  type="button"
                  onClick={() => {
                    if (mode === "tickets") {
                      void toggleTicketExpanded(row.id);
                    } else {
                      toggleProjectExpanded(row.id);
                    }
                  }}
                  className={cn(
                    "flex w-full items-start gap-2 rounded border px-3 py-2 text-left",
                    selectedIds.includes(row.id)
                      ? "border-[var(--accent)] bg-[rgba(56,189,248,0.08)]"
                      : "border-[var(--border)]",
                  )}
                >
                  {mode === "tickets" ? (
                    <span className="mt-0.5 text-[var(--text-muted)]">
                      {expandedTicketIds.includes(row.id) ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </span>
                  ) : null}
                  <Checkbox
                    checked={selectedIds.includes(row.id)}
                    onCheckedChange={() => toggleOne(row.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{title}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                      {(row.client?.name ?? "Unknown")} · {(row.status?.name ?? "Unknown")}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {mode === "tickets"
                        ? `Priority: ${(row as CwTicket).priority?.name ?? "None"}`
                        : `PM: ${(row as CwProject).projectmanager?.name ?? "Unassigned"}`}
                    </p>
                    {psaHook.multiple ? (
                      <span className="mt-1 inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        ConnectWise
                      </span>
                    ) : null}
                    {mode === "projects" && expandedProjectIds.includes(row.id) ? (
                      <div className="mt-2 space-y-1 rounded border border-[var(--border)] bg-[var(--bg-secondary)]/40 p-2 text-xs">
                        <p className="font-medium text-[var(--text-primary)]">Project notes</p>
                        {(row as CwProject).notes?.length ? (
                          (row as CwProject).notes!.map((note) => (
                            <div key={note.id} className="rounded border border-[var(--border)] bg-[var(--bg-primary)] p-2">
                              <p className="text-[11px] font-medium text-[var(--text-primary)]">
                                {note.author} · {note.date ? new Date(note.date).toLocaleString("en-GB") : "Unknown"}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-xs text-[var(--text-secondary)]">
                                {note.content || " - "}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-[var(--text-muted)]">No notes</p>
                        )}
                        <p className="pt-1 font-medium text-[var(--text-primary)]">Project tickets/tasks</p>
                        {(row as CwProject).tasks?.length ? (
                          (row as CwProject).tasks!.map((task) => (
                            <p key={task.id} className="text-[var(--text-secondary)]">
                              #{task.id} {task.summary} ({task.status})
                            </p>
                          ))
                        ) : (
                          <p className="text-[var(--text-muted)]">No project tickets</p>
                        )}
                        <p className="pt-1 font-medium text-[var(--text-primary)]">Team members</p>
                        {(row as CwProject).teamMembers?.length ? (
                          (row as CwProject).teamMembers!.map((member, idx) => (
                            <p key={`${member.name}-${idx}`} className="text-[var(--text-secondary)]">
                              {member.name}
                              {member.role ? ` (${member.role})` : ""}
                            </p>
                          ))
                        ) : (
                          <p className="text-[var(--text-muted)]">No team members</p>
                        )}
                      </div>
                    ) : null}
                    {mode === "tickets" && expandedTicketIds.includes(row.id) ? (
                      <div className="mt-2 space-y-1 rounded border border-[var(--border)] bg-[var(--bg-secondary)]/40 p-2">
                        {notesLoadingById[row.id] ? (
                          <p className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                            <Loader2 className="size-3.5 animate-spin" />
                            Loading notes...
                          </p>
                        ) : (ticketNotesById[row.id] ?? []).length === 0 ? (
                          <p className="text-xs text-[var(--text-muted)]">No notes</p>
                        ) : (
                          <>
                            <label className="mb-1 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                              <Checkbox
                                checked={(ticketNotesById[row.id] ?? []).every((n) => selectedNotesById[row.id]?.[n.id] === true)}
                                onCheckedChange={(v) => toggleAllNotes(row.id, Boolean(v))}
                              />
                              Select all notes
                            </label>
                            {(ticketNotesById[row.id] ?? []).map((note) => (
                            <div key={note.id} className="rounded border border-[var(--border)] bg-[var(--bg-primary)] p-2">
                              <label className="mb-1 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                <Checkbox
                                  checked={selectedNotesById[row.id]?.[note.id] === true}
                                  onCheckedChange={(v) => toggleNote(row.id, note.id, Boolean(v))}
                                />
                                Include note
                              </label>
                              <p className="text-[11px] font-medium text-[var(--text-primary)]">
                                {note.author} · {note.date ? new Date(note.date).toLocaleString("en-GB") : "Unknown"}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-xs text-[var(--text-secondary)]">
                                {note.content || " - "}
                              </p>
                            </div>
                          ))}
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
            {!loading && !ticketsLoading && !projectsLoading && rows.length === 0 ? (
              <div className="rounded border border-[var(--border)] px-3 py-6 text-center text-sm text-[var(--text-muted)]">
                {mode === "tickets" ? "No open tickets found." : "No active projects found."}
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-secondary)]">
              {(() => {
                const ticketCount = ticketRows.filter((t) => selectedIds.includes(t.id)).length;
                const projectCount = projectRows.filter((p) => selectedIds.includes(p.id)).length;
                return `${ticketCount} ticket${ticketCount === 1 ? "" : "s"} and ${projectCount} project${projectCount === 1 ? "" : "s"} selected`;
              })()}
            </p>
            <Button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={() => {
                importSelected();
                toast({
                  message: "Imported from ConnectWise",
                  durationMs: 2500,
                });
              }}
            >
              Import selected
            </Button>
          </div>
        </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

