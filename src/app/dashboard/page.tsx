'use client'
import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ConstellationBackground from '@/components/onboarding/ConstellationBackground'
import RadarChart from '@/components/RadarChart'
import type { LearnerProfile, TrackProgress, Language, LearnerPillars, StudyTopic, QuizQuestion } from '@/types/learner'

interface DashUser {
  id: string
  name?: string
  email: string
  cefisName?: string
  cefisEmail?: string
  cefisTrackIds?: string[]
  sessionIds: string[]
}

interface PendingQuiz {
  topicName: string
  questions: QuizQuestion[]
  startedAt: number
}

const DNA_META: Record<string, { symbol: string; en: { name: string; tagline: string }; pt: { name: string; tagline: string } }> = {
  explorador: { symbol: '◎', en: { name: 'Practical Explorer', tagline: 'You learn by doing, not by reading.' },           pt: { name: 'Explorador Prático',  tagline: 'Você aprende fazendo, não lendo.' } },
  absorvedor: { symbol: '◈', en: { name: 'Visual Absorber',    tagline: 'You retain what you can picture.' },               pt: { name: 'Absorvedor Visual',    tagline: 'Você retém o que consegue visualizar.' } },
  construtor: { symbol: '▦', en: { name: 'Methodical Builder', tagline: 'You need structure to move forward.' },            pt: { name: 'Construtor Metódico',  tagline: 'Você precisa de estrutura para avançar.' } },
  conector:   { symbol: '⬡', en: { name: 'Conceptual Connector', tagline: 'You need the "why" before the "how".' },        pt: { name: 'Conector Conceitual',  tagline: 'Você precisa do "porquê" antes do "como".' } },
  sprint:     { symbol: '⚡', en: { name: 'Intense Sprinter',   tagline: 'Short focus, high intensity — you peak fast.' },  pt: { name: 'Sprint Intenso',       tagline: 'Foco curto, alta intensidade.' } },
}

const PERSONA_META: Record<string, { en: string; pt: string; icon: string }> = {
  direto:      { en: 'Direct',     pt: 'Direto',      icon: '→' },
  encorajador: { en: 'Supportive', pt: 'Encorajador', icon: '◉' },
  socratico:   { en: 'Socratic',   pt: 'Socrático',   icon: '?' },
}

function Dots() {
  return (
    <div className="flex gap-1.5 justify-center py-12">
      {[0,1,2].map(i => (
        <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]/40 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
      ))}
    </div>
  )
}

function ProfileStrip({ profile, isEn }: { profile: LearnerProfile; isEn: boolean }) {
  const dna = profile.dnaType ? DNA_META[profile.dnaType] : null
  const persona = profile.persona ? PERSONA_META[profile.persona] : null
  if (!dna) return null

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#7C3AED]/12 bg-gradient-to-r from-[#7C3AED]/5 to-transparent px-7 py-5 flex items-center gap-5 mb-8">
      <span className="text-3xl text-[#7C3AED] leading-none flex-shrink-0">{dna.symbol}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[#8A8FA8] text-[10px] uppercase tracking-widest mb-0.5">
          {isEn ? 'Learning DNA' : 'DNA de aprendizado'}
        </p>
        <p className="text-[#F0F0F5] text-base font-light leading-tight truncate">
          {isEn ? dna.en.name : dna.pt.name}
          <span className="text-[#8A8FA8] ml-2 text-sm">— {isEn ? dna.en.tagline : dna.pt.tagline}</span>
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {persona && (
          <span className="flex items-center gap-1 border border-[#8A8FA8]/15 rounded-full px-3 py-1 text-xs text-[#F0F0F5]">
            <span className="text-[#7C3AED]">{persona.icon}</span>
            {isEn ? persona.en : persona.pt}
          </span>
        )}
        {profile.minutesPerDay > 0 && (
          <span className="flex items-center gap-1 border border-[#8A8FA8]/15 rounded-full px-3 py-1 text-xs text-[#8A8FA8]">
            ◷ {profile.minutesPerDay}{isEn ? 'min/day' : 'min/dia'}
          </span>
        )}
      </div>
      <span className="absolute right-5 top-2 text-[72px] leading-none text-[#7C3AED]/4 select-none pointer-events-none">
        {dna.symbol}
      </span>
    </div>
  )
}

