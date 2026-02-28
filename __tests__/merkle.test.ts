/**
 * Unit tests for Merkle tree utilities.
 *
 * Tests the synchronous keccak256-based Merkle tree (merkle.ts) used
 * in the prototype /api/register route.
 */

import {
  buildMerkleTree,
  getMerkleRoot,
  generateMerkleProof,
  verifyMerkleProof,
} from "@/lib/utils/merkle";
import { poseidonHash, computeCommitment, nidToField } from "@/lib/utils/hash";

describe("Merkle Tree", () => {
  const DEPTH = 3; // 2^3 = 8 leaves (small for testing)

  describe("buildMerkleTree", () => {
    it("should build a tree with padded leaves", () => {
      const leaves = ["0x01", "0x02", "0x03"];
      const tree = buildMerkleTree(leaves, DEPTH);

      // tree[0] = leaves (8 padded), tree[1] = 4 nodes, tree[2] = 2 nodes, tree[3] = root
      expect(tree.length).toBe(DEPTH + 1);
      expect(tree[0].length).toBe(2 ** DEPTH);
      expect(tree[DEPTH].length).toBe(1);
    });

    it("should pad to 2^depth leaves with zero values", () => {
      const leaves = ["0x01"];
      const tree = buildMerkleTree(leaves, DEPTH);

      expect(tree[0][0]).toBe("0x01");
      // Remaining leaves should be zero
      for (let i = 1; i < 2 ** DEPTH; i++) {
        expect(tree[0][i]).toBe(
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
      }
    });

    it("should produce a deterministic root", () => {
      const leaves = ["0x01", "0x02"];
      const tree1 = buildMerkleTree(leaves, DEPTH);
      const tree2 = buildMerkleTree(leaves, DEPTH);

      expect(getMerkleRoot(tree1)).toBe(getMerkleRoot(tree2));
    });

    it("should produce different roots for different leaves", () => {
      const tree1 = buildMerkleTree(["0x01", "0x02"], DEPTH);
      const tree2 = buildMerkleTree(["0x03", "0x04"], DEPTH);

      expect(getMerkleRoot(tree1)).not.toBe(getMerkleRoot(tree2));
    });
  });

  describe("getMerkleRoot", () => {
    it("should return the single root element", () => {
      const tree = buildMerkleTree(["0x01"], DEPTH);
      const root = getMerkleRoot(tree);

      expect(typeof root).toBe("string");
      expect(root.startsWith("0x")).toBe(true);
    });
  });

  describe("generateMerkleProof", () => {
    it("should generate a proof of correct depth", () => {
      const leaves = ["0xaa", "0xbb", "0xcc"];
      const tree = buildMerkleTree(leaves, DEPTH);
      const proof = generateMerkleProof(tree, 0, DEPTH);

      expect(proof.path.length).toBe(DEPTH);
      expect(proof.indices.length).toBe(DEPTH);
      expect(proof.leafIndex).toBe(0);
    });

    it("should include the correct root", () => {
      const leaves = ["0xaa", "0xbb"];
      const tree = buildMerkleTree(leaves, DEPTH);
      const proof = generateMerkleProof(tree, 1, DEPTH);

      expect(proof.root).toBe(getMerkleRoot(tree));
    });

    it("should have indices as 0 or 1 only", () => {
      const leaves = ["0xaa", "0xbb", "0xcc", "0xdd"];
      const tree = buildMerkleTree(leaves, DEPTH);

      for (let i = 0; i < leaves.length; i++) {
        const proof = generateMerkleProof(tree, i, DEPTH);
        proof.indices.forEach((idx) => {
          expect(idx === 0 || idx === 1).toBe(true);
        });
      }
    });
  });

  describe("verifyMerkleProof", () => {
    it("should verify a valid proof", () => {
      const leaves = ["0xaa", "0xbb", "0xcc"];
      const tree = buildMerkleTree(leaves, DEPTH);
      const proof = generateMerkleProof(tree, 0, DEPTH);

      expect(verifyMerkleProof("0xaa", proof)).toBe(true);
    });

    it("should verify proof for any leaf position", () => {
      const leaves = ["0xaa", "0xbb", "0xcc", "0xdd", "0xee"];
      const tree = buildMerkleTree(leaves, DEPTH);

      for (let i = 0; i < leaves.length; i++) {
        const proof = generateMerkleProof(tree, i, DEPTH);
        expect(verifyMerkleProof(leaves[i], proof)).toBe(true);
      }
    });

    it("should reject a proof with wrong leaf", () => {
      const leaves = ["0xaa", "0xbb", "0xcc"];
      const tree = buildMerkleTree(leaves, DEPTH);
      const proof = generateMerkleProof(tree, 0, DEPTH);

      // Try to verify with wrong leaf
      expect(verifyMerkleProof("0xff", proof)).toBe(false);
    });

    it("should reject a proof with tampered path", () => {
      const leaves = ["0xaa", "0xbb", "0xcc"];
      const tree = buildMerkleTree(leaves, DEPTH);
      const proof = generateMerkleProof(tree, 0, DEPTH);

      // Tamper with the path
      const tamperedProof = { ...proof, path: [...proof.path] };
      tamperedProof.path[0] = "0xdeadbeef";

      expect(verifyMerkleProof("0xaa", tamperedProof)).toBe(false);
    });

    it("should reject a proof with wrong root", () => {
      const leaves = ["0xaa", "0xbb", "0xcc"];
      const tree = buildMerkleTree(leaves, DEPTH);
      const proof = generateMerkleProof(tree, 0, DEPTH);

      const tamperedProof = { ...proof, root: "0xdeadbeef" };
      expect(verifyMerkleProof("0xaa", tamperedProof)).toBe(false);
    });
  });
});

describe("Hash utilities", () => {
  describe("poseidonHash (keccak256 sync fallback)", () => {
    it("should return a hex string", () => {
      const result = poseidonHash("1", "2");
      expect(result.startsWith("0x")).toBe(true);
      expect(result.length).toBe(66); // 0x + 64 hex chars
    });

    it("should be deterministic", () => {
      const a = poseidonHash("123", "456");
      const b = poseidonHash("123", "456");
      expect(a).toBe(b);
    });

    it("should produce different hashes for different inputs", () => {
      const a = poseidonHash("1", "2");
      const b = poseidonHash("3", "4");
      expect(a).not.toBe(b);
    });

    it("should be order-dependent", () => {
      const a = poseidonHash("1", "2");
      const b = poseidonHash("2", "1");
      expect(a).not.toBe(b);
    });
  });

  describe("computeCommitment", () => {
    it("should return a hex hash", () => {
      const commitment = computeCommitment("A123456", "1234");
      expect(commitment.startsWith("0x")).toBe(true);
    });

    it("should be deterministic", () => {
      const a = computeCommitment("A123456", "1234");
      const b = computeCommitment("A123456", "1234");
      expect(a).toBe(b);
    });

    it("should differ for different NIDs", () => {
      const a = computeCommitment("A123456", "1234");
      const b = computeCommitment("B789012", "1234");
      expect(a).not.toBe(b);
    });

    it("should differ for different secrets", () => {
      const a = computeCommitment("A123456", "1234");
      const b = computeCommitment("A123456", "5678");
      expect(a).not.toBe(b);
    });
  });

  describe("nidToField", () => {
    it("should convert alphanumeric NID to a numeric string", () => {
      const result = nidToField("A123456");
      expect(Number.isNaN(Number(result))).toBe(false);
      expect(BigInt(result) > 0n).toBe(true);
    });

    it("should be deterministic", () => {
      expect(nidToField("A123456")).toBe(nidToField("A123456"));
    });

    it("should produce different values for different NIDs", () => {
      expect(nidToField("A123456")).not.toBe(nidToField("B789012"));
    });
  });
});

describe("Poseidon async hash (circomlibjs)", () => {
  // Lazy import to avoid WASM init overhead for sync tests
  let poseidonHashAsync: typeof import("@/lib/utils/hash").poseidonHashAsync;
  let computeCommitmentAsync: typeof import("@/lib/utils/hash").computeCommitmentAsync;
  let computeNullifierAsync: typeof import("@/lib/utils/hash").computeNullifierAsync;

  beforeAll(async () => {
    const hashModule = await import("@/lib/utils/hash");
    poseidonHashAsync = hashModule.poseidonHashAsync;
    computeCommitmentAsync = hashModule.computeCommitmentAsync;
    computeNullifierAsync = hashModule.computeNullifierAsync;
  });

  it("should return a decimal string (not hex)", async () => {
    const result = await poseidonHashAsync("1", "2");
    expect(result.startsWith("0x")).toBe(false);
    expect(BigInt(result) > 0n).toBe(true);
  });

  it("should be deterministic", async () => {
    const a = await poseidonHashAsync("123", "456");
    const b = await poseidonHashAsync("123", "456");
    expect(a).toBe(b);
  });

  it("should produce different hashes for different inputs", async () => {
    const a = await poseidonHashAsync("1", "2");
    const b = await poseidonHashAsync("3", "4");
    expect(a).not.toBe(b);
  });

  it("should be order-dependent", async () => {
    const a = await poseidonHashAsync("1", "2");
    const b = await poseidonHashAsync("2", "1");
    expect(a).not.toBe(b);
  });

  it("should compute async commitment", async () => {
    const commitment = await computeCommitmentAsync("A123456", "1234");
    expect(BigInt(commitment) > 0n).toBe(true);
  });

  it("should compute async nullifier", async () => {
    const nullifier = await computeNullifierAsync("1234", 1);
    expect(BigInt(nullifier) > 0n).toBe(true);
  });

  it("should produce different commitments than sync (keccak256) version", async () => {
    const { computeCommitment: syncCommitment } = await import("@/lib/utils/hash");
    const asyncResult = await computeCommitmentAsync("A123456", "1234");
    const syncResult = syncCommitment("A123456", "1234");
    // They use different hash functions, so results MUST differ
    expect(asyncResult).not.toBe(syncResult);
  });
});
