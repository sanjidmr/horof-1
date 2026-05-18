import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'www.behance.net',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
      },
    ],
  },
  // Ensure we can use process.env.GEMINI_API_KEY
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  },
};

export default nextConfig;
