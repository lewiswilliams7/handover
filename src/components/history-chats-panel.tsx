"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FolderInput,
  MessageCircle,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  COLLECTION_COLOR_KEYS,
  collectionDotStyle,
} from "@/lib/collection-colors";
import {
  countTicketsInInput,
  historyGenerationLabel,
} from "@/lib/derive-generation-title";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export type HistoryCollectionRow = {
  id: string;
  name: string;
  color: string;
  pinned: boolean;
  generation_count: number;
};

export type HistoryProjectRow = {
  id: string;
  project_name: string | null;
  title?: string | null;
  collection_id?: string | null;
  input_text: string;
  output_json: unknown;
  created_at: string;
  source?: string | null;
  scheduled_report_id?: string | null;
};

function historyItemSourceBadge(p: HistoryProjectRow): {
  label: string;
  className: string;
} {
  const src = typeof p.source === "string" ? p.source.trim().toLowerCase() : "";
  if (p.scheduled_report_id || src === "scheduled") {
    return {
      label: "Scheduled",
      className:
        "shrink-0 rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-100",
    };
  }
  if (src === "connectwise") {
    return {
      label: "ConnectWise",
      className:
        "shrink-0 rounded-full bg-sky-100 px-1.5 py-px text-[10px] font-medium text-sky-800 dark:bg-sky-500/20 dark:text-sky-100",
    };
  }
  if (src === "halopsa") {
    return {
      label: "HaloPSA",
      className:
        "shrink-0 rounded-full bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-1.5 py-px text-[10px] font-medium text-[var(--accent)]",
    };
  }
  const input = p.input_text ?? "";
  if (input.includes("HaloPSA") || input.includes("═══")) {
    return {
      label: "HaloPSA",
      className:
        "shrink-0 rounded-full bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-1.5 py-px text-[10px] font-medium text-[var(--accent)]",
    };
  }
  if (
    input.includes("ConnectWise") ||
    input.includes("connectwise") ||
    input.includes("CONNECTWISE")
  ) {
    return {
      label: "ConnectWise",
      className:
        "shrink-0 rounded-full bg-sky-100 px-1.5 py-px text-[10px] font-medium text-sky-800 dark:bg-sky-500/20 dark:text-sky-100",
    };
  }
  return {
    label: "Manual",
    className:
      "shrink-0 rounded-full bg-muted/20 px-1.5 py-px text-[10px] font-medium text-muted-foreground",
  };
}

type DateGroupKey = "TODAY" | "YESTERDAY" | "LAST_7" | "OLDER";

