"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LookThroughTable } from "@/components/dashboard/LookThroughTable";
import { ConglomerateExposure } from "@/components/dashboard/ConglomerateExposure";
import { FeeBleedCalculator } from "@/components/dashboard/FeeBleedCalculator";

export default function PortfolioHubPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="PORTFOLIO INTELLIGENCE"
        title="Portfolio Overview & Look-Through"
        description="Detailed inspection of direct stocks, underlying mutual fund exposures & expense efficiencies"
      />

      <LookThroughTable />
      <ConglomerateExposure />
      <FeeBleedCalculator />
    </div>
  );
}
