export const WHAT_MSPS_TOLD_US_ABOUT_CLIENT_REPORTING_HTML = `
<p>Handover started with a problem we knew well: client reporting takes too long.</p>
<p>Open the PSA, read a fortnight of tickets, work out what actually happened on each project, turn it into something the client wants to read. It's hours of senior time every week, and it's the least valuable thing on anyone's Friday.</p>
<p>So we built something that does it in under a minute. Connect HaloPSA or ConnectWise, pull the tickets, generate the update. Service reviews, QBR packs, scheduled client emails. That part works and MSPs like it.</p>
<p>But in the conversations that followed, MDs kept steering us somewhere else.</p>
<h2 id="the-thing-owners-actually-worry-about" class="blog-h2-anchor">The thing owners actually worry about</h2>
<p>We'd be halfway through a conversation about reporting cadence and someone would say a version of the same thing.</p>
<p>They weren't losing sleep over report formatting. They were losing sleep over the accounts they weren't looking at.</p>
<p>The client nobody had spoken to since May. The quote that expired without anyone chasing it. The contract coming up for renewal on an account with no activity for four months. The customer who used to accept two quotes a quarter and hasn't accepted one since spring.</p>
<p>None of that shows up in a weekly report. It shows up at the renewal conversation, when it's already too late to do much about it.</p>
<p>And it's not a knowledge problem. Every MD we spoke to knew their top five accounts inside out. The gap was everything past that. Somewhere around thirty or forty clients, holding the whole book in your head stops being possible, and the accounts that slip are rarely the ones you'd expect.</p>
<h2 id="why-prediction-is-the-wrong-job" class="blog-h2-anchor">Why prediction is the wrong job</h2>
<p>Our first instinct was to build churn prediction. Tell the MD which clients are at risk of leaving.</p>
<p>An MSP owner talked us out of it in about ninety seconds.</p>
<p>He gave us three of his own clients. All three had chronic project overruns. All three had patchy communication. All three had been with him for years and placed large orders. On a naive risk model, every one of them lights up red.</p>
<p>He was right, and it changed the design. Relationship strength dominates, and it's invisible to software. Owners know which clients are locked in because the relationship is strong, or because switching would be brutal, or because there's a three-year contract in place. A tool that doesn't know any of that and confidently declares those accounts at risk is a tool people stop opening after the third false alarm.</p>
<h2 id="so-handover-detects-change-not-churn" class="blog-h2-anchor">So Handover detects change, not churn</h2>
<p>The job is narrower and more useful.</p>
<p>Handover reads your PSA and finds the accounts where something has <strong>materially changed</strong>, measured against that client's own history rather than a threshold someone invented. Not "response time over four hours is bad" but "this client's normal first response is 2.1 hours and it's now 5.7."</p>
<p>Then it shows the evidence and lets the owner decide what it means. Because they know their clients and software doesn't.</p>
<h2 id="what-it-looks-at" class="blog-h2-anchor">What it looks at</h2>
<p>Three groups of signals, all from data MSPs already hold.</p>
<p><strong>Commercial.</strong> Quotes that expired without approval, with the value attached. Order value against the client's own average. Purchase frequency against their normal cycle. This turned out to be the strongest set, and it came directly from an MSP owner's suggestion. A quote a client used to accept and now doesn't is closer to real economic behaviour than anything on the service side.</p>
<p><strong>Service.</strong> First response drifting against that client's baseline. Resolution times lengthening. Projects past their target dates. Tickets arriving out of hours far more than usual.</p>
<p><strong>Relationship.</strong> Accounts with an active contract and no activity for months. Clients where a single contact raises everything, so the relationship has one point of failure. Accounts with nobody assigned to them at all.</p>
<p>That last one has been the most uncomfortable finding in every instance we've scanned. Live contracts sitting with nobody responsible for them is more common than most owners expect, and it usually surfaces at renewal.</p>
<h2 id="what-it-wont-do" class="blog-h2-anchor">What it won't do</h2>
<p>It won't tell you a client is leaving. It doesn't know that.</p>
<p>It won't invent a number when the data isn't there. If half your tickets close without a resolution timestamp, Handover says so and suppresses the metric rather than reporting a figure it can't stand behind. That's a finding in its own right. You can't measure SLA performance on tickets that don't record when they closed.</p>
<p>And it won't replace what an owner knows about their own book. It makes sure the easy-to-miss things get seen across the whole portfolio.</p>
<h2 id="the-reporting-hasnt-gone-anywhere" class="blog-h2-anchor">The reporting hasn't gone anywhere</h2>
<p>Everything Handover did before, it still does. Service reviews, QBR packs, scheduled client updates, exports, push-back into the PSA, the white-labelled client portal.</p>
<p>The difference is sequence. Handover now tells you which accounts need a conversation, then writes the pack for the conversation. Reporting is what the team uses every week. The intelligence is why the business buys it.</p>
<h2 id="see-it-on-your-own-data" class="blog-h2-anchor">See it on your own data</h2>
<p>The quickest way to know whether any of this is true for your book is to point it at your PSA.</p>
<p>Connect HaloPSA or ConnectWise with a read-only key and Handover scans your client base and shows what it finds. About a minute, no trial, no card.</p>
<p>If it surfaces nothing you didn't already know, we'd like to hear that too.</p>
`.trim();
