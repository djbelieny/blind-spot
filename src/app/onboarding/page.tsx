'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ConstellationBackground from '@/components/onboarding/ConstellationBackground'
import type { Language, QuizQuestion, QuizAnswer } from '@/types/learner'

// ─── Step definitions ──────────────────────────────────────────────────────────

type ChoiceStep = {
  type: 'choice'
  key: string
  question: string
  options: { value: string; label: string }[]
}
type TextStep = {
  type: 'text'
  key: string
  question: string
  placeholder: string
  optional?: boolean
}
type DiagnosticStep = { type: 'diagnostic' }
type RevealStep = { type: 'reveal' }
type Step = ChoiceStep | TextStep | DiagnosticStep | RevealStep

const STEPS_EN: Step[] = [
  {
    type: 'choice', key: 'outcome',
    question: "What's the goal right now?",
    options: [
      { value: 'assignment', label: 'Get through an assignment' },
      { value: 'test',       label: 'Prepare for a test or exam' },
      { value: 'understand', label: "Understand something that isn't clicking" },
      { value: 'foundations',label: 'Fill in gaps that keep tripping me up' },
      { value: 'practice',   label: 'Get sharper at something I already know' },
      { value: 'unsure',     label: "Show me what I'm missing" },
    ],
  },
  {
    type: 'choice', key: 'level',
    question: 'How would you describe where you are with this?',
    options: [
      { value: 'middle', label: "Starting from scratch" },
      { value: 'high',   label: 'I know the basics' },
      { value: 'college',label: 'I have a decent grasp, but gaps' },
      { value: 'professional', label: "I'm experienced, refreshing" },
      { value: 'self',   label: "I've been figuring it out on my own" },
    ],
  },
  {
    type: 'choice', key: 'urgency',
    question: 'How much time do you have?',
    options: [
      { value: 'today', label: "It's urgent — today or tomorrow" },
      { value: 'week',  label: 'A few days' },
      { value: 'norush', label: 'No pressure, I want to build this right' },
    ],
  },
  {
    type: 'choice', key: 'minutesPerDay',
    question: 'How much can you give each day?',
    options: [
      { value: '10', label: '10 minutes — short bursts' },
      { value: '20', label: '20 minutes — one good session' },
      { value: '30', label: '30 minutes — I can focus' },
      { value: '60', label: 'An hour — all in' },
    ],
  },
  {
    type: 'text', key: 'obstacle',
    question: "What's gotten in the way before?",
    placeholder: 'No time, confusing explanations, lost motivation...',
    optional: true,
  },
  {
    type: 'choice', key: 'persona',
    question: 'Last thing — how do you like to learn?',
    options: [
      { value: 'direto',      label: 'Just tell me what I need to know' },
      { value: 'encorajador', label: 'Support me, I learn better with encouragement' },
      { value: 'socratico',   label: 'Challenge me, make me figure it out' },
    ],
  },
  { type: 'diagnostic' },
  { type: 'reveal' },
]

const STEPS_PT: Step[] = [
  {
    type: 'choice', key: 'outcome',
    question: 'Qual é o objetivo agora?',
    options: [
      { value: 'assignment',  label: 'Resolver uma tarefa ou exercício' },
      { value: 'test',        label: 'Me preparar para uma prova' },
      { value: 'understand',  label: 'Entender algo que não está clicando' },
      { value: 'foundations', label: 'Fechar lacunas que me travam' },
      { value: 'practice',    label: 'Ficar mais afiado em algo que já sei' },
      { value: 'unsure',      label: 'Me mostra o que está faltando' },
    ],
  },
  {
    type: 'choice', key: 'level',
    question: 'Como você descreveria onde está nisso?',
    options: [
      { value: 'middle',       label: 'Começando do zero' },
      { value: 'high',         label: 'Sei o básico' },
      { value: 'college',      label: 'Tenho uma base, mas com buracos' },
      { value: 'professional', label: 'Tenho experiência, estou revisando' },
      { value: 'self',         label: 'Fui aprendendo por conta' },
    ],
  },
  {
    type: 'choice', key: 'urgency',
    question: 'Quanto tempo você tem?',
    options: [
      { value: 'today',  label: 'É urgente — hoje ou amanhã' },
      { value: 'week',   label: 'Alguns dias' },
      { value: 'norush', label: 'Sem pressa, quero construir direito' },
    ],
  },
  {
    type: 'choice', key: 'minutesPerDay',
    question: 'Quanto você consegue dedicar por dia?',
    options: [
      { value: '10', label: '10 minutos — sessões curtas' },
      { value: '20', label: '20 minutos — uma boa sessão' },
      { value: '30', label: '30 minutos — consigo focar' },
      { value: '60', label: 'Uma hora — totalmente focado' },
    ],
  },
  {
    type: 'text', key: 'obstacle',
    question: 'O que já te impediu antes?',
    placeholder: 'Tempo, explicações confusas, perdi a motivação...',
    optional: true,
  },
  {
    type: 'choice', key: 'persona',
    question: 'Última coisa — como você aprende melhor?',
    options: [
      { value: 'direto',      label: 'Me diz o que preciso saber, direto' },
      { value: 'encorajador', label: 'Me apoia, aprendo melhor assim' },
      { value: 'socratico',   label: 'Me desafia, me faz pensar' },
    ],
  },
  { type: 'diagnostic' },
  { type: 'reveal' },
]

