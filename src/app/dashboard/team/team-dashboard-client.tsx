"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  LayoutDashboard,
  Loader2,
  MoreVertical,
  RefreshCw,
  Shield,
  ShieldOff,
  Sparkles,
  UserMinus,
  Users,
  Zap,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CardMouseSpotlight } from "@/components/card-mouse-spotlight";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { TrialBanner } from "@/components/trial-banner";
import { useToast } from "@/components/toasts";
import { cn } from "@/lib/utils";
import type { TeamDashboardPermission } from "@/lib/team-dashboard-permission";
import {
  STRIPE_TEAM_ANNUAL_PRICE_ID,
  STRIPE_TEAM_MONTHLY_PRICE_ID,
} from "@/lib/stripe-price-ids";
import {
  TEAM_LIMITS,
  TEAM_MEMBER_INVITES_BLOCKED_MESSAGE,
  isTeamPlan,
} from "@/lib/plans";

type OverviewMember = {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  email: string | null;
  display_name: string;
  permissions: Record<string, boolean | null>;
  dashboard_permission: TeamDashboardPermission;
};

type OverviewInvite = {
  id: string;
  email: string | null;
  role: string;
  expires_at: string;
  created_at: string;
};

type OverviewPayload = {
  team: {
    id: string;
    name: string;
    plan: string;
    generation_count: number;
    generation_limit: number;
    seat_limit?: number | null;
    subscription_status?: string | null;
    trial_end?: string | null;
  };
  seatCap: number;
  purchasedSeatLimit: number;
  viewerRole: string;
  permKeys: readonly string[];
  members: OverviewMember[];
  pendingInvites: OverviewInvite[];
  haloConnections: { user_id: string; updated_at: string }[];
  usageStats: {
    dailyThisMonth: { date: string; day: number; count: number }[];
    memberMonthCounts: { user_id: string; display_name: string; count: number }[];
    thisMonthTotal: number;
    lastMonthTotal: number;
  };
  /** True when profile or team has a Stripe customer (use portal, not checkout). */
  hasStripeCustomer?: boolean;
  /** False for Professional / professional_trial solo SKUs or non–Team workspace product. */
  memberInvitesAllowed?: boolean;
};

type TabId = "overview" | "members" | "settings";

const PER_SEAT_MONTHLY_GENERATIONS = 200;

const PERM_TOOLTIPS: Record<string, string> = {
  push_to_halo:
    "Allows this member to push generated outputs back to HaloPSA tickets as notes",
  scheduled_reports:
    "Allows this member to create and manage scheduled weekly reports",
  excel_export: "Allows this member to export outputs as Excel files",
  view_history: "Allows this member to view their generation history",
};

const DASHBOARD_PERM_HELP =
  "No access: hides the dashboard tab. Read only: table view only (no row detail, no generate from dashboard). Full: standard dashboard behaviour.";

function PermissionSelect({
  permKey,
  value,
  onChange,
}: {
  permKey: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  const selectValue = value === null ? "default" : value ? "enabled" : "disabled";
  return (
    <select
      title={PERM_TOOLTIPS[permKey] ?? ""}
      aria-label={permKey.replace(/_/g, " ")}
      value={selectValue}
      onChange={(e) => {
        const s = e.target.value;
        onChange(s === "default" ? null : s === "enabled");
      }}
      className="h-8 max-w-[132px] rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-1.5 text-xs text-[var(--text-primary)]"
    >
      <option value="enabled">Enabled</option>
      <option value="disabled">Disabled</option>
      <option value="default">Default</option>
    </select>
  );
}

const elevateCardStyle: CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(83,74,183,0.06) 0%, rgba(56,189,248,0.05) 100%)",
  border: "1.5px solid color-mix(in srgb, var(--accent) 28%, var(--border))",
};

function sectionTitleClass() {
  return "border-l-4 border-[var(--accent)] pl-4 text-lg font-bold tracking-tight text-[var(--text-primary)]";
}

function memberInitials(displayName: string, email: string | null): string {
  const raw = displayName.trim() || (email ?? "").split("@")[0] || "?";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase().slice(0, 2);
  }
  return raw.slice(0, 2).toUpperCase();
}

function memberUsageBarClass(count: number): string {
  if (count >= 190) return "bg-red-500 dark:bg-red-500";
  if (count >= 150) return "bg-amber-500 dark:bg-amber-500";
  return "bg-emerald-500 dark:bg-emerald-500";
}

function roleBadgeClass(role: string): string {
  if (role === "owner") return "bg-amber-500/20 text-amber-200";
  if (role === "admin") return "bg-sky-500/20 text-sky-200";
  return "bg-white/10 text-[var(--sidebar-text)]";
}

