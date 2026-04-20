import { redirect } from "next/navigation";

import { parseTrialQueryParam } from "@/lib/auth/trial-query";

type SignupPageProps = {
  searchParams: Promise<{ trial?: string }>;
};

/** Entry point for marketing CTAs: `/signup?trial=professional` → auth with post-login redirect to `/` + trial query. */
export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const trial = parseTrialQueryParam(params.trial);
  const u = new URL("/auth", "https://example.com");
  u.searchParams.set("tab", "signup");
  u.searchParams.set("returnTo", "/");
  if (trial) u.searchParams.set("trial", trial);
  redirect(`${u.pathname}${u.search}`);
}
