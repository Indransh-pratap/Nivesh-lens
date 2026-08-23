"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SIPHealthAuditor } from "@/components/dashboard/SIPHealthAuditor";

export default function SipHealthPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="RECURRING INVESTMENTS"
        title="Smart SIP Health Check & Auto-Switch"
        description="Audit rolling returns and alpha generation on recurring debits with 1-click alternative switching"
      />

      <SIPHealthAuditor />
    </div>
  );
}
