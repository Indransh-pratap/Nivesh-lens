"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiSandbox } from "@/components/dashboard/ApiSandbox";

export default function ApiSdkPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="API & SDK LICENSING"
        title="API & SDK Widget Licensing"
        description="Integrate the complete Portfolio X-Ray & diagnostic engine into your own Wealthtech products"
      />

      <ApiSandbox />
    </div>
  );
}
