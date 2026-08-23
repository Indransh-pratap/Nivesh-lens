"use client";

import React, { useEffect, useState } from "react";
import { Layers, ShieldAlert, Coins, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

const STORAGE_KEY = "nivesh-lens-onboarding-seen";

const STEPS = [
  {
    icon: Layers,
    title: "We look inside your mutual funds too",
    body: "Most apps stop at the fund name. We open every scheme and read its underlying stocks, so you see what you actually own — direct holdings plus what's hidden inside funds.",
  },
  {
    icon: ShieldAlert,
    title: "One honest concentration number",
    body: "Direct stocks and fund look-through are combined into a single exposure figure per company, calculated the way regulators measure market concentration.",
  },
  {
    icon: Coins,
    title: "We flag what's costing you money",
    body: "Regular-plan commissions, overlapping expense ratios, and missing nominees are surfaced with the exact rupee impact — and a button to go fix it.",
  },
];

export function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setVisible(true);
    } catch {
      // localStorage unavailable — skip onboarding silently
    }
  }, []);

  const close = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* no-op */
    }
  };

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-border bg-card shadow-[0_8px_30px_rgba(0,0,0,0.4)] p-6 animate-fade-in-up">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--primary-soft)] border border-primary/25 text-primary flex items-center justify-center">
            <Icon className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <IconButton onClick={close} aria-label="Close onboarding tour" size="sm" className="-mr-1 -mt-1">
            <X className="w-4 h-4" strokeWidth={1.75} />
          </IconButton>
        </div>

        <h3 className="text-[16px] font-semibold text-foreground mt-4">{current.title}</h3>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">{current.body}</p>

        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-primary" : "w-1.5 bg-border-strong"}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isLast && (
              <button onClick={close} className="text-[12.5px] text-muted-foreground hover:text-foreground cursor-pointer px-2">
                Skip
              </button>
            )}
            <Button size="sm" onClick={() => (isLast ? close() : setStep((s) => s + 1))} className="gap-1.5">
              <span>{isLast ? "Get started" : "Next"}</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
