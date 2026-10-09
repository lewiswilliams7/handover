import type { Metadata } from "next";

import { ScanResults } from "./scan-results";

export const metadata: Metadata = {
  title: "Your PSA scan | Handover",
  description: "A private summary of your PSA delivery scan.",
};

export default function ResultsPage() {
  return <ScanResults />;
}
