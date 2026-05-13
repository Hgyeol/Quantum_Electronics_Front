import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence multi-lockfile warning by anchoring tracing root at this project.
  outputFileTracingRoot: path.join(__dirname),
  // Next.js 16 blocks dev resources from non-localhost origins by default.
  // Without this, opening http://127.0.0.1:3000 loads HTML but the JS bundle
  // is refused and the page never hydrates.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
