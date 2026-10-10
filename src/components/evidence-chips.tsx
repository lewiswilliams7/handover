"use client";

import { useState } from "react";

import { buildHaloScanEvidenceDeepLink } from "@/lib/psa/scan-deep-links";
import { parseScanEvidence } from "@/lib/psa/scan-evidence";

const VISIBLE = 5;

function kindLabel(kind: string): string {
  return kind === "project" ? "Project" : kind === "quote" ? "Quote" : "Ticket";
}

/** The records behind a finding, as numbered chips that open in the PSA. */
export function EvidenceChips({
  evidenceIds,
  instanceUrl,
  psaName = "HaloPSA",
}: {
  evidenceIds: unknown;
  instanceUrl: string | null | undefined;
  psaName?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const links = parseScanEvidence(evidenceIds).flatMap((ref) => {
    const href = buildHaloScanEvidenceDeepLink(instanceUrl, ref);
    return href ? [{ href, kind: ref.kind, id: ref.id }] : [];
  });
  if (links.length === 0) return null;
  const visible = showAll ? links : links.slice(0, VISIBLE);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
      <span className="mr-1 text-[var(--text-muted)]">Evidence in {psaName}:</span>
      {visible.map((link, index) => (
        <a
          key={`${link.href}-${index}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          title={`Open ${kindLabel(link.kind).toLowerCase()} ${link.id} in ${psaName}`}
          className="rounded-md border border-cyan-300/25 bg-cyan-300/[0.06] px-2 py-0.5 font-mono font-semibold text-cyan-100 transition-colors hover:border-cyan-200/60 hover:bg-cyan-300/15"
        >
          {link.kind === "ticket" ? "#" : `${kindLabel(link.kind)} `}
          {link.id}
        </a>
      ))}
      {links.length > VISIBLE ? (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="rounded-md px-1.5 py-0.5 font-semibold text-[var(--text-secondary)] hover:text-white"
        >
          {showAll ? "Show fewer" : `+${links.length - VISIBLE} more`}
        </button>
      ) : null}
    </div>
  );
}
