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
    <main className="min-h-screen bg-[#0A0C14] flex flex-col">
      <ConstellationBackground nodeCount={nodeCount} />

      {/* Subtle progress line — no numbers */}
      {currentStep?.type !== 'reveal' && (
        <div className="fixed top-0 left-0 right-0 z-20 h-[2px] bg-[#8A8FA8]/10">
          <div
            className="h-full bg-[#F5A623]/60 transition-all duration-500 ease-out"
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
                          ? 'border-[#F5A623] bg-[#F5A623]/10 text-[#F0F0F5]'
                          : 'border-[#8A8FA8]/12 bg-[#0D1117] hover:border-[#8A8FA8]/30 hover:bg-[#0D1117]/80 text-[#F0F0F5]'
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
                    className="w-full bg-[#0D1117] border border-[#8A8FA8]/12 rounded-2xl px-5 py-4 text-[#F0F0F5] placeholder-[#8A8FA8]/30 text-sm outline-none focus:border-[#8A8FA8]/30 resize-none mb-4"
                  />
                  <div className="flex justify-between items-center">
                    {(currentStep as TextStep).optional && (
                      <button onClick={advance} className="text-[#8A8FA8]/50 text-sm hover:text-[#8A8FA8] transition-colors">
                        {language === 'pt-BR' ? 'Pular' : 'Skip'}
                      </button>
                    )}
                    <button
                      onClick={handleText}
                      className="ml-auto text-[#F5A623] text-sm hover:opacity-80 transition-opacity"
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
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#F5A623]/40 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
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
                          ? 'border-[#F5A623] bg-[#F5A623]/10 text-[#F0F0F5]'
                          : 'border-[#8A8FA8]/12 bg-[#0D1117] hover:border-[#8A8FA8]/30 text-[#F0F0F5]'
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
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#F5A623]/50 animate-bounce" style={{ animationDelay: `${i*200}ms` }} />
                  ))}
                </div>
                <p className="text-[#8A8FA8] text-sm transition-all duration-700">
                  {(language === 'pt-BR' ? LOADING_LINES_PT : LOADING_LINES_EN)[loadingLineIdx]}
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* DNA reveal — tutor's personal take */}
                {dnaReveal && (
                  <p className="text-[#F0F0F5] text-[15px] leading-[1.75] font-light whitespace-pre-line">
                    {dnaReveal}
                  </p>
                )}

                {/* Top blind spot — one sentence, no jargon */}
                {topBlindSpot && (
                  <div className="border-l-2 border-[#F5A623]/50 pl-5">
                    <p className="text-[#8A8FA8] text-xs uppercase tracking-widest mb-2">
                      {language === 'pt-BR' ? 'O que vamos trabalhar primeiro' : 'Where we start'}
                    </p>
                    <p className="text-[#F0F0F5] text-sm leading-relaxed">{topBlindSpot.impact}</p>
                  </div>
                )}

                {/* CTAs — action-oriented, warm */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => sessionId && router.push(`/study/${sessionId}`)}
                    className="w-full bg-[#F5A623] text-[#0A0C14] font-semibold py-4 px-6 rounded-2xl hover:opacity-90 transition-opacity text-sm"
                  >
                    {language === 'pt-BR' ? "Vamos começar →" : "Let's fix this →"}
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="w-full text-[#8A8FA8] text-sm py-3 hover:text-[#F0F0F5] transition-colors"
                  >
                    {language === 'pt-BR' ? 'Ver o plano completo' : 'See the full picture'}
                  </button>
                </div>
              </div>
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
