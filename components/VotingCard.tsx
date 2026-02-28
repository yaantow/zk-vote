"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface VotingCardProps {
  name: string;
  index: number;
  icon: string;
  selected: boolean;
  onSelect: (index: number) => void;
}

export function VotingCard({
  name,
  index,
  icon,
  selected,
  onSelect,
}: VotingCardProps) {
  return (
    <Card
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={() => onSelect(index)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(index);
        }
      }}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary"
          : "border-border hover:border-primary/50"
      )}
    >
      <CardContent className="flex flex-col items-center gap-3 p-8">
        <span className="text-5xl" role="img" aria-label={name}>
          {icon}
        </span>
        <span className="text-base font-semibold">{name}</span>
        <div
          className={cn(
            "h-5 w-5 rounded-full border-2 transition-colors",
            selected
              ? "border-primary bg-primary"
              : "border-muted-foreground"
          )}
        >
          {selected && (
            <div className="flex h-full items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-primary-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
