"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { TaxRebalancer } from "@/components/dashboard/TaxRebalancer";

export default function TaxPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="TAX REBALANCING"
        title="Tax-Aware Rebalancing & Loss Harvesting"
        description="Minimize capital gains taxes under Budget 2024 revised STCG (20%) and LTCG (12.5%) rules"
      />

      <TaxRebalancer />
    </div>
  );
}
