"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Testimonial = {
  quote: string;
  name: string;
  company?: string;
  highlights: string[];
  /** Optional brand mark (SVG/PNG in /public). Shown subdued so the quote stays primary. */
  brandLogoSrc?: string;
  brandLogoAlt?: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "A great concept with strong initial implementation. Exactly the kind of tool my team would use. The niche focus on MSP teams is smart and the integration approach is the right direction.",
    name: "Blake H.",
    company: "IBM",
    highlights: ["kind of tool"],
    brandLogoSrc: "/ibm.png",
    brandLogoAlt: "IBM",
  },
  {
    quote: "Really good product - this is exactly the kind of tool the industry needs.",
    name: "Delivery Lead",
    company: "Computacenter",
    highlights: ["kind of tool"],
    brandLogoSrc: "/computacenter.png",
    brandLogoAlt: "Computacenter",
  },
  {
    quote:
      "The worst thing about working at Computacenter was doing the weekly update reports. This solves that problem completely.",
    name: "Senior Project Manager",
    company: "Computacenter",
    highlights: ["solves that problem"],
    brandLogoSrc: "/computacenter.png",
    brandLogoAlt: "Computacenter",
  },
  {
    quote:
      "Doing this manually for our clients takes a significant amount of time every week. Handover cuts that down to seconds - it's exactly the kind of tool we've needed.",
    name: "Senior IT Consultant",
    company: "IT Services",
    highlights: ["seconds"],
  },
  {
    quote:
      "Wish this had been around years ago when I was at MSPs. Love what Handover is doing - this is going to save delivery teams hours every week.",
    name: "Director, MSP Operations",
    highlights: ["save hours"],
  },
  {
    quote:
      "I was spending an hour a day on client reporting - 30 minutes updating and 30 minutes compiling. Now it takes 30 seconds and I have an extra hour back in my day.",
    name: "Service Delivery Manager",
    company: "Tata Consultancy Services",
    highlights: ["30 seconds"],
    brandLogoSrc: "/tata.png",
    brandLogoAlt: "Tata Consultancy Services",
  },
];

function renderQuoteWithHighlights(quote: string, highlights: string[]) {
  const parts: Array<{ text: string; highlighted: boolean }> = [{ text: quote, highlighted: false }];
  for (const phrase of highlights) {
    const next: Array<{ text: string; highlighted: boolean }> = [];
    for (const part of parts) {
      if (part.highlighted) {
        next.push(part);
        continue;
      }
      const idx = part.text.indexOf(phrase);
      if (idx === -1) {
        next.push(part);
        continue;
      }
      const before = part.text.slice(0, idx);
      const match = part.text.slice(idx, idx + phrase.length);
      const after = part.text.slice(idx + phrase.length);
      if (before) next.push({ text: before, highlighted: false });
      next.push({ text: match, highlighted: true });
      if (after) next.push({ text: after, highlighted: false });
    }
    parts.splice(0, parts.length, ...next);
  }

  return parts.map((part, idx) =>
    part.highlighted ? (
      <span key={idx} className="text-[#C9A84C]">
        {part.text}
      </span>
    ) : (
      <span key={idx}>{part.text}</span>
    ),
  );
}

function TestimonialCard({ item, layout }: { item: Testimonial; layout: "mobile" | "desktop" }) {
  const isDesktop = layout === "desktop";
  return (
    <article
      className={
        isDesktop
          ? "feature-page-card flex min-h-[320px] w-[340px] min-w-[340px] shrink-0 flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-6 shadow-sm md:w-[380px] md:min-w-[380px]"
          : "feature-page-card flex w-full min-w-0 max-w-full flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5 shadow-sm sm:p-6"
      }
    >
      <div className="flex gap-1 text-[#EF9F27]" style={{ marginBottom: "1rem" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} aria-hidden>
            ★
          </span>
        ))}
      </div>
      {item.brandLogoSrc ? (
        <div className="mb-3 flex w-full justify-start sm:mb-4">
          <img
            src={item.brandLogoSrc}
            alt={item.brandLogoAlt ?? ""}
            width={120}
            height={40}
            loading="lazy"
            decoding="async"
            className="h-auto max-h-8 w-auto max-w-[min(200px,calc(100vw-4rem))] object-contain object-left opacity-60 grayscale sm:max-h-9 sm:max-w-[220px]"
          />
        </div>
      ) : null}
      <p
        className={
          isDesktop
            ? "min-h-[150px] break-words italic text-[15px] leading-[1.7] text-[var(--text-primary)]"
            : "break-words italic text-[15px] leading-[1.65] text-[var(--text-primary)] [overflow-wrap:anywhere]"
        }
      >
        &ldquo;{renderQuoteWithHighlights(item.quote, item.highlights)}&rdquo;
      </p>
      <p className="mt-4 text-[13px] font-semibold text-[var(--text-primary)]">{item.name}</p>
      {item.company ? <p className="text-[13px] text-[var(--text-secondary)]">{item.company}</p> : null}
      <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
        <span aria-hidden>✓</span>
        Verified
      </p>
    </article>
  );
}

