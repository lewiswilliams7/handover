import { redirect } from "next/navigation";

type SignupPageProps = {
  searchParams: Promise<{ trial?: string }>;
};

/** Entry point for marketing CTAs: always send signups to /welcome for explicit plan choice. */
export default async function SignupPage({ searchParams }: SignupPageProps) {
  await searchParams;
  const u = new URL("/auth", "https://example.com");
  u.searchParams.set("tab", "signup");
  u.searchParams.set("returnTo", "/welcome");
  redirect(`${u.pathname}${u.search}`);
}
