import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep local production builds isolated from development output, but let Vercel
  // use the standard .next directory expected by its build pipeline.
  distDir: process.env.VERCEL
    ? ".next"
    : process.env.NODE_ENV === "production"
      ? ".next-build"
      : ".next",
  reactCompiler: true,
  async redirects() {
    return [
      // Zapier was retired in Oct 2026. Keep old links and search results landing somewhere useful.
      { source: "/integrations/zapier", destination: "/integrations", permanent: true },
      // PitchIT posts retired in Oct 2026.
      { source: "/blog/pitchit-2026-handover-msp-accelerator", destination: "/blog", permanent: true },
      { source: "/blog/pitchit-2026-building-msp-saas", destination: "/blog", permanent: true },
    ];
  },
  compiler: {
    removeConsole: {
      exclude: ["error"],
    },
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "handover-sn",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
