"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function TrustBar({ compact = false }: { compact?: boolean }) {
  const { lastSyncedAt, syncSource } = usePortfolioStore();
  const [mounted, setMounted] = useState(false);
  const [label, setLabel] = useState("just now");

  useEffect(() => {
    setMounted(true);
    setLabel(timeAgo(lastSyncedAt));
    const id = setInterval(() => setLabel(timeAgo(lastSyncedAt)), 30000);
    return () => clearInterval(id);
  }, [lastSyncedAt]);

  return (
    <div
      className={
        compact
          ? "flex items-center gap-1.5 text-[11px] text-muted-foreground"
          : "flex items-center gap-1.5 text-xs text-muted-foreground"
      }
      title="Data is fetched read-only and never used to place trades"
    >
      <ShieldCheck className="w-3.5 h-3.5 text-[var(--positive)] shrink-0" strokeWidth={1.75} />
      <span>
        Synced <span className="text-foreground font-medium tabular-nums">{mounted ? label : "just now"}</span>
        {!compact && (
          <>
            {" "}
            via <span className="text-foreground font-medium">{syncSource ?? "Account Aggregator"}</span>
          </>
        )}
      </span>
    </div>
  );
}
