import { withSentryConfig } from "@sentry/nextjs";
import { internalIpV4Sync } from "internal-ip";
import type { NextConfig } from "next";

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const allowedOrigins = ["localhost"];

const ipAddress = internalIpV4Sync();

if (ipAddress) {
  allowedOrigins.push(ipAddress);
}

const nextConfig: NextConfig = {
  allowedDevOrigins: allowedOrigins,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mortiscope.s3.ap-southeast-1.amazonaws.com",
        port: "",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "mortiscope.s3.ap-southeast-1.amazonaws.com",
        port: "",
        pathname: "/profile-images/**",
      },
    ],
  },
  typedRoutes: true,
};

const baseConfig = process.env.ANALYZE === "true" ? withBundleAnalyzer(nextConfig) : nextConfig;

export default withSentryConfig(baseConfig, {
  org: "mortiscope",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
