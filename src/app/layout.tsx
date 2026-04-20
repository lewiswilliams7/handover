import type { Metadata } from "next";
import { Suspense } from "react";
import Head from "next/head";
import { Inter } from "next/font/google";
import "./globals.css";
import { MarketingFooter } from "@/components/marketing-footer";
import { Nav } from "@/components/nav";
import { PageLoadOverlay } from "@/components/page-load-overlay";
import { RouteTransition } from "@/components/route-transition";
import { ToastProvider } from "@/components/toasts";
import { CookieConsentBar } from "@/components/cookie-consent-bar";
import { MarketingConversionClient } from "@/components/marketing-conversion-client";
import { TrialAutoStartFromPendingStorage } from "@/components/trial-auto-start-pending-storage";
import { TrialAutoStartFromQuery } from "@/components/trial-auto-start-from-query";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const siteUrlRaw = process.env.NEXT_PUBLIC_APP_URL || "https://gethandover.uk";
const siteUrl = siteUrlRaw.replace(/\/$/, "");

/** ≤155 chars for Google SERP; synced across meta, Open Graph, and Twitter. */
const META_DESCRIPTION =
  "Handover — AI-powered client reporting for MSPs. Native HaloPSA and ConnectWise integration. Generate reports, push back to tickets, automate weekly updates.";

export const metadata: Metadata = {
  title: "Handover - AI-Powered MSP Reporting Tool",
  description: META_DESCRIPTION,
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "https://gethandover.uk",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    title: "Handover",
  },
  openGraph: {
    title: "Handover - AI-Powered MSP Reporting Tool",
    description: META_DESCRIPTION,
    url: "https://gethandover.uk",
    siteName: "Handover",
    images: [
      {
        url: "https://gethandover.uk/og-image.png",
        width: 1200,
        height: 630,
        alt: "Handover - MSP reporting tool",
      },
    ],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Handover - AI-Powered MSP Reporting Tool",
    description: META_DESCRIPTION,
    images: ["https://gethandover.uk/og-image.png"],
  },
  keywords: [
    "MSP",
    "managed service provider",
    "project management",
    "service delivery",
    "IT project manager",
    "client email",
    "status report",
    "action log",
    "HaloPSA",
    "MSP tools",
    "delivery management",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Handover",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description: META_DESCRIPTION,
              url: "https://gethandover.uk",
              offers: [
                {
                  "@type": "Offer",
                  name: "Professional",
                  price: "29",
                  priceCurrency: "GBP",
                  billingIncrement: "month",
                },
                {
                  "@type": "Offer",
                  name: "Team",
                  price: "79",
                  priceCurrency: "GBP",
                  billingIncrement: "month",
                },
              ],
              creator: {
                "@type": "Organization",
                name: "Handover",
                url: "https://gethandover.uk",
              },
            }),
          }}
        />
      </Head>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <ToastProvider>
          <Suspense fallback={null}>
            <TrialAutoStartFromQuery />
            <TrialAutoStartFromPendingStorage />
          </Suspense>
          <PageLoadOverlay />
          <Nav />
          <main className="flex min-h-0 flex-1 flex-col">
            <RouteTransition>{children}</RouteTransition>
          </main>
          <div
            style={{
              height: "1px",
              background:
                "linear-gradient(90deg, transparent, var(--border), transparent)",
            }}
          />
          <MarketingFooter />
          <CookieConsentBar />
          <MarketingConversionClient />
        </ToastProvider>
      </body>
    </html>
  );
}
