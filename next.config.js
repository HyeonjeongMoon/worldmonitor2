/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      cesium: 'cesium/Source/Cesium.js',
    };
    // Cesium requires buffer and crypto polyfills for Node.js compatibility
    config.resolve.fallback = {
      ...config.resolve.fallback,
      buffer: require.resolve('buffer'),
      crypto: require.resolve('crypto-browserify'),
    };
    config.plugins.push(
      new (require('webpack').DefinePlugin)({
        __CESIUM_CLOUD_ACCESS_TOKEN__: JSON.stringify(process.env.CESIUM_CLOUD_ACCESS_TOKEN || ''),
        __CESIUM_CLOUD_BASE_URL__: JSON.stringify('https://api.cesium.com'),
      }),
    );
    // Provide Buffer globally for Cesium
    config.plugins.push(
      new (require('webpack').ProvidePlugin)({
        Buffer: ['buffer', 'Buffer'],
      }),
    );
    return config;
  },
  async rewrites() {
    return [];
  },
  async redirects() {
    return [];
  },
};

module.exports = nextConfig;
