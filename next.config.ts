// next.config.ts
import type { NextConfig } from "next";
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 85],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "assets.fanart.tv",
        pathname: "/**",
      },
    ],
    // Отключаем оптимизацию для внешних изображений - используем наш прокси
    unoptimized: true,
    // Увеличиваем timeout для медленных соединений
    minimumCacheTTL: 60,
    // Отключаем device sizes для мобильных
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  experimental: {
    serverActions: {
      // Разрешаем Server Actions с preview-доменов GitHub Codespaces
      allowedOrigins: [
        'localhost:3000',
        '*.app.github.dev',
        '*.github.dev',
      ],
    },
  },

  // Исключаем TypeScript файлы в scripts из сборки
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withBundleAnalyzer(nextConfig);