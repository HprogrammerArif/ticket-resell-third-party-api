import './src/libs/Env';
import withBundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Define the base Next.js configuration
const baseConfig: NextConfig = {
  output: 'standalone',
  // next/image rejects a local src carrying a query string unless the path is
  // listed here. Performer photographs are served by /api/images/proxy, which
  // takes the Wikimedia URL as ?url=… — Wikimedia answers 403 to requests with
  // no User-Agent and 429 to a generic one, so the bytes cannot be fetched
  // directly by the optimiser.
  //
  // `search` is deliberately omitted: specifying it requires an exact match on
  // the whole query string, and ours differs per image.
  images: {
    localPatterns: [{ pathname: '/api/images/**' }],
    // Ticketmaster's image CDN. Unlike Wikimedia it sets no User-Agent
    // requirement, so these are fetched directly rather than through
    // /api/images/proxy — one hop fewer, and the proxy's Commons licence gate
    // would reject them anyway.
    remotePatterns: [{ protocol: 'https', hostname: 's1.ticketm.net' }],
  },
  devIndicators: {
    position: 'bottom-right',
  },
  poweredByHeader: false,
  reactStrictMode: true,
  reactCompiler: process.env.NODE_ENV === 'production', // Keep the development environment fast
  logging: {
    browserToTerminal: process.env.BROWSER_TO_TERMINAL_DISABLED !== 'true',
  },
};

// Initialize the Next-Intl plugin
let configWithPlugins = createNextIntlPlugin('./src/libs/I18n.ts')(baseConfig);

// Conditionally enable bundle analysis
if (process.env.ANALYZE === 'true') {
  configWithPlugins = withBundleAnalyzer()(configWithPlugins);
}

const nextConfig = configWithPlugins;
export default nextConfig;
