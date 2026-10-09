const SITE = "https://gethandover.uk";

export function buildBlogArticleJsonLd(opts: {
  headline: string;
  description: string;
  datePublished: string;
  url: string;
  keywords?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    datePublished: opts.datePublished,
    dateModified: opts.datePublished,
    author: {
      "@type": "Person",
      name: "Lewis Williams",
      jobTitle: "Founder",
      worksFor: {
        "@type": "Organization",
        name: "Handover",
        url: SITE,
      },
    },
    publisher: {
      "@type": "Organization",
      name: "Handover",
      url: SITE,
      logo: {
        "@type": "ImageObject",
        url: `${SITE}/opengraph-image`,
      },
    },
    image: `${SITE}/opengraph-image`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": opts.url,
    },
    url: opts.url,
    ...(opts.keywords?.length ? { keywords: opts.keywords.join(", ") } : {}),
  };
}
