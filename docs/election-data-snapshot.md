# Election Data Snapshot — Presidential Election 2028

This document captures the complete data collected during the live research trial of the ZK-Vote Maldives system. It is intended as a reference for the RS6005 Design Science Research paper.

---

## Election Overview

| Field | Value |
|---|---|
| Title | Presidential Election 2028 |
| Smart Contract | `0x14550E11e18aB93E5378A7695bD14196ff9f5C21` (Polygon Amoy) |
| Merkle Tree Depth | 6 (supports up to 64 registered voters) |
| Status at snapshot | Active |
| First vote recorded | 2026-06-19 18:03 UTC |
| Last vote recorded | 2026-06-21 17:30 UTC |
| Total duration | ~47.5 hours |
| Total votes cast | 50 |

---

## Vote Tally (On-Chain)

| Candidate | Votes | Share |
|---|---|---|
| MDP | 30 | 60.0% |
| PNC | 4 | 8.0% |
| PPM | 8 | 16.0% |
| MDA | 8 | 16.0% |

**Winner: MDP** with 30 out of 50 votes (60%).

Tally source: `getAllCandidates()` view function on the deployed smart contract. Independently verifiable at:
- https://amoy.polygonscan.com/address/0x14550E11e18aB93E5378A7695bD14196ff9f5C21

---

## Performance Metrics

Metrics were collected client-side during the voting flow and flushed to the server upon successful vote submission. Three phases are measured per voter session.

> **Note on zkp-init:** The ZoKrates WASM provider is cached after the first initialisation. Records with sub-2 ms values represent warm cache hits (provider already loaded in memory). Records in the hundreds-to-thousands ms range represent cold starts (fresh page load or new browser session). The distribution is intentionally bimodal.

### ZKP Initialisation (`zkp-init`) — ZoKrates WASM load

| Stat | Value |
|---|---|
| n | 79 |
| Min | 0.2 ms |
| Max | 7,443 ms |
| **Mean** | **1,307.1 ms** |
| **Median** | **2 ms** |
| P95 | 6,047 ms |
| Std Dev | 2,012.9 ms |

The high standard deviation reflects the bimodal split between cold starts (~1–7 s) and warm cache hits (<2 ms). Cold start cost is a one-time overhead per browser session.

### Proof Generation (`zkp-proof`) — Groth16 proof

| Stat | Value |
|---|---|
| n | 79 |
| Min | 559 ms |
| Max | 1,981 ms |
| **Mean** | **880.6 ms** |
| **Median** | **735.1 ms** |
| P95 | 1,512 ms |
| Std Dev | 289.7 ms |

Proof generation is consistent across devices. The sub-second median demonstrates that Groth16 proof generation is practical for browser-based voting on consumer hardware.

### On-Chain Submission (`tx-submit`) — Polygon Amoy transaction

| Stat | Value |
|---|---|
| n | 51 |
| Min | 2,390 ms |
| Max | 9,956 ms |
| **Mean** | **6,381.4 ms** |
| **Median** | **7,378.2 ms** |
| P95 | 9,134 ms |
| Std Dev | 2,117.3 ms |

Transaction submission time depends on Polygon Amoy testnet block time and RPC latency. The ~6–7 s median is typical for Amoy. This phase is network-bound, not computation-bound.

### End-to-End Voting Time (estimated)

Summing median values across phases: **2 ms (init, warm) + 735 ms (proof) + 7,378 ms (tx) ≈ 8.1 seconds** for a returning user with cached WASM.

For a first-time user (cold init): **~3,000 ms + 735 ms + 7,378 ms ≈ 11 seconds** (using approximate cold-start median).

---

## SUS Survey Results

50 participants completed the 10-item System Usability Scale survey immediately after voting.

### Aggregate Statistics

| Stat | Value |
|---|---|
| n | 50 |
| Min score | 15.0 |
| Max score | 100.0 |
| **Mean score** | **83.2** |
| **Median score** | **85.0** |
| P95 | 100.0 |
| Std Dev | 17.3 |

### SUS Grade

**Grade: A — Excellent** (score ≥ 80.8)

A mean SUS score of **83.2** places the system in the **top ~15% of tested products** globally. A score above 80.3 is considered "excellent" and indicates that users found the system highly usable despite the underlying cryptographic complexity being entirely hidden from them.

### Score Distribution

| Range | Label | Count | % |
|---|---|---|---|
| 85–100 | Excellent / Best Imaginable | 30 | 60% |
| 70–84.9 | Good | 12 | 24% |
| 51–69.9 | OK / Poor | 5 | 10% |
| < 51 | Awful | 3 | 6% |

The 3 scores below 51 (scores: 47.5, 20, 15) are notable outliers. The score of 15 in particular suggests the respondent may have misunderstood the Likert scale direction (strongly agree vs. strongly disagree) — a known issue with self-administered SUS surveys.

---

## Summary for Research Paper

| Metric | Value |
|---|---|
| Participants (voters) | 50 |
| SUS respondents | 50 (100% response rate) |
| Mean SUS score | 83.2 / 100 (Grade A — Excellent) |
| ZKP proof generation (median) | 735 ms |
| End-to-end vote time (warm, median) | ~8.1 s |
| Blockchain confirmation (median) | 7,378 ms |
| Zero double-votes detected | ✓ (nullifier enforcement) |
| Zero proof rejections in production | ✓ |
| Election outcome verifiable on-chain | ✓ (Polygonscan) |
