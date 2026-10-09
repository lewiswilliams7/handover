# Handover: full product walkthrough audit (for Cursor)

Paste everything below the line into Cursor Agent, with the browser tool enabled and the dev server running (`npm run dev`). This is an **audit only**. Do not change any code. Produce the report described at the end and save it as `docs/walkthrough-findings.md`.

---

## Your role

You are a senior product designer and QA lead reviewing Handover before it is shown to MSP owners who will pay £499 a month. Your job is to walk every screen a prospect or customer can reach, as that person would, and record everything that would make the product feel unfinished, confusing, slow, inconsistent or untrustworthy.

Be specific and blunt. "Spacing feels off" is not a finding. "On /pricing at 390px, the Buy now button text wraps to two lines and touches the card edge" is.

## What Handover is now (read this first)

Handover connects to HaloPSA or ConnectWise Manage (read-only) and protects an MSP's recurring revenue. The product is one loop:

1. **Revenue at Risk™**: every client whose service or relationship has changed against its own history, ranked by the annual revenue it holds. Lives at `/attention`.
2. **Churn Replay™**: rewinds the PSA to before each client the MSP lost and shows whether Handover would have warned them, and how early. Shown on the free scan results (`/onboarding/results`) and at `/attention?tab=replay`.
3. **Save Plays™**: on every flag, the steps to take and an editable email to the client's decision-maker. Marking a play done records it.
4. **Saved Revenue**: in `/attention?tab=history`. The annual value of clients where a flag was acted on and later cleared.
5. **Proof for clients**: service reviews, QBR packs, scheduled reports, approvals, client portal.

The buyer is the MSP owner or MD. The champion is the head of service delivery. Pricing is one plan: £499 a month or £4,990 a year. The free entry point is the PSA scan, not a trial.

Brand and copy rules to check everything against:

- Navy background with a cyan/light-blue accent. No yellow or amber as a brand colour (amber is only for warnings).
- British spelling (organisation, colour, analyse, prioritise).
- **No em dashes (—) anywhere in user-facing copy.**
- "Revenue at Risk™", "Churn Replay™", "Save Plays™" and "Handover Client Intelligence™" carry ™ in marketing. Inside the app, plain names are fine.
- One primary call to action across marketing: **"Run your free scan"**, linking to `/onboarding/connect`.
- Company content uses "we", not "I". The exception is the founder's line about the 30-day launch on pricing.

## How to work

1. Work through every route in the inventory below, in order.
2. Check each page at **1440px**, **1024px** and **390px** wide, in **dark** and **light** theme where a theme toggle exists.
3. Use the keyboard alone on every interactive page (Tab, Shift+Tab, Enter, Space, Escape). Note anything you cannot reach, or any focus you cannot see.
4. Open the browser console on every page. Record every error and warning, including hydration warnings.
5. Click every link and button. Record anything that 404s, does nothing, goes somewhere unexpected, or opens without a clear way back.
6. For the signed-in app, use a test account with a HaloPSA connection. If you do not have one, use the demo or sample data the app offers, and say which you used.
7. Time anything that takes more than 1 second to respond: page loads, the scan, refresh, tab switches, exports. Record the time.
8. Take a screenshot for every High or Critical finding and save it in `docs/walkthrough-screenshots/`.

## Route inventory

### Public marketing

`/`, `/pricing`, `/pricing/starter-programme`, `/pricing/enterprise`, `/features`, `/features/revenue-at-risk`, `/features/churn-replay`, `/features/save-plays`, `/features/client-intelligence`, every other `/features/*`, `/solutions`, every `/solutions/*`, `/integrations` and every `/integrations/*`, `/compare` and every `/compare/*`, `/blog` and at least five posts, `/case-studies`, `/about`, `/partners` and sub-pages, `/security`, `/roadmap`, `/demo`, `/contact`, `/contact/sales`, `/onboarding-programme`, `/privacy`, `/terms`.

Also confirm `/integrations/zapier` redirects to `/integrations`.

### Free scan funnel (the most important flow; go slowly)

1. `/onboarding/connect`: enter PSA credentials. Check the wording explains read-only access and what is read.
2. `/onboarding/scan`: progress screen. Is it clear what is happening and how long it takes?
3. `/onboarding/results` as an **anonymous** visitor: headline, Revenue at Risk, Churn Replay (names hidden), findings preview, the claim form.
4. Claim the scan by setting a password. Then check `/onboarding/results` as a **signed-in user without a paid plan**, and again **with a paid plan**.
5. Check every message a prospect could see if the PSA returns no clients, no findings, no contracts, or an error.

