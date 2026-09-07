"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { CrashSimulator } from "@/components/phase2/CrashSimulator";
import { WhatIfFundSwap } from "@/components/phase2/WhatIfFundSwap";
import { CorrelationHeatmap } from "@/components/phase2/CorrelationHeatmap";
import { PeerBenchmarking } from "@/components/phase2/PeerBenchmarking";
import { GroupExposureAlert } from "@/components/phase2/GroupExposureAlert";
import { SmartSIPHealth } from "@/components/phase2/SmartSIPHealth";
import {
  Building2,
  Coins,
  History,
  Layers,
  Scale,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "stress" | "swap" | "correlation" | "benchmark" | "group" | "sip";

const TABS: Array<{
  id: Tab;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  description: string;
  badge?: string;
}> = [
  {
    id: "stress",
    label: "Crash Replay",
    icon: History,
    description: "Replay historical market crashes against your current portfolio.",
  },
  {
    id: "swap",
    label: "What-If Fund Swap",
    icon: Sparkles,
    description: "Simulate replacing a mutual fund to see metric impact.",
  },
  {
    id: "correlation",
    label: "Fund Correlation",
    icon: Layers,
    description: "Identify funds that have historically moved together.",
  },
  {
    id: "benchmark",
    label: "Peer Benchmarking",
    icon: Scale,
    description: "Compare your portfolio concentration and asset allocation against reference market baselines.",
  },
  {
    id: "group",
    label: "Conglomerate Exposure",
    icon: Building2,
    description: "Analyze combined direct equity and indirect mutual fund exposure across corporate parent groups.",
  },
  {
    id: "sip",
    label: "Smart SIP Health",
    icon: Coins,
    description: "Evaluate SIP cadence, expense drag, and simulate category-matched alternatives.",
  },
];

function isValidTab(s: string | null): s is Tab {
  return s === "stress" || s === "swap" || s === "correlation"
    || s === "benchmark" || s === "group" || s === "sip";
}

export default function Phase2Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: Tab = isValidTab(tabParam) ? tabParam : "stress";
  const [tab, setTab] = useState<Tab>(initialTab);

  // Sync state when URL changes
  useEffect(() => {
    const t = searchParams.get("tab");
    if (isValidTab(t) && t !== tab) {
      setTab(t);
    }
  }, [searchParams, tab]);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="SIMULATION STUDIO"
        title="Portfolio Diagnostics, Stress & Simulation"
        description="Institutional stress testing, peer baseline benchmarking, corporate conglomerate exposure, and Smart SIP optimization."
      />

      <div className="border-b border-border pb-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border whitespace-nowrap transition-all",
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2 px-1">
          {TABS.find((t) => t.id === tab)?.description}
        </p>
      </div>

      {tab === "stress" && <CrashSimulator />}
      {tab === "swap" && <WhatIfFundSwap />}
      {tab === "correlation" && <CorrelationHeatmap />}
      {tab === "benchmark" && <PeerBenchmarking />}
      {tab === "group" && <GroupExposureAlert />}
      {tab === "sip" && <SmartSIPHealth />}
    </div>
  );
}

