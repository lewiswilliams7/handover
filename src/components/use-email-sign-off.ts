"use client";

import { useAppShell } from "@/components/app-shell";
import { buildClientEmailSignOffBlock } from "@/lib/client-email-signature";

/** The one sign-off from Settings → Profile, for any email drafted to a client. */
export function useEmailSignOff(): string {
  const { profileForm } = useAppShell();
  const name =
    [profileForm.profileFirstName, profileForm.profileLastName].map((part) => part.trim()).filter(Boolean).join(" ") ||
    profileForm.profileDisplayName.trim();
  return buildClientEmailSignOffBlock(
    profileForm.signatureOverride,
    name,
    profileForm.profileJobTitle,
    profileForm.profileCompanyName,
  );
}
