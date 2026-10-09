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
  ctaLabel?: string;
  ctaHref?: string;
  footerNote?: string;
}): string {
  const origin = getAppOrigin();
  const logoUrl = `${
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || origin
  }/icon2.png`;

  const ctaBlock =
    opts.ctaLabel && opts.ctaHref
      ? `
    <tr>
      <td style="padding:8px 32px 28px;">
        <a href="${escapeAttr(opts.ctaHref)}"
        style="display:inline-block;
        padding:13px 26px;
        background:#38bdf8;
        color:#0f172a;
        text-decoration:none;
        border-radius:8px;
        font-weight:700;
        font-size:14px;
        letter-spacing:-0.01em;">
          ${escapeHtml(opts.ctaLabel)} →
        </a>
      </td>
    </tr>`
      : "";

  const footerBlock = opts.footerNote
    ? `
    <tr>
      <td style="padding:16px 32px;
      border-top:1px solid rgba(255,255,255,0.06);
      color:#475569;
      font-size:12px;
      line-height:1.6;">
        ${opts.footerNote}
      </td>
    </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#06091a;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#06091a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#0d1530;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);box-shadow:0 24px 80px rgba(0,0,0,0.5);">
          <tr>
            <td style="background:#0a0f1c;padding:22px 32px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <img src="${escapeAttr(logoUrl)}"
                    alt="Handover"
                    style="height:28px;width:auto;object-fit:contain;display:block;"/>
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="font-size:16px;font-weight:700;color:#f0f4ff;letter-spacing:-0.02em;">
                      Handover
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="height:2px;background:linear-gradient(90deg,#38bdf8 0%,#0ea5e9 50%,transparent 100%);"></td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;color:#cbd5e1;font-size:15px;line-height:1.7;">
              ${opts.bodyHtml}
            </td>
          </tr>
          ${ctaBlock}
          ${footerBlock}
          <tr>
            <td style="padding:12px 32px 20px;color:#334155;font-size:11px;">
              gethandover.uk
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
<p style="margin:0 0 16px;color:#cbd5e1;">Hi ${safeFirst},</p>
<p style="margin:0 0 16px;color:#cbd5e1;">Your free trial is now active. You have full access to everything in the ${safePlan} plan for the next 14 days.</p>
<p style="margin:0 0 12px;font-weight:600;color:#cbd5e1;">Here is what to do in your first session to get the most out of it:</p>
<ul style="margin:0 0 16px;padding-left:20px;color:#94a3b8;">
  <li style="margin-bottom:8px;color:#94a3b8;">Connect your PSA - HaloPSA or ConnectWise - on the <a href="${escapeAttr(integrationsUrl)}" style="color:#38bdf8;font-weight:600;">integrations page</a></li>
  <li style="margin-bottom:8px;color:#94a3b8;">Generate your first client report in under 30 seconds</li>
  <li style="margin-bottom:8px;color:#94a3b8;">Try the QBR pack generator and export it as a PowerPoint</li>
  <li style="margin-bottom:8px;color:#94a3b8;">Set up a scheduled report so your first automated client update goes out this week</li>
</ul>
<p style="margin:0 0 16px;color:#94a3b8;">P.S. Want to get set up in 15 minutes? Book a quick call with me directly and I&apos;ll walk you through everything personally: calendly.com/gethandover/30min</p>
<p style="margin:0 0 16px;color:#cbd5e1;">If you need any help at any point reply to this email directly.</p>
<p style="margin:0 0 16px;color:#cbd5e1;">Your trial ends on ${escapeHtml(endLong)}.</p>
<p style="margin:0;color:#cbd5e1;">Lewis<br/>Handover</p>`;

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
  const trialUrl = `${origin}/welcome`;

  const bodyHtml = `
<p style="margin:0 0 16px;color:#cbd5e1;">Hi ${safeName},</p>
<p style="margin:0 0 16px;color:#cbd5e1;">Welcome to Handover.</p>
<p style="margin:0 0 16px;color:#cbd5e1;">You are one PSA connection away from generating your first client report in 30 seconds.</p>
<p style="margin:0 0 12px;font-weight:600;color:#cbd5e1;">Here is what to do next:</p>
<ul style="margin:0 0 16px;padding-left:20px;color:#94a3b8;">
  <li style="margin-bottom:8px;color:#94a3b8;">Connect HaloPSA or ConnectWise on the <a href="${escapeAttr(integrationsUrl)}" style="color:#38bdf8;font-weight:600;">integrations page</a></li>
  <li style="margin-bottom:8px;color:#94a3b8;">Select your tickets and projects</li>
  <li style="margin-bottom:8px;color:#94a3b8;">Generate your first report</li>
</ul>
<p style="margin:0 0 16px;color:#cbd5e1;">Your 14-day free trial gives you full access to everything including the QBR pack generator, scheduled reports, and all export formats.</p>
<p style="margin:0 0 16px;color:#cbd5e1;">If you have any questions reply to this email directly.</p>
<p style="margin:0;color:#cbd5e1;">Lewis<br/>Founder, Handover</p>`;

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
<p style="margin:0 0 16px;">Hi there,</p>
<p style="margin:0 0 16px;">Thanks for signing up to Handover. Click below to verify your email and get started - the link expires in 24 hours.</p>
<p style="margin:0 0 8px;">If you didn't create an account, you can safely ignore this email.</p>`;

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
    subject: "Please verify your Handover account",
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
<p style="margin:0 0 16px;">If it has been saving you time, Starter includes 200 generations per month for £49/month - or £39/month on annual billing.</p>
<p style="margin:0 0 16px;">At the time it typically saves, most users find it pays for itself in the first week.</p>
<p style="margin:0 0 16px;">Upgrade any time from your dashboard, or reply if you have any questions.</p>
<p style="margin:0;">Lewis<br/>Founder, Handover</p>`;

  const html = emailShell({
    bodyHtml,
    ctaLabel: "Upgrade to Starter",
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
<p style="margin:0 0 16px;">Just checking in - have you had a chance to connect your PSA to Handover yet?</p>
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
  const trialUrl = `${origin}/welcome`;
  const bodyHtml = `
<p style="margin:0 0 16px;">Hi ${safeName},</p>
<p style="margin:0 0 16px;">The average MSP service manager spends between 90 minutes and 3 hours per week writing client reports manually.</p>
<p style="margin:0 0 16px;">Handover reduces that to 30 seconds.</p>
<p style="margin:0 0 16px;">Connect your PSA, select your tickets and projects, and your first client-ready report is generated instantly. No writing. No formatting. No copy-pasting from your PSA.</p>
<p style="margin:0 0 16px;">If you have not started your free trial yet there is still time. 14 days, full access, 14-day free trial - cancel anytime.</p>
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
  const trialUrl = `${origin}/welcome`;
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
      ? "After that you can continue on Growth at £99/mo."
      : "After that you can continue on Starter at £49/mo.";

  const bodyHtml = `
<p style="margin:0 0 16px;">Hi ${safeName},</p>
<p style="margin:0 0 16px;">You are halfway through your Handover trial.</p>
<p style="margin:0 0 16px;">If you have connected your PSA and generated a few reports, you already know whether this is going to save your team time. Most users who get to this point tell us they cannot imagine going back to manual reporting.</p>
<p style="margin:0 0 12px;">If you have not had a chance to explore everything yet, here are the two features worth trying before your trial ends:</p>
<p style="margin:0 0 8px;"><strong>Scheduled reports</strong> - set one up today and your client receives a professional automated update this week without you doing anything.</p>
<p style="margin:0 0 16px;"><strong>QBR pack generator</strong> - select a client, choose your date range, and generate a complete branded QBR pack including executive summary, charts, SLA performance, and project status. Export it as a PowerPoint and see what your next client meeting could look like.</p>
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

/** Trial sequence — day 10: call offer. */
export async function sendTrialSequenceDay10CallEmail(opts: {
  to: string;
  firstName: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const safeName = escapeHtml(opts.firstName.trim() || "there");
  const origin = getAppOrigin();

  const bodyHtml = `
<p style="margin:0 0 16px;">Hi ${safeName},</p>
<p style="margin:0 0 16px;">Your trial has a few days left and I wanted to reach out personally.</p>
<p style="margin:0 0 16px;">If you've had a chance to try Handover and something isn't quite clicking, I'd love to know. And if you haven't had a chance yet, I'm happy to walk you through it in 15 minutes.</p>
<p style="margin:0 0 16px;">No pitch. Just a quick look at your setup and how Handover fits in.</p>
<p style="margin:0;">Lewis<br/>Founder, Handover</p>`;

  const html = emailShellLightTwoCtas({
    bodyHtml,
    primary: { label: "Book a 15 minute call", href: CALENDLY_15_URL },
    secondary: { label: "Open Handover", href: origin },
    footerNote: "You're on a Handover trial...",
  });

  const { error } = await resend.emails.send({
    from: FOUNDER_WELCOME_FROM,
    to: opts.to.trim(),
    subject: "Worth a quick call?",
    html,
  });
  if (error) {
    console.error("[emails] sendTrialSequenceDay10CallEmail:", error);
    throw new Error(error.message);
  }
}

/** Trial sequence — day 3 inactive (zero generations). */
export async function sendTrialDay3InactiveEmail(opts: {
  to: string;
  firstName: string;
  trialEndsAtIso: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const safeName = escapeHtml(opts.firstName.trim() || "there");
  const origin = getAppOrigin();
  const endLong = formatLongDateUtc(opts.trialEndsAtIso);

  const bodyHtml = `
<p style="margin:0 0 16px;">Hi ${safeName},</p>
<p style="margin:0 0 16px;">You signed up for a Handover trial a few days ago but have not had a chance to generate anything yet.</p>
<p style="margin:0 0 16px;">The quickest way to see what it does: paste any ticket notes or project update into the input box and hit Generate. No PSA connection needed to start.</p>
<p style="margin:0 0 16px;">Your trial runs until ${escapeHtml(endLong)}.</p>
<p style="margin:0;">Lewis<br/>Founder, Handover</p>`;

  const html = emailShell({
    bodyHtml,
    ctaLabel: "Open Handover",
    ctaHref: origin,
    footerNote:
      "You're receiving this because you started a Handover trial. Reply directly to this email with any questions.",
  });

  const { error } = await resend.emails.send({
    from: FOUNDER_WELCOME_FROM,
    to: opts.to.trim(),
    subject: "Have you tried Handover yet?",
    html,
  });
  if (error) {
    console.error("[emails] sendTrialDay3InactiveEmail:", error);
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
<p style="margin:0 0 16px;">After that your account moves to read-only access - you can still view reports you have already generated but you will not be able to generate new ones or run scheduled reports until you upgrade.</p>
<p style="margin:0 0 12px;">To keep full access upgrade before ${escapeHtml(endLong)}:</p>
<p style="margin:0 0 8px;"><a href="${escapeAttr(pricingUrl)}" style="color:${ACCENT};font-weight:600;">Starter - £49/mo</a> - perfect for solo MSP managers</p>
<p style="margin:0 0 16px;"><a href="${escapeAttr(pricingUrl)}" style="color:${ACCENT};font-weight:600;">Growth - £99/mo</a> - for teams up to 5 people, includes QBR packs, PowerPoint export, and white label</p>
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
<p style="margin:0 0 8px;"><a href="${escapeAttr(pricingUrl)}" style="color:${ACCENT};font-weight:600;">Starter - £49/mo</a></p>
<p style="margin:0 0 16px;"><a href="${escapeAttr(pricingUrl)}" style="color:${ACCENT};font-weight:600;">Growth - £99/mo</a></p>
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
<p style="margin:0 0 16px;">If you are still thinking about it I just wanted to say that the offer does not change - Starter is £49/mo, Growth is £99/mo, and both come with a full money back guarantee if it is not right for you.</p>
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

/** Trial winback — 7 days after expiry, not upgraded. */
export async function sendTrialWinbackWeekOneEmail(
  to: string,
  firstName?: string | null,
): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const name = firstName?.trim() || "there";
  const origin = getAppOrigin();

  const bodyHtml = `
<p style="margin:0 0 16px;">
  Hi ${escapeHtml(name)},
</p>
<p style="margin:0 0 16px;">
  Your Handover trial ended a week ago. I wanted to check in - did something get in the way, or was there something the product didn't do that you needed?
</p>
<p style="margin:0 0 16px;">
  I ask because we've shipped a few things since your trial - the generation quality is significantly better, and the scheduled reports feature now includes week-over-week continuity so repeat reports don't read identically.
</p>
<p style="margin:0 0 16px;">
  If you'd like another look, I'm happy to extend your trial by 7 days - no card required this time. Just reply to this email.
</p>
<p style="margin:0;">
  Lewis<br/>Founder, Handover
</p>`;

  const html = emailShell({
    bodyHtml,
    ctaLabel: "Restart your trial",
    ctaHref: `${origin}/auth?tab=signin`,
    footerNote:
      "You're receiving this because you previously trialled Handover.",
  });

  const { error } = await resend.emails.send({
    from: FOUNDER_WELCOME_FROM,
    to,
    subject: "Did something get in the way?",
    html,
  });
  if (error) {
    console.error("[emails] sendTrialWinbackWeekOneEmail:", error);
    throw new Error(error.message);
  }
}

/** Trial winback — 21 days after expiry, not upgraded. */
export async function sendTrialWinbackWeekThreeEmail(
  to: string,
  firstName?: string | null,
): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const name = firstName?.trim() || "there";
  const origin = getAppOrigin();

  const bodyHtml = `
<p style="margin:0 0 16px;">
  Hi ${escapeHtml(name)},
</p>
<p style="margin:0 0 16px;">
  Last message from me on this - I promise.
</p>
<p style="margin:0 0 16px;">
  Clients don't leave MSPs because of bad technical work. They leave because they stopped feeling informed. If that's a problem you're still sitting with, Handover is worth another look.
</p>
<p style="margin:0 0 16px;">
  I'll extend your trial by 14 days if you want to give it a proper run. No obligation.
</p>
<p style="margin:0;">
  Lewis<br/>Founder, Handover
</p>`;

  const html = emailShell({
    bodyHtml,
    ctaLabel: "Give it another go",
    ctaHref: `${origin}/auth?tab=signin`,
    footerNote:
      "Last email from us on this. Unsubscribe by replying 'unsubscribe'.",
  });

  const { error } = await resend.emails.send({
    from: FOUNDER_WELCOME_FROM,
    to,
    subject: "Last one from me - 14 days free if you want it",
    html,
  });
  if (error) {
    console.error("[emails] sendTrialWinbackWeekThreeEmail:", error);
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
<p style="margin:0 0 16px;">We&apos;ve applied 1 month free to your subscription as promised - that&apos;s £79 credit on Team.</p>
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
    subject: "You earned £79 credit - someone you referred just subscribed",
    html,
  });

  if (error) {
    console.error("[emails] sendReferralRewardEmail:", error);
    throw new Error(error.message);
  }
}

export type PortalInviteMspProfile = {
  company_name?: string | null;
  display_name?: string | null;
  brand_name?: string | null;
  brand_logo_url?: string | null;
  white_label_mode?: boolean | null;
  plan?: string | null;
} | null;

/** Client portal — invite end user to set password and access read-only PSA data. */
export async function sendPortalInviteEmail(opts: {
  to: string;
  inviteeDisplayName: string | null;
  clientName: string;
  mspSlug: string;
  clientSlug: string;
  inviteToken: string;
  mspProfile: PortalInviteMspProfile;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[emails] sendPortalInviteEmail: RESEND_API_KEY missing");
    return;
  }

  const origin = getAppOrigin();
  const inviteUrl = `${origin}/portal/${encodeURIComponent(opts.mspSlug)}/${encodeURIComponent(opts.clientSlug)}/invite?token=${encodeURIComponent(opts.inviteToken)}`;
  const mspName =
    (opts.mspProfile && typeof opts.mspProfile.brand_name === "string" && opts.mspProfile.brand_name.trim()) ||
    (opts.mspProfile && typeof opts.mspProfile.company_name === "string" && opts.mspProfile.company_name.trim()) ||
    (opts.mspProfile && typeof opts.mspProfile.display_name === "string" && opts.mspProfile.display_name.trim()) ||
    "Your MSP";
  const logoUrl =
    opts.mspProfile && typeof opts.mspProfile.brand_logo_url === "string" && opts.mspProfile.brand_logo_url.trim()
      ? opts.mspProfile.brand_logo_url.trim()
      : `${origin}/icon2.png`;
  const wl =
    opts.mspProfile?.white_label_mode === true &&
    typeof opts.mspProfile?.brand_name === "string" &&
    opts.mspProfile.brand_name.trim().length > 0;
  const footer = wl
    ? escapeHtml(mspName)
    : `Powered by Handover &middot; ${escapeHtml(origin)}`;

  const greet =
    typeof opts.inviteeDisplayName === "string" && opts.inviteeDisplayName.trim()
      ? escapeHtml(opts.inviteeDisplayName.trim())
      : "there";
  const safeClient = escapeHtml(opts.clientName.trim() || "your organisation");
  const safeMsp = escapeHtml(mspName);

  const bodyHtml = `
<p style="margin:0 0 16px;">Hi ${greet},</p>
<p style="margin:0 0 16px;">${safeMsp} has set up a client portal for <strong>${safeClient}</strong>. You can view your tickets, projects, and service updates in one place.</p>
<p style="margin:0 0 16px;">This invite expires in 7 days.</p>
<p style="margin:0;">If you did not expect this message, you can ignore it.</p>`;

  const headerLogo = `<img src="${escapeAttr(logoUrl)}" alt="" style="max-height:36px;width:auto;object-fit:contain;display:block;"/>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:${HEADER_BG};padding:22px 26px;">${headerLogo}</td>
          </tr>
          <tr>
            <td style="padding:26px 26px 8px;color:${BODY_TEXT};font-size:15px;line-height:1.65;">${bodyHtml}</td>
          </tr>
          <tr>
            <td style="padding:8px 26px 26px;">
              <a href="${escapeAttr(inviteUrl)}" style="display:inline-block;padding:12px 22px;background:${ACCENT};color:#0f172a;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Accept invite and set password</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 26px;border-top:1px solid #e2e8f0;color:${MUTED};font-size:12px;line-height:1.5;">${footer}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const subject = `You've been invited to ${opts.clientName.trim() || "your"} portal`;
  const { error } = await resend.emails.send({
    from: buildHandoverResendFromHeader(opts.mspProfile),
    to: opts.to.trim(),
    subject,
    html,
  });
  if (error) {
    console.error("[emails] sendPortalInviteEmail:", error);
    throw new Error(error.message);
  }
}

