/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async rewrites() {
    return [];
  },
  async redirects() {
    return [];
  },
};

module.exports = nextConfig;
