import { BEST_HALOPSA_REPORTING_TOOLS_HTML } from "@/lib/blog-articles/best-halopsa-reporting-tools-html";

export function countWordsFromHtml(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.split(/\s+/).filter(Boolean).length;
}

const halopsaClientReportingAutomation = `
<p>If you use HaloPSA, your ticket and project data already contains everything you need for a professional client update. The status, the time logged, the notes, the actions, the risks - it's all there. The problem is that turning it into something a client can actually read still takes 30 to 45 minutes per client, every week, manually.</p>
<p>This post covers how to close that gap - including what's possible natively in HaloPSA, where it falls short, and how teams are now automating the full reporting loop end to end.</p>
<h2>What HaloPSA gives you out of the box</h2>
<p>HaloPSA has solid built-in reporting for internal use - ticket volumes, SLA performance, time logged, agent utilisation. These are genuinely useful for operational management.</p>
<p>What it doesn't do natively is generate client-facing communication from that data. There's no built-in feature that reads your open tickets, summarises progress, writes a professional client email, and posts it back to the relevant project. That gap is intentional - HaloPSA is a PSA platform, not a communication tool. But it means the client-facing reporting layer sits entirely outside the platform, handled manually by whoever manages the account.</p>
<h2>The manual workflow most MSP PMs use</h2>
<p>The typical process looks something like this:</p>
<ul>
<li>Open HaloPSA and pull up the relevant client's tickets and projects</li>
<li>Read through notes and status updates to understand current state</li>
<li>Open a blank email or Word document</li>
<li>Write a professional summary from scratch - progress on each item, actions outstanding, risks, next steps</li>
<li>Copy the email into your mail client and send</li>
<li>Optionally, paste a note back into the HaloPSA ticket so there's a record</li>
</ul>
<p>For one client, this takes between 30 and 45 minutes if you're doing it properly. For a PM managing five to eight clients, that's an entire Friday afternoon every week, every week, producing work that is immediately out of date.</p>
<h2>Where automation can help</h2>
<p>The HaloPSA API is well-documented and gives you read access to tickets, projects, notes, time entries, and client data. This means it's technically possible to pull all of that data programmatically and feed it into a generation layer that produces structured outputs automatically.</p>
<p>The key outputs that benefit most from automation:</p>
<ul>
<li>Client email - a professional progress update addressed to the client contact, covering active projects and open actions without naming internal engineers or exposing internal process</li>
<li>Action log - a structured list of outstanding actions with owners, priorities, and due dates</li>
<li>Risk log - flagged risks with impact and mitigation noted</li>
<li>Internal summary - a concise two to three sentence brief for the delivery team or account manager</li>
<li>Status report - a full structured report with RAG status, progress narrative, actions, risks, and next steps</li>
</ul>
<p>Generating these manually takes significant time. Generating them from structured ticket data via API takes seconds.</p>
<h2>The push-back problem</h2>
<p>Even if you generate outputs externally, there's still the problem of getting them back into HaloPSA. If your generated report lives in a separate tool or email thread, your HaloPSA ticket history becomes an incomplete record. The work happened, the update was sent, but the PSA doesn't know about it.</p>
<p>The HaloPSA API supports creating ticket notes programmatically via <code>POST /api/actions</code>. This means it's possible to generate a report and immediately post it back to the relevant ticket as a note - closing the loop entirely. Your HaloPSA history stays current, your client gets a professional update, and nobody had to spend 45 minutes writing it.</p>
<h2>Scheduled reporting</h2>
<p>Once the generation and push-back flow works reliably, the natural next step is scheduling. Rather than triggering generation manually each week, a scheduled job can run on a set day and time - pull the latest HaloPSA data for selected clients, generate outputs, email the report to the PM or directly to the client, and post the note back to the ticket. No manual trigger required.</p>
<p>This is the full automation loop: HaloPSA data in, professional outputs out, note pushed back, report delivered - automatically, every week.</p>
<h2>What this means in practice</h2>
<p>For a PM managing eight clients, automating the weekly reporting workflow reclaims roughly three hours per week. At a conservative internal rate of £50 per hour, that's £150 per week in reclaimed time - or just under £8,000 per year, per PM.</p>
<p>More importantly, it means reporting actually happens consistently. Manual reporting is prone to being deprioritised when delivery work is busy. Automated reporting runs regardless.</p>
<h2>Getting started</h2>
<p>If you use HaloPSA and want to see what automated client reporting looks like on your actual ticket data, Handover connects directly to your HaloPSA instance and generates all five outputs in under 30 seconds. It also supports scheduled weekly reports with automatic push-back to HaloPSA tickets.</p>
<p>You can try it free at <a href="https://gethandover.uk">gethandover.uk</a> - no card required.</p>
`.trim();

