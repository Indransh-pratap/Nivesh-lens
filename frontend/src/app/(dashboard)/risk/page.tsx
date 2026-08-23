"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { HHIConcentrationMeter } from "@/components/dashboard/HHIConcentrationMeter";
import { CorrelationHeatmap } from "@/components/dashboard/CorrelationHeatmap";
import { PeerBenchmarkRadar } from "@/components/dashboard/PeerBenchmarkRadar";

export default function RiskPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="RISK MATRIX"
        title="Risk, HHI & NAV Correlation Matrix"
        description="Mathematical concentration risk, fund co-movement heatmaps & peer baseline benchmarking"
      />

      <HHIConcentrationMeter />
      <CorrelationHeatmap />
      <PeerBenchmarkRadar />
    </div>
  );
}
