import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    '192.168.0.*',
    '127.0.0.1',
    '172.20.10.*',
    '192.168.31.*',
  ],
  reactStrictMode: true,
  output: "standalone",
  async rewrites() {
    const raw = process.env.INTERNAL_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
    const trimmed = raw ? raw.trim() : '';
    const apiBaseUrl = trimmed.length > 0 ? trimmed.replace(/\/$/, '') : 'http://localhost:8080';
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${apiBaseUrl}/api/:path*`,
        },
        {
          source: "/auth/:path*",
          destination: `${apiBaseUrl}/auth/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  transpilePackages: [
    "antd",
    "@ant-design/pro-components",
    "@ant-design/pro-layout",
    "@ant-design/pro-table",
    "rc-util",
    "rc-pagination",
    "rc-picker",
    "rc-notification",
    "rc-tooltip",
    "rc-tree",
    "rc-table",
  ],
};

export default nextConfig;
