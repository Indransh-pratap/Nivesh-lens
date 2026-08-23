"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { MacroSliders } from "@/components/dashboard/MacroSliders";

export default function MacroPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="MACRO SCENARIOS"
        title="Dynamic Macro Risk Sliders"
        description="Simulate future market conditions: crude oil spikes, interest rate shifts & currency depreciation"
      />

      <MacroSliders />
    </div>
  );
}
