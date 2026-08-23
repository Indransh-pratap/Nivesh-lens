"use client";

import React, { useState, useMemo, useCallback } from "react";
import { 
  ReceiptText, 
  Search, 
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { TransactionRecord } from "@/types";
import { MOCK_TRANSACTIONS_50 } from "@/data/mock/phase1Data";
import { Button } from "@/components/ui/Button";

interface VirtualizedTransactionTableProps {
  transactions?: TransactionRecord[];
  className?: string;
}

export const VirtualizedTransactionTable = React.memo(function VirtualizedTransactionTable({
  transactions = MOCK_TRANSACTIONS_50,
  className = ""
}: VirtualizedTransactionTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Memoized filter and search
  const filteredList = useMemo(() => {
    return transactions.filter((t) => {
      const matchSearch = t.schemeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.transactionRef.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === "All" || t.type === filterType;
      return matchSearch && matchType;
    });
  }, [transactions, searchQuery, filterType]);

  // Total pages
  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;

  // Memoized page slice
  const paginatedSlice = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const handleNext = useCallback(() => {
    setCurrentPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const handlePrev = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 1));
  }, []);

  const getTypeStyle = (type: TransactionRecord["type"]) => {
    if (type.includes("Buy") || type === "Switch In") return "bg-[var(--positive)]/10 text-[var(--positive)] border-[var(--positive)]/20";
    if (type === "Redemption" || type === "Switch Out") return "bg-[var(--negative)]/10 text-[var(--negative)] border-[var(--negative)]/20";
    return "bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/20";
  };

  return (
    <div className={`rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground relative overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <ReceiptText className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Transaction Stream</h3>
            <p className="text-xs text-muted-foreground">Direct broker & AMC-indexed transactions ({transactions.length} total records)</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search scheme, ref, ticker..."
              className="h-9 pl-9 pr-3 rounded-xl border border-border bg-[var(--background)] text-xs text-foreground focus:border-primary/60 outline-none transition-colors w-48 sm:w-56 placeholder:text-muted-foreground/60"
            />
          </div>

          <select 
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
            className="h-9 px-3 rounded-xl border border-border bg-[var(--background)] text-xs text-muted-foreground focus:text-foreground focus:border-primary/60 outline-none cursor-pointer font-sans"
          >
            <option value="All">All Types</option>
            <option value="SIP Buy">SIP Debits</option>
            <option value="Lump Sum Buy">Lump Sum</option>
            <option value="Redemption">Redemptions</option>
            <option value="Dividend Payout">Dividends</option>
          </select>
        </div>
      </div>

      {/* Paginated / Virtual Table Content */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--background-elevated)] text-[10px] uppercase font-bold text-muted-foreground border-y border-border/70 font-sans tracking-wider">
            <tr>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3">Scheme & Folio</th>
              <th className="py-3 px-3 text-right">Units</th>
              <th className="py-3 px-3 text-right">NAV</th>
              <th className="py-3 px-4 text-right font-semibold text-primary">Amount</th>
              <th className="py-3 px-4 font-sans text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {paginatedSlice.map((tx) => (
              <tr key={tx.id} className="hover:bg-accent transition-colors">
                <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                  {tx.date}
                </td>

                <td className="py-3 px-3 font-sans">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border inline-block ${getTypeStyle(tx.type)}`}>
                    {tx.type}
                  </span>
                </td>

                <td className="py-3 px-3 font-sans">
                  <span className="font-bold text-foreground block truncate max-w-xs">{tx.schemeName}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Folio: {tx.folioNumber} · Ref: {tx.transactionRef}</span>
                </td>

                <td className="py-3 px-3 text-right text-muted-foreground font-mono tabular-nums">
                  {tx.units.toFixed(3)}
                </td>

                <td className="py-3 px-3 text-right text-muted-foreground font-mono tabular-nums">
                  ₹{tx.nav.toFixed(2)}
                </td>

                <td className="py-3 px-4 text-right font-bold text-foreground font-mono tabular-nums">
                  ₹{tx.amount.toLocaleString("en-IN")}
                </td>

                <td className="py-3 px-4 font-sans text-right">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                    tx.status === "Executed" 
                      ? "bg-[var(--positive)]/10 text-[var(--positive)] border-[var(--positive)]/20" 
                      : "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20 animate-pulse"
                  }`}>
                    {tx.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs">
        <span className="text-muted-foreground text-[11px] font-mono">
          Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredList.length)} of {filteredList.length} transactions
        </span>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrev} 
            disabled={currentPage === 1}
            className="h-8 px-2.5 text-xs gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Prev</span>
          </Button>

          <span className="text-xs font-mono text-foreground font-semibold px-2 tabular-nums">
            {currentPage} / {totalPages}
          </span>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleNext} 
            disabled={currentPage >= totalPages}
            className="h-8 px-2.5 text-xs gap-1"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </div>
  );
});
