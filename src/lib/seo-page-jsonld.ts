export function softwareApplicationJsonLd(opts: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: opts.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: opts.description,
    url: opts.url,
    offers: {
      "@type": "Offer",
      price: "29",
      priceCurrency: "GBP",
    },
    creator: {
      "@type": "Organization",
      name: "Handover",
      url: "https://gethandover.uk",
    },
  };
}
