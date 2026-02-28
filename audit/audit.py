#!/usr/bin/env python3
"""
ZK-Vote Maldives — Independent Audit Script

Independently verifies election results by:
1. Connecting to the Polygon Amoy RPC endpoint
2. Reading all VoteCast events from the ZKVoting contract
3. Recomputing tallies from raw on-chain events
4. Comparing recomputed tallies with on-chain contract state
5. Outputting a detailed audit report (console + CSV)

Usage:
    python audit.py --contract 0x... [--rpc URL] [--csv output.csv]

Environment variables (alternative to CLI args):
    CONTRACT_ADDRESS  — deployed ZKVoting contract address
    RPC_URL           — Polygon Amoy RPC endpoint
"""

import argparse
import csv
import json
import os
import sys
import time
from pathlib import Path

try:
    from web3 import Web3
    from dotenv import load_dotenv
except ImportError:
    print("ERROR: Missing dependencies. Run:")
    print("  pip install -r requirements.txt")
    sys.exit(1)

try:
    from rich.console import Console
    from rich.table import Table
    from rich import box

    HAS_RICH = True
except ImportError:
    HAS_RICH = False

# ---------------------------------------------------------------------------
#  Constants
# ---------------------------------------------------------------------------

DEFAULT_RPC = "https://rpc-amoy.polygon.technology"

# Load the ABI from the project
ABI_PATH = Path(__file__).resolve().parent.parent / "lib" / "blockchain" / "abi" / "ZKVoting.json"

# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------


def load_abi() -> list:
    """Load the ZKVoting ABI from the project source."""
    if not ABI_PATH.exists():
        print(f"ERROR: ABI file not found at {ABI_PATH}")
        print("Make sure you have compiled the contracts and synced the ABI.")
        sys.exit(1)

    with open(ABI_PATH, "r") as f:
        data = json.load(f)

    # Handle both raw ABI array and Hardhat artifact format
    if isinstance(data, list):
        return data
    elif isinstance(data, dict) and "abi" in data:
        return data["abi"]
    else:
        print("ERROR: Unexpected ABI format")
        sys.exit(1)


def truncate_hash(h: str, n: int = 8) -> str:
    """Truncate a hex string for display: 0xabcd...1234"""
    if len(h) <= n * 2 + 4:
        return h
    return f"{h[:n+2]}...{h[-n:]}"


def format_timestamp(ts: int) -> str:
    """Format a Unix timestamp to human-readable string."""
    return time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(ts))


# ---------------------------------------------------------------------------
#  Core audit logic
# ---------------------------------------------------------------------------


