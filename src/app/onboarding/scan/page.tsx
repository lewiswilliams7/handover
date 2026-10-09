import type { Metadata } from "next";

import { ScanProgress } from "./scan-progress";

export const metadata: Metadata = {
  title: "Scanning your PSA | Handover",
  description: "Your private Handover PSA scan is running.",
};

export default function ScanPage() {
  return <ScanProgress />;
}
