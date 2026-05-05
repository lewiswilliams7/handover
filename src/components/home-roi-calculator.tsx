"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SLIDER_MAX = { clients: 20, minutes: 120, hourly: 150 } as const;

/** Professional plan monthly (GBP) — ROI multiple = savings ÷ this cost. */
export const HANDOVER_PRO_MONTHLY_GBP = 29;

export function computeRoiMetrics(clients: number, minutes: number, hourly: number) {
  const c = Number.isFinite(clients) && clients >= 1 ? clients : 1;
  const m = Number.isFinite(minutes) && minutes >= 1 ? minutes : 1;
  const h = Number.isFinite(hourly) && hourly >= 1 ? hourly : 1;
  const hoursSavedWeek = (c * m) / 60;
  const moneySavedMonth = hoursSavedWeek * h * (52 / 12);
  const handoverCost = HANDOVER_PRO_MONTHLY_GBP;
  const roiVal =
    handoverCost > 0 ? Math.round((moneySavedMonth / handoverCost) * 10) / 10 : 0;
  return {
    hoursWeek: Math.round(hoursSavedWeek * 10) / 10,
    moneyMonth: Math.round(moneySavedMonth),
    roi: roiVal,
  };
}

function useAnimatedNumber(target: number, decimals: 0 | 1 = 0) {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(display);
  displayRef.current = display;

  useEffect(() => {
    const from = displayRef.current;
    if (from === target) return;
    const start = performance.now();
    const duration = 520;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const v = from + (target - from) * eased;
      setDisplay(decimals === 0 ? Math.round(v) : Math.round(v * 10) / 10);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, decimals]);

  return display;
}

type HomeRoiCalculatorProps = {
  className?: string;
  /** Full marketing card (homepage) vs condensed with optional expand (pricing). */
  variant?: "full" | "condensed";
  /** Heading when variant is condensed (pricing). */
  condensedHeading?: string;
};

