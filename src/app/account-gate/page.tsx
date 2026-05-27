'use client'
import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ConstellationBackground from '@/components/onboarding/ConstellationBackground'

function AccountGateInner() {
  const params = useSearchParams()
  const router = useRouter()
  const sessionId = params.get('sessionId') ?? ''

  return (
    <main className="min-h-screen bg-[#08090F] flex items-center justify-center">
      <ConstellationBackground nodeCount={20} />
      <div className="relative z-10 w-full max-w-md px-6 text-center">
        <p className="text-[#F94716] text-xs uppercase tracking-widest mb-3">Blind Spot</p>
        <h1 className="text-[#F0F0F5] text-2xl font-light mb-3">Save your Blind Spot map</h1>
        <p className="text-[#888888] text-sm mb-8 leading-relaxed">
          Your diagnosis, fixed examples, and next steps are ready.<br />
          Create a profile so Blind Spot can keep adapting to you.
        </p>

        <div className="space-y-3 mb-6 text-left bg-[#141414] border border-[#888888]/10 rounded-2xl p-5">
          <p className="text-[#888888] text-xs uppercase tracking-widest mb-3">What gets saved</p>
          {[
            'Diagnostic history and blind spots',
            'Personalized study plan',
            'Tutor memory and learning profile',
            'Progress and checkpoint scores',
          ].map(item => (
            <div key={item} className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34C785] flex-shrink-0" />
              <span className="text-[#F0F0F5] text-sm">{item}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push(`/dashboard?sessionId=${sessionId}`)}
            className="w-full flex items-center justify-center gap-3 bg-[#F0F0F5] text-[#08090F] font-medium py-3 px-6 rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            Continue with Google
          </button>
          <button
            onClick={() => router.push(`/dashboard?sessionId=${sessionId}`)}
            className="w-full border border-[#888888]/20 text-[#F0F0F5] font-medium py-3 px-6 rounded-xl hover:border-[#F94716]/40 transition-colors text-sm"
          >
            Continue with email
          </button>
          <button
            onClick={() => router.push(`/dashboard?sessionId=${sessionId}`)}
            className="w-full text-[#888888] py-2.5 px-6 text-sm hover:text-[#F0F0F5] transition-colors"
          >
            Continue as guest →
          </button>
        </div>

        <p className="text-[#888888]/40 text-xs mt-6">
          No dark patterns. Your progress is preserved either way.
        </p>
      </div>
    </main>
  )
}

export default function AccountGatePage() {
  return (
    <Suspense>
      <AccountGateInner />
    </Suspense>
  )
}
