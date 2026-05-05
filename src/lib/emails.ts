import { Resend } from "resend";

import { getAppOrigin } from "@/lib/app-url";
import { buildHandoverResendFromHeader } from "@/lib/resend-from-header";

const HEADER_BG = "#0f172a";
const ACCENT = "#38bdf8";
const BODY_TEXT = "#334155";
const MUTED = "#64748b";

function getResend(): Resend | null {
  const key =
    process.env.RESEND_API_KEY?.trim() ||
    /** Legacy / typo-tolerant (some env files use lowercase `key`) */
    process.env.RESEND_API_key?.trim();
  if (!key) {
    console.warn(
      "[emails] RESEND_API_KEY is not set; skipping send. Add RESEND_API_KEY to .env.local.",
    );
    return null;
  }
  return new Resend(key);
}

function defaultTransactionalFrom(): string {
  return buildHandoverResendFromHeader(null);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function emailShell(opts: {
  bodyHtml: string;
  ctaLabel: string;
  ctaHref: string;
  footerNote: string;
}): string {
  const origin = getAppOrigin();
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || origin}/icon2.png`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:${HEADER_BG};padding:22px 26px;">
              <img
                src="${escapeAttr(logoUrl)}"
                alt="Handover"
                style="max-height:32px; width:auto; object-fit:contain; display:block;"
              />
            </td>
          </tr>
          <tr>
            <td style="padding:26px 26px 8px;color:${BODY_TEXT};font-size:15px;line-height:1.65;">
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 26px 26px;">
              <a href="${escapeAttr(opts.ctaHref)}" style="display:inline-block;padding:12px 22px;background:${ACCENT};color:#0f172a;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">${escapeHtml(opts.ctaLabel)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 26px;border-top:1px solid #e2e8f0;color:${MUTED};font-size:12px;line-height:1.5;">
              ${opts.footerNote}
            </td>
          </tr>
          <tr>
            <td style="padding:0 26px 20px;color:${MUTED};font-size:11px;line-height:1.4;">
              ${escapeHtml(origin)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Founder / Lewis tone — must be a verified sender/domain in Resend. */
const FOUNDER_WELCOME_FROM = "Lewis @ Handover <hello@gethandover.uk>";
const CALENDLY_15_URL = "https://calendly.com/gethandover/30min";

function formatLongDateUtc(iso: string): string {
  const d = new Date(iso);
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : iso;
}

/** Light branded template with one primary CTA and optional secondary (outline). */
function emailShellLightTwoCtas(opts: {
  bodyHtml: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  footerNote: string;
}): string {
  const origin = getAppOrigin();
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || origin}/icon2.png`;
  const secondaryBlock = opts.secondary
    ? `<a href="${escapeAttr(opts.secondary.href)}" style="display:inline-block;margin-left:10px;padding:12px 18px;background:#f1f5f9;color:#0f172a;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;border:1px solid #cbd5e1;">${escapeHtml(opts.secondary.label)}</a>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:${HEADER_BG};padding:22px 26px;">
              <img src="${escapeAttr(logoUrl)}" alt="Handover" style="max-height:32px; width:auto; object-fit:contain; display:block;"/>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 26px 8px;color:${BODY_TEXT};font-size:15px;line-height:1.65;">
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 26px 26px;">
              <a href="${escapeAttr(opts.primary.href)}" style="display:inline-block;padding:12px 22px;background:${ACCENT};color:#0f172a;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">${escapeHtml(opts.primary.label)}</a>
              ${secondaryBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 26px;border-top:1px solid #e2e8f0;color:${MUTED};font-size:12px;line-height:1.5;">
              ${opts.footerNote}
            </td>
          </tr>
          <tr>
            <td style="padding:0 26px 20px;color:${MUTED};font-size:11px;line-height:1.4;">
              ${escapeHtml(origin)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Trial day 1 — also invoked from POST /api/trial/start. */
export async function sendTrialWelcomeEmail(opts: {
  to: string;
  trialEndsAtIso: string;
  planLabel: string;
  firstName?: string | null;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[emails] sendTrialWelcomeEmail: Resend client unavailable (missing API key).");
    return;
  }

  const origin = getAppOrigin();
  const integrationsUrl = `${origin}/integrations`;
  const safePlan = escapeHtml(opts.planLabel.trim() || "Professional");
  const endLong = formatLongDateUtc(opts.trialEndsAtIso);
  const safeFirst = escapeHtml(opts.firstName?.trim() || "there");

  const bodyHtml = `
<p style="margin:0 0 16px;">Hi ${safeFirst},</p>
<p style="margin:0 0 16px;">Your free trial is now active. You have full access to everything in the ${safePlan} plan for the next 14 days.</p>
<p style="margin:0 0 12px;font-weight:600;">Here is what to do in your first session to get the most out of it:</p>
<ul style="margin:0 0 16px;padding-left:20px;">
  <li style="margin-bottom:8px;">Connect your PSA &mdash; HaloPSA or ConnectWise &mdash; on the <a href="${escapeAttr(integrationsUrl)}" style="color:${ACCENT};font-weight:600;">integrations page</a></li>
  <li style="margin-bottom:8px;">Generate your first client report in under 30 seconds</li>
  <li style="margin-bottom:8px;">Try the QBR pack generator and export it as a PowerPoint</li>
  <li style="margin-bottom:8px;">Set up a scheduled report so your first automated client update goes out this week</li>
</ul>
<p style="margin:0 0 16px;">If you need any help at any point reply to this email directly.</p>
<p style="margin:0 0 16px;">Your trial ends on ${escapeHtml(endLong)}.</p>
<p style="margin:0;">Lewis<br/>Handover</p>`;

  const html = emailShell({
    bodyHtml,
    ctaLabel: "Open Handover",
    ctaHref: origin,
    footerNote:
      "You're receiving this because you started a Handover trial. Reply directly to this email with any questions.",
  });

  console.log("[emails] sendTrialWelcomeEmail: calling Resend", {
    toDomain: opts.to.includes("@") ? opts.to.split("@")[1] : "(redacted)",
    from: FOUNDER_WELCOME_FROM,
  });
  const { error } = await resend.emails.send({
    from: FOUNDER_WELCOME_FROM,
    to: opts.to,
    subject: "Your 14-day Handover trial has started",
    html,
  });
  console.log("[emails] sendTrialWelcomeEmail: Resend returned", { ok: !error });

  if (error) {
    console.error("[emails] sendTrialWelcomeEmail:", error);
    throw new Error(error.message);
  }
}

/** Free/basic drip — immediate welcome after signup confirmation (replaces legacy welcome). */
export async function sendWelcomeEmail(to: string, firstName: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[emails] sendWelcomeEmail: Resend client unavailable (missing API key).");
    return;
  }

  const safeName = escapeHtml(firstName.trim() || "there");
  const origin = getAppOrigin();
  const integrationsUrl = `${origin}/integrations`;
  const trialUrl = `${origin}/signup?trial=professional`;

  const bodyHtml = `
<p style="margin:0 0 16px;">Hi ${safeName},</p>
<p style="margin:0 0 16px;">Welcome to Handover.</p>
<p style="margin:0 0 16px;">You are one PSA connection away from generating your first client report in 30 seconds.</p>
<p style="margin:0 0 12px;font-weight:600;">Here is what to do next:</p>
<ul style="margin:0 0 16px;padding-left:20px;">
  <li style="margin-bottom:8px;">Connect HaloPSA or ConnectWise on the <a href="${escapeAttr(integrationsUrl)}" style="color:${ACCENT};font-weight:600;">integrations page</a></li>
  <li style="margin-bottom:8px;">Select your tickets and projects</li>
  <li style="margin-bottom:8px;">Generate your first report</li>
</ul>
<p style="margin:0 0 16px;">Your 14-day free trial gives you full access to everything including the QBR pack generator, scheduled reports, and all export formats.</p>
<p style="margin:0 0 16px;">If you have any questions reply to this email directly.</p>
<p style="margin:0;">Lewis<br/>Founder, Handover</p>`;

  const html = emailShell({
    bodyHtml,
    ctaLabel: "Start your free trial",
    ctaHref: trialUrl,
    footerNote:
      "You're receiving this because you signed up to Handover. Reply directly to this email with any questions.",
  });

  console.log("[emails] sendWelcomeEmail: calling Resend", {
    toDomain: to.includes("@") ? to.split("@")[1] : "(redacted)",
    from: FOUNDER_WELCOME_FROM,
  });
  const { error } = await resend.emails.send({
    from: FOUNDER_WELCOME_FROM,
    to,
    subject: "Your Handover account is ready",
    html,
  });
  console.log("[emails] sendWelcomeEmail: Resend returned", { ok: !error });

  if (error) {
    console.error("[emails] sendWelcomeEmail:", error);
    throw new Error(error.message);
  }
}

/** Custom verification link (Supabase confirm email disabled; sent via Resend). */
export async function sendCustomEmailVerificationEmail(
  to: string,
  verifyUrl: string,
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[emails] sendCustomEmailVerificationEmail: RESEND_API_KEY missing");
    return;
  }

  const bodyHtml = `
<p style="margin:0 0 16px;">Hello,</p>
<p style="margin:0 0 16px;">Confirm your email address to activate your Handover account. This link expires in 24 hours.</p>
<p style="margin:0 0 8px;">If you did not create an account, you can ignore this email.</p>`;

  const html = emailShell({
    bodyHtml,
    ctaLabel: "Verify email",
    ctaHref: verifyUrl,
    footerNote:
      "For security, this link can only be used once. Request a new email from the sign-in page if it expires.",
  });

  const from = defaultTransactionalFrom();
  const { error } = await resend.emails.send({
    from,
    to: to.trim(),
    subject: "Confirm your email for Handover",
    html,
  });

  if (error) {
    console.error("[emails] sendCustomEmailVerificationEmail:", error);
    throw new Error(error.message);
  }
}

export async function sendTeamInviteEmail(opts: {
  to: string;
  teamName: string;
  joinUrl: string;
  /** e.g. Handover <hello@gethandover.uk> - must be verified in Resend */
  from?: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[emails] sendTeamInviteEmail: RESEND_API_KEY missing");
    return;
  }

  const safeTeam = escapeHtml(opts.teamName.trim() || "your team");
  const bodyHtml = `
<p style="margin:0 0 16px;">Hello,</p>
<p style="margin:0 0 16px;">You have been invited to join <strong>${safeTeam}</strong> on Handover - shared reporting, HaloPSA integrations, and scheduled client updates for your MSP team.</p>
<p style="margin:0 0 16px;">Accept your invitation within 7 days using the button below. You will sign in (or create an account) and be added to the team automatically.</p>
<p style="margin:0 0 8px;">If you did not expect this email, you can ignore it.</p>`;

  const html = emailShell({
    bodyHtml,
    ctaLabel: "Accept invitation",
    ctaHref: opts.joinUrl,
    footerNote: "This link expires in 7 days.",
  });

  const envTeam = process.env.RESEND_TEAM_INVITE_FROM?.trim();
  const from =
    opts.from?.trim() ||
    envTeam ||
    defaultTransactionalFrom();

  const { error } = await resend.emails.send({
    from,
    to: opts.to.trim(),
    subject: `You've been invited to join ${opts.teamName.trim() || "a team"} on Handover`,
    html,
  });

  if (error) {
    console.error("[emails] sendTeamInviteEmail:", error);
    throw new Error(error.message);
  }
}

