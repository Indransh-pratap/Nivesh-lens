"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { MacroSliders } from "@/components/dashboard/MacroSliders";
import { WhatsAppAgentMockup } from "@/components/dashboard/WhatsAppAgentMockup";
import { PreBuyOverlapGuard } from "@/components/dashboard/PreBuyOverlapGuard";
import { TaxRebalancer } from "@/components/dashboard/TaxRebalancer";

export default function AdvancedPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="ADVANCED AI ENGINES"
        title="Advanced Simulators & WhatsApp AI"
        description="Dynamic macro stress tests, conversational AI agent & tax-efficient rebalancing"
      />

      <WhatsAppAgentMockup />
      <MacroSliders />
      <PreBuyOverlapGuard />
      <TaxRebalancer />
    </div>
  );
}
