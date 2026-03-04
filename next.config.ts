import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false, // 🚨 品質管理強化: TypeScriptエラーを隠蔽禁止
  },
  webpack: (config, { isServer }) => {
    // PDF.js関連の設定
    if (isServer) {
      config.resolve.alias.canvas = false;
    }
    
    // pdf-parseライブラリのworker設定
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    };
    
    return config;
  },
  serverExternalPackages: ['canvas', 'pdf-parse'],
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
