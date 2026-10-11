import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";

/**
 * The Handover lifecycle: six stages around Handover Client Intelligence™.
 * On desktop the stages run clockwise around a rectangle, with the engine in
 * the middle row:
 *
 *   1 Detect  →  2 Diagnose  →  3 Act
 *      ↑      Client Intelligence    ↓
 *   6 Count   ←  5 Renew    ←  4 Prove
 *
 * Each stage names the products that do the work, and links to them.
 */

type Product = { name: string; href: string };

type Stage = {
  step: number;
  verb: string;
  title: string;
  body: string;
  products: Product[];
};

const STAGES: Stage[] = [
  {
    step: 1,
    verb: "Detect",
    title: "Every client, every week",
    body: "Reads tickets, contracts and billing from your PSA and checks each client against its own history. The week lands in your inbox on Monday.",
    products: [{ name: "The Monday Brief", href: "/features/monday-brief" }],
  },
  {
    step: 2,
    verb: "Diagnose",
    title: "Who is slipping, and who pays",
    body: "The clients that changed, ranked by the revenue they hold, and which ones create more work than they pay for.",
    products: [
      { name: "Revenue at Risk™", href: "/features/revenue-at-risk" },
      { name: "Client Margin", href: "/features/client-margin" },
    ],
  },
  {
    step: 3,
    verb: "Act",
    title: "The next move, written",
    body: "The steps to take and an email to the client's decision-maker, addressed and ready to send.",
    products: [{ name: "Save Plays™", href: "/features/save-plays" }],
  },
  {
    step: 4,
    verb: "Prove",
    title: "Show what they pay for",
    body: "A branded one-page summary each month: the work done, how fast, and what's worth knowing.",
    products: [{ name: "Value Receipts™", href: "/features/value-receipts" }],
  },
  {
    step: 5,
    verb: "Renew",
    title: "Walk into renewals ready",
    body: "Every contract ending this year, with what to do first: save it, fix it, reprice it or renew early.",
    products: [{ name: "Renewal Radar", href: "/features/renewal-radar" }],
  },
  {
    step: 6,
    verb: "Count",
    title: "Know what you kept",
    body: "When a flagged client recovers, its annual value is counted. The return on Handover, in your own numbers.",
    products: [{ name: "Saved Revenue", href: "/features/revenue-at-risk#saved-revenue" }],
  },
];

/** Where each stage sits in the 3 x 3 desktop grid (middle row is the engine). */
const GRID_POSITION: Record<number, string> = {
  1: "md:col-start-1 md:row-start-1",
  2: "md:col-start-2 md:row-start-1",
  3: "md:col-start-3 md:row-start-1",
  4: "md:col-start-3 md:row-start-3",
  5: "md:col-start-2 md:row-start-3",
  6: "md:col-start-1 md:row-start-3",
};

function StageCard({ stage }: { stage: Stage }) {
  return (
    <div className="relative z-[1] flex h-full flex-col rounded-2xl border border-white/[0.09] bg-[#0f1a2e]/95 p-5 backdrop-blur-sm">
      <span className="text-sm font-semibold text-cyan-300">
        {stage.step}. {stage.verb}
      </span>
      <h3 className="mt-1.5 text-[17px] font-semibold leading-snug text-white">{stage.title}</h3>
      <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-[#94a3b8]">{stage.body}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {stage.products.map((product) => (
          <Link
            key={product.href}
            href={product.href}
            className="inline-flex items-center gap-1 rounded-full border border-cyan-300/25 bg-cyan-300/[0.06] px-2.5 py-1 text-xs font-semibold text-cyan-100 transition-colors hover:border-cyan-300/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            {product.name}
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        ))}
      </div>
    </div>
  );
}

const BADGE =
  "relative flex size-7 items-center justify-center rounded-full border border-cyan-300/40 bg-[#0b1629] text-cyan-300";

/** Connector out of a stage, drawn in the grid gap (gap-x-12 = 3rem, gap-y-16 = 4rem). */
function Connector({ step }: { step: number }) {
  if (step === 1 || step === 2) {
    return (
      <div className="absolute left-full top-1/2 z-[2] flex w-12 -translate-y-1/2 items-center justify-center" aria-hidden>
        <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-cyan-300/35" />
        <span className={BADGE}>
          <ArrowRight className="size-3.5" />
        </span>
      </div>
    );
  }
  if (step === 4 || step === 5) {
    return (
      <div className="absolute right-full top-1/2 z-[2] flex w-12 -translate-y-1/2 items-center justify-center" aria-hidden>
        <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-cyan-300/35" />
        <span className={BADGE}>
          <ArrowLeft className="size-3.5" />
        </span>
      </div>
    );
  }
  return null;
}

export function HandoverLoopDiagram() {
  return (
    <div className="mx-auto max-w-[1080px]">
      {/* Desktop: the loop around the engine. */}
      <div className="relative hidden md:block">
        <div className="relative grid grid-cols-3 grid-rows-[auto_minmax(7rem,auto)_auto] gap-x-12 gap-y-16">
          {STAGES.map((stage) => (
            <div key={stage.step} className={`relative ${GRID_POSITION[stage.step]}`}>
              <StageCard stage={stage} />
              <Connector step={stage.step} />
            </div>
          ))}

          {/* Down the right-hand column, from Act to Prove. */}
          <div className="relative md:col-start-3 md:row-start-2" aria-hidden>
            <span className="absolute -inset-y-16 left-1/2 border-l border-dashed border-cyan-300/35" />
            <span className={`${BADGE} absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>
              <ArrowDown className="size-3.5" />
            </span>
          </div>

          {/* Up the left-hand column, from Count back to Detect. */}
          <div className="relative md:col-start-1 md:row-start-2" aria-hidden>
            <span className="absolute -inset-y-16 left-1/2 border-l border-dashed border-cyan-300/35" />
            <span className={`${BADGE} absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>
              <ArrowUp className="size-3.5" />
            </span>
          </div>

          {/* The engine at the centre of the loop. */}
          <div className="relative z-[3] flex items-center justify-center md:col-start-2 md:row-start-2">
            <div className="w-full rounded-2xl border border-cyan-300/50 bg-[#0b1629] px-5 py-5 text-center shadow-[0_0_56px_-12px_rgba(56,189,248,0.6)]">
              <p className="text-[15px] font-semibold leading-snug text-white">Handover Client Intelligence™</p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/60">
                One engine behind every stage: each client measured against its own history, every week.
              </p>
              <Link
                href="/features/client-intelligence"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
              >
                How it works <ArrowRight className="size-3" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: the engine first, then the stages in order, then back to the start. */}
      <div className="md:hidden">
        <div className="rounded-2xl border border-cyan-300/50 bg-[#0b1629] px-4 py-4 text-center shadow-[0_0_40px_-14px_rgba(56,189,248,0.6)]">
          <p className="text-sm font-semibold text-white">Handover Client Intelligence™</p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            One engine behind every stage: each client measured against its own history, every week.
          </p>
        </div>
        <ol className="mt-4 space-y-3">
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
        </ol>
        <p className="mt-4 rounded-2xl border border-white/10 px-4 py-3 text-center text-sm text-white/65">
          Then it starts again with next week&apos;s scan.
        </p>
      </div>

      <p className="mt-12 text-center text-[15px] text-[#94a3b8]">
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
