"use client";

import React, { useEffect, useState, useCallback } from "react";
import { 
  Building2, 
  AlertTriangle 
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { InsightFlag } from "@/components/ui/InsightFlag";
import { getGroupExposure, getPortfolios, type GroupExposureItem } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ConglomerateExposure() {
  const { holdings } = usePortfolioStore();
  const [groups, setGroups] = useState<GroupExposureItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [highlighted, setHighlighted] = useState(false);

  const fetchGroups = useCallback(async (isCancelled: () => boolean) => {
    try {
      let targetId: string | undefined = undefined;
      if (typeof window !== "undefined") {
        targetId = localStorage.getItem("nivesh_active_portfolio_id") || undefined;
      }
      if (!targetId) {
        const portfolios = await getPortfolios().catch(() => []);
        if (portfolios && portfolios.length > 0) {
          const active = portfolios.find((p) => p.name === "CAS Portfolio") ?? portfolios[0];
          if (active?.id) {
            targetId = active.id;
            if (typeof window !== "undefined") {
              localStorage.setItem("nivesh_active_portfolio_id", active.id);
            }
          }
        }
      }

      if (targetId && !isCancelled()) {
        const res = await getGroupExposure(targetId);
        if (!isCancelled()) {
          setGroups(res.groups || []);
        }
      }
    } catch (err) {
      console.warn("Could not fetch real group exposure:", err);
    } finally {
      if (!isCancelled()) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await fetchGroups(() => cancelled);
    };
    void run();

    const handlePortfolioUpdated = () => {
      void run();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("nivesh_portfolio_updated", handlePortfolioUpdated);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("nivesh_portfolio_updated", handlePortfolioUpdated);
      }
    };
  }, [fetchGroups, holdings]);

  const elevatedGroups = groups.filter((g) => g.exposure_percentage >= 14);

  const handleFix = () => {
    setHighlighted(true);
    const el = document.getElementById("conglomerate-cards-grid");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => setHighlighted(false), 3000);
  };

  if (isLoading && groups.length === 0) {
    return null;
  }

  if (groups.length === 0) {
    return null;
  }

  // Top 2 groups combined percentage
  const top2Pct = groups.slice(0, 2).reduce((acc, g) => acc + g.exposure_percentage, 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-md text-foreground relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Parent Conglomerate & Corporate House Exposure</h3>
            <p className="text-xs text-muted-foreground">Aggregates all individual stocks & fund holdings by Business House</p>
          </div>
        </div>

        {top2Pct > 0 && (
          <div className="px-3 py-1.5 rounded-xl border border-[var(--warning)]/20 bg-[var(--warning)]/10 text-[var(--warning)] text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto font-mono tabular-nums">
            <AlertTriangle className="w-4 h-4" strokeWidth={1.75} />
            <span>Top 2 Groups Hold ~{top2Pct.toFixed(1)}% Capital</span>
          </div>
        )}
      </div>

      {elevatedGroups.length > 0 && (
        <div className="mt-5">
          <InsightFlag
            severity="warning"
            headline={`${elevatedGroups.length} corporate group${elevatedGroups.length > 1 ? "s" : ""} carry more than 14% of your capital each`}
            why="Stocks and mutual funds from the same business house often move together on group-level news — a governance issue or regulatory action against the parent can hit every holding at once, even ones that look unrelated on paper."
            fixLabel="See which stocks and funds sit inside each group"
            onFix={handleFix}
          />
        </div>
      )}

      {/* Conglomerate Cards Grid */}
      <div id="conglomerate-cards-grid" className={cn("grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 transition-all duration-300", highlighted && "ring-2 ring-primary p-2 rounded-2xl")}>
        {groups.map((group) => {
          const isElevated = group.exposure_percentage >= 14;
          return (
            <div 
              key={group.group_name} 
              className={`p-5 rounded-2xl border transition-all duration-150 ${
                isElevated 
                  ? "border-[var(--warning)]/20 bg-[var(--warning)]/[0.03] hover:border-[var(--warning)]/40" 
                  : "border-border/70 bg-[var(--background-elevated)] hover:border-border-strong"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground truncate">{group.group_name}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                  isElevated 
                    ? "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20" 
                    : "bg-[var(--positive)]/10 text-[var(--positive)] border-[var(--positive)]/20"
                }`}>
                  {isElevated ? "Elevated" : "Normal"}
                </span>
              </div>

              <div className="mt-3.5 font-mono">
                <p className={`text-2xl font-semibold tabular-nums ${isElevated ? "text-[var(--warning)]" : "text-foreground"}`}>
                  {group.exposure_percentage.toFixed(1)}%
                </p>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5 tabular-nums">
                  ₹{Math.round(group.exposure_value).toLocaleString("en-IN")} total capital
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-[var(--background)] rounded-full overflow-hidden mt-3">
                <div 
                  className={`h-full rounded-full ${isElevated ? "bg-[var(--warning)]" : "bg-primary"}`}
                  style={{ width: `${Math.min(group.exposure_percentage * 3.5, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ConglomerateExposure;
