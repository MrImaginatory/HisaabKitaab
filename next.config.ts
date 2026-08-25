import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // SW is only compiled during production builds (NODE_ENV=production).
  // In dev, @serwist/next is incompatible with Turbopack, so we disable it.
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  // turbopack: {} silences the Next.js 16 "turbopack enabled by default" warning.
  // The build script uses `next build --webpack` so Serwist can compile sw.ts.
  turbopack: {},
  allowedDevOrigins: ['192.168.1.115'],
};

export default withSerwist(nextConfig);
