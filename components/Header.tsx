"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Vote, BarChart3, Shield, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { NetworkStatus } from "./NetworkStatus";

const navItems = [
  { href: "/", label: "Home", icon: Vote },
  { href: "/admin", label: "Admin", icon: Settings },
  { href: "/audit", label: "Audit", icon: Shield },
  { href: "/results", label: "Results", icon: BarChart3 },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Vote className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">ZK-Vote Maldives</span>
          <span className="sm:hidden">ZK-Vote</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Network status */}
        <NetworkStatus />
      </div>
    </header>
  );
}
