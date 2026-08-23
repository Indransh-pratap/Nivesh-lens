"use client";

import React from "react";
import { 
  FileText, 
  Sparkles, 
  Info
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";

export function TaxRebalancer() {
  const { taxGains } = usePortfolioStore();

  return (
    <div className="rounded-2xl border border-border bg-[var(--card)] p-6 shadow-xl shadow-black/30 text-foreground relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Tax-Aware Rebalancing Engine</h3>
            <p className="text-xs text-muted-foreground">Budget 2024 Compliant: STCG (20%) & LTCG (12.5% above ₹1.25L Exemption) Optimizer</p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl border border-[var(--positive)]/20 bg-[var(--positive)]/10 text-[var(--positive)] text-xs font-semibold font-mono tabular-nums">
          Annual ₹1.25L LTCG Exemption: ₹77,000 Unused
        </div>
      </div>

      {/* Tax Harvest Steps Table */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--background-elevated)] text-[10px] uppercase font-bold text-muted-foreground border-y border-border/70 font-sans tracking-wider">
            <tr>
              <th className="py-3 px-4">Asset Name</th>
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3">Purchase Date</th>
              <th className="py-3 px-4 text-right">Unrealized Gain / Loss</th>
              <th className="py-3 px-3 text-right">Tax Rate</th>
              <th className="py-3 px-3 text-center">Exit Load</th>
              <th className="py-3 px-4 font-sans text-right">Action Recommendation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {taxGains.map((item) => {
              const isLoss = item.gainAmount < 0;
              return (
                <tr key={item.id} className="hover:bg-accent transition-colors">
                  <td className="py-3.5 px-4 font-sans font-bold text-foreground">
                    {item.assetName}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                      item.gainType === "LTCG" 
                        ? "bg-[var(--positive)]/10 text-[var(--positive)] border-[var(--positive)]/20" 
                        : "bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/20"
                    }`}>
                      {item.gainType}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-muted-foreground font-mono text-[11px]">
                    {item.purchaseDate}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums">
                    <span className={isLoss ? "text-[var(--negative)]" : "text-[var(--positive)]"}>
                      {isLoss ? "-" : "+"}₹{Math.abs(item.gainAmount).toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right text-muted-foreground font-mono tabular-nums">
                    {(item.taxRate * 100).toFixed(1)}%
                  </td>
                  <td className="py-3.5 px-3 text-center font-sans">
                    {item.exitLoadApplicable ? (
                      <span className="text-[var(--warning)] text-[11px] font-semibold bg-[var(--warning)]/10 px-2 py-0.5 rounded border border-[var(--warning)]/20">1% (Wait 2 mo)</span>
                    ) : (
                      <span className="text-[var(--positive)] text-[11px] font-semibold bg-[var(--positive)]/10 px-2 py-0.5 rounded border border-[var(--positive)]/20">Nil</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-sans text-right">
                    <span className="px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3" strokeWidth={1.75} />
                      <span>{item.recommendation}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tax Harvest summary banner */}
      <div className="mt-5 p-4 rounded-xl bg-[var(--background-elevated)] border border-border/70 text-xs text-muted-foreground flex items-start gap-3">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={1.75} />
        <div className="leading-relaxed font-sans">
          <strong className="text-foreground">Tax Harvesting Opportunity: </strong>
          Selling Infosys can offset ₹12,400 in short-term capital gains, immediately saving <strong className="text-foreground font-mono tabular-nums">₹2,480 in taxes</strong>. Furthermore, selling ₹1,20,000 of Reliance takes full advantage of your annual ₹1.25L LTCG tax-free exemption before March 31.
        </div>
      </div>
    </div>
  );
}