function planLabel(plan: string): string {
  if (plan === "team" || plan === "team_trial") return "Team";
  if (plan === "pro") return "Pro";
  if (plan === "free") return "Basic";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function EnterpriseSeatsUpgradeMessage({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs leading-relaxed text-[var(--text-secondary)]", className)}>
      Need more than 20 seats? Our Enterprise plan includes unlimited seats, dedicated account
      management, and custom pricing.{" "}
      <Link
        href="/contact/sales?plan=enterprise"
        className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
      >
        Talk to us →
      </Link>
    </p>
  );
}

export function TeamDashboardClient() {
  const toast = useToast();
  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [sending, setSending] = useState(false);
  const [teamNameDraft, setTeamNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dangerBusy, setDangerBusy] = useState(false);
  const [membersLocal, setMembersLocal] = useState<OverviewMember[] | null>(null);
  const [removeTarget, setRemoveTarget] = useState<OverviewMember | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<OverviewMember | null>(null);
  const [demoteTarget, setDemoteTarget] = useState<OverviewMember | null>(null);
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);
  const [memberMenuFlipUp, setMemberMenuFlipUp] = useState(false);
  const [memberMenuTranslateX, setMemberMenuTranslateX] = useState(0);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeEmailConfirm, setRemoveEmailConfirm] = useState("");
  const [roleActionBusy, setRoleActionBusy] = useState(false);
  const [enterpriseSeatsModalOpen, setEnterpriseSeatsModalOpen] = useState(false);
  const [paidSeatInviteModalOpen, setPaidSeatInviteModalOpen] = useState(false);
  const [paidSeatBillingInterval, setPaidSeatBillingInterval] = useState<"month" | "year">("month");
  const [teamBuyBillingModalOpen, setTeamBuyBillingModalOpen] = useState(false);
  const [teamBuyBillingPeriod, setTeamBuyBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [teamBuyStripeLoading, setTeamBuyStripeLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const memberRowMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const memberRowMenuListRef = useRef<HTMLUListElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team/overview");
      const json = (await res.json()) as OverviewPayload & { error?: string };
      if (!res.ok) {
        setData(null);
        toast({
          message: json.error ?? "Could not load team",
          variant: "error",
          durationMs: 5000,
        });
        return;
      }
      setData(json);
      setTeamNameDraft(json.team.name ?? "");
    } catch {
      toast({ message: "Could not load team", variant: "error", durationMs: 5000 });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (data?.members) {
      setMembersLocal(
        data.members.map((m) => ({ ...m, permissions: { ...m.permissions } })),
      );
    }
  }, [data]);

  useEffect(() => {
    if (!rowMenuOpenId) return;
    const onDocClick = (e: MouseEvent) => {
      const el = menuRef.current;
      if (el && !el.contains(e.target as Node)) setRowMenuOpenId(null);
    };
    const id = window.requestAnimationFrame(() => {
      document.addEventListener("click", onDocClick);
    });
    return () => {
      window.cancelAnimationFrame(id);
      document.removeEventListener("click", onDocClick);
    };
  }, [rowMenuOpenId]);

  useLayoutEffect(() => {
    if (rowMenuOpenId == null) {
      setMemberMenuFlipUp(false);
      setMemberMenuTranslateX(0);
      return;
    }
    const btn = memberRowMenuButtonRef.current;
    const list = memberRowMenuListRef.current;
    if (!btn || !list) return;
    const br = btn.getBoundingClientRect();
    const lr = list.getBoundingClientRect();
    const pad = 8;
    const spaceBelow = window.innerHeight - br.bottom - pad;
    const spaceAbove = br.top - pad;
    const h = lr.height;
    const placeAbove = h > spaceBelow && spaceAbove >= spaceBelow;
    setMemberMenuFlipUp(placeAbove);
  }, [rowMenuOpenId]);

  useLayoutEffect(() => {
    if (rowMenuOpenId == null) return;
    const list = memberRowMenuListRef.current;
    if (!list) return;
    const lr = list.getBoundingClientRect();
    const pad = 8;
    let tx = 0;
    if (lr.right > window.innerWidth - pad) {
      tx = window.innerWidth - pad - lr.right;
    }
    if (lr.left + tx < pad) {
      tx = pad - lr.left;
    }
    setMemberMenuTranslateX(tx);
  }, [rowMenuOpenId, memberMenuFlipUp]);

  const sendInvite = async (confirmPaidSeat?: boolean) => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role: inviteRole,
          ...(confirmPaidSeat ? { confirmPaidSeat: true } : {}),
        }),
      });
      const j = (await res.json()) as {
        error?: string;
        code?: string;
        billingInterval?: string;
      };
      if (res.status === 409 && j.code === "NEEDS_CONFIRM") {
        setPaidSeatBillingInterval(j.billingInterval === "year" ? "year" : "month");
        setPaidSeatInviteModalOpen(true);
        return;
      }
      if (!res.ok) {
        toast({ message: j.error ?? "Invite failed", variant: "error", durationMs: 6000 });
        return;
      }
      setPaidSeatInviteModalOpen(false);
      toast({ message: "Invitation sent", durationMs: 3000 });
      setInviteEmail("");
      void load();
    } finally {
      setSending(false);
    }
  };

  const revokeInvite = async (id: string) => {
    const res = await fetch(`/api/team/invites/${id}`, { method: "DELETE" });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast({ message: j.error ?? "Could not revoke", variant: "error", durationMs: 5000 });
      return;
    }
    toast({ message: "Invite revoked", durationMs: 2500 });
    void load();
  };

  const patchMemberPermission = async (
    memberId: string,
    key: string,
    value: boolean | null,
    current: Record<string, boolean | null>,
  ) => {
    const prev = { ...current };
    const next = { ...current, [key]: value };
    setMembersLocal((list) =>
      list?.map((m) => (m.id === memberId ? { ...m, permissions: { ...next } } : m)) ?? list,
    );
    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: next }),
      });
      const j = (await res.json()) as { error?: string; permissions?: Record<string, boolean | null> };
      if (!res.ok) {
        setMembersLocal((list) =>
          list?.map((m) => (m.id === memberId ? { ...m, permissions: prev } : m)) ?? list,
        );
        toast({ message: j.error ?? "Could not update", variant: "error", durationMs: 5000 });
        return;
      }
      if (j.permissions) {
        setMembersLocal((list) =>
          list?.map((m) => (m.id === memberId ? { ...m, permissions: j.permissions! } : m)) ?? list,
        );
      }
      toast({ message: "Permission saved", durationMs: 2200 });
    } catch {
      setMembersLocal((list) =>
        list?.map((m) => (m.id === memberId ? { ...m, permissions: prev } : m)) ?? list,
      );
      toast({ message: "Could not update", variant: "error", durationMs: 5000 });
    }
  };

  const patchMemberDashboardPermission = async (
    memberId: string,
    value: TeamDashboardPermission,
    prev: TeamDashboardPermission,
  ) => {
    setMembersLocal((list) =>
      list?.map((m) => (m.id === memberId ? { ...m, dashboard_permission: value } : m)) ?? list,
    );
    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboard_permission: value }),
      });
      const j = (await res.json()) as {
        error?: string;
        dashboard_permission?: TeamDashboardPermission;
      };
      if (!res.ok) {
        setMembersLocal((list) =>
          list?.map((m) => (m.id === memberId ? { ...m, dashboard_permission: prev } : m)) ?? list,
        );
        toast({ message: j.error ?? "Could not update", variant: "error", durationMs: 5000 });
        return;
      }
      if (j.dashboard_permission) {
        setMembersLocal((list) =>
          list?.map((m) =>
            m.id === memberId ? { ...m, dashboard_permission: j.dashboard_permission! } : m,
          ) ?? list,
        );
      }
      toast({ message: "Dashboard access saved", durationMs: 2200 });
    } catch {
      setMembersLocal((list) =>
        list?.map((m) => (m.id === memberId ? { ...m, dashboard_permission: prev } : m)) ?? list,
      );
      toast({ message: "Could not update", variant: "error", durationMs: 5000 });
    }
  };

  const patchMemberRole = async (
    memberId: string,
    role: "admin" | "member",
    prevRole: string,
  ): Promise<boolean> => {
    if (roleActionBusy) return false;
    setRoleActionBusy(true);
    setMembersLocal((list) =>
      list?.map((m) => (m.id === memberId ? { ...m, role } : m)) ?? list,
    );
    setRowMenuOpenId(null);
    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const j = (await res.json()) as { error?: string; role?: string };
      if (!res.ok) {
        setMembersLocal((list) =>
          list?.map((m) => (m.id === memberId ? { ...m, role: prevRole } : m)) ?? list,
        );
        toast({ message: j.error ?? "Could not update role", variant: "error", durationMs: 5000 });
        return false;
      }
      if (j.role) {
        setMembersLocal((list) =>
          list?.map((m) => (m.id === memberId ? { ...m, role: j.role! } : m)) ?? list,
        );
      }
      toast({ message: "Role updated", durationMs: 2200 });
      void load();
      return true;
    } catch {
      setMembersLocal((list) =>
        list?.map((m) => (m.id === memberId ? { ...m, role: prevRole } : m)) ?? list,
      );
      toast({ message: "Could not update role", variant: "error", durationMs: 5000 });
      return false;
    } finally {
      setRoleActionBusy(false);
    }
  };

  const confirmRemoveMember = async () => {
    if (!removeTarget || removeBusy) return;
    const email = (removeTarget.email ?? "").trim().toLowerCase();
    if (!email || removeEmailConfirm.trim().toLowerCase() !== email) return;
    setRemoveBusy(true);
    const removedId = removeTarget.id;
    try {
      const res = await fetch(`/api/team/members/${removedId}`, { method: "DELETE" });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ message: j.error ?? "Could not remove member", variant: "error", durationMs: 5000 });
        return;
      }
      setMembersLocal((list) => list?.filter((m) => m.id !== removedId) ?? list);
      toast({ message: "Member removed", durationMs: 2500 });
      setRemoveTarget(null);
      setRemoveEmailConfirm("");
      void load();
    } finally {
      setRemoveBusy(false);
    }
  };

  const saveTeamName = async () => {
    const name = teamNameDraft.trim();
    if (!name || savingName) return;
    setSavingName(true);
    try {
      const res = await fetch("/api/team/overview", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const j = (await res.json()) as { error?: string; name?: string };
      if (!res.ok) {
        toast({ message: j.error ?? "Could not save", variant: "error", durationMs: 5000 });
        return;
      }
      toast({ message: "Team name saved", durationMs: 2500 });
      void load();
    } finally {
      setSavingName(false);
    }
  };

  const openBillingPortal = async (returnPath: string = "/") => {
    if (billingLoading) return;
    setBillingLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath }),
        credentials: "include",
      });
      const j = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !j.url) {
        toast({
          message: j.error ?? "Could not open billing portal",
          variant: "error",
          durationMs: 5000,
        });
        return;
      }
      window.location.href = j.url;
    } finally {
      setBillingLoading(false);
    }
  };

  const continueTeamBuyToStripe = async () => {
    if (!data || teamBuyStripeLoading || billingLoading) return;
    if (data.hasStripeCustomer) {
      setTeamBuyBillingModalOpen(false);
      await openBillingPortal("/dashboard/team");
      return;
    }
    const priceId =
      teamBuyBillingPeriod === "annual" && STRIPE_TEAM_ANNUAL_PRICE_ID
        ? STRIPE_TEAM_ANNUAL_PRICE_ID
        : STRIPE_TEAM_MONTHLY_PRICE_ID;
    if (!priceId) {
      toast({
        message: "Team billing is not configured. Contact support.",
        variant: "error",
        durationMs: 6000,
      });
      return;
    }
    const seatLimitDisplayLocal =
      typeof data.team.seat_limit === "number" && data.team.seat_limit >= 1
        ? data.team.seat_limit
        : data.purchasedSeatLimit;
    const seats = Math.min(TEAM_LIMITS.team.seats, Math.max(3, seatLimitDisplayLocal));
    setTeamBuyStripeLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          priceId,
          seats,
          skipTeamTrial: true,
        }),
      });
      const j = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !j.url) {
        toast({
          message:
            j.error ??
            "Checkout could not start (you may already have an active team subscription). Opening the billing portal instead.",
          variant: "error",
          durationMs: 7000,
        });
        setTeamBuyBillingModalOpen(false);
        await openBillingPortal("/dashboard/team");
        return;
      }
      setTeamBuyBillingModalOpen(false);
      window.location.href = j.url;
    } catch {
      toast({
        message: "Could not reach Stripe. Try again or use Manage billing.",
        variant: "error",
        durationMs: 6000,
      });
    } finally {
      setTeamBuyStripeLoading(false);
    }
  };

  const leaveTeam = async () => {
    if (dangerBusy) return;
    setDangerBusy(true);
    try {
      const res = await fetch("/api/team/leave", { method: "POST" });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ message: j.error ?? "Could not leave team", variant: "error", durationMs: 6000 });
        return;
      }
      toast({ message: "You have left the team", durationMs: 3000 });
      window.location.href = "/";
    } finally {
      setDangerBusy(false);
      setConfirmLeave(false);
    }
  };

  const deleteTeam = async () => {
    if (dangerBusy) return;
    setDangerBusy(true);
    try {
      const res = await fetch("/api/team", { method: "DELETE" });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ message: j.error ?? "Could not delete team", variant: "error", durationMs: 6000 });
        return;
      }
      toast({ message: "Team deleted", durationMs: 3000 });
      window.location.href = "/";
    } finally {
      setDangerBusy(false);
      setConfirmDelete(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--text-muted)]">
        <Loader2 className="size-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-[var(--border)] p-8 text-center text-[var(--text-muted)]">
        No team data.
      </div>
    );
  }

  const {
    team,
    purchasedSeatLimit,
    members,
    pendingInvites,
    haloConnections,
    permKeys,
    usageStats,
    viewerRole,
    memberInvitesAllowed = true,
  } = data;
  const displayMembers = membersLocal ?? members;
  const seatsUsed = members.length;
  const seatLimitDisplay =
    typeof team.seat_limit === "number" && team.seat_limit >= 1 ? team.seat_limit : purchasedSeatLimit;
  const atTeamSeatPurchaseCap = seatLimitDisplay >= TEAM_LIMITS.team.seats;
  const haloConnected = haloConnections.length > 0;
  const genLimit = team.generation_limit || 1;
  const genUsed = team.generation_count ?? 0;
  const genPct = Math.min(100, Math.round((genUsed / genLimit) * 100));
  const now = new Date();
  const monthName = now.toLocaleString("default", { month: "long", year: "numeric" });

  const countByUser = new Map(usageStats.memberMonthCounts.map((r) => [r.user_id, r.count]));

  const tabBtn = (id: TabId, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={cn(
        "team-dash-tab -mb-px border-b-2 pb-2.5 text-sm font-semibold transition-[border-color,color] duration-200",
        tab === id
          ? "border-[var(--accent)] text-[var(--text-primary)]"
          : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]",
      )}
    >
      {label}
    </button>
  );

  const cardShell =
    "team-dash-card rounded-[var(--radius-lg)] shadow-md transition-[transform,box-shadow] duration-200 hover:shadow-lg";

  return (
    <div className="mx-auto max-w-5xl animate-in fade-in duration-300 space-y-8 px-4 py-10">
      <TrialBanner />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] md:text-[28px]">
          Your team
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Usage, members, and settings for your Handover team plan.
        </p>
      </div>

      <div className="flex flex-wrap gap-8 border-b border-[var(--border)]" role="tablist">
        {tabBtn("overview", "Overview")}
        {tabBtn("members", "Members")}
        {tabBtn("settings", "Settings")}
      </div>

      {tab === "overview" ? (
        <div key="overview" className="animate-in fade-in duration-200 space-y-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <ScrollRevealItem index={0} className="min-w-0">
            <div className="flex flex-col gap-2">
              <CardMouseSpotlight className={cn(cardShell, "p-5")} style={elevateCardStyle}>
                <Users className="size-5 text-[var(--accent)]" strokeWidth={1.75} aria-hidden />
                <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight text-[var(--text-primary)]">
                  {seatsUsed}
                  <span className="text-lg font-semibold text-[var(--text-muted)]">
                    {" "}
                    / {seatLimitDisplay}
                  </span>
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Seats used
                </p>
              </CardMouseSpotlight>
              {isTeamPlan(team.plan) && atTeamSeatPurchaseCap ? (
                <EnterpriseSeatsUpgradeMessage className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)]/50 px-3 py-2" />
              ) : null}
              <button
                type="button"
                disabled={billingLoading || teamBuyStripeLoading}
                onClick={() => {
                  if (atTeamSeatPurchaseCap) {
                    setEnterpriseSeatsModalOpen(true);
                    return;
                  }
                  if (isTeamPlan(team.plan)) {
                    if (data.hasStripeCustomer) {
                      void openBillingPortal("/dashboard/team");
                      return;
                    }
                    setTeamBuyBillingPeriod("monthly");
                    setTeamBuyBillingModalOpen(true);
                  } else {
                    void openBillingPortal("/dashboard/team");
                  }
                }}
                className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-left text-xs font-medium text-[var(--accent)] transition-colors hover:bg-[var(--sidebar-hover)] disabled:opacity-50"
              >
                Buy more seats →
              </button>
            </div>
            </ScrollRevealItem>
            <ScrollRevealItem index={1} className="min-w-0">
            <CardMouseSpotlight className={cn(cardShell, "p-5")} style={elevateCardStyle}>
              <Zap className="size-5 text-[var(--accent)]" strokeWidth={1.75} aria-hidden />
              <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight text-[var(--text-primary)]">
                {genUsed}
                <span className="text-lg font-semibold text-[var(--text-muted)]">
                  {" "}
                  / {genLimit}
                </span>
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Generations (billing period)
              </p>
              <p className="mt-2 text-[11px] leading-snug text-[var(--text-muted)]">
                200 generations per seat per month, pooled across your team
              </p>
            </CardMouseSpotlight>
            </ScrollRevealItem>
            <ScrollRevealItem index={2} className="min-w-0">
            <CardMouseSpotlight className={cn(cardShell, "p-5")} style={elevateCardStyle}>
              <LayoutDashboard className="size-5 text-[var(--accent)]" strokeWidth={1.75} aria-hidden />
              <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight text-[var(--text-primary)]">
                {members.length}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Members
              </p>
            </CardMouseSpotlight>
            </ScrollRevealItem>
            <ScrollRevealItem index={3} className="min-w-0">
            <CardMouseSpotlight className={cn(cardShell, "p-5")} style={elevateCardStyle}>
              <Sparkles className="size-5 text-[var(--accent)]" strokeWidth={1.75} aria-hidden />
              <p className="mt-4">
                <span className="inline-flex rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/12 px-3 py-1 text-xs font-bold tracking-wide text-[var(--accent)]">
                  {planLabel(team.plan)}
                </span>
              </p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Plan
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">Billed in Stripe</p>
            </CardMouseSpotlight>
            </ScrollRevealItem>
          </div>

          <ScrollRevealItem index={4} className="block">
          <section className={cn(cardShell, "p-6 sm:p-7")} style={elevateCardStyle}>
            <h2 className={sectionTitleClass()}>Pool usage ({monthName})</h2>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Team-wide generation count vs your plan limit this billing period.
            </p>
            <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
              <AnimatedFillBar targetPercent={genPct} barClassName="bg-[var(--accent)]" />
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {genUsed} of {genLimit} used ({genPct}%)
            </p>
          </section>
          </ScrollRevealItem>

          <ScrollRevealItem index={5} className="block">
          <section className={cn(cardShell, "p-6 sm:p-7")} style={elevateCardStyle}>
            <h2 className={sectionTitleClass()}>Daily generations ({monthName})</h2>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Saved generations by team members, by UTC day.
            </p>
            <div className="mt-5 h-[260px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usageStats.dailyThisMonth} margin={{ top: 12, right: 12, left: -8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    width={36}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={{ stroke: "var(--border)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--text-primary)",
                    }}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.date ? String(payload[0].payload.date) : ""
                    }
                  />
                  <ReferenceLine
                    y={genLimit}
                    stroke="var(--accent)"
                    strokeDasharray="5 5"
                    strokeOpacity={0.65}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: "var(--accent)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
          </ScrollRevealItem>

          <section className={cn(cardShell, "p-6 sm:p-7")} style={elevateCardStyle}>
            <h2 className={sectionTitleClass()}>Member usage this month</h2>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Each bar shows usage against a {PER_SEAT_MONTHLY_GENERATIONS}/month seat allowance (team pool
              is shared).
            </p>
            <ul className="mt-5 space-y-4">
              {[...displayMembers]
                .sort(
                  (a, b) =>
                    (countByUser.get(b.user_id) ?? 0) - (countByUser.get(a.user_id) ?? 0),
                )
                .map((m, rowIdx) => {
                const count = countByUser.get(m.user_id) ?? 0;
                const pct = Math.min(100, (count / PER_SEAT_MONTHLY_GENERATIONS) * 100);
                return (
                  <ScrollRevealItem key={m.id} index={rowIdx} className="block">
                  <li
                    className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)]/40 p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[12px] font-semibold text-white"
                        aria-hidden
                      >
                        {memberInitials(m.display_name, m.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[var(--text-primary)]">{m.display_name}</p>
                        <p className="truncate text-xs text-[var(--text-muted)]">{m.email ?? " - "}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                        {count}{" "}
                        <span className="text-xs font-normal text-[var(--text-muted)]">gens</span>
                      </p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                      <AnimatedFillBar targetPercent={pct} barClassName={memberUsageBarClass(count)} />
                    </div>
                  </li>
                  </ScrollRevealItem>
                );
                })}
            </ul>
          </section>

          <ScrollRevealItem index={6} className="block">
          <section className={cn(cardShell, "p-6 sm:p-7")} style={elevateCardStyle}>
            <h2 className={sectionTitleClass()}>Month on month</h2>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              This month: <strong className="text-[var(--text-primary)]">{usageStats.thisMonthTotal}</strong>{" "}
              generations logged · Last month:{" "}
              <strong className="text-[var(--text-primary)]">{usageStats.lastMonthTotal}</strong>
            </p>
          </section>
          </ScrollRevealItem>

          <ScrollRevealItem index={7} className="block">
          <section className={cn(cardShell, "p-6 sm:p-7")} style={elevateCardStyle}>
            <h2 className={sectionTitleClass()}>Billing</h2>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Update payment method, seats, or cancel in the Stripe customer portal.
            </p>
            <Button
              type="button"
              size="lg"
              className="mt-5 w-full max-w-xs rounded-[var(--radius)] bg-[var(--accent)] text-base font-semibold text-white shadow-lg hover:bg-[var(--accent-hover)] sm:w-auto"
              disabled={billingLoading}
              onClick={() => void openBillingPortal()}
            >
              {billingLoading ? "Opening…" : "Manage billing"}
            </Button>
          </section>
          </ScrollRevealItem>
        </div>
      ) : null}

      {tab === "members" ? (
        <div key="members" className="animate-in fade-in duration-200 space-y-10">
          <ScrollRevealItem index={0} className="block">
          <section className={cn(cardShell, "p-6 sm:p-7")} style={elevateCardStyle}>
            <h2 className={sectionTitleClass()}>Members</h2>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Each member has an individual allowance of 200 generations/month contributing to your team
              pool.
            </p>
            <div className="mt-5 min-w-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    {permKeys.map((k) => (
                      <TableHead key={k} className="whitespace-normal text-xs capitalize">
                        {k.replace(/_/g, " ")}
                      </TableHead>
                    ))}
                    <TableHead
                      className="whitespace-normal text-xs"
                      title={DASHBOARD_PERM_HELP}
                    >
                      Dashboard
                    </TableHead>
                    <TableHead className="w-[52px] text-right"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayMembers.map((m) => {
                    const canPromote = viewerRole === "owner" && m.role === "member";
                    const canDemote = viewerRole === "owner" && m.role === "admin";
                    const canRemove =
                      (viewerRole === "owner" && m.role !== "owner") ||
                      (viewerRole === "admin" && m.role === "member");
                    const canTransfer = viewerRole === "owner" && m.role !== "owner";
                    const menuItems =
                      (canPromote ? 1 : 0) +
                      (canDemote ? 1 : 0) +
                      (canRemove ? 1 : 0) +
                      (canTransfer ? 1 : 0);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.display_name}</TableCell>
                        <TableCell className="text-[var(--text-muted)]">{m.email ?? " - "}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${roleBadgeClass(m.role)}`}
                          >
                            {m.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-[var(--text-muted)]">
                          {new Date(m.joined_at).toLocaleDateString()}
                        </TableCell>
                        {permKeys.map((key) => (
                          <TableCell key={key}>
                            {m.role === "owner" ? (
                              <span className="text-xs text-[var(--text-muted)]">Full access</span>
                            ) : m.role === "admin" ? (
                              <span className="text-xs text-[var(--text-muted)]">Admin access</span>
                            ) : (
                              <PermissionSelect
                                permKey={key}
                                value={m.permissions[key] ?? null}
                                onChange={(v) =>
                                  void patchMemberPermission(m.id, key, v, m.permissions)
                                }
                              />
                            )}
                          </TableCell>
                        ))}
                        <TableCell>
                          {m.role === "owner" || m.role === "admin" ? (
                            <span className="text-xs text-[var(--text-muted)]">Full access</span>
                          ) : (
                            <select
                              title={DASHBOARD_PERM_HELP}
                              aria-label="Dashboard access"
                              value={m.dashboard_permission}
                              onChange={(e) => {
                                const v = e.target.value as TeamDashboardPermission;
                                void patchMemberDashboardPermission(
                                  m.id,
                                  v,
                                  m.dashboard_permission,
                                );
                              }}
                              className="h-8 max-w-[160px] rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-1.5 text-xs text-[var(--text-primary)]"
                            >
                              <option value="none">No access</option>
                              <option value="read">Read only</option>
                              <option value="full">Full access</option>
                            </select>
                          )}
                        </TableCell>
                        <TableCell className="relative overflow-visible text-right">
                          {m.role !== "owner" && menuItems > 0 ? (
                            <div
                              ref={rowMenuOpenId === m.id ? menuRef : undefined}
                              className="relative z-10 inline-block text-right"
                            >
                              <button
                                ref={rowMenuOpenId === m.id ? memberRowMenuButtonRef : undefined}
                                type="button"
                                aria-label={`Actions for ${m.display_name}`}
                                aria-expanded={rowMenuOpenId === m.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMemberMenuFlipUp(false);
                                  setMemberMenuTranslateX(0);
                                  setRowMenuOpenId((id) => (id === m.id ? null : m.id));
                                }}
                                className="inline-flex size-8 items-center justify-center rounded-md border border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                              >
                                <MoreVertical className="size-4" aria-hidden />
                              </button>
                              {rowMenuOpenId === m.id ? (
                                <ul
                                  key={m.id}
                                  ref={memberRowMenuListRef}
                                  className={cn(
                                    "absolute right-0 z-50 min-w-[200px] max-w-[min(280px,calc(100vw-1rem))] rounded-md border border-[var(--border)] bg-[var(--bg-primary)] py-1 text-left text-sm shadow-lg",
                                    memberMenuFlipUp
                                      ? "bottom-full mb-1 top-auto"
                                      : "top-full mt-1 bottom-auto",
                                  )}
                                  style={
                                    memberMenuTranslateX !== 0
                                      ? { transform: `translateX(${memberMenuTranslateX}px)` }
                                      : undefined
                                  }
                                  role="menu"
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  {canPromote ? (
                                    <li>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--bg-secondary)]"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRowMenuOpenId(null);
                                          setPromoteTarget(m);
                                        }}
                                      >
                                        <Shield className="size-4 shrink-0 opacity-80" aria-hidden />
                                        Promote to Admin
                                      </button>
                                    </li>
                                  ) : null}
                                  {canDemote ? (
                                    <li>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--bg-secondary)]"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRowMenuOpenId(null);
                                          setDemoteTarget(m);
                                        }}
                                      >
                                        <ShieldOff className="size-4 shrink-0 opacity-80" aria-hidden />
                                        Demote to Member
                                      </button>
                                    </li>
                                  ) : null}
                                  {canRemove ? (
                                    <li>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-500/10 dark:text-red-400"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRowMenuOpenId(null);
                                          setRemoveEmailConfirm("");
                                          setRemoveTarget(m);
                                        }}
                                      >
                                        <UserMinus className="size-4 shrink-0 opacity-80" aria-hidden />
                                        Remove from team
                                      </button>
                                    </li>
                                  ) : null}
                                  {canTransfer ? (
                                    <li>
                                      <a
                                        role="menuitem"
                                        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-[var(--bg-secondary)]"
                                        href={`mailto:hello@gethandover.uk?subject=${encodeURIComponent("Ownership Transfer Request")}&body=${encodeURIComponent(
                                          `I would like to transfer ownership of my Handover team to ${m.display_name}${m.email ? ` (${m.email})` : ""}.`,
                                        )}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRowMenuOpenId(null);
                                        }}
                                      >
                                        <RefreshCw className="size-4 shrink-0 opacity-80" aria-hidden />
                                        Transfer ownership
                                      </a>
                                    </li>
                                  ) : null}
                                </ul>
                              ) : null}
                            </div>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className={cn(cardShell, "p-6 sm:p-7")} style={elevateCardStyle}>
            <h2 className={sectionTitleClass()}>Invite member</h2>
            {memberInvitesAllowed ? (
              <>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  Invited users receive an email with a secure link (valid 7 days).
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label className="text-xs font-medium text-[var(--text-muted)]" htmlFor="team-invite-email">
                      Email
                    </label>
                    <Input
                      id="team-invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-muted)]" htmlFor="team-invite-role">
                      Role
                    </label>
                    <select
                      id="team-invite-role"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value === "admin" ? "admin" : "member")}
                      className="mt-1 flex h-9 w-full min-w-[140px] rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-2 text-sm text-[var(--text-primary)]"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <Button
                    type="button"
                    size="lg"
                    className="rounded-[var(--radius)] bg-[var(--accent)] font-semibold text-white shadow-md hover:bg-[var(--accent-hover)]"
                    disabled={sending || !inviteEmail.trim()}
                    onClick={() => void sendInvite()}
                  >
                    {sending ? "Sending…" : "Send invite"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-[var(--radius)] border border-amber-500/35 bg-amber-500/[0.07] p-4">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {TEAM_MEMBER_INVITES_BLOCKED_MESSAGE}
                </p>
                <Link
                  href="/pricing?tab=team"
                  className="mt-3 inline-flex text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
                >
                  View Team plan & upgrade →
                </Link>
              </div>
            )}

            {pendingInvites.length > 0 ? (
              <div className="mt-8">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Pending invites
                </h3>
                <ul className="mt-2 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
                  {pendingInvites.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <span className="text-[var(--text-primary)]">{inv.email ?? " - "}</span>
                      <span className="text-[var(--text-muted)] capitalize">{inv.role}</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        Expires {new Date(inv.expires_at).toLocaleDateString()}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => void revokeInvite(inv.id)}
                      >
                        Revoke
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
          </ScrollRevealItem>
        </div>
      ) : null}

      {tab === "settings" ? (
        <div key="settings" className="animate-in fade-in duration-200 space-y-8">
          <ScrollRevealItem index={0} className="block">
          <section className={cn(cardShell, "p-6 sm:p-7")} style={elevateCardStyle}>
            <h2 className={sectionTitleClass()}>Team name</h2>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className="text-xs font-medium text-[var(--text-muted)]" htmlFor="team-name-edit">
                  Name
                </label>
                <Input
                  id="team-name-edit"
                  value={teamNameDraft}
                  onChange={(e) => setTeamNameDraft(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                type="button"
                size="lg"
                className="rounded-[var(--radius)] bg-[var(--accent)] font-semibold text-white shadow-md hover:bg-[var(--accent-hover)]"
                disabled={savingName || !teamNameDraft.trim()}
                onClick={() => void saveTeamName()}
              >
                {savingName ? "Saving…" : "Save"}
              </Button>
            </div>
          </section>
          </ScrollRevealItem>

          <ScrollRevealItem index={1} className="block">
          <section className={cn(cardShell, "p-6 sm:p-7")} style={elevateCardStyle}>
            <h2 className={sectionTitleClass()}>HaloPSA connection</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              This connection is shared across your team. One connected account lets everyone use Halo
              imports according to their permissions.
            </p>
            <p className="mt-3 text-sm text-[var(--text-primary)]">
              Status:{" "}
              <strong>{haloConnected ? "At least one member is connected" : "No active connection"}</strong>
            </p>
            <Link
              href="/integrations/halopsa"
              className="mt-4 inline-flex text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline"
            >
              Manage in Integrations
            </Link>
          </section>
          </ScrollRevealItem>

          <ScrollRevealItem index={2} className="block">
          <section className={cn(cardShell, "border border-red-500/35 bg-red-500/[0.06] p-6 sm:p-7")}>
            <h2 className="border-l-4 border-red-500 pl-4 text-lg font-bold text-red-600 dark:text-red-400">
              Danger zone
            </h2>
            {viewerRole !== "owner" ? (
              <div className="mt-4">
                <p className="text-sm text-[var(--text-muted)]">
                  Leave this team and return to an individual account.
                </p>
                {confirmLeave ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmLeave(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-red-600 text-white hover:bg-red-700"
                      disabled={dangerBusy}
                      onClick={() => void leaveTeam()}
                    >
                      {dangerBusy ? "Leaving…" : "Confirm leave team"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 border-red-500/50 text-red-600 hover:bg-red-500/10"
                    onClick={() => setConfirmLeave(true)}
                  >
                    Leave team
                  </Button>
                )}
              </div>
            ) : null}
            {viewerRole === "owner" ? (
              <div className="mt-4">
                <p className="text-sm text-[var(--text-muted)]">
                  Permanently delete this team and remove all members. This cannot be undone.
                </p>
                {confirmDelete ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-red-600 text-white hover:bg-red-700"
                      disabled={dangerBusy}
                      onClick={() => void deleteTeam()}
                    >
                      {dangerBusy ? "Deleting…" : "Confirm delete team"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 border-red-500/50 text-red-600 hover:bg-red-500/10"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete team
                  </Button>
                )}
              </div>
            ) : null}
          </section>
          </ScrollRevealItem>
        </div>
      ) : null}

      <Dialog
        open={removeTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setRemoveTarget(null);
            setRemoveEmailConfirm("");
          }
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {removeTarget ? `Remove ${removeTarget.display_name} from the team?` : "Remove from team?"}
            </DialogTitle>
            <DialogDescription>
              They will lose access to Handover team features and revert to a free account. Type their email
              below to confirm.
            </DialogDescription>
          </DialogHeader>
          {!removeTarget?.email ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              This member has no email on file - contact support to remove them.
            </p>
          ) : (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--text-muted)]" htmlFor="remove-member-email-confirm">
              Member email
            </label>
            <Input
              id="remove-member-email-confirm"
              type="email"
              autoComplete="off"
              placeholder={removeTarget.email}
              value={removeEmailConfirm}
              onChange={(e) => setRemoveEmailConfirm(e.target.value)}
              className="mt-1"
            />
          </div>
          )}
          <DialogFooter className="border-0 bg-transparent p-0 pt-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRemoveTarget(null);
                setRemoveEmailConfirm("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={
                removeBusy ||
                !removeTarget?.email ||
                removeEmailConfirm.trim().toLowerCase() !==
                  (removeTarget.email ?? "").trim().toLowerCase()
              }
              onClick={() => void confirmRemoveMember()}
            >
              {removeBusy ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={promoteTarget !== null} onOpenChange={(o) => !o && setPromoteTarget(null)}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Promote to admin?</DialogTitle>
            <DialogDescription>
              {promoteTarget
                ? `Promote ${promoteTarget.display_name} to Admin? They will be able to invite members and manage permissions.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-0 bg-transparent p-0 pt-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setPromoteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
              disabled={roleActionBusy || !promoteTarget}
              onClick={() => {
                if (!promoteTarget) return;
                void patchMemberRole(promoteTarget.id, "admin", promoteTarget.role).then((ok) => {
                  if (ok) setPromoteTarget(null);
                });
              }}
            >
              Promote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={paidSeatInviteModalOpen}
        onOpenChange={(open) => {
          setPaidSeatInviteModalOpen(open);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add billable seat?</DialogTitle>
            <DialogDescription className="space-y-2 text-[var(--text-secondary)]">
              <p>
                {paidSeatBillingInterval === "year"
                  ? "Adding this member will add £192/year to your plan. We update your Stripe subscription and prorate the change."
                  : "Adding this member will add £20/mo to your plan. We update your Stripe subscription and prorate the change."}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Confirm to continue and send the invite.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-0 bg-transparent p-0 pt-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setPaidSeatInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
              disabled={sending}
              onClick={() => void sendInvite(true)}
            >
              {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Confirm and invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={teamBuyBillingModalOpen}
        onOpenChange={(open) => {
          setTeamBuyBillingModalOpen(open);
          if (!open) setTeamBuyBillingPeriod("monthly");
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add team seats</DialogTitle>
            <DialogDescription>
              Team includes up to 5 users. Each additional seat is £20/month or £192/year. Choose a billing rhythm,
              then continue to Stripe. Extra seats added from team management update your subscription automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2" role="radiogroup" aria-label="Billing period">
            <button
              type="button"
              role="radio"
              aria-checked={teamBuyBillingPeriod === "monthly"}
              onClick={() => setTeamBuyBillingPeriod("monthly")}
              className={cn(
                "rounded-[var(--radius-lg)] border p-3 text-left transition-colors",
                teamBuyBillingPeriod === "monthly"
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/30"
                  : "border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)]",
              )}
            >
              <p className="text-sm font-semibold text-[var(--text-primary)]">Monthly</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[var(--text-primary)]">
                £20<span className="text-sm font-normal text-[var(--text-secondary)]">/extra seat/month</span>
              </p>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={teamBuyBillingPeriod === "annual"}
              onClick={() => setTeamBuyBillingPeriod("annual")}
              className={cn(
                "rounded-[var(--radius-lg)] border p-3 text-left transition-colors",
                teamBuyBillingPeriod === "annual"
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/30"
                  : "border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)]",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Annual</p>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-200">
                  Save ~20% vs monthly
                </span>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums text-[var(--text-primary)]">
                £192<span className="text-sm font-normal text-[var(--text-secondary)]">/extra seat/year</span>
              </p>
            </button>
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 pt-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setTeamBuyBillingModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
              disabled={teamBuyStripeLoading || billingLoading}
              onClick={() => void continueTeamBuyToStripe()}
            >
              {teamBuyStripeLoading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                "Continue to Stripe"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={enterpriseSeatsModalOpen} onOpenChange={setEnterpriseSeatsModalOpen}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Enterprise plan for teams over 20 seats</DialogTitle>
          </DialogHeader>
          <EnterpriseSeatsUpgradeMessage className="text-sm" />
          <DialogFooter className="border-0 bg-transparent p-0 pt-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setEnterpriseSeatsModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={demoteTarget !== null} onOpenChange={(o) => !o && setDemoteTarget(null)}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Demote to member?</DialogTitle>
            <DialogDescription>
              {demoteTarget
                ? `Demote ${demoteTarget.display_name} to Member? They will lose admin privileges.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-0 bg-transparent p-0 pt-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setDemoteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
              disabled={roleActionBusy || !demoteTarget}
              onClick={() => {
                if (!demoteTarget) return;
                void patchMemberRole(demoteTarget.id, "member", demoteTarget.role).then((ok) => {
                  if (ok) setDemoteTarget(null);
                });
              }}
            >
              Demote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnimatedFillBar({
  targetPercent,
  barClassName,
}: {
  targetPercent: number;
  barClassName: string;
}) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setW(targetPercent);
      return;
    }
    setW(0);
    const id = requestAnimationFrame(() => setW(targetPercent));
    return () => cancelAnimationFrame(id);
  }, [targetPercent]);
  return (
    <div
      className={cn("h-full rounded-full transition-[width] duration-[600ms] ease-out", barClassName)}
      style={{ width: `${w}%` }}
    />
  );
}
