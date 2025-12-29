import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  swcMinify: true,

  // ← Главное исправление для поддержки BigInt literals (0n)
  // Это поднимает target компиляции до ES2020
  compiler: {
    // Это опция существует в Next.js 16
    swc: {
      target: "es2020", // ← Разрешает BigInt (0n), optional chaining и другие фичи ES2020
    },
  },
};

export default nextConfig;