import { redirect } from "next/navigation";

type SignupPageProps = {
  searchParams: Promise<{ trial?: string }>;
};

/** Compatibility entry point for old marketing links; the free PSA scan is the signup path. */
export default async function SignupPage({ searchParams }: SignupPageProps) {
  await searchParams;
  const u = new URL("/auth", "https://example.com");
  u.searchParams.set("tab", "signup");
  u.searchParams.set("returnTo", "/onboarding/connect");
  redirect(`${u.pathname}${u.search}`);
}
