import type { Metadata } from "next";
import { redirect } from "next/navigation";

import PageTransition from "@/components/PageTransition";
import { HomeClientLoader } from "@/components/home-client-loader";
import { createServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Handover - See Which Clients Are Slipping, in Pounds",
  description:
    "Handover connects to HaloPSA or ConnectWise, puts a pound value on every client whose service or relationship has changed, and replays the clients you have lost to show it would have warned you. Built for MSPs.",
  alternates: {
    canonical: "https://gethandover.uk",
  },
};

/** Query params that mean "/" was opened on purpose for an in-app view. */
const IN_APP_PARAMS = ["view", "openSettings", "success", "tab", "welcome"] as const;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const opensInAppView = IN_APP_PARAMS.some((key) => {
    const value = params[key];
    // The retired Overview dashboard is never a destination.
    if (key === "view") return typeof value === "string" && value !== "overview";
    return value != null;
  });
  if (!opensInAppView) {
    // Signed-in users land on Revenue at Risk, decided on the server so the old
    // Overview never flashes or rewrites the address bar first.
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/attention");
  }

  return (
    <PageTransition>
      <main className="marketing-aurora overflow-x-hidden">
        <HomeClientLoader />
      </main>
    </PageTransition>
  );
}
