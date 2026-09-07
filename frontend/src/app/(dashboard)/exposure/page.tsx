"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { AmfiLookThrough } from "@/components/dashboard/AmfiLookThrough";
import { TrueCompanyExposure } from "@/components/dashboard/TrueCompanyExposure";
import { GroupExposureAlert } from "@/components/phase2/GroupExposureAlert";

export default function ExposurePage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="CONSOLIDATED ANALYSIS"
        title="True Company & Conglomerate Exposure"
        description="Unified look-through across direct equity and mutual funds, detecting single-entity concentration and parent group exposure."
      />

      <AmfiLookThrough />
      <TrueCompanyExposure defaultExpandedFirst />
      <GroupExposureAlert />
    </div>
  );
}

