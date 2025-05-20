import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverComponentsExternalPackages: ['hnswlib-node'],
  },

  // This is a more general way to handle it for API routes (server-side code)
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure 'hnswlib-node' is treated as an external module.
      // This prevents Webpack from trying to process it,
      // leaving it as a standard 'require' call that Node.js can handle.
      if (!config.externals) {
        config.externals = [];
      }
      config.externals.push('hnswlib-node');
    }
    return config;
  },
};

export default nextConfig;
