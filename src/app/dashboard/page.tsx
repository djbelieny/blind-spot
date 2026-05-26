'use client'
import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ConstellationBackground from '@/components/onboarding/ConstellationBackground'
import RadarChart from '@/components/RadarChart'
import type { LearnerProfile, TrackProgress, Language } from '@/types/learner'

interface DashUser {
  id: string
  name?: string
  email: string
  cefisName?: string
  cefisEmail?: string
  cefisTrackIds?: string[]
  sessionIds: string[]
}

function Dots() {
  return (
    <div className="flex gap-1.5 justify-center py-12">
      {[0,1,2].map(i => (
        <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#F5A623]/40 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
      ))}
    </div>
  )
}

function DashboardInner() {
  const router = useRouter()

  const [user, setUser] = useState<DashUser | null>(null)
  const [profile, setProfile] = useState<LearnerProfile | null>(null)
  const [tracks, setTracks] = useState<TrackProgress[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState<Language>('en')

  // CEFIS connect form state
  const [showCefisForm, setShowCefisForm] = useState(false)
  const [cefisEmail, setCefisEmail] = useState('')
  const [cefisPassword, setCefisPassword] = useState('')
  const [cefisLoading, setCefisLoading] = useState(false)
  const [cefisError, setCefisError] = useState('')

  // "Learn today" input
  const [learnInput, setLearnInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const isEn = language === 'en'

  useEffect(() => {
    let sessionId: string | null = null

    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(async (u: DashUser | null) => {
        if (!u) { router.push('/auth/login'); return }
        setUser(u)

        // Use most recent session
        sessionId = u.sessionIds?.[0] ?? null
        if (!sessionId) { setLoading(false); return }

        const [profRes, tracksRes] = await Promise.all([
          fetch(`/api/study/profile?sessionId=${sessionId}`).then(r => r.ok ? r.json() : null),
          fetch(`/api/profile?sessionId=${sessionId}`).then(r => r.ok ? r.json() : null),
        ])

        if (profRes) {
          setProfile(profRes)
          setLanguage(profRes.language ?? 'en')
        }
        if (tracksRes?.tracks) setTracks(tracksRes.tracks)

        // Fetch AI suggestions async (don't block render)
        fetch(`/api/dashboard/suggestions?sessionId=${sessionId}`)
          .then(r => r.ok ? r.json() : { suggestions: [] })
          .then(d => setSuggestions(d.suggestions ?? []))
          .catch(() => {})
      })
      .catch(() => router.push('/auth/login'))
      .finally(() => setLoading(false))
  }, [router])

  const handleLearnSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = learnInput.trim()
    if (!q) return
    const sessionId = user?.sessionIds?.[0]
    if (sessionId) {
      router.push(`/study/${sessionId}?q=${encodeURIComponent(q)}`)
    } else {
      router.push(`/onboarding?q=${encodeURIComponent(q)}`)
    }
  }

  const handleSuggestionClick = (s: string) => {
    const sessionId = user?.sessionIds?.[0]
    if (sessionId) {
      router.push(`/study/${sessionId}?q=${encodeURIComponent(s)}`)
    }
  }

  const handleCefisConnect = async () => {
    setCefisError('')
    setCefisLoading(true)
    const sessionId = user?.sessionIds?.[0]
    try {
      const res = await fetch('/api/auth/cefis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, email: cefisEmail, password: cefisPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCefisError(isEn ? 'Incorrect email or password.' : 'Email ou senha incorretos.')
      } else {
        // Refresh user data
        const me = await fetch('/api/auth/me').then(r => r.json())
        setUser(me)
        setShowCefisForm(false)
        // Refresh tracks
        if (sessionId) {
          fetch(`/api/profile?sessionId=${sessionId}`)
            .then(r => r.json())
            .then(d => setTracks(d.tracks ?? []))
            .catch(() => {})
        }
      }
    } catch {
      setCefisError(isEn ? 'Something went wrong.' : 'Algo deu errado.')
    } finally {
      setCefisLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0C14] flex items-center justify-center">
        <Dots />
      </main>
    )
  }

  const topBlindSpots = profile?.blindSpotsIdentified?.slice(0, 3) ?? []
  const sessionId = user?.sessionIds?.[0]

  return (
    <main className="min-h-screen bg-[#0A0C14]">
      <ConstellationBackground nodeCount={20} />
      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-start justify-between mb-12">
          <div>
            <p className="text-[#F5A623] text-xs uppercase tracking-widest mb-1">Blind Spot</p>
            <h1 className="text-[#F0F0F5] text-2xl font-light">
              {user?.name
                ? (isEn ? `Welcome back, ${user.name}.` : `Bem-vindo, ${user.name}.`)
                : (isEn ? 'Welcome back.' : 'Bem-vindo de volta.')}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-[#8A8FA8]/40 text-xs hover:text-[#8A8FA8] transition-colors mt-1"
          >
            {isEn ? 'Sign out' : 'Sair'}
          </button>
        </div>

        {/* ── Section A: What would you like to learn today? ── */}
        <div className="mb-10">
          <form onSubmit={handleLearnSubmit} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={learnInput}
              onChange={e => setLearnInput(e.target.value)}
              placeholder={isEn ? 'What would you like to learn today?' : 'O que você quer aprender hoje?'}
              className="w-full bg-transparent text-[#F0F0F5] text-lg placeholder-[#8A8FA8]/40 border-b border-[#8A8FA8]/20 focus:border-[#F5A623]/50 outline-none pb-3 transition-colors pr-16"
            />
            {learnInput && (
              <button
                type="submit"
                className="absolute right-0 bottom-3 text-[#F5A623]/80 text-sm hover:text-[#F5A623] transition-colors"
              >
                {isEn ? 'Go →' : 'Ir →'}
              </button>
            )}
          </form>

          {/* Suggestion chips */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(s)}
                  className="text-[#8A8FA8] text-xs border border-[#8A8FA8]/15 rounded-full px-3 py-1.5 hover:border-[#F5A623]/40 hover:text-[#F0F0F5] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Section B: Progress snapshot ── */}
        {topBlindSpots.length > 0 && (
          <div className="bg-[#0D1117] border border-[#8A8FA8]/10 rounded-3xl p-6 mb-4">
            <p className="text-[#8A8FA8] text-xs uppercase tracking-widest mb-5">
              {isEn ? "What we're working on" : 'O que estamos trabalhando'}
            </p>
            <div className="space-y-4">
              {topBlindSpots.map((bs, i) => (
                <div key={bs.id} className="flex gap-3 items-start">
                  <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${i === 0 ? 'bg-[#F5A623]' : 'bg-[#8A8FA8]/30'}`} />
                  <div>
                    <p className="text-[#F0F0F5] text-sm font-medium">{bs.name}</p>
                    <p className="text-[#8A8FA8] text-xs leading-relaxed mt-0.5">{bs.impact}</p>
                  </div>
                </div>
              ))}
            </div>
            {sessionId && (
              <button
                onClick={() => router.push(`/study/${sessionId}`)}
                className="mt-6 text-[#F5A623] text-sm hover:opacity-80 transition-opacity"
              >
                {isEn ? 'Continue studying →' : 'Continuar estudando →'}
              </button>
            )}
          </div>
        )}

        {/* ── CEFIS tracks (if connected) ── */}
        {tracks.length > 0 && (
          <div className="bg-[#0D1117] border border-[#8A8FA8]/10 rounded-3xl p-6 mb-4">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[#8A8FA8] text-xs uppercase tracking-widest">
                {isEn ? 'Your CEFIS progress' : 'Seu progresso CEFIS'}
              </p>
              <button
                onClick={() => router.push(`/profile?sessionId=${sessionId}`)}
                className="text-[#8A8FA8]/50 text-xs hover:text-[#8A8FA8] transition-colors"
              >
                {isEn ? 'Full profile →' : 'Perfil completo →'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {tracks.slice(0, 4).map(track => (
                <RadarChart key={track.trackId} pillars={track.pillars} label={track.trackName} language={language} size={200} />
              ))}
            </div>
          </div>
        )}

        {/* ── Section C: CEFIS connect card ── */}
        {!user?.cefisEmail && (
          <div className="border border-dashed border-[#F5A623]/20 rounded-3xl p-6 mb-4">
            {!showCefisForm ? (
              <>
                <p className="text-[#F0F0F5] text-sm font-medium mb-1">
                  {isEn ? 'Have a CEFIS account?' : 'Tem conta no CEFIS?'}
                </p>
                <p className="text-[#8A8FA8] text-xs leading-relaxed mb-4">
                  {isEn
                    ? 'Connect it to study from your existing courses and track your real progress.'
                    : 'Conecte para estudar com seus cursos existentes e acompanhar seu progresso real.'}
                </p>
                <button
                  onClick={() => setShowCefisForm(true)}
                  className="text-[#F5A623] text-sm hover:opacity-80 transition-opacity"
                >
                  {isEn ? 'Connect CEFIS →' : 'Conectar CEFIS →'}
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-[#F0F0F5] text-sm font-medium mb-3">
                  {isEn ? 'Connect your CEFIS account' : 'Conectar conta CEFIS'}
                </p>
                <input
                  autoFocus
                  type="email"
                  value={cefisEmail}
                  onChange={e => setCefisEmail(e.target.value)}
                  placeholder={isEn ? 'CEFIS email' : 'Email do CEFIS'}
                  className="w-full bg-[#0A0C14] border border-[#8A8FA8]/12 rounded-2xl px-4 py-3 text-[#F0F0F5] placeholder-[#8A8FA8]/30 text-sm outline-none focus:border-[#8A8FA8]/30"
                />
                <input
                  type="password"
                  value={cefisPassword}
                  onChange={e => setCefisPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCefisConnect() }}
                  placeholder={isEn ? 'Password' : 'Senha'}
                  className="w-full bg-[#0A0C14] border border-[#8A8FA8]/12 rounded-2xl px-4 py-3 text-[#F0F0F5] placeholder-[#8A8FA8]/30 text-sm outline-none focus:border-[#8A8FA8]/30"
                />
                {cefisError && <p className="text-red-400/80 text-xs">{cefisError}</p>}
                <div className="flex justify-between items-center pt-1">
                  <button
                    onClick={() => setShowCefisForm(false)}
                    className="text-[#8A8FA8]/50 text-xs hover:text-[#8A8FA8] transition-colors"
                  >
                    {isEn ? 'Cancel' : 'Cancelar'}
                  </button>
                  <button
                    onClick={handleCefisConnect}
                    disabled={cefisLoading || !cefisEmail || !cefisPassword}
                    className="text-[#F5A623] text-sm hover:opacity-80 transition-opacity disabled:opacity-30"
                  >
                    {cefisLoading ? (isEn ? 'Connecting…' : 'Conectando…') : (isEn ? 'Connect →' : 'Conectar →')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* First time — no session yet */}
        {!sessionId && (
          <div className="text-center py-8">
            <p className="text-[#8A8FA8] text-sm mb-4">
              {isEn ? "Tell us what you want to learn to get started." : "Nos diga o que quer aprender para começar."}
            </p>
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
