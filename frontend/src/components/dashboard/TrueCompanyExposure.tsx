"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Layers,
  Search,
  ChevronDown,
  ChevronUp,
  Building2,
  RefreshCw,
  AlertCircle,
  Calendar,
  SlidersHorizontal,
} from "lucide-react";

import { getCompanyExposure, getPortfolios } from "@/lib/api";
import { usePortfolioStore } from "@/store/portfolioStore";
import type { CompanyExposureResponse } from "@/types";

interface TrueCompanyExposureProps {
  className?: string;
  portfolioId?: string;
  defaultExpandedFirst?: boolean;
}

export function TrueCompanyExposure({
  className = "",
  portfolioId,
  defaultExpandedFirst = false,
}: TrueCompanyExposureProps) {
  const { holdings, openSyncModal, setCompanyExposures } = usePortfolioStore();

  const [data, setData] = useState<CompanyExposureResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("All");
  const [sortBy, setSortBy] = useState<"combined" | "direct" | "mf">("combined");
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

      const res = await getCompanyExposure(targetId);
      setData(res);
      if (Array.isArray(res.companies)) {
        setCompanyExposures(
          res.companies.map((c) => ({
            id: c.company_id,
            companyName: c.company_name,
            ticker: c.ticker || "",
            sector: c.sector || "",
            conglomerateGroup: "",
            directValue: c.direct_value || 0,
            directPercent: c.direct_percent || 0,
            indirectValue: c.mutual_fund_value || 0,
            indirectPercent: c.mutual_fund_percent || 0,
            totalTrueValue: c.combined_value || 0,
            totalTruePercent: c.combined_percent || 0,
            riskCategory: "Medium",
            promoterPledging: 0,
            fiiHolding: 0,
            supplyChainVulnerability: "Low",
            heldViaFunds: c.sources
              .filter((s) => s.type === "mutual_fund")
              .map((s) => ({
                fundName: s.fund_name || "Mutual Fund",
                fundTicker: s.fund_isin?.slice(0, 6) || "",
                fundAllocation: s.company_weight || 0,
                indirectValue: s.exposure_value || 0,
              })),
          }))
        );
      }
      if (defaultExpandedFirst && res.companies.length > 0) {
        setExpandedCompanyIds(new Set([res.companies[0].company_id]));
      }
    } catch (err: unknown) {
      console.error("Failed to load company exposure:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to calculate company exposure"
      );
    } finally {
      setIsLoading(false);
    }
  }, [resolveTargetPortfolioId, defaultExpandedFirst, setCompanyExposures]);

  useEffect(() => {
    // Keep one request path. The previous implementation also fetched the
    // same endpoint in an inline effect, causing duplicate expensive
    // look-through calculations and racing state updates.
    void loadData();
    const handlePortfolioUpdated = () => void loadData();

    if (typeof window !== "undefined") {
      window.addEventListener("nivesh_portfolio_updated", handlePortfolioUpdated);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("nivesh_portfolio_updated", handlePortfolioUpdated);
      }
    };
  }, [loadData]);

  const toggleExpand = (id: string) => {
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

  // Distinct sectors
  const sectors = useMemo(() => {
    if (!data?.companies) return ["All"];
    const set = new Set<string>();
    data.companies.forEach((c) => {
      if (c.sector) set.add(c.sector);
    });
    return ["All", ...Array.from(set).sort()];
  }, [data]);

  // Filtered and sorted companies
  const filteredCompanies = useMemo(() => {
    if (!data?.companies) return [];
    return data.companies
      .filter((c) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesQuery =
          !query ||
          c.company_name.toLowerCase().includes(query) ||
          (c.ticker && c.ticker.toLowerCase().includes(query)) ||
          (c.isin && c.isin.toLowerCase().includes(query));

        const matchesSector =
          selectedSector === "All" || c.sector === selectedSector;

        return matchesQuery && matchesSector;
      })
      .sort((a, b) => {
        if (sortBy === "combined") return b.combined_percent - a.combined_percent;
        if (sortBy === "direct") return b.direct_value - a.direct_value;
        return b.mutual_fund_value - a.mutual_fund_value;
      });
  }, [data, searchQuery, selectedSector, sortBy]);

  // Render Loading State
  if (isLoading) {
    return (
      <div className={`rounded-2xl border border-border bg-card p-6 shadow-xl text-foreground ${className}`}>
        <div className="flex items-center gap-3 pb-5 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold animate-pulse">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">True Company Exposure</h3>
            <p className="text-xs text-muted-foreground">Calculating company exposure...</p>
          </div>
        </div>
        <div className="py-12 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm font-medium">Calculating true combined company exposure...</p>
        </div>
      </div>
    );
  }

  // Render Error State
  if (errorMessage) {
    return (
      <div className={`rounded-2xl border border-border bg-card p-6 shadow-xl text-foreground ${className}`}>
        <div className="flex items-center justify-between pb-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center font-bold">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">True Company Exposure</h3>
              <p className="text-xs text-muted-foreground">Direct stocks + mutual fund look-through</p>
            </div>
          </div>
          <button
            onClick={() => void loadData()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-accent transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
        <div className="py-10 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-destructive">{errorMessage}</p>
          <p className="text-xs text-muted-foreground">Unable to calculate company exposure at this time.</p>
        </div>
      </div>
    );
  }

  // Render Empty State (no holdings)
  if (!data || data.portfolio_value <= 0 || data.companies.length === 0) {
    return (
      <div className={`rounded-2xl border border-border bg-card p-6 shadow-xl text-foreground ${className}`}>
        <div className="flex items-center justify-between pb-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">True Company Exposure</h3>
              <p className="text-xs text-muted-foreground">Direct stocks + mutual fund look-through</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-accent transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
        <div className="py-12 text-center space-y-4 text-muted-foreground">
          <Building2 className="w-10 h-10 mx-auto opacity-40 text-primary" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">No investments available in active portfolio</p>
            <p className="text-xs max-w-sm mx-auto">Upload a CAS statement or connect your portfolio to compute live combined company exposures.</p>
          </div>
          <button
            type="button"
            onClick={() => openSyncModal("CAS")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Upload CAS Statement
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-border bg-card p-6 shadow-xl text-foreground ${className}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold">True Company Exposure</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/30">
                Live Engine
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Direct stocks + mutual fund look-through
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, ticker, ISIN..."
              className="h-9 pl-9 pr-3 rounded-xl border border-border bg-background text-xs text-foreground focus:border-primary/60 outline-none transition-colors w-44 sm:w-56 placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Sector filter */}
          {sectors.length > 2 && (
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border bg-background text-xs text-muted-foreground focus:text-foreground focus:border-primary/60 outline-none cursor-pointer"
            >
              {sectors.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          )}

          {/* Sort pills */}
          <div className="flex items-center rounded-xl border border-border bg-background p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setSortBy("combined")}
              className={`px-2.5 py-1 rounded-lg transition-colors font-semibold ${
                sortBy === "combined"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Combined
            </button>
            <button
              type="button"
              onClick={() => setSortBy("direct")}
              className={`px-2.5 py-1 rounded-lg transition-colors font-semibold ${
                sortBy === "direct"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Direct
            </button>
            <button
              type="button"
              onClick={() => setSortBy("mf")}
              className={`px-2.5 py-1 rounded-lg transition-colors font-semibold ${
                sortBy === "mf"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              MF
            </button>
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => void loadData()}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Refresh exposure calculation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl bg-accent/40 border border-border">
        <div>
          <span className="text-[11px] text-muted-foreground">Portfolio Value</span>
          <p className="text-base font-bold font-mono text-foreground mt-0.5">
            ₹{data.portfolio_value.toLocaleString("en-IN")}
          </p>
        </div>
        <div>
          <span className="text-[11px] text-muted-foreground">Direct Stocks</span>
          <p className="text-base font-bold font-mono text-emerald-500 mt-0.5">
            ₹{data.total_direct_value.toLocaleString("en-IN")}
          </p>
        </div>
        <div>
          <span className="text-[11px] text-muted-foreground">MF Look-Through</span>
          <p className="text-base font-bold font-mono text-indigo-400 mt-0.5">
            ₹{data.total_mf_value.toLocaleString("en-IN")}
          </p>
        </div>
        <div>
          <span className="text-[11px] text-muted-foreground">Unique Companies</span>
          <p className="text-base font-bold text-foreground mt-0.5">
            {data.companies.length}
          </p>
        </div>
      </div>

      {/* Disclosures & Notice */}
      {!data.mf_lookthrough_available && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
          <SlidersHorizontal className="w-4 h-4 shrink-0" />
          <span>
            Mutual fund composition data unavailable for some or all funds. Direct stock exposure is accurately reflected.
          </span>
        </div>
      )}

      {data.data_as_of && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            Mutual Fund look-through based on latest available disclosures as of{" "}
            <span className="font-semibold text-foreground/80">{data.data_as_of}</span>
          </span>
        </div>
      )}

      {/* Exposure List */}
      <div className="mt-5 space-y-3">
        {filteredCompanies.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No companies match your search criteria.
          </div>
        ) : (
          filteredCompanies.map((company) => {
            const isExpanded = expandedCompanyIds.has(company.company_id);
            const directRatio = company.combined_value > 0
              ? (company.direct_value / company.combined_value) * 100
              : 0;
            const mfRatio = 100 - directRatio;

            return (
              <div
                key={company.company_id}
                className="rounded-xl border border-border bg-card overflow-hidden transition-colors hover:border-border/90"
              >
                {/* Company Row */}
                <div
                  onClick={() => toggleExpand(company.company_id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-accent/30 transition-colors"
                >
                  {/* Left: Company Identity */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0">
                      {(company.ticker || company.company_name).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground truncate">
                          {company.company_name}
                        </span>
                        {company.ticker && (
                          <span className="text-[10px] font-mono text-muted-foreground bg-accent px-1.5 py-0.5 rounded">
                            {company.ticker}
                          </span>
                        )}
                        {company.isin && (
                          <span className="text-[10px] font-mono text-muted-foreground/70 hidden sm:inline">
                            {company.isin}
                          </span>
                        )}
                      </div>
                      {company.sector && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {company.sector}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Exposure Values & Progress Bar */}
                  <div className="flex items-center gap-6 shrink-0 justify-between md:justify-end">
                    {/* Direct vs MF breakdown numbers */}
                    <div className="text-right text-xs">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-emerald-500 font-mono text-[11px]">
                          Direct: ₹{company.direct_value.toLocaleString("en-IN")}
                        </span>
                        <span className="text-indigo-400 font-mono text-[11px]">
                          MF: ₹{company.mutual_fund_value.toLocaleString("en-IN")}
                        </span>
                      </div>
                      {/* Ratio bar */}
                      <div className="w-36 h-1.5 rounded-full bg-accent mt-1.5 flex overflow-hidden">
                        {directRatio > 0 && (
                          <div
                            style={{ width: `${directRatio}%` }}
                            className="bg-emerald-500 h-full"
                            title={`Direct: ${directRatio.toFixed(1)}%`}
                          />
                        )}
                        {mfRatio > 0 && (
                          <div
                            style={{ width: `${mfRatio}%` }}
                            className="bg-indigo-400 h-full"
                            title={`Mutual Funds: ${mfRatio.toFixed(1)}%`}
                          />
                        )}
                      </div>
                    </div>

                    {/* Combined True Exposure badge */}
                    <div className="text-right min-w-[110px]">
                      <p className="text-sm font-bold font-mono text-foreground tabular-nums">
                        ₹{company.combined_value.toLocaleString("en-IN")}
                      </p>
                      <span className="inline-block mt-0.5 text-xs font-bold text-primary font-mono tabular-nums">
                        {company.combined_percent.toFixed(1)}% of portfolio
                      </span>
                    </div>

                    {/* Expand Toggle */}
                    <button
                      type="button"
                      aria-label="View breakdown"
                      className="text-muted-foreground hover:text-foreground p-1 transition-transform"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Drill-down Section */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-border/60 bg-accent/20">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Exposure Breakdown for {company.company_name}
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
                        {company.sources.length} contributing position{company.sources.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* Direct Positions */}
                      {company.direct_value > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                            Direct Stock Holdings (₹{company.direct_value.toLocaleString("en-IN")} • {company.direct_percent.toFixed(2)}%)
                          </div>
                          <div className="space-y-1.5 pl-3 border-l-2 border-emerald-500/30">
                            {company.sources
                              .filter((s) => s.type === "direct")
                              .map((src, idx) => (
                                <div
                                  key={`direct-${idx}`}
                                  className="flex items-center justify-between text-xs py-1"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-foreground font-medium">
                                      {src.holding_name || company.company_name}
                                    </span>
                                    {src.isin && (
                                      <span className="text-[10px] font-mono text-muted-foreground">
                                        ({src.isin})
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono font-semibold text-foreground">
                                    ₹{src.value.toLocaleString("en-IN")}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Mutual Fund Positions */}
                      {company.mutual_fund_value > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                            Through Mutual Funds (₹{company.mutual_fund_value.toLocaleString("en-IN")} • {company.mutual_fund_percent.toFixed(2)}%)
                          </div>
                          <div className="space-y-2 pl-3 border-l-2 border-indigo-400/30">
                            {company.sources
                              .filter((s) => s.type === "mutual_fund")
                              .map((src, idx) => (
                                <div
                                  key={`mf-${idx}`}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between text-xs py-1.5 border-b border-border/40 last:border-0"
                                >
                                  <div>
                                    <p className="text-foreground font-medium">
                                      {src.fund_name}
                                    </p>
                                    <div className="text-[11px] text-muted-foreground flex items-center gap-3 mt-0.5">
                                      <span>
                                        Fund value:{" "}
                                        <strong className="text-foreground/80 font-mono">
                                          ₹{(src.fund_value ?? 0).toLocaleString("en-IN")}
                                        </strong>
                                      </span>
                                      <span>
                                        {company.company_name} weight:{" "}
                                        <strong className="text-primary font-mono">
                                          {(src.company_weight ?? 0).toFixed(2)}%
                                        </strong>
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right mt-1 sm:mt-0">
                                    <span className="text-xs font-bold font-mono text-indigo-400">
                                      ₹{src.exposure_value.toLocaleString("en-IN")}
                                    </span>
                                    <p className="text-[10px] text-muted-foreground">exposure</p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
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

export default TrueCompanyExposure;
