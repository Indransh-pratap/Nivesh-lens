"use client";

import { 
  Wallet
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { EmptyState } from "@/components/ui/EmptyState";

export function DividendCalendar() {
  const { dividends, openSyncModal } = usePortfolioStore();

  if (!dividends || dividends.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No dividend records available"
        description="Upload your CAS statement or connect your account to track upcoming corporate dividend announcements, ex-dates, and projected passive income."
        actionLabel="Connect Portfolio"
        onAction={() => openSyncModal("CAS")}
      />
    );
  }

  const totalAnnualDividends = dividends.reduce((acc, d) => acc + d.totalDividend, 0);

  return (
    <div className="rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Dividend & Passive Cash Flow Tracker</h3>
            <p className="text-xs text-muted-foreground">12-Month projected corporate payouts, ex-dates and direct bank credits</p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/10 text-primary text-xs font-semibold font-mono tabular-nums">
          Projected Annual: ₹{totalAnnualDividends.toLocaleString("en-IN")}
        </div>
      </div>

      {/* Dividends Timeline Table */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--background-elevated)] text-[10px] uppercase font-bold text-muted-foreground border-y border-border/70 font-sans tracking-wider">
            <tr>
              <th className="py-3 px-4">Company & Ticker</th>
              <th className="py-3 px-3">Ex-Dividend Date</th>
              <th className="py-3 px-3">Payout Date</th>
              <th className="py-3 px-3 text-right">Dividend / Share</th>
              <th className="py-3 px-3 text-right">Shares Held</th>
              <th className="py-3 px-4 text-right">Total Payout</th>
              <th className="py-3 px-4 font-sans text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {dividends.map((div) => (
              <tr key={div.id} className="hover:bg-accent transition-colors">
                <td className="py-3.5 px-4 font-sans">
                  <span className="font-bold text-foreground block">{div.companyName}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{div.ticker} · Yield: <span className="tabular-nums">{div.dividendYield}%</span></span>
                </td>
                <td className="py-3.5 px-3 text-muted-foreground font-mono text-[11px]">
                  {div.exDate}
                </td>
                <td className="py-3.5 px-3 text-muted-foreground font-mono text-[11px]">
                  {div.payoutDate}
                </td>
                <td className="py-3.5 px-3 text-right font-semibold font-mono text-foreground tabular-nums">
                  ₹{div.dividendPerShare.toFixed(2)}
                </td>
                <td className="py-3.5 px-3 text-right text-muted-foreground font-mono tabular-nums">
                  {div.sharesHeld}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-[var(--positive)] text-sm tabular-nums">
                  ₹{div.totalDividend.toLocaleString("en-IN")}
                </td>
                <td className="py-3.5 px-4 font-sans text-right">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                    div.status === "Announced" 
                      ? "bg-[var(--positive)]/10 text-[var(--positive)] border-[var(--positive)]/20" 
                      : "bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/20"
                  }`}>
                    {div.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
