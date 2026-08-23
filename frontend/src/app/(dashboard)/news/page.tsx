"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { NewsImpactFeed } from "@/components/dashboard/NewsImpactFeed";

export default function NewsPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="PORTFOLIO INTELLIGENCE"
        title="Real-Time News & Net Worth Impact"
        description="Holding-specific filtered news with quantified % impact calculations on your current positions"
      />

      <NewsImpactFeed />
    </div>
  );
}
