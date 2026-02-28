import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Serwist + zokrates-js WASM both require Webpack.
  // Next.js 16 defaults to Turbopack — we override for compatibility.
  webpack: (config) => {
    // Required for zokrates-js WASM module loading
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Prevent Webpack from trying to bundle .wasm as JS
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    return config;
  },
};

export default withSerwist(nextConfig);