export async function sendPortalPasswordResetEmail(opts: {
  to: string;
  mspSlug: string;
  clientSlug: string;
  resetToken: string;
  mspProfile: PortalInviteMspProfile;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[emails] sendPortalPasswordResetEmail: RESEND_API_KEY missing");
    return;
  }
  const origin = getAppOrigin();
  const url = `${origin}/portal/${encodeURIComponent(opts.mspSlug)}/${encodeURIComponent(opts.clientSlug)}/invite?token=${encodeURIComponent(opts.resetToken)}&reset=1`;
  const mspName =
    (opts.mspProfile && typeof opts.mspProfile.brand_name === "string" && opts.mspProfile.brand_name.trim()) ||
    (opts.mspProfile && typeof opts.mspProfile.company_name === "string" && opts.mspProfile.company_name.trim()) ||
    "Your MSP";
  const wl =
    opts.mspProfile?.white_label_mode === true &&
    typeof opts.mspProfile?.brand_name === "string" &&
    opts.mspProfile.brand_name.trim().length > 0;
  const footer = wl ? escapeHtml(mspName) : `Powered by Handover &middot; ${escapeHtml(origin)}`;
  const bodyHtml = `
<p style="margin:0 0 16px;">Hi,</p>
<p style="margin:0 0 16px;">We received a request to reset the password for your client portal with <strong>${escapeHtml(mspName)}</strong>.</p>
<p style="margin:0 0 16px;">Click the button below to choose a new password. This link expires in 24 hours.</p>`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;">
        <tr><td style="background:${HEADER_BG};padding:22px 26px;"><img src="${escapeAttr(`${origin}/icon2.png`)}" alt="Handover" style="max-height:32px;width:auto;"/></td></tr>
        <tr><td style="padding:26px;color:${BODY_TEXT};font-size:15px;line-height:1.65;">${bodyHtml}</td></tr>
        <tr><td style="padding:8px 26px 26px;">
          <a href="${escapeAttr(url)}" style="display:inline-block;padding:12px 22px;background:${ACCENT};color:#0f172a;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Reset password</a>
        </td></tr>
        <tr><td style="padding:16px 26px;border-top:1px solid #e2e8f0;color:${MUTED};font-size:12px;">${footer}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  const { error } = await resend.emails.send({
    from: buildHandoverResendFromHeader(opts.mspProfile),
    to: opts.to.trim(),
    subject: "Reset your client portal password",
    html,
  });
  if (error) {
    console.error("[emails] sendPortalPasswordResetEmail:", error);
    throw new Error(error.message);
  }
}

