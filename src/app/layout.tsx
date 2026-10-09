import type { Metadata } from "next";
import Head from "next/head";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import { PageLoadOverlay } from "@/components/page-load-overlay";
import { RootLayoutChrome } from "@/components/root-layout-chrome";
import { ToastProvider } from "@/components/toasts";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const siteUrlRaw = process.env.NEXT_PUBLIC_APP_URL || "https://gethandover.uk";
const siteUrl = siteUrlRaw.replace(/\/$/, "");

/** ≤155 chars for Google SERP; synced across meta, Open Graph, and Twitter. */
const META_DESCRIPTION =
  "Handover connects to HaloPSA or ConnectWise and surfaces the client accounts where commercial, service or relationship behaviour has materially changed. Built for MSPs.";

const META_TITLE = "Handover - Know Which Clients Need Your Attention";

export const metadata: Metadata = {
  title: META_TITLE,
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
    title: META_TITLE,
    description: META_DESCRIPTION,
    url: "https://gethandover.uk",
    siteName: "Handover",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: META_TITLE,
    description: META_DESCRIPTION,
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
    <html lang="en" className={`${inter.variable} antialiased dark`}>
      <Head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-8DN9FSLDRC" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-8DN9FSLDRC');`,
          }}
        />
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
          <PageLoadOverlay />
          <RootLayoutChrome>{children}</RootLayoutChrome>
        </ToastProvider>
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "x0t59k2tbn");`,
          }}
        />
      </body>
    </html>
  );
}