### Signed-in app

- Sidebar: **Protect** (Revenue at Risk, Churn Replay, Clients, Delivery health) and **Prove** (Reports, Scheduled, Approvals, Client portal, Quick update), then Configuration. Check active states, the collapsed sidebar, the pinned sidebar and the mobile drawer.
- `/attention` (This week tab): Revenue at Risk block, filters, finding cards, "Why am I seeing this?", evidence links, **Save Play** (open it, edit the email, send to a test address, copy, open in email app, mark play done), Add to QBR, Normal for this client, Mark as handled, Refresh.
- `/attention?tab=history`: Saved Revenue, filters, client selector.
- `/attention?tab=replay`: Churn Replay panel, "What fired", "How the replay works".
- `/?view=client-intelligence`, `/?view=delivery`, `/?view=reports`, `/?view=scheduled`, `/?view=approvals`, `/?view=organisation`, `/?view=generate`, `/?view=configuration`, `/?view=changelog`.
- Settings overlay: every tab (profile, billing, referrals, outputs and style, appearance, privacy), and sign out.
- The product tour: trigger it and check every step points at something real.
- Client portal: `/portal/[mspSlug]/[clientSlug]` as an end client would see it.
- Billing: the upgrade path from an unpaid account through to Stripe checkout and back to `/checkout/success`.

## What to look for on every screen

**Story and copy**
- Does the page say clearly, in the first few seconds, what Handover does for an MSP owner?
- Any leftover reporting-first or time-saving positioning ("hours saved", "your engineers write nothing", "generate in seconds") presented as the main benefit.
- Old plan names (Starter £49, Growth £99, Team, Pro, Professional) or old prices anywhere.
- Claims the product cannot back up (for example sentiment analysis, reopen rates, invented statistics or customer numbers).
- Em dashes, American spelling, inconsistent ™ use, inconsistent capitalisation of feature names, "Attention" used where it should now say "Revenue at Risk".
- Calls to action that are not "Run your free scan" or "Book a walkthrough" without a good reason.

**Design and consistency**
- Colours, radii, borders, shadows and type sizes that do not match the rest of the product.
- Text that is unreadable in light theme (white text on white backgrounds is a known risk).
- Layout breaks, overflow, horizontal scroll, clipped text, overlapping elements at any width.
- Empty, loading and error states: are they designed, helpful, and in the product's voice?
- Dead UI: disabled buttons with no explanation, links to "coming soon", placeholder text, lorem ipsum, debug pages.

**Speed and feel**
- Anything slower than 1 second without feedback.
- Layout shift as content loads.
- Animations that feel slow, janky, or that ignore reduced-motion settings.

**Accessibility**
- Contrast below WCAG AA, missing labels on inputs and icon buttons, images without alt text, focus traps, and controls you cannot reach by keyboard.

**Trust**
- Anything that would make an MSP owner doubt the numbers: totals that do not add up, the same figure shown differently in two places, unexplained scores, unlabelled currency or periods.
- Security or privacy wording that is vague about what is read from the PSA and what is stored.

## Severity

- **Critical**: blocks the scan, signup, payment or a core flow, shows wrong numbers, or leaks data.
- **High**: a prospect would notice and trust the product less (broken layout, dead link, wrong or old copy on a key page, console error on a key page).
- **Medium**: inconsistent or rough but not blocking.
- **Low**: polish.

## Report format

Save as `docs/walkthrough-findings.md`.

1. **Summary**: five lines at most. The overall state, the three biggest problems, and whether you would show this to a paying MSP owner today.
2. **Findings table**, sorted by severity, then by route:

| ID | Severity | Route | Width / theme | What is wrong | Steps to reproduce | Expected | Suggested fix | Screenshot |
|---|---|---|---|---|---|---|---|---|

3. **Console errors**: one row per unique error, with the routes where it appears.
4. **Copy issues**: a separate table with the exact current text and suggested replacement text, following the brand and copy rules above.
5. **Performance**: every interaction over 1 second, with the measured time.
6. **What is working well**: short, so it is kept when fixing the rest.

Do not fix anything. The fixes will be planned from this report and made one small, tested change at a time.
