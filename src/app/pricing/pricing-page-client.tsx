"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowLeftRight,
  ArrowUpCircle,
  CalendarClock,
  ChevronDown,
  Clock,
  CreditCard,
  FileDown,
  FileText,
  FormInput,
  Handshake,
  Headphones,
  Infinity,
  Layers,
  LayoutList,
  LayoutTemplate,
  Loader2,
  Lock,
  Minus,
  Mail,
  MessageSquare,
  Paintbrush,
  PhoneCall,
  Presentation,
  Plug,
  Send,
  Shield,
  Star,
  Gauge,
  Users,
  Webhook,
  Plus,
  Zap,
  Globe,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { HomeRoiCalculator } from "@/components/home-roi-calculator";
import { PricingComparisonSection } from "@/components/pricing-comparison-section";
import { PricingPlanTick } from "@/components/pricing-plan-tick";
import { PricingWhatsIncludedComparison } from "@/components/pricing-whats-included-comparison";
import { ScrollRevealItem } from "@/components/scroll-reveal-item";
import { TestimonialMarquee } from "@/components/testimonial-marquee";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase";
import { STRIPE_ONBOARDING_CALL_PRICE_ID, STRIPE_PRICE_IDS } from "@/lib/stripe-price-ids";
import {
  clampTeamSeatCount,
  isSoloSubscriptionLive,
  isTrialExpired,
  normalizePlanLabel,
  planFieldsFromProfileRow,
  type UserPlanFields,
} from "@/lib/utils/getPlan";

function FeatureTooltip({ children, tip }: { children: React.ReactNode; tip: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  const handleEnter = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ x: rect.right + 8, y: rect.top + rect.height / 2 });
  };

  return (
    <>
      <span
        ref={ref}
        className="cursor-default"
        onMouseEnter={handleEnter}
        onMouseLeave={() => setPos(null)}
      >
        {children}
      </span>
      {pos &&
        typeof window !== "undefined" &&
        createPortal(
          <span
            className="fixed z-[9999] w-56 rounded-lg border border-white/[0.10] bg-[#0A0F1C]/98 px-3 py-2 text-[11px] leading-relaxed text-white/70 shadow-xl backdrop-blur-md pointer-events-none"
            style={{ left: pos.x, top: pos.y, transform: "translateY(-50%)" }}
          >
            {tip}
          </span>,
          document.body,
        )}
    </>
  );
}

const PRICING_PRO_FEATURE_ICON_CLASS = "size-[14px] shrink-0 text-[#0EA5E9]";
const PRICING_TEAM_FEATURE_ICON_CLASS = "size-[14px] shrink-0 text-[#7C3AED]";
const PRICING_ENT_FEATURE_ICON_CLASS = "size-[14px] shrink-0 text-[#C9A84C]";

const FEATURE_TIPS: Record<string, string> = {
  "One PSA connection (HaloPSA or ConnectWise)":
    "Connect either HaloPSA or ConnectWise Manage as your data source. Switch PSA at any time from settings.",
  "Unlimited manual report generation":
    "Generate as many reports as you need on demand. No monthly cap on manual generations.",
  "All standard output types":
    "Includes client email, action log, risk log, executive summary, and status report — all generated simultaneously.",
  "Up to 3 active scheduled reports":
    "Run up to three enabled scheduled report campaigns at once. Upgrade to Team for unlimited active schedules.",
  "Basic Excel export":
    "Export your report data as a formatted Excel file with key delivery metrics and ticket summaries.",
  "Push notes to PSA":
    "Write generated report content back directly into your PSA ticket notes automatically.",
  "Delivery health dashboard":
    "A live RAG status overview of all your client accounts showing health scores, overdue tickets, and SLA performance.",
  "1 QBR pack per month":
    "Generate one full quarterly business review pack per month including charts, exec summary, and project status.",
  "Email support":
    "Direct email support from the Handover team with responses within 1 business day.",
  "Everything in Professional": "Includes all features from the Professional plan.",
  "Both PSAs simultaneously (HaloPSA and ConnectWise)":
    "Connect both HaloPSA and ConnectWise at the same time and generate reports from either within the same account.",
  "Unlimited scheduled reports":
    "Set up as many automated scheduled reports as you need with no monthly cap.",
  "3 QBR packs per month":
    "Generate up to three full QBR packs per month across your client base.",
  "PowerPoint and PDF export":
    "Export QBR packs and reports as branded PowerPoint slides or PDF documents ready to share with clients.",
  "Slack and Microsoft Teams notifications":
    "Send automatic report summary alerts to your Slack or Teams channels when reports are generated.",
  "White label and custom branding":
    "Apply your company logo, colours, and brand name to all report outputs and remove Handover branding entirely.",
  "Team management and invites":
    "Invite team members and manage access with role-based permissions across your Handover account.",
  "Shared PSA connection (admin managed)":
    "One PSA connection shared across the whole team, managed centrally by the account admin.",
  "Pooled usage across team":
    "All team members share the same generation allowances rather than having separate per-user limits.",
  "Priority email support":
    "Priority support queue with faster response times and dedicated assistance from the Handover team.",
  "Everything in Team": "Includes all features from the Team plan.",
  "Unlimited users":
    "Add as many team members as you need with no per-user pricing above your base contract.",
  "Unlimited QBR packs": "Generate as many QBR packs as needed with no monthly cap.",
  "Client portal with branded login":
    "Give your clients a branded portal to view tickets, projects and reports.",
  "Partner and reseller multi-tenancy":
    "Manage multiple end-client accounts under one Handover instance — ideal for resellers and large MSP groups. Coming soon.",
  "Custom domain support":
    "Host Handover on your own domain for a fully white-labelled experience.",
  "Dedicated account manager":
    "A named Handover account manager for onboarding, quarterly reviews, and ongoing support.",
  "Onboarding call included":
    "A dedicated setup call with the Handover team to get your account configured and your first reports running.",
  "SLA guarantee":
    "Contractual uptime and response time guarantees backed by a formal service level agreement.",
  "Custom contract":
    "Bespoke contract terms including payment schedules, data processing agreements, and custom terms.",
  "Custom integrations on request":
    "Additional PSA or platform integrations built to specification for your specific workflow requirements.",
  "Custom field mapping — maps your PSA custom fields into every report automatically.":
    "Map PSA custom fields to specific report outputs so every generation reflects your ticket and project data.",
  "One-click client email send":
    "Send the generated client email from Handover with a single action when you are ready to share it.",
};

