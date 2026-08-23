"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { WhatsAppAgentMockup } from "@/components/dashboard/WhatsAppAgentMockup";
import { AdvisorWhiteLabelPDF } from "@/components/dashboard/AdvisorWhiteLabelPDF";

export default function ReportsPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="AUDIT REPORTS & EXPORTS"
        title="Reports & WhatsApp AI Assistant"
        description="Exportable client PDF audits and interactive WhatsApp conversational AI summaries"
      />

      {/* WhatsApp Native AI Agent */}
      <WhatsAppAgentMockup />

      {/* Advisor Co-Branded PDF Audit Generator */}
      <AdvisorWhiteLabelPDF />
    </div>
  );
}
