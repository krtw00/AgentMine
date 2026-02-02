import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 開発時: Daemon APIへのプロキシ
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
