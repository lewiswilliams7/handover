/**
 * Public Stripe price IDs for checkout CTAs. Server routes also allow
 * STRIPE_* (non-NEXT_PUBLIC) variants in checkout/route.ts.
 *
 * Defaults match production price IDs when env vars are unset.
 */
const DEFAULT_PROFESSIONAL_MONTHLY = "price_1TNZqE5pUpou3weNjCnlhgGo";
const DEFAULT_PROFESSIONAL_ANNUAL = "price_1TNZqe5pUpou3weNDZ2YX22m";
const DEFAULT_TEAM_MONTHLY = "price_1TNZso5pUpou3weNBvy29v5x";
const DEFAULT_TEAM_ANNUAL = "price_1TNZtL5pUpou3weNVgGUYUjL";

/**
 * Onboarding call (£99 one-time). Default is the Stripe **product** id; the checkout API resolves it to a
 * `price_…` id. Override with `STRIPE_ONBOARDING_CALL_PRICE_ID` / `NEXT_PUBLIC_STRIPE_ONBOARDING_CALL_PRICE_ID`
 * if you prefer to pass a price id directly.
 */
const DEFAULT_ONBOARDING_CALL_PRODUCT_ID = "prod_UMSXo6krQwbNkJ";

export const STRIPE_ONBOARDING_CALL_PRICE_ID =
  process.env.NEXT_PUBLIC_STRIPE_ONBOARDING_CALL_PRICE_ID ??
  process.env.STRIPE_ONBOARDING_CALL_PRICE_ID ??
  DEFAULT_ONBOARDING_CALL_PRODUCT_ID;

export const STRIPE_PRICE_IDS = {
  /** Professional (formerly "Pro") — monthly/yearly. */
  professional: {
    monthly:
      process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID ??
      process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ??
      DEFAULT_PROFESSIONAL_MONTHLY,
    annual:
      process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID ??
      process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID ??
      DEFAULT_PROFESSIONAL_ANNUAL,
  },
  /** @deprecated Use STRIPE_PRICE_IDS.professional */
  pro: {
    monthly:
      process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID ??
      process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ??
      DEFAULT_PROFESSIONAL_MONTHLY,
    annual:
      process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID ??
      process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID ??
      DEFAULT_PROFESSIONAL_ANNUAL,
  },
  /**
   * Team base subscription (Stripe). Seat overages above the included bundle are handled manually
   * for now — bill customers at £20/user/mo or £192/user/yr per published pricing (not yet as automated Stripe tiers in app).
   */
  team: {
    monthly:
      process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID ?? DEFAULT_TEAM_MONTHLY,
    annual: process.env.NEXT_PUBLIC_STRIPE_TEAM_ANNUAL_PRICE_ID ?? DEFAULT_TEAM_ANNUAL,
  },
  enterprise: {
    monthly:
      process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID ??
      process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID ??
      "",
    annual:
      process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_ANNUAL_PRICE_ID ??
      process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID ??
      "",
  },
} as const;

const ENTERPRISE_STRIPE_PRICE_ID_SET = new Set(
  [STRIPE_PRICE_IDS.enterprise.monthly, STRIPE_PRICE_IDS.enterprise.annual].filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  ),
);

const PROFESSIONAL_STRIPE_PRICE_ID_SET = new Set(
  [STRIPE_PRICE_IDS.professional.monthly, STRIPE_PRICE_IDS.professional.annual].filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  ),
);

const TEAM_STRIPE_PRICE_ID_SET = new Set(
  [STRIPE_PRICE_IDS.team.monthly, STRIPE_PRICE_IDS.team.annual].filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  ),
);

/** True when this Stripe Price ID is configured as Enterprise (metadata fallback). */
export function isKnownEnterpriseStripePriceId(priceId: string): boolean {
  return ENTERPRISE_STRIPE_PRICE_ID_SET.has(priceId);
}

export function isKnownProfessionalStripePriceId(priceId: string): boolean {
  return PROFESSIONAL_STRIPE_PRICE_ID_SET.has(priceId);
}

export function isKnownTeamStripePriceId(priceId: string): boolean {
  return TEAM_STRIPE_PRICE_ID_SET.has(priceId);
}

export const STRIPE_PRO_MONTHLY_PRICE_ID = STRIPE_PRICE_IDS.professional.monthly;
export const STRIPE_PRO_ANNUAL_PRICE_ID = STRIPE_PRICE_IDS.professional.annual;
export const STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID = STRIPE_PRICE_IDS.professional.monthly;
export const STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID = STRIPE_PRICE_IDS.professional.annual;
export const STRIPE_TEAM_MONTHLY_PRICE_ID = STRIPE_PRICE_IDS.team.monthly;
export const STRIPE_TEAM_ANNUAL_PRICE_ID = STRIPE_PRICE_IDS.team.annual;
export const STRIPE_ENTERPRISE_MONTHLY_PRICE_ID = STRIPE_PRICE_IDS.enterprise.monthly;
export const STRIPE_ENTERPRISE_ANNUAL_PRICE_ID = STRIPE_PRICE_IDS.enterprise.annual;