// ─── Topic quiz card (inline) ──────────────────────────────────────────────────

function TopicQuizCard({
  quiz, isEn, onSubmit, onCancel, submitting,
}: {
  quiz: PendingQuiz
  isEn: boolean
  onSubmit: (answers: Record<string, string>) => void
  onCancel: () => void
  submitting: boolean
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const allAnswered = quiz.questions.length > 0 && quiz.questions.every(q => answers[q.id])

  return (
    <div className="bg-[#0E0F1A] border border-[#7C3AED]/15 rounded-3xl p-7 flex flex-col gap-6">
      <div>
        <p className="text-[#8A8FA8] text-[10px] uppercase tracking-widest mb-2">
          {isEn ? 'Quick knowledge check' : 'Verificação rápida'}
        </p>
        <h3 className="text-[#F0F0F5] text-lg font-medium leading-snug">{quiz.topicName}</h3>
        <p className="text-[#8A8FA8] text-xs mt-2 leading-relaxed">
          {isEn
            ? 'Answer these to help us identify your specific blind spots.'
            : 'Responda para identificarmos seus pontos cegos específicos.'}
        </p>
      </div>

      <div className="space-y-6">
        {quiz.questions.map((q, qi) => (
          <div key={q.id}>
            <p className="text-[#F0F0F5] text-sm font-medium mb-3 leading-snug">
              {qi + 1}. {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all border ${
                    answers[q.id] === opt
                      ? 'border-[#7C3AED]/50 bg-[#7C3AED]/8 text-[#F0F0F5]'
                      : 'border-[#8A8FA8]/12 text-[#8A8FA8] hover:border-[#8A8FA8]/30 hover:text-[#F0F0F5]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button onClick={onCancel} className="text-[#8A8FA8]/50 text-xs hover:text-[#8A8FA8] transition-colors">
          {isEn ? 'Cancel' : 'Cancelar'}
        </button>
        <button
          onClick={() => onSubmit(answers)}
          disabled={!allAnswered || submitting}
          className="text-[#7C3AED] text-sm hover:opacity-80 transition-opacity disabled:opacity-30"
        >
          {submitting
            ? (isEn ? 'Analyzing…' : 'Analisando…')
            : (isEn ? 'Analyze my knowledge →' : 'Analisar meu conhecimento →')}
        </button>
      </div>
    </div>
  )
}

// ─── Topic card ────────────────────────────────────────────────────────────────

function TopicCard({
  topic, isEn, language, onStudy,
}: {
  topic: StudyTopic
  isEn: boolean
  language: Language
  onStudy: (topic: StudyTopic) => void
}) {
  const blindSpots = topic.blindSpots.slice(0, 3)
  const hasProgress = Object.values(topic.pillars).some(v => v > 5)

  return (
    <div className="bg-[#0E0F1A] border border-[#8A8FA8]/10 rounded-3xl p-7 flex flex-col gap-6">
      <h3 className="text-[#F0F0F5] text-lg font-medium leading-snug line-clamp-2">{topic.name}</h3>

      {blindSpots.length > 0 && (
        <div>
          <p className="text-[#8A8FA8] text-[10px] uppercase tracking-widest mb-4">
            {isEn ? "What we're working on" : 'O que estamos trabalhando'}
          </p>
          <div className="space-y-4">
            {blindSpots.map((bs, i) => (
              <div key={bs.id} className="flex gap-3 items-start">
                <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${i === 0 ? 'bg-[#7C3AED]' : 'bg-[#8A8FA8]/25'}`} />
                <div>
                  <p className="text-[#F0F0F5] text-sm font-medium leading-snug">{bs.name}</p>
                  <p className="text-[#8A8FA8] text-xs leading-relaxed mt-1">{bs.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <RadarChart
          pillars={topic.pillars}
          label={hasProgress ? (isEn ? 'Your progress' : 'Seu progresso') : (isEn ? 'Starting point' : 'Ponto de partida')}
          language={language}
          size={220}
        />
      </div>

      <button
        onClick={() => onStudy(topic)}
        className="text-[#7C3AED] text-sm hover:opacity-80 transition-opacity self-start"
      >
        {isEn ? 'Continue studying →' : 'Continuar estudando →'}
      </button>
    </div>
  )
}

function TopicCardSkeleton() {
  return (
    <div className="bg-[#0E0F1A] border border-[#8A8FA8]/10 rounded-3xl p-7 flex flex-col gap-6 animate-pulse">
      <div className="h-6 bg-[#8A8FA8]/10 rounded-lg w-3/4" />
      <div>
        <div className="h-3 bg-[#8A8FA8]/8 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[0,1,2].map(i => <div key={i} className="h-4 bg-[#8A8FA8]/8 rounded w-full" />)}
        </div>
      </div>
      <div className="flex justify-center">
        <div className="w-[220px] h-[220px] rounded-full bg-[#8A8FA8]/5" />
      </div>
      <div className="h-4 bg-[#7C3AED]/15 rounded w-1/3" />
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

function DashboardInner() {
  const router = useRouter()

  const [user, setUser] = useState<DashUser | null>(null)
  const [profile, setProfile] = useState<LearnerProfile | null>(null)
  const [tracks, setTracks] = useState<TrackProgress[]>([])
  const [topics, setTopics] = useState<StudyTopic[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState<Language>('en')

  // Quiz flow state
  const [pendingQuiz, setPendingQuiz] = useState<PendingQuiz | null>(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizSubmitting, setQuizSubmitting] = useState(false)

  // CEFIS connect
  const [showCefisForm, setShowCefisForm] = useState(false)
  const [cefisEmail, setCefisEmail] = useState('')
  const [cefisPassword, setCefisPassword] = useState('')
  const [cefisLoading, setCefisLoading] = useState(false)
  const [cefisError, setCefisError] = useState('')

  const [learnInput, setLearnInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const isEn = language === 'en'

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(async (u: DashUser | null) => {
        if (!u) { router.push('/auth/login'); return }
        setUser(u)

        const sessionId = u.sessionIds?.[0] ?? null
        if (!sessionId) { setLoading(false); return }

        const [profRes, tracksRes, topicsRes] = await Promise.all([
          fetch(`/api/study/profile?sessionId=${sessionId}`).then(r => r.ok ? r.json() : null),
          fetch(`/api/profile?sessionId=${sessionId}`).then(r => r.ok ? r.json() : null),
          fetch(`/api/topics?sessionId=${sessionId}`).then(r => r.ok ? r.json() : { topics: [] }),
        ])

        if (profRes) {
          setProfile(profRes)
          setLanguage(profRes.language ?? 'en')
        }
        if (tracksRes?.tracks) setTracks(tracksRes.tracks)
        if (topicsRes?.topics) setTopics(topicsRes.topics)

        fetch(`/api/dashboard/suggestions?sessionId=${sessionId}`)
          .then(r => r.ok ? r.json() : { suggestions: [] })
          .then(d => setSuggestions(d.suggestions ?? []))
          .catch(() => {})
      })
      .catch(() => router.push('/auth/login'))
      .finally(() => setLoading(false))
  }, [router])

  const sessionId = user?.sessionIds?.[0]

  const startTopicFlow = async (topicName: string) => {
    if (!sessionId || quizLoading || pendingQuiz) return
    setLearnInput('')
    setQuizLoading(true)
    try {
      const res = await fetch('/api/topics/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, topicName }),
      })
      if (res.ok) {
        const { questions } = await res.json()
        setPendingQuiz({ topicName, questions: questions ?? [], startedAt: Date.now() })
      }
    } catch {
      // silently fail
    } finally {
      setQuizLoading(false)
    }
  }

  const handleLearnSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = learnInput.trim()
    if (!q) return
    if (!sessionId) { router.push(`/onboarding?q=${encodeURIComponent(q)}`); return }
    await startTopicFlow(q)
  }

  const handleSuggestionClick = (s: string) => startTopicFlow(s)

  const handleQuizSubmit = async (answers: Record<string, string>) => {
    if (!pendingQuiz || !sessionId) return
    setQuizSubmitting(true)
    try {
      const elapsed = Date.now() - pendingQuiz.startedAt
      const perQuestion = Math.round(elapsed / Math.max(pendingQuiz.questions.length, 1))

      const quizResults = pendingQuiz.questions.map(q => ({
        questionId: q.id,
        correct: answers[q.id] === q.correctAnswer,
        conceptTag: q.conceptTag,
        timeToAnswerMs: perQuestion,
      }))

      const res = await fetch('/api/topics/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, topicName: pendingQuiz.topicName, quizResults }),
      })
      if (res.ok) {
        const { topic } = await res.json()
        setTopics(prev => [topic, ...prev])
      }
    } catch {
    } finally {
      setQuizSubmitting(false)
      setPendingQuiz(null)
    }
  }

  const handleStudyTopic = (topic: StudyTopic) => {
    if (sessionId) router.push(`/study/${sessionId}?q=${encodeURIComponent(topic.name)}`)
  }

  const handleCefisConnect = async () => {
    setCefisError('')
    setCefisLoading(true)
    try {
      const res = await fetch('/api/auth/cefis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, email: cefisEmail, password: cefisPassword }),
      })
      if (!res.ok) {
        setCefisError(isEn ? 'Incorrect email or password.' : 'Email ou senha incorretos.')
      } else {
        const me = await fetch('/api/auth/me').then(r => r.json())
        setUser(me)
        setShowCefisForm(false)
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
      <main className="min-h-screen bg-[#08090F] flex items-center justify-center">
        <Dots />
      </main>
    )
  }

  const busy = quizLoading || quizSubmitting

  return (
    <main className="min-h-screen bg-[#08090F]">
      <ConstellationBackground nodeCount={28} />
      <div className="relative z-10 max-w-5xl mx-auto px-8 py-12">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-[#7C3AED] text-xs uppercase tracking-widest mb-2">Blind Spot</p>
            <h1 className="text-[#F0F0F5] text-3xl font-light">
              {user?.name
                ? (isEn ? `Welcome back, ${user.name}.` : `Bem-vindo, ${user.name}.`)
                : (isEn ? 'Welcome back.' : 'Bem-vindo de volta.')}
            </h1>
          </div>
          <button onClick={handleLogout} className="text-[#8A8FA8]/40 text-xs hover:text-[#8A8FA8] transition-colors mt-2">
            {isEn ? 'Sign out' : 'Sair'}
          </button>
        </div>

        {/* Learn today input */}
        <div className="mb-10 max-w-2xl">
          <form onSubmit={handleLearnSubmit} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={learnInput}
              onChange={e => setLearnInput(e.target.value)}
              disabled={busy || !!pendingQuiz}
              placeholder={isEn ? 'What would you like to learn today?' : 'O que você quer aprender hoje?'}
              className="w-full bg-transparent text-[#F0F0F5] text-2xl placeholder-[#8A8FA8]/35 border-b border-[#8A8FA8]/20 focus:border-[#7C3AED]/50 outline-none pb-4 transition-colors pr-24 disabled:opacity-40"
            />
            {learnInput && !busy && !pendingQuiz && (
              <button type="submit" className="absolute right-0 bottom-4 text-[#7C3AED]/80 text-base hover:text-[#7C3AED] transition-colors">
                {isEn ? 'Go →' : 'Ir →'}
              </button>
            )}
            {quizLoading && (
              <span className="absolute right-0 bottom-4 text-[#8A8FA8]/50 text-sm">
                {isEn ? 'Preparing quiz…' : 'Preparando quiz…'}
              </span>
            )}
          </form>
          {suggestions.length > 0 && !busy && !pendingQuiz && (
            <div className="flex flex-wrap gap-2 mt-5">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(s)}
                  className="text-[#8A8FA8] text-sm border border-[#8A8FA8]/15 rounded-full px-4 py-2 hover:border-[#7C3AED]/40 hover:text-[#F0F0F5] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DNA strip */}
        {profile && <ProfileStrip profile={profile} isEn={isEn} />}

        {/* Topic cards grid */}
        {(topics.length > 0 || pendingQuiz || quizSubmitting) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Inline quiz card */}
            {pendingQuiz && (
              <TopicQuizCard
                quiz={pendingQuiz}
                isEn={isEn}
                onSubmit={handleQuizSubmit}
                onCancel={() => setPendingQuiz(null)}
                submitting={quizSubmitting}
              />
            )}

            {/* Analyzing skeleton while submitting quiz */}
            {quizSubmitting && <TopicCardSkeleton />}

            {topics.map(topic => (
              <TopicCard
                key={topic.id}
                topic={topic}
                isEn={isEn}
                language={language}
                onStudy={handleStudyTopic}
              />
            ))}

            {/* CEFIS tracks */}
            {tracks.map(track => (
              <div key={track.trackId} className="bg-[#0E0F1A] border border-[#8A8FA8]/10 rounded-3xl p-7 flex flex-col gap-6">
                <div>
                  <p className="text-[#8A8FA8] text-[10px] uppercase tracking-widest mb-1">CEFIS</p>
                  <h3 className="text-[#F0F0F5] text-lg font-medium leading-snug">{track.trackName}</h3>
                </div>
                <div className="flex justify-center">
                  <RadarChart pillars={track.pillars} label={track.trackName} language={language} size={220} />
                </div>
                <button
                  onClick={() => sessionId && router.push(`/study/${sessionId}?q=${encodeURIComponent(track.trackName)}`)}
                  className="text-[#7C3AED] text-sm hover:opacity-80 transition-opacity self-start"
                >
                  {isEn ? 'Continue studying →' : 'Continuar estudando →'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!profile && topics.length === 0 && !pendingQuiz && (
          <div className="text-center py-20">
            <p className="text-[#8A8FA8] text-lg">
              {isEn ? 'Tell us what you want to learn to get started.' : 'Nos diga o que quer aprender para começar.'}
            </p>
          </div>
        )}

        {/* CEFIS connect */}
        {!user?.cefisEmail && tracks.length === 0 && (
          <div className="border border-dashed border-[#7C3AED]/20 rounded-3xl p-6 mt-5">
            {!showCefisForm ? (
              <>
                <p className="text-[#F0F0F5] text-sm font-medium mb-2">
                  {isEn ? 'Have a CEFIS account?' : 'Tem conta no CEFIS?'}
                </p>
                <p className="text-[#8A8FA8] text-xs leading-relaxed mb-4">
                  {isEn
                    ? 'Connect to study from your existing courses and track real progress.'
                    : 'Conecte para estudar com seus cursos e acompanhar progresso real.'}
                </p>
                <button onClick={() => setShowCefisForm(true)} className="text-[#7C3AED] text-sm hover:opacity-80 transition-opacity">
                  {isEn ? 'Connect CEFIS →' : 'Conectar CEFIS →'}
                </button>
              </>
            ) : (
              <div className="space-y-3 max-w-sm">
                <p className="text-[#F0F0F5] text-sm font-medium mb-3">
                  {isEn ? 'Connect your CEFIS account' : 'Conectar conta CEFIS'}
                </p>
                <input autoFocus type="email" value={cefisEmail} onChange={e => setCefisEmail(e.target.value)}
                  placeholder={isEn ? 'CEFIS email' : 'Email do CEFIS'}
                  className="w-full bg-[#08090F] border border-[#8A8FA8]/12 rounded-2xl px-4 py-3 text-[#F0F0F5] placeholder-[#8A8FA8]/30 text-sm outline-none focus:border-[#8A8FA8]/30"
                />
                <input type="password" value={cefisPassword} onChange={e => setCefisPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCefisConnect() }}
                  placeholder={isEn ? 'Password' : 'Senha'}
                  className="w-full bg-[#08090F] border border-[#8A8FA8]/12 rounded-2xl px-4 py-3 text-[#F0F0F5] placeholder-[#8A8FA8]/30 text-sm outline-none focus:border-[#8A8FA8]/30"
                />
                {cefisError && <p className="text-red-400/80 text-xs">{cefisError}</p>}
                <div className="flex justify-between items-center pt-1">
                  <button onClick={() => setShowCefisForm(false)} className="text-[#8A8FA8]/50 text-xs hover:text-[#8A8FA8] transition-colors">
                    {isEn ? 'Cancel' : 'Cancelar'}
                  </button>
                  <button onClick={handleCefisConnect} disabled={cefisLoading || !cefisEmail || !cefisPassword}
                    className="text-[#7C3AED] text-sm hover:opacity-80 transition-opacity disabled:opacity-30">
                    {cefisLoading ? (isEn ? 'Connecting…' : 'Conectando…') : (isEn ? 'Connect →' : 'Conectar →')}
                  </button>
                </div>
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
