import { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog-data";

const today = new Date("2026-04-05");

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: "https://gethandover.uk",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: "https://gethandover.uk/halopsa-reporting",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/integrations/halopsa",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/integrations/zapier",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/about",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/compare",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: "https://gethandover.uk/contact",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/contact/sales",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/dashboard/team",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/features",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/features/automated-reports",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/features/qbr-generator",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/features/scheduled-reports",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/features/ai-insights",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/features/health-dashboard",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/features/psa-integration",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/features/exports",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/features/psa-push",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/features/white-label",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/integrations",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/integrations/connectwise",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/integrations/csv",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/join",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/pricing",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/roadmap",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/solutions/account-managers",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/solutions/msp-directors",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/solutions/project-managers",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/solutions/service-desk-managers",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/solutions/weekly-client-reporting",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/solutions/qbr",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/solutions/project-delivery",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/solutions/sla-reporting",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/solutions/halopsa",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/solutions/connectwise",
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/blog",
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://gethandover.uk/case-studies",
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://gethandover.uk/case-studies/msp-weekly-reporting",
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://gethandover.uk/privacy",
      lastModified: today,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://gethandover.uk/terms",
      lastModified: today,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `https://gethandover.uk${post.routePath}`,
    lastModified: new Date(post.dateISO),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...blogRoutes];
}
