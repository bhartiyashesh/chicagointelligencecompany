import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Cloudflare Pages deployment
  output: "export",

  // Disable image optimization (not supported on static export)
  images: {
    unoptimized: true,
  },

  // Trailing slashes for Cloudflare Pages compatibility
  trailingSlash: true,
};

export default nextConfig;
