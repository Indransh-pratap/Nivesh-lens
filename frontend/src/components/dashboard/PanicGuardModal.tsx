"use client";

import React from "react";
import { 
  X, 
  ShieldCheck, 
  HeartHandshake, 
  CheckCircle2
} from "lucide-react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useDialogA11y } from "@/lib/useDialogA11y";

export function PanicGuardModal() {
  const { isPanicGuardOpen, closePanicGuard } = usePortfolioStore();
  const dialogRef = useDialogA11y(isPanicGuardOpen, closePanicGuard);

  if (!isPanicGuardOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 motion-reduce:animate-none">
      <div 
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panic-guard-title"
        tabIndex={-1}
        className="relative w-full max-w-xl rounded-2xl border border-[var(--positive)]/20 bg-[var(--card)] p-6 shadow-2xl shadow-black/60 text-foreground overflow-hidden outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--positive)]/10 text-[var(--positive)] border border-[var(--positive)]/20 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h2 id="panic-guard-title" className="text-base font-bold tracking-tight text-foreground">Behavioral Panic Guard (Emotional AI Nudge)</h2>
              <p className="text-xs text-muted-foreground">Historical proof & resilience data to prevent costly panic selling</p>
            </div>
          </div>
          <IconButton
            onClick={closePanicGuard}
            aria-label="Close panic guard dialog"
          >
            <X className="w-5 h-5" />
          </IconButton>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-[var(--positive)]/10 border border-[var(--positive)]/20 text-[var(--positive)] space-y-1.5 font-sans">
            <p className="font-bold text-sm text-[var(--positive)]">Rule #1: 100% of Indian Market Crashes Have Fully Recovered</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              In the history of Indian markets (1992 Harshad Mehta, 2000 Dotcom, 2008 Lehman, 2020 COVID), every single 20%+ market crash was followed by a massive multi-year bull market averaging <strong className="text-foreground font-mono tabular-nums">+48% returns over the subsequent 3 years</strong>.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center font-mono">
            <div className="p-3.5 rounded-xl bg-[var(--background-elevated)] border border-border/70">
              <p className="text-[10px] font-sans font-semibold text-muted-foreground uppercase">2008 Lehman GFC</p>
              <p className="text-[var(--positive)] font-semibold text-sm mt-1 tabular-nums">+104%</p>
              <p className="text-[9px] text-muted-foreground font-sans mt-0.5">2Y Recovery Rally</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--background-elevated)] border border-border/70">
              <p className="text-[10px] font-sans font-semibold text-muted-foreground uppercase">2020 COVID Crash</p>
              <p className="text-[var(--positive)] font-semibold text-sm mt-1 tabular-nums">+132%</p>
              <p className="text-[9px] text-muted-foreground font-sans mt-0.5">18 Mo Bull Run</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--background-elevated)] border border-border/70">
              <p className="text-[10px] font-sans font-semibold text-muted-foreground uppercase">SIP in a Crash</p>
              <p className="text-[var(--positive)] font-semibold text-sm mt-1 tabular-nums">2.4x Alpha</p>
              <p className="text-[9px] text-muted-foreground font-sans mt-0.5">Buys Cheap NAVs</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--background-elevated)] border border-border/70 space-y-2 font-sans">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-[var(--positive)]" strokeWidth={1.75} />
              <span>Recommended Action During Market Volatility:</span>
            </p>
            <ul className="space-y-1.5 text-muted-foreground text-[11px] list-disc list-inside">
              <li><strong className="text-foreground">Do not stop monthly SIPs</strong>: Market downturns allow you to accumulate 25% more mutual fund units at bargain prices.</li>
              <li><strong className="text-foreground">Avoid panic redemptions</strong>: Selling during drawdowns turns paper losses into permanent capital destruction.</li>
              <li><strong className="text-foreground">Rebalance defensively</strong>: Use tax loss harvesting to offset profitable tranches.</li>
            </ul>
          </div>

          <Button onClick={closePanicGuard} className="w-full h-11 text-xs font-bold gap-2 mt-2 bg-[var(--positive)] hover:brightness-110 text-black border-none">
            <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
            <span>I Understand · Keep My Investments Safe</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
