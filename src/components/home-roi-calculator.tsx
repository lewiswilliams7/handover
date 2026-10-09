"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

export const HANDOVER_GROWTH_MONTHLY_GBP = 99;
export const HANDOVER_PRO_MONTHLY_GBP = 49;

export function computeRoiMetrics(
  clients: number,
  minutes: number,
  hourly: number,
) {
  const c = Number.isFinite(clients) && clients >= 0 ? clients : 0;
  const m = Number.isFinite(minutes) && minutes >= 0 ? minutes : 0;
  const h = Number.isFinite(hourly) && hourly >= 0 ? hourly : 0;
  const hoursSavedWeek = (c * m) / 60;
  const moneySavedMonth = hoursSavedWeek * h * (52 / 12);
  const handoverCost = HANDOVER_GROWTH_MONTHLY_GBP;
  const roiVal =
    handoverCost > 0 && moneySavedMonth > 0
      ? Math.round((moneySavedMonth / handoverCost) * 10) / 10
      : 0;
  return {
    hoursWeek: Math.round(hoursSavedWeek * 10) / 10,
    moneyMonth: Math.round(moneySavedMonth),
    roi: roiVal,
  };
}

function useAnimatedNumber(target: number, duration = 600) {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(target);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    const from = fromRef.current;
    const animate = (ts: number) => {
      if (!startRef.current) {
        startRef.current = ts;
      }
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, duration]);

  return display;
}

const EXTRA_CATEGORIES = [
  {
    id: "service_review",
    label: "Service Review preparation",
    description:
      "Time spent preparing monthly service review packs manually",
    minutesPerClient: 90,
    frequency: "monthly",
    weeklyMinutesPerClient: 90 / 4.3,
  },
  {
    id: "qbr",
    label: "QBR preparation",
    description:
      "Time spent preparing quarterly business review packs manually",
    minutesPerClient: 270,
    frequency: "quarterly",
    weeklyMinutesPerClient: 270 / 13,
  },
  {
    id: "meeting_prep",
    label: "Client meeting prep",
    description:
      "Researching account history before client calls and meetings",
    minutesPerClient: 30,
    frequency: "monthly",
    weeklyMinutesPerClient: 15,
  },
  {
    id: "psa_updates",
    label: "PSA ticket updates",
    description: "Manually updating PSA tickets after generating reports",
    minutesPerClient: 15,
    frequency: "weekly",
    weeklyMinutesPerClient: 15,
  },
] as const;

interface Props {
  variant?: "full" | "condensed";
  className?: string;
}

function CustomSlider({
  min,
  max,
  value,
  onChange,
  formatLabel: _formatLabel,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  formatLabel?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="relative w-full">
      <div className="relative h-1.5 w-full cursor-pointer rounded-full bg-white/[0.08]">
        <div
          className="absolute left-0 top-0 h-1.5 rounded-full bg-[#38bdf8]"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="absolute inset-0 h-1.5 w-full cursor-pointer opacity-0"
          style={{ margin: 0 }}
        />
        <div
          className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#38bdf8] bg-[#06091a] shadow-[0_0_8px_rgba(56,189,248,0.4)]"
          style={{
            left: `${pct}%`,
          }}
        />
      </div>
    </div>
  );
}

