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

/**
 * Content-Security-Policy directives for the application.
 */
const cspDirectives = [
  "default-src 'self'",
  // Next.js App Router requires 'unsafe-inline' for SSR hydration scripts.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com`,
  // Tailwind CSS and Radix UI/shadcn primitives inject inline styles at runtime.
  "style-src 'self' 'unsafe-inline'",
  // S3 bucket for profile pictures (presigned GET URLs fetched directly by the browser).
  "img-src 'self' data: blob: https://mortiscope.s3.ap-southeast-1.amazonaws.com",
  // next/font/google self-hosts fonts — no googleapis.com needed at runtime.
  "font-src 'self' data:",
  // External APIs: Sentry (monitoring), GitHub Pages (address data), S3 (uploads), Open-Meteo (weather), and Vercel (analytics & speed insights).
  "connect-src 'self' https://o4510634468376576.ingest.us.sentry.io https://o4510634468376576.ingest.us.sentry.io/api/ https://isaacdarcilla.github.io https://mortiscope.s3.ap-southeast-1.amazonaws.com https://geocoding-api.open-meteo.com https://archive-api.open-meteo.com https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  // Prohibit <object>, <embed>, <applet> entirely.
  "object-src 'none'",
  // Prohibit audio/video embeds.
  "media-src 'none'",
  // Sentry Replay and other Web Worker scripts are spawned from blob: URLs.
  "worker-src blob: 'self'",
  // Prohibit <iframe> embeds from external origins; allow same-origin only.
  "frame-ancestors 'self'",
  // Restrict <base> tag to same origin to prevent base-tag hijacking.
  "base-uri 'self'",
  // Restrict where forms may submit to same origin.
  "form-action 'self'",
  // Automatically upgrade plain HTTP requests to HTTPS (has no effect on localhost).
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  // Enforces HTTPS for 2 years, includes subdomains, and opts in to HSTS preload list.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Prevents MIME-type sniffing attacks.
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Prevents the page from being framed by external sites (clickjacking defence).
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  // Enables the browser's DNS prefetching for improved performance.
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  // Sends the full origin for same-origin requests; strips it to origin-only
  // for cross-origin navigations; sends nothing for downgrades (HTTPS → HTTP).
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Disables browser features not used by the application.
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "interest-cohort=()",
      "payment=()",
      "usb=()",
      "magnetometer=()",
      "gyroscope=()",
      "accelerometer=()",
    ].join(", "),
  },
  // Prevents browsers that support CORP from loading resources cross-origin.
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
  // Allows the browsing context to be embedded cross-origin but restricts opening cross-origin windows without explicit opt-in.
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  // The full Content-Security-Policy.
  {
    key: "Content-Security-Policy",
    value: cspDirectives,
  },
];

const nextConfig: NextConfig = {
  // Removes the `X-Powered-By: Next.js` response header to avoid fingerprinting.
  poweredByHeader: false,
  // Permits cross-origin requests in development from the host machine's LAN IP.
  allowedDevOrigins: allowedOrigins,
  // Restricts Next.js Image Optimization to only proxy images from the application's S3 bucket.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mortiscope.s3.ap-southeast-1.amazonaws.com",
        port: "",
        pathname: "/profile-images/**",
      },
    ],
  },
  // Enables TypeScript type-checking for all Next.js `Link` hrefs and `redirect()` calls.
  typedRoutes: true,
  async headers() {
    return [
      {
        // Apply to all routes.
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
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
