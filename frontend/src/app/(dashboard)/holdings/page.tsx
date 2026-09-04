
"use client";

import React, { useState, useEffect } from "react";
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
import { EmptyState } from "@/components/ui/EmptyState";
import { TableRowSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function HoldingsPage() {
  const { holdings } = usePortfolioStore();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

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
        h.sector.toLowerCase().includes(searchQuery.toLowerCase());

      let matchFilter = true;

      if (activeFilter === "Stock") matchFilter = h.type === "Stock";
      else if (activeFilter === "Mutual Fund")
        matchFilter = h.type === "Mutual Fund";
      else if (activeFilter === "Direct")
        matchFilter = h.planType === "Direct";
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

  // Calculate 52-week ranges dynamically for visual representation
  const get52WRange = (currentPrice: number) => {
    const low = currentPrice * 0.72;
    const high = currentPrice * 1.28;
    const progress = Math.min(
      100,
      Math.max(5, ((currentPrice - low) / (high - low)) * 100)
    );

    return { low, high, progress };
  };

  const [selectedHolding, setSelectedHolding] = useState<
    (typeof holdings)[0] | null
  >(null);

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
            ₹34,80,000
          </p>

          <span className="text-[11px] text-[var(--positive)] font-finance flex items-center gap-1 mt-0.5">
            <TrendingUp className="w-3 h-3" />
            +17.72% (+₹5.24L)
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
            6 Direct Equities · 8 Funds
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card)] border border-border">
          <span className="text-xs text-muted-foreground">
            Regular Plans Flagged
          </span>

          <p className="text-xl sm:text-2xl font-bold font-finance text-[var(--negative)] mt-1 tabular-nums">
            3 Schemes
          </p>

          <span className="text-[11px] text-muted-foreground">
            Annual Drag: ₹16,600
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card)] border border-border">
          <span className="text-xs text-muted-foreground">
            Nominee Compliance
          </span>

          <p className="text-xl sm:text-2xl font-bold font-finance text-[var(--positive)] mt-1 tabular-nums">
            85% Verified
          </p>

          <span className="text-[11px] text-muted-foreground">
            2 Folios Need Update
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
                          {(avgPrice * selectedHolding.quantity).toLocaleString(
                            "en-IN"
                          )}
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


