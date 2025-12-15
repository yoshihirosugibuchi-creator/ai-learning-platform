import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false, // 🚨 品質管理強化: TypeScriptエラーを隠蔽禁止
  },
};

export default nextConfig;
