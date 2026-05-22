'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MarketingHeroAmbient } from '@/components/marketing-hero-ambient'
import { createClient } from '@/lib/supabase'
import { getSupabaseEnv } from '@/lib/supabase/env'

function WelcomePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState<string | null>(null)
  const [gateReady, setGateReady] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false

    const checkEligibility = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.id) {
        if (!cancelled) setGateReady(true)
        return
      }

      try {
        const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) {
          if (!cancelled) setGateReady(true)
          return
        }

        const profileUrl = `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=plan,trial_ends_at`
        const profileRes = await fetch(profileUrl, {
          method: 'GET',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Cache-Control': 'no-store',
            Pragma: 'no-cache',
          },
          cache: 'no-store',
        })

        if (cancelled) return

        if (!profileRes.ok) {
          setGateReady(true)
          return
        }

        const rows = (await profileRes.json()) as Array<{
          plan?: string | null
          trial_ends_at?: string | null
        }>
        const profile = Array.isArray(rows) ? rows[0] : null

        const plan =
          typeof profile?.plan === 'string' ? profile.plan.trim().toLowerCase() : ''
        const trialEndsAt =
          typeof profile?.trial_ends_at === 'string'
            ? profile.trial_ends_at.trim()
            : ''

        const stripeSuccess = searchParams.get('stripe') === 'success'
        if (!stripeSuccess && (trialEndsAt || (plan && plan !== 'free'))) {
          router.push('/')
          return
        }

        setGateReady(true)
      } catch {
        if (!cancelled) setGateReady(true)
      }
    }

    void checkEligibility()
    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  const activateSupabaseTrial = async (plan: 'professional' | 'team') => {
    await fetch('/api/trial/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ plan }),
    })
    router.push('/')
  }

  const startTrialCheckout = async (plan: 'professional' | 'team') => {
    setLoading(plan)
    try {
      const res = await fetch('/api/stripe/trial-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ plan }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        console.error(data.error ?? 'Could not start trial checkout')
        setLoading(null)
        return
      }
      window.location.href = data.url
    } catch (e) {
      console.error(e)
      setLoading(null)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // no-op: always route home
    }
    router.push('/')
  }

  useEffect(() => {
    if (!gateReady) return
    const stripeResult = searchParams.get('stripe')
    const planRaw = searchParams.get('plan')
    if (stripeResult !== 'success') return
    const plan: 'professional' | 'team' | null =
      planRaw === 'professional' ? 'professional' : planRaw === 'team' ? 'team' : null
    if (!plan) return
    if (loading) return
    setLoading(plan)
    void activateSupabaseTrial(plan)
  }, [gateReady, loading, searchParams])

  if (!gateReady) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ backgroundColor: '#172035' }}
      >
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" aria-hidden />
        <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading…</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#172035' }}>
      <MarketingHeroAmbient />
      <header className="border-b border-[var(--border)] bg-[var(--sidebar-bg)]">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 relative z-[1]">
          <a href="/" className="inline-flex items-center gap-2 no-underline">
            <img
              src="/icon2.png"
              alt=""
              className="h-7 w-7 object-contain"
            />
            <span className="text-sm font-semibold text-[var(--text-primary)] tracking-[-0.02em]">
              Handover
            </span>
          </a>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="relative z-[1] mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-12 md:py-16">
      <div className="max-w-2xl w-full text-center mb-10">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">Welcome to Handover</h1>
        <p className="text-[var(--text-secondary)] text-base">Choose a plan to start your 14-day free trial.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Professional */}
        <button
          type="button"
          onClick={() => startTrialCheckout('professional')}
          disabled={loading !== null}
          className="text-left rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-8 transition-all duration-300 hover:border-[var(--accent)] disabled:opacity-50"
        >
          <div className="text-[#0EA5E9] font-semibold text-sm uppercase tracking-wide mb-2">Professional</div>
          <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">£29<span className="text-base font-normal text-[var(--text-secondary)]">/mo after trial</span></div>
          <div className="text-[var(--text-secondary)] text-sm mt-3 space-y-1">
            <p>✓ Solo use</p>
            <p>✓ 200 generations/month</p>
            <p>✓ HaloPSA + ConnectWise</p>
            <p>✓ Excel export + PSA pushback</p>
          </div>
          <div className="mt-6 w-full rounded-xl bg-[#0EA5E9] py-3 text-center text-sm font-semibold text-white">
            {loading === 'professional' ? 'Redirecting to checkout...' : 'Start Professional Trial →'}
          </div>
        </button>

        {/* Team */}
        <button
          type="button"
          onClick={() => startTrialCheckout('team')}
          disabled={loading !== null}
          className="text-left rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-8 transition-all duration-300 hover:border-purple-500/70 disabled:opacity-50"
        >
          <div className="text-purple-400 font-semibold text-sm uppercase tracking-wide mb-2">Team</div>
          <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">£79<span className="text-base font-normal text-[var(--text-secondary)]">/mo after trial</span></div>
          <div className="text-[var(--text-secondary)] text-sm mt-3 space-y-1">
            <p>✓ Up to 5 users</p>
            <p>✓ 200 generations/month per user</p>
            <p>✓ Up to 1,000 generations/month for teams of 5</p>
            <p>✓ Shared PSA connection</p>
            <p>✓ White label + custom branding</p>
          </div>
          <div className="mt-6 w-full rounded-xl bg-purple-600 py-3 text-center text-sm font-semibold text-white">
            {loading === 'team' ? 'Redirecting to checkout...' : 'Start Team Trial →'}
          </div>
        </button>
      </div>

      <p className="text-[12px] text-[var(--text-secondary)] text-center mt-3">
        🔒 Cancel anytime before your trial ends and you won&apos;t be charged. No commitment.
      </p>
      </main>
    </div>
  )
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WelcomePageInner />
    </Suspense>
  )
}
