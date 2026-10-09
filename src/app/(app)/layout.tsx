import type { ReactNode } from "react";

import { AppShell, AppShellProvider } from "@/components/app-shell";

export default function AppRouteGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AppShellProvider>
      <AppShell>{children}</AppShell>
    </AppShellProvider>
  );
}
