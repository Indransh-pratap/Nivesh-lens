"use client";

import React from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CrashSimulator } from "@/components/phase2/CrashSimulator";
import { MacroSliders } from "@/components/dashboard/MacroSliders";

export default function StressTesterPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="STRESS TESTER"
        title="Crash Stress-Testing & Crisis Time Machine"
        description="Replay historical market drawdowns (COVID 2020, 2008 Lehman, 2022 Bear) directly against your current portfolio positions."
      />

      <CrashSimulator />
      <MacroSliders />
    </div>
  );
}

