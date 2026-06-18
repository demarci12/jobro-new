import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000', 'jobro-new-zyq9.vercel.app'] },
  },
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
