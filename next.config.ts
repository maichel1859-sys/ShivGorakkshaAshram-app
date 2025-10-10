import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a smaller, self-contained server output
  output: "standalone",
  // Remove console.* in production bundles only
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Enforce type and lint correctness in builds
  // Now that TypeScript errors are resolved, keep strict.
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: {
    // reactCompiler: true, // Disabled until babel-plugin-react-compiler is installed
    staleTimes: {
      dynamic: 30, // 30 seconds for dynamic pages
      static: 180, // 3 minutes for static pages
    },
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
