import Link from "next/link";
import { Vote } from "lucide-react";

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-2xl items-center px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Vote className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm">Maldives eVote</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