const mspProjectManagerReportingProblem = `
<p>Ask any project manager or service delivery manager at an MSP what they do on Friday afternoons and the answer is almost always the same: reports.</p>
<p>Not delivery work. Not client calls. Not strategy. Reports.</p>
<p>Status updates, client emails, action logs, risk summaries - the documentation layer that sits on top of the actual delivery work and has to be produced, every week, from scratch, regardless of how busy the week was.</p>
<p>This post looks at why this happens, why it matters more than most MSPs realise, and what teams are doing to fix it.</p>
<h2>Why reporting takes so long</h2>
<p>The data exists. For any MSP using a PSA platform like HaloPSA or ConnectWise, the ticket status, time logged, notes, actions, and client contacts are all already captured. The problem is that none of it is in a format a client can read.</p>
<p>Converting internal PSA data into a professional client update requires a PM to:</p>
<ul>
<li>Read and synthesise notes from multiple tickets and team members</li>
<li>Identify what's relevant to the client versus what's internal</li>
<li>Write in a tone appropriate for the client relationship</li>
<li>Structure the update logically - progress, actions, risks, next steps</li>
<li>Send it and ideally log it back against the relevant ticket</li>
</ul>
<p>This is skilled communication work. It takes time even when you know the accounts well. For a PM managing six to eight clients, the weekly reporting cycle routinely consumes two to four hours.</p>
<h2>Why it matters beyond the time cost</h2>
<p>The obvious cost is the time itself - hours spent on admin rather than billable delivery work. But there are less visible costs too.</p>
<p><strong>Inconsistency.</strong> Manual reporting quality varies week to week based on how much time the PM has. A busy delivery week produces thinner updates. Clients notice.</p>
<p><strong>Recency bias.</strong> When writing from memory or from a quick scan of notes, PMs naturally weight recent events more heavily than older ones. Important context from earlier in the week gets lost.</p>
<p><strong>Delayed reporting.</strong> When delivery work gets busy, reporting gets pushed. Updates that should go out on Friday go out on Monday, or Tuesday, or not at all. This erodes client trust over time.</p>
<h2>The Friday afternoon problem specifically</h2>
<p>Friday afternoon is structurally the worst time to produce high-quality written communication. Cognitive load is high after a week of delivery work. The urge to close the laptop is real. The reports that get produced at 4pm on a Friday are rarely the best work anyone is capable of.</p>
<p>The irony is that Friday is when clients expect to hear from their MSP - an end-of-week update feels natural and professional. So the reports go out on Friday afternoon regardless, often rushed, often incomplete.</p>
<h2>What actually fixes it</h2>
<p>The teams that have solved this problem haven't done it by becoming better report writers or blocking out more time. They've done it by removing the manual step entirely.</p>
<p>Connecting the PSA to a generation layer means that the data that already exists in HaloPSA or ConnectWise gets turned into a professional client update automatically. The PM reviews, adjusts if needed, and sends - rather than writing from scratch.</p>
<p>The best implementations also push the generated report back into the PSA as a ticket note, so the record stays current without a separate step.</p>
<p>When this works well, the Friday afternoon reporting cycle goes from two to four hours down to twenty minutes. The updates are more consistent because they're generated from the same structured data every week. And they can be scheduled to generate automatically, so reporting happens even when the PM is pulled into delivery work.</p>
<h2>The broader point</h2>
<p>Reporting is not the job. Delivery is the job. Reporting is documentation of the job - necessary, professional, and important for client relationships, but not the work itself.</p>
<p>The hours MSP PMs spend on manual reporting every week are hours that could go to delivery, to client relationships, to new business, or frankly to finishing at a reasonable time on Friday.</p>
<p>The tools to automate this exist now. The question is whether you use them.</p>
<p>If you want to see what automated reporting looks like on your actual PSA data, Handover connects to HaloPSA and generates client updates, action logs, risk registers, and Excel report packs in seconds - with push-back to tickets on Pro. Start with a 14-day free trial at <a href="https://gethandover.uk">gethandover.uk</a> - no card required.</p>
`.trim();