export async function sendUpgradeNudgeEmail(
  to: string,
  firstName: string,
  generationsUsed: number,
  opts?: { from?: string },
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const safeName = escapeHtml(firstName.trim() || "there");
  const pricingUrl = `${getAppOrigin()}/pricing`;

  const bodyHtml = `
<p style="margin:0 0 16px;">Hi ${safeName},</p>
<p style="margin:0 0 16px;">You have used ${generationsUsed} of your 10 included generations this month on Handover (Basic plan).</p>
<p style="margin:0 0 16px;">If it has been saving you time, Pro includes 200 generations per month for £29/month - or £25/month on annual billing.</p>
<p style="margin:0 0 16px;">At the time it typically saves, most users find it pays for itself in the first week.</p>
<p style="margin:0 0 16px;">Upgrade any time from your dashboard, or reply if you have any questions.</p>
<p style="margin:0;">Lewis<br/>Founder, Handover</p>`;

  const html = emailShell({
    bodyHtml,
    ctaLabel: "Upgrade to Pro",
    ctaHref: pricingUrl,
    footerNote:
      "You're receiving this because you use Handover on the Basic plan. Unsubscribe any time.",
  });

  const { error } = await resend.emails.send({
    from: opts?.from ?? defaultTransactionalFrom(),
    to,
    subject: `You have used ${generationsUsed} of your 10 Basic-plan generations this month`,
    html,
  });

  if (error) {
    console.error("[emails] sendUpgradeNudgeEmail:", error);
    throw new Error(error.message);
  }
}

