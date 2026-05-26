'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ConstellationBackground from '@/components/onboarding/ConstellationBackground'

function DashboardInner() {
  const params = useSearchParams()
  const sessionId = params.get('sessionId')

  return (
    <main className="min-h-screen bg-[#0A0C14]">
      <ConstellationBackground nodeCount={25} />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-[#F5A623] text-sm uppercase tracking-widest mb-2">Blind Spot</h1>
          <p className="text-[#F0F0F5] text-2xl font-light">Your learning map</p>
        </div>

        {sessionId ? (
          <div className="space-y-4">
            <div className="bg-[#0D1117] border border-[#F5A623]/20 rounded-2xl p-6">
              <p className="text-[#8A8FA8] text-xs uppercase tracking-widest mb-2">Next action</p>
              <p className="text-[#F0F0F5] text-lg mb-4">Continue your study session</p>
              <Link
                href={`/study/${sessionId}`}
                className="inline-block bg-[#F5A623] text-[#0A0C14] font-medium px-6 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm"
              >
                Continue →
              </Link>
            </div>

            <div className="bg-[#0D1117] border border-[#8A8FA8]/10 rounded-2xl p-6">
              <p className="text-[#8A8FA8] text-xs uppercase tracking-widest mb-3">Bring a problem</p>
              <textarea
                placeholder="Paste a question, problem, or concept you're stuck on..."
                className="w-full bg-transparent text-[#F0F0F5] placeholder-[#8A8FA8]/50 text-sm outline-none resize-none min-h-[80px]"
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-[#8A8FA8] mb-6">Start by telling us what you want to learn.</p>
            <Link
              href="/"
              className="inline-block border border-[#F5A623]/50 text-[#F5A623] px-6 py-3 rounded-xl hover:bg-[#F5A623]/5 transition-colors text-sm"
            >
              Find my blind spots →
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardInner />
    </Suspense>
  )
}
