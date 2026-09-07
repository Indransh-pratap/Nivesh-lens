"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { WhatIfFundSwap } from "@/components/phase2/WhatIfFundSwap";
import { FeeBleedCalculator } from "@/components/dashboard/FeeBleedCalculator";

export default function SimulatorPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="PORTFOLIO OPTIMIZATION"
        title="Interactive &ldquo;What-If&rdquo; Fund Swap Simulator"
        description="Simulate replacing mutual funds with lower-expense direct plans to inspect HHI, health score, and fee impact before executing changes."
      />

      <WhatIfFundSwap />
      <FeeBleedCalculator />
    </div>
  );
}

