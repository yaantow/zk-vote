import { poseidonHashAsync } from "@/lib/utils/hash";

const ZERO_VALUE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Build a Merkle tree using async Poseidon hashing — matches the ZoKrates circuit.
 */
export async function buildMerkleTreeAsync(
  leaves: string[],
  depth: number
): Promise<string[][]> {
  const width = 2 ** depth;
  const paddedLeaves = [...leaves];
  while (paddedLeaves.length < width) {
    paddedLeaves.push(ZERO_VALUE);
  }

  const layers: string[][] = [paddedLeaves];
  let currentLayer = paddedLeaves;

  for (let i = 0; i < depth; i++) {
    const nextLayer: string[] = [];
    for (let j = 0; j < currentLayer.length; j += 2) {
      nextLayer.push(
        await poseidonHashAsync(currentLayer[j], currentLayer[j + 1])
      );
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  return layers;
}
