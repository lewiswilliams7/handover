import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { BlogAuthorSection } from "@/components/blog-author-section";
import { BlogBackLink } from "@/components/blog-back-link";
import { BlogRelatedArticles } from "@/components/blog-related-articles";
import { ShareArticleActions } from "../share-article-actions";
import { getPostBySlug, getRelatedPosts, readMinutesFromWordCount } from "@/lib/blog-data";
import { getAllArticleWordCounts, getArticleWordCount } from "@/lib/blog-word-counts";

const SLUG = "connectwise-manage-integration-msp-reporting";

const post = getPostBySlug(SLUG)!;

export const metadata: Metadata = {
  title: "Handover Now Supports ConnectWise Manage: AI-Powered Client Reporting for MSPs | Handover",
  description:
    "Handover now integrates with ConnectWise Manage, joining HaloPSA as a supported PSA. Generate AI-powered client reports from your tickets and projects in under 30 seconds.",
  keywords: [
    "ConnectWise Manage",
    "ConnectWise integration",
    "MSP reporting",
    "MSP client reports",
    "Handover",
    "AI reporting MSP",
  ],
  alternates: {
    canonical: "https://gethandover.uk/blog/connectwise-manage-integration-msp-reporting",
  },
  openGraph: {
    title: "Handover Now Supports ConnectWise Manage: AI-Powered Client Reporting for MSPs",
    description:
      "Handover now integrates with ConnectWise Manage, joining HaloPSA as a supported PSA. Generate AI-powered client reports from your tickets and projects in under 30 seconds.",
    type: "article",
    publishedTime: post.dateISO,
    authors: [post.author],
    images: [
      {
        url: "https://gethandover.uk/opengraph-image",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Handover Now Supports ConnectWise Manage: AI-Powered Client Reporting for MSPs",
    description:
      "ConnectWise Manage joins HaloPSA as a supported PSA. AI-powered client reports from live tickets and projects in under 30 seconds.",
    images: ["https://gethandover.uk/opengraph-image"],
  },
};

export default function ConnectWiseManageIntegrationBlogPage() {
  const readMins = readMinutesFromWordCount(getArticleWordCount(SLUG));
  const related = getRelatedPosts(SLUG, 2);
  const wordMap = getAllArticleWordCounts();
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Handover Now Supports ConnectWise Manage: AI-Powered Client Reporting for MSPs",
    description:
      "Handover is an AI-powered reporting and delivery automation platform for MSP delivery teams. It integrates with HaloPSA and ConnectWise Manage to generate client-ready reports, action logs, and status updates directly from your live PSA data.",
    author: { "@type": "Person", name: "Lewis Williams" },
    publisher: { "@type": "Organization", name: "Handover" },
    datePublished: post.dateISO,
    dateModified: post.dateISO,
    mainEntityOfPage: "https://gethandover.uk/blog/connectwise-manage-integration-msp-reporting",
    image: ["https://gethandover.uk/opengraph-image"],
  };

  return (
    <div className="animate-in fade-in duration-300" style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <div className="mx-auto w-full max-w-[1100px] px-6 py-12 md:px-8 md:py-20">
        <div className="mx-auto max-w-[720px] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <BlogBackLink className="mb-8" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--text-muted)]">
              <span>{post.dateDisplay}</span>
              <span>{post.author}</span>
            </div>
          </div>

          <h1 className="mt-6 mb-2 text-[28px] font-bold leading-tight text-[var(--text-primary)] sm:text-[40px]">
            Handover Now Supports ConnectWise Manage: AI-Powered Client Reporting for MSPs
          </h1>
          <p className="text-sm text-[var(--text-muted)]" aria-label={`Estimated reading time: ${readMins} minutes`}>
            {readMins} min read
          </p>

          <article
            className="mt-0"
            style={{ borderTop: "1px solid var(--border)", marginTop: "1.5rem", paddingTop: "2rem" }}
          >
            <figure className="mb-8 overflow-hidden rounded-[var(--radius-lg)] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm shadow-sm">
              <Image
                src="/images/connectwise.png"
                alt="ConnectWise Manage integration with Handover MSP reporting platform"
                width={1200}
                height={630}
                className="h-auto w-full object-cover object-center"
                priority
                sizes="(max-width: 768px) 100vw, 720px"
              />
            </figure>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              If your MSP runs on ConnectWise Manage, you&apos;ve probably spent more time than you&apos;d like writing
              client reports. Pulling data from tickets, summarising project progress, formatting it into something a
              client actually wants to read - it&apos;s repetitive, it&apos;s manual, and it adds up to hours every week
              that could be spent elsewhere.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">Today, that changes.</p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover now fully supports ConnectWise Manage, joining HaloPSA as our second supported PSA integration.
              MSP delivery teams on ConnectWise can now generate AI-powered client reports directly from their live
              ticket and project data - in under 30 seconds.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What Is Handover?
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover is a reporting and delivery automation platform built specifically for MSP delivery teams. It
              connects to your PSA, pulls your live ticket and project data, and uses AI to generate professional
              client-ready reports, action logs, risk summaries, and status updates - without you having to write a
              single word manually. The same workflow applies whether your data lives in ConnectWise Manage or{" "}
              <Link
                href="/blog/halopsa-integration-msp-reporting"
                className="text-[var(--accent)] underline-offset-2 hover:underline"
              >
                HaloPSA
              </Link>
              .
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              It&apos;s used by MSP service managers, project managers, and account managers who are tired of spending
              Friday afternoons copying and pasting ticket updates into Word documents or email templates.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Why ConnectWise Manage?
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              ConnectWise Manage is one of the most widely used PSA platforms in the MSP industry. A significant portion
              of MSPs globally run their service delivery, project management, and billing through ConnectWise - making
              it one of the most requested integrations since we launched.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              The problem we kept hearing from ConnectWise users was the same one we heard from HaloPSA users: the data is
              all there in the PSA, but getting it into a format that a client can understand still requires significant
              manual effort. Engineers update tickets. Project tasks get completed. But translating that activity into a
              coherent client communication still falls on a person.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover solves that. ConnectWise users can now connect their instance, select the tickets and projects
              they want to report on, and have a full client report generated and ready to send in seconds.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What ConnectWise Users Can Do With Handover
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Once you connect ConnectWise Manage to Handover, you get access to the full platform feature set:
            </p>
            <ul className="mb-5 list-disc space-y-2 pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>
                <strong className="text-[var(--text-primary)]">Import tickets and projects directly from ConnectWise.</strong>{" "}
                Handover pulls your open tickets and active projects from ConnectWise Manage in real time. Select the
                items you want to include in a report and Handover does the rest.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Generate AI-powered client reports.</strong> Using the
                ticket notes, project task progress, and activity from your selected items, Handover generates a
                professional client report that summarises progress, highlights actions required, and flags risks - all
                in plain English that a non-technical client can understand.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Push report notes back to ConnectWise.</strong> Once a
                report is generated, Handover can push a summary note back to the relevant tickets and projects in
                ConnectWise Manage, keeping your PSA updated without any additional manual effort.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Scheduled weekly reports.</strong> Set up automated{" "}
                <Link
                  href="/blog/automated-msp-client-reports"
                  className="text-[var(--accent)] underline-offset-2 hover:underline"
                >
                  scheduled reports
                </Link>{" "}
                that pull from your ConnectWise tickets and projects on a cadence you choose - weekly, fortnightly, or
                monthly. Reports are generated automatically and emailed to your client without you having to lift a
                finger.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Excel export with custom branding.</strong> Every report
                can be exported as a fully formatted Excel workbook with your company branding, ready to attach to a
                client email or present in a service review.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Slack and Teams notifications.</strong> Get notified via
                Slack or Microsoft Teams when a report is generated or when a scheduled report is sent.
              </li>
            </ul>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              HaloPSA and ConnectWise: Full Coverage for Most MSPs
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              With ConnectWise Manage now supported alongside HaloPSA, Handover covers the two most widely used PSA
              platforms in the UK and international MSP market.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              If your MSP uses HaloPSA, you&apos;re covered. If you use ConnectWise Manage, you&apos;re covered. And if
              you&apos;re in the process of migrating between the two - something that happens more often than you&apos;d
              think - Handover works with both simultaneously, so your reporting doesn&apos;t skip a beat during a
              transition.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              This dual PSA support also means that MSPs with multiple service desks or subsidiaries running different PSA
              platforms can bring all their reporting into a single tool.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Who Is Handover Built For?
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover is built for MSP delivery teams - specifically the people who are responsible for client
              communication, service delivery reporting, and project updates.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              That includes service desk managers who need to keep clients informed about open tickets without writing
              individual updates for each one. It includes project managers who need to send weekly progress reports to
              clients on active projects. And it includes account managers who need a clear, professional summary of
              what&apos;s been happening across a client&apos;s account before a QBR or service review call.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              If you&apos;re spending more than 30 minutes a week on client reporting, Handover will save you time. Most
              users report saving between one and three hours per week within the first month.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              How to Get Started With ConnectWise on Handover
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Getting started takes less than five minutes:
            </p>
            <ol className="mb-5 list-decimal space-y-2 pl-6 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              <li>
                Create a free Handover account at{" "}
                <a href="https://gethandover.uk" className="text-[var(--accent)] underline-offset-2 hover:underline">
                  gethandover.uk
                </a>
              </li>
              <li>Navigate to the Integrations page and select ConnectWise Manage</li>
              <li>Enter your ConnectWise server URL, company name, and API credentials</li>
              <li>Select the tickets and projects you want to report on</li>
              <li>Generate your first report</li>
            </ol>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Your first report is free.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              What&apos;s Coming Next
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              ConnectWise Manage is our second PSA integration. We&apos;re actively working on support for additional
              platforms including{" "}
              <Link
                href="/blog/autotask-integration-msp-reporting"
                className="text-[var(--accent)] underline-offset-2 hover:underline"
              >
                Autotask
              </Link>{" "}
              and ServiceNow, with more integrations planned based on demand from our user community.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              If you&apos;re on a platform you&apos;d like to see supported, get in touch. We build based on what MSPs
              actually need.
            </p>

            <h2 className="mt-12 mb-4 text-[20px] font-semibold text-[var(--text-primary)] sm:text-[24px]">
              Try Handover Free Today
            </h2>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              If you&apos;re an MSP running ConnectWise Manage or HaloPSA and you want to stop spending hours on client
              reporting, Handover is the fastest way to get that time back.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Connect your PSA, generate your first report in under 30 seconds, and see what your clients receive.
            </p>
            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Start your free trial at{" "}
              <a href="https://gethandover.uk" className="text-[var(--accent)] underline-offset-2 hover:underline">
                gethandover.uk
              </a>
              . Explore the{" "}
              <Link href="/integrations/connectwise" className="text-[var(--accent)] underline-offset-2 hover:underline">
                ConnectWise integration page
              </Link>{" "}
              for setup details.
            </p>

            <p className="mb-5 text-[16px] leading-[1.8] text-[var(--text-secondary)]">
              Handover is an AI-powered reporting and delivery automation platform for MSP delivery teams. It integrates
              with HaloPSA and ConnectWise Manage to generate client-ready reports, action logs, and status updates
              directly from your live PSA data.
            </p>

            <div className="mt-12 pt-8" style={{ borderTop: "1px solid var(--border)" }}>
              <ShareArticleActions />
            </div>
          </article>

          <BlogRelatedArticles posts={related} wordCountBySlug={wordMap} />
          <BlogAuthorSection />
          <div className="mt-10 border-t border-[var(--border)] pt-8">
            <BlogBackLink />
          </div>
        </div>
      </div>
    </div>
  );
}
