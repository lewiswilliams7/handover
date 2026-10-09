"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Building2,
  Calendar,
  ClipboardCheck,
  CreditCard,
  Gift,
  LayoutTemplate,
  LogOut,
  Moon,
  Menu,
  Palette,
  Pin,
  PinOff,
  PoundSterling,
  Rewind,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  Sun,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";

import { getPlanLabel, getPlanTierFromFields, getUserPlan, hasProTierAccess, isSoloGenerationBlockedByPlan, planFieldsFromProfileRow, profilePlanToUiTier, qbrPackUsageHintCopy } from "@/lib/plans";
import { FREE_MONTHLY_GENERATION_LIMIT, GROWTH_MONTHLY_GENERATION_LIMIT, STARTER_MONTHLY_GENERATION_LIMIT, STARTER_MONTHLY_REPORT_LIMIT } from "@/lib/plan-limits";
import { createClient } from "@/lib/supabase";
import { normalizeTeamDashboardPermission, type TeamDashboardPermission } from "@/lib/team-dashboard-permission";
import { getPsaConnectBundle, invalidatePsaConnectCache } from "@/lib/psa-connect-cache";

export const MAIN_VIEW_VALUES = [
  "overview",
  "generate",
  "reports",
  "delivery",
  "scheduled",
  "configuration",
  "organisation",
  "changelog",
  "client-intelligence",
  "approvals",
] as const;
export type MainView = (typeof MAIN_VIEW_VALUES)[number];

export type SettingsTab =
  | "profile"
  | "billing"
  | "preferences"
  | "appearance"
  | "referrals"
  | "privacy";

export type AppProfile = Record<string, unknown> & {
  plan?: string | null;
  team_id?: string | null;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  trial_plan?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  generation_limit_override?: number | null;
  onboarding_completed?: boolean | null;
  tour_completed?: boolean | null;
  brand_name?: string | null;
  brand_colour?: string | null;
  brand_secondary_colour?: string | null;
  brand_logo_url?: string | null;
  white_label_mode?: boolean;
  signature_override?: string | null;
  writing_style?: string | null;
  compact_mode?: boolean;
  show_character_count?: boolean;
  privacy_mode?: boolean;
  output_language?: string | null;
  output_preferences?: unknown;
  total_generations?: number;
  current_streak?: number;
  has_completed_loop?: boolean;
  slack_webhook_url?: string | null;
  slack_notifications_enabled?: boolean;
  teams_webhook_url?: string | null;
  teams_notifications_enabled?: boolean;
};

type ShellSettingsState = {
  open: boolean;
  tab: SettingsTab;
  setOpen: Dispatch<SetStateAction<boolean>>;
  setTab: Dispatch<SetStateAction<SettingsTab>>;
};

type SignOutHandler = () => void | Promise<void>;

