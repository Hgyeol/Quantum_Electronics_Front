import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence multi-lockfile warning by anchoring tracing root at this project.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
