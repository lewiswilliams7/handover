/**
 * Stripe price IDs for the current one-plan model.
 *
 * Production price IDs are configuration-only. The local development
 * defaults point at the newly-created Stripe test prices and are guarded by
 * NODE_ENV so a test ID cannot become a production default.
 */
const DEFAULT_HANDOVER_MONTHLY =
  process.env.NODE_ENV === "development" ? "price_1UAAUKGFXkmKR1Zap4e2B2za" : "";
const DEFAULT_HANDOVER_ANNUAL =
  process.env.NODE_ENV === "development" ? "price_1UAAUKGFXkmKR1Zax6dlzqEd" : "";
const DEFAULT_STARTER_PROGRAMME_MONTHLY =
  process.env.NODE_ENV === "development" ? "price_1UAAULGFXkmKR1ZaNXpn34de" : "";
const DEFAULT_STARTER_PROGRAMME_ANNUAL =
  process.env.NODE_ENV === "development" ? "price_1UAAULGFXkmKR1ZaDLsdEQQz" : "";

/** Legacy IDs retained for subscription reconciliation during migration. */
export const LEGACY_STRIPE_PRICE_IDS = {
  professional: {
    monthly: [
      "price_1TedWH5pUpou3weNbAJqPtPH",
      "price_1TNZqE5pUpou3weNjCnlhgGo",
    ],
    annual: [
      "price_1TedWt5pUpou3weNIRep4yKk",
      "price_1TNZqe5pUpou3weNDZ2YX22m",
    ],
  },
  team: {
    monthly: [
      "price_1TedYm5pUpou3weNVdbfav35",
      "price_1TNZso5pUpou3weNBvy29v5x",
    ],
    annual: [
      "price_1TedZJ5pUpou3weNfWpHzKST",
      "price_1TNZtL5pUpou3weNVgGUYUjL",
    ],
  },
} as const;

/**
 * Legacy onboarding-call export kept for old code paths while the add-on is
 * removed from the public pricing model.
 */
const DEFAULT_ONBOARDING_CALL_PRODUCT_ID = "prod_UMSXo6krQwbNkJ";
export const STRIPE_ONBOARDING_CALL_PRICE_ID =
  process.env.NEXT_PUBLIC_STRIPE_ONBOARDING_CALL_PRICE_ID ??
  process.env.STRIPE_ONBOARDING_CALL_PRICE_ID ??
  DEFAULT_ONBOARDING_CALL_PRODUCT_ID;

const handoverPrices = {
  monthly:
    process.env.NEXT_PUBLIC_STRIPE_HANDOVER_MONTHLY_PRICE_ID ??
    process.env.STRIPE_HANDOVER_MONTHLY_PRICE_ID ??
    DEFAULT_HANDOVER_MONTHLY,
  annual:
    process.env.NEXT_PUBLIC_STRIPE_HANDOVER_ANNUAL_PRICE_ID ??
    process.env.STRIPE_HANDOVER_ANNUAL_PRICE_ID ??
    DEFAULT_HANDOVER_ANNUAL,
} as const;

const starterProgrammePrices = {
  monthly:
    process.env.NEXT_PUBLIC_STRIPE_STARTER_PROGRAMME_MONTHLY_PRICE_ID ??
    process.env.STRIPE_STARTER_PROGRAMME_MONTHLY_PRICE_ID ??
    DEFAULT_STARTER_PROGRAMME_MONTHLY,
  annual:
    process.env.NEXT_PUBLIC_STRIPE_STARTER_PROGRAMME_ANNUAL_PRICE_ID ??
    process.env.STRIPE_STARTER_PROGRAMME_ANNUAL_PRICE_ID ??
    DEFAULT_STARTER_PROGRAMME_ANNUAL,
} as const;

const legacyTeamPrices = {
  monthly:
    process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID ??
    process.env.STRIPE_TEAM_MONTHLY_PRICE_ID ??
    LEGACY_STRIPE_PRICE_IDS.team.monthly[0],
  annual:
    process.env.NEXT_PUBLIC_STRIPE_TEAM_ANNUAL_PRICE_ID ??
    process.env.STRIPE_TEAM_ANNUAL_PRICE_ID ??
    LEGACY_STRIPE_PRICE_IDS.team.annual[0],
} as const;

export const STRIPE_PRICE_IDS = {
  handover: handoverPrices,
  starterProgramme: starterProgrammePrices,
  /** Compatibility aliases for existing imports; new checkout has one plan. */
  professional: handoverPrices,
  pro: handoverPrices,
  team: legacyTeamPrices,
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
  [
    STRIPE_PRICE_IDS.handover.monthly,
    STRIPE_PRICE_IDS.handover.annual,
    STRIPE_PRICE_IDS.starterProgramme.monthly,
    STRIPE_PRICE_IDS.starterProgramme.annual,
    ...LEGACY_STRIPE_PRICE_IDS.professional.monthly,
    ...LEGACY_STRIPE_PRICE_IDS.professional.annual,
  ].filter((id): id is string => typeof id === "string" && id.length > 0),
);

const TEAM_STRIPE_PRICE_ID_SET = new Set<string>(
  [
    ...LEGACY_STRIPE_PRICE_IDS.team.monthly,
    ...LEGACY_STRIPE_PRICE_IDS.team.annual,
  ],
);

export function isKnownEnterpriseStripePriceId(priceId: string): boolean {
  return ENTERPRISE_STRIPE_PRICE_ID_SET.has(priceId);
}

export function isKnownProfessionalStripePriceId(priceId: string): boolean {
  return PROFESSIONAL_STRIPE_PRICE_ID_SET.has(priceId);
}

export function isKnownTeamStripePriceId(priceId: string): boolean {
  return TEAM_STRIPE_PRICE_ID_SET.has(priceId);
}

export const STRIPE_PRO_MONTHLY_PRICE_ID = STRIPE_PRICE_IDS.handover.monthly;
export const STRIPE_PRO_ANNUAL_PRICE_ID = STRIPE_PRICE_IDS.handover.annual;
export const STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID = STRIPE_PRICE_IDS.handover.monthly;
export const STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID = STRIPE_PRICE_IDS.handover.annual;
export const STRIPE_TEAM_MONTHLY_PRICE_ID = STRIPE_PRICE_IDS.team.monthly;
export const STRIPE_TEAM_ANNUAL_PRICE_ID = STRIPE_PRICE_IDS.team.annual;
export const STRIPE_ENTERPRISE_MONTHLY_PRICE_ID = STRIPE_PRICE_IDS.enterprise.monthly;
export const STRIPE_ENTERPRISE_ANNUAL_PRICE_ID = STRIPE_PRICE_IDS.enterprise.annual;
