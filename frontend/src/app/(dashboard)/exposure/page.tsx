"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LookThroughTable } from "@/components/dashboard/LookThroughTable";
import { ConglomerateExposure } from "@/components/dashboard/ConglomerateExposure";

export default function ExposurePage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="CONSOLIDATED ANALYSIS"
        title="True Company & Conglomerate Exposure"
        description="Detects double-dipping and aggregated corporate house concentration"
      />

      <LookThroughTable />
      <ConglomerateExposure />
    </div>
  );
}
