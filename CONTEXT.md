# Project: Handover

## What this is
**Handover** — Turn messy project notes into professional outputs in seconds.

A SaaS web app for IT Project Managers and MSP teams.
Users paste messy meeting notes or ticket exports and get back
5 structured, professional outputs instantly.

## The 5 outputs
1. Action list (with suggested owner and priority)
2. Risk log (with mitigation steps)
3. Internal project summary
4. Client-ready update email
5. Weekly status report

## Tech stack
- Next.js 14 App Router (TypeScript)
- Supabase (database + auth)
- OpenAI API (GPT-4o mini)
- Tailwind CSS + shadcn/ui
- Stripe (payments — not yet)
- Deployed on Vercel

## Current focus
Week 1 — building the core API route and system prompt only.
No UI yet. No database yet. Just the generation logic.

## Key decisions
- All AI outputs returned as a single structured JSON object
- System prompt must sound like a senior MSP Service Delivery Manager
- Use response_format: json_object to enforce structure
- GPT-4o mini for cost efficiency
