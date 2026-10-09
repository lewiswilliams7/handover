import type { Metadata } from "next";

import { ScanConnectForm } from "./scan-connect-form";

export const metadata: Metadata = {
  title: "Connect your PSA | Handover",
  description: "Connect a read-only PSA application to run your Handover scan.",
};

export default function ConnectPage() {
  return <ScanConnectForm />;
}
