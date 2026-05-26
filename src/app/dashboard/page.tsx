'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ConstellationBackground from '@/components/onboarding/ConstellationBackground'
import type { LearnerProfile } from '@/types/learner'

function DashboardInner() {
  const params = useSearchParams()
  const sessionId = params.get('sessionId')
  const [profile, setProfile] = useState<LearnerProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) { setLoading(false); return }
    fetch(`/api/study/profile?sessionId=${sessionId}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: LearnerProfile | null) => {
        setProfile(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [sessionId])

  const topBlindSpot = profile?.blindSpotsIdentified?.[0] ?? null

  return (
    <main className="min-h-screen bg-[#0A0C14]">
      <ConstellationBackground nodeCount={25} />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-[#F5A623] text-sm uppercase tracking-widest mb-2">Blind Spot</h1>
          <p className="text-[#F0F0F5] text-2xl font-light">Your learning map</p>
        </div>

        {!sessionId ? (
          <div className="text-center py-12">
            <p className="text-[#8A8FA8] mb-6">Start by telling us what you want to learn.</p>
            <Link
              href="/"
              className="inline-block border border-[#F5A623]/50 text-[#F5A623] px-6 py-3 rounded-xl hover:bg-[#F5A623]/5 transition-colors text-sm"
            >
              Find my blind spots →
            </Link>
          </div>
        ) : loading ? (
          <div className="flex gap-1 px-4 py-12 justify-center">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[#F5A623]/40 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Next Action CTA */}
            <div className="bg-[#0D1117] border border-[#F5A623]/20 rounded-2xl p-6">
              <p className="text-[#8A8FA8] text-xs uppercase tracking-widest mb-1">Next action</p>
              <p className="text-[#F0F0F5] text-lg mb-4">
                {topBlindSpot
                  ? `Fix: ${topBlindSpot.name}`
                  : 'Continue your study session'}
              </p>
              <Link
                href={`/study/${sessionId}`}
                className="inline-block bg-[#F5A623] text-[#0A0C14] font-medium px-6 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm"
              >
                Start studying →
              </Link>
            </div>

            {/* Blind Spots List */}
            {profile?.blindSpotsIdentified && profile.blindSpotsIdentified.length > 0 && (
              <div className="bg-[#0D1117] border border-[#8A8FA8]/10 rounded-2xl p-6">
                <p className="text-[#8A8FA8] text-xs uppercase tracking-widest mb-4">Your blind spots</p>
                <div className="space-y-4">
                  {profile.blindSpotsIdentified.map((bs, i) => (
                    <div key={bs.id} className="flex gap-3 items-start">
                      <div className="mt-1.5 w-2 h-2 rounded-full bg-[#F5A623] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[#F0F0F5] text-sm font-medium">{bs.name}</span>
                          <span className="text-[#F5A623] text-xs">{bs.confidence}%</span>
                          {i === 0 && (
                            <span className="text-[#34C785] text-xs border border-[#34C785]/30 rounded px-1.5">top priority</span>
                          )}
                        </div>
                        <p className="text-[#8A8FA8] text-xs leading-relaxed">{bs.evidence}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Study Plan */}
            {profile?.recommendedCourseIds && profile.recommendedCourseIds.length > 0 && (
              <div className="bg-[#0D1117] border border-[#8A8FA8]/10 rounded-2xl p-6">
                <p className="text-[#8A8FA8] text-xs uppercase tracking-widest mb-4">Study plan</p>
                <div className="space-y-2">
                  {profile.recommendedCourseIds.map((courseId, i) => (
                    <div key={courseId} className="flex gap-3 items-center">
                      <span className="text-[#8A8FA8] text-xs w-5 text-right">{i + 1}.</span>
                      <span className="text-[#F0F0F5] text-sm truncate">{courseId}</span>
                      {i === 0 && (
                        <span className="ml-auto text-[#34C785] text-xs flex-shrink-0">current</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Objective */}
            {profile?.objective && (
              <div className="bg-[#0D1117] border border-[#8A8FA8]/10 rounded-2xl p-6">
                <p className="text-[#8A8FA8] text-xs uppercase tracking-widest mb-2">Your objective</p>
                <p className="text-[#F0F0F5] text-sm leading-relaxed">{profile.objective}</p>
                {profile.minutesPerDay > 0 && (
                  <p className="text-[#8A8FA8] text-xs mt-2">{profile.minutesPerDay} min/day</p>
                )}
              </div>
            )}
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