function TestimonialMarqueeDesktop() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const pauseUntilRef = useRef(0);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    let frame = 0;
    let lastTs = performance.now();
    const speedPxPerSecond = 30;

    const tick = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      const now = performance.now();
      const clickPaused = now < pauseUntilRef.current;
      if (!paused && !clickPaused) {
        const halfWidth = el.scrollWidth / 2;
        el.scrollLeft += speedPxPerSecond * dt;
        if (el.scrollLeft >= halfWidth) {
          el.scrollLeft -= halfWidth;
        }
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused]);

  const nudge = (direction: 1 | -1) => {
    const el = viewportRef.current;
    if (!el) return;
    const firstCard = el.querySelector("article");
    const gap = 20;
    const step = (firstCard instanceof HTMLElement ? firstCard.offsetWidth : 340) + gap;
    pauseUntilRef.current = performance.now() + 5000;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  const repeated = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <div className="testimonial-marquee relative mt-10">
      <button
        type="button"
        aria-label="Previous testimonial"
        onClick={() => nudge(-1)}
        className="absolute top-1/2 left-1 z-30 hidden -translate-y-1/2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)]/90 p-2 text-[var(--text-muted)] shadow-sm transition-colors hover:text-[var(--text-primary)] md:block"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Next testimonial"
        onClick={() => nudge(1)}
        className="absolute top-1/2 right-1 z-30 hidden -translate-y-1/2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)]/90 p-2 text-[var(--text-muted)] shadow-sm transition-colors hover:text-[var(--text-primary)] md:block"
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>

      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden md:block"
        style={{
          width: "170px",
          background:
            "linear-gradient(to right, var(--bg-primary) 0px, var(--bg-primary) 20px, color-mix(in srgb, var(--bg-primary) 92%, transparent) 70px, transparent 170px)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden md:block"
        style={{
          width: "170px",
          background:
            "linear-gradient(to left, var(--bg-primary) 0px, var(--bg-primary) 20px, color-mix(in srgb, var(--bg-primary) 92%, transparent) 70px, transparent 170px)",
        }}
      />

      <div
        ref={viewportRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="overflow-x-hidden"
      >
        <div className="flex w-max gap-5">
          {repeated.map((item, idx) => (
            <TestimonialCard key={`${item.name}-${idx}`} item={item} layout="desktop" />
          ))}
        </div>
      </div>
    </div>
  );
}

function TestimonialCarouselMobile() {
  const [index, setIndex] = useState(0);
  const item = TESTIMONIALS[index] ?? TESTIMONIALS[0];

  const go = (direction: 1 | -1) => {
    setIndex((i) => {
      const n = TESTIMONIALS.length;
      return (i + direction + n) % n;
    });
  };

  return (
    <div className="mt-10 w-full min-w-0 px-1">
      <div className="relative flex w-full min-w-0 items-stretch gap-2">
        <button
          type="button"
          aria-label="Previous testimonial"
          onClick={() => go(-1)}
          className="z-20 mt-[4.5rem] inline-flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)] shadow-sm transition-colors hover:text-[var(--text-primary)]"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>

        <div className="min-w-0 flex-1">
          <TestimonialCard item={item} layout="mobile" />
        </div>

        <button
          type="button"
          aria-label="Next testimonial"
          onClick={() => go(1)}
          className="z-20 mt-[4.5rem] inline-flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)] shadow-sm transition-colors hover:text-[var(--text-primary)]"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      <div
        className="mt-4 flex flex-wrap items-center justify-center gap-2 px-2"
        role="tablist"
        aria-label="Testimonial slides"
      >
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Testimonial ${i + 1} of ${TESTIMONIALS.length}`}
            onClick={() => setIndex(i)}
            className={
              i === index
                ? "size-2.5 rounded-full bg-[var(--accent)] ring-2 ring-[var(--accent)]/35"
                : "size-2.5 rounded-full bg-[var(--border)] transition-colors hover:bg-[var(--text-muted)]"
            }
          />
        ))}
      </div>
    </div>
  );
}

export function TestimonialMarquee() {
  const [isMdUp, setIsMdUp] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsMdUp(mq.matches);
    const fn = () => setIsMdUp(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  return isMdUp ? <TestimonialMarqueeDesktop /> : <TestimonialCarouselMobile />;
}
