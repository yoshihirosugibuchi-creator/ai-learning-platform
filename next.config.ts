import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false, // 🚨 品質管理強化: ESLintエラーを隠蔽禁止
  },
  typescript: {
    ignoreBuildErrors: false, // 🚨 品質管理強化: TypeScriptエラーを隠蔽禁止
  },
};

export default nextConfig;
