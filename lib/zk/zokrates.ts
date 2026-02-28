/**
 * ZoKrates provider wrapper.
 *
 * Initialises the zokrates-js WASM provider and provides helper methods
 * for compiling circuits, computing witnesses, and generating proofs.
 */

import { initialize } from "zokrates-js";

export type ZoKratesProvider = Awaited<ReturnType<typeof initialize>>;

let provider: ZoKratesProvider | null = null;

/**
 * Lazily initialise and return the ZoKrates WASM provider.
 * Safe to call multiple times — only initialises once.
 */
export async function getZoKratesProvider(): Promise<ZoKratesProvider> {
  if (provider) return provider;
  provider = await initialize();
  return provider;
}

/**
 * Reset the cached provider (useful for testing).
 */
export function resetProvider(): void {
  provider = null;
}
