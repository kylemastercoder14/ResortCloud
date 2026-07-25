import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        hostname: "ufs.sh",
        protocol: "https",
      },
      {
        hostname: "utfs.io",
        protocol: "https",
      },
      {
        hostname: "r4wxy1hs65.ufs.sh",
        protocol: "https"
      }
    ],
  },
};

export default nextConfig;
