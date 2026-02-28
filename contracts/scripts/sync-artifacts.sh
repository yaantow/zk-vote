#!/usr/bin/env bash
# ================================================================
# sync-artifacts.sh
#
# After compiling the ZoKrates circuit and running trusted setup,
# this script copies the generated artifacts to the right places:
#
#   1. proving.key       → ../public/zk/proving-key.bin
#   2. verification.key  → ../public/zk/verification-key.json
#   3. Verifier.sol      → ./contracts/Verifier.sol (replace placeholder)
#   4. ZKVoting ABI      → ../lib/blockchain/abi/ZKVoting.json
#
# Usage:
#   cd contracts
#   bash scripts/sync-artifacts.sh
# ================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTRACTS_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$CONTRACTS_DIR")"

CIRCUITS_DIR="$CONTRACTS_DIR/circuits"
PUBLIC_ZK_DIR="$PROJECT_ROOT/public/zk"
ABI_DIR="$PROJECT_ROOT/lib/blockchain/abi"

echo "=== ZK-Vote Artifact Sync ==="
echo "Contracts dir: $CONTRACTS_DIR"
echo "Project root:  $PROJECT_ROOT"
echo ""

# Ensure target directories exist
mkdir -p "$PUBLIC_ZK_DIR"
mkdir -p "$ABI_DIR"

# 1. Copy proving key
if [ -f "$CIRCUITS_DIR/proving.key" ]; then
  cp "$CIRCUITS_DIR/proving.key" "$PUBLIC_ZK_DIR/proving-key.bin"
  echo "✓ proving.key → public/zk/proving-key.bin"
else
  echo "⚠ proving.key not found in circuits/ — run trusted setup first"
fi

# 2. Copy verification key
if [ -f "$CIRCUITS_DIR/verification.key" ]; then
  cp "$CIRCUITS_DIR/verification.key" "$PUBLIC_ZK_DIR/verification-key.json"
  echo "✓ verification.key → public/zk/verification-key.json"
else
  echo "⚠ verification.key not found in circuits/"
fi

# 3. Copy compiled artifacts (program binary)
if [ -f "$CIRCUITS_DIR/out" ]; then
  # ZoKrates outputs the compiled program as "out"
  # We need to create an artifacts.json that zokrates-js can consume
  echo '{"program": "out"}' > "$PUBLIC_ZK_DIR/artifacts.json"
  cp "$CIRCUITS_DIR/out" "$PUBLIC_ZK_DIR/out"
  echo "✓ compiled program → public/zk/out"
else
  echo "⚠ compiled program (out) not found in circuits/"
fi

# 4. Copy Verifier.sol if ZoKrates generated it
if [ -f "$CIRCUITS_DIR/Verifier.sol" ]; then
  cp "$CIRCUITS_DIR/Verifier.sol" "$CONTRACTS_DIR/contracts/Verifier.sol"
  echo "✓ Verifier.sol → contracts/contracts/Verifier.sol"
  echo "  ⚡ Run 'npx hardhat compile' to recompile with the real verifier"
else
  echo "⚠ Verifier.sol not generated yet — using placeholder"
fi

# 5. Sync ABI from compiled artifacts
if [ -f "$CONTRACTS_DIR/artifacts/contracts/ZKVoting.sol/ZKVoting.json" ]; then
  python3 -c "
import json
with open('$CONTRACTS_DIR/artifacts/contracts/ZKVoting.sol/ZKVoting.json') as f:
    d = json.load(f)
with open('$ABI_DIR/ZKVoting.json', 'w') as f:
    json.dump({'abi': d['abi']}, f, indent=2)
print('✓ ZKVoting ABI synced (' + str(len(d['abi'])) + ' entries)')
"
else
  echo "⚠ ZKVoting artifact not found — run 'npx hardhat compile' first"
fi

echo ""
echo "=== Done ==="
