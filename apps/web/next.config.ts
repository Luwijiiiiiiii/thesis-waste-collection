import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages are shipped as TypeScript source
  transpilePackages: ["@wcro/core", "@wcro/road-network", "@wcro/routing", "@wcro/metrics", "@wcro/exports"],
};

export default nextConfig;
