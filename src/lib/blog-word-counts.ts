import { BLOG_POSTS } from "@/lib/blog-data";
import { countWordsFromHtml, getDynamicArticleHtml } from "@/lib/blog-dynamic-articles-html";

const LEGACY_ARTICLE_WORD_COUNTS: Record<string, number> = {
  "connectwise-vs-halopsa-msp-client-reporting": 1450,
  "automate-msp-qbr-preparation": 1650,
  "handover-vs-rewst-vs-n8n-msp-reporting": 750,
  "why-msp-engineers-dread-friday-reporting": 630,
  "connectwise-manage-integration-msp-reporting": 1650,
  "push-to-halopsa-scheduled-reports": 170,
  "msp-weekly-reporting": 886,
};

export function getArticleWordCount(slug: string): number {
  const dynamicHtml = getDynamicArticleHtml(slug);
  if (dynamicHtml) return countWordsFromHtml(dynamicHtml);
  const legacy = LEGACY_ARTICLE_WORD_COUNTS[slug];
  if (legacy != null) return legacy;
  return 200;
}

export function getAllArticleWordCounts(): Record<string, number> {
  return Object.fromEntries(BLOG_POSTS.map((p) => [p.slug, getArticleWordCount(p.slug)]));
}
