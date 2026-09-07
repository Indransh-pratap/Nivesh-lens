"use client";

import { 
  Radio, 
  Info
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { EmptyState } from "@/components/ui/EmptyState";

export function NewsImpactFeed() {
  const { newsImpacts, openSyncModal } = usePortfolioStore();

  if (!newsImpacts || newsImpacts.length === 0) {
    return (
      <EmptyState
        icon={Radio}
        title="No news impact alerts"
        description="Holding-specific financial intelligence and quantified net worth impacts will appear here when market events affect your portfolio."
        actionLabel="Connect Portfolio"
        onAction={() => openSyncModal("CAS")}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <Radio className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Real-Time News & Portfolio Impact Alerts</h3>
            <p className="text-xs text-muted-foreground">Holding-specific financial intelligence with calculated % impact on your net worth</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--positive)] font-semibold font-mono bg-[var(--positive)]/10 px-2.5 py-1 rounded-lg border border-[var(--positive)]/20">
          <span className="w-2 h-2 rounded-full bg-[var(--positive)] animate-pulse" />
          <span>Live News Connected</span>
        </div>
      </div>

      {/* News Feed Grid */}
      <div className="space-y-3 mt-6">
        {newsImpacts.map((news) => {
          const isBullish = news.sentiment === "Bullish";
          return (
            <div 
              key={news.id} 
              className={`p-4 rounded-2xl border transition-all duration-150 ${
                isBullish 
                  ? "border-[var(--positive)]/20 bg-[var(--positive)]/[0.03] hover:border-[var(--positive)]/40" 
                  : "border-[var(--warning)]/20 bg-[var(--warning)]/[0.03] hover:border-[var(--warning)]/40"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-foreground font-mono bg-accent px-2 py-0.5 rounded-md border border-border">
                    {news.ticker}
                  </span>
                  <span className="text-muted-foreground">• {news.source}</span>
                  <span className="text-muted-foreground font-mono text-[11px]">• {news.timestamp}</span>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-muted-foreground font-sans">Impact: <strong className={`font-mono tabular-nums ${isBullish ? "text-[var(--positive)]" : "text-[var(--warning)]"}`}>{news.companyImpactPercent > 0 ? "+" : ""}{news.companyImpactPercent}%</strong></span>
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 font-bold text-primary tabular-nums">
                    Net: {news.portfolioImpactPercent > 0 ? "+" : ""}{news.portfolioImpactPercent}%
                  </span>
                </div>
              </div>

              <h4 className="text-sm font-bold text-foreground mt-2">{news.headline}</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{news.summary}</p>

              <div className="mt-3 pt-2.5 border-t border-border/70 flex items-center justify-between text-xs">
                <span className="text-primary font-medium flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Action Nudge: {news.actionNudge}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
