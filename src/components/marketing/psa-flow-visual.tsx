"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { Lock } from "lucide-react";
import { useRef } from "react";

const READS = ["Tickets and timings", "Time logged", "Contracts and end dates", "Recurring invoices", "Quotes and orders", "Contacts"];
const OUTPUTS = ["This week list", "Revenue at Risk", "Value Receipts", "Renewal plans", "Client margin"];

/**
 * What Handover reads from the PSA and what it turns that into, as one flow.
 * A soft pulse on each connector is the only repeating motion, and it stops for
 * people who prefer reduced motion.
 */
export function PsaFlowVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  return (
    <figure
      ref={ref}
      role="img"
      aria-label="HaloPSA or ConnectWise connect read-only. Handover reads tickets, time, contracts, invoices, quotes and contacts, and turns them into the This week list, Revenue at Risk, Value Receipts, renewal plans and client margin."
      className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0b1322] p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)] sm:p-6"
    >
      <div aria-hidden className="flex flex-col items-stretch gap-3">
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { src: "/halopsa.png", name: "HaloPSA" },
            { src: "/connectwise.jpeg", name: "ConnectWise" },
          ].map((psa) => (
            <div key={psa.name} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <img src={psa.src} alt="" className="size-7 rounded-md bg-white object-contain p-0.5" />
              <span className="text-[13px] font-medium text-white">{psa.name}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2">
          <Connector run={inView && !reduce} />
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/[0.07] px-2.5 py-0.5 text-[11px] text-emerald-200">
            <Lock className="size-3" /> Read-only API key
          </span>
          <Connector run={inView && !reduce} delay={0.3} />
        </div>
        <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/[0.05] p-3.5">
          <div className="flex items-center gap-2">
            <img src="/icon2.png" alt="" className="size-5" />
            <span className="text-[13px] font-semibold text-white">Every week, Handover reads</span>
          </div>
          <ul className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {READS.map((item, index) => (
              <motion.li
                key={item}
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={inView || reduce ? { opacity: 1, y: 0 } : { opacity: 0 }}
                transition={{ delay: 0.2 + index * 0.06 }}
                className="rounded-md bg-white/[0.05] px-2.5 py-1.5 text-[11.5px] text-white/80"
              >
                {item}
              </motion.li>
            ))}
          </ul>
        </div>
        <div className="flex justify-center">
          <Connector run={inView && !reduce} delay={0.6} />
        </div>
        <ul className="flex flex-wrap justify-center gap-1.5">
          {OUTPUTS.map((item, index) => (
            <motion.li
              key={item}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={inView || reduce ? { opacity: 1, y: 0 } : { opacity: 0 }}
              transition={{ delay: 0.8 + index * 0.07 }}
              className="rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white"
            >
              {item}
            </motion.li>
          ))}
        </ul>
      </div>
    </figure>
  );
}

function Connector({ run, delay = 0 }: { run: boolean; delay?: number }) {
  return (
    <div className="relative h-5 w-px">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-300/10 via-cyan-300/60 to-cyan-300/10" />
      {run ? (
        <motion.span
          className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(56,189,248,0.9)]"
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.6, delay, repeat: Infinity, repeatDelay: 1.2 }}
        />
      ) : null}
    </div>
  );
}
