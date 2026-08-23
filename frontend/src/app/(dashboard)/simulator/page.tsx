"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { WhatIfFundSwap } from "@/components/dashboard/WhatIfFundSwap";
import { FeeBleedCalculator } from "@/components/dashboard/FeeBleedCalculator";

export default function SimulatorPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="STRATEGY SIMULATOR"
        title="Interactive &ldquo;What-If&rdquo; Fund Swap Simulator"
        description="Simulate portfolio optimizations, eliminate overlap, and project fee savings before making actual changes"
      />

      <WhatIfFundSwap />
      <FeeBleedCalculator />
    </div>
  );
}