const mspReportingHiddenCost = `
<p>Everyone in an MSP knows that reporting takes time. What's less obvious is everything else it costs.</p>
<p>The conversation about MSP reporting efficiency usually starts and ends with hours - how long does it take to write the weekly updates, and how much of that time could be reclaimed. That's a real and meaningful conversation. But it misses several costs that are harder to quantify and arguably more damaging in the long run.</p>
<h2>The consistency cost</h2>
<p>Manual reporting quality is variable. It depends on who's writing, how much time they have, how well they know the account that week, and how many other things are competing for their attention.</p>
<p>On a calm week, the update is thorough, well-structured, and reflects genuine account knowledge. On a busy week, it's thinner - fewer details, less context, more generic language. Clients read both. Over time, the variability becomes noticeable.</p>
<p>Consistent, high-quality communication is one of the strongest drivers of client retention in MSP relationships. It signals competence and control even when delivery is complex. Inconsistent communication - even when the actual delivery is fine - creates doubt.</p>
<h2>The visibility cost</h2>
<p>Manual reporting is retrospective. The PM writes about what happened last week, not what's happening now. By the time the client reads Friday's update, some of the information is already stale.</p>
<p>More importantly, if the PM is the only person who knows the full picture of a client account, that knowledge lives in their head and in their email outbox. It doesn't necessarily live in the PSA. When the PM is on leave, or leaves the company, or simply has a bad week, the account communication suffers.</p>
<p>Reporting that flows from the PSA - generated directly from ticket data and posted back as a note - means the record is always current, always in the system, and accessible to anyone who needs it.</p>
<h2>The trust cost</h2>
<p>Late or inconsistent client updates are one of the most common sources of client dissatisfaction in managed services. Not because the delivery is bad - often the work is going well - but because the client doesn't know that.</p>
<p>Clients who don't hear from their MSP fill the silence with assumptions, and those assumptions are rarely optimistic. A missed weekly update becomes "they haven't done anything this week." A thin report becomes "they don't really understand our account."</p>
<p>Regular, professional communication is the primary way clients experience the quality of the service they're receiving. If reporting is inconsistent, the service feels inconsistent - regardless of what's actually happening technically.</p>
<h2>The opportunity cost</h2>
<p>A PM spending three hours every Friday on reporting is a PM not spending those three hours on other things. Client relationship development. Proactive account reviews. New project scoping. Or simply finishing at a reasonable time.</p>
<p>The opportunity cost of manual reporting is not just the hours themselves - it's what those hours could have produced instead.</p>
<h2>What good looks like</h2>
<p>The MSP teams that have solved this problem share a few characteristics. Their reporting is consistent because it's generated from the same structured data source every week. It's timely because it's scheduled to run automatically rather than depending on PM availability. And it's integrated - the report exists in the PSA as a ticket note, not just in an email thread somewhere.</p>
<p>This isn't about removing the PM from the communication process. Review, relationship context, and judgement still matter. It's about removing the blank page problem - the hours spent turning raw PSA data into structured written communication from scratch, every week, indefinitely.</p>
<p>If you manage client delivery at an MSP and want to see what this looks like in practice, Handover connects to HaloPSA and generates professional client updates, logs, and Excel packs from your live ticket data in seconds. Start with a 14-day free trial at <a href="https://gethandover.uk">gethandover.uk</a> - no card required.</p>
`.trim();