export async function sendNpsDetractorAlert(opts: {
  score: number;
  comment: string | null;
  userEmail: string;
  userId: string;
  from?: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const to = process.env.HANDOVER_NPS_ALERT_EMAIL?.trim() || "lewis@gethandover.uk";
  const ts = new Date().toISOString();
  const commentBlock = opts.comment?.trim()
    ? `\n\nComment:\n${opts.comment.trim()}`
    : "\n\n(No comment provided)";

  const text = `Handover NPS detractor response

Score: ${opts.score}
User email: ${opts.userEmail}
User ID: ${opts.userId}
Timestamp (UTC): ${ts}${commentBlock}`;

  const { error } = await resend.emails.send({
    from: opts.from ?? defaultTransactionalFrom(),
    to,
    subject: `Handover NPS alert - score ${opts.score}`,
    text,
  });

  if (error) {
    console.error("[emails] sendNpsDetractorAlert:", error);
    throw new Error(error.message);
  }
}

function emailShellDark(opts: {
  bodyHtml: string;
  ctaLabel: string;
  ctaHref: string;
  footerNote: string;
}): string {
  const origin = getAppOrigin();
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || origin}/icon2.png`;
  const navy = "#0f172a";
  const card = "#111c33";
  const inner = "#0f172a";
  const text = "#e2e8f0";
  const muted = "#94a3b8";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:${navy};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${navy};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${card};border-radius:12px;overflow:hidden;border:1px solid rgba(56,189,248,0.22);box-shadow:0 24px 64px rgba(0,0,0,0.45);">
          <tr>
            <td style="background:linear-gradient(135deg,${inner} 0%,#0b1224 100%);padding:22px 26px;border-bottom:1px solid rgba(56,189,248,0.15);">
              <img src="${escapeAttr(logoUrl)}" alt="Handover" style="max-height:32px;width:auto;object-fit:contain;display:block;"/>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 26px 8px;color:${text};font-size:15px;line-height:1.65;">
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 26px 26px;">
              <a href="${escapeAttr(opts.ctaHref)}" style="display:inline-block;padding:14px 26px;background:${ACCENT};color:#0b1120;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">${escapeHtml(opts.ctaLabel)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 26px;border-top:1px solid rgba(148,163,184,0.2);color:${muted};font-size:12px;line-height:1.5;">
              ${opts.footerNote}
            </td>
          </tr>
          <tr>
            <td style="padding:0 26px 22px;color:${muted};font-size:11px;line-height:1.4;">
              ${escapeHtml(origin)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Free/basic drip — day 2: no PSA connected, no trial started. */
export async function sendFreeDripPsaNudgeEmail(to: string, firstName: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[emails] sendFreeDripPsaNudgeEmail: RESEND_API_KEY missing");
    return;
  }
  const safeName = escapeHtml(firstName.trim() || "there");
  const origin = getAppOrigin();
  const integrationsUrl = `${origin}/integrations`;
  const bodyHtml = `
<p style="margin:0 0 16px;">Hi ${safeName},</p>
<p style="margin:0 0 16px;">Just checking in &mdash; have you had a chance to connect your PSA to Handover yet?</p>
<p style="margin:0 0 16px;">It takes under 5 minutes and once it is connected you can generate your first client report immediately.</p>
<p style="margin:0 0 16px;">We support HaloPSA and ConnectWise Manage natively. No middleware, no configuration, no setup required beyond your API credentials.</p>
<p style="margin:0 0 16px;">If you hit any issues connecting let me know and I will help you get it working.</p>
<p style="margin:0;">Lewis<br/>Handover</p>`;

  const html = emailShell({
    bodyHtml,
    ctaLabel: "Connect your PSA",
    ctaHref: integrationsUrl,
    footerNote:
      "You are receiving this as part of the Handover onboarding sequence. Reply directly to this email with any questions.",
  });

  const { error } = await resend.emails.send({
    from: FOUNDER_WELCOME_FROM,
    to: to.trim(),
    subject: "Have you connected your PSA yet?",
    html,
  });
  if (error) {
    console.error("[emails] sendFreeDripPsaNudgeEmail:", error);
    throw new Error(error.message);
  }
}

/** Free/basic drip — day 5: zero lifetime generations. */
export async function sendFreeDripSaveTimeEmail(to: string, firstName: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[emails] sendFreeDripSaveTimeEmail: RESEND_API_KEY missing");
    return;
  }
  const safeName = escapeHtml(firstName.trim() || "there");
  const origin = getAppOrigin();
  const trialUrl = `${origin}/signup?trial=professional`;
  const bodyHtml = `
<p style="margin:0 0 16px;">Hi ${safeName},</p>
<p style="margin:0 0 16px;">The average MSP service manager spends between 90 minutes and 3 hours per week writing client reports manually.</p>
<p style="margin:0 0 16px;">Handover reduces that to 30 seconds.</p>
<p style="margin:0 0 16px;">Connect your PSA, select your tickets and projects, and your first client-ready report is generated instantly. No writing. No formatting. No copy-pasting from your PSA.</p>
<p style="margin:0 0 16px;">If you have not started your free trial yet there is still time. 14 days, full access, no card required.</p>
<p style="margin:0;">Lewis<br/>Handover</p>`;

  const html = emailShell({
    bodyHtml,
    ctaLabel: "Start your free trial",
    ctaHref: trialUrl,
    footerNote:
      "You are receiving this as part of the Handover onboarding sequence. Reply directly to this email with any questions.",
  });

  const { error } = await resend.emails.send({
    from: FOUNDER_WELCOME_FROM,
    to: to.trim(),
    subject: "Most MSPs save 2-3 hours per week with this",
    html,
  });
  if (error) {
    console.error("[emails] sendFreeDripSaveTimeEmail:", error);
    throw new Error(error.message);
  }
}

/** Free/basic drip — day 10: founder note, no trial started. */
export async function sendFreeDripFounderNoteEmail(to: string, firstName: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[emails] sendFreeDripFounderNoteEmail: RESEND_API_KEY missing");
    return;
  }
  const safeName = escapeHtml(firstName.trim() || "there");
  const origin = getAppOrigin();
  const trialUrl = `${origin}/signup?trial=professional`;
  const bodyHtml = `
<p style="margin:0 0 16px;">Hi ${safeName},</p>
<p style="margin:0 0 16px;">I noticed you signed up for Handover but have not had a chance to try it yet.</p>
<p style="margin:0 0 16px;">I built Handover because I was watching MSP delivery teams spend hours every week on client reporting that should take minutes. It is one of those problems that feels unavoidable until you see it automated.</p>
<p style="margin:0 0 16px;">If there is anything stopping you getting started, whether that is a question about the PSA connection, uncertainty about whether it fits your workflow, or just not having had the time, reply to this email and I will help personally.</p>
<p style="margin:0 0 16px;">Or if you would like a quick walkthrough I am happy to jump on a 15 minute call.</p>
<p style="margin:0;">Lewis<br/>Founder, Handover</p>`;

  const html = emailShellLightTwoCtas({
    bodyHtml,
    primary: { label: "Book a call", href: CALENDLY_15_URL },
    secondary: { label: "Start your free trial", href: trialUrl },
    footerNote:
      "You are receiving this as part of the Handover onboarding sequence. Reply directly to this email with any questions.",
  });

  const { error } = await resend.emails.send({
    from: FOUNDER_WELCOME_FROM,
    to: to.trim(),
    subject: "A personal note from the Handover founder",
    html,
  });
  if (error) {
    console.error("[emails] sendFreeDripFounderNoteEmail:", error);
    throw new Error(error.message);
  }
}

/** Trial sequence — day 7 (halfway). */
export async function sendTrialSequenceHalfwayEmail(opts: {
  to: string;
  firstName: string;
  trialEndsAtIso: string;
  planSku: "professional" | "team";
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const safeName = escapeHtml(opts.firstName.trim() || "there");
  const origin = getAppOrigin();
  const endLong = formatLongDateUtc(opts.trialEndsAtIso);
  const proLine =
    opts.planSku === "team"
      ? "After that you can continue on the Team at £79/mo plan."
      : "After that you can continue on the Professional at £29/mo plan.";

  const bodyHtml = `
<p style="margin:0 0 16px;">Hi ${safeName},</p>
<p style="margin:0 0 16px;">You are halfway through your Handover trial.</p>
<p style="margin:0 0 16px;">If you have connected your PSA and generated a few reports, you already know whether this is going to save your team time. Most users who get to this point tell us they cannot imagine going back to manual reporting.</p>
<p style="margin:0 0 12px;">If you have not had a chance to explore everything yet, here are the two features worth trying before your trial ends:</p>
<p style="margin:0 0 8px;"><strong>Scheduled reports</strong> &mdash; set one up today and your client receives a professional automated update this week without you doing anything.</p>
<p style="margin:0 0 16px;"><strong>QBR pack generator</strong> &mdash; select a client, choose your date range, and generate a complete branded QBR pack including executive summary, charts, SLA performance, and project status. Export it as a PowerPoint and see what your next client meeting could look like.</p>
<p style="margin:0 0 16px;">Your trial ends on ${escapeHtml(endLong)}. ${escapeHtml(proLine)}</p>
<p style="margin:0;">Lewis<br/>Handover</p>`;

  const html = emailShellLightTwoCtas({
    bodyHtml,
    primary: { label: "Upgrade now", href: `${origin}/pricing` },
    secondary: { label: "Keep exploring", href: origin },
    footerNote:
      "You're receiving this because you are on a Handover trial. Reply directly to this email with any questions.",
  });

  const { error } = await resend.emails.send({
    from: FOUNDER_WELCOME_FROM,
    to: opts.to.trim(),
    subject: "Halfway through your Handover trial",
    html,
  });
  if (error) {
    console.error("[emails] sendTrialSequenceHalfwayEmail:", error);
    throw new Error(error.message);
  }
}

/** Trial sequence — 2 days before expiry. */
export async function sendTrialSequenceTwoDaysLeftEmail(opts: {
  to: string;
  firstName: string;
  trialEndsAtIso: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const safeName = escapeHtml(opts.firstName.trim() || "there");
  const origin = getAppOrigin();
  const endLong = formatLongDateUtc(opts.trialEndsAtIso);
  const pricingUrl = `${origin}/pricing`;

  const bodyHtml = `
<p style="margin:0 0 16px;">Hi ${safeName},</p>
<p style="margin:0 0 16px;">Your free trial ends in 2 days on ${escapeHtml(endLong)}.</p>
<p style="margin:0 0 16px;">After that your account moves to read-only access &mdash; you can still view reports you have already generated but you will not be able to generate new ones or run scheduled reports until you upgrade.</p>
<p style="margin:0 0 12px;">To keep full access upgrade before ${escapeHtml(endLong)}:</p>
<p style="margin:0 0 8px;"><a href="${escapeAttr(pricingUrl)}" style="color:${ACCENT};font-weight:600;">Professional &mdash; £29/mo</a> &mdash; perfect for solo MSP managers</p>
<p style="margin:0 0 16px;"><a href="${escapeAttr(pricingUrl)}" style="color:${ACCENT};font-weight:600;">Team &mdash; £79/mo</a> &mdash; for teams up to 5 people, includes QBR packs, PowerPoint export, and white label</p>
<p style="margin:0 0 16px;">Annual plans include 2 months free.</p>
<p style="margin:0 0 16px;">If you have any questions about which plan is right for you reply to this email and I will help.</p>
<p style="margin:0;">Lewis<br/>Handover</p>`;

  const html = emailShell({
    bodyHtml,
    ctaLabel: "Upgrade now",
    ctaHref: pricingUrl,
    footerNote:
      "You're receiving this because your Handover trial is ending soon. Reply directly to this email with any questions.",
  });

  const { error } = await resend.emails.send({
    from: FOUNDER_WELCOME_FROM,
    to: opts.to.trim(),
    subject: "Your Handover trial ends in 2 days",
    html,
  });
  if (error) {
    console.error("[emails] sendTrialSequenceTwoDaysLeftEmail:", error);
    throw new Error(error.message);
  }
}

/** Trial sequence — expiry day. */
export async function sendTrialSequenceExpiredDayEmail(opts: {
  to: string;
  firstName: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const safeName = escapeHtml(opts.firstName.trim() || "there");
  const origin = getAppOrigin();
  const pricingUrl = `${origin}/pricing`;

  const bodyHtml = `
<p style="margin:0 0 16px;">Hi ${safeName},</p>
<p style="margin:0 0 16px;">Your 14-day free trial ended today.</p>
<p style="margin:0 0 16px;">Your account is now in read-only mode. You can still view your previously generated reports but report generation, scheduled reports, and PSA connection are paused until you upgrade.</p>
<p style="margin:0 0 12px;">If Handover saved you time during your trial, upgrading takes 2 minutes:</p>
<p style="margin:0 0 8px;"><a href="${escapeAttr(pricingUrl)}" style="color:${ACCENT};font-weight:600;">Professional &mdash; £29/mo</a></p>
<p style="margin:0 0 16px;"><a href="${escapeAttr(pricingUrl)}" style="color:${ACCENT};font-weight:600;">Team &mdash; £79/mo</a></p>
<p style="margin:0 0 16px;">If you ran into any issues during the trial or the product did not do what you needed, reply to this email and tell me what was missing. I read every reply personally.</p>
<p style="margin:0;">Lewis<br/>Founder, Handover</p>`;

  const html = emailShell({
    bodyHtml,
    ctaLabel: "Upgrade now",
    ctaHref: pricingUrl,
    footerNote:
      "You're receiving this because your Handover trial has ended. Reply directly to this email with any questions.",
  });

  const { error } = await resend.emails.send({
    from: FOUNDER_WELCOME_FROM,
    to: opts.to.trim(),
    subject: "Your Handover trial has ended",
    html,
  });
  if (error) {
    console.error("[emails] sendTrialSequenceExpiredDayEmail:", error);
    throw new Error(error.message);
  }
}

/** Trial sequence — 3 days after expiry, not upgraded. */
export async function sendTrialSequencePostExpiryEmail(to: string, firstName: string): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const safeName = escapeHtml(firstName.trim() || "there");
  const origin = getAppOrigin();
  const pricingUrl = `${origin}/pricing`;

  const bodyHtml = `
<p style="margin:0 0 16px;">Hi ${safeName},</p>
<p style="margin:0 0 16px;">Your Handover trial ended 3 days ago and I noticed you have not upgraded yet.</p>
<p style="margin:0 0 16px;">If you are still thinking about it I just wanted to say that the offer does not change &mdash; Professional is £29/mo, Team is £79/mo, and both come with a full money back guarantee if it is not right for you.</p>
<p style="margin:0 0 16px;">If something specific stopped you upgrading I would genuinely like to know. Reply to this email and tell me what held you back. It helps me make the product better and I might be able to help directly.</p>
<p style="margin:0;">Lewis<br/>Handover</p>`;

  const html = emailShell({
    bodyHtml,
    ctaLabel: "Upgrade now",
    ctaHref: pricingUrl,
    footerNote:
      "You're receiving this because you used a Handover trial. Reply directly to this email with any questions.",
  });

  const { error } = await resend.emails.send({
    from: FOUNDER_WELCOME_FROM,
    to: to.trim(),
    subject: "Still thinking about it?",
    html,
  });
  if (error) {
    console.error("[emails] sendTrialSequencePostExpiryEmail:", error);
    throw new Error(error.message);
  }
}

export async function sendReferralRewardEmail(
  to: string,
  opts?: { from?: string },
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[emails] sendReferralRewardEmail: RESEND_API_KEY missing");
    return;
  }

  const dashboardUrl = getAppOrigin();
  const bodyHtml = `
<p style="margin:0 0 16px;">Great news - someone you referred to Handover just completed their first month.</p>
<p style="margin:0 0 16px;">We&apos;ve applied 3 months free to your account as promised. Your next 3 billing cycles are on us.</p>
<p style="margin:0 0 16px;">Keep sharing your referral link to earn more rewards.</p>
<p style="margin:0;">Lewis<br/>Founder, Handover</p>`;

  const html = emailShell({
    bodyHtml,
    ctaLabel: "Open Handover",
    ctaHref: dashboardUrl,
    footerNote:
      "You're receiving this because you participate in the Handover referral programme.",
  });

  const { error } = await resend.emails.send({
    from: opts?.from ?? defaultTransactionalFrom(),
    to: to.trim(),
    subject: "You earned £87 - someone you referred just subscribed",
    html,
  });

  if (error) {
    console.error("[emails] sendReferralRewardEmail:", error);
    throw new Error(error.message);
  }
}
