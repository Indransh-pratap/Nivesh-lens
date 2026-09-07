
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Search,
  LayoutGrid,
  List,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  CheckCircle2,
  Layers,
  SlidersHorizontal,
  ExternalLink,
  Zap,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { Holding } from "@/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableRowSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function HoldingsPage() {
  const { holdings, setHoldings, openSyncModal } = usePortfolioStore();

  const [isLoading, setIsLoading] = useState(true);

  const loadPortfolio = useCallback(async () => {
    try {
      const response = await fetch("/api/portfolio/portfolios", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) return;

      const storedId =
        typeof window !== "undefined"
          ? localStorage.getItem("nivesh_active_portfolio_id")
          : null;
      const portfolio =
        (storedId ? data.find((p: any) => p.id === storedId) : null) ??
        data.find((p: any) => p.name === "CAS Portfolio") ??
        data[0];

      if (!portfolio || !Array.isArray(portfolio.holdings)) return;

      if (typeof window !== "undefined" && portfolio.id) {
        localStorage.setItem("nivesh_active_portfolio_id", portfolio.id);
      }

      const rawItems = portfolio.holdings.map((item: any, index: number) => {
        const rawAssetType = String(
          item.asset_type ?? item.assetType ?? ""
        ).toUpperCase();
        const assetClass = String(
          item.asset_class ?? item.assetClass ?? "Equity"
        );
        const isMF =
          rawAssetType.includes("MUTUAL") ||
          rawAssetType === "MUTUAL_FUND" ||
          (item.name && item.name.toLowerCase().includes("fund"));
        const isStock =
          rawAssetType.includes("STOCK") ||
          rawAssetType.includes("EQUITY") ||
          rawAssetType === "STOCK";
        const type: Holding["type"] = isMF
          ? "Mutual Fund"
          : isStock
            ? "Stock"
            : "Mutual Fund";
        const qty = Number(item.quantity ?? item.units) || 0;
        const avgCost =
          Number(
            item.average_price ?? item.averageCost ?? item.average_cost
          ) || 0;
        const curVal =
          Number(item.current_value ?? item.currentValue) || 0;
        const curPrice =
          Number(item.current_price ?? item.currentPrice) || 0;
        const returnsVal =
          Number(item.returns_value ?? item.returnsValue) || 0;
        const returnsPct = Number(item.returns) || 0;

        return {
          id: item.id ?? `holding_${index}`,
          name: item.name ?? "Unnamed Holding",
          type,
          ticker: item.ticker ?? item.isin?.slice(0, 6) ?? `H${index + 1}`,
          isin: item.isin ?? undefined,
          quantity: qty,
          units: qty,
          avgPrice: avgCost,
          averageCost: avgCost,
          currentValue: curVal,
          currentPrice: curPrice,
          returns: returnsPct,
          returnsValue: returnsVal,
          allocation: 0,
          planType:
            item.plan_type === "Regular" || item.planType === "Regular"
              ? "Regular"
              : "Direct",
          expenseRatio:
            Number(item.expense_ratio ?? item.expenseRatio) || 0,
          riskGrade:
            item.risk_grade === "High" || item.riskGrade === "High"
              ? "High"
              : item.risk_grade === "Medium" || item.riskGrade === "Medium"
                ? "Medium"
                : "Low",
          sector: isMF ? "Diversified MF" : "Equity",
          nomineeStatus: "Verified",
          assetClass,
        } as Holding;
      });

      const totalVal = rawItems.reduce(
        (sum: number, h: Holding) => sum + h.currentValue,
        0
      );
      const normalized = rawItems.map((h: Holding) => ({
        ...h,
        allocation: totalVal > 0 ? (h.currentValue / totalVal) * 100 : 0,
      }));

      setHoldings(normalized);
    } catch (err) {
      console.warn("Could not load holdings portfolio:", err);
    }
  }, [setHoldings]);

  useEffect(() => {
    if (holdings.length === 0) {
      void loadPortfolio().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }

    const handleUpdated = () => {
      setIsLoading(true);
      void loadPortfolio().finally(() => setIsLoading(false));
    };

    if (typeof window !== "undefined") {
      window.addEventListener("nivesh_portfolio_updated", handleUpdated);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("nivesh_portfolio_updated", handleUpdated);
      }
    };
  }, [holdings.length, loadPortfolio]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<
    "value" | "returns" | "name" | "weight"
  >("value");
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");

  const filterChips = [
    { id: "All", label: "All Holdings" },
    { id: "Stock", label: "Direct Equities" },
    { id: "Mutual Fund", label: "Mutual Funds" },
    { id: "Direct", label: "Direct Plans" },
    { id: "Regular", label: "Regular (Fee Bleed)" },
    { id: "FD", label: "Fixed Deposits" },
    { id: "Gainers", label: "Top Gainers" },
  ];

  const filteredHoldings = holdings
    .filter((h) => {
      const matchSearch =
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.sector && h.sector.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchFilter = true;

      if (activeFilter === "Stock")
        matchFilter = h.type === "Stock" || (!h.type && h.assetClass === "Equity");
      else if (activeFilter === "Mutual Fund")
        matchFilter =
          h.type === "Mutual Fund" ||
          (!h.type && (h.assetClass?.includes("Mutual") || h.name.toLowerCase().includes("fund")));
      else if (activeFilter === "Direct")
        matchFilter = h.planType === "Direct" || !h.planType;
      else if (activeFilter === "Regular")
        matchFilter = h.planType === "Regular";
      else if (activeFilter === "FD") matchFilter = h.type === "FD";
      else if (activeFilter === "Gainers") matchFilter = h.returns > 15;

      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      if (sortBy === "value") return b.currentValue - a.currentValue;
      if (sortBy === "returns") return b.returns - a.returns;
      if (sortBy === "weight") return b.allocation - a.allocation;
      return a.name.localeCompare(b.name);
    });

  // Calculate dynamic summary stats
  const totalValue = holdings.reduce(
    (sum, h) => sum + (Number(h.currentValue) || 0),
    0
  );
  const totalGain = holdings.reduce(
    (sum, h) => sum + (Number(h.returnsValue) || 0),
    0
  );
  const totalInvested = totalValue - totalGain;
  const gainPercent =
    totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  const stockCount = holdings.filter(
    (h) => h.type === "Stock" || (!h.type && h.assetClass === "Equity")
  ).length;
  const mfCount = holdings.filter(
    (h) =>
      h.type === "Mutual Fund" ||
      (!h.type && (h.assetClass?.includes("Mutual") || h.name.toLowerCase().includes("fund")))
  ).length;

  const regularHoldings = holdings.filter((h) => h.planType === "Regular");
  const regularCount = regularHoldings.length;
  const regularDrag = regularHoldings.reduce((sum, h) => {
    const expense = Number(h.expenseRatio) || 1.25;
    return sum + (Number(h.currentValue) || 0) * (expense / 100);
  }, 0);

  const verifiedNomineeCount = holdings.filter(
    (h) => (h.nomineeStatus || "Verified") === "Verified"
  ).length;
  const nomineePercent =
    holdings.length > 0
      ? Math.round((verifiedNomineeCount / holdings.length) * 100)
      : 100;
  const unverifiedNomineeCount = holdings.length - verifiedNomineeCount;

  // Calculate 52-week ranges dynamically for visual representation
  const get52WRange = (currentPrice: number) => {
    const safePrice = Number(currentPrice) || 100;
    const low = safePrice * 0.72;
    const high = safePrice * 1.28;
    const progress = Math.min(
      100,
      Math.max(5, ((safePrice - low) / (high - low)) * 100)
    );

    return { low, high, progress };
  };

  const [selectedHolding, setSelectedHolding] = useState<
    (typeof holdings)[0] | null
  >(null);

  if (!isLoading && holdings.length === 0) {
    return (
      <div className="space-y-8 pb-16 text-foreground">
        <PageHeader
          eyebrow="TERMINAL VIEW"
          title="Holdings & Instruments Terminal"
          description="Consolidated inventory of connected direct equities, mutual funds & fixed income assets with 52W range gauges"
        />
        <EmptyState
          icon={Layers}
          title="No Holdings Found"
          description="Upload your CAS statement or connect your broker to view and analyze your investment portfolio."
          actionLabel="Connect Portfolio"
          onAction={openSyncModal}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 text-foreground">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          eyebrow="TERMINAL VIEW"
          title="Holdings & Instruments Terminal"
          description="Consolidated inventory of connected direct equities, mutual funds & fixed income assets with 52W range gauges"
        />

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-[var(--card)] p-1 rounded-xl border border-border">
            <button
              onClick={() => setViewMode("grid")}
              aria-label="Grid card view"
              aria-pressed={viewMode === "grid"}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Grid Card View (Groww Style)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            <button
              onClick={() => setViewMode("table")}
              aria-label="Table view"
              aria-pressed={viewMode === "table"}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                viewMode === "table"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Dense Terminal Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Holdings Summary Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-4 rounded-2xl bg-[var(--card)] border border-border">
          <span className="text-xs text-muted-foreground">
            Total Holdings Value
          </span>

          <p className="text-xl sm:text-2xl font-bold font-finance text-foreground mt-1 tabular-nums">
            ₹{totalValue.toLocaleString("en-IN")}
          </p>

          <span
            className={cn(
              "text-[11px] font-finance flex items-center gap-1 mt-0.5",
              gainPercent >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
            )}
          >
            {gainPercent >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {gainPercent >= 0 ? "+" : ""}
            {gainPercent.toFixed(2)}% ({gainPercent >= 0 ? "+" : ""}₹
            {Math.abs(Math.round(totalGain)).toLocaleString("en-IN")})
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card)] border border-border">
          <span className="text-xs text-muted-foreground">
            Total Instruments
          </span>

          <p className="text-xl sm:text-2xl font-bold font-finance text-foreground mt-1 tabular-nums">
            {holdings.length} Assets
          </p>

          <span className="text-[11px] text-muted-foreground">
            {stockCount} Direct Equities · {mfCount} Funds
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card)] border border-border">
          <span className="text-xs text-muted-foreground">
            Regular Plans Flagged
          </span>

          <p
            className={cn(
              "text-xl sm:text-2xl font-bold font-finance mt-1 tabular-nums",
              regularCount > 0
                ? "text-[var(--negative)]"
                : "text-[var(--positive)]"
            )}
          >
            {regularCount} Schemes
          </p>

          <span className="text-[11px] text-muted-foreground">
            Annual Drag: ₹{Math.round(regularDrag).toLocaleString("en-IN")}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card)] border border-border">
          <span className="text-xs text-muted-foreground">
            Nominee Compliance
          </span>

          <p
            className={cn(
              "text-xl sm:text-2xl font-bold font-finance mt-1 tabular-nums",
              nomineePercent >= 80
                ? "text-[var(--positive)]"
                : "text-amber-500"
            )}
          >
            {nomineePercent}% Verified
          </p>

          <span className="text-[11px] text-muted-foreground">
            {unverifiedNomineeCount === 0
              ? "All Folios Compliant"
              : `${unverifiedNomineeCount} Folio${
                  unverifiedNomineeCount > 1 ? "s" : ""
                } Need Update`}
          </span>
        </div>
      </div>

      {/* Filter Chips Bar & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
        {/* Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border",
                activeFilter === chip.id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-[var(--card)] border-border text-muted-foreground hover:text-foreground hover:border-border-strong"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search holding, ticker..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-[var(--card)] border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "value" | "returns" | "name" | "weight")
              }
              className="h-9 px-3 rounded-xl border border-border bg-[var(--card)] text-xs text-muted-foreground focus:text-foreground focus:border-primary outline-none cursor-pointer font-medium"
            >
              <option value="value">Sort: Highest Value</option>
              <option value="returns">Sort: Highest Returns</option>
              <option value="weight">Sort: Portfolio Weight</option>
              <option value="name">Sort: Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <TableRowSkeleton rows={6} />
      ) : filteredHoldings.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No holdings match this view"
          description={
            searchQuery
              ? `Nothing found for "${searchQuery}". Try a different name, ticker, or sector.`
              : 'No holdings match this filter. Try switching to "All Holdings".'
          }
          actionLabel={
            searchQuery || activeFilter !== "All" ? "Clear filters" : undefined
          }
          onAction={
            searchQuery || activeFilter !== "All"
              ? () => {
                  setSearchQuery("");
                  setActiveFilter("All");
                }
              : undefined
          }
        />
      ) : viewMode === "grid" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHoldings.map((h) => {
            const isProfitable = h.returns >= 0;
            const range = get52WRange(h.currentPrice);
            const isRegular = h.planType === "Regular";

            // Defensive fallback for imported holdings where avgPrice may be missing
            const avgPrice =
              typeof h.avgPrice === "number" && Number.isFinite(h.avgPrice)
                ? h.avgPrice
                : 0;

            return (
              <div
                key={h.id}
                onClick={() => setSelectedHolding(h)}
                className="p-5 rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-accent/20 transition-all duration-200 space-y-4 shadow-sm flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-mono text-muted-foreground font-semibold tracking-wider">
                          {h.sector}
                        </span>

                        {isRegular && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold font-mono">
                            REGULAR PLAN
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-foreground mt-0.5 line-clamp-1 group-hover:text-primary transition-colors">
                        {h.name}
                      </h4>

                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {h.ticker} {h.isin ? `· ${h.isin}` : ""}
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium border border-border bg-accent/60 text-muted-foreground shrink-0">
                      {h.type === "Stock"
                        ? "Equity"
                        : `${h.planType || ""} MF`}
                    </span>
                  </div>

                  {/* Pricing & Returns */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border font-finance text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-sans text-muted-foreground block">
                        Current Value
                      </span>

                      <span className="text-base font-bold text-foreground tabular-nums">
                        ₹{h.currentValue.toLocaleString("en-IN")}
                      </span>

                      <span className="text-[10px] text-muted-foreground block font-sans">
                        Qty: {h.quantity} @ ₹{avgPrice.toFixed(1)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-sans text-muted-foreground block">
                        Total P&L
                      </span>

                      <span
                        className={cn(
                          "text-base font-bold tabular-nums",
                          isProfitable
                            ? "text-[var(--positive)]"
                            : "text-[var(--negative)]"
                        )}
                      >
                        {isProfitable ? "+" : ""}
                        {h.returns.toFixed(2)}%
                      </span>

                      <span className="text-[10px] text-muted-foreground block tabular-nums">
                        ({isProfitable ? "+" : ""}₹
                        {h.returnsValue.toLocaleString("en-IN")})
                      </span>
                    </div>
                  </div>

                  {/* 52-Week Price Range */}
                  <div className="pt-3 space-y-1 text-[10.5px] font-mono">
                    <div className="flex justify-between text-muted-foreground">
                      <span>52W L: ₹{range.low.toFixed(1)}</span>

                      <span className="text-foreground font-semibold">
                        LTP: ₹{h.currentPrice.toFixed(1)}
                      </span>

                      <span>52W H: ₹{range.high.toFixed(1)}</span>
                    </div>

                    <div className="w-full h-1 bg-accent rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-slate-400 dark:bg-slate-600 rounded-full"
                        style={{ width: `${range.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-[11px]">
                      Weight:
                    </span>

                    <span className="font-semibold text-foreground font-finance tabular-nums">
                      {h.allocation.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-primary text-xs font-semibold group-hover:underline">
                    <span>Inspect Details</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Dense Terminal Table View */
        <div className="rounded-2xl border border-border bg-card shadow-sm text-foreground overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-finance">
              <thead className="bg-accent/40 text-[10px] uppercase font-bold text-muted-foreground border-b border-border font-sans">
                <tr>
                  <th className="py-3 px-4">Instrument & Ticker</th>
                  <th className="py-3 px-3">Type / Plan</th>
                  <th className="py-3 px-3 text-right">Qty</th>
                  <th className="py-3 px-3 text-right">Avg Buy</th>
                  <th className="py-3 px-3 text-right">LTP</th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-foreground font-bold"
                    onClick={() => setSortBy("value")}
                  >
                    Current Value
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-foreground font-bold"
                    onClick={() => setSortBy("returns")}
                  >
                    Returns (P&L)
                  </th>
                  <th className="py-3 px-3 text-right">Weight</th>
                  <th className="py-3 px-4 font-sans text-center">
                    Nominee
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {filteredHoldings.map((h) => {
                  const isProfitable = h.returns >= 0;

                  const avgPrice =
                    typeof h.avgPrice === "number" &&
                    Number.isFinite(h.avgPrice)
                      ? h.avgPrice
                      : 0;

                  return (
                    <tr
                      key={h.id}
                      onClick={() => setSelectedHolding(h)}
                      className="hover:bg-accent/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-sans font-semibold text-foreground">
                        <div>{h.name}</div>

                        <span className="text-[10px] text-muted-foreground font-mono">
                          {h.ticker} {h.isin ? `· ${h.isin}` : ""}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-sans">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-accent text-muted-foreground border border-border">
                          {h.type} {h.planType ? `(${h.planType})` : ""}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right text-muted-foreground tabular-nums">
                        {h.quantity}
                      </td>

                      <td className="py-3 px-3 text-right text-muted-foreground tabular-nums">
                        ₹{avgPrice.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right font-medium text-foreground tabular-nums">
                        ₹{h.currentPrice.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-foreground tabular-nums">
                        ₹{h.currentValue.toLocaleString("en-IN")}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span
                          className={`font-bold tabular-nums ${
                            isProfitable
                              ? "text-[var(--positive)]"
                              : "text-[var(--negative)]"
                          }`}
                        >
                          {isProfitable ? "+" : ""}
                          {h.returns.toFixed(2)}%
                        </span>

                        <span className="text-[10px] text-muted-foreground block tabular-nums font-sans">
                          ({isProfitable ? "+" : ""}₹
                          {h.returnsValue.toLocaleString("en-IN")})
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className="font-semibold text-foreground tabular-nums">
                          {h.allocation.toFixed(1)}%
                        </span>

                        <div className="w-14 h-1 bg-accent rounded-full overflow-hidden mt-1 ml-auto">
                          <div
                            className="h-full bg-slate-400 dark:bg-slate-600 rounded-full"
                            style={{
                              width: `${h.allocation * 4}%`,
                            }}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-4 font-sans text-center">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-medium border",
                            h.nomineeStatus === "Verified"
                              ? "bg-[var(--positive-soft)] text-[var(--positive)] border-[var(--positive)]/20"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          )}
                        >
                          {h.nomineeStatus || "Verified"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Holding Slide-Over Modal / Drawer */}
      {selectedHolding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div
            className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex items-start justify-between gap-4 bg-[var(--background-elevated)]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold">
                    {selectedHolding.type}
                  </span>

                  <span className="text-xs text-muted-foreground font-mono">
                    {selectedHolding.sector} · {selectedHolding.ticker}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-foreground mt-1">
                  {selectedHolding.name}
                </h3>

                {selectedHolding.isin && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    ISIN: {selectedHolding.isin}{" "}
                    {selectedHolding.folioNumber
                      ? `· Folio: ${selectedHolding.folioNumber}`
                      : ""}
                  </p>
                )}
              </div>

              <button
                onClick={() => setSelectedHolding(null)}
                aria-label="Close holding details"
                className="w-8 h-8 rounded-lg bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Calculate safe avg price */}
              {(() => {
                const avgPrice =
                  typeof selectedHolding.avgPrice === "number" &&
                  Number.isFinite(selectedHolding.avgPrice)
                    ? selectedHolding.avgPrice
                    : 0;

                const investedAmount =
                  avgPrice > 0 && selectedHolding.quantity > 0
                    ? avgPrice * selectedHolding.quantity
                    : Math.max(
                        0,
                        selectedHolding.currentValue -
                          (selectedHolding.returnsValue || 0)
                      );

                return (
                  <>
                    {/* Financial Snapshot */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl bg-accent/40 border border-border">
                        <span className="text-[11px] text-muted-foreground block">
                          Current Value
                        </span>

                        <span className="text-base font-bold font-finance text-foreground tabular-nums">
                          ₹
                          {selectedHolding.currentValue.toLocaleString(
                            "en-IN"
                          )}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-accent/40 border border-border">
                        <span className="text-[11px] text-muted-foreground block">
                          Invested Amount
                        </span>

                        <span className="text-base font-bold font-finance text-foreground tabular-nums">
                          ₹
                          {Math.round(investedAmount).toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-accent/40 border border-border">
                        <span className="text-[11px] text-muted-foreground block">
                          Total Returns
                        </span>

                        <span
                          className={cn(
                            "text-base font-bold font-finance tabular-nums",
                            selectedHolding.returns >= 0
                              ? "text-[var(--positive)]"
                              : "text-[var(--negative)]"
                          )}
                        >
                          {selectedHolding.returns >= 0 ? "+" : ""}
                          {selectedHolding.returns.toFixed(2)}%
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-accent/40 border border-border">
                        <span className="text-[11px] text-muted-foreground block">
                          Portfolio Weight
                        </span>

                        <span className="text-base font-bold font-finance text-foreground tabular-nums">
                          {selectedHolding.allocation.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Position Breakdown Table */}
                    <div className="p-4 rounded-xl border border-border bg-accent/20 space-y-2.5 text-xs font-finance">
                      <div className="flex justify-between items-center text-muted-foreground pb-2 border-b border-border font-sans">
                        <span>Holding Parameter</span>
                        <span>Value</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-sans">
                          Quantity / Units:
                        </span>

                        <span className="font-semibold text-foreground">
                          {selectedHolding.quantity} Units
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-sans">
                          Average Buy Price:
                        </span>

                        <span className="font-semibold text-foreground">
                          ₹{avgPrice.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-sans">
                          Current LTP / NAV:
                        </span>

                        <span className="font-semibold text-foreground">
                          ₹{selectedHolding.currentPrice.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-sans">
                          Nominee Status:
                        </span>

                        <span
                          className={cn(
                            "font-semibold",
                            selectedHolding.nomineeStatus === "Verified"
                              ? "text-[var(--positive)]"
                              : "text-amber-500"
                          )}
                        >
                          {selectedHolding.nomineeStatus || "Verified"}
                        </span>
                      </div>
                    </div>

                    {/* Plan Type & Fee Bleed Alert if Regular */}
                    {selectedHolding.planType === "Regular" && (
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-amber-500 font-bold">
                          <ShieldAlert className="w-4 h-4" />
                          <span>Regular Plan Fee Drag Detected</span>
                        </div>

                        <p className="text-muted-foreground text-[11.5px] leading-relaxed">
                          This fund is currently running as a Regular Plan with
                          distributor commissions embedded in the NAV. Switching
                          this holding to a{" "}
                          <strong>Direct Plan</strong> can save you ~₹4,200
                          annually and add significantly to your compounding
                          wealth.
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-border bg-[var(--background-elevated)] flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/portfolio-xray"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5"
              >
                <span>Full Portfolio X-Ray</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <div className="flex items-center gap-2">
                <Link href="/simulator">
                  <button className="px-3 py-2 rounded-xl bg-accent border border-border text-xs font-semibold text-foreground hover:bg-accent/80 transition-colors cursor-pointer">
                    Simulate Crash
                  </button>
                </Link>

                <button
                  onClick={() => setSelectedHolding(null)}
                  className="px-4 py-2 rounded-xl bg-card border border-border text-xs font-semibold text-foreground hover:bg-accent transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


