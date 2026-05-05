'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function WelcomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    const checkEligibility = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.id) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, trial_ends_at')
        .eq('id', user.id)
        .maybeSingle()

      const plan = typeof profile?.plan === 'string' ? profile.plan.trim().toLowerCase() : ''
      const trialEndsAt =
        typeof profile?.trial_ends_at === 'string' ? profile.trial_ends_at.trim() : ''

      if (trialEndsAt || (plan && plan !== 'free')) {
        router.push('/')
      }
    }

    void checkEligibility()
  }, [router])

  const startTrial = async (plan: 'professional' | 'team') => {
    setLoading(plan)
    await fetch('/api/trial/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ plan }),
    })
    router.push('/')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#080D14' }}>
      <div className="max-w-2xl w-full text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-3">Welcome to Handover</h1>
        <p className="text-[var(--text-secondary)] text-base">Choose a plan to start your 14-day free trial. No credit card required.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Professional */}
        <button
          type="button"
          onClick={() => startTrial('professional')}
          disabled={loading !== null}
          className="text-left rounded-2xl border border-white/[0.10] bg-white/[0.04] backdrop-blur-md p-8 hover:border-[#0EA5E9]/50 hover:bg-white/[0.06] transition-all duration-300 disabled:opacity-50"
        >
          <div className="text-[#0EA5E9] font-semibold text-sm uppercase tracking-wide mb-2">Professional</div>
          <div className="text-2xl font-bold text-white mb-1">£29<span className="text-base font-normal text-white/50">/mo after trial</span></div>
          <div className="text-white/60 text-sm mt-3 space-y-1">
            <p>✓ Solo use</p>
            <p>✓ 200 generations/month</p>
            <p>✓ HaloPSA + ConnectWise</p>
            <p>✓ Excel export + PSA pushback</p>
          </div>
          <div className="mt-6 w-full rounded-xl bg-[#0EA5E9] py-3 text-center text-sm font-semibold text-white">
            {loading === 'professional' ? 'Starting...' : 'Start Professional Trial →'}
          </div>
        </button>

        {/* Team */}
        <button
          type="button"
          onClick={() => startTrial('team')}
          disabled={loading !== null}
          className="text-left rounded-2xl border border-purple-500/30 bg-white/[0.04] backdrop-blur-md p-8 hover:border-purple-500/60 hover:bg-white/[0.06] transition-all duration-300 disabled:opacity-50"
        >
          <div className="text-purple-400 font-semibold text-sm uppercase tracking-wide mb-2">Team</div>
          <div className="text-2xl font-bold text-white mb-1">£79<span className="text-base font-normal text-white/50">/mo after trial</span></div>
          <div className="text-white/60 text-sm mt-3 space-y-1">
            <p>✓ Up to 5 users</p>
            <p>✓ Unlimited generations</p>
            <p>✓ Shared PSA connection</p>
            <p>✓ White label + custom branding</p>
          </div>
          <div className="mt-6 w-full rounded-xl bg-purple-600 py-3 text-center text-sm font-semibold text-white">
            {loading === 'team' ? 'Starting...' : 'Start Team Trial →'}
          </div>
        </button>
      </div>

      <p className="mt-8 text-white/30 text-xs">14-day free trial. Cancel anytime. No credit card required.</p>
    </div>
  )
}
