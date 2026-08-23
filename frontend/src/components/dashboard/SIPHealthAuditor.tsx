"use client";

import React, { useState } from "react";
import { 
  Activity, 
  CheckCircle2, 
  RotateCw, 
  Zap,
  ArrowDown
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { Button } from "@/components/ui/Button";
import { InsightFlag } from "@/components/ui/InsightFlag";

export function SIPHealthAuditor() {
  const { sipAudits } = usePortfolioStore();
  const [switchedIds, setSwitchedIds] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState(false);

  const underperformers = sipAudits.filter((s) => s.status === "Underperformer" && !switchedIds.includes(s.id));

  const handleSwitch = (id: string) => {
    setSwitchedIds(prev => [...prev, id]);
  };

  const handleReviewFix = () => {
    setHighlighted(true);
    const el = document.getElementById("sip-audit-list");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setTimeout(() => setHighlighted(false), 3000);
  };

  const getGradeColor = (grade: string) => {
    if (grade === "A+" || grade === "A") return "bg-primary/10 text-primary border-primary/20";
    if (grade === "B") return "bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/20";
    if (grade === "C") return "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20";
    return "bg-[var(--negative)]/10 text-[var(--negative)] border-[var(--negative)]/20";
  };

  return (
    <div id="sip-health-auditor" className="rounded-2xl border border-border bg-card p-6 shadow-md text-foreground relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Smart SIP Health Check & 1-Click Auto-Switch</h3>
            <p className="text-xs text-muted-foreground">Audits 3-year rolling returns & alpha consistency on all active monthly debits</p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span>Active SIPs: <strong className="text-foreground tabular-nums">₹32,000 / month</strong></span>
        </div>
      </div>

      {/* SIP List */}
      <div className="space-y-4 mt-6">
        {underperformers.length > 0 && (
          <InsightFlag
            severity="warning"
            headline={`${underperformers.length} active SIP${underperformers.length > 1 ? "s are" : " is"} underperforming its benchmark`}
            why="Continuing a monthly debit into a fund with negative alpha compounds the shortfall every month — the longer it runs, the more expensive it is to fix later."
            fixLabel="Review the suggested 1-click switches below"
            onFix={handleReviewFix}
          />
        )}
        
        <div id="sip-audit-list" className="space-y-4 pt-1">
          {sipAudits.map((sip) => {
            const isSwitched = switchedIds.includes(sip.id);
            const isUnderperformer = sip.status === "Underperformer";

            return (
              <div 
                key={sip.id} 
                className={`p-5 rounded-2xl border transition-all duration-300 ${
                  highlighted && isUnderperformer && !isSwitched
                    ? "ring-2 ring-primary border-primary bg-primary/5"
                    : isUnderperformer && !isSwitched
                    ? "border-[var(--warning)]/30 bg-[var(--warning)]/[0.04] hover:border-[var(--warning)]/60"
                    : "border-border bg-card hover:border-border-strong"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Scheme & Grade */}
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border shrink-0 ${getGradeColor(sip.grade)}`}>
                      {sip.grade}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <span>{sip.fundName}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-accent text-muted-foreground font-normal tabular-nums">
                          ₹{sip.monthlyAmount.toLocaleString("en-IN")}/mo
                        </span>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{sip.recommendation}</p>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-6 font-mono text-xs">
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block font-sans">3Y Rolling Return</span>
                      <span className="font-bold text-foreground tabular-nums">{sip.rolling3YReturn}%</span>
                      <span className="text-[10px] text-muted-foreground ml-1 font-sans">(Bench: {sip.benchmarkReturn}%)</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block font-sans">Alpha Generated</span>
                      <span className={`font-bold tabular-nums ${sip.alpha > 2 ? "text-[var(--positive)]" : "text-[var(--warning)]"}`}>
                        +{sip.alpha}%
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block font-sans">Status</span>
                      <span className={`text-xs font-sans font-semibold px-2 py-0.5 rounded-md border ${
                        isUnderperformer 
                          ? "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning)]/30" 
                          : "bg-[var(--positive-soft)] text-[var(--positive)] border-[var(--positive)]/30"
                      }`}>
                        {sip.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Auto-Switch Drawer if Underperformer */}
                {sip.suggestedSwitch && (
                  <div className="mt-4 pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Zap className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
                      <span>
                        Suggested 1-Click Replacement: <strong className="text-foreground">{sip.suggestedSwitch.replacementFund}</strong> ({sip.suggestedSwitch.terDifference})
                      </span>
                    </div>

                    {isSwitched ? (
                      <span className="text-[var(--positive)] font-semibold flex items-center gap-1.5 font-mono">
                        <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
                        <span>SIP Switch Scheduled (Direct Plan)</span>
                      </span>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => handleSwitch(sip.id)}
                        className="font-bold text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground border-none cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5" strokeWidth={1.75} />
                        <span>Auto-Switch SIP</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
