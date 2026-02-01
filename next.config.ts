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
    // Включаем оптимизацию для локальных изображений, но оставляем external для прокси
    unoptimized: false,
    // Увеличиваем кеширование до 24 часов
    minimumCacheTTL: 86400,
    // Оптимизированные размеры устройств для уменьшения вариаций
    deviceSizes: [640, 828, 1080, 1920],
    imageSizes: [32, 64, 128, 256],
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