// ─── Reveal copy ───────────────────────────────────────────────────────────────

const LOADING_LINES_EN = [
  'Looking at how you answered…',
  'Connecting what you know to what you don\'t yet…',
  'Finding the shortest path to your goal…',
]
const LOADING_LINES_PT = [
  'Analisando como você respondeu…',
  'Conectando o que você sabe com o que ainda não sabe…',
  'Encontrando o caminho mais curto para seu objetivo…',
]

// ─── DNA + Persona metadata ────────────────────────────────────────────────────

const DNA_META: Record<string, {
  symbol: string
  en: { name: string; tagline: string }
  pt: { name: string; tagline: string }
  color: string
}> = {
  explorador: {
    symbol: '◎',
    en: { name: 'Practical Explorer', tagline: 'You learn by doing, not by reading.' },
    pt: { name: 'Explorador Prático', tagline: 'Você aprende fazendo, não lendo.' },
    color: '#7C3AED',
  },
  absorvedor: {
    symbol: '◈',
    en: { name: 'Visual Absorber', tagline: 'You retain what you can picture.' },
    pt: { name: 'Absorvedor Visual', tagline: 'Você retém o que consegue visualizar.' },
    color: '#7C3AED',
  },
  construtor: {
    symbol: '▦',
    en: { name: 'Methodical Builder', tagline: 'You need structure before you can move forward.' },
    pt: { name: 'Construtor Metódico', tagline: 'Você precisa de estrutura para avançar.' },
    color: '#7C3AED',
  },
  conector: {
    symbol: '⬡',
    en: { name: 'Conceptual Connector', tagline: 'You need the "why" before the "how".' },
    pt: { name: 'Conector Conceitual', tagline: 'Você precisa do "porquê" antes do "como".' },
    color: '#7C3AED',
  },
  sprint: {
    symbol: '⚡',
    en: { name: 'Intense Sprinter', tagline: 'Short focus, high intensity — you peak fast.' },
    pt: { name: 'Sprint Intenso', tagline: 'Foco curto, alta intensidade — você voa rápido.' },
    color: '#7C3AED',
  },
}

const PERSONA_META: Record<string, { en: string; pt: string; icon: string }> = {
  direto:      { en: 'Direct',      pt: 'Direto',      icon: '→' },
  encorajador: { en: 'Supportive',  pt: 'Encorajador', icon: '◉' },
  socratico:   { en: 'Socratic',    pt: 'Socrático',   icon: '?' },
}

// ─── RevealCard ────────────────────────────────────────────────────────────────