def run_audit(contract_address: str, rpc_url: str, csv_path: str | None = None):
    """Execute the full audit process."""
    start_time = time.time()

    if HAS_RICH:
        console = Console()
        console.print("\n[bold blue]╔══════════════════════════════════════════════╗[/]")
        console.print("[bold blue]║   ZK-Vote Maldives — Independent Audit      ║[/]")
        console.print("[bold blue]╚══════════════════════════════════════════════╝[/]\n")
    else:
        print("\n" + "=" * 50)
        print("  ZK-Vote Maldives — Independent Audit")
        print("=" * 50 + "\n")

    # --- 1. Connect to blockchain ---
    print(f"[1/5] Connecting to RPC: {rpc_url}")
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        print("ERROR: Failed to connect to the blockchain RPC.")
        sys.exit(1)

    chain_id = w3.eth.chain_id
    latest_block = w3.eth.block_number
    print(f"      Connected — Chain ID: {chain_id}, Latest block: {latest_block}")

    # --- 2. Load contract ---
    print(f"\n[2/5] Loading contract: {contract_address}")
    abi = load_abi()
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(contract_address), abi=abi
    )

    # Read election metadata
    try:
        title = contract.functions.electionTitle().call()
        is_active = contract.functions.electionActive().call()
        merkle_root = contract.functions.merkleRoot().call()
        total_votes = contract.functions.totalVotes().call()
        candidate_count = contract.functions.getCandidateCount().call()
    except Exception as e:
        print(f"ERROR: Failed to read contract state: {e}")
        sys.exit(1)

    print(f"      Election: {title}")
    print(f"      Status: {'ACTIVE' if is_active else 'ENDED'}")
    print(f"      Merkle Root: {truncate_hash(hex(merkle_root))}")
    print(f"      Total Votes: {total_votes}")
    print(f"      Candidates: {candidate_count}")

    # --- 3. Read candidates & on-chain tallies ---
    print(f"\n[3/5] Reading on-chain candidate tallies...")
    candidates = []
    on_chain_tallies = []
    for i in range(candidate_count):
        name = contract.functions.getCandidateName(i).call()
        tally = contract.functions.getCandidateTally(i).call()
        candidates.append(name)
        on_chain_tallies.append(tally)
        print(f"      {name}: {tally} votes")

    # --- 4. Read VoteCast events & recompute tallies ---
    print(f"\n[4/5] Reading VoteCast events from chain...")

    vote_cast_filter = contract.events.VoteCast.create_filter(from_block=0)
    events = vote_cast_filter.get_all_entries()

    print(f"      Found {len(events)} VoteCast events")

    # Recompute tallies from raw events
    recomputed_tallies = [0] * candidate_count
    event_records = []

    for i, event in enumerate(events):
        args = event["args"]
        nullifier_hash = args.get("nullifierHash", 0)
        candidate_index = args.get("candidateIndex", 0)
        timestamp = args.get("timestamp", 0)
        block_number = event.get("blockNumber", 0)
        tx_hash = event.get("transactionHash", b"").hex() if isinstance(
            event.get("transactionHash", b""), bytes
        ) else str(event.get("transactionHash", ""))

        if 0 <= candidate_index < candidate_count:
            recomputed_tallies[candidate_index] += 1

        event_records.append({
            "index": i + 1,
            "nullifier_hash": hex(nullifier_hash) if isinstance(nullifier_hash, int) else str(nullifier_hash),
            "candidate_index": candidate_index,
            "candidate_name": candidates[candidate_index] if 0 <= candidate_index < len(candidates) else "UNKNOWN",
            "block_number": block_number,
            "timestamp": timestamp,
            "timestamp_human": format_timestamp(timestamp) if timestamp > 0 else "N/A",
            "tx_hash": tx_hash if tx_hash != "" else "N/A",
        })

    # --- 5. Compare tallies ---
    print(f"\n[5/5] Comparing tallies...\n")

    tallies_match = on_chain_tallies == recomputed_tallies
    events_total = sum(recomputed_tallies)

    if HAS_RICH:
        # Rich table for tally comparison
        tally_table = Table(
            title="Tally Comparison",
            box=box.ROUNDED,
            show_lines=True,
        )
        tally_table.add_column("Candidate", style="bold")
        tally_table.add_column("On-Chain Tally", justify="right")
        tally_table.add_column("Recomputed (Events)", justify="right")
        tally_table.add_column("Match", justify="center")

        for i in range(candidate_count):
            match = "✅" if on_chain_tallies[i] == recomputed_tallies[i] else "❌"
            tally_table.add_row(
                candidates[i],
                str(on_chain_tallies[i]),
                str(recomputed_tallies[i]),
                match,
            )

        tally_table.add_row(
            "[bold]TOTAL[/]",
            f"[bold]{total_votes}[/]",
            f"[bold]{events_total}[/]",
            "✅" if total_votes == events_total else "❌",
        )

        console.print(tally_table)
        console.print()

        if tallies_match and total_votes == events_total:
            console.print("[bold green]  ✅ AUDIT PASSED — All tallies match![/]\n")
        else:
            console.print("[bold red]  ❌ AUDIT FAILED — Tally mismatch detected![/]\n")

        # Event log table (show first 20)
        if event_records:
            event_table = Table(
                title=f"VoteCast Event Log ({len(event_records)} events)",
                box=box.SIMPLE,
            )
            event_table.add_column("#", justify="right", style="dim")
            event_table.add_column("Nullifier Hash")
            event_table.add_column("Candidate")
            event_table.add_column("Block", justify="right")
            event_table.add_column("Timestamp")

            display_count = min(len(event_records), 20)
            for rec in event_records[:display_count]:
                event_table.add_row(
                    str(rec["index"]),
                    truncate_hash(rec["nullifier_hash"]),
                    rec["candidate_name"],
                    str(rec["block_number"]),
                    rec["timestamp_human"],
                )
            if len(event_records) > 20:
                event_table.add_row("...", f"({len(event_records) - 20} more events)", "", "", "")

            console.print(event_table)
    else:
        # Plain text fallback
        print("  Tally Comparison:")
        print("  " + "-" * 60)
        print(f"  {'Candidate':<20} {'On-Chain':>10} {'Recomputed':>12} {'Match':>8}")
        print("  " + "-" * 60)
        for i in range(candidate_count):
            match = "✅" if on_chain_tallies[i] == recomputed_tallies[i] else "❌"
            print(f"  {candidates[i]:<20} {on_chain_tallies[i]:>10} {recomputed_tallies[i]:>12} {match:>8}")
        print("  " + "-" * 60)
        total_match = "✅" if total_votes == events_total else "❌"
        print(f"  {'TOTAL':<20} {total_votes:>10} {events_total:>12} {total_match:>8}")
        print()

        if tallies_match and total_votes == events_total:
            print("  ✅ AUDIT PASSED — All tallies match!\n")
        else:
            print("  ❌ AUDIT FAILED — Tally mismatch detected!\n")

        # Event log
        if event_records:
            print(f"  Event Log ({len(event_records)} events):")
            print(f"  {'#':>4} {'Nullifier':<22} {'Candidate':<14} {'Block':>8} {'Timestamp'}")
            for rec in event_records[:20]:
                print(
                    f"  {rec['index']:>4} "
                    f"{truncate_hash(rec['nullifier_hash']):<22} "
                    f"{rec['candidate_name']:<14} "
                    f"{rec['block_number']:>8} "
                    f"{rec['timestamp_human']}"
                )
            if len(event_records) > 20:
                print(f"  ... ({len(event_records) - 20} more events)")

    # --- CSV export ---
    if csv_path:
        print(f"\n  Exporting audit report to: {csv_path}")
        with open(csv_path, "w", newline="") as f:
            writer = csv.writer(f)

            # Header section
            writer.writerow(["ZK-Vote Maldives — Audit Report"])
            writer.writerow(["Generated", format_timestamp(int(time.time()))])
            writer.writerow(["Contract", contract_address])
            writer.writerow(["RPC", rpc_url])
            writer.writerow(["Chain ID", chain_id])
            writer.writerow(["Election", title])
            writer.writerow(["Status", "ACTIVE" if is_active else "ENDED"])
            writer.writerow(["Audit Result", "PASS" if tallies_match else "FAIL"])
            writer.writerow([])

            # Tally comparison
            writer.writerow(["Candidate", "On-Chain Tally", "Recomputed Tally", "Match"])
            for i in range(candidate_count):
                match = "YES" if on_chain_tallies[i] == recomputed_tallies[i] else "NO"
                writer.writerow([candidates[i], on_chain_tallies[i], recomputed_tallies[i], match])
            writer.writerow(["TOTAL", total_votes, events_total, "YES" if total_votes == events_total else "NO"])
            writer.writerow([])

            # Event log
            writer.writerow(["#", "Nullifier Hash", "Candidate Index", "Candidate Name", "Block Number", "Timestamp", "Timestamp (UTC)", "Tx Hash"])
            for rec in event_records:
                writer.writerow([
                    rec["index"],
                    rec["nullifier_hash"],
                    rec["candidate_index"],
                    rec["candidate_name"],
                    rec["block_number"],
                    rec["timestamp"],
                    rec["timestamp_human"],
                    rec["tx_hash"],
                ])

        print("  ✅ CSV exported successfully.")

    elapsed = time.time() - start_time
    print(f"\n  Audit completed in {elapsed:.2f}s\n")

    # Return exit code based on result
    return 0 if tallies_match else 1


