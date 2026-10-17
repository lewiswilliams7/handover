/** HTML body for /blog/how-to-calculate-msp-revenue-at-risk (dynamic article). */
export const MSP_REVENUE_AT_RISK_HTML = `
<p>Revenue at risk is the yearly recurring revenue held by clients who are showing warning signs. It turns a vague feeling ("a few accounts seem quiet") into one number you can track week to week and bring to a leadership meeting.</p>
<p>Here is how to work it out, a worked example, and the mistakes that make the number misleading.</p>
<h2 id="definition" class="blog-h2-anchor">The definition</h2>
<p><strong>Revenue at risk = the sum of annual recurring value for every client with at least one open warning sign.</strong></p>
<p>Three rules keep it honest:</p>
<ul>
<li><strong>Count each client once.</strong> A client with three warning signs is still one client. Do not add its value three times.</li>
<li><strong>Use recurring value only.</strong> Monthly contract or recurring invoice value, multiplied by 12. Leave out one-off projects.</li>
<li><strong>Only count real warning signs.</strong> Setup gaps, such as tickets with no named owner or missing close dates, are worth fixing, but they are true for plenty of happy clients. Keep them out of the total.</li>
</ul>
<h2 id="worked-example" class="blog-h2-anchor">A worked example</h2>
<p>Say three of your clients show a warning sign this week:</p>
<div class="blog-table-scroll"><table>
<thead><tr><th>Client</th><th>Warning sign</th><th>Monthly value</th><th>Annual value</th></tr></thead>
<tbody>
<tr><td>Westfield Manufacturing</td><td>First response slowed from 1 hr to 5 hr</td><td>£3,900</td><td>£46,800</td></tr>
<tr><td>Carter &amp; Lowe Solicitors</td><td>Ticket activity fell by two thirds</td><td>£2,600</td><td>£31,200</td></tr>
<tr><td>Ashby Primary Trust</td><td>Open backlog doubled in three months</td><td>£1,900</td><td>£22,800</td></tr>
</tbody></table></div>
<p>Revenue at risk is £46,800 + £31,200 + £22,800 = <strong>£100,800 a year</strong>.</p>
<p>If Westfield also had a contract ending in 60 days, it would still count once. The renewal is a reason to act sooner, not a reason to double the number.</p>
<h2 id="what-counts" class="blog-h2-anchor">What counts as a warning sign</h2>
<p>The signs that hold up best are changes against each client's own history:</p>
<ul>
<li>Ticket volume well below the client's usual range (a busy client going quiet)</li>
<li>First response or resolution times well above the client's usual range</li>
<li>An open backlog growing month on month</li>
<li>A sharp rise in tickets raised out of hours</li>
<li>No activity at all on an active contract</li>
</ul>
<p>We wrote up all seven, with where to find each one in your PSA, in <a href="/blog/msp-client-churn-warning-signs">the warning signs guide</a>.</p>
<h2 id="clients-without-value" class="blog-h2-anchor">Clients with no value in the PSA</h2>
<p>Most PSAs have a few clients with no contract value recorded. Do not guess. List them alongside the total ("£100,800 a year, plus two clients with no value recorded") and add the value by hand once. A number with a known gap is more useful than a number that quietly ignores it.</p>
<h2 id="track-it" class="blog-h2-anchor">Track the trend, not just the total</h2>
<p>The figure on its own matters less than which way it is moving. A falling number means your team is acting on warnings and clients are recovering. A rising one means signs are appearing faster than anyone is dealing with them.</p>
<p>The other side of the ledger is <strong>saved revenue</strong>: clients you acted on whose warning signs then cleared, and who are still with you, counted at their annual value. Over a year, saved revenue is the clearest measure of whether your client care is working.</p>
<h2 id="mistakes" class="blog-h2-anchor">Common mistakes</h2>
<ul>
<li><strong>Fixed thresholds for everyone.</strong> "Fewer than five tickets a month" flags every small client and misses a big one that dropped from forty to twelve.</li>
<li><strong>Counting housekeeping.</strong> Missing timestamps inflate the number and make it easy to dismiss.</li>
<li><strong>Treating it as a prediction.</strong> A warning sign is a reason to look, not proof a client is leaving. Say that whenever you share the number.</li>
</ul>
<h2 id="automate" class="blog-h2-anchor">Working it out automatically</h2>
<p>Handover calculates revenue at risk from HaloPSA or ConnectWise every week, using each client's own normal range, counting each client once and leaving housekeeping out. <a href="/features/revenue-at-risk">See how it works</a>, or <a href="/onboarding/connect">run the free scan</a> to see your own figure in about a minute.</p>
`.trim();