const LOOP_CLOSER_FROM = "hello@gethandover.uk";

/** Plain founder note — 48h / cold-trial follow-up when the value loop may not have closed. */
export async function sendLoopCloserEmail(opts: { to: string; firstName: string }): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const name = opts.firstName.trim() || "there";
  const text = `Hey ${name},
I noticed you generated a report in Handover but I'm not sure if it made it to your client.
If you need a hand getting it sent - whether that's the one-click email, pushing it to your PSA, or setting up a schedule - reply to this and I'll help directly.
Lewis
Founder, Handover`;

  const { error } = await resend.emails.send({
    from: LOOP_CLOSER_FROM,
    to: opts.to.trim(),
    subject: "Did you send that report to your client?",
    text,
  });
  if (error) {
    console.error("[emails] sendLoopCloserEmail:", error);
    throw new Error(error.message);
  }
}

/** Internal visibility when a trial user is going cold (no loop completion, stale last gen). */
export async function sendColdTrialInternalAlert(opts: {
  userEmail: string;
  totalGenerations: number;
  lastGenerationAtIso: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const text = `Trial user cold-outreach cron matched this account.

Email: ${opts.userEmail}
Total generations (profile): ${opts.totalGenerations}
Last generation at (UTC): ${opts.lastGenerationAtIso}`;

  const { error } = await resend.emails.send({
    from: LOOP_CLOSER_FROM,
    to: "hello@gethandover.uk",
    subject: `⚠️ Trial user going cold - ${opts.userEmail}`,
    text,
  });
  if (error) {
    console.error("[emails] sendColdTrialInternalAlert:", error);
    throw new Error(error.message);
  }
}
