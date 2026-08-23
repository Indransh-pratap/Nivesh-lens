"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { NomineeAuditor } from "@/components/dashboard/NomineeAuditor";

export default function AuditPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="COMPLIANCE & LEGAL"
        title="Nominee & Unclaimed Wealth Audit"
        description="Scans all Demat folios, mutual funds, and bank FDs to ensure legal succession safety"
      />

      <NomineeAuditor />
    </div>
  );
}
