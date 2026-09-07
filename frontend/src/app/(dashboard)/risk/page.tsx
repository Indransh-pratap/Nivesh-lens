"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { HHIConcentrationMeter } from "@/components/dashboard/HHIConcentrationMeter";
import { CorrelationHeatmap } from "@/components/phase2/CorrelationHeatmap";
import { PeerBenchmarking } from "@/components/phase2/PeerBenchmarking";

export default function RiskPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="RISK & BENCHMARKS"
        title="Risk, HHI & NAV Correlation Matrix"
        description="Deterministic concentration metrics, multi-window fund co-movement heatmaps, and transparent peer baseline benchmarking."
      />

      <HHIConcentrationMeter />
      <PeerBenchmarking />
      <CorrelationHeatmap />
    </div>
  );
}

