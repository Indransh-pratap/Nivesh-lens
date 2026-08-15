"use client";

import React, { useState } from "react";
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  ArrowUpDown, 
  SlidersHorizontal,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { cn, formatINR, formatINRCompact, formatPercent } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type SortField = "name" | "currentValue" | "returns" | "allocation";
type SortOrder = "asc" | "desc";

export default function PortfolioPage() {
  const { holdings, getPortfolioValue } = usePortfolioStore();

  // Table states
  const [searchTerm, setSearchTerm] = useState("");
  const [assetFilter, setAssetFilter] = useState<"All" | "Stock" | "Mutual Fund">("All");
  const [sortField, setSortField] = useState<SortField>("currentValue");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const portfolioValue = getPortfolioValue();

  // Row expand toggler
  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Sort toggler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Filter, search & sort calculations
  const filteredHoldings = holdings
    .filter((h) => {
      const matchesSearch = h.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            h.ticker.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = assetFilter === "All" || h.type === assetFilter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let multiplier = sortOrder === "asc" ? 1 : -1;
      
      if (sortField === "name") {
        return multiplier * a.name.localeCompare(b.name);
      }
      if (sortField === "currentValue") {
        return multiplier * (a.currentValue - b.currentValue);
      }
      if (sortField === "returns") {
        return multiplier * (a.returns - b.returns);
      }
      if (sortField === "allocation") {
        return multiplier * (a.allocation - b.allocation);
      }
      return 0;
    });

  // Pagination calculations
  const totalPages = Math.ceil(filteredHoldings.length / itemsPerPage);
  const paginatedHoldings = filteredHoldings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Holdings & X-Ray</h1>
          <p className="text-sm text-muted-foreground">Detailed asset-level summary with underlying fund breakdown.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="flex items-center gap-1.5">
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </Button>
          <Button size="sm" className="flex items-center gap-1">
            <Plus className="h-4 w-4" /> Buy / Add Transaction
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border/60">
        <CardContent className="p-4 md:p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-muted" />
            <input
              type="text"
              placeholder="Search by asset name or ticker..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 h-10 w-full rounded-lg border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Filter Pills */}
            <div className="flex rounded-lg bg-accent p-0.5 border border-border/40">
              {(["All", "Stock", "Mutual Fund"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setAssetFilter(filter);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors",
                    assetFilter === filter
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  )}
                >
                  {filter}s
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-border/80 hidden md:block" />

            <div className="flex items-center gap-1 text-xs font-semibold text-muted bg-accent/30 px-3 py-1.5 rounded-lg border border-border/20">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Sorted by {sortField === "currentValue" ? "Value" : sortField} ({sortOrder})</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holdings Table Grid */}
      <Card className="border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-accent/20 text-xs font-bold text-muted-foreground uppercase">
                <th className="py-4 px-6 w-12" />
                <th className="py-4 px-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("name")}>
                  <div className="flex items-center gap-1">Asset Name <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="py-4 px-4">Qty / Avg Price</th>
                <th className="py-4 px-4 cursor-pointer hover:text-foreground transition-colors text-right" onClick={() => handleSort("currentValue")}>
                  <div className="flex items-center justify-end gap-1">Current Value <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="py-4 px-4 cursor-pointer hover:text-foreground transition-colors text-right" onClick={() => handleSort("returns")}>
                  <div className="flex items-center justify-end gap-1">Total Returns <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="py-4 px-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("allocation")}>
                  <div className="flex items-center gap-1">Allocation <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="py-4 px-4">Risk Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {paginatedHoldings.map((h) => {
                const isExpanded = !!expandedRows[h.id];
                const hasUnderlying = h.underlyingHoldings && h.underlyingHoldings.length > 0;
                
                return (
                  <React.Fragment key={h.id}>
                    {/* Master Row */}
                    <tr 
                      className={cn(
                        "hover:bg-accent/10 transition-colors text-sm group cursor-pointer",
                        isExpanded && "bg-accent/5"
                      )}
                      onClick={() => hasUnderlying && toggleRow(h.id)}
                    >
                      <td className="py-4 px-6 text-center">
                        {hasUnderlying ? (
                          isExpanded ? <ChevronDown className="h-4 w-4 text-muted" /> : <ChevronRight className="h-4 w-4 text-muted" />
                        ) : (
                          <span className="w-4 h-4 block" />
                        )}
                      </td>
                      <td className="py-4 px-4 font-bold">
                        <div className="flex flex-col">
                          <span className="text-foreground group-hover:text-primary transition-colors">{h.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground uppercase font-mono">{h.ticker}</span>
                            <Badge variant={h.type === "Stock" ? "primary" : "secondary"} className="text-[9px] px-1 py-0 scale-90">
                              {h.type}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-medium text-muted-foreground text-xs">
                        <div className="flex flex-col">
                          <span>{h.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} units</span>
                          <span className="text-[10px] mt-0.5">Avg: {formatINR(h.avgPrice, 2)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-extrabold text-right">
                        <div className="flex flex-col">
                          <span>{formatINR(h.currentValue, 2)}</span>
                          <span className="text-[10px] font-medium text-muted-foreground mt-0.5">NAV: {formatINR(h.currentPrice, 2)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex flex-col">
                          <span className={cn("font-bold", h.returns >= 0 ? "text-green-500" : "text-red-500")}>
                            {h.returns >= 0 ? "▲" : "▼"} {formatPercent(h.returns)}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            {h.returnsValue >= 0 ? "+" : ""}{formatINRCompact(h.returnsValue)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-accent rounded-full overflow-hidden shrink-0">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${(h.currentValue / portfolioValue) * 100}%` }} />
                          </div>
                          <span className="text-xs">{((h.currentValue / portfolioValue) * 100).toFixed(2)}%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge 
                          variant={
                            h.riskGrade === "High" ? "danger" : 
                            h.riskGrade === "Medium" ? "warning" : "success"
                          }
                          className="font-bold px-2 py-0.5"
                        >
                          {h.riskGrade}
                        </Badge>
                      </td>
                    </tr>

                    {/* Expandable Sub-Row (Look-Through Stocks) */}
                    {isExpanded && hasUnderlying && (
                      <tr className="bg-accent/5">
                        <td colSpan={7} className="p-0 border-t border-border/40">
                          <div className="px-16 py-4 space-y-4 animate-in fade-in duration-200">
                            <div className="flex justify-between items-center pb-2 border-b border-border/20">
                              <div>
                                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Underlying Stock Exposure</h5>
                                <p className="text-[10px] text-muted">Direct stock concentration breakdown within this Mutual Fund</p>
                              </div>
                              <Badge variant="primary" className="text-[9px]">Look-Through Active</Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {h.underlyingHoldings?.map((underlying, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-card border border-border/40 shadow-sm text-xs font-semibold">
                                  <div className="space-y-1">
                                    <h6 className="text-foreground">{underlying.name}</h6>
                                    <div className="flex gap-2 text-[10px] text-muted-foreground font-mono">
                                      <span>{underlying.ticker}</span>
                                      <span>•</span>
                                      <span>{underlying.sector}</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-foreground font-bold">{underlying.allocation}%</div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">{formatINRCompact(underlying.value)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state check */}
        {filteredHoldings.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
            <h4 className="text-sm font-bold text-foreground">No Holdings Found</h4>
            <p className="text-xs text-muted max-w-xs mx-auto">We couldn&apos;t find any assets matching search query or selected asset filters.</p>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border/60 bg-accent/20 flex justify-between items-center text-xs font-semibold text-muted-foreground">
            <span>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredHoldings.length)} of {filteredHoldings.length} assets</span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span>Page {currentPage} of {totalPages}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Aggregate Sector Breakdown Table card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Concentration Risk Analysis</CardTitle>
            <CardDescription>Depository aggregates over overlapping fund shares</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60 text-xs font-semibold">
              <div className="grid grid-cols-3 p-4 bg-accent/10 text-muted uppercase font-bold tracking-wider">
                <span>Underlying Company</span>
                <span>Aggregate Weight</span>
                <span className="text-right">Estimated Value</span>
              </div>
              <div className="grid grid-cols-3 p-4 hover:bg-accent/5 transition-colors">
                <span className="text-foreground font-bold">HDFC Bank Ltd.</span>
                <span className="text-red-500 font-extrabold flex items-center gap-1">20.12% <Badge variant="danger" className="text-[8px] py-0 scale-75">Danger</Badge></span>
                <span className="text-right font-extrabold">₹6,03,600</span>
              </div>
              <div className="grid grid-cols-3 p-4 hover:bg-accent/5 transition-colors">
                <span className="text-foreground font-bold">Reliance Industries Ltd.</span>
                <span className="text-amber-500 font-extrabold flex items-center gap-1">18.52% <Badge variant="warning" className="text-[8px] py-0 scale-75">Warning</Badge></span>
                <span className="text-right font-extrabold">₹5,55,600</span>
              </div>
              <div className="grid grid-cols-3 p-4 hover:bg-accent/5 transition-colors">
                <span className="text-foreground font-bold">Tata Consultancy Services Ltd.</span>
                <span className="text-foreground">11.23%</span>
                <span className="text-right font-extrabold">₹3,36,900</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Small warning card explaining look-through */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 space-y-4">
            <div className="p-2 bg-primary/10 rounded-lg w-fit text-primary">
              <HelpCircle className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-sm">What is Mutual Fund Look-Through?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When you buy a mutual fund, you purchase shares in dozens of companies under the hood. Nivesh Lens scans the portfolio of each mutual fund dynamically, and aggregates those holdings with your direct stock positions.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
              This uncovers double exposures and structural overlap that traditional broker apps miss.
            </p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