const professionalFeatureList: { text: string; Icon: LucideIcon }[] = [
  { text: "One PSA connection (HaloPSA or ConnectWise)", Icon: Plug },
  { text: "Unlimited manual report generation", Icon: Zap },
  { text: "All standard output types", Icon: LayoutList },
  { text: "One-click client email send", Icon: Send },
  { text: "Up to 3 active scheduled reports", Icon: CalendarClock },
  { text: "Basic Excel export", Icon: FileDown },
  { text: "Push notes to PSA", Icon: ArrowLeftRight },
  {
    text: "Custom field mapping — maps your PSA custom fields into every report automatically.",
    Icon: FormInput,
  },
  { text: "Delivery health dashboard", Icon: Activity },
  { text: "1 QBR pack per month", Icon: LayoutTemplate },
  { text: "Email support", Icon: Headphones },
];

const teamCardFeatures: { text: string; Icon: LucideIcon }[] = [
  { text: "Everything in Professional", Icon: Layers },
  { text: "Both PSAs simultaneously (HaloPSA and ConnectWise)", Icon: Plug },
  { text: "Unlimited scheduled reports", Icon: CalendarClock },
  { text: "3 QBR packs per month", Icon: LayoutTemplate },
  { text: "PowerPoint and PDF export", Icon: Presentation },
  { text: "Slack and Microsoft Teams notifications", Icon: MessageSquare },
  { text: "White label and custom branding", Icon: Paintbrush },
  { text: "Team management and invites", Icon: Users },
  { text: "Shared PSA connection (admin managed)", Icon: Shield },
  { text: "Pooled usage across team", Icon: Zap },
  { text: "Priority email support", Icon: Headphones },
];

const enterpriseFeatures: Array<{
  text: string;
  Icon: LucideIcon;
  comingSoon?: boolean;
  beta?: boolean;
}> = [
  { text: "Everything in Team", Icon: Layers },
  { text: "Unlimited users", Icon: Users },
  { text: "Unlimited QBR packs", Icon: LayoutTemplate },
  { text: "Client portal with branded login", Icon: Globe, beta: true },
  { text: "Partner and reseller multi-tenancy", Icon: Users, comingSoon: true },
  { text: "Custom domain support", Icon: Webhook, comingSoon: true },
  { text: "Dedicated account manager", Icon: Handshake },
  { text: "Onboarding call included", Icon: PhoneCall },
  { text: "SLA guarantee", Icon: Gauge },
  { text: "Custom contract", Icon: FileText },
  { text: "Custom integrations on request", Icon: Plug },
];

function PricingBillingFromQuery({
  setBillingPeriod,
}: {
  setBillingPeriod: (p: "monthly" | "annual") => void;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const b = searchParams.get("billing");
    if (b === "annual") setBillingPeriod("annual");
    else if (b === "monthly") setBillingPeriod("monthly");
  }, [searchParams, setBillingPeriod]);
  return null;
}

const faqItems: { q: string; a: string }[] = [
  {
    q: "How does the free trial work?",
    a: "Start a 14-day Professional or Team trial with card details collected at signup. You get full access to that plan’s features until the trial ends, then your paid subscription starts automatically unless you cancel. 14-day free trial - cancel anytime.",
  },
  {
    q: "Do I need a PSA account to use Handover?",
    a: "No. You can paste notes or ticket data manually (or import from CSV / Excel) and get outputs instantly. HaloPSA and ConnectWise connection, push-back, scheduled reports, and the delivery health dashboard are included on Professional and above.",
  },
  {
    q: "What counts as a generation?",
    a: "Each time you click Generate counts as one generation. You can select up to 5 outputs per generation - selecting more outputs does not use more generations.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel anytime from your account settings. You keep access until the end of your billing period.",
  },
  {
    q: "Is my data secure?",
    a: "Your notes are sent to OpenAI for processing and are not stored by OpenAI for training. Your PSA credentials (HaloPSA or ConnectWise) are encrypted before being stored. We never share your data with third parties.",
  },
  {
    q: "Do you offer team plans?",
    a: "Yes. Team includes pooled usage, shared PSA setup, and collaboration. For larger deployments or Enterprise features, contact us at hello@gethandover.uk",
  },
  {
    q: "What if I need more than the free trial allowance?",
    a: "Upgrade to Professional or Team for higher generation limits, automation, and integrations. See the plan cards above for current UK pricing.",
  },
];

/** Professional annual total (GBP) — monthly equivalent shown on annual toggle. */
const PRO_ANNUAL_TOTAL_GBP = 290;

/** Team seat pricing: flat base up to 5 users, then per-seat add-on (marketing page — keep in sync with Stripe). */
const TEAM_SEAT_INCLUDED = 5;
const TEAM_BASE_MONTHLY_GBP = 79;
const TEAM_EXTRA_PER_SEAT_MONTHLY_GBP = 20;
const TEAM_BASE_ANNUAL_GBP = 632;
const TEAM_EXTRA_PER_SEAT_ANNUAL_GBP = 192;

function teamPricingTotalMonthly(seatsRaw: number): number {
  const seats = clampTeamSeatCount(seatsRaw);
  return (
    TEAM_BASE_MONTHLY_GBP +
    Math.max(0, seats - TEAM_SEAT_INCLUDED) * TEAM_EXTRA_PER_SEAT_MONTHLY_GBP
  );
}

function teamPricingTotalAnnual(seatsRaw: number): number {
  const seats = clampTeamSeatCount(seatsRaw);
  return (
    TEAM_BASE_ANNUAL_GBP +
    Math.max(0, seats - TEAM_SEAT_INCLUDED) * TEAM_EXTRA_PER_SEAT_ANNUAL_GBP
  );
}

