/**
 * Next.js configuration
 * - Removes console statements in production bundles (client and server)
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;

