import type { CSSProperties } from "react";

export const COLLECTION_COLOR_KEYS = [
  "accent",
  "emerald",
  "amber",
  "rose",
  "violet",
  "slate",
] as const;

export type CollectionColorKey = (typeof COLLECTION_COLOR_KEYS)[number];

export function isCollectionColorKey(s: string): s is CollectionColorKey {
  return (COLLECTION_COLOR_KEYS as readonly string[]).includes(s);
}

/** Dot colour using theme CSS variables only. */
export function collectionDotStyle(color: string): CSSProperties {
  const c = isCollectionColorKey(color) ? color : "accent";
  const map: Record<CollectionColorKey, string> = {
    accent: "var(--accent)",
    emerald: "var(--success)",
    amber: "var(--warning)",
    rose: "color-mix(in srgb, var(--danger) 82%, var(--accent) 18%)",
    violet: "color-mix(in srgb, var(--accent) 35%, #c4b5fd 65%)",
    slate: "var(--text-muted)",
  };
  return { backgroundColor: map[c] };
}
