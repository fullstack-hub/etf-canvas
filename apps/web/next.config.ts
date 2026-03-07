import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_BUILD_ID: Date.now().toString(),
  },
};

export default nextConfig;
