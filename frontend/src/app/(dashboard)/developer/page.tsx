"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiSandbox } from "@/components/dashboard/ApiSandbox";

export default function DeveloperPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="DEVELOPER PORTAL"
        title="API & SDK Licensing Playground"
        description="Explore REST API endpoints, webhooks & embeddable React widgets"
      />

      <ApiSandbox />
    </div>
  );
}
