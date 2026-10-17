import { readdirSync, statSync } from "node:fs";
import path from "node:path";

import type { MetadataRoute } from "next";

import { BLOG_POSTS } from "@/lib/blog-data";
import { CASE_STUDIES } from "@/lib/marketing/case-studies";
import { COMPARE_PAGES } from "@/lib/marketing/compare-pages";
import { SOLUTION_TITLES } from "@/lib/marketing/solution-slugs";
import { PRESS_RELEASES } from "@/lib/press-releases";

const ORIGIN = "https://gethandover.uk";

/** Built once per deploy, when the source folder is there to read. */
export const dynamic = "force-static";

/**
 * The sitemap builds itself. Every public page.tsx under src/app is found at
 * build time, so a new page appears on the next deploy without editing this
 * file. Pages behind sign-in, onboarding steps and internal routes are left
 * out by prefix. Dynamic pages come from the same lists that render them.
 */

/** Route prefixes that are never public marketing pages. */
const PRIVATE_PREFIXES = [
  "/account",
  "/admin",
  "/api",
  "/attention",
  "/auth",
  "/checkout",
  "/clients",
  "/dashboard",
  "/margin",
  "/onboarding",
  "/portal",
  "/receipts",
  "/referral",
  "/renewals",
  "/settings",
  "/signup",
  "/week",
  "/welcome",
];

function isPrivate(route: string): boolean {
  if (route.startsWith("/zz-")) return true;
  return PRIVATE_PREFIXES.some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
}

/** Every static route with a page.tsx, e.g. "/features/revenue-at-risk". */
function discoverRoutes(): string[] {
  const appDir = path.join(process.cwd(), "src", "app");
  const routes: string[] = [];
  const walk = (dir: string, segments: string[]) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    if (entries.includes("page.tsx") || entries.includes("page.ts")) {
      routes.push(`/${segments.join("/")}`.replace(/\/$/, "") || "/");
    }
    for (const entry of entries) {
      const full = path.join(dir, entry);
      if (!statSync(full).isDirectory()) continue;
      // Dynamic segments come from data below; private folders and slots are skipped.
      if (entry.startsWith("[") || entry.startsWith("_") || entry.startsWith("@") || entry === "node_modules") continue;
      // Route groups such as (app) do not appear in the URL.
      const isGroup = entry.startsWith("(") && entry.endsWith(")");
      walk(full, isGroup ? segments : [...segments, entry]);
    }
  };
  walk(appDir, []);
  return routes;
}

/** Core pages, used if the source folder cannot be read where the sitemap is built. */
const FALLBACK_ROUTES = [
  "/",
  "/pricing",
  "/features",
  "/integrations",
  "/integrations/halopsa",
  "/integrations/connectwise",
  "/solutions",
  "/compare",
  "/case-studies",
  "/blog",
  "/press",
  "/about",
  "/security",
  "/privacy",
  "/terms",
];

function priorityFor(route: string): number {
  if (route === "/") return 1;
  if (route === "/pricing") return 0.95;
  if (/^\/(features|integrations|solutions)(\/|$)/.test(route)) return 0.85;
  if (/^\/(compare|case-studies)(\/|$)/.test(route)) return 0.8;
  if (/^\/(blog|press)(\/|$)/.test(route)) return 0.7;
  if (/^\/(privacy|terms)$/.test(route)) return 0.3;
  return 0.6;
}

function changeFor(route: string): MetadataRoute.Sitemap[number]["changeFrequency"] {
  if (route === "/blog") return "weekly";
  if (/^\/(privacy|terms|security)$/.test(route)) return "yearly";
  return "monthly";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const built = new Date();
  const dated = new Map<string, Date>();
  const add = (route: string, date?: string) => {
    if (date) dated.set(route, new Date(date));
    else if (!dated.has(route)) dated.set(route, built);
  };

  const discovered = discoverRoutes();
  for (const route of discovered.length > 0 ? discovered : FALLBACK_ROUTES) {
    if (!isPrivate(route)) add(route);
  }
  for (const post of BLOG_POSTS) add(post.routePath, post.dateISO);
  for (const release of PRESS_RELEASES) add(`/press/${release.slug}`, release.dateISO);
  for (const page of COMPARE_PAGES) add(`/compare/${page.slug}`, page.updated);
  for (const study of CASE_STUDIES) add(`/case-studies/${study.slug}`, study.updated);
  for (const slug of Object.keys(SOLUTION_TITLES)) add(`/solutions/${slug}`);

  return [...dated.entries()]
    .sort(([a], [b]) => (a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b)))
    .map(([route, lastModified]) => ({
      url: route === "/" ? ORIGIN : `${ORIGIN}${route}`,
      lastModified,
      changeFrequency: changeFor(route),
      priority: priorityFor(route),
    }));
}