function useAnimatedNumber(target: number, duration: number = 400) {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<{ from: number; to: number; startTime: number } | null>(null);

  useEffect(() => {
    if (display === target) return;

    const from = display;
    const startTime = performance.now();
    startRef.current = { from, to: target, startTime };

    const animate = (now: number) => {
      if (!startRef.current) return;
      const elapsed = now - startRef.current.startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(
        startRef.current.from + (startRef.current.to - startRef.current.from) * eased,
      );
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, display]);

  return display;
}

export function PricingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  /** From settings "Manage subscription" / upgrade flows — prefer paid checkout over starting a new trial. */
  const pricingIntentUpgrade = searchParams.get("upgrade") === "true";
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [planFields, setPlanFields] = useState<UserPlanFields | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  /** Referral welcome coupon eligible (DB); only true when signed in with pending reward. */
  const [welcomeRewardEligible, setWelcomeRewardEligible] = useState(false);
  const enterpriseSheenRef = useRef<HTMLDivElement>(null);
  const [teamSeats, setTeamSeats] = useState(3);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [proOnboardingChecked, setProOnboardingChecked] = useState(false);
  const [teamOnboardingChecked, setTeamOnboardingChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: row } = await supabase
          .from("profiles")
          .select(
            "plan, team_id, trial_ends_at, trial_plan, subscription_status, stripe_customer_id",
          )
          .eq("id", user.id)
          .maybeSingle();
        const pf = planFieldsFromProfileRow(row);
        setPlanFields(pf);
        try {
          const res = await fetch("/api/referrals/welcome-eligible", {
            credentials: "include",
          });
          const body = (await res.json()) as { eligible?: boolean };
          setWelcomeRewardEligible(body.eligible === true);
        } catch {
          setWelcomeRewardEligible(false);
        }
      } else {
        setPlanFields(null);
        setWelcomeRewardEligible(false);
      }
      setIsSignedIn(!!user);
    })();
  }, []);

  const proPriceId =
    billingPeriod === "annual"
      ? STRIPE_PRICE_IDS.professional.annual
      : STRIPE_PRICE_IDS.professional.monthly;
  const teamPriceId =
    billingPeriod === "annual"
      ? STRIPE_PRICE_IDS.team.annual
      : STRIPE_PRICE_IDS.team.monthly;

  const professionalCardCta = useMemo(() => {
    if (isSignedIn === null) return { variant: "loading" as const };
    if (!isSignedIn) return { variant: "anonymous" as const };
    const f = planFields;
    const p = normalizePlanLabel(f?.plan ?? "");
    const teamWorkspace = Boolean(f?.team_id?.trim());
    if (
      pricingIntentUpgrade &&
      (p === "free" || p === "basic") &&
      !teamWorkspace
    ) {
      return { variant: "upgrade" as const, label: "Upgrade Now" as const };
    }
    if (teamWorkspace) {
      return { variant: "team_workspace" as const };
    }
    const sub = f?.subscription_status ?? null;
    if (p === "professional" && isSoloSubscriptionLive(sub)) {
      return { variant: "current_plan" as const };
    }
    if ((p === "team" || p === "enterprise") && isSoloSubscriptionLive(sub)) {
      return { variant: "included_higher" as const };
    }
    const end = f?.trial_ends_at;
    const endFuture = end && new Date(end) > new Date();
    const activeTrial =
      Boolean(endFuture) &&
      (p === "professional_trial" ||
        p === "team_trial" ||
        (p === "free" && Boolean(f?.trial_plan?.trim())));
    if (activeTrial) {
      return { variant: "upgrade" as const, label: "Upgrade Now" as const };
    }
    if (f && isTrialExpired(f)) {
      return {
        variant: "upgrade" as const,
        label: "Reactivate — Upgrade Now" as const,
      };
    }
    return { variant: "start_trial" as const };
  }, [isSignedIn, planFields, pricingIntentUpgrade]);

  const teamCardCta = useMemo(() => {
    if (isSignedIn === null) return { variant: "loading" as const };
    if (!isSignedIn) return { variant: "anonymous" as const };
    const f = planFields;
    const p = normalizePlanLabel(f?.plan ?? "");
    const teamWorkspace = Boolean(f?.team_id?.trim());
    if (
      pricingIntentUpgrade &&
      (p === "free" || p === "basic") &&
      !teamWorkspace
    ) {
      return { variant: "upgrade" as const, label: "Upgrade Now" as const };
    }
    if (teamWorkspace) {
      return { variant: "manage_workspace" as const };
    }
    const sub = f?.subscription_status ?? null;
    if (p === "team" && isSoloSubscriptionLive(sub)) {
      return { variant: "current_plan" as const };
    }
    if (p === "enterprise" && isSoloSubscriptionLive(sub)) {
      return { variant: "included_enterprise" as const };
    }
    const end = f?.trial_ends_at;
    const endFuture = end && new Date(end) > new Date();
    const activeTrial =
      Boolean(endFuture) &&
      (p === "professional_trial" ||
        p === "team_trial" ||
        (p === "free" && Boolean(f?.trial_plan?.trim())));
    if (activeTrial) {
      return { variant: "upgrade" as const, label: "Upgrade Now" as const };
    }
    if (f && isTrialExpired(f)) {
      return {
        variant: "upgrade" as const,
        label: "Reactivate — Upgrade Now" as const,
      };
    }
    if (p === "professional" && isSoloSubscriptionLive(sub)) {
      return { variant: "upgrade" as const, label: "Upgrade" as const };
    }
    return { variant: "start_trial" as const };
  }, [isSignedIn, planFields, pricingIntentUpgrade]);

  /** Matches server `hasActiveSoloAppTrialFromProfile` — used for Stripe checkout (no second trial). */
  const hasActiveAppTrialForCheckout = useMemo(() => {
    const f = planFields;
    if (!f?.trial_ends_at) return false;
    if (new Date(f.trial_ends_at) <= new Date()) return false;
    const p = normalizePlanLabel(f.plan ?? "");
    return (
      p === "professional_trial" ||
      p === "team_trial" ||
      (p === "free" && Boolean(f.trial_plan?.trim()))
    );
  }, [planFields]);

  const professionalButtonLabel = useMemo(() => {
    if (checkoutLoading) return "Loading…";
    const c = professionalCardCta;
    if (c.variant === "current_plan") return "Current Plan";
    if (c.variant === "included_higher") return "Included in your plan";
    if (c.variant === "team_workspace") return "Team workspace";
    if (c.variant === "upgrade") return c.label;
    if (c.variant === "start_trial" || c.variant === "anonymous") {
      return welcomeRewardEligible ? "Claim your free month →" : "Start 14-day free trial";
    }
    return "Start 14-day free trial";
  }, [checkoutLoading, professionalCardCta, welcomeRewardEligible]);

  const teamPrimaryButtonLabel = useMemo(() => {
    if (checkoutLoading) return "Loading…";
    const c = teamCardCta;
    if (c.variant === "current_plan") return "Current Plan";
    if (c.variant === "included_enterprise") return "Included in Enterprise";
    if (c.variant === "upgrade") return c.label;
    return "Start 14-day free trial";
  }, [checkoutLoading, teamCardCta]);

  const startCheckout = async (
    priceId: string,
    options?: {
      seats?: number;
      skipTeamTrial?: boolean;
      hasActiveTrial?: boolean;
      includeOnboardingCall?: boolean;
      /** Immediate paid subscription (no Stripe 14-day trial). */
      purchaseWithoutTrial?: boolean;
    },
  ) => {
    if (checkoutLoading || !priceId) return;
    setCheckoutLoading(true);
    try {
      const payload: {
        priceId: string;
        seats?: number;
        skipTeamTrial?: boolean;
        hasActiveTrial?: boolean;
        includeOnboardingCall?: boolean;
        purchaseWithoutTrial?: boolean;
      } = { priceId };
      if (options?.seats != null) payload.seats = options.seats;
      if (options?.skipTeamTrial) payload.skipTeamTrial = true;
      if (options?.hasActiveTrial === true) payload.hasActiveTrial = true;
      if (options?.includeOnboardingCall === true) payload.includeOnboardingCall = true;
      if (options?.purchaseWithoutTrial === true) payload.purchaseWithoutTrial = true;
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        console.error(data.error ?? "Checkout failed");
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const isEnterprisePlanUser = useMemo(() => {
    const p = normalizePlanLabel(planFields?.plan ?? "");
    return p === "enterprise";
  }, [planFields]);

  const includeOnboardingFromCheckbox = (forStripeCheckout: boolean) =>
    Boolean(
      forStripeCheckout &&
        isSignedIn &&
        !isEnterprisePlanUser &&
        STRIPE_ONBOARDING_CALL_PRICE_ID,
    );

  const startPlanTrial = async (which: "professional" | "team") => {
    if (checkoutLoading) return;
    if (!isSignedIn) {
      router.push(`/signup?trial=${which}`);
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/trial/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: which }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        console.error(data.error ?? "Could not start trial");
        return;
      }
      router.push("/");
    } catch (e) {
      console.error(e);
    } finally {
      setCheckoutLoading(false);
    }
  };

  /** Monthly list price £29; annual £290 → save £58/year. */
  const PRO_MONTHLY_LIST_GBP = 29;
  const proAnnualSavePerYearGbp = PRO_MONTHLY_LIST_GBP * 12 - PRO_ANNUAL_TOTAL_GBP;

  const teamSeatCountClamped = clampTeamSeatCount(teamSeats);
  const teamTotalMonthly = teamPricingTotalMonthly(teamSeatCountClamped);
  const teamTotalAnnual = teamPricingTotalAnnual(teamSeatCountClamped);
  /** Rounded down (never up) for displayed £/mo on annual. */
  const teamAnnualMonthlyEquiv = Math.floor(teamTotalAnnual / 12);
  const proAnnualMonthlyEquiv = Math.floor(PRO_ANNUAL_TOTAL_GBP / 12);
  const calculatedTeamPrice =
    billingPeriod === "annual" ? teamAnnualMonthlyEquiv : teamTotalMonthly;
  const animatedTeamPrice = useAnimatedNumber(calculatedTeamPrice, 350);
  /** Annual vs paying monthly list for same seat count for a full year. */
  const teamAnnualSavePerYearGbp =
    teamTotalMonthly * 12 - teamTotalAnnual;

  const scrollToTeamIncludes = () => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("pricing-whats-included")?.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "start",
    });
  };

  /**
   * After signup/sign-in with returnTo=/pricing?checkout=buy-team, open paid Team checkout once.
   * sessionStorage avoids duplicate sessions under React Strict Mode remounts.
   */
  useEffect(() => {
    if (searchParams.get("checkout") !== "buy-team" || isSignedIn !== true || !teamPriceId) return;

    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id || cancelled) return;
      const guardKey = `handover_pricing_buy_team_${user.id}`;
      try {
        if (sessionStorage.getItem(guardKey) === "1") {
          router.replace("/pricing");
          return;
        }
        sessionStorage.setItem(guardKey, "1");
      } catch {
        return;
      }
      await startCheckout(teamPriceId, {
        seats: teamSeatCountClamped,
        skipTeamTrial: true,
        purchaseWithoutTrial: true,
      });
      if (!cancelled) {
        try {
          router.replace("/pricing");
        } catch {
          /* ignore */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, isSignedIn, teamPriceId, teamSeatCountClamped, router]);

  return (
    <div
      className="animate-in fade-in duration-300"
      style={{
        minHeight: "100vh",
        ["--bg-secondary" as string]: "rgba(255, 255, 255, 0.03)",
        ["--bg-primary" as string]: "rgba(255, 255, 255, 0.02)",
      }}
    >
      <PricingBillingFromQuery setBillingPeriod={setBillingPeriod} />
      <section className="relative z-[1] overflow-hidden bg-transparent px-6 py-12 md:px-8 md:py-20">
        {/* Ambient orbs - inline implementation */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-20%",
              left: "-10%",
              width: "600px",
              height: "600px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)",
              animation: "pricingOrbA 8s ease-in-out infinite alternate",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-20%",
              right: "-10%",
              width: "500px",
              height: "500px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)",
              animation: "pricingOrbB 10s ease-in-out infinite alternate",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "-10%",
              right: "20%",
              width: "400px",
              height: "400px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)",
              animation: "pricingOrbC 12s ease-in-out infinite alternate",
            }}
          />
        </div>
        <div className="relative z-[1] mx-auto w-full max-w-[1200px]">
          <div className="text-center">
          <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
            Simple, honest pricing
          </span>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            <span className="text-gradient-brand">Plans for every</span>
            <br />
            <span className="text-[var(--text-primary)]">MSP delivery team</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--text-secondary)]">
            Generate your first report free. Upgrade when you need unlimited push-back,
            scheduling, and Excel packs. Start a 14-day free trial on Professional or Team — 14-day free trial - cancel anytime.
          </p>
          </div>
        </div>
      </section>

      <section className="relative z-[1] bg-transparent px-6 pt-6 pb-6 md:px-8 md:pt-8 md:pb-10">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
          <ScrollRevealItem index={0} className="mx-auto w-full max-w-[600px]">
            <p
              className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[13px] leading-snug text-[var(--text-secondary)]"
              aria-label="Handover at a glance"
            >
              <span>
                <span className="font-semibold text-[var(--text-primary)]">40+</span> MSP teams
              </span>
              <span className="text-[var(--text-muted)]" aria-hidden>
                ·
              </span>
              <span>
                <span className="font-semibold text-[var(--text-primary)]">96%</span> average time saved
              </span>
              <span className="text-[var(--text-muted)]" aria-hidden>
                ·
              </span>
              <span>
                <span className="font-semibold text-[var(--text-primary)]">HaloPSA marketplace</span> listed
              </span>
              <span className="text-[var(--text-muted)]" aria-hidden>
                ·
              </span>
              <span>
                <span className="font-semibold text-[var(--text-primary)]">ConnectWise integration</span> available
              </span>
              <span className="text-[var(--text-muted)]" aria-hidden>
                ·
              </span>
              <span>
                Built by an <span className="font-semibold text-[var(--text-primary)]">MSP PM</span>
              </span>
            </p>
          </ScrollRevealItem>

          <ScrollRevealItem index={1} className="mx-auto w-full max-w-[1200px]">
            <div className="flex flex-col items-center justify-center gap-3 px-2 py-4">
              <p className="text-center text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Billing period
              </p>
              <div
                className="inline-flex flex-wrap items-center justify-center gap-1 rounded-full border-2 border-[var(--border)] bg-[var(--bg-primary)] p-1.5 shadow-md"
                role="tablist"
                aria-label="Billing period"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={billingPeriod === "monthly"}
                  className={cn(
                    "rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
                    billingPeriod === "monthly"
                      ? "bg-[var(--accent)] text-white shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  )}
                  onClick={() => setBillingPeriod("monthly")}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={billingPeriod === "annual"}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
                    billingPeriod === "annual"
                      ? "bg-[var(--accent)] text-white shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  )}
                  onClick={() => setBillingPeriod("annual")}
                >
                  <span>Annual</span>
                  <span className="rounded-full bg-[#0EA5E9] px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                    Save 17%
                  </span>
                </button>
              </div>
            </div>
          </ScrollRevealItem>

          <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-3 xl:grid-cols-3 xl:items-start">
              <ScrollRevealItem index={0} className="min-w-0 h-full">
              <div className="pricing-card-wrapper pricing-card-pro relative z-0 flex h-full min-h-0 flex-col">
                <div className="pricing-card-inner flex min-h-0 flex-1 flex-col">
                  <div className="pricing-pro-premium-dots" aria-hidden />
                  <div className="pricing-card-glass bg-white/[0.04] backdrop-blur-xl border border-white/[0.10] rounded-2xl p-8 hover:border-white/[0.20] transition-all duration-300 hover:bg-white/[0.06] relative flex h-full min-h-0 flex-1 flex-col gap-5 shadow-none ring-0">
                  <CardHeader className="!px-8 pt-2 text-center">
                    <CardTitle className="text-xl text-[#0EA5E9]">Professional</CardTitle>
                    <p className="flex flex-wrap items-baseline justify-center gap-2 leading-none">
                      <span className="pricing-pro-premium-price">
                        £{billingPeriod === "annual" ? proAnnualMonthlyEquiv : "29"}
                      </span>
                      <span className="text-base font-normal text-[var(--text-secondary)]">/mo</span>
                    </p>
                    {billingPeriod === "annual" ? (
                      <>
                        <p className="mt-1 text-center text-[12px] leading-snug text-teal-600 dark:text-teal-400">
                          You&apos;re saving £{proAnnualSavePerYearGbp} compared to monthly billing
                        </p>
                        <p className="mt-1 text-center text-sm font-medium text-[var(--text-secondary)]">
                          £{PRO_ANNUAL_TOTAL_GBP} billed annually
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-[var(--text-secondary)]">Billed monthly</p>
                    )}
                  </CardHeader>
                  <CardContent className="relative z-[1] flex flex-1 flex-col gap-2 !px-8">
                    <ul className="flex flex-col gap-1 text-sm text-[var(--text-primary)]">
                      {professionalFeatureList.map((f, idx) => (
                        <li
                          key={`${f.text}-${idx}`}
                          className="pricing-pro-feature-row"
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          <PricingPlanTick variant="professional" className="mt-0.5" />
                          <f.Icon className={cn("pricing-pro-feature-inline-icon", PRICING_PRO_FEATURE_ICON_CLASS)} strokeWidth={2} aria-hidden />
                          <span className="min-w-0 flex flex-wrap items-center gap-2 pt-0.5">
                            <FeatureTooltip tip={FEATURE_TIPS[f.text]}>
                              <span>{f.text}</span>
                            </FeatureTooltip>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="relative z-[1] mt-auto flex-col gap-3 border-t border-[var(--border-subtle)] !px-8 pt-8 pb-6">
                    <div className="mt-auto pt-6 flex flex-col gap-3">
                      {isSignedIn === null ? (
                        <Button className="w-full" size="lg" disabled>
                          <Loader2 className="size-4 animate-spin" />
                        </Button>
                      ) : !isSignedIn ? (
                        <div className="flex w-full flex-col gap-2">
                          <Link
                            href="/signup?trial=professional"
                            className="bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] hover:from-[#0284C7] hover:to-[#0EA5E9] text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-[#0EA5E9]/20 hover:shadow-[#0EA5E9]/30 transition-all duration-300 transform hover:scale-[1.02] pricing-pro-premium-cta inline-flex min-h-12 w-full items-center justify-center text-sm"
                          >
                            {welcomeRewardEligible ? "Claim your free month →" : "Start 14-day free trial"}
                          </Link>
                          <button
                            type="button"
                            disabled={checkoutLoading}
                            onClick={() =>
                              void startCheckout(STRIPE_PRICE_IDS.professional.monthly, {
                                purchaseWithoutTrial: true,
                              })
                            }
                            className="bg-white/[0.05] backdrop-blur-sm border border-white/[0.15] hover:bg-white/[0.08] text-white font-medium px-6 py-3 rounded-xl transition-all duration-300 text-center text-[13px] underline-offset-4 hover:underline disabled:opacity-50"
                          >
                            Or buy now from £{PRO_MONTHLY_LIST_GBP}/mo
                          </button>
                        </div>
                      ) : (
                        <div className="flex w-full flex-col gap-2">
                          <Button
                            className="pricing-pro-premium-cta w-full min-h-12 rounded-[var(--radius)]"
                            size="lg"
                            disabled={
                              checkoutLoading ||
                              professionalCardCta.variant === "current_plan" ||
                              professionalCardCta.variant === "included_higher" ||
                              professionalCardCta.variant === "team_workspace"
                            }
                            onClick={() => {
                              if (professionalCardCta.variant === "upgrade") {
                                void startCheckout(proPriceId, {
                                  hasActiveTrial: hasActiveAppTrialForCheckout,
                                  includeOnboardingCall:
                                    includeOnboardingFromCheckbox(proOnboardingChecked),
                                });
                                return;
                              }
                              void startPlanTrial("professional");
                            }}
                          >
                            <span className="pricing-pro-premium-cta-inner">
                              {checkoutLoading ? (
                                <>
                                  <Loader2 className="size-4 animate-spin" />
                                  Loading…
                                </>
                              ) : (
                                professionalButtonLabel
                              )}
                            </span>
                          </Button>
                          {professionalCardCta.variant === "start_trial" ? (
                            <button
                              type="button"
                              disabled={checkoutLoading}
                              onClick={() =>
                                void startCheckout(proPriceId, {
                                  purchaseWithoutTrial: true,
                                })
                              }
                              className="bg-white/[0.05] backdrop-blur-sm border border-white/[0.15] hover:bg-white/[0.08] text-white font-medium px-6 py-3 rounded-xl transition-all duration-300 text-center text-[13px] underline-offset-4 hover:underline disabled:opacity-50"
                            >
                              Or buy now from £{PRO_MONTHLY_LIST_GBP}/mo
                            </button>
                          ) : null}
                        </div>
                      )}
                      <p className="mt-2 text-center text-[12px] text-white/40">14-day free trial - cancel anytime.</p>
                    </div>
                    {isSignedIn && !isEnterprisePlanUser ? (
                      <div className="mt-3 flex w-full items-start gap-2.5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/35 px-3 py-2.5 text-left">
                        <Checkbox
                          id="pricing-pro-onboarding"
                          checked={proOnboardingChecked}
                          onCheckedChange={(c) => setProOnboardingChecked(c === true)}
                          className="mt-0.5"
                        />
                        <label
                          htmlFor="pricing-pro-onboarding"
                          className="min-w-0 flex-1 cursor-pointer select-none"
                        >
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">
                            Add onboarding call — £99 one-time
                          </span>
                          <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
                            45-min setup session. We connect your PSA and get you fully configured.
                          </p>
                        </label>
                      </div>
                    ) : null}
                  </CardFooter>
                </div>
                </div>
              </div>
              </ScrollRevealItem>

              <ScrollRevealItem index={1} className="min-w-0 h-full">
              <div className="pricing-card-wrapper pricing-card-team relative z-0 flex h-full min-h-0 flex-col">
                <div className="pricing-card-inner flex min-h-0 flex-1 flex-col">
                  <div className="pricing-team-premium-dots" aria-hidden />
                  <div className="pricing-card-glass bg-white/[0.06] backdrop-blur-xl border border-purple-500/40 rounded-2xl p-8 hover:border-purple-500/60 transition-all duration-300 shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 scale-[1.02] relative flex h-full min-h-0 flex-1 flex-col gap-5 ring-0">
                    <div className="mx-auto mt-1 w-fit rounded-full border border-[#7C3AED]/35 bg-[#7C3AED]/12 px-3 py-1 text-center text-[11px] font-bold uppercase tracking-wide text-[#7C3AED]">
                      Most Popular
                    </div>
                    <CardHeader className="!px-8 pt-0 text-center">
                      <CardTitle className="pricing-team-title-gradient text-xl">Team</CardTitle>
                      {billingPeriod === "monthly" ? (
                        <p className="pricing-team-price-size mt-3 flex flex-wrap items-baseline justify-center gap-x-1">
                          <span className="pricing-team-price-gradient">£{animatedTeamPrice}</span>
                          <span className="text-base font-normal text-[var(--text-secondary)]">/mo</span>
                        </p>
                      ) : (
                        <>
                          <p className="pricing-team-price-size mt-3 flex flex-wrap items-baseline justify-center gap-x-1">
                            <span className="pricing-team-price-gradient">£{animatedTeamPrice}</span>
                            <span className="text-base font-normal text-[var(--text-secondary)]">/mo</span>
                          </p>
                          <p className="mt-1 text-center text-[12px] leading-snug text-teal-600 dark:text-teal-400">
                            You&apos;re saving £{teamAnnualSavePerYearGbp}/year compared to monthly billing
                          </p>
                          <p className="mt-1 text-center text-sm font-medium text-[var(--text-secondary)]">
                            £{teamTotalAnnual} billed annually
                          </p>
                        </>
                      )}
                      <p className="mt-2 text-center text-sm text-white/70">
                        5 users included
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] transition hover:bg-[var(--bg-primary)] disabled:opacity-40"
                          aria-label="Decrease users"
                          disabled={teamSeatCountClamped <= 1}
                          onClick={() => setTeamSeats((s) => clampTeamSeatCount(s - 1))}
                        >
                          <Minus className="size-3.5" aria-hidden />
                        </button>
                        <span
                          className="min-w-[5.5rem] text-center text-sm font-semibold tabular-nums text-[var(--text-primary)]"
                          aria-live="polite"
                        >
                          {teamSeatCountClamped} {teamSeatCountClamped === 1 ? "user" : "users"}
                        </span>
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] transition hover:bg-[var(--bg-primary)] disabled:opacity-40"
                          aria-label="Increase users"
                          disabled={teamSeatCountClamped >= 20}
                          onClick={() => setTeamSeats((s) => clampTeamSeatCount(s + 1))}
                        >
                          <Plus className="size-3.5" aria-hidden />
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex min-h-0 flex-1 flex-col gap-4 !px-8">
                      <div className="flex min-h-0 flex-1 flex-col gap-4">
                        <ul className="flex min-h-0 flex-1 flex-col gap-2 text-sm text-[var(--text-primary)]">
                          {teamCardFeatures.map((f) => (
                            <li key={f.text} className="flex items-start gap-2">
                              <PricingPlanTick variant="team" className="mt-0.5" />
                              <f.Icon
                                className={cn("mt-0.5", PRICING_TEAM_FEATURE_ICON_CLASS)}
                                strokeWidth={2}
                                aria-hidden
                              />
                              <span className="min-w-0">
                                <FeatureTooltip tip={FEATURE_TIPS[f.text]}>
                                  <span>{f.text}</span>
                                </FeatureTooltip>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                    <CardFooter className="mt-auto flex-col gap-3 border-t !px-8 pt-8 pb-6">
                      <div className="mt-auto pt-6 flex flex-col gap-3">
                      {isSignedIn === null ? (
                        <Button className="w-full" size="lg" disabled>
                          <Loader2 className="size-4 animate-spin" />
                        </Button>
                      ) : !isSignedIn ? (
                        <div className="flex w-full flex-col gap-2">
                          <Link
                            href="/signup?trial=team"
                            className="bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] hover:from-[#0284C7] hover:to-[#0EA5E9] text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-[#0EA5E9]/20 hover:shadow-[#0EA5E9]/30 transition-all duration-300 transform hover:scale-[1.02] inline-flex h-11 w-full items-center justify-center gap-2 text-sm"
                          >
                            Start 14-day free trial
                          </Link>
                          <Link
                            href={`/auth?tab=signup&returnTo=${encodeURIComponent("/pricing?checkout=buy-team")}`}
                          className="bg-white/[0.05] backdrop-blur-sm border border-white/[0.15] hover:bg-white/[0.08] text-white font-medium px-6 py-3 rounded-xl transition-all duration-300 text-center text-[13px] underline-offset-4 hover:underline"
                          >
                            Or buy now from £{TEAM_BASE_MONTHLY_GBP}/mo
                          </Link>
                        </div>
                      ) : teamCardCta.variant === "manage_workspace" ? (
                        <Link
                          href="/dashboard/team"
                          className="bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] hover:from-[#0284C7] hover:to-[#0EA5E9] text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-[#0EA5E9]/20 hover:shadow-[#0EA5E9]/30 transition-all duration-300 transform hover:scale-[1.02] inline-flex h-11 w-full items-center justify-center gap-2 text-sm"
                        >
                          Manage team
                        </Link>
                      ) : (
                        <>
                          <Button
                            className="bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] hover:from-[#0284C7] hover:to-[#0EA5E9] text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-[#0EA5E9]/20 hover:shadow-[#0EA5E9]/30 transition-all duration-300 transform hover:scale-[1.02] w-full gap-2"
                            size="lg"
                            disabled={
                              checkoutLoading ||
                              teamCardCta.variant === "current_plan" ||
                              teamCardCta.variant === "included_enterprise"
                            }
                            onClick={() => {
                              if (teamCardCta.variant === "upgrade") {
                                void startCheckout(teamPriceId, {
                                  seats: teamSeatCountClamped,
                                  hasActiveTrial: hasActiveAppTrialForCheckout,
                                  includeOnboardingCall:
                                    includeOnboardingFromCheckbox(teamOnboardingChecked),
                                });
                                return;
                              }
                              void startPlanTrial("team");
                            }}
                          >
                            {checkoutLoading ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Loading…
                              </>
                            ) : (
                              teamPrimaryButtonLabel
                            )}
                          </Button>
                          {teamCardCta.variant === "start_trial" ? (
                            <button
                              type="button"
                              disabled={checkoutLoading || !teamPriceId}
                              onClick={() =>
                                void startCheckout(teamPriceId, {
                                  seats: teamSeatCountClamped,
                                  skipTeamTrial: true,
                                  purchaseWithoutTrial: true,
                                })
                              }
                              className="bg-white/[0.05] backdrop-blur-sm border border-white/[0.15] hover:bg-white/[0.08] text-white font-medium px-6 py-3 rounded-xl transition-all duration-300 text-center text-[13px] underline-offset-4 hover:underline disabled:opacity-50"
                            >
                              Or buy now from £{TEAM_BASE_MONTHLY_GBP}/mo
                            </button>
                          ) : null}
                          {isSignedIn && !isEnterprisePlanUser ? (
                            <div className="mt-2 flex w-full items-start gap-2.5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/35 px-3 py-2.5 text-left">
                              <Checkbox
                                id="pricing-team-onboarding"
                                checked={teamOnboardingChecked}
                                onCheckedChange={(c) => setTeamOnboardingChecked(c === true)}
                                className="mt-0.5"
                              />
                              <label
                                htmlFor="pricing-team-onboarding"
                                className="min-w-0 flex-1 cursor-pointer select-none"
                              >
                                <span className="text-[13px] font-medium text-[var(--text-primary)]">
                                  Add onboarding call — £99 one-time
                                </span>
                                <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
                                  45-min setup session. We connect your PSA and get you fully configured.
                                </p>
                              </label>
                            </div>
                          ) : null}
                          <p className="text-center text-[12px] text-[var(--text-muted)]">
                            14-day free trial - cancel anytime.
                          </p>
                          <p className="text-center text-[12px] text-[var(--text-muted)]">
                            Refer a friend, get 3 months free -{" "}
                            <Link href="/referral" className="text-[var(--accent)] hover:underline">
                              Learn more
                            </Link>
                          </p>
                        </>
                      )}
                      <p className="mt-2 text-center text-[12px] text-white/40">14-day free trial - cancel anytime.</p>
                      </div>
                    </CardFooter>
                  </div>
                </div>
              </div>
              </ScrollRevealItem>

              <ScrollRevealItem index={2} className="min-w-0 h-full">
              <div
                ref={enterpriseSheenRef}
                className="pricing-card-wrapper pricing-card-enterprise relative flex h-full min-h-0 w-full max-w-full flex-col"
                onMouseMove={(e) => {
                  const el = enterpriseSheenRef.current;
                  if (!el) return;
                  const r = el.getBoundingClientRect();
                  el.style.setProperty(
                    "--ent-sheen-x",
                    `${((e.clientX - r.left) / r.width) * 100}%`,
                  );
                  el.style.setProperty(
                    "--ent-sheen-y",
                    `${((e.clientY - r.top) / r.height) * 100}%`,
                  );
                }}
                onMouseLeave={() => {
                  enterpriseSheenRef.current?.style.setProperty("--ent-sheen-x", "50%");
                  enterpriseSheenRef.current?.style.setProperty("--ent-sheen-y", "50%");
                }}
              >
                <div className="pricing-card-inner flex min-h-0 flex-1 flex-col">
                  <div className="pricing-enterprise-premium-dots" aria-hidden />
                  <div className="pricing-enterprise-holo-sheen" aria-hidden />
                  <div className="pro-card-content pricing-card-glass bg-white/[0.04] backdrop-blur-xl border border-white/[0.10] rounded-2xl p-8 hover:border-white/[0.20] transition-all duration-300 hover:bg-white/[0.06] relative flex h-full min-h-0 flex-1 flex-col gap-5 shadow-none ring-0">
                  <span className="mx-auto mt-2 block w-fit rounded-full border border-[#C9A84C]/45 bg-gradient-to-r from-[#C9A84C]/18 via-[#FFD700]/14 to-[#a67c2a]/16 px-3 py-1 text-center text-[11px] font-bold uppercase tracking-wide text-[#3d3318] dark:border-[#C9A84C]/40 dark:from-[#C9A84C]/22 dark:via-[#FFD700]/16 dark:to-[#8a7028]/20 dark:text-[#f5e6a8]">
                    For larger teams
                  </span>
                  <CardHeader className="!px-8 pb-2 pt-0 text-center">
                    <CardTitle className="pricing-enterprise-name-gradient text-xl">Enterprise</CardTitle>
                    <p className="mt-2 text-sm text-white/70">Starts from £249/mo</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      Custom deployments and unlimited scale
                    </p>
                    <div className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                      <Users className="size-3.5 text-[#C9A84C]" />
                      <span>Unlimited users included</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex min-h-0 flex-1 flex-col gap-3 !px-8">
                    <ul className="flex flex-col gap-2.5 text-sm text-[var(--text-primary)]">
                      {enterpriseFeatures.map((f) => (
                        <li key={f.text} className="flex items-start gap-2">
                          {f.comingSoon ? (
                            <span
                              className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-950 dark:bg-amber-950/45 dark:text-amber-50"
                              aria-label="Coming soon"
                            >
                              <Clock className="size-3" strokeWidth={2.5} aria-hidden />
                              Coming Soon
                            </span>
                          ) : (
                            <PricingPlanTick variant="enterprise" className="mt-0.5" />
                          )}
                          <f.Icon className={cn("mt-0.5", PRICING_ENT_FEATURE_ICON_CLASS)} strokeWidth={2} aria-hidden />
                          <span className="min-w-0">
                            <FeatureTooltip tip={FEATURE_TIPS[f.text]}>
                              <span className="inline-flex flex-wrap items-center gap-2">
                                <span>{f.text}</span>
                                {f.beta ? (
                                  <span className="rounded-full border border-[#C9A84C]/45 bg-gradient-to-r from-[#C9A84C]/18 via-[#FFD700]/14 to-[#a67c2a]/16 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#3d3318] dark:border-[#C9A84C]/40 dark:from-[#C9A84C]/22 dark:via-[#FFD700]/16 dark:to-[#8a7028]/20 dark:text-[#f5e6a8]">
                                    Beta
                                  </span>
                                ) : null}
                              </span>
                            </FeatureTooltip>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="mt-auto flex-col gap-3 border-t border-[var(--border-subtle)] bg-transparent !px-8 pt-8 pb-6">
                    <div className="mt-auto pt-6 flex flex-col gap-3">
                      <Link
                        href="/contact/sales?plan=enterprise"
                        className="bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] hover:from-[#0284C7] hover:to-[#0EA5E9] text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-[#0EA5E9]/20 hover:shadow-[#0EA5E9]/30 transition-all duration-300 transform hover:scale-[1.02] inline-flex h-12 w-full items-center justify-center text-sm"
                      >
                        Contact Sales
                      </Link>
                      <Link
                        href="/demo"
                        className="text-center text-[13px] text-[#C9A84C] underline-offset-4 transition-colors hover:text-[#FFD700] hover:underline"
                      >
                        or Book a demo call →
                      </Link>
                    </div>
                  </CardFooter>
                </div>
                </div>
              </div>
              </ScrollRevealItem>
            </div>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={scrollToTeamIncludes}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] transition-opacity duration-150 hover:opacity-[0.85]"
              >
                What&apos;s included
                <ChevronDown
                  className="whats-included-chevron size-3.5 shrink-0 opacity-80"
                  aria-hidden
                />
              </button>
            </div>

            <ScrollRevealItem index={4} className="mx-auto mt-6 block w-full max-w-[720px]">
              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] px-5 py-4 text-center shadow-sm">
                <p className="text-[14px] text-[var(--text-secondary)]">
                  Know an MSP PM? Refer them and get{" "}
                  <span className="font-semibold text-[var(--text-primary)]">3 months free</span>.{" "}
                  <Link
                    href="/referral"
                    className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                  >
                    Learn more →
                  </Link>
                </p>
              </div>
            </ScrollRevealItem>

          <ScrollRevealItem index={5} className="block">
          <p className="mt-2 flex items-center justify-center gap-2 text-center text-xs text-[var(--text-muted)]">
            <Shield className="size-3.5 shrink-0" aria-hidden />
            <span>
              Your data is never stored or shared. OpenAI API data is not used for training.{" "}
              <Link href="/privacy" className="hover:underline">
                Privacy policy →
              </Link>
            </span>
          </p>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] bg-transparent px-6 py-10 md:px-8 md:py-12">
        <ScrollRevealItem index={3} className="block">
          <HomeRoiCalculator variant="condensed" className="mx-auto" />
        </ScrollRevealItem>
      </section>

      <section className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1200px]">
          <ScrollRevealItem index={4} className="block">
          <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.07] rounded-2xl p-6 shadow-md sm:p-8">
            <PricingWhatsIncludedComparison headingId="pricing-whats-included" />
          </div>
          </ScrollRevealItem>
        </div>
      </section>

      <ScrollRevealItem index={5} className="block">
        <PricingComparisonSection />
      </ScrollRevealItem>

      <section className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1200px]">
          <ScrollRevealItem index={0} className="block">
          <h2
            className="text-center font-bold text-[var(--text-primary)]"
            style={{ fontSize: "24px", marginBottom: "0.5rem" }}
          >
            What delivery professionals say
          </h2>
          <p
            className="text-center text-[var(--text-secondary)]"
            style={{ fontSize: "15px", marginBottom: "2rem" }}
          >
            From PMs and SDMs at leading IT organisations
          </p>
          </ScrollRevealItem>
          <ScrollRevealItem index={1} className="block">
            <TestimonialMarquee />
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1200px]">
          <ScrollRevealItem index={0} className="block">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Common questions</h2>
            <dl className="mt-6 space-y-6">
              {faqItems.map((item) => (
                <div
                  key={item.q}
                  className="border-b border-[var(--border-subtle)] pb-6 last:border-0 last:pb-0"
                >
                  <dt className="font-medium text-[var(--text-primary)]">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] bg-transparent px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1200px]">
          <ScrollRevealItem index={0} className="block">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-4">
            <div className="grid grid-cols-2 gap-3 text-[13px] text-[var(--text-secondary)] md:flex md:flex-wrap md:items-center md:justify-center md:gap-x-8 md:gap-y-3">
              <span className="inline-flex items-center gap-2">
                <Shield className="size-4 text-[var(--accent)]" aria-hidden />
                Data never stored
              </span>
              <span className="hidden h-4 w-px bg-[var(--border)] md:block" />
              <span className="inline-flex items-center gap-2">
                <CreditCard className="size-4 text-[var(--accent)]" aria-hidden />
                Cancel anytime
              </span>
              <span className="hidden h-4 w-px bg-[var(--border)] md:block" />
              <span className="inline-flex items-center gap-2">
                <Star className="size-4 text-[var(--accent)]" aria-hidden />
                14-day money back
              </span>
              <span className="hidden h-4 w-px bg-[var(--border)] md:block" />
              <span className="inline-flex items-center gap-2">
                <Lock className="size-4 text-[var(--accent)]" aria-hidden />
                Encrypted credentials
              </span>
            </div>
          </div>
          </ScrollRevealItem>
        </div>
      </section>

      <section className="relative z-[1] bg-transparent px-6 py-8 text-center md:px-8 md:py-12">
        <div className="mx-auto w-full max-w-[1200px]">
          <ScrollRevealItem index={0} className="block">
          <p className="text-center text-sm text-[var(--text-secondary)]">
            <Link href="/" className="underline-offset-4 hover:underline">
              ← Back to app
            </Link>
          </p>
          </ScrollRevealItem>
        </div>
      </section>

    </div>
  );
}
