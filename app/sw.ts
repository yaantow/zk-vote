import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  CacheFirst,
  NetworkFirst,
  ExpirationPlugin,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    // Cache ZKP artifacts aggressively (they don't change)
    {
      matcher: /\/zk\/.+\.(bin|json|wasm)$/i,
      handler: new CacheFirst({
        cacheName: "zkp-artifacts",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 10,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          }),
        ],
      }),
    },
    // Election API — network first, fallback to cache
    {
      matcher: /\/api\/election/i,
      handler: new NetworkFirst({
        cacheName: "election-api",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 5,
            maxAgeSeconds: 60 * 60, // 1 hour
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();
