import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center px-6 max-w-md">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-6">
          <Compass className="w-8 h-8" strokeWidth={1.75} />
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-foreground font-display">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This page doesn&apos;t exist — it may have moved, or the link was mistyped.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
          <span>Back to dashboard</span>
        </Link>
      </div>
    </div>
  );
}
