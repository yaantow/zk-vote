# ZK-Vote Maldives

> **Decentralized Privacy-Preserving E-Voting using zk-SNARKs**
>
> A Progressive Web App (PWA) prototype demonstrating anonymous, verifiable electronic voting
> built with Next.js, ZoKrates, Solidity, and Polygon. Designed for the Maldivian electoral
> context (SIDS — low bandwidth, offline-first).
>
> **RS6005 Design Science Research — Abdulla Yamin (29707)**

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Frontend (Next.js PWA)](#frontend-nextjs-pwa)
  - [Smart Contracts (Hardhat)](#smart-contracts-hardhat)
- [Development Commands](#development-commands)
- [Environment Variables](#environment-variables)
- [Smart Contracts](#smart-contracts)
  - [Contract Overview](#contract-overview)
  - [Testing](#testing)
  - [Local Deployment](#local-deployment)
  - [Testnet Deployment](#testnet-deployment)
- [ZoKrates Trusted Setup](#zokrates-trusted-setup)
- [Application Pages](#application-pages)
- [PWA & Offline Support](#pwa--offline-support)
- [Audit & Verification](#audit--verification)
- [API Routes](#api-routes)
- [Key Design Decisions](#key-design-decisions)
- [License](#license)

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  LAYER 1: Client PWA (Next.js + zokrates-js)        │
│  - Voter authentication (simulated National ID)     │
│  - Client-side ZKP proof generation (offline-capable)│
│  - Vote submission via MetaMask / ethers.js         │
├─────────────────────────────────────────────────────┤
│  LAYER 2: Smart Contract Verifier (Solidity)        │
│  - On-chain Groth16 ZKP verification               │
│  - Nullifier hash tracking (anti-double-vote)       │
│  - Vote tally increment per candidate              │
│  - Deployed on Polygon Amoy Testnet                 │
├─────────────────────────────────────────────────────┤
│  LAYER 3: Public Ledger / Audit Layer               │
│  - All vote events emitted on-chain (VoteCast)      │
│  - Python audit script reads events independently   │
│  - Any observer can recompute & verify the tally    │
└─────────────────────────────────────────────────────┘
```

**How it works:**

1. A voter authenticates with a simulated National ID + secret passphrase
2. The client computes a Poseidon commitment and registers it in a Merkle tree
3. When voting, the client generates a **Groth16 zk-SNARK proof** (entirely in-browser via WASM) proving:
   - The voter's commitment exists in the registered Merkle tree
   - The nullifier is correctly derived (prevents double-voting)
   - The chosen candidate index is valid
4. The proof is submitted on-chain via MetaMask to the `ZKVoting` smart contract
5. The contract verifies the proof on-chain, records the nullifier, and increments the candidate tally
6. All votes emit `VoteCast` events — anyone can independently audit the tally from the public ledger

---

## Tech Stack

| Category        | Technology               | Version   | Purpose                              |
|-----------------|--------------------------|-----------|--------------------------------------|
| Framework       | Next.js (App Router)     | 16.1.6    | SSR, routing, API routes             |
| Language        | TypeScript               | 5.x       | Type safety across all layers        |
| Styling         | Tailwind CSS             | 4.x       | Utility-first CSS (CSS-first config) |
| UI Components   | shadcn/ui                | latest    | Accessible, composable components    |
| ZKP             | zokrates-js              | 1.1.9     | Client-side zk-SNARK proof gen (WASM)|
| Blockchain      | ethers.js                | 6.x       | Wallet connection, contract calls    |
| Wallet          | MetaMask                 | Extension | Key management, transaction signing  |
| Smart Contracts | Solidity                 | 0.8.24    | On-chain verifier + voting logic     |
| SC Framework    | Hardhat                  | 2.28.6    | Compile, test, deploy contracts      |
| SC Libraries    | OpenZeppelin             | 5.x       | Contract utilities                   |
| Network         | Polygon Amoy Testnet     | Chain ID 80002 | Fast blocks, free test tokens   |
| State Mgmt      | Zustand                  | 5.x       | Lightweight client state             |
| PWA             | @serwist/next            | 9.x       | Service worker, offline support      |
| Icons           | Lucide React             | latest    | Consistent icon set                  |

---

## Project Structure

```
zk-vote/
├── app/                                 # Next.js App Router pages
│   ├── layout.tsx                       # Root layout (providers, PWA meta)
│   ├── page.tsx                         # Landing page
│   ├── globals.css                      # Tailwind v4 theme + global styles
│   ├── manifest.ts                      # Dynamic PWA manifest
│   ├── sw.ts                            # Serwist service worker
│   ├── auth/page.tsx                    # Voter authentication
│   ├── vote/
│   │   ├── page.tsx                     # Ballot — candidate selection
│   │   └── confirm/page.tsx             # ZKP generation + submission
│   ├── results/page.tsx                 # Live results from blockchain
│   ├── audit/page.tsx                   # Public audit & tally verification
│   ├── admin/page.tsx                   # Election admin panel
│   └── api/
│       ├── register/route.ts            # POST — voter registration
│       ├── election/route.ts            # GET — election metadata
│       └── audit/route.ts              # GET — audit events & tallies
│
├── components/                          # React components
│   ├── header.tsx                       # Navigation header
│   ├── network-status.tsx               # Online/offline indicator
│   ├── wallet-connect.tsx               # MetaMask connection button
│   ├── voting-card.tsx                  # Candidate voting card
│   ├── proof-status.tsx                 # ZKP generation progress
│   ├── results-chart.tsx                # Bar chart for results
│   ├── audit-log.tsx                    # Event log table
│   └── ui/                             # shadcn/ui primitives
│       ├── button.tsx, card.tsx, input.tsx, label.tsx
│       ├── badge.tsx, progress.tsx, table.tsx, separator.tsx
│
├── lib/                                 # Shared utilities & integrations
│   ├── utils/
│   │   ├── constants.ts                 # Candidates, chain config, contract addr
│   │   ├── hash.ts                      # Poseidon hash (keccak256 placeholder)
│   │   ├── merkle.ts                    # Binary Merkle tree (DEPTH=6, 64 leaves)
│   │   └── offline-queue.ts            # IndexedDB queue for offline votes
│   ├── stores/
│   │   ├── voter-store.ts               # Voter auth state (persisted)
│   │   ├── election-store.ts            # Election metadata
│   │   └── proof-store.ts              # ZKP proof state
│   ├── zk/
│   │   ├── zokrates.ts                  # Lazy singleton ZoKrates provider
│   │   ├── prover.ts                    # Artifact loading + proof generation
│   │   └── circuit.zok                  # Reference circuit source
│   └── blockchain/
│       ├── config.ts                    # Chain config (Polygon Amoy 80002)
│       ├── provider.ts                  # JsonRpcProvider + MetaMask connection
│       ├── voting-contract.ts           # Typed contract wrappers
│       └── abi/ZKVoting.json           # Contract ABI (16 entries)
│
├── contracts/                           # Hardhat project (smart contracts)
│   ├── contracts/
│   │   ├── Verifier.sol                 # Groth16 pairing library + verifier
│   │   └── ZKVoting.sol                 # Main voting contract
│   ├── circuits/
│   │   └── circuit.zok                  # ZoKrates circuit source
│   ├── test/
│   │   └── ZKVoting.test.ts             # 32 unit tests
│   ├── scripts/
│   │   ├── deploy.ts                    # Deployment script
│   │   ├── setup-election.ts            # Demo election setup
│   │   └── sync-artifacts.sh           # Artifact sync to frontend
│   ├── hardhat.config.ts                # Hardhat configuration
│   ├── package.json                     # Contract dependencies
│   └── .env                             # Deployer key template
│
├── public/
│   ├── offline.html                     # Offline fallback page
│   └── zk/                             # ZK artifacts (after trusted setup)
│
├── docs/
│   └── REQUIREMENTS.md                  # Full project specification
│
├── package.json                         # Root dependencies
├── next.config.ts                       # Next.js + Serwist + WASM config
├── tsconfig.json                        # TypeScript config
├── postcss.config.mjs                   # PostCSS (Tailwind)
└── eslint.config.mjs                    # ESLint config
```

---

## Prerequisites

- **Node.js** ≥ 18.x (recommended: 20+)
- **npm** ≥ 9.x
- **MetaMask** browser extension (for wallet interaction)
- **ZoKrates CLI** (optional — needed for trusted setup before testnet deployment)
- **Git**

---

## Getting Started

### Frontend (Next.js PWA)

```bash
# Clone the repository
git clone <repo-url>
cd zk-vote

# Install dependencies
npm install

# Start development server
npm run dev

# The app will be available at http://localhost:3000
```

> **Important:** This project uses the `--webpack` flag for both dev and build.
> Turbopack is incompatible with WASM (zokrates-js) and Serwist service workers.
> The npm scripts are already configured with this flag.

### Smart Contracts (Hardhat)

```bash
# Navigate to contracts directory
cd contracts

# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests (32 tests)
npm test

# Start local Hardhat node (in a separate terminal)
npx hardhat node

# Deploy to local node
npm run deploy:local

# Set up a demo election
npm run setup
```

---

## Development Commands

### Root (Frontend)

| Command          | Description                                    |
|------------------|------------------------------------------------|
| `npm run dev`    | Start dev server (webpack mode, port 3000)     |
| `npm run build`  | Production build                               |
| `npm run start`  | Start production server                        |
| `npm run lint`   | Run ESLint                                     |

### Contracts (`cd contracts`)

| Command              | Description                                  |
|----------------------|----------------------------------------------|
| `npm run compile`    | Compile Solidity contracts                   |
| `npm test`           | Run all 32 unit tests                        |
| `npm run deploy:local` | Deploy to local Hardhat node              |
| `npm run deploy:amoy`  | Deploy to Polygon Amoy testnet            |
| `npm run setup`      | Set up demo election on local node           |

---

## Environment Variables

### Root `.env.local`

```env
# Contract address (set after deployment)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...

# Polygon Amoy RPC (optional override — default is public RPC)
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
```

### `contracts/.env`

```env
# Private key of the deployer wallet (DO NOT commit)
DEPLOYER_PRIVATE_KEY=0x...

# Deployed contract addresses (set after deployment)
VERIFIER_ADDRESS=0x...
VOTING_CONTRACT_ADDRESS=0x...
```

---

## Smart Contracts

### Contract Overview

**`Verifier.sol`** — Groth16 pairing-based proof verifier
- Implements elliptic curve pairing checks (BN256/alt_bn128)
- Contains the verification key (VK) — currently a **placeholder**
- Must be replaced with the output of `zokrates export-verifier` after trusted setup
- Accepts 4 public inputs: `[merkleRoot, nullifierHash, candidateIndex, candidateCount]`

**`ZKVoting.sol`** — Main voting contract
- **Admin functions:** `setupElection()`, `startElection()`, `endElection()`
- **Voting:** `castVote(proof, merkleRoot, nullifierHash, candidateIndex)` — verifies ZKP on-chain, checks nullifier uniqueness, increments tally
- **Views:** `getCandidateCount()`, `getCandidateName(i)`, `getCandidateTally(i)`, `totalVotes()`
- **Events:** `VoteCast(nullifierHash, candidateIndex, timestamp)`, `ElectionStarted()`, `ElectionEnded()`
- **Security:** Only admin can manage elections, double-voting prevented by nullifier hash set, candidate index validated against count

### Testing

All 32 unit tests pass across 6 categories:

| Category           | Tests | Description                                    |
|--------------------|-------|------------------------------------------------|
| Deployment         | 4     | Contract initialization, admin, verifier link  |
| Election Setup     | 7     | Candidate addition, access control, state      |
| Election Lifecycle | 8     | Start/end transitions, state guards            |
| Vote Casting Guards| 4     | Election state, candidate range, nullifier     |
| View Functions     | 6     | Candidate data, tally reads, total votes       |
| Verifier           | 3     | Contract deployment, interface                 |

```bash
cd contracts && npm test
```

### Local Deployment

```bash
# Terminal 1: Start local Hardhat node
cd contracts
npx hardhat node

# Terminal 2: Deploy contracts
cd contracts
npm run deploy:local

# Terminal 3: Set up demo election
npm run setup
```

After deployment, copy the printed contract address to your root `.env.local`:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x<deployed-address>
```

### Testnet Deployment

Before deploying to Polygon Amoy testnet, you must:

1. Complete the [ZoKrates Trusted Setup](#zokrates-trusted-setup)
2. Fund your deployer wallet with Polygon Amoy POL (from a faucet)
3. Set `DEPLOYER_PRIVATE_KEY` in `contracts/.env`

```bash
cd contracts
npm run deploy:amoy
```

---

## ZoKrates Trusted Setup

The ZoKrates circuit must be compiled and a trusted setup performed before real
ZKP verification can work on-chain. The current `Verifier.sol` contains a
**placeholder verification key** that works for unit testing but will reject real proofs.

### Steps

```bash
# 1. Install ZoKrates CLI
curl -LSfs get.zokrat.es | sh
export PATH="$HOME/.zokrates/bin:$PATH"

# 2. Compile the circuit
cd contracts/circuits
zokrates compile -i circuit.zok

# 3. Perform trusted setup (generates proving.key + verification.key)
zokrates setup

# 4. Export the Solidity verifier (replaces placeholder)
zokrates export-verifier

# 5. Run the sync script to copy artifacts
cd ..
bash scripts/sync-artifacts.sh
```

After running `sync-artifacts.sh`, the following files are updated:
- `public/zk/proving.key` — used by the browser for client-side proof generation
- `contracts/contracts/Verifier.sol` — replaced with real verification key
- `lib/blockchain/abi/ZKVoting.json` — updated ABI after recompilation

Then recompile and redeploy:
```bash
cd contracts
npm run compile
npm run deploy:amoy  # or deploy:local
```

---

## Application Pages

| Route            | Page                   | Description                                                |
|------------------|------------------------|------------------------------------------------------------|
| `/`              | Landing Page           | Project overview, features, navigation to auth             |
| `/auth`          | Voter Authentication   | Enter National ID + secret → compute commitment → register in Merkle tree → connect wallet  |
| `/vote`          | Ballot                 | Display candidates as cards, select one, proceed to confirm |
| `/vote/confirm`  | Vote Confirmation      | 4-step process: preparing → generating ZKP → submitting tx → confirmed. Offline queue fallback  |
| `/results`       | Live Results           | Bar chart of candidate tallies, auto-refreshes every 15s   |
| `/audit`         | Public Audit           | Event log table, tally comparison (recomputed vs on-chain), CSV export  |
| `/admin`         | Election Admin         | Setup election (title, candidates), start/end election     |

---

## PWA & Offline Support

This application is a **Progressive Web App** with full offline capabilities:

- **Service Worker:** Managed by Serwist. Caches ZK artifacts with `CacheFirst` (1-year TTL), election data with `NetworkFirst` (1-hour fallback), and static assets with default caching
- **Offline Voting:** Votes generated offline are queued in **IndexedDB** and automatically submitted when connectivity is restored
- **Installable:** Full PWA manifest with app icons, standalone display mode, and dark theme
- **Offline Fallback:** A dedicated `offline.html` page is served when the network is unavailable and no cached response exists

> **Note:** The service worker is disabled in development mode. Run `npm run build && npm start` to test PWA features.

---

## Audit & Verification

The audit system provides transparent, independent verification of election results:

1. **On-chain events:** Every vote emits a `VoteCast` event with the nullifier hash, candidate index, and timestamp
2. **Independent recomputation:** The `/audit` page fetches all `VoteCast` events and recomputes tallies from scratch
3. **Tally comparison:** Recomputed tallies are compared against on-chain contract state — any mismatch is flagged
4. **CSV export:** All audit data can be exported as CSV for external analysis
5. **Python audit script:** (Phase 3) An independent Python script will read events directly from the blockchain RPC for cross-platform verification

---

## API Routes

| Route             | Method | Description                                                        |
|-------------------|--------|--------------------------------------------------------------------|
| `/api/register`   | POST   | Register a voter commitment in the in-memory Merkle tree. Returns Merkle proof, path indices, and root. |
| `/api/election`   | GET    | Returns election metadata. Reads live on-chain data when contract is deployed; falls back to prototype defaults. |
| `/api/audit`      | GET    | Returns all VoteCast events and tally comparison. Reads from contract when deployed; returns empty defaults otherwise. |

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Client-side ZKP generation** | Keeps voter's secret and choice private — proof is generated entirely in the browser via WASM. No server ever sees the plaintext vote. |
| **Webpack over Turbopack** | Next.js 16 defaults to Turbopack, but WASM async loading (`zokrates-js`) and Serwist service workers require Webpack's `asyncWebAssembly` experiment. |
| **Polygon Amoy testnet** | Fast block times (~2s), free test tokens, EVM-compatible. Suitable for research prototype without mainnet gas costs. |
| **Groth16 proving system** | Constant-size proofs (~200 bytes), fast on-chain verification (~200K gas). Requires trusted setup but acceptable for a research prototype. |
| **Poseidon hash placeholder** | The frontend uses `keccak256` as a Poseidon placeholder. The real Poseidon hash is used in the ZoKrates circuit. After trusted setup, both layers will use matching Poseidon. |
| **In-memory Merkle tree** | The `/api/register` route stores commitments in server memory. Acceptable for prototype — production would use a persistent store. |
| **Zustand over Redux** | Minimal boilerplate, excellent TypeScript support, built-in persist middleware for localStorage. |
| **shadcn/ui** | Not a dependency — components are copied into the project. Full control, accessible by default, consistent with Tailwind. |

---

## Development Status

- [x] **Phase 1 — Layer 1 (Client PWA):** All pages, components, stores, utilities, API routes, and PWA configuration complete. Production build passes.
- [x] **Phase 2 — Layer 2 (Smart Contracts):** Hardhat project, Verifier.sol, ZKVoting.sol, circuit, deploy scripts, 32/32 tests passing. Frontend API routes wired to contract.
- [ ] **Phase 3 — Layer 3 (Audit & Testing):** Python audit script, Poseidon hash alignment, end-to-end integration testing, mock election with N=50 participants, SUS survey.
- [ ] **ZoKrates Trusted Setup:** Circuit written, awaiting CLI compilation + setup.
- [ ] **Testnet Deployment:** Awaiting trusted setup + funded wallet.

---

## License

This project is developed as part of academic research (RS6005 Design Science Research) at the Maldives National University.
