import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  images: {
    domains: ["images.unsplash.com", "api.qrserver.com"],
  },
};

export default nextConfig;
