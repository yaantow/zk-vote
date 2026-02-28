"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export interface AuditEntry {
  nullifierHash: string;
  candidateIndex: number;
  blockNumber: number;
  timestamp: number;
  transactionHash: string;
}

interface AuditLogProps {
  events: AuditEntry[];
}

function formatTime(unix: number): string {
  return new Date(unix * 1000).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(hash: string, chars = 6): string {
  if (hash.length <= chars * 2 + 2) return hash;
  return `${hash.slice(0, chars + 2)}…${hash.slice(-chars)}`;
}

export function AuditLog({ events }: AuditLogProps) {
  const exportCSV = () => {
    const header = "Index,Nullifier Hash,Block,Timestamp,Tx Hash\n";
    const rows = events
      .map(
        (e, i) =>
          `${i + 1},${e.nullifierHash},${e.blockNumber},${e.timestamp},${e.transactionHash}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "zk-vote-audit.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Event Log ({events.length} events)
        </h3>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Nullifier</TableHead>
              <TableHead>Block</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  No vote events found
                </TableCell>
              </TableRow>
            ) : (
              events.map((event, i) => (
                <TableRow key={event.transactionHash}>
                  <TableCell className="font-mono text-xs">
                    {i + 1}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {truncate(event.nullifierHash)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {event.blockNumber}
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatTime(event.timestamp)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