export function HomeRoiCalculator({
  className,
  variant = "full",
  condensedHeading = "Calculate your saving before you commit",
}: HomeRoiCalculatorProps) {
  const [clients, setClients] = useState(5);
  const [minutes, setMinutes] = useState(45);
  const [hourly, setHourly] = useState(50);
  const [clientsForRoi, setClientsForRoi] = useState(5);
  const [minutesForRoi, setMinutesForRoi] = useState(45);
  const [hourlyForRoi, setHourlyForRoi] = useState(50);
  const debounceRef = useRef<{
    clients: ReturnType<typeof setTimeout> | null;
    minutes: ReturnType<typeof setTimeout> | null;
    hourly: ReturnType<typeof setTimeout> | null;
  }>({ clients: null, minutes: null, hourly: null });

  const scheduleRoi = useCallback(
    (key: "clients" | "minutes" | "hourly", value: number, applyNow: boolean) => {
      const setter =
        key === "clients"
          ? setClientsForRoi
          : key === "minutes"
            ? setMinutesForRoi
            : setHourlyForRoi;
      const prev = debounceRef.current[key];
      if (prev) clearTimeout(prev);
      if (applyNow) {
        setter(value);
        debounceRef.current[key] = null;
        return;
      }
      debounceRef.current[key] = setTimeout(() => {
        setter(value);
        debounceRef.current[key] = null;
      }, 300);
    },
    [],
  );

  useEffect(() => {
    return () => {
      for (const k of ["clients", "minutes", "hourly"] as const) {
        const t = debounceRef.current[k];
        if (t) clearTimeout(t);
      }
    };
  }, []);

  const { hoursWeek, moneyMonth, roi } = useMemo(
    () => computeRoiMetrics(clientsForRoi, minutesForRoi, hourlyForRoi),
    [clientsForRoi, minutesForRoi, hourlyForRoi],
  );

  const moneyYear = useMemo(() => Math.round(moneyMonth * 12), [moneyMonth]);
  const weeksPmYear = useMemo(
    () => Math.round(((hoursWeek * 52) / 40) * 10) / 10,
    [hoursWeek],
  );

  const animMoneyMonth = useAnimatedNumber(moneyMonth, 0);
  const animHoursWeek = useAnimatedNumber(
    Math.round(hoursWeek * 10) / 10,
    1,
  );
  const animRoi = useAnimatedNumber(
    Math.round(roi * 10) / 10,
    1,
  );
  const animMoneyYear = useAnimatedNumber(moneyYear, 0);
  const animWeeksPm = useAnimatedNumber(weeksPmYear, 1);

  const [expanded, setExpanded] = useState(variant !== "condensed");

  const sliderClass =
    "h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--bg-secondary)] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:shadow-md";

  const syncFromSlider = (
    key: "clients" | "minutes" | "hourly",
    raw: number,
    setter: (n: number) => void,
  ) => {
    const v = Math.round(raw);
    setter(v);
    scheduleRoi(key, v, true);
  };

  const syncFromInput = (
    key: "clients" | "minutes" | "hourly",
    raw: string,
    setter: (n: number) => void,
  ) => {
    const n = Number.parseInt(raw.replace(/\D/g, ""), 10);
    const v = Number.isFinite(n) ? Math.max(1, n) : 1;
    setter(v);
    scheduleRoi(key, v, false);
  };

  const clientsSliderVal = Math.min(clients, SLIDER_MAX.clients);
  const minutesSliderVal = Math.min(minutes, SLIDER_MAX.minutes);
  const hourlySliderVal = Math.min(hourly, SLIDER_MAX.hourly);

  const resultsBlock = (
    <div
      className="mt-8 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--accent)_22%,var(--border))] bg-black/30 p-5 shadow-[0_18px_48px_-24px_rgba(15,23,42,0.75)] backdrop-blur-md sm:p-7"
    >
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
        Estimated savings
      </p>
      <p
        className="mt-2 text-center text-[clamp(2.5rem,8vw,3.75rem)] font-extrabold leading-none tracking-tight text-[var(--accent)]"
        style={{
          textShadow:
            "0 0 40px color-mix(in srgb, var(--accent) 42%, transparent), 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent)",
        }}
      >
        £{animMoneyMonth.toLocaleString("en-GB")}
        <span className="block text-lg font-semibold text-white/70 sm:inline sm:pl-2 sm:text-xl">
          /month
        </span>
      </p>
      <p className="mt-3 text-center text-sm text-white/65">
        That&apos;s{" "}
        <strong className="font-semibold text-white/90">{animWeeksPm}</strong> weeks of PM time
        reclaimed per year <span className="text-white/40">(40h weeks)</span>
      </p>
      <div className="mt-6 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2">
        <div className="rounded-[var(--radius)] bg-white/[0.04] px-4 py-3 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">Time / week</p>
          <p className="mt-1 text-xl font-bold text-[var(--accent)]">{animHoursWeek} hrs</p>
        </div>
        <div className="rounded-[var(--radius)] bg-white/[0.04] px-4 py-3 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">
            ROI vs Pro (£{HANDOVER_PRO_MONTHLY_GBP})
          </p>
          <p className="mt-1 text-xl font-bold text-[var(--accent)]">{animRoi}×</p>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-white/55">
        Annual savings ≈{" "}
        <strong className="text-[var(--accent)]">£{animMoneyYear.toLocaleString("en-GB")}</strong>
        <span className="text-white/40"> · </span>
        Handover Pro: <strong className="text-white/85">£{HANDOVER_PRO_MONTHLY_GBP}/mo</strong>
      </p>
    </div>
  );

  if (variant === "condensed" && !expanded) {
    return (
      <section
        className={cn(
          "mx-auto w-full max-w-[640px] rounded-[var(--radius-lg)] border border-[var(--border)] p-6 shadow-lg md:p-8",
          className,
        )}
        style={{
          background:
            "linear-gradient(155deg, rgba(15,23,42,0.92) 0%, rgba(30,41,59,0.88) 45%, rgba(15,23,42,0.95) 100%)",
          borderColor: "color-mix(in srgb, var(--accent) 28%, var(--border))",
        }}
      >
        <h3 className="border-l-4 border-[var(--accent)] pl-4 text-lg font-bold text-white md:text-xl">
          {condensedHeading}
        </h3>
        {resultsBlock}
        <button
          type="button"
          className="mt-6 w-full rounded-[var(--radius)] border border-[var(--accent)]/50 bg-transparent py-2.5 text-sm font-semibold text-[var(--accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
          onClick={() => setExpanded(true)}
        >
          Adjust for your team →
        </button>
      </section>
    );
  }

  const controls = (
    <div className="mt-6 space-y-5">
      <label className="block">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-white/90">
          <span>
            Clients you report on weekly: <strong className="text-[var(--accent)]">{clients}</strong>
          </span>
          <Input
            type="text"
            inputMode="numeric"
            aria-label="Clients per week"
            value={String(clients)}
            onChange={(e) => syncFromInput("clients", e.target.value, setClients)}
            className="h-8 w-[4.25rem] border-white/20 bg-black/30 px-2 text-center text-sm text-white"
          />
        </span>
        <input
          type="range"
          min={1}
          max={SLIDER_MAX.clients}
          value={clientsSliderVal}
          onChange={(e) => syncFromSlider("clients", Number(e.target.value), setClients)}
          className={cn(sliderClass, "mt-2")}
          style={{ accentColor: "var(--accent)" }}
        />
      </label>
      <label className="block">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-white/90">
          <span>
            Minutes per report manually: <strong className="text-[var(--accent)]">{minutes}</strong>
          </span>
          <Input
            type="text"
            inputMode="numeric"
            aria-label="Minutes per report"
            value={String(minutes)}
            onChange={(e) => syncFromInput("minutes", e.target.value, setMinutes)}
            className="h-8 w-[4.25rem] border-white/20 bg-black/30 px-2 text-center text-sm text-white"
          />
        </span>
        <input
          type="range"
          min={1}
          max={SLIDER_MAX.minutes}
          step={1}
          value={minutesSliderVal}
          onChange={(e) => syncFromSlider("minutes", Number(e.target.value), setMinutes)}
          className={cn(sliderClass, "mt-2")}
          style={{ accentColor: "var(--accent)" }}
        />
      </label>
      <label className="block">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-white/90">
          <span>
            Your hourly rate (£): <strong className="text-[var(--accent)]">{hourly}</strong>
          </span>
          <Input
            type="text"
            inputMode="numeric"
            aria-label="Hourly rate in GBP"
            value={String(hourly)}
            onChange={(e) => syncFromInput("hourly", e.target.value, setHourly)}
            className="h-8 w-[4.25rem] border-white/20 bg-black/30 px-2 text-center text-sm text-white"
          />
        </span>
        <input
          type="range"
          min={1}
          max={SLIDER_MAX.hourly}
          step={1}
          value={hourlySliderVal}
          onChange={(e) => syncFromSlider("hourly", Number(e.target.value), setHourly)}
          className={cn(sliderClass, "mt-2")}
          style={{ accentColor: "var(--accent)" }}
        />
      </label>
    </div>
  );

  return (
    <section
      className={cn(
        "mx-auto mt-10 w-full max-w-[720px] rounded-[var(--radius-lg)] border-2 p-4 shadow-2xl sm:p-6 md:mt-12 md:p-10",
        "marketing-card-interactive",
        className,
      )}
      style={{
        background:
          "linear-gradient(155deg, rgba(15,23,42,0.95) 0%, rgba(30,58,138,0.35) 42%, rgba(15,23,42,0.98) 100%)",
        borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)",
        boxShadow:
          "0 24px 64px -20px rgba(15, 23, 42, 0.55), 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent)",
      }}
    >
      {variant === "condensed" ? (
        <h3 className="border-l-4 border-[var(--accent)] pl-4 text-lg font-bold text-white md:text-xl">
          {condensedHeading}
        </h3>
      ) : (
        <>
          <h3 className="border-l-4 border-[var(--accent)] pl-4 text-xl font-bold text-white md:text-2xl">
            See how much time you&apos;ll save
          </h3>
          <p className="mt-2 text-sm text-white/70">Based on your team size and reporting habits.</p>
        </>
      )}

      {variant === "condensed" && expanded ? controls : variant === "full" ? controls : null}

      {resultsBlock}

      <Link
        href="/auth?tab=signup&returnTo=/welcome"
        className="mt-8 flex w-full min-h-[48px] items-center justify-center rounded-[var(--radius)] bg-[var(--accent)] px-4 py-3.5 text-center text-sm font-semibold leading-snug text-white shadow-lg transition-[transform,box-shadow] duration-200 hover:bg-[var(--accent-hover)] hover:shadow-xl active:scale-[0.98] sm:text-[15px]"
      >
        Save £{animMoneyYear.toLocaleString("en-GB")} this year - start free today →
      </Link>
    </section>
  );
}
