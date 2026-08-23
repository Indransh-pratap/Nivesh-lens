"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CrashSimulator } from "@/components/dashboard/CrashSimulator";
import { MacroSliders } from "@/components/dashboard/MacroSliders";

export default function StressTesterPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="CRASH TESTER"
        title="Stress-Testing & Crisis Time Machine"
        description="Historical crisis replay and real-time macroeconomic shock parameter simulations"
      />

      <CrashSimulator />
      <MacroSliders />
    </div>
  );
}