const handoverHalopsaMarketplace = `
<p>Handover has submitted to the HaloPSA integrations marketplace. Once listed, it will be discoverable directly from within HaloPSA alongside hundreds of other native integrations.</p>
<p>Here's what that means practically for MSP delivery teams using HaloPSA.</p>
<h2>What the integration does</h2>
<p>Handover connects to your HaloPSA instance via API and reads your live ticket and project data. From that data, it generates five professional outputs simultaneously:</p>
<ul>
<li>A client-facing email update, addressed to the client contact, in your tone and with your signature</li>
<li>An action log with owners, priorities, and due dates</li>
<li>A risk log with impact and mitigation notes</li>
<li>An internal summary for the delivery team or account manager</li>
<li>A full status report with RAG status, progress narrative, and next steps</li>
</ul>
<p>Generation takes under 30 seconds from a live HaloPSA data pull.</p>
<h2>Push-back to HaloPSA</h2>
<p>After generating, Handover can post the output directly back into the relevant HaloPSA ticket or project as a note. The ticket history stays current without a separate manual step. No copy-pasting, no tab-switching.</p>
<h2>Scheduled weekly reports</h2>
<p>Handover supports scheduled reporting - set a day and time, select your clients, and Handover runs automatically. It pulls your live HaloPSA data, generates the outputs, emails the report to your inbox, and pushes the note back to the ticket. Every week, without a manual trigger.</p>
<h2>Why it took this specific combination to unlock the marketplace</h2>
<p>The HaloPSA marketplace listing was conditional on two features being live: push-back to HaloPSA as ticket notes, and scheduled weekly reports. Both are now built and in production.</p>
<p>The push-back feature in particular closes the full reporting loop in a way that no other tool does for HaloPSA specifically - pull from HaloPSA, generate, push back. The ticket history stays accurate, the client gets a professional update, and the PM reclaims the hours they were spending doing this manually.</p>
<h2>What's next</h2>
<p>ConnectWise integration is on the roadmap, which will extend the same workflow to the significant portion of the MSP market running ConnectWise Manage. A ConnectWise waitlist is available at <a href="https://gethandover.uk/integrations">gethandover.uk/integrations</a>.</p>
<p>Team plans are also now available - allowing MSP delivery teams to share a HaloPSA connection, pool generation allowances, and manage member permissions from a central admin dashboard.</p>
<h2>Try it</h2>
<p>Handover offers a 14-day free trial at <a href="https://gethandover.uk">gethandover.uk</a> - no card required. Pro plan starts at £29 per month. Team plans from £35 per seat per month.</p>
`.trim();

export const ARTICLE_HTML: Record<string, string> = {
  "best-halopsa-reporting-tools": BEST_HALOPSA_REPORTING_TOOLS_HTML,
  "halopsa-client-reporting-automation": halopsaClientReportingAutomation,
  "msp-project-manager-reporting-problem": mspProjectManagerReportingProblem,
  "msp-reporting-hidden-cost": mspReportingHiddenCost,
  "handover-halopsa-marketplace": handoverHalopsaMarketplace,
};

export const DYNAMIC_ARTICLE_SLUGS = Object.keys(ARTICLE_HTML);

export function getDynamicArticleHtml(slug: string): string | undefined {
  return ARTICLE_HTML[slug];
}
