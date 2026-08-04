import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "1bdb1afd-641e-4c4c-be89-1010e798b2e5.selstorage.ru",
        pathname: "/reviews/**",
      },
    ],
  },
};

export default nextConfig;
