"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { AmfiLookThrough } from "@/components/dashboard/AmfiLookThrough";
import { ConglomerateExposure } from "@/components/dashboard/ConglomerateExposure";
import { PreBuyOverlapGuard } from "@/components/dashboard/PreBuyOverlapGuard";

export default function PortfolioXRayPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="PORTFOLIO X-RAY"
        title="Portfolio X-Ray & True Look-Through"
        description="Scans every mutual fund scheme disclosure to aggregate true company and corporate group exposure"
      />

      {/* AMFI Real Stock Look-Through */}
      <AmfiLookThrough />

      {/* Conglomerate Exposure Breakdown */}
      <ConglomerateExposure />

      {/* Pre-Buy IPO & NFO Guard */}
      <PreBuyOverlapGuard />
    </div>
  );
}
