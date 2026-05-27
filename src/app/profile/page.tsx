'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import RadarChart from '@/components/RadarChart'
import type { TrackProgress, Language, LearnerPillars } from '@/types/learner'

const PILLAR_AVERAGE = (p: LearnerPillars) => {
  const vals = Object.values(p)
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

function ProfileInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('sessionId')

  const [loading, setLoading] = useState(true)
  const [name, setName] = useState<string | null>(null)
  const [objective, setObjective] = useState('')
  const [dnaType, setDnaType] = useState<string | null>(null)
  const [language, setLanguage] = useState<Language>('en')
  const [tracks, setTracks] = useState<TrackProgress[]>([])

  useEffect(() => {
    if (!sessionId) { router.push('/'); return }
    fetch(`/api/profile?sessionId=${sessionId}`)
      .then(r => r.json())
      .then(d => {
        setName(d.name ?? null)
        setObjective(d.objective ?? '')
        setDnaType(d.dnaType ?? null)
        setLanguage(d.language ?? 'en')
        setTracks(d.tracks ?? [])
      })
      .finally(() => setLoading(false))
  }, [sessionId, router])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#08090F] flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#F94716]/40 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
          ))}
        </div>
      </main>
    )
  }

  const isEn = language === 'en'

  return (
    <main className="min-h-screen bg-[#08090F] px-6 py-16">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => router.back()}
            className="text-[#888888]/50 text-sm hover:text-[#888888] transition-colors mb-8 block"
          >
            ← {isEn ? 'Back' : 'Voltar'}
          </button>
          {name && (
            <p className="text-[#888888] text-sm mb-1">
              {isEn ? 'Learning profile for' : 'Perfil de aprendizado de'}
            </p>
          )}
          <h1 className="text-[#F0F0F5] text-3xl font-light">
            {name ?? (isEn ? 'Your profile' : 'Seu perfil')}
          </h1>
          {objective && (
            <p className="text-[#888888] text-sm mt-3 max-w-lg leading-relaxed">{objective}</p>
          )}
        </div>

        {/* Tracks */}
        {tracks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#888888] text-sm">
              {isEn
                ? 'No tracks yet. Connect your CEFIS account during onboarding to see your progress here.'
                : 'Nenhuma trilha ainda. Conecte sua conta CEFIS no onboarding para acompanhar seu progresso aqui.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {tracks.map(track => (
              <div key={track.trackId} className="bg-[#141414] border border-[#888888]/10 rounded-3xl p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-[#F0F0F5] text-base font-medium">{track.trackName}</h2>
                    <p className="text-[#888888] text-xs mt-1">
                      {isEn
                        ? `${track.totalSessionsCompleted} session${track.totalSessionsCompleted !== 1 ? 's' : ''} · ${track.coursesCompleted.length} course${track.coursesCompleted.length !== 1 ? 's' : ''} done`
                        : `${track.totalSessionsCompleted} sessão(ões) · ${track.coursesCompleted.length} curso(s) concluído(s)`}
                    </p>
                  </div>
                  <span className="text-[#F94716] text-xl font-light">
                    {PILLAR_AVERAGE(track.pillars)}%
                  </span>
                </div>
                <RadarChart
                  pillars={track.pillars}
                  label=""
                  language={language}
                  size={240}
                />
              </div>
            ))}
          </div>
        )}

        {/* Study CTA */}
        <div className="mt-14 pt-10 border-t border-[#888888]/10 flex justify-between items-center">
          <p className="text-[#888888] text-sm">
            {isEn ? 'Keep the momentum going.' : 'Continue avançando.'}
          </p>
          <button
            onClick={() => sessionId && router.push(`/study/${sessionId}`)}
            className="text-[#F94716] text-sm hover:opacity-80 transition-opacity"
          >
            {isEn ? 'Continue studying →' : 'Continuar estudando →'}
          </button>
        </div>

      </div>
    </main>
  )
}

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileInner />
    </Suspense>
  )
}