# ---------------------------------------------------------------------------
#  CLI
# ---------------------------------------------------------------------------


def main():
    load_dotenv()

    parser = argparse.ArgumentParser(
        description="ZK-Vote Maldives — Independent Audit Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python audit.py --contract 0x1234...abcd
  python audit.py --contract 0x1234...abcd --rpc https://custom-rpc.example.com
  python audit.py --contract 0x1234...abcd --csv audit_report.csv

Environment variables:
  CONTRACT_ADDRESS  — contract address (alternative to --contract)
  RPC_URL           — RPC endpoint (alternative to --rpc)
        """,
    )
    parser.add_argument(
        "--contract",
        default=os.environ.get("CONTRACT_ADDRESS", ""),
        help="ZKVoting contract address (or set CONTRACT_ADDRESS env var)",
    )
    parser.add_argument(
        "--rpc",
        default=os.environ.get("RPC_URL", DEFAULT_RPC),
        help=f"Blockchain RPC endpoint (default: {DEFAULT_RPC})",
    )
    parser.add_argument(
        "--csv",
        default=None,
        help="Export audit report to CSV file",
    )

    args = parser.parse_args()

    if not args.contract:
        print("ERROR: No contract address provided.")
        print("Use --contract 0x... or set CONTRACT_ADDRESS environment variable.")
        sys.exit(1)

    exit_code = run_audit(args.contract, args.rpc, args.csv)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
