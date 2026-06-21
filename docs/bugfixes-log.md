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

## 3. Audit Page — On-Chain Event Log Recomputation (Removed Due to Platform Limitations)

### What Was Attempted
The `/audit` page was designed to independently recompute the vote tally by fetching all `VoteCast` events directly from the Polygon Amoy blockchain using `eth_getLogs`, then counting them client-side. This would have provided a second, independent verification of the tally stored in the smart contract — a core auditability feature for the research prototype.

### Why It Failed — RPC Limitations (Systematic)

Every available free public RPC for Polygon Amoy was investigated and each blocked the approach for a different reason:

| RPC Endpoint | Failure Mode |
|---|---|
| `rpc-amoy.polygon.technology` (official) | Limits `eth_getLogs` to ~50 blocks per request. Votes fell outside this window immediately. |
| `polygon-amoy-bor-rpc.publicnode.com` | Requires a paid archive node token for `eth_getLogs` beyond recent blocks. Free tier returns empty. |
| `rpc.ankr.com/polygon_amoy` | Requires an API key even for basic `eth_getLogs`. No anonymous access. |
| `polygon-amoy.drpc.org` | Hard block range cap (~1,000 blocks per request). Chunking across the full election history hit rate limits and returned inconsistent results. |

The root technical constraint: Polygon Amoy is a testnet and all viable free RPC providers restrict or gate `eth_getLogs` to prevent abuse. An archive node subscription (e.g. Alchemy, QuickNode) would resolve this, but was outside scope for this research prototype.

### Additional Complication — ethers.js v6 API Change
During investigation, a secondary bug was found: the code called `contract.runner?.provider?.getBlockNumber()` which always returned `undefined` in ethers.js v6. In v6, `contract.runner` IS the provider directly — there is no `.provider` sub-property. This meant the block range calculation was broken regardless of which RPC was used.

### Decision
Given that no free RPC could reliably serve `eth_getLogs` for the full election history, the recomputed tally feature was removed from the audit page entirely. The audit page was simplified to:
- Display the on-chain tally read directly from the contract's `getAllCandidates()` view function (which works on all RPCs with no block range restriction).
- Provide direct links to Polygonscan (Amoy) so any participant can independently verify the `VoteCast` event log through a block explorer.

This approach still satisfies the auditability requirement of the research: the smart contract state is publicly readable, and the full event history is verifiable on Polygonscan without requiring a custom indexer.

## 4. Admin UX Overhaul
**Issue:**
The `/admin` page had confusing separated buttons ("Configure" and "Register") causing admins to skip steps, resulting in an empty or mismatched Merkle Tree being deployed.

**Solution:**
- Redesigned `/admin` as a strict, sequential, 4-step wizard.
- Merged "Register" and "Deploy" into a single atomic action to guarantee the generated Merkle tree always matches the deployed smart contract root.
