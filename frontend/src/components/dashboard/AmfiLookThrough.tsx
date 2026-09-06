"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  PieChart,
  Search,
  ChevronDown,
  ChevronUp,
  Building2,
  RefreshCw,
  AlertCircle,
  Calendar,
  Layers,
  Info,
} from "lucide-react";

import { getPortfolioLookThrough, getPortfolios } from "@/lib/api";
import { usePortfolioStore } from "@/store/portfolioStore";
import type { LookThroughResponse, IndirectCompanyExposureItem } from "@/types";

interface AmfiLookThroughProps {
  className?: string;
  portfolioId?: string;
}

export function AmfiLookThrough({
  className = "",
  portfolioId,
}: AmfiLookThroughProps) {
  const { holdings } = usePortfolioStore();

  const [data, setData] = useState<LookThroughResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("All");
  const [expandedCompanyIds, setExpandedCompanyIds] = useState<Set<string>>(new Set());

  // Auto-resolve active portfolio ID
  const resolveTargetPortfolioId = useCallback(async (): Promise<string | null> => {
    if (portfolioId) return portfolioId;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("nivesh_active_portfolio_id");
      if (stored) return stored;
    }
    try {
      const portfolios = await getPortfolios();
      if (Array.isArray(portfolios) && portfolios.length > 0) {
        const active = portfolios.find((p) => p.name === "CAS Portfolio") ?? portfolios[0];
        if (active?.id) {
          if (typeof window !== "undefined") {
            localStorage.setItem("nivesh_active_portfolio_id", active.id);
          }
          return active.id;
        }
      }
    } catch (e) {
      console.warn("Could not auto-fetch user portfolios:", e);
    }
    return null;
  }, [portfolioId]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const targetId = await resolveTargetPortfolioId();
      if (!targetId) {
        setData(null);
        return;
      }

      const res = await getPortfolioLookThrough(targetId);
      setData(res);
      if (res.companies.length > 0) {
        setExpandedCompanyIds(new Set([res.companies[0].company_id]));
      }
    } catch (err: unknown) {
      console.error("Failed to load AMFI look-through data:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load AMFI look-through data"
      );
    } finally {
      setIsLoading(false);
    }
  }, [resolveTargetPortfolioId]);

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      if (isCancelled) return;
      await loadData();
    };

    void run();

    const handleUpdated = () => {
      void run();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("nivesh_portfolio_updated", handleUpdated);
    }

    return () => {
      isCancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("nivesh_portfolio_updated", handleUpdated);
      }
    };
  }, [loadData, holdings]);

  const toggleCompany = (id: string) => {
    setExpandedCompanyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const sectors = useMemo(() => {
    if (!data?.companies) return ["All"];
    const set = new Set<string>();
    data.companies.forEach((c) => {
      if (c.sector) set.add(c.sector);
    });
    return ["All", ...Array.from(set).sort()];
  }, [data]);

  const filteredCompanies = useMemo(() => {
    if (!data?.companies) return [];

    return data.companies.filter((c) => {
      const matchSearch =
        c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.isin && c.isin.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.sector && c.sector.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchSector =
        selectedSector === "All" || c.sector === selectedSector;

      return matchSearch && matchSector;
    });
  }, [data, searchQuery, selectedSector]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isLoading) {
    return (
      <div className={`rounded-xl border border-border bg-card p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-56 animate-pulse rounded bg-muted"></div>
          <div className="h-4 w-32 animate-pulse rounded bg-muted"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/60"></div>
          ))}
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className={`rounded-xl border border-destructive/30 bg-destructive/5 p-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <h3 className="font-semibold text-foreground">Look-Through Unavailable</h3>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
      </div>
    );
  }

  if (!data || data.companies.length === 0) {
    return null;
  }

  const missingDisclosureSchemes = data.mutual_funds.filter((f) => !f.lookthrough_available);

  return (
    <div className={`rounded-xl border border-border bg-card p-6 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Layers className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-foreground tracking-tight">
              AMFI Stock Look-Through
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            See which underlying stocks your mutual funds hold underneath, powered by AMFI monthly portfolio disclosures.
          </p>
        </div>

        {data.data_as_of && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 self-start md:self-auto">
            <Calendar className="h-3.5 w-3.5" />
            <span>AMFI disclosure as of: {data.data_as_of}</span>
          </div>
        )}
      </div>

      {/* Warning banner if any mutual fund disclosure is missing */}
      {missingDisclosureSchemes.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-400">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Partial Look-Through:</span> AMFI monthly portfolio disclosures are currently pending for:{" "}
            {missingDisclosureSchemes.map((s) => s.scheme_name).join(", ")}. Remaining mutual funds are fully analyzed.
          </div>
        </div>
      )}

      {/* Portfolio Mutual Fund Summary Bar */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/40 text-xs">
        <div>
          <div className="text-muted-foreground">Total Mutual Funds Value</div>
          <div className="text-sm font-semibold text-foreground mt-0.5">
            {formatCurrency(data.total_mf_value)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Unique Underlying Stocks</div>
          <div className="text-sm font-semibold text-foreground mt-0.5">
            {data.companies.length} Companies
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Contributing Mutual Funds</div>
          <div className="text-sm font-semibold text-foreground mt-0.5">
            {data.mutual_funds.length} Schemes ({data.mutual_funds.filter((m) => m.lookthrough_available).length} Verified)
          </div>
        </div>
      </div>

      {/* Search and Sector Filter */}
      <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search underlying company, ISIN, or sector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <select
          value={selectedSector}
          onChange={(e) => setSelectedSector(e.target.value)}
          className="w-full sm:w-auto px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s === "All" ? "All Sectors" : s}
            </option>
          ))}
        </select>
      </div>

      {/* List of Companies with Accordion Drill-down */}
      <div className="mt-4 space-y-2.5">
        {filteredCompanies.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No underlying companies match the filter criteria.
          </div>
        ) : (
          filteredCompanies.map((comp) => {
            const isExpanded = expandedCompanyIds.has(comp.company_id);
            return (
              <div
                key={comp.company_id}
                className="rounded-lg border border-border/80 bg-card hover:border-border transition-all overflow-hidden"
              >
                {/* Header row */}
                <div
                  onClick={() => toggleCompany(comp.company_id)}
                  className="flex items-center justify-between p-3 cursor-pointer select-none hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-foreground truncate">
                          {comp.company_name}
                        </h4>
                        {comp.sector && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hidden sm:inline-block">
                            {comp.sector}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Held across {comp.contributing_funds.length}{" "}
                        {comp.contributing_funds.length === 1 ? "fund" : "funds"}
                        {comp.isin && ` � ${comp.isin}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        {formatCurrency(comp.total_exposure_value)}
                      </div>
                      <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        {comp.total_exposure_percent.toFixed(2)}% of MF Value
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded Drill-down Accordion */}
                {isExpanded && (
                  <div className="border-t border-border/60 bg-muted/20 px-3 py-2.5">
                    <div className="text-[11px] font-medium text-muted-foreground mb-2">
                      Contributing Mutual Funds Breakdown:
                    </div>
                    <div className="space-y-1.5">
                      {comp.contributing_funds.map((fund, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-md bg-background/80 border border-border/40 text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-medium text-foreground truncate">
                              {fund.fund_name}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Holding value in fund: {formatCurrency(fund.fund_value)}
                              {fund.as_of_date && ` � Disclosed: ${fund.as_of_date}`}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-semibold text-foreground">
                              {formatCurrency(fund.exposure_value)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Fund weight: {fund.weight_percent.toFixed(2)}%
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
      </div>
    </div>
  );
}
