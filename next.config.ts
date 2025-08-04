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
    ],
  },
  typedRoutes: true,
};

export default process.env.ANALYZE === "true" ? withBundleAnalyzer(nextConfig) : nextConfig;
