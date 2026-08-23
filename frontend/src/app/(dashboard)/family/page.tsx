"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FamilyPortfolioView } from "@/components/dashboard/FamilyPortfolioView";

export default function FamilyPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="HOUSEHOLD AGGREGATION"
        title="Family Portfolio Aggregator"
        description="Household-level consolidated wealth tracking across multiple PANs to detect hidden duplication"
      />

      <FamilyPortfolioView />
    </div>
  );
}
