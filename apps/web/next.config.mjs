/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
      },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30, // Cache images for 30 days
    formats: ['image/webp', 'image/avif'], // Modern formats for better compression
  },

  // Enable SWC minification for better performance
  swcMinify: true,

  // Optimize production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Code splitting optimization
  experimental: {
    optimizePackageImports: ['lucide-react', 'lodash'],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