export type AppShellContextValue = {
  authChecked: boolean;
  userEmail: string | null;
  authUserId: string | null;
  userCreatedAt: string | null;
  userFirstName: string | null;
  setUserFirstName: Dispatch<SetStateAction<string | null>>;
  profile: AppProfile | null;
  plan: "free" | "pro" | "team" | "enterprise" | null;
  profileDbPlan: string | null;
  trialEndsAt: string | null;
  profileTrialPlan: string | null;
  profileSubscriptionStatus: string | null;
  userTeamId: string | null;
  entitlement: {
    hasProAccess: boolean;
    soloGenerationLocked: boolean;
    isExpiredTrial: boolean;
    qbrUsageHint: string;
    billingTier: number;
    generationLimit: number | null;
    reportLimit: number | null;
    isPaidPlan: boolean;
    paymentPastDue: boolean;
  };
  usage: {
    monthCount: number | null;
    qbrMonthCount: number | null;
    generationLimitOverride: number | null;
    monthlyStats: { this_month: number; last_month: number } | null;
    monthlyStatsLoading: boolean;
    totalGenerationCount: number | null;
    generationStreak: number;
    setGenerationStreak: Dispatch<SetStateAction<number>>;
  };
  tourCompleted: boolean;
  setTourCompleted: Dispatch<SetStateAction<boolean>>;
  hasCompletedLoop: boolean;
  setHasCompletedLoop: Dispatch<SetStateAction<boolean>>;
  teamVisibility: {
    showTeamDashboardLink: boolean;
    teamMemberCount: number | null;
    teamMemberRole: string | null;
    dashboardPermission: TeamDashboardPermission;
    deliveryAccess: TeamDashboardPermission;
  };
  branding: {
    brandName: string;
    setBrandName: Dispatch<SetStateAction<string>>;
    brandColour: string;
    setBrandColour: Dispatch<SetStateAction<string>>;
    brandSecondaryColour: string;
    setBrandSecondaryColour: Dispatch<SetStateAction<string>>;
    brandLogoUrl: string;
    setBrandLogoUrl: Dispatch<SetStateAction<string>>;
    brandLogoPreviewKey: number;
    setBrandLogoPreviewKey: Dispatch<SetStateAction<number>>;
    whiteLabelMode: boolean;
    setWhiteLabelMode: Dispatch<SetStateAction<boolean>>;
    brandColourError: string;
    setBrandColourError: Dispatch<SetStateAction<string>>;
    brandSecondaryColourError: string;
    setBrandSecondaryColourError: Dispatch<SetStateAction<string>>;
  };
  profileForm: {
    profileFirstName: string;
    setProfileFirstName: Dispatch<SetStateAction<string>>;
    profileLastName: string;
    setProfileLastName: Dispatch<SetStateAction<string>>;
    profileDisplayName: string;
    setProfileDisplayName: Dispatch<SetStateAction<string>>;
    profileJobTitle: string;
    setProfileJobTitle: Dispatch<SetStateAction<string>>;
    profileCompanyName: string;
    setProfileCompanyName: Dispatch<SetStateAction<string>>;
    profileOutputLanguage: string;
    setProfileOutputLanguage: Dispatch<SetStateAction<string>>;
    signatureOverride: string;
    setSignatureOverride: Dispatch<SetStateAction<string>>;
    writingStyle: string;
    setWritingStyle: Dispatch<SetStateAction<string>>;
    compactMode: boolean;
    setCompactMode: Dispatch<SetStateAction<boolean>>;
    dashboardViewMode: "paginated" | "continuous";
    setDashboardViewMode: Dispatch<SetStateAction<"paginated" | "continuous">>;
    showCharacterCount: boolean;
    setShowCharacterCount: Dispatch<SetStateAction<boolean>>;
    privacyMode: boolean;
    setPrivacyMode: Dispatch<SetStateAction<boolean>>;
  };
  psa: {
    loading: boolean;
    haloConnected: boolean;
    setHaloConnected: Dispatch<SetStateAction<boolean>>;
    haloUrl: string;
    setHaloUrl: Dispatch<SetStateAction<string>>;
    haloClientIdMasked: string;
    setHaloClientIdMasked: Dispatch<SetStateAction<string>>;
    haloClientIdLength: number | null;
    setHaloClientIdLength: Dispatch<SetStateAction<number | null>>;
    haloUpdatedAt: string | null;
    setHaloUpdatedAt: Dispatch<SetStateAction<string | null>>;
    haloAutoClosureSummary: boolean;
    setHaloAutoClosureSummary: Dispatch<SetStateAction<boolean>>;
    haloReconnectRecommended: boolean;
    setHaloReconnectRecommended: Dispatch<SetStateAction<boolean>>;
    cwConnected: boolean;
    setCwConnected: Dispatch<SetStateAction<boolean>>;
    cwSiteUrl: string;
    setCwSiteUrl: Dispatch<SetStateAction<string>>;
    slackWebhookUrl: string;
    setSlackWebhookUrl: Dispatch<SetStateAction<string>>;
    slackNotificationsEnabled: boolean;
    setSlackNotificationsEnabled: Dispatch<SetStateAction<boolean>>;
    teamsWebhookUrl: string;
    setTeamsWebhookUrl: Dispatch<SetStateAction<string>>;
    teamsNotificationsEnabled: boolean;
    setTeamsNotificationsEnabled: Dispatch<SetStateAction<boolean>>;
  };
  onboarding: {
    profileLoaded: boolean;
    requiredExplicit: boolean;
    setRequiredExplicit: Dispatch<SetStateAction<boolean>>;
    overlayOpen: boolean;
    setOverlayOpen: Dispatch<SetStateAction<boolean>>;
  };
  sidebarPinned: boolean;
  setSidebarPinned: Dispatch<SetStateAction<boolean>>;
  sidebarHovered: boolean;
  setSidebarHovered: Dispatch<SetStateAction<boolean>>;
  sidebarOpenMobile: boolean;
  setSidebarOpenMobile: Dispatch<SetStateAction<boolean>>;
  theme: "light" | "dark";
  setTheme: Dispatch<SetStateAction<"light" | "dark">>;
  settings: ShellSettingsState;
  settingsBodyContainer: HTMLDivElement | null;
  setSettingsBodyContainer: (node: HTMLDivElement | null) => void;
  registerOnSignOut: (handler: SignOutHandler) => () => void;
  invokeOnSignOut: () => Promise<void>;
  signOutRegistered: boolean;
  refreshShellData: () => Promise<number | null>;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

const PROFILE_SELECT_FULL =
  "plan, team_id, stripe_customer_id, subscription_status, trial_ends_at, trial_plan, first_name, last_name, display_name, job_title, company_name, output_language, brand_name, brand_colour, brand_secondary_colour, brand_logo_url, white_label_mode, signature_override, custom_signoff, writing_style, privacy_mode, compact_mode, show_character_count, dashboard_view_mode, output_preferences, total_generations, current_streak, onboarding_completed, tour_completed, referred_by, slack_webhook_url, slack_notifications_enabled, teams_webhook_url, teams_notifications_enabled, has_completed_loop, last_generation_at, generation_limit_override";
const PROFILE_SELECT_FALLBACK =
  "plan, team_id, stripe_customer_id, subscription_status, trial_ends_at, trial_plan, first_name, last_name, job_title, company_name, output_language, brand_name, brand_colour, brand_secondary_colour, brand_logo_url, white_label_mode, signature_override, custom_signoff, writing_style, privacy_mode, compact_mode, show_character_count, output_preferences, total_generations, current_streak, onboarding_completed, tour_completed, referred_by, slack_webhook_url, slack_notifications_enabled, teams_webhook_url, teams_notifications_enabled, has_completed_loop, last_generation_at";

function normaliseHex(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim())
    ? value.trim().toUpperCase()
    : fallback;
}

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [userFirstName, setUserFirstName] = useState<string | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [plan, setPlan] = useState<"free" | "pro" | "team" | "enterprise" | null>(null);
  const [profileDbPlan, setProfileDbPlan] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [profileTrialPlan, setProfileTrialPlan] = useState<string | null>(null);
  const [profileSubscriptionStatus, setProfileSubscriptionStatus] = useState<string | null>(null);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [showTeamDashboardLink, setShowTeamDashboardLink] = useState(false);
  const [monthCount, setMonthCount] = useState<number | null>(null);
  const [qbrMonthCount, setQbrMonthCount] = useState<number | null>(null);
  const [generationLimitOverride, setGenerationLimitOverride] = useState<number | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<{ this_month: number; last_month: number } | null>(null);
  const [monthlyStatsLoading, setMonthlyStatsLoading] = useState(false);
  const [totalGenerationCount, setTotalGenerationCount] = useState<number | null>(null);
  const [generationStreak, setGenerationStreak] = useState(0);
  const [tourCompleted, setTourCompleted] = useState(false);
  const [hasCompletedLoop, setHasCompletedLoop] = useState(false);
  const [teamMemberCount, setTeamMemberCount] = useState<number | null>(null);
  const [teamMemberRole, setTeamMemberRole] = useState<string | null>(null);
  const [dashboardPermission, setDashboardPermission] = useState<TeamDashboardPermission>("full");

  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileJobTitle, setProfileJobTitle] = useState("");
  const [profileCompanyName, setProfileCompanyName] = useState("");
  const [profileOutputLanguage, setProfileOutputLanguage] = useState("English");
  const [signatureOverride, setSignatureOverride] = useState("");
  const [writingStyle, setWritingStyle] = useState("");
  const [compactMode, setCompactMode] = useState(false);
  const [dashboardViewMode, setDashboardViewMode] = useState<"paginated" | "continuous">("paginated");
  const [showCharacterCount, setShowCharacterCount] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [brandColour, setBrandColour] = useState("#2563EB");
  const [brandSecondaryColour, setBrandSecondaryColour] = useState("#1E40AF");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandLogoPreviewKey, setBrandLogoPreviewKey] = useState(0);
  const [whiteLabelMode, setWhiteLabelMode] = useState(false);
  const [brandColourError, setBrandColourError] = useState("");
  const [brandSecondaryColourError, setBrandSecondaryColourError] = useState("");
  const [haloConnected, setHaloConnected] = useState(false);
  const [haloUrl, setHaloUrl] = useState("");
  const [haloClientIdMasked, setHaloClientIdMasked] = useState("");
  const [haloClientIdLength, setHaloClientIdLength] = useState<number | null>(null);
  const [haloUpdatedAt, setHaloUpdatedAt] = useState<string | null>(null);
  const [haloAutoClosureSummary, setHaloAutoClosureSummary] = useState(false);
  const [haloReconnectRecommended, setHaloReconnectRecommended] = useState(false);
  const [cwConnected, setCwConnected] = useState(false);
  const [cwSiteUrl, setCwSiteUrl] = useState("");
  const [psaLoading, setPsaLoading] = useState(true);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [slackNotificationsEnabled, setSlackNotificationsEnabled] = useState(false);
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState("");
  const [teamsNotificationsEnabled, setTeamsNotificationsEnabled] = useState(false);

  const [onboardingProfileLoaded, setOnboardingProfileLoaded] = useState(false);
  const [onboardingRequiredExplicit, setOnboardingRequiredExplicit] = useState(false);
  const [onboardingOverlayOpen, setOnboardingOverlayOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("handover-sidebar-pinned") === "true";
    } catch {
      return false;
    }
  });
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem("handover-theme") === "light" ? "light" : "dark";
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("profile");
  const [settingsBodyContainer, setSettingsBodyContainerState] = useState<HTMLDivElement | null>(null);
  const setSettingsBodyContainer = useCallback((node: HTMLDivElement | null) => {
    setSettingsBodyContainerState(node);
  }, []);
  const signOutHandlerRef = useRef<SignOutHandler | null>(null);
  const [signOutRegistered, setSignOutRegistered] = useState(false);
  const registerOnSignOut = useCallback((handler: SignOutHandler) => {
    signOutHandlerRef.current = handler;
    setSignOutRegistered(true);
    return () => {
      if (signOutHandlerRef.current === handler) {
        signOutHandlerRef.current = null;
        setSignOutRegistered(false);
      }
    };
  }, []);
  const invokeOnSignOut = useCallback(async () => {
    await signOutHandlerRef.current?.();
  }, []);

  const refreshShellData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) console.warn("[AppShell] auth refresh failed:", authError.message);
    if (!user) {
      setAuthChecked(true);
      setUserEmail(null);
      setAuthUserId(null);
      setUserCreatedAt(null);
      setUserFirstName(null);
      setProfile(null);
      setPlan(null);
      setProfileDbPlan(null);
      setTrialEndsAt(null);
      setProfileTrialPlan(null);
      setProfileSubscriptionStatus(null);
      setUserTeamId(null);
      setShowTeamDashboardLink(false);
      setMonthCount(null);
      setQbrMonthCount(null);
      setGenerationLimitOverride(null);
      setMonthlyStats(null);
      setMonthlyStatsLoading(false);
      setTotalGenerationCount(null);
      setGenerationStreak(0);
      setTourCompleted(false);
      setHasCompletedLoop(false);
      setOnboardingProfileLoaded(true);
      setOnboardingRequiredExplicit(false);
      setOnboardingOverlayOpen(false);
      setHaloConnected(false);
      setHaloUrl("");
      setHaloClientIdMasked("");
      setHaloClientIdLength(null);
      setHaloUpdatedAt(null);
      setHaloAutoClosureSummary(false);
      setHaloReconnectRecommended(false);
      setCwConnected(false);
      setCwSiteUrl("");
      setPsaLoading(false);
      setProfileFirstName("");
      setProfileLastName("");
      setProfileDisplayName("");
      setProfileJobTitle("");
      setProfileCompanyName("");
      setProfileOutputLanguage("English");
      setSignatureOverride("");
      setWritingStyle("");
      setCompactMode(false);
      setDashboardViewMode("paginated");
      setShowCharacterCount(true);
      setPrivacyMode(false);
      setBrandName("");
      setBrandColour("#2563EB");
      setBrandSecondaryColour("#1E40AF");
      setBrandLogoUrl("");
      setWhiteLabelMode(false);
      setSlackWebhookUrl("");
      setSlackNotificationsEnabled(false);
      setTeamsWebhookUrl("");
      setTeamsNotificationsEnabled(false);
      return null;
    }

    setAuthChecked(true);
    setUserEmail(user.email ?? null);
    setAuthUserId(user.id);
    setUserCreatedAt(typeof user.created_at === "string" ? user.created_at : null);
    let profileRes = await supabase.from("profiles").select(PROFILE_SELECT_FULL).eq("id", user.id).maybeSingle();
    if (profileRes.error) {
      profileRes = await supabase.from("profiles").select(PROFILE_SELECT_FALLBACK).eq("id", user.id).maybeSingle();
    }
    const row = (profileRes.data ?? null) as AppProfile | null;
    setProfile(row);
    setOnboardingRequiredExplicit(row?.onboarding_completed === false);
    setOnboardingProfileLoaded(true);
    setTourCompleted(row?.tour_completed === true);
    setHasCompletedLoop(row?.has_completed_loop === true);

    const canonical = await getUserPlan(supabase, user.id);
    const teamId = typeof canonical.team_id === "string" && canonical.team_id.trim() ? canonical.team_id.trim() : null;
    setUserTeamId(teamId);
    setProfileDbPlan(typeof canonical.plan === "string" ? canonical.plan : null);
    setTrialEndsAt(typeof canonical.trial_ends_at === "string" ? canonical.trial_ends_at : null);
    setProfileTrialPlan(typeof canonical.trial_plan === "string" ? canonical.trial_plan : null);
    setProfileSubscriptionStatus(typeof canonical.subscription_status === "string" ? canonical.subscription_status : null);
    setPlan(profilePlanToUiTier(canonical));
    setUserFirstName(typeof row?.first_name === "string" ? row.first_name : null);
    setGenerationLimitOverride(typeof row?.generation_limit_override === "number" ? row.generation_limit_override : null);
    setProfileFirstName(typeof row?.first_name === "string" ? row.first_name : "");
    setProfileLastName(typeof row?.last_name === "string" ? row.last_name : "");
    setProfileDisplayName(typeof row?.display_name === "string" ? row.display_name : "");
    setProfileJobTitle(typeof row?.job_title === "string" ? row.job_title : "");
    setProfileCompanyName(typeof row?.company_name === "string" ? row.company_name : "");
    setProfileOutputLanguage(typeof row?.output_language === "string" && row.output_language.trim() ? row.output_language : "English");
    setBrandName((typeof row?.brand_name === "string" && row.brand_name.trim()) || (typeof row?.company_name === "string" ? row.company_name : ""));
    setBrandColour(normaliseHex(row?.brand_colour, "#2563EB"));
    setBrandSecondaryColour(normaliseHex(row?.brand_secondary_colour, "#1E40AF"));
    setBrandLogoUrl(typeof row?.brand_logo_url === "string" ? row.brand_logo_url.trim() : "");
    setWhiteLabelMode(row?.white_label_mode === true);
    setSlackWebhookUrl(
      typeof row?.slack_webhook_url === "string" ? row.slack_webhook_url : "",
    );
    setSlackNotificationsEnabled(row?.slack_notifications_enabled === true);
    setTeamsWebhookUrl(
      typeof row?.teams_webhook_url === "string" ? row.teams_webhook_url : "",
    );
    setTeamsNotificationsEnabled(row?.teams_notifications_enabled === true);
    setSignatureOverride(typeof row?.signature_override === "string" ? row.signature_override : "");
    setWritingStyle(typeof row?.writing_style === "string" ? row.writing_style : "");
    setCompactMode(row?.compact_mode === true);
    setDashboardViewMode(row?.dashboard_view_mode === "continuous" ? "continuous" : "paginated");
    setShowCharacterCount(row?.show_character_count !== false);
    setPrivacyMode(row?.privacy_mode === true);
    setGenerationStreak(typeof row?.current_streak === "number" && row.current_streak >= 0 ? row.current_streak : 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    const [monthRes, totalRes, qbrRes, statsRes] = await Promise.all([
      supabase.from("generations").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", new Date(Date.UTC(monthStart.getFullYear(), monthStart.getMonth(), 1)).toISOString()),
      supabase.from("generations").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("generations").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("report_type", ["qbr", "report"]).gte("created_at", new Date(Date.UTC(monthStart.getFullYear(), monthStart.getMonth(), 1)).toISOString()),
      fetch("/api/stats/monthly", { credentials: "same-origin", cache: "no-store" }),
    ]);
    setMonthCount(monthRes.count ?? 0);
    setQbrMonthCount(qbrRes.count ?? 0);
    const profileTotal = typeof row?.total_generations === "number" ? row.total_generations : 0;
    setTotalGenerationCount(Math.max(profileTotal, totalRes.count ?? 0));
    if (statsRes.ok) {
      const stats = (await statsRes.json()) as { this_month?: unknown; last_month?: unknown };
      setMonthlyStats({
        this_month: typeof stats.this_month === "number" ? stats.this_month : 0,
        last_month: typeof stats.last_month === "number" ? stats.last_month : 0,
      });
    }
    setMonthlyStatsLoading(false);

    try {
      const teamRes = await fetch("/api/user/team-sidebar", { credentials: "same-origin", cache: "no-store" });
      setShowTeamDashboardLink(((await teamRes.json()) as { showTeamSidebarLink?: boolean }).showTeamSidebarLink === true);
    } catch {
      setShowTeamDashboardLink(false);
    }
    if (profilePlanToUiTier(canonical) === "team" && teamId) {
      const [countRes, memberRes] = await Promise.all([
        supabase.from("team_members").select("*", { count: "exact", head: true }).eq("team_id", teamId),
        supabase.from("team_members").select("role, dashboard_permission").eq("team_id", teamId).eq("user_id", user.id).maybeSingle(),
      ]);
      setTeamMemberCount(countRes.count ?? 0);
      const role = typeof memberRes.data?.role === "string" ? memberRes.data.role : null;
      setTeamMemberRole(role);
      setDashboardPermission(role === "member" ? normalizeTeamDashboardPermission(memberRes.data?.dashboard_permission) : "full");
    } else {
      setTeamMemberCount(null);
      setTeamMemberRole(null);
      setDashboardPermission("full");
    }

    try {
      setPsaLoading(true);
      invalidatePsaConnectCache();
      const bundle = await getPsaConnectBundle();
      setHaloConnected(bundle.halo.json.connected === true && !bundle.halo.json.reconnectRecommended && !bundle.halo.json.connectionCheckFailed);
      setHaloUrl(typeof bundle.halo.json.haloUrl === "string" ? bundle.halo.json.haloUrl : "");
      setHaloClientIdMasked(typeof bundle.halo.json.clientIdMasked === "string" ? bundle.halo.json.clientIdMasked : "");
      setHaloClientIdLength(typeof bundle.halo.json.clientIdLength === "number" ? bundle.halo.json.clientIdLength : null);
      setHaloUpdatedAt(typeof bundle.halo.json.updatedAt === "string" ? bundle.halo.json.updatedAt : null);
      setHaloAutoClosureSummary(bundle.halo.json.autoClosureSummaryEnabled === true);
      setHaloReconnectRecommended(
        bundle.halo.json.reconnectRecommended === true || bundle.halo.json.connectionCheckFailed === true,
      );
      setCwConnected(bundle.cw.json.connected === true);
      setCwSiteUrl(typeof bundle.cw.json.siteUrl === "string" ? bundle.cw.json.siteUrl : "");
    } catch {
      setHaloConnected(false);
      setHaloUrl("");
      setHaloClientIdMasked("");
      setHaloClientIdLength(null);
      setHaloUpdatedAt(null);
      setHaloAutoClosureSummary(false);
      setHaloReconnectRecommended(true);
      setCwConnected(false);
      setCwSiteUrl("");
    } finally {
      setPsaLoading(false);
    }
    return Math.max(profileTotal, totalRes.count ?? 0);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (authChecked && userEmail) {
      document.body.setAttribute("data-app-shell", "true");
    } else {
      document.body.removeAttribute("data-app-shell");
    }
    return () => document.body.removeAttribute("data-app-shell");
  }, [authChecked, userEmail]);

  useEffect(() => {
    void refreshShellData();
    const supabase = createClient();
    const { data: listener } = supabase.auth.onAuthStateChange(() => void refreshShellData());
    const onReload = () => void refreshShellData();
    window.addEventListener("handover:profile-reload", onReload);
    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("handover:profile-reload", onReload);
    };
  }, [refreshShellData]);

  const planFields = useMemo(() => planFieldsFromProfileRow({
    plan: profileDbPlan,
    team_id: userTeamId,
    trial_ends_at: trialEndsAt,
    trial_plan: profileTrialPlan,
    subscription_status: profileSubscriptionStatus,
  }), [profileDbPlan, userTeamId, trialEndsAt, profileTrialPlan, profileSubscriptionStatus]);
  const billingTier = getPlanTierFromFields(planFields);
  const hasProAccess = hasProTierAccess(planFields);
  const entitlement = useMemo(() => ({
    hasProAccess,
    soloGenerationLocked: isSoloGenerationBlockedByPlan(planFields),
    isExpiredTrial: Boolean(trialEndsAt && new Date(trialEndsAt) <= new Date()),
    qbrUsageHint: qbrPackUsageHintCopy(planFields, null) ?? "",
    billingTier,
    generationLimit: generationLimitOverride != null ? generationLimitOverride : billingTier >= 3 ? null : billingTier >= 2 ? GROWTH_MONTHLY_GENERATION_LIMIT : billingTier >= 1 ? STARTER_MONTHLY_GENERATION_LIMIT : FREE_MONTHLY_GENERATION_LIMIT,
    reportLimit: billingTier >= 2 ? null : billingTier >= 1 ? STARTER_MONTHLY_REPORT_LIMIT : 0,
    isPaidPlan: ["professional", "handover", "starter_programme", "team", "enterprise"].includes((profileDbPlan ?? "").toLowerCase()),
    paymentPastDue: profileSubscriptionStatus?.trim().toLowerCase() === "past_due",
  }), [billingTier, generationLimitOverride, hasProAccess, planFields, profileDbPlan, profileSubscriptionStatus, trialEndsAt]);
  const deliveryAccess: TeamDashboardPermission = !hasProAccess || !userTeamId || teamMemberRole === "owner" || teamMemberRole === "admin" || !teamMemberRole ? "full" : dashboardPermission;

  const value: AppShellContextValue = {
    authChecked, userEmail, authUserId, userCreatedAt, userFirstName, setUserFirstName,
    profile, plan, profileDbPlan, trialEndsAt, profileTrialPlan, profileSubscriptionStatus, userTeamId,
    entitlement,
    usage: { monthCount, qbrMonthCount, generationLimitOverride, monthlyStats, monthlyStatsLoading, totalGenerationCount, generationStreak, setGenerationStreak },
    tourCompleted, setTourCompleted, hasCompletedLoop, setHasCompletedLoop,
    teamVisibility: { showTeamDashboardLink, teamMemberCount, teamMemberRole, dashboardPermission, deliveryAccess },
    branding: { brandName, setBrandName, brandColour, setBrandColour, brandSecondaryColour, setBrandSecondaryColour, brandLogoUrl, setBrandLogoUrl, brandLogoPreviewKey, setBrandLogoPreviewKey, whiteLabelMode, setWhiteLabelMode, brandColourError, setBrandColourError, brandSecondaryColourError, setBrandSecondaryColourError },
    profileForm: { profileFirstName, setProfileFirstName, profileLastName, setProfileLastName, profileDisplayName, setProfileDisplayName, profileJobTitle, setProfileJobTitle, profileCompanyName, setProfileCompanyName, profileOutputLanguage, setProfileOutputLanguage, signatureOverride, setSignatureOverride, writingStyle, setWritingStyle, compactMode, setCompactMode, dashboardViewMode, setDashboardViewMode, showCharacterCount, setShowCharacterCount, privacyMode, setPrivacyMode },
    psa: { loading: psaLoading, haloConnected, setHaloConnected, haloUrl, setHaloUrl, haloClientIdMasked, setHaloClientIdMasked, haloClientIdLength, setHaloClientIdLength, haloUpdatedAt, setHaloUpdatedAt, haloAutoClosureSummary, setHaloAutoClosureSummary, haloReconnectRecommended, setHaloReconnectRecommended, cwConnected, setCwConnected, cwSiteUrl, setCwSiteUrl, slackWebhookUrl, setSlackWebhookUrl, slackNotificationsEnabled, setSlackNotificationsEnabled, teamsWebhookUrl, setTeamsWebhookUrl, teamsNotificationsEnabled, setTeamsNotificationsEnabled },
    onboarding: { profileLoaded: onboardingProfileLoaded, requiredExplicit: onboardingRequiredExplicit, setRequiredExplicit: setOnboardingRequiredExplicit, overlayOpen: onboardingOverlayOpen, setOverlayOpen: setOnboardingOverlayOpen },
    sidebarPinned, setSidebarPinned, sidebarHovered, setSidebarHovered, sidebarOpenMobile, setSidebarOpenMobile, theme, setTheme,
    settings: { open: settingsOpen, tab: settingsTab, setOpen: setSettingsOpen, setTab: setSettingsTab },
    settingsBodyContainer, setSettingsBodyContainer, registerOnSignOut, invokeOnSignOut, signOutRegistered, refreshShellData,
  };

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell(): AppShellContextValue {
  const value = useContext(AppShellContext);
  if (!value) throw new Error("useAppShell must be used inside AppShellProvider");
  return value;
}

