"use client";

import { HandoverDemoSection } from "@/components/marketing/HandoverDemoSection";

export function ReportingDemo() {
  return (
    <HandoverDemoSection
      onStartTrial={() => {
        window.location.href = "/onboarding/connect";
      }}
    />
  );
}
