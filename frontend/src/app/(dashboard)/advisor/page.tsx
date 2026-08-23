"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdvisorWhiteLabelPDF } from "@/components/dashboard/AdvisorWhiteLabelPDF";

export default function AdvisorPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="ADVISOR PORTAL"
        title="Advisor & IFA White-Label Portal"
        description="Co-brand and generate 1-click comprehensive client diagnostic audit PDFs with your firm logo & ARN"
      />

      <AdvisorWhiteLabelPDF />
    </div>
  );
}
