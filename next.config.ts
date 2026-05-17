import type { NextConfig } from "next";

const vercelDeploymentUrl = process.env.VERCEL_URL?.trim();
const assetPrefix =
  process.env.ASSET_PREFIX?.trim() ||
  (vercelDeploymentUrl ? `https://${vercelDeploymentUrl}` : undefined);

const nextConfig: NextConfig = {
  assetPrefix,
  crossOrigin: "anonymous",
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
