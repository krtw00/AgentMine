import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // 開発時: Daemon APIへのプロキシ
  // 本番時: Traefikがルーティング
  async rewrites() {
    const daemonUrl = process.env.DAEMON_URL || "http://localhost:3001";
    return [
      {
        source: "/api/:path*",
        destination: `${daemonUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
