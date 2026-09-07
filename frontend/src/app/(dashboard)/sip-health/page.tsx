"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SmartSIPHealth } from "@/components/phase2/SmartSIPHealth";

export default function SipHealthPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="RECURRING INVESTMENTS"
        title="Smart SIP Health Check & Simulation"
        description="Audit expense drag, portfolio overlap, and consistency on all active SIP debits with category-matched switch simulation."
      />

      <SmartSIPHealth />
    </div>
  );
}

