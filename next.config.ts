import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['ioredis', 'bcryptjs', 'sharp'],
};

export default nextConfig;
