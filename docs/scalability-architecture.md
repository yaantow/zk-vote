# ZK-Vote Maldives: Scalability Architecture

This document outlines the architectural and cryptographic upgrades required to scale the current ZK-voting prototype from a localized test environment (64 voters) to a nationwide production deployment capable of supporting the entire voting population of the Maldives (approx. 500,000 citizens).

## 1. Cryptographic Scaling (The Merkle Tree Depth)
The core of the Zero-Knowledge identity verification is the Merkle Tree. The number of maximum allowable voters is strictly defined by the mathematical "depth" of this tree ($2^{Depth}$).

### Current Prototype State
- **Merkle Depth:** `6`
- **Max Capacity:** $2^6 = 64$ voters.
- **Purpose:** Designed for rapid local execution, low memory overhead, and instant ZK-proof generation in browser testing.

### Production Requirement (Maldives Population)
- **Target Population:** ~500,000 voters.
- **Required Merkle Depth:** `19` 
- **Max Capacity:** $2^{19} = 524,288$ voters.
- **Implementation:** The `circuit.zok` ZoKrates file must be rewritten to accept a Merkle path array of length 19 (`field[19] merklePath`) and execute the Poseidon hash verification loop 19 times. The circuit must then be recompiled to generate new, larger `proving.key` and `verification.key` artifacts.

## 2. Infrastructure Scaling (Tree Generation & Storage)

### The In-Memory Limitation
Currently, the admin dashboard (`/api/admin/setup`) computes the Poseidon hashes and builds the entire Merkle Tree in the server's RAM in a single synchronous thread. It then saves this to a local JSON file. 
While this takes milliseconds for 64 voters, generating ~1 million Poseidon hashes for a 19-level tree in Node.js would take 15 to 30 minutes. This would trigger fatal timeout errors on serverless architectures like Vercel (which impose 10-60 second limits) and cause catastrophic out-of-memory (OOM) crashes.

### Production Architecture
To safely scale to 500,000 voters, the architecture must transition from a "Serverless Monolith" to a "Distributed Worker" model:

1. **Dedicated Worker Nodes:** 
   The generation of the 19-level Merkle tree must be offloaded to heavy-duty backend scripts (e.g., written in Rust, Go, or a background Python Celery worker). This worker will ingest the National ID database, compute the commitments, and systematically build the tree over several minutes/hours.
2. **On-Chain Root Commitment:** 
   Once the massive tree is computed by the worker, only the singular 32-byte Merkle Root is pushed to the Polygon smart contract via the `setupElection` function.
3. **Optimized Database Storage (PostgreSQL/MongoDB):**
   A full 19-level Merkle tree JSON file would be upwards of 50-100MB. Loading this into memory on every voter login is impossible. Instead, the tree nodes must be flattened and stored in a highly indexed relational or NoSQL database. When a voter logs in, the Next.js API simply runs a SQL/NoSQL query to reconstruct exactly the 19 hashes needed for their specific Merkle Proof, reducing memory overhead to near zero.

## 3. Client-Side Proof Generation
In a ZK-SNARK architecture, the cryptographic heavy lifting is intentionally pushed to the client (the voter's browser) to maintain absolute privacy.
- **Current Load:** Generating a depth-6 proof in WebAssembly (WASM) takes ~2-5 seconds on a standard smartphone/laptop.
- **Production Load:** Generating a depth-19 proof will be more computationally intensive (estimated 10-30 seconds). The frontend UI must be updated with robust Web Workers and progress indicators to ensure the browser UI does not freeze while the WASM module computes the proof in the background.

## Conclusion
The mathematical principles of the Zero-Knowledge voting protocol remain entirely identical whether the system serves 64 voters or 500,000. The scaling challenges are strictly infrastructural (database management, background workers, and WASM performance), ensuring the academic and cryptographic integrity of the prototype holds true at a nationwide scale.
