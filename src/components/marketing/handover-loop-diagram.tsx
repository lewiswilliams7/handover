import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";

/**
 * The Handover loop as a lifecycle: four stages around a square, with
 * Client Intelligence at the centre. Grid order puts the stages clockwise:
 *   1 Detect   2 Diagnose
 *   4 Prove    3 Act
 * Each card owns the connector leading out of it, so the arrows always sit in
 * the middle of the gap whatever height the cards end up.
 */

type Stage = {
  step: number;
  verb: string;
  name: string;
  body: string;
  href?: string;
};

const STAGES: Stage[] = [
  {
    step: 1,
    verb: "Detect",
    name: "Every client, every week",
    body: "Handover reads tickets, contracts and billing from HaloPSA or ConnectWise and checks each client against its own history.",
  },
  {
    step: 2,
    verb: "Diagnose",
    name: "Revenue at Risk™",
    body: "The clients that changed, ranked by the annual revenue they hold, with the reason attached.",
    href: "/features/revenue-at-risk",
  },
  {
    step: 3,
    verb: "Act",
    name: "Save Plays™",
    body: "The steps to take and an email to the client's decision-maker, ready to send.",
    href: "/features/save-plays",
  },
  {
    step: 4,
    verb: "Prove",
    name: "Value Receipts™",
    body: "Each client's decision-maker sees what you did every month. When a flagged client recovers, its value is counted as Saved Revenue.",
    href: "/features/value-receipts",
  },
];

/** Clockwise grid placement for the 2 x 2 layout. */
const GRID_POSITION: Record<number, string> = {
  1: "md:col-start-1 md:row-start-1",
  2: "md:col-start-2 md:row-start-1",
  3: "md:col-start-2 md:row-start-2",
  4: "md:col-start-1 md:row-start-2",
};

function StageCard({ stage }: { stage: Stage }) {
  const inner = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-cyan-300">
          {stage.step}. {stage.verb}
        </span>
        {stage.href ? (
          <span className="text-xs font-semibold text-white/40 transition-colors group-hover:text-cyan-200">
            How it works
          </span>
        ) : null}
      </div>
      <h3 className="mt-2 text-lg font-semibold text-white">{stage.name}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-[#94a3b8]">{stage.body}</p>
    </>
  );
  const shell =
    "group relative z-[1] block h-full rounded-2xl border border-white/[0.09] bg-[#0f1a2e]/95 p-6 backdrop-blur-sm transition-colors";
  return stage.href ? (
    <Link
      href={stage.href}
      className={`${shell} hover:border-cyan-300/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300`}
    >
      {inner}
    </Link>
  ) : (
    <div className={shell}>{inner}</div>
  );
}

/**
 * Dashed connector from one stage to the next, drawn in the gap the grid leaves
 * (gap-x-40 = 10rem across, gap-y-28 = 7rem down).
 */
function Connector({ step }: { step: number }) {
  const badge =
    "flex size-8 items-center justify-center rounded-full border border-cyan-300/40 bg-[#0b1629] text-cyan-300";
  if (step === 1) {
    return (
      <div className="absolute left-full top-1/2 z-[2] flex w-40 -translate-y-1/2 items-center justify-center" aria-hidden>
        <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-cyan-300/35" />
        <span className={`relative ${badge}`}>
          <ArrowRight className="size-4" />
        </span>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="absolute left-1/2 top-full z-[2] flex h-28 -translate-x-1/2 items-center justify-center" aria-hidden>
        <span className="absolute inset-y-0 left-1/2 border-l border-dashed border-cyan-300/35" />
        <span className={`relative ${badge}`}>
          <ArrowDown className="size-4" />
        </span>
      </div>
    );
  }
  if (step === 3) {
    return (
      <div className="absolute right-full top-1/2 z-[2] flex w-40 -translate-y-1/2 items-center justify-center" aria-hidden>
        <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-cyan-300/35" />
        <span className={`relative ${badge}`}>
          <ArrowLeft className="size-4" />
        </span>
      </div>
    );
  }
  return (
    <div className="absolute bottom-full left-1/2 z-[2] flex h-28 -translate-x-1/2 items-center justify-center" aria-hidden>
      <span className="absolute inset-y-0 left-1/2 border-l border-dashed border-cyan-300/35" />
      <span className={`relative ${badge}`}>
        <ArrowUp className="size-4" />
      </span>
    </div>
  );
}

export function HandoverLoopDiagram() {
  return (
    <div className="mx-auto max-w-[920px]">
      {/* Desktop: a square loop with the engine in the middle. */}
      <div className="relative hidden md:block">
        <div className="relative grid grid-cols-2 grid-rows-2 gap-x-40 gap-y-28">
          {STAGES.map((stage) => (
            <div key={stage.step} className={`relative ${GRID_POSITION[stage.step]}`}>
              <StageCard stage={stage} />
              <Connector step={stage.step} />
            </div>
          ))}
        </div>

        {/* The engine at the centre of the loop. */}
        <div className="absolute left-1/2 top-1/2 z-[3] w-[148px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-cyan-300/50 bg-[#0b1629] px-4 py-4 text-center shadow-[0_0_48px_-12px_rgba(56,189,248,0.55)]">
          <p className="text-[13px] font-semibold leading-snug text-white">
            Handover Client Intelligence™
          </p>
          <p className="mt-1 text-xs leading-snug text-white/55">One engine, one loop, every week</p>
        </div>
      </div>

      {/* Mobile: the same loop as a sequence that returns to the start. */}
      <ol className="space-y-3 md:hidden">
        {STAGES.map((stage, index) => (
          <li key={stage.step}>
            <StageCard stage={stage} />
            {index < STAGES.length - 1 ? (
              <span className="mx-auto mt-3 flex size-7 items-center justify-center rounded-full border border-cyan-300/40 text-cyan-300" aria-hidden>
                <ArrowDown className="size-3.5" />
              </span>
            ) : null}
          </li>
        ))}
        <li className="rounded-2xl border border-cyan-300/40 bg-[#0b1629] px-4 py-3 text-center text-sm text-white/70">
          Then it starts again with next week&apos;s scan, all run by{" "}
          <span className="font-semibold text-white">Handover Client Intelligence™</span>.
        </li>
      </ol>

      <p className="mt-10 text-center text-[15px] text-[#94a3b8]">
        Not sure it would work for you? See it on your own history first with{" "}
        <Link
          href="/features/churn-replay"
          className="font-semibold text-cyan-300 underline decoration-cyan-300/30 underline-offset-4 hover:text-cyan-200"
        >
          Churn Replay™
        </Link>
        .
      </p>
    </div>
  );
}