const titles: Record<string, string> = {
  overview: "Overview",
  generate: "Quick update",
  reports: "Reports",
  delivery: "Delivery Health",
  scheduled: "Scheduled",
  configuration: "Configuration",
  organisation: "Client portal",
  changelog: "What's new",
  "client-intelligence": "Clients",
  approvals: "Approvals",
};

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-full">{children}</div>}>
      <AppShellContent>{children}</AppShellContent>
    </Suspense>
  );
}

function AppShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const {
    authChecked, userEmail, userFirstName, profileDbPlan, userTeamId, trialEndsAt, profileTrialPlan, entitlement, usage, teamVisibility, branding,
    sidebarPinned, setSidebarPinned, sidebarHovered, setSidebarHovered, sidebarOpenMobile, setSidebarOpenMobile,
    theme, setTheme, settings, settingsBodyContainer, setSettingsBodyContainer, invokeOnSignOut, signOutRegistered,
  } = useAppShell();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [activeView, setActiveView] = useState<MainView>(() => {
    if (typeof window === "undefined") return "overview";
    const value = new URLSearchParams(window.location.search).get("view");
    return value && MAIN_VIEW_VALUES.includes(value as MainView)
      ? (value as MainView)
      : "overview";
  });
  const readActiveView = useCallback(() => {
    const value = new URLSearchParams(window.location.search).get("view");
    setActiveView(
      value && MAIN_VIEW_VALUES.includes(value as MainView)
        ? (value as MainView)
        : "overview",
    );
  }, []);
  useEffect(() => {
    // Sync the initial URL into the shell's local navigation state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    readActiveView();
    window.addEventListener("popstate", readActiveView);
    window.addEventListener("handover:view-change", readActiveView);
    return () => {
      window.removeEventListener("popstate", readActiveView);
      window.removeEventListener("handover:view-change", readActiveView);
    };
  }, [params, pathname, readActiveView]);
  const expanded = sidebarPinned || sidebarHovered;
  const offset = expanded ? "var(--app-sidebar-expanded-width)" : "var(--app-sidebar-compact-width)";
  const togglePin = useCallback(() => setSidebarPinned((current) => {
    const next = !current;
    try { window.localStorage.setItem("handover-sidebar-pinned", next ? "true" : "false"); } catch { /* ignore */ }
    return next;
  }), [setSidebarPinned]);
  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      window.localStorage.setItem("handover-theme", next);
      return next;
    });
  }, [setTheme]);
  const navClass = (view: MainView) => [
    "relative flex h-8 w-full items-center rounded-[var(--radius)] border-l-2 text-[12px] transition-all duration-[120ms]",
    expanded ? "gap-1.5 px-2.5" : "justify-center px-0",
    activeView === view && !settings.open
      ? "border-[var(--accent)] bg-[var(--accent)]/15 font-medium text-white"
      : "border-transparent text-[var(--text-secondary)] hover:bg-white/5 hover:text-white",
  ].join(" ");
  const labelClass = `overflow-hidden whitespace-nowrap transition-opacity duration-150 ${expanded ? "md:w-auto md:opacity-100" : "md:w-0 md:opacity-0"}`;
  const showSidebar = Boolean(userEmail);
  const attentionTab = pathname === "/attention" ? params.get("tab") : null;
  const pageTitle =
    settings.open
      ? "Settings"
      : pathname === "/attention"
        ? attentionTab === "replay"
          ? "Churn Replay"
          : attentionTab === "history"
            ? "History"
            : "Revenue at Risk"
        : titles[activeView] ?? "Handover";
  const attentionNavClass = (tab: "risk" | "replay") => {
    const onTab =
      pathname === "/attention" &&
      (tab === "replay" ? attentionTab === "replay" : attentionTab !== "replay");
    return [
      "relative flex h-8 w-full items-center rounded-[var(--radius)] border-l-2 text-[12px] transition-all duration-[120ms]",
      expanded ? "gap-1.5 px-2.5" : "justify-center px-0",
      onTab && !settings.open
        ? "border-[var(--accent)] bg-[var(--accent)]/15 font-medium text-white"
        : "border-transparent text-[var(--text-secondary)] hover:bg-white/5 hover:text-white",
    ].join(" ");
  };
  const sectionLabelClass = `mt-4 mb-1 px-3 text-[9.5px] font-medium uppercase tracking-[0.16em] text-white/30 ${!expanded ? "md:hidden" : ""}`;
  const contentOffsetClass =
    pathname === "/"
      ? ""
      : entitlement.paymentPastDue
        ? "pt-[var(--app-content-top-mobile-past-due)] md:pt-[var(--app-content-top-desktop-past-due)]"
        : "pt-[var(--app-content-top-mobile)] md:pt-[var(--app-content-top-desktop)]";
  const planLabel = getPlanLabel(profileDbPlan ?? "free", userTeamId, {
    trial_ends_at: trialEndsAt,
    trial_plan: profileTrialPlan,
  });
  const closeMobile = () => setSidebarOpenMobile(false);
  useEffect(() => {
    if (!settings.open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") settings.setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settings]);

  return (
    <>
      {showSidebar && sidebarOpenMobile ? <button type="button" className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={closeMobile} aria-label="Close sidebar overlay" /> : null}
      {showSidebar ? (
        <aside id="app-sidebar-nav" className={`group fixed left-0 top-0 z-40 flex h-[100dvh] min-h-0 flex-col border-r border-[var(--sidebar-border)] bg-gradient-to-b from-[#1a2540] to-[#141d32] text-[14px] transition-all duration-150 md:h-screen ${expanded ? "md:w-[var(--app-sidebar-expanded-width)]" : "md:w-[var(--app-sidebar-compact-width)]"} ${sidebarOpenMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`} onMouseEnter={() => setSidebarHovered(true)} onMouseLeave={() => setSidebarHovered(false)}>
          <button type="button" onClick={togglePin} className={`absolute right-3 top-3 z-10 hidden text-[var(--text-secondary)] md:block ${sidebarPinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} aria-label={sidebarPinned ? "Unpin sidebar" : "Pin sidebar"}>{sidebarPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}</button>
          <div className={`flex shrink-0 items-center border-b border-[var(--sidebar-border)] py-4 ${expanded ? "px-4" : "px-2"}`}>
            <Link href="/" className="inline-flex min-w-0 flex-1 items-center gap-2 no-underline">
              {branding.whiteLabelMode && branding.brandLogoUrl.trim() ? <img src={branding.brandLogoUrl.trim()} alt="" className="block max-h-8 w-auto shrink-0 object-contain" /> : <img src="/icon2.png" alt="" className="block size-7 shrink-0 object-contain" />}
              <span className={`truncate font-bold text-[16px] text-white ${labelClass}`}>{branding.whiteLabelMode && branding.brandName.trim() ? branding.brandName.trim() : "Handover"}</span>
            </Link>
            <button type="button" className="text-[var(--sidebar-text)] md:hidden" onClick={closeMobile} aria-label="Close sidebar"><X className="size-4" /></button>
          </div>
          <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 md:overscroll-auto">
            <nav className="mb-4 flex flex-col gap-2" aria-label="Main navigation">
              <div className="space-y-0.5">
                <div className={sectionLabelClass.replace("mt-4 ", "mt-1 ")}>Protect</div>
                <Link href="/attention" data-tour="nav-revenue-at-risk" onClick={closeMobile} className={attentionNavClass("risk")} title="Revenue at Risk"><PoundSterling className="size-[14px]" /><span className={labelClass}>Revenue at Risk</span></Link>
                <Link href="/attention?tab=replay" data-tour="nav-churn-replay" onClick={closeMobile} className={attentionNavClass("replay")} title="Churn Replay"><Rewind className="size-[14px]" /><span className={labelClass}>Churn Replay</span></Link>
                <Link href="/?view=client-intelligence" data-tour="nav-client-intelligence" onClick={closeMobile} className={navClass("client-intelligence")} title="Clients"><Users className="size-[14px]" /><span className={labelClass}>Clients</span></Link>
                {entitlement.hasProAccess && teamVisibility.deliveryAccess !== "none" ? <Link href="/?view=delivery" onClick={closeMobile} className={navClass("delivery")} title="Delivery health"><BarChart3 className="size-[14px]" /><span className={labelClass}>Delivery health</span></Link> : null}
              </div>
              <div className="space-y-0.5">
                <div className={sectionLabelClass}>Prove</div>
                <Link href="/?view=reports" onClick={closeMobile} className={navClass("reports")} title="Reports"><LayoutTemplate className="size-[14px]" /><span className={labelClass}>Reports</span></Link>
                <Link href="/?view=scheduled" data-tour="nav-scheduled" onClick={closeMobile} className={navClass("scheduled")} title="Scheduled"><Calendar className="size-[14px]" /><span className={labelClass}>Scheduled</span></Link>
                <Link href="/?view=approvals" onClick={closeMobile} className={navClass("approvals")} title="Approvals"><ClipboardCheck className="size-[14px]" /><span className={labelClass}>Approvals</span></Link>
                {entitlement.hasProAccess ? <Link href="/?view=organisation" onClick={closeMobile} className={navClass("organisation")} title="Client portal"><Building2 className="size-[14px]" /><span className={labelClass}>Client portal</span></Link> : null}
                <Link href="/?view=generate" onClick={closeMobile} className={navClass("generate")} title="Quick update"><Zap className="size-[14px]" /><span className={labelClass}>Quick update</span></Link>
              </div>
              <div><div className={sectionLabelClass}>Settings</div>
                <Link href="/?view=configuration" onClick={closeMobile} className={navClass("configuration")}><Settings className="size-[14px]" /><span className={labelClass}>Configuration</span></Link>
              </div>
            </nav>
            {!entitlement.hasProAccess && usage.monthCount != null ? <div className={`mb-3 rounded-[var(--radius)] border border-[var(--sidebar-border)] bg-white/[0.04] px-2.5 py-2 ${!expanded ? "md:hidden" : ""}`}><div className="flex justify-between text-[10px] uppercase text-white/40"><span>Basic plan</span><span>{usage.monthCount}/{entitlement.generationLimit ?? FREE_MONTHLY_GENERATION_LIMIT}</span></div><p className="mt-0.5 text-[11px] text-[var(--sidebar-text)]">Generations used</p></div> : null}
          </div>
          <div className="shrink-0 border-t border-white/[0.08] p-2.5">
            <Link href="/?view=changelog" onClick={closeMobile} className={navClass("changelog")}><Sparkles className="size-3.5" /><span className={labelClass}>What&apos;s new</span></Link>
            <button type="button" className="mt-2 flex w-full items-center gap-2 rounded-[var(--radius)] p-2.5 hover:bg-white/[0.06]" onClick={() => settings.setOpen(true)}><div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-semibold text-white">{userFirstName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || "U"}</div><span className={`min-w-0 flex-1 truncate text-left text-[12px] text-white ${labelClass}`}><span className="block">{userFirstName || userEmail || "Account"}</span><span className="text-[9px] text-[var(--accent)]">{planLabel}</span></span><Settings className="size-[14px] shrink-0 text-white/30" /></button>
            {!entitlement.hasProAccess ? <Link href="/pricing?upgrade=true" onClick={closeMobile} className={`mb-2 flex w-full items-center justify-center rounded-[var(--radius)] border border-[var(--accent)] px-3 py-2 text-[12px] text-[var(--accent)] ${!expanded ? "md:hidden" : ""}`}>Upgrade plan</Link> : null}
            <a href="https://handover.canny.io" target="_blank" rel="noreferrer" className={`text-[11px] text-white/30 hover:text-white/60 ${!expanded ? "md:hidden" : ""}`}>Suggest a feature →</a>
          </div>
        </aside>
      ) : null}
      {showSidebar && authChecked ? <div className="fixed top-0 z-30 flex h-[var(--app-header-height)] items-center justify-between px-4 max-md:!left-0" style={{ left: offset, right: 0, background: "radial-gradient(ellipse at top right, rgba(14,165,233,0.04) 0%, transparent 60%), var(--bg-primary)" }}><div className="flex min-w-0 items-center gap-2"><button type="button" className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius)] text-[var(--text-secondary)] hover:bg-white/[0.06] md:hidden" onClick={() => setSidebarOpenMobile(true)} aria-label="Open sidebar"><Menu className="size-[18px]" /></button><span className="truncate text-[14px] font-medium text-white">{pageTitle}</span></div><div className="flex items-center"><button type="button" onClick={toggleTheme} className="flex size-7 items-center justify-center text-[var(--text-secondary)]" aria-label="Toggle theme">{theme === "dark" ? <Sun className="size-[14px]" /> : <Moon className="size-[14px]" />}</button><button type="button" className="ml-1 flex size-7 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] text-white" onClick={() => settings.setOpen(true)} aria-label="Open settings">{userFirstName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || "U"}</button><button type="button" className="ml-1 flex size-7 items-center justify-center text-[var(--text-secondary)]" onClick={() => settings.setOpen(true)} aria-label="Open settings"><Settings className="size-[14px]" /></button></div></div> : null}
      {authChecked && entitlement.paymentPastDue ? <div className="fixed top-[var(--app-header-height)] right-0 z-20 flex min-h-[var(--app-past-due-banner-height)] items-center justify-between gap-3 border-b border-amber-300/35 bg-amber-950/95 px-4 py-2 text-amber-50 max-md:!left-0" style={{ left: offset }} role="status"><p className="text-[12px]">Your latest payment needs attention. Update your payment method to keep your Handover access active.</p><Link href="/api/stripe/portal" className="shrink-0 rounded border border-amber-200/40 px-3 py-1.5 text-[12px] font-semibold">Update payment</Link></div> : null}
      <div className={`${showSidebar ? (expanded ? "md:ml-[var(--app-sidebar-expanded-width)]" : "md:ml-[var(--app-sidebar-compact-width)]") : ""} ${contentOffsetClass}`}>{children}</div>
      {settings.open ? <div className="fixed inset-0 z-50 bg-[var(--bg-primary)]"><div role="dialog" aria-modal="true" className="flex h-[100dvh] w-full overflow-hidden md:h-screen"><div className="flex h-full w-[var(--app-settings-rail-width)] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)]"><div className="flex h-[var(--app-settings-header-height)] items-center gap-3 border-b border-[var(--border)] px-4"><button type="button" onClick={() => { settings.setOpen(false); setConfirmSignOut(false); }} aria-label="Close settings"><X className="size-4" /></button><span className="text-[13px] font-semibold">Settings</span></div><nav className="flex-1 p-2">{(["profile", "billing", "referrals", "preferences", "appearance", "privacy"] as SettingsTab[]).map((tab) => <button key={tab} type="button" onClick={() => settings.setTab(tab)} className={`flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-[13px] ${settings.tab === tab ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--text-secondary)] hover:bg-white/[0.06]"}`}>{tab === "profile" ? <Users className="size-[14px]" /> : tab === "billing" ? <CreditCard className="size-[14px]" /> : tab === "referrals" ? <Gift className="size-[14px]" /> : tab === "appearance" ? <Palette className="size-[14px]" /> : tab === "privacy" ? <Shield className="size-[14px]" /> : <Sliders className="size-[14px]" />}<span className="capitalize">{tab === "preferences" ? "Outputs & Style" : tab}</span></button>)}</nav><div className="border-t border-[var(--border)] p-2">{!confirmSignOut ? <button type="button" disabled={!userEmail || !signOutRegistered} onClick={() => setConfirmSignOut(true)} className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-[13px] text-[var(--text-secondary)]"><LogOut className="size-[14px]" />Sign out</button> : <div className="space-y-2 p-2 text-sm text-[var(--danger)]">Are you sure?<div className="flex gap-2"><button type="button" disabled={!signOutRegistered} onClick={() => void invokeOnSignOut()} className="rounded bg-[var(--danger)] px-3 py-1 text-white disabled:opacity-50">Yes</button><button type="button" onClick={() => setConfirmSignOut(false)} className="rounded border px-3 py-1">No</button></div></div>}</div></div><div className="flex min-w-0 flex-1 flex-col overflow-hidden"><div className="flex h-[var(--app-settings-header-height)] items-center border-b border-[var(--border)] px-6"><h2 className="text-[15px] font-semibold">{settings.tab === "preferences" ? "Outputs & Style" : settings.tab[0].toUpperCase() + settings.tab.slice(1)}</h2></div><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain md:overscroll-auto"><div ref={setSettingsBodyContainer} className="mx-auto max-w-2xl px-6 py-8">{!settingsBodyContainer ? <AppShellSettingsFallback /> : null}</div></div></div></div></div> : null}
      {!settings.open && settingsBodyContainer ? null : null}
    </>
  );
}

export function SettingsBodyPortal({ children }: { children: ReactNode }) {
  const { settingsBodyContainer } = useAppShell();
  return settingsBodyContainer ? createPortal(children, settingsBodyContainer) : null;
}

function AppShellSettingsFallback() {
  const {
    authChecked,
    userEmail,
    profile,
    settings,
    profileForm,
    refreshShellData,
  } = useAppShell();
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const {
    profileFirstName,
    setProfileFirstName,
    profileLastName,
    setProfileLastName,
    profileDisplayName,
    setProfileDisplayName,
    profileJobTitle,
    setProfileJobTitle,
    profileCompanyName,
    setProfileCompanyName,
    profileOutputLanguage,
    setProfileOutputLanguage,
    signatureOverride,
    setSignatureOverride,
    writingStyle,
    setWritingStyle,
    compactMode,
    setCompactMode,
    showCharacterCount,
    setShowCharacterCount,
    privacyMode,
    setPrivacyMode,
  } = profileForm;

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/profile/update", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: profileFirstName.trim() || null,
          last_name: profileLastName.trim() || null,
          display_name: profileDisplayName.trim() || null,
          job_title: profileJobTitle.trim() || null,
          company_name: profileCompanyName.trim() || null,
          output_language: profileOutputLanguage.trim() || "English",
          signature_override: signatureOverride.trim() || null,
          writing_style: writingStyle.trim() || null,
          compact_mode: compactMode,
          show_character_count: showCharacterCount,
          privacy_mode: privacyMode,
        }),
      });
      if (!response.ok) throw new Error("Could not save settings.");
      await refreshShellData();
      setFeedback("Settings saved.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) {
    return <p className="text-sm text-[var(--text-secondary)]">Loading your settings…</p>;
  }

  if (settings.tab === "profile" || settings.tab === "preferences") {
    const preferences = settings.tab === "preferences";
    return (
      <form onSubmit={saveProfile} className="space-y-6">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">
            {preferences
              ? "Control the writing and output defaults used across your reports."
              : "Your profile is available here on every signed-in app route."}
          </p>
          {profile || userEmail ? (
            <p className="mt-2 text-xs text-[var(--text-muted)]">{userEmail ?? "Signed-in account"}</p>
          ) : null}
        </div>
        {!preferences ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["First name", profileFirstName, setProfileFirstName],
              ["Last name", profileLastName, setProfileLastName],
              ["Display name", profileDisplayName, setProfileDisplayName],
              ["Job title", profileJobTitle, setProfileJobTitle],
              ["Company", profileCompanyName, setProfileCompanyName],
            ].map(([label, value, setValue]) => (
              <label key={label as string} className="space-y-1.5 text-sm">
                <span className="text-[var(--text-secondary)]">{label as string}</span>
                <input
                  value={value as string}
                  onChange={(event) => (setValue as Dispatch<SetStateAction<string>>)(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-cyan-300/50"
                />
              </label>
            ))}
          </div>
        ) : null}
        <label className="block space-y-1.5 text-sm">
          <span className="text-[var(--text-secondary)]">Output language</span>
          <input
            value={profileOutputLanguage}
            onChange={(event) => setProfileOutputLanguage(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-cyan-300/50"
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="text-[var(--text-secondary)]">Signature</span>
          <textarea
            value={signatureOverride}
            onChange={(event) => setSignatureOverride(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-cyan-300/50"
          />
        </label>
        {preferences ? (
          <>
            <label className="block space-y-1.5 text-sm">
              <span className="text-[var(--text-secondary)]">Writing style</span>
              <textarea
                value={writingStyle}
                onChange={(event) => setWritingStyle(event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-cyan-300/50"
              />
            </label>
            <div className="space-y-3 text-sm text-[var(--text-secondary)]">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={compactMode} onChange={(event) => setCompactMode(event.target.checked)} />
                Use compact layout
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showCharacterCount} onChange={(event) => setShowCharacterCount(event.target.checked)} />
                Show character counts
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={privacyMode} onChange={(event) => setPrivacyMode(event.target.checked)} />
                Use privacy mode
              </label>
            </div>
          </>
        ) : null}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#07111f] disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
          {feedback ? <span className="text-sm text-[var(--text-secondary)]">{feedback}</span> : null}
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4 text-sm text-[var(--text-secondary)]">
      <p>
        {settings.tab === "billing"
          ? "Billing details are managed securely in Stripe."
          : settings.tab === "appearance"
            ? "Appearance preferences are available from the app shell."
            : settings.tab === "privacy"
              ? "Your account and PSA connection data are protected by your signed-in session."
              : "This section is available from the app shell on every route."}
      </p>
      {settings.tab === "billing" ? (
        <Link href="/api/stripe/portal" className="inline-flex rounded-lg border border-white/15 px-4 py-2 font-semibold text-white hover:border-white/30">
          Open billing portal
        </Link>
      ) : null}
    </div>
  );
}
