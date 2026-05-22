import { Suspense } from "react";

import { PortalInvitePage } from "@/components/portal-customer/portal-invite-page";

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--text-secondary)]">Loading…</div>}>
      <PortalInvitePage />
    </Suspense>
  );
}
