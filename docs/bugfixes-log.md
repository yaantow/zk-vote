# ZK-Vote Maldives: Architecture & Bugfix Log

This document tracks recent critical fixes related to the Merkle tree registry, ZK proof generation, and Polygon Amoy testnet RPC limitations.

## 1. Voter Registry Persistence (Fixed "Voter Not Registered")
**Issue:** 
The admin dashboard registered voters entirely in memory. Every time the Next.js dev server restarted (which happens often in local development), the server memory was wiped. When voters went to `/auth`, the server had forgotten them, leading to `Voter not registered` errors despite the contract already holding the Merkle Root.

**Solution:**
- Created `.registry-data.json` to persist the mapping of `NID` -> `Commitment`.
- The `/api/register` route now automatically loads from this JSON file on a cold start.
- This ensures the local Merkle Tree perfectly matches the on-chain Merkle Root even across server reboots.

## 2. React Strict Mode Double Submission (Fixed "Replacement Fee Too Low")
**Issue:**
Voters saw a console error `replacement fee too low` right after voting successfully. 
React's Strict Mode in development double-invokes `useEffect`. The proof generation function (`runProofGeneration`) was being called twice simultaneously. The second call tried to replace the pending first transaction with the same gas fee, triggering a rejection.

**Solution:**
- Added a `useRef(false)` guard inside `app/(voter)/vote/confirm/page.tsx` to instantly block the duplicate React Strict Mode effect from firing the blockchain transaction twice.

## 3. Audit Page Polygon RPC Limits (Fixed "0 Tally Recomputation")
**Issue:**
The `/api/audit` page was rendering the on-chain tally and recomputed tally as exactly `[0, 0, 0, 0]` despite votes successfully appearing on the `/results` page.
The default Polygon Amoy public RPC (`rpc-amoy.polygon.technology`) strictly limits `eth_getLogs` (event queries) to ~50 blocks. The vote events were pushed outside this 50-block window, causing the query to fail and fallback to default zero data.

**Solution:**
- Updated `getVoteCastEvents` in `lib/blockchain/voting-contract.ts`.
- Implemented a dedicated high-capacity public RPC specifically for auditing (`polygon-amoy-bor-rpc.publicnode.com`).
- Added robust chunking to query up to 30,000 blocks backwards in 10,000-block chunks to ensure we seamlessly fetch the entire election history.

## 4. Admin UX Overhaul
**Issue:**
The `/admin` page had confusing separated buttons ("Configure" and "Register") causing admins to skip steps, resulting in an empty or mismatched Merkle Tree being deployed.

**Solution:**
- Redesigned `/admin` as a strict, sequential, 4-step wizard.
- Merged "Register" and "Deploy" into a single atomic action to guarantee the generated Merkle tree always matches the deployed smart contract root.