export function HomeRoiCalculator({
  variant: _variant = "full",
  className,
}: Props) {
  const [clients, setClients] = useState(10);
  const [minutes, setMinutes] = useState(85);
  const [hourly, setHourly] = useState(30);
  const [clientsForRoi, setClientsForRoi] = useState(10);
  const [minutesForRoi, setMinutesForRoi] = useState(85);
  const [hourlyForRoi, setHourlyForRoi] = useState(30);
  const [enabledExtras, setEnabledExtras] = useState<string[]>([
    "service_review",
    "qbr",
    "meeting_prep",
    "psa_updates",
  ]);
  const [showMethodology, setShowMethodology] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setClientsForRoi(clients);
      setMinutesForRoi(minutes);
      setHourlyForRoi(hourly);
    }, 300);
    return () => window.clearTimeout(t);
  }, [clients, minutes, hourly]);

  const toggleExtra = (id: string) => {
    setEnabledExtras((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
  };

  const totalWeeklyMinutes = useMemo(() => {
    const base = clientsForRoi * minutesForRoi;
    const extras = EXTRA_CATEGORIES.filter((c) =>
      enabledExtras.includes(c.id),
    ).reduce(
      (sum, cat) => sum + cat.weeklyMinutesPerClient * clientsForRoi,
      0,
    );
    return base + extras;
  }, [clientsForRoi, minutesForRoi, enabledExtras]);

  const hoursWeek = useMemo(
    () => Math.round((totalWeeklyMinutes / 60) * 10) / 10,
    [totalWeeklyMinutes],
  );

  const moneyMonth = useMemo(
    () =>
      Math.round((totalWeeklyMinutes / 60) * hourlyForRoi * (52 / 12)),
    [totalWeeklyMinutes, hourlyForRoi],
  );

  const moneyYear = useMemo(() => Math.round(moneyMonth * 12), [moneyMonth]);

  const roiMultiplier = useMemo(
    () =>
      moneyMonth > 0
        ? Math.round(moneyMonth / HANDOVER_GROWTH_MONTHLY_GBP)
        : 0,
    [moneyMonth],
  );

  const paybackDays = useMemo(
    () =>
      moneyMonth > 0
        ? Math.round((HANDOVER_GROWTH_MONTHLY_GBP / moneyMonth) * 30)
        : 0,
    [moneyMonth],
  );

  const animatedHours = useAnimatedNumber(hoursWeek);
  const animatedMoney = useAnimatedNumber(moneyMonth);
  const animatedRoi = useAnimatedNumber(roiMultiplier);
  const animatedYear = useAnimatedNumber(moneyYear);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-[16px] font-semibold text-white">
            Calculate your ROI
          </h3>
          <p className="mt-0.5 text-[12px] text-white/40">
            Adjust the inputs to match your team
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowMethodology(!showMethodology)}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[11px] text-white/40 transition-colors hover:text-white/60"
        >
          <Info className="size-3.5" />
          How we calculate this
        </button>
      </div>

      {showMethodology && (
        <div className="mb-6 space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-[12px] leading-relaxed text-white/50">
          <p className="font-semibold text-white/70">
            How we calculate your ROI
          </p>
          <p>
            <span className="font-medium text-white/60">Report writing:</span>{" "}
            Your clients times minutes per report equals weekly hours saved.
            Handover reduces this to 5 minutes per client (import, review,
            send).
          </p>
          <p>
            <span className="font-medium text-white/60">
              Service Review preparation:
            </span>{" "}
            Industry average of 90 minutes per client per month to prepare a
            service review pack manually, reduced to under 30 seconds. Averaged
            to a weekly figure (approximately 21 minutes per week per client).
          </p>
          <p>
            <span className="font-medium text-white/60">QBR preparation:</span>{" "}
            Industry average of 4.5 hours per client per quarter (270 minutes),
            reduced to under 60 seconds. Averaged to a weekly figure
            (approximately 21 minutes per week per client).
          </p>
          <p>
            <span className="font-medium text-white/60">Meeting prep:</span> 30
            minutes per client per meeting, assumed twice monthly (15 minutes
            per week equivalent). Eliminated by Client Intelligence account
            summaries in 30 seconds.
          </p>
          <p>
            <span className="font-medium text-white/60">PSA ticket updates:</span>{" "}
            15 minutes per report cycle updating PSA tickets. Eliminated by
            automatic push-back.
          </p>
          <p>
            <span className="font-medium text-white/60">Monthly saving:</span>{" "}
            Weekly hours times hourly rate times (52 divided by 12).
          </p>
          <p>
            <span className="font-medium text-white/60">ROI:</span> Monthly
            saving divided by £99 (Growth plan).
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
        <div className="space-y-6">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/30">
            Your team
          </p>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[12px] font-medium text-white/70">
                Clients you report on
              </label>
              <span className="text-[14px] font-bold tabular-nums text-white">
                {clients}
              </span>
            </div>
            <CustomSlider
              min={1}
              max={30}
              value={clients}
              onChange={(v) => {
                setClients(v);
                setClientsForRoi(v);
              }}
            />
            <div className="mt-1.5 flex justify-between">
              <span className="text-[10px] text-white/25">1</span>
              <span className="text-[10px] text-white/25">30</span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[12px] font-medium text-white/70">
                Minutes per report (manually)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={minutes === 0 ? "" : minutes}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || val === "0") {
                      setMinutes(0);
                      return;
                    }
                    const parsed = parseInt(val, 10);
                    if (!Number.isNaN(parsed)) {
                      setMinutes(Math.max(0, parsed));
                    }
                  }}
                  className="w-14 rounded-lg border border-white/[0.12] bg-white/[0.06] px-2 py-1 text-right text-[12px] text-white focus:outline-none focus:ring-1 focus:ring-[#38bdf8]/30"
                />
                <span className="text-[11px] text-white/40">min</span>
              </div>
            </div>
            <CustomSlider
              min={1}
              max={180}
              value={Math.max(1, minutes)}
              onChange={(v) => {
                setMinutes(v);
                setMinutesForRoi(v);
              }}
            />
            <div className="mt-1.5 flex justify-between">
              <span className="text-[10px] text-white/25">1 min</span>
              <span className="text-[10px] text-white/25">3 hrs</span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[12px] font-medium text-white/70">
                PM loaded hourly cost
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-white/40">£</span>
                <input
                  type="number"
                  value={hourly === 0 ? "" : hourly}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || val === "0") {
                      setHourly(0);
                      return;
                    }
                    const parsed = parseInt(val, 10);
                    if (!Number.isNaN(parsed)) {
                      setHourly(Math.max(0, parsed));
                    }
                  }}
                  className="w-14 rounded-lg border border-white/[0.12] bg-white/[0.06] px-2 py-1 text-right text-[12px] text-white focus:outline-none focus:ring-1 focus:ring-[#38bdf8]/30"
                />
              </div>
            </div>
            <CustomSlider
              min={1}
              max={150}
              value={Math.max(1, hourly)}
              onChange={(v) => {
                setHourly(v);
                setHourlyForRoi(v);
              }}
            />
            <div className="mt-1.5 flex justify-between">
              <span className="text-[10px] text-white/25">£1</span>
              <span className="text-[10px] text-white/25">£150</span>
            </div>
          </div>

          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-white/30">
              Also include
            </p>
            <div className="space-y-2">
              {EXTRA_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleExtra(cat.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-all",
                    enabledExtras.includes(cat.id)
                      ? "border-[#38bdf8]/25 bg-[#38bdf8]/[0.05]"
                      : "border-white/[0.06] bg-transparent opacity-40 hover:opacity-60",
                  )}
                >
                  <div>
                    <p
                      className={cn(
                        "text-[12px] font-medium",
                        enabledExtras.includes(cat.id)
                          ? "text-white"
                          : "text-white/50",
                      )}
                    >
                      {cat.label}
                    </p>
                    <p className="mt-0.5 text-[10px] text-white/30">
                      ~{Math.round(cat.weeklyMinutesPerClient)} min/client/week
                    </p>
                  </div>
                  <div
                    className={cn(
                      "ml-3 flex size-4 flex-shrink-0 items-center justify-center rounded-full border",
                      enabledExtras.includes(cat.id)
                        ? "border-[#38bdf8] bg-[#38bdf8]"
                        : "border-white/20",
                    )}
                  >
                    {enabledExtras.includes(cat.id) && (
                      <svg width="8" height="8" viewBox="0 0 8 8">
                        <path
                          d="M1 4l2 2 4-4"
                          stroke="#06091a"
                          strokeWidth="1.5"
                          fill="none"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-white/30">
            Your savings
          </p>

          <div className="mb-4 rounded-2xl border border-[#38bdf8]/20 bg-[#38bdf8]/[0.04] p-6 text-center">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#38bdf8]/60">
              Return on investment
            </p>
            <p className="text-[56px] font-bold leading-none tabular-nums text-[#38bdf8]">
              {animatedRoi}x
            </p>
            <p className="mt-2 text-[12px] text-white/30">
              Handover pays for itself in{" "}
              {paybackDays < 1 ? "less than a day" : `${paybackDays} days`}
            </p>
          </div>

          <div className="mb-4 divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-[12px] text-white/50">Hours saved per week</p>
              <p className="text-[13px] font-bold tabular-nums text-white">
                {animatedHours}h
              </p>
            </div>

            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-[12px] text-white/50">PM time saved per month</p>
              <p className="text-[13px] font-bold tabular-nums text-white">
                £{animatedMoney.toLocaleString("en-GB")}
              </p>
            </div>

            <div className="flex items-center justify-between bg-white/[0.02] px-4 py-3">
              <p className="text-[12px] text-white/50">Annual saving</p>
              <p className="text-[14px] font-bold tabular-nums text-white">
                £{animatedYear.toLocaleString("en-GB")}
              </p>
            </div>

            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-[12px] text-white/40">Handover Growth (£99/mo, or £79/mo annual)</p>
              <p className="text-[12px] tabular-nums text-white/40">£99/mo</p>
            </div>
          </div>

          {roiMultiplier >= 5 && (
            <div className="mb-4 rounded-xl border border-[#38bdf8]/25 bg-[#38bdf8]/[0.08] px-4 py-4">
              <p className="text-[13px] font-medium leading-relaxed text-white/80">
                {animatedYear >= 45000
                  ? "Your team recovers enough in PM time to cover a senior PM salary every year. Handover costs £1,188/year."
                  : animatedYear >= 25000
                    ? `Your team recovers £${animatedYear.toLocaleString("en-GB")} in PM time annually. That is more than half a senior PM salary from £79/month.`
                    : animatedYear >= 10000
                      ? `Your team recovers £${animatedYear.toLocaleString("en-GB")} in PM time annually at ${animatedRoi}x ROI.`
                      : `At ${animatedRoi}x ROI, Handover pays for itself in ${paybackDays} days.`}
              </p>
            </div>
          )}

          <Link
            href="/onboarding/connect"
            className="mt-auto block w-full rounded-xl bg-[#38bdf8] py-3 text-center text-[13px] font-semibold text-[#06091a] transition-all hover:scale-[1.02]"
          >
            Run the free PSA scan
          </Link>

          <p className="mt-3 text-center text-[10px] leading-relaxed text-white/20">
            Based on industry average preparation times. Your results may vary.
            Click &quot;How we calculate this&quot; for full methodology.
          </p>
        </div>
      </div>
    </div>
  );
}