function dateGroupLabel(iso: string): DateGroupKey {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.floor(
    (startToday.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (dayDiff <= 0) return "TODAY";
  if (dayDiff === 1) return "YESTERDAY";
  if (dayDiff <= 7) return "LAST_7";
  return "OLDER";
}

const GROUP_LABELS: Record<DateGroupKey, string> = {
  TODAY: "TODAY",
  YESTERDAY: "YESTERDAY",
  LAST_7: "LAST 7 DAYS",
  OLDER: "OLDER",
};

const GROUP_ORDER: DateGroupKey[] = ["TODAY", "YESTERDAY", "LAST_7", "OLDER"];

function groupProjects(
  projects: HistoryProjectRow[],
  mounted: boolean,
): Partial<Record<DateGroupKey, HistoryProjectRow[]>> {
  if (!mounted) {
    return projects.length ? { OLDER: projects } : {};
  }
  return projects.reduce<Partial<Record<DateGroupKey, HistoryProjectRow[]>>>((acc, p) => {
    const label = dateGroupLabel(p.created_at);
    if (!acc[label]) acc[label] = [];
    acc[label]!.push(p);
    return acc;
  }, {});
}

const GEN_DRAG = "application/x-handover-generation";

type Props = {
  searchQuery?: string;
  onAfterSelectGeneration?: () => void;
  collections: HistoryCollectionRow[];
  onRefreshCollections: () => void | Promise<void>;
  selectedCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
  filteredProjects: HistoryProjectRow[];
  selectedProjectId: string | null;
  onSelectProject: (p: HistoryProjectRow) => void;
  onNewGeneration: () => void;
  hasMoreProjects: boolean;
  onLoadMoreProjects: () => void;
  mounted: boolean;
  formatRelativeTime: (iso: string) => string;
  onRenameGeneration: (id: string, title: string) => Promise<void>;
  onMoveGeneration: (id: string, collectionId: string | null) => Promise<void>;
  onDeleteGeneration: (id: string) => Promise<void>;
  onCreateCollection: (name: string, color: string) => Promise<void>;
  onUpdateCollection: (
    id: string,
    patch: { name?: string; color?: string; pinned?: boolean },
  ) => Promise<void>;
  onDeleteCollection: (id: string) => Promise<void>;
  freeHistoryUpsell?: React.ReactNode;
};

export function HistoryChatsPanel({
  searchQuery = "",
  onAfterSelectGeneration,
  collections,
  onRefreshCollections,
  selectedCollectionId,
  onSelectCollection,
  filteredProjects,
  selectedProjectId,
  onSelectProject,
  onNewGeneration,
  hasMoreProjects,
  onLoadMoreProjects,
  mounted,
  formatRelativeTime,
  onRenameGeneration,
  onMoveGeneration,
  onDeleteGeneration,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
  freeHistoryUpsell,
}: Props) {
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollName, setNewCollName] = useState("");
  const [newCollColor, setNewCollColor] = useState<string>("accent");

  const [editingCollId, setEditingCollId] = useState<string | null>(null);
  const [editingCollName, setEditingCollName] = useState("");

  const [editingGenId, setEditingGenId] = useState<string | null>(null);
  const [editingGenTitle, setEditingGenTitle] = useState("");

  const [genMenu, setGenMenu] = useState<{
    x: number;
    y: number;
    project: HistoryProjectRow;
  } | null>(null);
  const [collMenu, setCollMenu] = useState<{
    x: number;
    y: number;
    collectionId: string;
  } | null>(null);
  const [moveSubmenuForGen, setMoveSubmenuForGen] = useState<string | null>(null);

  const [dragOverCollectionId, setDragOverCollectionId] = useState<string | "all" | null>(
    null,
  );

  const [emergencyProjects, setEmergencyProjects] = useState<HistoryProjectRow[] | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!genMenu && !collMenu) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      setGenMenu(null);
      setCollMenu(null);
      setMoveSubmenuForGen(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setGenMenu(null);
        setCollMenu(null);
        setMoveSubmenuForGen(null);
      }
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [genMenu, collMenu]);

  useEffect(() => {
    if (selectedCollectionId !== null) {
      queueMicrotask(() => setEmergencyProjects(null));
      return;
    }
    if (filteredProjects.length > 0) {
      queueMicrotask(() => setEmergencyProjects(null));
      return;
    }
    let cancelled = false;
    void (async () => {
      const sb = createClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user || cancelled) {
        return;
      }
      const { data, error } = await sb
        .from("generations")
        .select(
          "id, project_name, title, collection_id, input_text, output_json, created_at, source, scheduled_report_id",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (error) {
        setEmergencyProjects(null);
        return;
      }
      const rows = (data ?? []) as HistoryProjectRow[];
      setEmergencyProjects(rows.length > 0 ? rows : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [filteredProjects.length, selectedCollectionId]);

  const displayProjects = useMemo(() => {
    if (selectedCollectionId !== null) {
      return filteredProjects;
    }
    if (filteredProjects.length > 0) {
      return filteredProjects;
    }
    if (emergencyProjects?.length) {
      return emergencyProjects;
    }
    return filteredProjects;
  }, [filteredProjects, emergencyProjects, selectedCollectionId]);

  const searchFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return displayProjects;
    return displayProjects.filter((p) => {
      const label = historyGenerationLabel(p).toLowerCase();
      const input = (p.input_text ?? "").toLowerCase();
      return label.includes(q) || input.includes(q);
    });
  }, [displayProjects, searchQuery]);

  const grouped = useMemo(
    () => groupProjects(searchFiltered, mounted),
    [searchFiltered, mounted],
  );

  const finishCreateCollection = useCallback(async () => {
    const n = newCollName.trim();
    if (!n) return;
    await onCreateCollection(n, newCollColor);
    setNewCollName("");
    setNewCollColor("accent");
    setCreatingCollection(false);
    void onRefreshCollections();
  }, [newCollName, newCollColor, onCreateCollection, onRefreshCollections]);

  const saveCollRename = useCallback(async () => {
    if (!editingCollId) return;
    const n = editingCollName.trim();
    if (!n) {
      setEditingCollId(null);
      return;
    }
    await onUpdateCollection(editingCollId, { name: n });
    setEditingCollId(null);
    void onRefreshCollections();
  }, [editingCollId, editingCollName, onUpdateCollection, onRefreshCollections]);

  const saveGenRename = useCallback(async () => {
    if (!editingGenId) return;
    const n = editingGenTitle.trim();
    if (!n) {
      setEditingGenId(null);
      return;
    }
    await onRenameGeneration(editingGenId, n);
    setEditingGenId(null);
  }, [editingGenId, editingGenTitle, onRenameGeneration]);

  const selectGeneration = useCallback(
    (p: HistoryProjectRow) => {
      onSelectProject(p);
      onAfterSelectGeneration?.();
    },
    [onSelectProject, onAfterSelectGeneration],
  );

  const pillClass = (active: boolean, dragOver: boolean) =>
    cn(
      "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
      active
        ? "bg-[var(--accent)] text-white"
        : "bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--border)]/50 hover:text-[var(--text-primary)]",
      dragOver && "ring-2 ring-[var(--accent)]/60",
    );

  return (
    <div className="space-y-3">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:thin]">
        <button
          type="button"
          onClick={() => onSelectCollection(null)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverCollectionId("all");
          }}
          onDragLeave={() => setDragOverCollectionId(null)}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData(GEN_DRAG);
            setDragOverCollectionId(null);
            if (id) void onMoveGeneration(id, null);
          }}
          className={pillClass(selectedCollectionId === null, dragOverCollectionId === "all")}
        >
          All
        </button>
        {collections.map((c) => (
          <div key={c.id} className="flex shrink-0 items-center">
            {editingCollId === c.id ? (
              <input
                className="h-8 min-w-[120px] rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-2.5 text-[12px] text-[var(--text-primary)]"
                value={editingCollName}
                onChange={(e) => setEditingCollName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveCollRename();
                  if (e.key === "Escape") setEditingCollId(null);
                }}
                onBlur={() => void saveCollRename()}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (selectedCollectionId === c.id) {
                    setEditingCollId(c.id);
                    setEditingCollName(c.name);
                  } else {
                    onSelectCollection(c.id);
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCollectionId(c.id);
                }}
                onDragLeave={() => setDragOverCollectionId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData(GEN_DRAG);
                  setDragOverCollectionId(null);
                  if (id) void onMoveGeneration(id, c.id);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setCollMenu({ x: e.clientX, y: e.clientY, collectionId: c.id });
                }}
                className={pillClass(
                  selectedCollectionId === c.id,
                  dragOverCollectionId === c.id,
                )}
              >
                <span
                  className="inline-flex max-w-[160px] items-center gap-1.5 truncate"
                  title={`${c.name} - click again to rename, right-click for more`}
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={collectionDotStyle(c.color)}
                    aria-hidden
                  />
                  {c.name}
                </span>
              </button>
            )}
          </div>
        ))}
        {creatingCollection ? (
          <div className="flex min-w-[200px] shrink-0 flex-col gap-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] p-2">
            <input
              placeholder="Collection name"
              className="h-8 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-2 text-[12px] text-[var(--text-primary)]"
              value={newCollName}
              onChange={(e) => setNewCollName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") void finishCreateCollection();
                if (e.key === "Escape") {
                  setCreatingCollection(false);
                  setNewCollName("");
                }
              }}
            />
            <div className="flex flex-wrap gap-1">
              {COLLECTION_COLOR_KEYS.map((col) => (
                <button
                  key={col}
                  type="button"
                  className={cn(
                    "size-5 rounded-full ring-2 ring-transparent",
                    newCollColor === col && "ring-[var(--accent)]/50",
                  )}
                  style={collectionDotStyle(col)}
                  aria-label={col}
                  onClick={() => setNewCollColor(col)}
                />
              ))}
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                className="h-7 flex-1 bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                onClick={() => void finishCreateCollection()}
              >
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-[12px]"
                onClick={() => {
                  setCreatingCollection(false);
                  setNewCollName("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreatingCollection(true)}
            className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-muted)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
          >
            <Plus className="size-3.5" aria-hidden />
            New collection
          </button>
        )}
      </div>

      {searchFiltered.length === 0 && displayProjects.length > 0 ? (
        <p className="px-1 text-center text-[12px] text-[var(--text-muted)]">
          No generations match your search.
        </p>
      ) : null}

      {searchFiltered.length === 0 && displayProjects.length === 0 ? (
        <div className="flex flex-col items-center px-3 py-10 text-center">
          <MessageCircle
            className="mb-3 size-12 text-[var(--accent)] opacity-90"
            aria-hidden
          />
          <p className="text-[15px] font-semibold text-[var(--text-primary)]">No reports yet</p>
          <p className="mt-2 max-w-[260px] text-[13px] leading-relaxed text-[var(--text-muted)]">
            Generate your first report and it will appear here.
          </p>
          <button
            type="button"
            onClick={onNewGeneration}
            className="mt-5 text-[13px] font-semibold text-[var(--accent)] hover:underline"
          >
            Generate now →
          </button>
        </div>
      ) : (
        <div className="space-y-1 border-t border-[var(--border)] pt-3">
          {GROUP_ORDER.map((group) =>
            grouped[group]?.length ? (
              <div key={group}>
                <div className="px-1 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] first:pt-0">
                  {GROUP_LABELS[group]}
                </div>
                <div className="space-y-0.5">
                  {grouped[group].map((p) => {
                    const tickets = countTicketsInInput(p.input_text ?? "");
                    const label = historyGenerationLabel(p);
                    const sourceBadge = historyItemSourceBadge(p);
                    return (
                      <div key={p.id} className="group/gen relative">
                        {editingGenId === p.id ? (
                          <input
                            className="mb-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-1.5 text-[12px] text-[var(--text-primary)]"
                            value={editingGenTitle}
                            onChange={(e) => setEditingGenTitle(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveGenRename();
                              if (e.key === "Escape") setEditingGenId(null);
                            }}
                            onBlur={() => void saveGenRename()}
                          />
                        ) : (
                          <div
                            role="button"
                            tabIndex={0}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData(GEN_DRAG, p.id);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            className={cn(
                              "flex w-full cursor-pointer flex-col gap-0.5 rounded-[var(--radius)] py-[7px] pr-2 pl-2.5 text-left transition-[background] duration-[120ms]",
                              "border-l-2 border-transparent hover:bg-[var(--border)]/30",
                              "outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)]",
                              selectedProjectId === p.id &&
                                "border-l-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]",
                            )}
                            onClick={() => selectGeneration(p)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                selectGeneration(p);
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setGenMenu({ x: e.clientX, y: e.clientY, project: p });
                            }}
                            aria-label={`Open generation: ${label}`}
                          >
                            <div className="flex items-start gap-2">
                              <div className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-primary)]">
                                {label}
                              </div>
                              <span className={sourceBadge.className}>{sourceBadge.label}</span>
                              {tickets > 0 ? (
                                <span className="shrink-0 rounded-full bg-[var(--border)]/50 px-1.5 py-px text-[10px] font-medium tabular-nums text-[var(--text-secondary)]">
                                  {tickets}
                                </span>
                              ) : null}
                              <button
                                type="button"
                                className="shrink-0 text-[14px] font-bold leading-none text-[var(--text-muted)] opacity-0 transition-opacity group-hover/gen:opacity-100"
                                aria-label="Generation actions"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setGenMenu({
                                    x: ev.clientX,
                                    y: ev.clientY,
                                    project: p,
                                  });
                                }}
                              >
                                •••
                              </button>
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)]">
                              {mounted ? formatRelativeTime(p.created_at) : " - "}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}

      {hasMoreProjects ? (
        <Button
          type="button"
          variant="ghost"
          className="w-full text-[13px] text-[var(--accent)] hover:bg-[var(--border)]/30 hover:text-[var(--accent)]"
          onClick={onLoadMoreProjects}
        >
          Load more
        </Button>
      ) : null}

      {freeHistoryUpsell}

      {(genMenu || collMenu) && (
        <div
          ref={menuRef}
          className="fixed z-[200] min-w-[200px] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] py-1 shadow-xl"
          style={{
            left: Math.min(
              (genMenu?.x ?? collMenu?.x ?? 0) + 4,
              typeof window !== "undefined" ? window.innerWidth - 220 : 0,
            ),
            top: Math.min(
              (genMenu?.y ?? collMenu?.y ?? 0) + 4,
              typeof window !== "undefined" ? window.innerHeight - 200 : 0,
            ),
          }}
        >
          {genMenu ? (
            <>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[var(--text-primary)] hover:bg-[var(--border)]/40"
                onClick={() => {
                  setEditingGenId(genMenu.project.id);
                  setEditingGenTitle(historyGenerationLabel(genMenu.project));
                  setGenMenu(null);
                }}
              >
                <Pencil className="size-3.5" aria-hidden />
                Rename
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[var(--text-primary)] hover:bg-[var(--border)]/40"
                onClick={() =>
                  setMoveSubmenuForGen((v) =>
                    v === genMenu.project.id ? null : genMenu.project.id,
                  )
                }
              >
                <FolderInput className="size-3.5" aria-hidden />
                Move to collection
              </button>
              {moveSubmenuForGen === genMenu.project.id ? (
                <div className="border-t border-[var(--border)] py-1">
                  <button
                    type="button"
                    className="block w-full px-4 py-1.5 text-left text-[11px] text-[var(--text-secondary)] hover:bg-[var(--border)]/30"
                    onClick={() => {
                      void onMoveGeneration(genMenu.project.id, null);
                      setGenMenu(null);
                      setMoveSubmenuForGen(null);
                    }}
                  >
                    All generations
                  </button>
                  {collections.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="block w-full px-4 py-1.5 text-left text-[11px] text-[var(--text-secondary)] hover:bg-[var(--border)]/30"
                      onClick={() => {
                        void onMoveGeneration(genMenu.project.id, c.id);
                        setGenMenu(null);
                        setMoveSubmenuForGen(null);
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-red-400 hover:bg-red-500/10"
                onClick={() => {
                  void onDeleteGeneration(genMenu.project.id);
                  setGenMenu(null);
                }}
              >
                <Trash2 className="size-3.5" aria-hidden />
                Delete
              </button>
            </>
          ) : collMenu ? (
            <>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[var(--text-primary)] hover:bg-[var(--border)]/40"
                onClick={() => {
                  const c = collections.find((x) => x.id === collMenu.collectionId);
                  if (c) {
                    void onUpdateCollection(c.id, { pinned: !c.pinned }).then(() =>
                      onRefreshCollections(),
                    );
                  }
                  setCollMenu(null);
                }}
              >
                <Star className="size-3.5" aria-hidden />
                {collections.find((x) => x.id === collMenu.collectionId)?.pinned
                  ? "Unpin"
                  : "Pin"}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[var(--text-primary)] hover:bg-[var(--border)]/40"
                onClick={() => {
                  const c = collections.find((x) => x.id === collMenu.collectionId);
                  if (c) {
                    setEditingCollId(c.id);
                    setEditingCollName(c.name);
                  }
                  setCollMenu(null);
                }}
              >
                <Pencil className="size-3.5" aria-hidden />
                Rename
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-red-400 hover:bg-red-500/10"
                onClick={() => {
                  void onDeleteCollection(collMenu.collectionId);
                  setCollMenu(null);
                  if (selectedCollectionId === collMenu.collectionId) {
                    onSelectCollection(null);
                  }
                }}
              >
                <Trash2 className="size-3.5" aria-hidden />
                Delete
              </button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
