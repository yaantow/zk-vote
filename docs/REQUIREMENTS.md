# ZK-Vote Maldives — Project Requirements & Setup Document
# Decentralized Privacy-Preserving E-Voting using zk-SNARKs
# RS6005 Design Science Research — Abdulla Yamin (29707)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Setup Instructions](#4-setup-instructions)
5. [Feature Requirements](#5-feature-requirements)
6. [Page-by-Page Specification](#6-page-by-page-specification)
7. [ZoKrates Circuit Specification](#7-zokrates-circuit-specification)
8. [Smart Contract Specification](#8-smart-contract-specification)
9. [Database / State Schema](#9-database--state-schema)
10. [API Routes Specification](#10-api-routes-specification)
11. [PWA Configuration](#11-pwa-configuration)
12. [Environment Variables](#12-environment-variables)
13. [Testing Plan](#13-testing-plan)
14. [Deployment](#14-deployment)

---

## 1. Project Overview

**Project Name:** ZK-Vote Maldives  
**Type:** Progressive Web App (PWA)  
**Framework:** Next.js 16 (App Router)  
**Purpose:** A decentralized, privacy-preserving e-voting prototype that uses zk-SNARKs to prove vote validity without revealing voter choices. Designed for the Maldivian electoral context (SIDS — low bandwidth, offline-first).

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│  LAYER 1: Client PWA (Next.js + zokrates-js)        │
│  - Voter authentication (simulated National ID)     │
│  - Client-side ZKP proof generation (offline-capable)│
│  - Vote submission via MetaMask / ethers.js         │
├─────────────────────────────────────────────────────┤
│  LAYER 2: Smart Contract Verifier (Solidity)        │
│  - On-chain ZKP verification                        │
│  - Nullifier hash tracking (anti-double-vote)       │
│  - Vote tally increment                             │
│  - Deployed on Polygon Amoy Testnet                 │
├─────────────────────────────────────────────────────┤
│  LAYER 3: Public Ledger / Audit Layer               │
│  - All vote events emitted on-chain                 │
│  - Python audit script reads events independently   │
│  - Any observer can verify the tally                │
└─────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

> **Versions verified as of February 28, 2026.** All versions below are the
> latest stable releases confirmed compatible with each other.

| Layer        | Technology                  | Version    | Purpose                            |
|--------------|-----------------------------|------------|-------------------------------------|
| Framework    | Next.js (App Router)        | 16.x       | SSR/SSG, routing, API routes, Turbopack |
| Language     | TypeScript                  | 5.x        | Type safety                         |
| Styling      | Tailwind CSS                | 4.x        | Utility-first styling (CSS-first config) |
| ZKP          | zokrates-js                 | 1.1.9      | Client-side zk-SNARK proof gen      |
| Blockchain   | ethers.js                   | 6.14+      | Wallet connection, contract calls   |
| Wallet       | MetaMask                    | Browser ext | Key management, tx signing          |
| Smart Contract| Solidity                   | 0.8.24+    | On-chain verifier + voting logic    |
| SC Framework | Hardhat                     | 2.x        | Compile, test, deploy contracts     |
| Network      | Polygon Amoy Testnet        | Chain 80002| Free test tokens, fast blocks       |
| PWA          | @serwist/next (or next-pwa) | latest     | Service worker, offline support     |
| State        | Zustand                     | 5.x        | Lightweight client state management |
| UI Components| shadcn/ui                   | latest     | Accessible, composable components   |

---

## 3. Project Structure

```
zk-vote-maldives/
├── app/                            # Next.js App Router
│   ├── layout.tsx                  # Root layout (providers, PWA meta)
│   ├── page.tsx                    # Landing / home page
│   ├── manifest.ts                 # PWA manifest (dynamic)
│   │
│   ├── auth/
│   │   └── page.tsx                # Voter authentication (simulated NID)
│   │
│   ├── vote/
│   │   ├── page.tsx                # Ballot screen — select candidate
│   │   └── confirm/
│   │       └── page.tsx            # Proof generation + submission
│   │
│   ├── results/
│   │   └── page.tsx                # Live results from blockchain
│   │
│   ├── audit/
│   │   └── page.tsx                # Public audit — verify tally
│   │
│   ├── admin/
│   │   └── page.tsx                # Election setup (deploy, register voters)
│   │
│   └── api/
│       ├── register/
│       │   └── route.ts            # Register voter (generate commitment)
│       ├── election/
│       │   └── route.ts            # Get election metadata
│       └── audit/
│           └── route.ts            # Server-side audit computation
│
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── WalletConnect.tsx           # MetaMask connection button
│   ├── VotingCard.tsx              # Candidate selection card
│   ├── ProofStatus.tsx             # ZKP generation progress indicator
│   ├── ResultsChart.tsx            # Vote tally visualization
│   ├── AuditLog.tsx                # Blockchain event log viewer
│   ├── NetworkStatus.tsx           # Online/offline indicator
│   └── Header.tsx                  # Navigation header
│
├── lib/
│   ├── zk/
│   │   ├── circuit.zok             # ZoKrates circuit source code
│   │   ├── proving-key.bin         # Generated after trusted setup
│   │   ├── verification-key.json   # Generated after trusted setup
│   │   ├── zokrates.ts             # ZoKrates provider wrapper
│   │   └── prover.ts               # Client-side proof generation logic
│   │
│   ├── blockchain/
│   │   ├── config.ts               # Contract addresses, chain config
│   │   ├── provider.ts             # ethers.js provider + signer hooks
│   │   ├── voting-contract.ts      # Contract instance + typed helpers
│   │   └── abi/
│   │       └── ZKVoting.json       # Contract ABI (auto-generated)
│   │
│   ├── store/
│   │   ├── voter-store.ts          # Zustand: voter auth state
│   │   ├── election-store.ts       # Zustand: election config state
│   │   └── proof-store.ts          # Zustand: proof generation state
│   │
│   └── utils/
│       ├── merkle.ts               # Merkle tree utilities (voter registry)
│       ├── hash.ts                 # Poseidon / MiMC hash helpers
│       ├── offline-queue.ts        # Queue proofs when offline
│       └── constants.ts            # App-wide constants
│
├── contracts/                      # Hardhat project (smart contracts)
│   ├── contracts/
│   │   ├── ZKVoting.sol            # Main voting contract
│   │   └── Verifier.sol            # ZoKrates-generated verifier
│   ├── scripts/
│   │   ├── deploy.ts               # Deploy to Polygon Amoy
│   │   └── setup-election.ts       # Initialize election on-chain
│   ├── test/
│   │   └── ZKVoting.test.ts        # Contract unit tests
│   ├── hardhat.config.ts           # Hardhat configuration
│   └── package.json                # Separate deps for contracts
│
├── audit/                          # Python audit script
│   ├── audit.py                    # Independent tally verification
│   └── requirements.txt            # web3.py dependencies
│
├── public/
│   ├── icons/                      # PWA icons (192x192, 512x512)
│   ├── sw.js                       # Service worker (auto-generated)
│   └── offline.html                # Offline fallback page
│
├── .env.local                      # Environment variables
├── next.config.ts                  # Next.js + PWA config
├── app/globals.css                 # Tailwind v4 CSS-first config (@theme)
├── tsconfig.json                   # TypeScript configuration
├── package.json                    # Root dependencies
└── README.md                       # Project documentation
```

---

## 4. Setup Instructions

### 4.1 Prerequisites

- Node.js >= 18.17
- npm or pnpm
- MetaMask browser extension
- Git

### 4.2 Initialize the Project

```bash
# Create Next.js 16 project (App Router + Tailwind v4 + TypeScript)
npx create-next-app@latest zk-vote-maldives \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"

cd zk-vote-maldives
```

> **Note on Turbopack vs Webpack:** Next.js 16 uses Turbopack by default for
> `next dev`. However, both `zokrates-js` (WASM) and `@serwist/next` (service
> worker generation) require Webpack. Update your `package.json` dev script:
> ```json
> "scripts": {
>   "dev": "next dev --turbopack=false",
>   "build": "next build",
>   "start": "next start"
> }
> ```
> Production builds (`next build`) always use Webpack, so this only affects local dev.

### 4.3 Install Dependencies

```bash
# Core dependencies
npm install ethers@6 zustand@5 zokrates-js

# UI (shadcn/ui v4+ compatible)
npm install class-variance-authority clsx tailwind-merge lucide-react
npx shadcn@latest init

# PWA support (Serwist — modern next-pwa successor, works with Next.js 16)
npm install @serwist/next @serwist/precaching serwist

# Dev dependencies
npm install -D @types/node
```

### 4.4 Initialize Hardhat (inside /contracts)

```bash
mkdir contracts && cd contracts
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
# Select: "Create a TypeScript project"
cd ..
```

### 4.5 Install Python Audit Dependencies

```bash
cd audit
python3 -m venv venv
source venv/bin/activate
pip install web3 python-dotenv
cd ..
```

---

## 5. Feature Requirements

### 5.1 Voter Authentication (Simulated)

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| AUTH-01 | Voter enters a simulated National ID number (e.g., A123456) | Must |
| AUTH-02 | System checks if NID exists in the registered voter list (Merkle tree) | Must |
| AUTH-03 | On success, generate a voter commitment hash (Poseidon hash of NID + secret) | Must |
| AUTH-04 | Store voter secret locally in browser (localStorage / IndexedDB) | Must |
| AUTH-05 | Display wallet connection prompt (MetaMask) | Must |
| AUTH-06 | Prevent re-authentication if already authenticated in session | Should |

### 5.2 Vote Casting

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| VOTE-01 | Display list of candidates/options for the election | Must |
| VOTE-02 | Voter selects exactly one candidate | Must |
| VOTE-03 | Voter confirms their choice before proof generation | Must |
| VOTE-04 | UI shows clear "You are voting for X — this cannot be changed" confirmation | Must |
| VOTE-05 | After confirmation, begin ZKP proof generation | Must |

### 5.3 ZKP Proof Generation (Client-Side)

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| ZKP-01 | Initialize zokrates-js WASM provider on page load | Must |
| ZKP-02 | Compile the voting circuit (or load pre-compiled artifacts) | Must |
| ZKP-03 | Compute witness with private inputs: (voterSecret, candidateChoice, nid, merkleProof) | Must |
| ZKP-04 | Generate Groth16 proof using proving key | Must |
| ZKP-05 | Display progress indicator during proof generation (can take 5-30 seconds) | Must |
| ZKP-06 | Proof generation must work OFFLINE — no network calls required | Must |
| ZKP-07 | If offline, queue the generated proof for later submission | Should |
| ZKP-08 | Handle proof generation errors gracefully with user-friendly messages | Must |

### 5.4 Vote Submission (On-Chain)

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| SUB-01 | Submit proof + public signals to ZKVoting smart contract via MetaMask | Must |
| SUB-02 | Smart contract verifies the ZKP on-chain | Must |
| SUB-03 | Smart contract checks nullifier hash — reject if already used (double vote) | Must |
| SUB-04 | On valid proof, increment candidate tally and emit VoteCast event | Must |
| SUB-05 | Display transaction hash and confirmation to voter | Must |
| SUB-06 | If offline, submit from offline queue when connection returns | Should |

### 5.5 Results Display

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| RES-01 | Read candidate tallies from smart contract (read-only, no wallet needed) | Must |
| RES-02 | Display results as a bar chart or similar visualization | Must |
| RES-03 | Show total votes cast and total registered voters | Must |
| RES-04 | Auto-refresh results every 15 seconds during active election | Should |

### 5.6 Audit Page

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| AUD-01 | List all VoteCast events from the blockchain | Must |
| AUD-02 | Display nullifier hash, timestamp, and block number for each vote | Must |
| AUD-03 | Show independently computed tally from events vs. on-chain tally | Must |
| AUD-04 | Highlight any discrepancies (there should be none) | Must |
| AUD-05 | Allow export of audit log as CSV | Should |

### 5.7 Admin Panel

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| ADM-01 | Only contract owner can access admin functions | Must |
| ADM-02 | Create election: set title, candidates, start/end time | Must |
| ADM-03 | Register voters: upload list of NID hashes, build Merkle tree | Must |
| ADM-04 | Set Merkle root on smart contract | Must |
| ADM-05 | Start/stop election | Must |
| ADM-06 | View election status (active, ended, vote count) | Must |

### 5.8 PWA & Offline

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| PWA-01 | App installable on Android/iOS home screen | Must |
| PWA-02 | Service worker caches all static assets and ZKP artifacts | Must |
| PWA-03 | Offline fallback page when no cache available | Must |
| PWA-04 | Online/offline status indicator in header | Must |
| PWA-05 | ZKP proof generation works fully offline | Must |
| PWA-06 | Queued proofs auto-submit when back online | Should |

---

## 6. Page-by-Page Specification

### 6.1 Landing Page (`/`)

**Route:** `app/page.tsx`  
**Type:** Server Component (static)

```
┌──────────────────────────────────────┐
│  🗳️ ZK-Vote Maldives               │
│  ─────────────────────────────       │
│                                      │
│  "Decentralized, Privacy-Preserving  │
│   E-Voting for the Maldives"         │
│                                      │
│  [  Start Voting →  ]                │
│  [  View Results    ]                │
│  [  Audit Election  ]                │
│                                      │
│  ── How It Works ──                  │
│  1. Authenticate with your voter ID  │
│  2. Select your candidate            │
│  3. A cryptographic proof is created │
│     on YOUR device (private)         │
│  4. The proof is verified on-chain   │
│     (public & auditable)             │
│                                      │
│  Network: ● Online / Polygon Amoy   │
└──────────────────────────────────────┘
```

**Logic:**
- Static content, no data fetching
- Link to `/auth` for "Start Voting"
- Link to `/results` and `/audit`
- Show `<NetworkStatus />` component

---

### 6.2 Authentication Page (`/auth`)

**Route:** `app/auth/page.tsx`  
**Type:** Client Component (`"use client"`)

```
┌──────────────────────────────────────┐
│  Voter Authentication                │
│  ─────────────────────────────       │
│                                      │
│  National ID:  [  A______  ]         │
│  Secret Pin:   [  ****    ]          │
│                                      │
│  [ Verify & Connect Wallet → ]       │
│                                      │
│  Status: ○ Not connected             │
│                                      │
│  ℹ️  Your ID is checked against the  │
│  voter registry. Your secret pin     │
│  is NEVER sent to any server.        │
└──────────────────────────────────────┘
```

**Logic:**
1. User enters simulated NID + a secret pin (any 4-6 digit number)
2. Client computes: `commitment = PoseidonHash(nid, secret)`
3. Client checks: is this commitment in the Merkle tree?
4. If yes → prompt MetaMask connection
5. Store `{ nid, secret, commitment, merkleProof }` in Zustand store
6. Redirect to `/vote`

**Components used:** Input fields, WalletConnect, NetworkStatus

---

### 6.3 Ballot Page (`/vote`)

**Route:** `app/vote/page.tsx`  
**Type:** Client Component (`"use client"`)

```
┌──────────────────────────────────────┐
│  Cast Your Vote                      │
│  Election: "Best Campus Facility"    │
│  ─────────────────────────────       │
│                                      │
│  ┌──────────┐  ┌──────────┐         │
│  │  🏫      │  │  📚      │         │
│  │ Library  │  │ Lab      │         │
│  │  ○       │  │  ○       │         │
│  └──────────┘  └──────────┘         │
│                                      │
│  ┌──────────┐  ┌──────────┐         │
│  │  🏋️      │  │  🍽️      │         │
│  │ Gym      │  │ Cafeteria│         │
│  │  ○       │  │  ○       │         │
│  └──────────┘  └──────────┘         │
│                                      │
│  [ Confirm Vote → ]  (disabled      │
│                       until selected)│
│                                      │
│  ⚠️ You cannot change your vote     │
│     after confirmation.              │
└──────────────────────────────────────┘
```

**Logic:**
1. Fetch election metadata (candidates) from contract or API
2. Voter selects one candidate (radio-style selection)
3. On "Confirm Vote" → navigate to `/vote/confirm` with candidateIndex in store

**Guard:** Redirect to `/auth` if voter not authenticated

---

### 6.4 Proof Generation & Submission (`/vote/confirm`)

**Route:** `app/vote/confirm/page.tsx`  
**Type:** Client Component (`"use client"`)

```
┌──────────────────────────────────────┐
│  Generating Your Proof...            │
│  ─────────────────────────────       │
│                                      │
│  You voted for: Library              │
│                                      │
│  Step 1: ✅ Loading ZoKrates         │
│  Step 2: ✅ Computing witness        │
│  Step 3: ⏳ Generating proof...      │
│           ████████░░░░░ 65%          │
│  Step 4: ○ Submitting to blockchain  │
│                                      │
│  ℹ️  The proof is being created on   │
│  your device. No one can see your    │
│  vote — not even the server.         │
│                                      │
│  ── After submission ──              │
│                                      │
│  ✅ Vote submitted successfully!     │
│  Tx: 0xabc...def                     │
│  Block: #12345                       │
│                                      │
│  [ View Results → ]                  │
└──────────────────────────────────────┘
```

**Logic:**
1. Initialize `zokrates-js` WASM provider
2. Load pre-compiled circuit artifacts (from `/public` or bundled)
3. Compute witness:
   - Private inputs: `voterSecret`, `candidateIndex`, `nid`, `merklePath`, `merklePathIndices`
   - Public inputs: `merkleRoot`, `nullifierHash`, `candidateIndex`
4. Generate Groth16 proof using proving key
5. Call `ZKVoting.castVote(proof, publicSignals)` via ethers.js
6. Wait for transaction confirmation
7. Show success + tx hash

**Offline flow:**
- Steps 1-4 work offline
- Step 5: if offline → store proof in IndexedDB via `offline-queue.ts`
- When online → auto-submit

---

### 6.5 Results Page (`/results`)

**Route:** `app/results/page.tsx`  
**Type:** Client Component (`"use client"`)

```
┌──────────────────────────────────────┐
│  Election Results                    │
│  "Best Campus Facility"             │
│  ─────────────────────────────       │
│                                      │
│  Library    ████████████████ 18      │
│  Lab        ██████████░░░░░ 12       │
│  Gym        ████████░░░░░░░ 10       │
│  Cafeteria  ██████████████░ 10       │
│                                      │
│  Total votes: 50 / 50 registered    │
│  Election status: ENDED             │
│  Contract: 0xabc...def              │
│                                      │
│  [ View Full Audit → ]              │
└──────────────────────────────────────┘
```

**Logic:**
1. Read `getCandidateTally(i)` for each candidate from contract (read-only, no wallet)
2. Read `totalVotes()` and `electionStatus()`
3. Render bar chart (use a simple CSS bar or a lightweight chart lib)
4. Auto-refresh every 15s if election is active

---

### 6.6 Audit Page (`/audit`)

**Route:** `app/audit/page.tsx`  
**Type:** Client Component (`"use client"`)

```
┌──────────────────────────────────────┐
│  Election Audit Log                  │
│  ─────────────────────────────       │
│                                      │
│  On-chain tally:                     │
│  Library: 18 | Lab: 12 | Gym: 10 ..│
│                                      │
│  Recomputed from events:            │
│  Library: 18 | Lab: 12 | Gym: 10 ..│
│                                      │
│  ✅ Tallies MATCH                    │
│                                      │
│  ── Event Log (50 events) ──        │
│  ┌────┬───────────────┬──────┬─────┐│
│  │ #  │ Nullifier     │ Block│ Time ││
│  ├────┼───────────────┼──────┼─────┤│
│  │ 1  │ 0x8f3a...     │ 1001 │ 2:01││
│  │ 2  │ 0x2b7c...     │ 1002 │ 2:02││
│  │ ...│               │      │     ││
│  └────┴───────────────┴──────┴─────┘│
│                                      │
│  [ Export CSV ↓ ]                    │
└──────────────────────────────────────┘
```

**Logic:**
1. Query all `VoteCast` events from contract
2. Recompute tally by counting events per candidate
3. Compare with on-chain `getCandidateTally()` values
4. Display match/mismatch status
5. CSV export button

---

### 6.7 Admin Page (`/admin`)

**Route:** `app/admin/page.tsx`  
**Type:** Client Component (`"use client"`)

```
┌──────────────────────────────────────┐
│  Election Admin Panel                │
│  (Contract Owner Only)               │
│  ─────────────────────────────       │
│                                      │
│  Election Title: [ Best Campus ... ] │
│  Candidates: [ Library, Lab, Gym, .] │
│                                      │
│  Voter Registry:                     │
│  [ Upload NID list (.csv) ]          │
│  Registered: 50 voters              │
│  Merkle Root: 0x7f2a...             │
│                                      │
│  [ Deploy Contract ]                 │
│  [ Set Merkle Root ]                 │
│  [ Start Election  ]                 │
│  [ End Election    ]                 │
│                                      │
│  Status: ACTIVE                     │
└──────────────────────────────────────┘
```

---

## 7. ZoKrates Circuit Specification

### 7.1 Circuit File: `lib/zk/circuit.zok`

The circuit proves: **"I am a registered voter, and I voted for a valid candidate"** — without revealing who I am or who I voted for.

**Private Inputs (known only to voter):**
- `voterSecret` — the voter's secret pin
- `voterNid` — the voter's national ID number (as field element)
- `merklePath[DEPTH]` — sibling hashes for Merkle proof
- `merklePathIndices[DEPTH]` — left/right indicators (0 or 1)

**Public Inputs (visible on-chain):**
- `merkleRoot` — root of the voter registry Merkle tree
- `nullifierHash` — hash(voterSecret, electionId) — unique per election, prevents double voting
- `candidateIndex` — which candidate was selected
- `maxCandidates` — total number of candidates (to validate range)

**Circuit Logic (pseudocode):**

```zokrates
import "hashes/poseidon/poseidon" as poseidon

const u32 DEPTH = 5  // supports 2^5 = 32 voters (increase for 50+)

def main(
    private field voterSecret,
    private field voterNid,
    private field[DEPTH] merklePath,
    private field[DEPTH] merklePathIndices,
    field merkleRoot,
    field nullifierHash,
    field candidateIndex,
    field maxCandidates
) -> bool {

    // 1. Compute voter commitment = Poseidon(nid, secret)
    field commitment = poseidon([voterNid, voterSecret]);

    // 2. Verify Merkle proof: commitment exists in tree with given root
    field currentHash = commitment;
    for u32 i in 0..DEPTH {
        field left = if merklePathIndices[i] == 0 { currentHash } else { merklePath[i] };
        field right = if merklePathIndices[i] == 0 { merklePath[i] } else { currentHash };
        currentHash = poseidon([left, right]);
    }
    assert(currentHash == merkleRoot);

    // 3. Verify nullifier = Poseidon(secret, electionId=1)
    field computedNullifier = poseidon([voterSecret, 1]);
    assert(computedNullifier == nullifierHash);

    // 4. Validate candidate index is in range
    assert(candidateIndex < maxCandidates);

    return true;
}
```

### 7.2 Trusted Setup & Key Generation

```bash
# Using ZoKrates CLI (one-time setup, not in browser)
zokrates compile -i lib/zk/circuit.zok
zokrates setup
zokrates export-verifier  # Generates Verifier.sol

# Copy outputs:
# - proving.key → lib/zk/proving-key.bin (bundle with app)
# - verification.key → lib/zk/verification-key.json
# - Verifier.sol → contracts/contracts/Verifier.sol
```

### 7.3 Client-Side Proof Generation (`lib/zk/prover.ts`)

```typescript
import { initialize } from "zokrates-js";

export interface ProofInput {
  voterSecret: string;
  voterNid: string;
  merklePath: string[];
  merklePathIndices: string[];
  merkleRoot: string;
  nullifierHash: string;
  candidateIndex: string;
  maxCandidates: string;
}

export interface ProofResult {
  proof: any;
  inputs: string[];
}

let zokratesProvider: any = null;
let compiledArtifacts: any = null;
let provingKey: Uint8Array | null = null;

export async function initZoKrates(): Promise<void> {
  if (zokratesProvider) return;
  zokratesProvider = await initialize();

  // Load pre-compiled artifacts
  const artifactsResponse = await fetch("/zk/artifacts.json");
  compiledArtifacts = await artifactsResponse.json();

  // Load proving key
  const pkResponse = await fetch("/zk/proving-key.bin");
  provingKey = new Uint8Array(await pkResponse.arrayBuffer());
}

export async function generateProof(input: ProofInput): Promise<ProofResult> {
  if (!zokratesProvider || !compiledArtifacts || !provingKey) {
    throw new Error("ZoKrates not initialized. Call initZoKrates() first.");
  }

  // Compute witness
  const { witness } = zokratesProvider.computeWitness(compiledArtifacts, [
    input.voterSecret,
    input.voterNid,
    ...input.merklePath,
    ...input.merklePathIndices,
    input.merkleRoot,
    input.nullifierHash,
    input.candidateIndex,
    input.maxCandidates,
  ]);

  // Generate proof
  const proof = zokratesProvider.generateProof(
    compiledArtifacts.program,
    witness,
    provingKey
  );

  return proof;
}
```

---

## 8. Smart Contract Specification

### 8.1 ZKVoting.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Verifier.sol";

contract ZKVoting {
    // --- State ---
    Verifier public verifier;
    address public admin;

    string public electionTitle;
    string[] public candidates;
    uint256 public merkleRoot;
    bool public electionActive;

    mapping(uint256 => bool) public nullifierUsed;    // anti-double-vote
    mapping(uint256 => uint256) public candidateTally; // candidateIndex => count
    uint256 public totalVotes;

    // --- Events ---
    event VoteCast(
        uint256 indexed nullifierHash,
        uint256 indexed candidateIndex,
        uint256 timestamp
    );
    event ElectionStarted(string title, uint256 timestamp);
    event ElectionEnded(uint256 timestamp);

    // --- Modifiers ---
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier electionIsActive() {
        require(electionActive, "Election not active");
        _;
    }

    // --- Constructor ---
    constructor(address _verifier) {
        verifier = Verifier(_verifier);
        admin = msg.sender;
    }

    // --- Admin Functions ---
    function setupElection(
        string memory _title,
        string[] memory _candidates,
        uint256 _merkleRoot
    ) external onlyAdmin {
        require(!electionActive, "Election already active");
        electionTitle = _title;
        candidates = _candidates;
        merkleRoot = _merkleRoot;
    }

    function startElection() external onlyAdmin {
        require(candidates.length > 0, "No candidates");
        require(merkleRoot != 0, "Merkle root not set");
        electionActive = true;
        emit ElectionStarted(electionTitle, block.timestamp);
    }

    function endElection() external onlyAdmin {
        electionActive = false;
        emit ElectionEnded(block.timestamp);
    }

    // --- Voting ---
    function castVote(
        Verifier.Proof memory _proof,
        uint256[4] memory _publicInputs
        // [0] = merkleRoot
        // [1] = nullifierHash
        // [2] = candidateIndex
        // [3] = maxCandidates
    ) external electionIsActive {

        uint256 _merkleRoot = _publicInputs[0];
        uint256 _nullifier = _publicInputs[1];
        uint256 _candidateIdx = _publicInputs[2];
        uint256 _maxCandidates = _publicInputs[3];

        // Checks
        require(_merkleRoot == merkleRoot, "Invalid Merkle root");
        require(!nullifierUsed[_nullifier], "Already voted");
        require(_candidateIdx < candidates.length, "Invalid candidate");
        require(_maxCandidates == candidates.length, "Candidate count mismatch");

        // Verify ZKP on-chain
        require(
            verifier.verifyTx(_proof, _publicInputs),
            "Invalid ZK proof"
        );

        // Record vote
        nullifierUsed[_nullifier] = true;
        candidateTally[_candidateIdx] += 1;
        totalVotes += 1;

        emit VoteCast(_nullifier, _candidateIdx, block.timestamp);
    }

    // --- View Functions ---
    function getCandidateCount() external view returns (uint256) {
        return candidates.length;
    }

    function getCandidateName(uint256 index) external view returns (string memory) {
        return candidates[index];
    }

    function getCandidateTally(uint256 index) external view returns (uint256) {
        return candidateTally[index];
    }
}
```

---

## 9. Database / State Schema

This project is **database-less by design** — all persistent state lives on-chain. Client state is managed with Zustand.

### 9.1 Zustand Stores

**voter-store.ts:**
```typescript
interface VoterState {
  isAuthenticated: boolean;
  nid: string | null;
  secret: string | null;
  commitment: string | null;
  merkleProof: string[] | null;
  merklePathIndices: number[] | null;
  walletAddress: string | null;
  setVoter: (data: Partial<VoterState>) => void;
  reset: () => void;
}
```

**election-store.ts:**
```typescript
interface ElectionState {
  title: string;
  candidates: string[];
  merkleRoot: string;
  isActive: boolean;
  contractAddress: string;
  totalVotes: number;
  setElection: (data: Partial<ElectionState>) => void;
}
```

**proof-store.ts:**
```typescript
interface ProofState {
  selectedCandidate: number | null;
  proofStatus: "idle" | "initializing" | "computing" | "proving" | "submitting" | "done" | "error";
  proof: any | null;
  txHash: string | null;
  error: string | null;
  setCandidate: (index: number) => void;
  setStatus: (status: ProofState["proofStatus"]) => void;
  setProof: (proof: any) => void;
  setTxHash: (hash: string) => void;
  setError: (error: string) => void;
  reset: () => void;
}
```

### 9.2 IndexedDB (Offline Queue)

```typescript
// lib/utils/offline-queue.ts
interface QueuedVote {
  id: string;           // UUID
  proof: any;           // ZKP proof object
  publicInputs: string[]; // Public signals
  timestamp: number;    // When generated
  submitted: boolean;   // Submission status
}
```

---

## 10. API Routes Specification

### 10.1 `POST /api/register`

Registers a voter and returns their Merkle proof.

**Request:**
```json
{
  "nid": "A123456",
  "commitment": "0x7f2a..."
}
```

**Response:**
```json
{
  "success": true,
  "merkleProof": ["0xabc...", "0xdef...", "0x123...", "0x456...", "0x789..."],
  "merklePathIndices": [0, 1, 0, 1, 0],
  "merkleRoot": "0x9f3b...",
  "leafIndex": 7
}
```

### 10.2 `GET /api/election`

Returns current election metadata.

**Response:**
```json
{
  "title": "Best Campus Facility",
  "candidates": ["Library", "Lab", "Gym", "Cafeteria"],
  "merkleRoot": "0x9f3b...",
  "isActive": true,
  "contractAddress": "0xabc...",
  "totalVotes": 23,
  "tallies": [8, 5, 6, 4]
}
```

### 10.3 `GET /api/audit`

Returns all vote events for independent verification.

**Response:**
```json
{
  "events": [
    {
      "nullifierHash": "0x8f3a...",
      "candidateIndex": 0,
      "blockNumber": 1001,
      "timestamp": 1709145600,
      "transactionHash": "0xabc..."
    }
  ],
  "recomputedTally": [8, 5, 6, 4],
  "onChainTally": [8, 5, 6, 4],
  "match": true
}
```

---

## 11. PWA Configuration

### 11.1 Service Worker (`app/sw.ts`)

```typescript
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

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
      urlPattern: /\/zk\/.+\.(bin|json|wasm)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "zkp-artifacts",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    // Election API — network first, fallback to cache
    {
      urlPattern: /\/api\/election/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "election-api",
        expiration: {
          maxEntries: 5,
          maxAgeSeconds: 60 * 60, // 1 hour
        },
      },
    },
  ],
});

serwist.addEventListeners();
```

### 11.2 `app/manifest.ts`

```typescript
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ZK-Vote Maldives",
    short_name: "ZK-Vote",
    description: "Decentralized Privacy-Preserving E-Voting for the Maldives",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#2563eb",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
```

### 11.3 Tailwind v4 CSS-First Configuration

Tailwind CSS v4 removes `tailwind.config.js` entirely. All theme tokens live in your CSS:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-primary: #2563eb;
  --color-primary-dark: #1d4ed8;
  --color-success: #16a34a;
  --color-danger: #dc2626;
  --color-background: #0a0a0a;
  --color-surface: #171717;
  --color-text: #fafafa;
  --color-text-muted: #a3a3a3;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --radius-lg: 0.75rem;
  --radius-md: 0.5rem;
}
```

> No `tailwind.config.ts` file is needed. The `@theme` block replaces it entirely.
> All design tokens become CSS custom properties automatically.

### 11.4 Service Worker Strategy

```
Cache Strategy:
├── Static Assets (JS, CSS, images) → Cache First
├── ZKP Artifacts (proving-key.bin, artifacts.json) → Cache First
├── API /api/election → Network First (fallback to cache)
├── Blockchain RPC calls → Network Only
└── HTML pages → Stale While Revalidate
```

### 11.5 `next.config.ts`

```typescript
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development", // Disable SW in dev to avoid caching issues
});

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // IMPORTANT: Serwist + zokrates-js WASM both require Webpack.
  // Next.js 16 defaults to Turbopack, but we override for compatibility.
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
```

---

## 12. Environment Variables

### `.env.local`

```bash
# Blockchain
NEXT_PUBLIC_POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...   # After deployment

# Admin
ADMIN_PRIVATE_KEY=0x...              # For server-side admin operations (NEVER expose)

# Election
NEXT_PUBLIC_ELECTION_ID=1
NEXT_PUBLIC_MERKLE_DEPTH=6           # 2^6 = 64 max voters (enough for N=50)
```

---

## 13. Testing Plan

### 13.1 Unit Tests

| Test Area | Tool | Key Tests |
|-----------|------|-----------|
| ZoKrates Circuit | ZoKrates CLI | Valid voter accepted, invalid voter rejected, wrong candidate rejected |
| Smart Contract | Hardhat + Chai | Deploy, setup election, cast valid vote, reject double vote, reject invalid proof |
| Merkle Tree | Jest | Build tree, generate proof, verify proof, wrong proof fails |
| Offline Queue | Jest | Queue vote, retrieve, mark submitted |

### 13.2 Integration Tests

| Test | Description |
|------|-------------|
| Full Flow | Auth → Vote → Proof → Submit → Verify on-chain → Check tally |
| Double Vote | Same voter tries to vote twice → second tx reverts |
| Invalid Proof | Modified proof → contract rejects |
| Offline → Online | Generate proof offline → come back online → auto-submit |

### 13.3 Mock Election Tests (N=50)

| Metric | Target | Method |
|--------|--------|--------|
| Double vote rejection | 100% | 5 bad actors attempt double votes |
| Tally accuracy | Audit script matches on-chain | Run audit.py after election |
| SUS Score | > 68 (average) | Post-election SUS survey |
| Proof generation time | < 30 seconds on mid-range phone | Measure on Samsung A-series |

---

## 14. Deployment

### 14.1 Frontend (PWA)

```bash
# Build
npm run build

# Option 1: Vercel (recommended for Next.js)
npx vercel

# Option 2: Self-hosted
npm run start
```

### 14.2 Smart Contracts

```bash
cd contracts

# Compile
npx hardhat compile

# Deploy to Polygon Amoy
npx hardhat run scripts/deploy.ts --network amoy

# Verify on PolygonScan (optional)
npx hardhat verify --network amoy <CONTRACT_ADDRESS>
```

### 14.3 Hardhat Network Config

```typescript
// contracts/hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    amoy: {
      url: "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
    },
  },
};

export default config;
```

---

## Quick Start Checklist

- [x] Run `npx create-next-app@latest` with App Router + TypeScript + Tailwind
- [x] Install deps: `ethers`, `zustand`, `zokrates-js`, `@serwist/next`, `shadcn/ui`
- [x] Create folder structure as specified in Section 3
- [x] Build the landing page (`/`) first — static, no deps
- [x] Build auth page (`/auth`) — wallet connection + simulated NID
- [x] Build ballot page (`/vote`) — candidate selection UI
- [x] Write the ZoKrates circuit (`circuit.zok`) and compile
- [ ] Run trusted setup → get proving key + verification key + Verifier.sol
- [x] Write `ZKVoting.sol` contract referencing `Verifier.sol`
- [ ] Deploy contracts to Polygon Amoy testnet
- [x] Build proof generation page (`/vote/confirm`) — integrate zokrates-js
- [x] Build results page (`/results`) — read tally from contract
- [x] Build audit page (`/audit`) — read events, recompute tally
- [x] Configure PWA (manifest, service worker, offline caching)
- [ ] Test full flow end-to-end
- [ ] Prepare for mock election with 50 participants

---

## 15. Development Progress Log

### Phase 1: Layer 1 — Client PWA (COMPLETED — 28 Feb 2026)

Layer 1 (Client PWA) has been fully implemented. All frontend pages, components,
state management, blockchain integration wrappers, ZKP client-side logic, API
routes, and PWA configuration are in place. The project builds successfully with
webpack and the dev server runs at `http://localhost:3000`.

#### 15.1 Dependencies Installed

| Package | Version | Purpose |
|---------|---------|---------|
| ethers | 6.x | Wallet connection, contract interaction via MetaMask |
| zustand | 5.x | Lightweight client state management (voter, election, proof stores) |
| zokrates-js | 1.1.9 | Client-side WASM ZKP proof generation |
| @serwist/next | latest | Service worker generation, offline caching |
| @serwist/precaching | latest | Precache support for Serwist |
| serwist | latest | Runtime caching strategies (CacheFirst, NetworkFirst) |
| class-variance-authority | latest | shadcn/ui dependency |
| clsx | latest | shadcn/ui dependency |
| tailwind-merge | latest | shadcn/ui dependency |
| lucide-react | latest | Icon library for UI |

shadcn/ui was initialized with defaults (new-york style, neutral base, CSS variables).

#### 15.2 Configuration Changes

- **`package.json`** — Dev/build scripts changed to `next dev --webpack` / `next build --webpack` because Next.js 16 defaults to Turbopack, but zokrates-js (WASM) and @serwist/next both require Webpack.
- **`next.config.ts`** — Added Serwist wrapper (`withSerwist`) and Webpack config for `asyncWebAssembly` experiment + `.wasm` module rules.
- **`app/globals.css`** — Extended with ZK-Vote custom theme tokens (`--color-success`, `--color-warning`, `--color-info`, `--color-online`, `--color-offline`) on top of shadcn defaults. Tailwind v4 CSS-first `@theme inline` block used throughout.
- **`app/layout.tsx`** — Updated metadata (title template, description, manifest, Apple web app config), viewport settings, dark mode default (`<html class="dark">`), and added global `<Header />` component.
- **`.env.local`** — Template created with `NEXT_PUBLIC_POLYGON_AMOY_RPC`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_ELECTION_ID`, `NEXT_PUBLIC_MERKLE_DEPTH`.

#### 15.3 Pages Implemented

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/` | `app/page.tsx` | ✅ Done | Static server component. Hero section, 3 CTAs (Start Voting, View Results, Audit Election), "How It Works" 4-step cards. |
| `/auth` | `app/auth/page.tsx` | ✅ Done | Client component. NID + secret pin inputs, computes commitment via `computeCommitment()`, calls `POST /api/register` to get Merkle proof, stores to Zustand, MetaMask connect via `<WalletConnect />`, redirects to `/vote` on success. Guards against re-auth. |
| `/vote` | `app/vote/page.tsx` | ✅ Done | Client component. Fetches election metadata from `/api/election`, renders candidate cards via `<VotingCard />`, radio-style selection. Guards: redirects to `/auth` if not authenticated. Stores selected candidate index in proof store. |
| `/vote/confirm` | `app/vote/confirm/page.tsx` | ✅ Done | Client component. 4-step proof flow: (1) init ZoKrates WASM, (2) compute witness, (3) generate Groth16 proof, (4) submit on-chain via `castVote()`. Graceful fallback: if ZKP artifacts unavailable (pre-trusted-setup), creates mock proof for UI demo. If offline, queues proof via `offline-queue.ts`. Shows tx hash on success. |
| `/results` | `app/results/page.tsx` | ✅ Done | Client component. Fetches tallies from `/api/election`, renders bar chart via `<ResultsChart />`, auto-refreshes every 15s, shows election status badge, link to PolygonScan contract + audit page. |
| `/audit` | `app/audit/page.tsx` | ✅ Done | Client component. Fetches from `/api/audit`, side-by-side on-chain vs recomputed tally cards, match/mismatch status banner, `<AuditLog />` table with CSV export. |
| `/admin` | `app/admin/page.tsx` | ✅ Done | Client component. Wallet connect, election title/candidates configuration, voter NID textarea for registration, Start/End election buttons. Currently prototype-mode (UI-only actions); will wire to contract calls after Layer 2 deployment. |

#### 15.4 Components Implemented

| Component | File | Description |
|-----------|------|-------------|
| Header | `components/Header.tsx` | Sticky top nav with route links (Home, Vote, Results, Audit, Admin), active route highlight, responsive icon-only on mobile, `<NetworkStatus />` badge. |
| NetworkStatus | `components/NetworkStatus.tsx` | Online/offline badge using `navigator.onLine` + event listeners. Green "Online" / red "Offline" with Wifi/WifiOff icons. |
| WalletConnect | `components/WalletConnect.tsx` | MetaMask connection button. Calls `connectWallet()` from provider, stores address in voter store. Shows truncated address when connected. Error display. |
| VotingCard | `components/VotingCard.tsx` | Candidate selection card with emoji icon, name, radio indicator. Keyboard accessible (Enter/Space). Blue ring highlight when selected. |
| ProofStatus | `components/ProofStatus.tsx` | 4-step progress display (Loading ZoKrates → Computing witness → Generating proof → Submitting to blockchain). Uses check/spinner/circle/alert icons per step state. |
| ResultsChart | `components/ResultsChart.tsx` | Horizontal bar chart. Shows candidate name, vote count, percentage. Bar width proportional to max tally. CSS-based (no chart library). |
| AuditLog | `components/AuditLog.tsx` | Event log table (index, truncated nullifier hash, block number, timestamp). CSV export button generates blob download. |

**shadcn/ui components (8):** Button, Card, Input, Label, Badge, Progress, Table, Separator.

#### 15.5 State Management (Zustand Stores)

| Store | File | Persisted | Fields |
|-------|------|-----------|--------|
| Voter | `lib/store/voter-store.ts` | ✅ localStorage | `isAuthenticated`, `nid`, `secret`, `commitment`, `merkleProof`, `merklePathIndices`, `walletAddress` |
| Election | `lib/store/election-store.ts` | ❌ | `title`, `candidates`, `merkleRoot`, `isActive`, `contractAddress`, `totalVotes`, `tallies` |
| Proof | `lib/store/proof-store.ts` | ❌ | `selectedCandidate`, `proofStatus` (idle/initializing/computing/proving/submitting/done/error), `proof`, `txHash`, `error` |

#### 15.6 Utility Libraries

| File | Purpose |
|------|---------|
| `lib/utils/constants.ts` | App-wide constants: chain config, Merkle depth (6), proof artifact paths, default candidates, refresh intervals, IndexedDB names. |
| `lib/utils/hash.ts` | Poseidon placeholder using ethers.js `keccak256`. Functions: `poseidonHash()`, `computeCommitment(nid, secret)`, `computeNullifier(secret, electionId)`, `nidToField()`, `hashToBigInt()`. **Note:** Will need to replace with real Poseidon hash matching the ZoKrates circuit when artifacts are generated. |
| `lib/utils/merkle.ts` | Binary Merkle tree: `buildMerkleTree()` (pads to 2^depth), `getMerkleRoot()`, `generateMerkleProof()` (returns path + indices), `verifyMerkleProof()`. Uses `poseidonHash()` from hash.ts. |
| `lib/utils/offline-queue.ts` | IndexedDB-backed queue: `queueVote()`, `getPendingVotes()`, `markSubmitted()`, `clearSubmitted()`. Stores proof + public inputs with UUID and timestamp. |

#### 15.7 ZoKrates Integration

| File | Status | Notes |
|------|--------|-------|
| `lib/zk/zokrates.ts` | ✅ Done | Lazy singleton provider via `getZoKratesProvider()`. Wraps `zokrates-js` `initialize()`. |
| `lib/zk/prover.ts` | ✅ Done | `loadArtifacts()` fetches from `/public/zk/`. `generateProof(input)` computes witness + Groth16 proof. Uses proper `CompilationArtifacts` type from zokrates-js. |
| `lib/zk/circuit.zok` | ✅ Reference | ZoKrates source code in comments (DEPTH=6, Poseidon-based). Needs CLI compilation to produce artifacts. |
| `public/zk/` | ⬜ Empty | Placeholder directory. Will contain `artifacts.json` and `proving-key.bin` after trusted setup (Layer 2 prerequisite). |

#### 15.8 Blockchain Integration

| File | Status | Notes |
|------|--------|-------|
| `lib/blockchain/config.ts` | ✅ Done | Chain config (Polygon Amoy 80002), contract address from env. |
| `lib/blockchain/provider.ts` | ✅ Done | Read-only `JsonRpcProvider`, `connectWallet()` with network switching, `getConnectedAddress()`. Handles chain-not-added (4902) error. |
| `lib/blockchain/voting-contract.ts` | ✅ Done | Full typed wrappers: `getReadContract()`, `getWriteContract()`, `castVote()`, `setupElection()`, `startElection()`, `endElection()`, `getAllCandidates()`, `getVoteCastEvents()`. |
| `lib/blockchain/abi/ZKVoting.json` | ✅ Done | Complete ABI matching the `ZKVoting.sol` spec (Section 8). Includes Groth16 proof struct types. |

#### 15.9 API Routes

| Route | Method | File | Notes |
|-------|--------|------|-------|
| `/api/register` | POST | `app/api/register/route.ts` | In-memory voter registry. Adds commitment, builds Merkle tree, returns proof + indices + root. Prototype-mode (resets on server restart). |
| `/api/election` | GET | `app/api/election/route.ts` | ✅ **Wired to contract.** Reads live on-chain data (title, active state, Merkle root, candidates, tallies, totalVotes) via `voting-contract.ts` when `CONTRACT_ADDRESS` is set and valid (42 chars). Falls back to prototype defaults (4 candidates, zero tallies) when contract is not deployed or call fails. |
| `/api/audit` | GET | `app/api/audit/route.ts` | ✅ **Wired to contract.** Reads all `VoteCast` events via `getVoteCastEvents()`, independently recomputes tallies from raw events, compares with on-chain `getAllCandidates()` tallies, and returns `match: boolean` for integrity verification. Falls back to empty events + zero tallies when contract is not deployed. |

#### 15.10 PWA Configuration

| File | Status | Notes |
|------|--------|-------|
| `app/manifest.ts` | ✅ Done | Dynamic manifest: name, icons, standalone display, dark theme. |
| `app/sw.ts` | ✅ Done | Serwist service worker. ZKP artifacts cached with `CacheFirst` (1 year). Election API cached with `NetworkFirst` (1 hour fallback). Default cache for static assets. |
| `next.config.ts` | ✅ Done | Serwist plugin wraps config. WASM async experiment enabled. SW disabled in dev mode. |
| `public/offline.html` | ✅ Done | Minimal offline fallback page. |

#### 15.11 Build Status

- **Production build:** ✅ Passes (`next build --webpack`)
- **Dev server:** ✅ Runs at `http://localhost:3000`
- **All routes returning 200:** ✅ Confirmed (`/`, `/auth`, `/vote`, `/results`, `/audit`, `/admin`, `/api/election`)
- **TypeScript:** ✅ No type errors
- **Warning:** zokrates-js chunk is 6.76 MB (won't be precached by service worker — acceptable since it's loaded on-demand)

---

### Phase 2: Layer 2 — Smart Contracts (COMPLETED — 28 Feb 2026)

All smart contract development is complete. The Hardhat project is initialized,
contracts are written and compiled, unit tests pass (32/32), deployment and
setup scripts are ready, and the frontend API routes are wired to read from
the deployed contract (with prototype fallbacks when no contract is deployed).

#### Completed Steps:
1. ✅ Initialized Hardhat 2.28.6 project inside `/contracts`
2. ✅ Wrote `Verifier.sol` (Groth16 pairing-based, placeholder VK — replace after trusted setup)
3. ✅ Wrote `ZKVoting.sol` with full election lifecycle + ZKP-verified voting
4. ✅ Wrote deployment script (`scripts/deploy.ts`) — deploys Verifier then ZKVoting
5. ✅ Wrote election setup script (`scripts/setup-election.ts`)
6. ✅ Wrote comprehensive unit tests (`test/ZKVoting.test.ts`) — 32 tests, all passing
7. ✅ Created artifact sync script (`scripts/sync-artifacts.sh`)
8. ✅ Wrote ZoKrates circuit (`contracts/circuits/circuit.zok`) — ready for CLI compilation
9. ✅ Synced compiled ABI to frontend (`lib/blockchain/abi/ZKVoting.json`)
10. ✅ Wired `/api/election` and `/api/audit` routes to read from contract when deployed
11. ✅ Added `contracts` to root `tsconfig.json` exclude list
12. ✅ Frontend build still passes after all changes

#### Files Created/Modified:

| File | Type | Description |
|------|------|-------------|
| `contracts/package.json` | Config | Hardhat 2.28.6, toolbox v5, dotenv, OpenZeppelin |
| `contracts/hardhat.config.ts` | Config | Solidity 0.8.24, optimizer on, Polygon Amoy network, Hardhat local |
| `contracts/tsconfig.json` | Config | TypeScript config for Hardhat scripts/tests |
| `contracts/.env` | Config | Template for deployer key + contract addresses |
| `contracts/.gitignore` | Config | Ignores node_modules, cache, artifacts, .env |
| `contracts/contracts/Verifier.sol` | Contract | Groth16 Pairing library + Verifier with placeholder VK (5 IC points for 4 public inputs). Replace with `zokrates export-verifier` output after trusted setup. |
| `contracts/contracts/ZKVoting.sol` | Contract | Main voting contract — admin setup/start/end, castVote with on-chain ZKP verification, nullifier tracking, candidate tallies, VoteCast events |
| `contracts/circuits/circuit.zok` | Circuit | ZoKrates circuit source (DEPTH=6, Poseidon hash, Merkle proof, nullifier check, candidate range) |
| `contracts/scripts/deploy.ts` | Script | Deploys Verifier → ZKVoting, prints addresses |
| `contracts/scripts/setup-election.ts` | Script | Sets up demo election with 4 candidates and starts it |
| `contracts/scripts/sync-artifacts.sh` | Script | Copies ZK artifacts to public/zk/, Verifier.sol to contracts/, ABI to frontend |
| `contracts/test/ZKVoting.test.ts` | Test | 32 unit tests across 6 categories |
| `app/api/election/route.ts` | Modified | Now reads from contract when deployed, falls back to defaults |
| `app/api/audit/route.ts` | Modified | Now reads VoteCast events + recomputes tallies from contract |
| `tsconfig.json` | Modified | Added `"contracts"` to exclude array |
| `lib/blockchain/abi/ZKVoting.json` | Synced | Updated from compiled Hardhat artifact (16 ABI entries) |

#### Test Results (32/32 passing):

| Category | Tests | Status |
|----------|-------|--------|
| Deployment | 4 | ✅ All pass |
| Election Setup | 7 | ✅ All pass |
| Election Lifecycle | 8 | ✅ All pass |
| Vote Casting Guards | 4 | ✅ All pass |
| View Functions | 6 | ✅ All pass |
| Verifier | 3 | ✅ All pass |

#### Remaining Before Testnet Deployment:
1. Install ZoKrates CLI and compile `contracts/circuits/circuit.zok`
2. Run trusted setup (`zokrates setup`) to generate proving.key + verification.key
3. Export verifier (`zokrates export-verifier`) to replace placeholder Verifier.sol
4. Run `bash scripts/sync-artifacts.sh` to copy artifacts
5. Recompile contracts (`npx hardhat compile`)
6. Fund deployer wallet with Polygon Amoy POL
7. Set `DEPLOYER_PRIVATE_KEY` in `contracts/.env`
8. Deploy (`npx hardhat run scripts/deploy.ts --network amoy`)
9. Update `NEXT_PUBLIC_CONTRACT_ADDRESS` in root `.env.local`

### Phase 3: Layer 3 — Audit & Testing (NOT STARTED)

**Next steps:**
1. Create Python audit script (`audit/audit.py`)
2. Replace Poseidon placeholder hash with real Poseidon matching circuit
3. End-to-end integration testing (full flow: auth → vote → proof → submit → verify → tally)
4. Mock election with N=50 participants
5. SUS survey + performance metrics collection