function RevealCard({
  dnaType, persona, minutesPerDay, dnaReveal, topBlindSpot, language, onStart, onDashboard,
}: {
  dnaType: string | null
  persona: string
  minutesPerDay: string
  dnaReveal: string
  topBlindSpot: { name: string; impact: string } | null
  language: Language
  onStart: () => void
  onDashboard: () => void
}) {
  const isEn = language === 'en'
  const dna = dnaType ? DNA_META[dnaType] : null
  const personaMeta = persona ? PERSONA_META[persona] : null
  const mins = minutesPerDay ? `${minutesPerDay} min` : null

  return (
    <div className="space-y-7">

      {/* DNA identity card */}
      {dna && (
        <div className="relative overflow-hidden rounded-3xl border border-[#7C3AED]/20 bg-gradient-to-br from-[#7C3AED]/8 to-transparent p-7">
          {/* Big faded symbol in background */}
          <span className="absolute right-5 top-3 text-[88px] leading-none text-[#7C3AED]/6 select-none pointer-events-none font-light">
            {dna.symbol}
          </span>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl text-[#7C3AED]">{dna.symbol}</span>
              <div>
                <p className="text-[#8A8FA8] text-[10px] uppercase tracking-widest mb-0.5">
                  {isEn ? 'Your learning DNA' : 'Seu DNA de aprendizado'}
                </p>
                <h2 className="text-[#F0F0F5] text-xl font-medium leading-tight">
                  {isEn ? dna.en.name : dna.pt.name}
                </h2>
              </div>
            </div>
            <p className="text-[#8A8FA8] text-sm leading-relaxed">
              {isEn ? dna.en.tagline : dna.pt.tagline}
            </p>
          </div>
        </div>
      )}

      {/* Persona + stats chips */}
      {(personaMeta || mins) && (
        <div className="flex flex-wrap gap-2">
          {personaMeta && (
            <span className="flex items-center gap-1.5 border border-[#8A8FA8]/15 rounded-full px-3 py-1.5 text-xs text-[#F0F0F5]">
              <span className="text-[#7C3AED]">{personaMeta.icon}</span>
              {isEn ? personaMeta.en : personaMeta.pt}
            </span>
          )}
          {mins && (
            <span className="flex items-center gap-1.5 border border-[#8A8FA8]/15 rounded-full px-3 py-1.5 text-xs text-[#F0F0F5]">
              <span className="text-[#7C3AED]">◷</span>
              {mins} {isEn ? '/ day' : '/ dia'}
            </span>
          )}
        </div>
      )}

      {/* Mentor narrative */}
      {dnaReveal && (
        <p className="text-[#8A8FA8] text-[14px] leading-[1.8] font-light whitespace-pre-line">
          {dnaReveal}
        </p>
      )}

      {/* Top blind spot */}
      {topBlindSpot && (
        <div className="border-l-2 border-[#7C3AED]/40 pl-4">
          <p className="text-[#8A8FA8] text-[10px] uppercase tracking-widest mb-1.5">
            {isEn ? 'Where we start' : 'O que vamos trabalhar primeiro'}
          </p>
          <p className="text-[#F0F0F5] text-sm leading-relaxed">{topBlindSpot.impact}</p>
        </div>
      )}

      {/* CTAs */}
      <div className="space-y-3 pt-1">
        <button
          onClick={onStart}
          className="w-full bg-[#7C3AED] text-[#08090F] font-semibold py-4 px-6 rounded-2xl hover:opacity-90 transition-opacity text-sm"
        >
          {isEn ? "Let's fix this →" : "Vamos começar →"}
        </button>
        <button
          onClick={onDashboard}
          className="w-full text-[#8A8FA8] text-sm py-3 hover:text-[#F0F0F5] transition-colors"
        >
          {isEn ? 'See the full picture' : 'Ver o plano completo'}
        </button>
      </div>
    </div>
  )
}

// ─── Component ─────────────────────────────────────────────────────────────────

function OnboardingInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const objective = searchParams.get('q') ?? ''

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [language, setLanguage] = useState<Language>('en')
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [textInput, setTextInput] = useState('')
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [nodeCount, setNodeCount] = useState(3)
  const [entering, setEntering] = useState(false)

  // Diagnostic
  const [diagQuestions, setDiagQuestions] = useState<QuizQuestion[]>([])
  const [diagIndex, setDiagIndex] = useState(0)
  const [diagAnswers, setDiagAnswers] = useState<QuizAnswer[]>([])
  const [diagLoading, setDiagLoading] = useState(false)
  const diagFetchedRef = useRef(false)

  // Reveal
  const [revealing, setRevealing] = useState(false)
  const [loadingLineIdx, setLoadingLineIdx] = useState(0)
  const [dnaReveal, setDnaReveal] = useState('')
  const [dnaType, setDnaType] = useState<string | null>(null)
  const [topBlindSpot, setTopBlindSpot] = useState<{ name: string; impact: string } | null>(null)
  const revealFetchedRef = useRef(false)

  const steps = language === 'pt-BR' ? STEPS_PT : STEPS_EN
  // Only count non-reveal steps for progress
  const progressSteps = steps.filter(s => s.type !== 'reveal').length
  const currentStep = steps[stepIndex]
  const progressPct = Math.round((stepIndex / progressSteps) * 100)

  // ── Session start ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!objective) { router.push('/'); return }
    fetch('/api/onboarding/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstMessage: objective }),
    })
      .then(r => r.json())
      .then(d => { setSessionId(d.sessionId); setLanguage(d.language ?? 'en') })
      .catch(console.error)
  }, [objective, router])

  // ── Rotate loading lines ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!revealing) return
    const lines = language === 'pt-BR' ? LOADING_LINES_PT : LOADING_LINES_EN
    const t = setInterval(() => setLoadingLineIdx(i => (i + 1) % lines.length), 2200)
    return () => clearInterval(t)
  }, [revealing, language])

  // ── Fetch diagnostic questions when we hit that step ─────────────────────────
  useEffect(() => {
    if (currentStep?.type !== 'diagnostic' || diagFetchedRef.current || !sessionId) return
    diagFetchedRef.current = true
    setDiagLoading(true)
    fetch('/api/onboarding/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then(r => r.json())
      .then(d => { setDiagQuestions(d.questions ?? []); setDiagLoading(false) })
      .catch(() => setDiagLoading(false))
  }, [currentStep?.type, sessionId])

  // ── Trigger analysis when we hit the reveal step ─────────────────────────────
  useEffect(() => {
    if (currentStep?.type !== 'reveal' || revealFetchedRef.current || !sessionId) return
    revealFetchedRef.current = true
    setRevealing(true)
    fetch('/api/onboarding/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, persona: answers.persona }),
    })
      .then(r => r.json())
      .then(d => {
        setDnaReveal(d.dnaReveal ?? '')
        setDnaType(d.dnaType ?? null)
        if (d.blindSpots?.length) {
          setTopBlindSpot({ name: d.blindSpots[0].name, impact: d.blindSpots[0].impact ?? d.blindSpots[0].evidence })
        }
        setNodeCount(28)
        setRevealing(false)
      })
      .catch(() => setRevealing(false))
  }, [currentStep?.type, sessionId, answers.persona])

  // ── Navigation ───────────────────────────────────────────────────────────────
  const advance = () => {
    setEntering(true)
    setSelectedChoice(null)
    setTextInput('')
    setNodeCount(n => n + 2)
    setTimeout(() => {
      setStepIndex(i => i + 1)
      setEntering(false)
    }, 180)
  }

  const patchProfile = (key: string, value: string) => {
    if (!sessionId) return
    fetch('/api/onboarding/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, answers: { [key]: value } }),
    }).catch(console.error)
  }

  const handleChoice = (key: string, value: string) => {
    setSelectedChoice(value)
    setAnswers(prev => ({ ...prev, [key]: value }))
    patchProfile(key, value)
    setTimeout(advance, 280)
  }

  const handleText = () => {
    const val = textInput.trim()
    if (!val && !(currentStep as TextStep).optional) return
    const key = (currentStep as TextStep).key
    setAnswers(prev => ({ ...prev, [key]: val }))
    if (val) patchProfile(key, val)
    advance()
  }

  const handleDiagAnswer = (questionId: string, answer: string, skipped = false) => {
    if (!skipped) setSelectedChoice(answer)
    setTimeout(() => {
      const newAnswers: QuizAnswer[] = [...diagAnswers, { questionId, selectedAnswer: answer, skipped, timeToAnswerMs: 0 }]
      setDiagAnswers(newAnswers)
      setSelectedChoice(null)
      if (diagIndex + 1 < diagQuestions.length) {
        setDiagIndex(i => i + 1)
        setNodeCount(n => n + 3)
      } else {
        // Submit and move to reveal
        fetch('/api/onboarding/quiz/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, answers: newAnswers, questions: diagQuestions }),
        }).catch(console.error)
        advance()
      }
    }, skipped ? 0 : 260)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  if (!objective) return null

  return (
    <main className="min-h-screen bg-[#08090F] flex flex-col">
      <ConstellationBackground nodeCount={nodeCount} />

      {/* Subtle progress line — no numbers */}
      {currentStep?.type !== 'reveal' && (
        <div className="fixed top-0 left-0 right-0 z-20 h-[2px] bg-[#8A8FA8]/10">
          <div
            className="h-full bg-[#7C3AED]/60 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      <div
        className={`relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20 transition-opacity duration-180 ${entering ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="w-full max-w-md">

          {/* ── Choice / Text steps ─────────────────────────────────────────── */}
          {(currentStep?.type === 'choice' || currentStep?.type === 'text') && (
            <>
              <h2 className="text-[#F0F0F5] text-2xl font-light leading-snug mb-8">
                {(currentStep as ChoiceStep | TextStep).question}
              </h2>

              {currentStep.type === 'choice' && (
                <div className="space-y-2.5">
                  {(currentStep as ChoiceStep).options.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleChoice((currentStep as ChoiceStep).key, opt.value)}
                      className={`w-full text-left px-5 py-4 rounded-2xl border text-sm transition-all duration-200 ${
                        selectedChoice === opt.value
                          ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#F0F0F5]'
                          : 'border-[#8A8FA8]/12 bg-[#0E0F1A] hover:border-[#8A8FA8]/30 hover:bg-[#0E0F1A]/80 text-[#F0F0F5]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {currentStep.type === 'text' && (
                <>
                  <textarea
                    autoFocus
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleText() } }}
                    placeholder={(currentStep as TextStep).placeholder}
                    rows={3}
                    className="w-full bg-[#0E0F1A] border border-[#8A8FA8]/12 rounded-2xl px-5 py-4 text-[#F0F0F5] placeholder-[#8A8FA8]/30 text-sm outline-none focus:border-[#8A8FA8]/30 resize-none mb-4"
                  />
                  <div className="flex justify-between items-center">
                    {(currentStep as TextStep).optional && (
                      <button onClick={advance} className="text-[#8A8FA8]/50 text-sm hover:text-[#8A8FA8] transition-colors">
                        {language === 'pt-BR' ? 'Pular' : 'Skip'}
                      </button>
                    )}
                    <button
                      onClick={handleText}
                      className="ml-auto text-[#7C3AED] text-sm hover:opacity-80 transition-opacity"
                    >
                      {language === 'pt-BR' ? 'Continuar →' : 'Continue →'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Diagnostic ──────────────────────────────────────────────────── */}
          {currentStep?.type === 'diagnostic' && (
            diagLoading || diagQuestions.length === 0 ? (
              <div className="text-center py-8">
                <div className="flex gap-1.5 justify-center mb-5">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]/40 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
                  ))}
                </div>
                {!diagLoading && (
                  <button onClick={advance} className="text-[#8A8FA8] text-sm hover:text-[#F0F0F5] transition-colors">
                    {language === 'pt-BR' ? 'Continuar →' : 'Continue →'}
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="text-[#8A8FA8] text-xs mb-6 tracking-wide">
                  {language === 'pt-BR'
                    ? `${diagIndex + 1} de ${diagQuestions.length}`
                    : `${diagIndex + 1} of ${diagQuestions.length}`}
                </p>
                <h2 className="text-[#F0F0F5] text-xl font-light leading-snug mb-8">
                  {diagQuestions[diagIndex].question}
                </h2>
                <div className="space-y-2.5">
                  {diagQuestions[diagIndex].options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleDiagAnswer(diagQuestions[diagIndex].id, opt)}
                      className={`w-full text-left px-5 py-4 rounded-2xl border text-sm transition-all duration-200 ${
                        selectedChoice === opt
                          ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#F0F0F5]'
                          : 'border-[#8A8FA8]/12 bg-[#0E0F1A] hover:border-[#8A8FA8]/30 text-[#F0F0F5]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                  <button
                    onClick={() => handleDiagAnswer(diagQuestions[diagIndex].id, '__skipped__', true)}
                    className="w-full text-[#8A8FA8]/40 text-xs py-2 hover:text-[#8A8FA8]/70 transition-colors"
                  >
                    {language === 'pt-BR' ? 'Não tenho certeza' : "Not sure"}
                  </button>
                </div>
              </>
            )
          )}

          {/* ── Reveal ──────────────────────────────────────────────────────── */}
          {currentStep?.type === 'reveal' && (
            revealing ? (
              <div className="text-center py-8">
                <div className="flex gap-1.5 justify-center mb-6">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]/50 animate-bounce" style={{ animationDelay: `${i*200}ms` }} />
                  ))}
                </div>
                <p className="text-[#8A8FA8] text-sm transition-all duration-700">
                  {(language === 'pt-BR' ? LOADING_LINES_PT : LOADING_LINES_EN)[loadingLineIdx]}
                </p>
              </div>
            ) : (
              <RevealCard
                dnaType={dnaType}
                persona={answers.persona}
                minutesPerDay={answers.minutesPerDay}
                dnaReveal={dnaReveal}
                topBlindSpot={topBlindSpot}
                language={language}
                onStart={() => sessionId && router.push(`/study/${sessionId}`)}
                onDashboard={() => router.push('/dashboard')}
              />
            )
          )}

        </div>
      </div>
    </main>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingInner />
    </Suspense>
  )
}
