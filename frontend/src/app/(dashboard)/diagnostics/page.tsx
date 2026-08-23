"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { HealthScoreGauge } from "@/components/dashboard/HealthScoreGauge";
import { HHIConcentrationMeter } from "@/components/dashboard/HHIConcentrationMeter";
import { FeeBleedCalculator } from "@/components/dashboard/FeeBleedCalculator";
import { LookThroughTable } from "@/components/dashboard/LookThroughTable";

export default function DiagnosticsPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="DIAGNOSTIC ENGINE"
        title="Core Diagnostic Suite"
        description="Complete mathematical health rating, concentration metrics & fee inefficiency scan"
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <HealthScoreGauge />
        <HHIConcentrationMeter />
      </div>

      <LookThroughTable />
      <FeeBleedCalculator />
    </div>
  );
}
