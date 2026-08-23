"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DividendCalendar } from "@/components/dashboard/DividendCalendar";

export default function DividendsPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="PASSIVE CASH FLOW"
        title="Dividend & Passive Cash Flow Calendar"
        description="12-Month forward projection of corporate dividend distributions and bank credits"
      />

      <DividendCalendar />
    </div>
  );
}
