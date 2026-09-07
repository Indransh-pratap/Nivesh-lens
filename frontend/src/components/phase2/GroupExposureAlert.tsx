"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronRight,
  Info,
  Layers,
  Percent,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  getPhase2GroupExposure,
  Phase2GroupExposureItem,
  Phase2GroupExposureResponse,
} from "@/lib/phase2-api";
import { cn } from "@/lib/utils";

function formatINR(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

export function GroupExposureAlert() {
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [data, setData] = useState<Phase2GroupExposureResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [thresholdModerate, setThresholdModerate] = useState(15.0);
  const [thresholdHigh, setThresholdHigh] = useState(25.0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPortfolioId(localStorage.getItem("nivesh_active_portfolio_id"));
    }
  }, []);

  const fetchGroupExposure = async () => {
    if (!portfolioId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getPhase2GroupExposure(portfolioId, thresholdModerate, thresholdHigh);
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load conglomerate exposure data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupExposure();
  }, [portfolioId, thresholdModerate, thresholdHigh]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  if (!portfolioId) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/40">
        <Info className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Please select an active portfolio to view corporate group exposure.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Parent Conglomerate & Group Exposure Alert
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Aggregates direct equity and mutual fund look-through holdings by corporate parent.
            </p>
          </div>
        </div>

        <button
          onClick={fetchGroupExposure}
          disabled={loading}
          className="p-2 self-start sm:self-auto text-muted-foreground hover:text-foreground rounded-xl border border-border hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-card border border-border">
            <span className="text-xs font-semibold text-muted-foreground">High Concentration (&gt;{thresholdHigh}%)</span>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-black text-destructive">
                {data.high_exposure_groups_count}
              </span>
              <ShieldAlert className="w-5 h-5 text-destructive" />
            </div>
            <span className="text-[10px] text-muted-foreground block mt-1">
              Requires risk committee / asset review
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border">
            <span className="text-xs font-semibold text-muted-foreground">Moderate Concentration ({thresholdModerate}–{thresholdHigh}%)</span>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-black text-amber-500">
                {data.moderate_exposure_groups_count}
              </span>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-[10px] text-muted-foreground block mt-1">
              Elevated exposure to watch closely
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border">
            <span className="text-xs font-semibold text-muted-foreground">Unmapped / Standalone Assets</span>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-black text-foreground">
                {data.unmapped_percentage.toFixed(1)}%
              </span>
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[10px] text-muted-foreground block mt-1">
              Independent companies & cash reserves
            </span>
          </div>
        </div>
      )}

      {/* Conglomerate Groups List */}
      {data && (
        <div className="space-y-4">
          {data.groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/30">
              <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
              <h4 className="text-sm font-bold text-foreground">No Conglomerate Concentrations Found</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                No major Indian business conglomerate crosses the monitoring threshold in this portfolio.
              </p>
            </div>
          ) : (
            data.groups.map((group) => {
              const isExpanded = !!expandedGroups[group.group_name];
              const isHigh = group.alert_level === "HIGH";
              const isMod = group.alert_level === "MODERATE";

              return (
                <div
                  key={group.group_name}
                  className={cn(
                    "rounded-2xl border transition-all overflow-hidden bg-card",
                    isHigh
                      ? "border-destructive/40 shadow-sm shadow-destructive/5"
                      : isMod
                      ? "border-amber-500/30"
                      : "border-border"
                  )}
                >
                  {/* Group Header Row */}
                  <div
                    onClick={() => toggleGroup(group.group_name)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">
                            {group.group_name}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                              isHigh
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : isMod
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            )}
                          >
                            {group.alert_level} EXPOSURE
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {group.description || `${group.companies_count} constituent companies`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 pl-7 sm:pl-0">
                      <div className="text-right">
                        <span className="text-sm font-black text-foreground block">
                          {formatINR(group.exposure_value)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Total Value
                        </span>
                      </div>
                      <div className="text-right min-w-[70px]">
                        <span
                          className={cn(
                            "text-base font-black block",
                            isHigh ? "text-destructive" : isMod ? "text-amber-500" : "text-foreground"
                          )}
                        >
                          {group.exposure_percentage.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Portfolio %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Constituent Companies Drilldown */}
                  {isExpanded && group.companies.length > 0 && (
                    <div className="border-t border-border/60 bg-accent/20 px-5 py-4">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-3">
                        Constituent Companies ({group.companies.length})
                      </span>
                      <div className="space-y-2">
                        {group.companies.map((c) => (
                          <div
                            key={c.isin || c.company_name}
                            className="p-3 rounded-xl bg-card border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <span className="font-bold text-foreground block">
                                {c.company_name}
                              </span>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                                {c.isin && <span>ISIN: {c.isin}</span>}
                                {c.ticker && <span>NSE: {c.ticker}</span>}
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-right">
                              <div>
                                <span className="text-muted-foreground block text-[10px]">Direct Equity</span>
                                <span className="font-semibold text-foreground">
                                  {c.direct_value > 0 ? `${c.direct_percent.toFixed(1)}%` : "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-[10px]">MF Look-Through</span>
                                <span className="font-semibold text-foreground">
                                  {c.indirect_value > 0 ? `${c.indirect_percent.toFixed(1)}%` : "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-[10px]">Total Combined</span>
                                <span className="font-bold text-primary">
                                  {c.total_percent.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Regulatory & Methodology Note */}
          <p className="text-[11px] text-muted-foreground text-center pt-2">
            {data.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}