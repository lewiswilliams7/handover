# Stripe billing (Handover Pro)

## Environment variables

See `.env.local.example`. Required:

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Secret API key (Dashboard → Developers → API keys) |
| `STRIPE_PRO_PRICE_ID` | Price ID for the Pro subscription (`price_...`) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret from your webhook endpoint (`whsec_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Updates `profiles` from webhooks (never expose to the browser) |
| `NEXT_PUBLIC_APP_URL` | Site origin for Checkout redirect URLs (no trailing slash) |

## Database

Run `supabase/migrations/20250324_add_plan_and_stripe.sql` in the Supabase SQL editor if you have not already (adds `plan`, `stripe_customer_id`, `generations.created_at`).

## Code map

| File | Role |
|------|------|
| `src/lib/stripe.ts` | Stripe SDK singleton (`getStripe()`) |
| `src/lib/app-url.ts` | `NEXT_PUBLIC_APP_URL` for redirect URLs |
| `src/lib/supabase/admin.ts` | Service-role Supabase client for webhooks |
| `src/app/api/stripe/checkout/route.ts` | `POST` → Stripe Checkout session `{ url }` |
| `src/app/api/stripe/webhook/route.ts` | Verifies signature; updates `profiles.plan` |
| `src/app/api/generate/route.ts` | Free tier: 5 gens/month per user (403 `limit_reached`) |
| `src/app/page.tsx` | Upgrade modal, usage counter, Pro badge, success banner |

## Stripe Dashboard

1. **Products →** create Pro product + recurring price → copy `STRIPE_PRO_PRICE_ID`.
2. **Developers → Webhooks →** add endpoint `https://<your-domain>/api/stripe/webhook`  
   Subscribe to: `checkout.session.completed`, `customer.subscription.deleted`  
   Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`.

## Local webhook testing

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET` while testing locally.
