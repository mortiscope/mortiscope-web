import type { NextConfig } from "next";

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.6"],
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
};

export default process.env.ANALYZE === "true" ? withBundleAnalyzer(nextConfig) : nextConfig;
