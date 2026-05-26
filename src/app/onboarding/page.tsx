'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ConstellationBackground from '@/components/onboarding/ConstellationBackground'
import HyperFrameVideo from '@/components/HyperFrameVideo'
import type { Language, BlindSpot, QuizQuestion, QuizAnswer, PersonaType } from '@/types/learner'

// ─── Step definitions ─────────────────────────────────────────────────────────

type ChoiceStep = {
  type: 'choice'
  key: string
  question: string
  sub?: string
  options: { value: string; label: string; sub?: string }[]
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
    type: 'choice',
    key: 'outcome',
    question: 'What would make this session useful?',
    options: [
      { value: 'assignment', label: 'Finish an assignment', sub: 'I need this done today' },
      { value: 'test', label: 'Prepare for a test', sub: 'Exam coming up' },
      { value: 'understand', label: 'Understand a topic', sub: "Something isn't clicking" },
      { value: 'foundations', label: 'Fix weak foundations', sub: 'Gaps are slowing me down' },
      { value: 'practice', label: 'Practice until confident', sub: 'I know it but need reps' },
      { value: 'unsure', label: 'Not sure yet', sub: "Show me what I'm missing" },
    ],
  },
  {
    type: 'choice',
    key: 'level',
    question: 'Where should I calibrate?',
    sub: 'This shapes how hard the diagnostic questions will be',
    options: [
      { value: 'middle', label: 'Middle school' },
      { value: 'high', label: 'High school' },
      { value: 'college', label: 'College / university' },
      { value: 'professional', label: 'Professional / working' },
      { value: 'self', label: 'Self-taught' },
    ],
  },
  {
    type: 'choice',
    key: 'urgency',
    question: 'How urgent is this?',
    options: [
      { value: 'today', label: 'Today', sub: 'Assignment or test soon' },
      { value: 'week', label: 'This week', sub: 'A few days to prepare' },
      { value: 'norush', label: 'No rush', sub: 'Building understanding over time' },
    ],
  },
  {
    type: 'choice',
    key: 'minutesPerDay',
    question: 'How much time can you spend per day?',
    options: [
      { value: '10', label: '10 min', sub: 'Short focused bursts' },
      { value: '20', label: '20 min', sub: 'One good session' },
      { value: '30', label: '30 min', sub: 'Solid daily practice' },
      { value: '60', label: '60 min', sub: 'Deep work mode' },
    ],
  },
  {
    type: 'text',
    key: 'obstacle',
    question: "What's stopped you from learning this before?",
    placeholder: 'Time, confusing explanations, forgot basics...',
    optional: true,
  },
  {
    type: 'choice',
    key: 'persona',
    question: 'How should I help you?',
    sub: 'You can change this anytime',
    options: [
      { value: 'direto', label: 'Direct', sub: 'No fluff — just the answer' },
      { value: 'encorajador', label: 'Encouraging', sub: 'Build my confidence as we go' },
      { value: 'socratico', label: 'Socratic', sub: 'Ask me questions, help me discover' },
    ],
  },
  { type: 'diagnostic' },
  { type: 'reveal' },
]

const STEPS_PT: Step[] = [
  {
    type: 'choice',
    key: 'outcome',
    question: 'O que tornaria esta sessão útil?',
    options: [
      { value: 'assignment', label: 'Terminar uma tarefa', sub: 'Preciso resolver hoje' },
      { value: 'test', label: 'Preparar para uma prova', sub: 'Prova chegando' },
      { value: 'understand', label: 'Entender um tópico', sub: 'Algo não está clicando' },
      { value: 'foundations', label: 'Corrigir base fraca', sub: 'Lacunas me atrasando' },
      { value: 'practice', label: 'Praticar até ter confiança', sub: 'Sei, mas preciso treinar' },
      { value: 'unsure', label: 'Ainda não sei', sub: 'Me mostre o que estou perdendo' },
    ],
  },
  {
    type: 'choice',
    key: 'level',
    question: 'Onde devo calibrar?',
    sub: 'Isso define a dificuldade das perguntas de diagnóstico',
    options: [
      { value: 'middle', label: 'Ensino fundamental' },
      { value: 'high', label: 'Ensino médio' },
      { value: 'college', label: 'Ensino superior' },
      { value: 'professional', label: 'Profissional / trabalhando' },
      { value: 'self', label: 'Autodidata' },
    ],
  },
  {
    type: 'choice',
    key: 'urgency',
    question: 'Qual a urgência?',
    options: [
      { value: 'today', label: 'Hoje', sub: 'Prova ou tarefa em breve' },
      { value: 'week', label: 'Esta semana', sub: 'Alguns dias para preparar' },
      { value: 'norush', label: 'Sem pressa', sub: 'Construindo entendimento' },
    ],
  },
  {
    type: 'choice',
    key: 'minutesPerDay',
    question: 'Quanto tempo por dia você tem?',
    options: [
      { value: '10', label: '10 min', sub: 'Sessões curtas' },
      { value: '20', label: '20 min', sub: 'Uma boa sessão' },
      { value: '30', label: '30 min', sub: 'Prática diária sólida' },
      { value: '60', label: '60 min', sub: 'Modo imersão' },
    ],
  },
  {
    type: 'text',
    key: 'obstacle',
    question: 'O que te impediu de aprender isso antes?',
    placeholder: 'Tempo, explicações confusas, esqueci a base...',
    optional: true,
  },
  {
    type: 'choice',
    key: 'persona',
    question: 'Como prefere que eu te ajude?',
    sub: 'Pode mudar a qualquer momento',
    options: [
      { value: 'direto', label: 'Direto', sub: 'Sem rodeios — só a resposta' },
      { value: 'encorajador', label: 'Encorajador', sub: 'Construa minha confiança' },
      { value: 'socratico', label: 'Socrático', sub: 'Me faça perguntas, me guie' },
    ],
  },
  { type: 'diagnostic' },
  { type: 'reveal' },
]

// ─── Component ────────────────────────────────────────────────────────────────

function OnboardingInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const objective = searchParams.get('q') ?? ''

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [language, setLanguage] = useState<Language>('en')
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [textInput, setTextInput] = useState('')
  const [nodeCount, setNodeCount] = useState(2)
  const [pulsingNodes, setPulsingNodes] = useState<number[]>([])

  // Diagnostic state
  const [diagQuestions, setDiagQuestions] = useState<QuizQuestion[]>([])
  const [diagIndex, setDiagIndex] = useState(0)
  const [diagAnswers, setDiagAnswers] = useState<QuizAnswer[]>([])
  const [diagLoading, setDiagLoading] = useState(false)

  // Reveal state
  const [revealing, setRevealing] = useState(false)
  const [blindSpots, setBlindSpots] = useState<BlindSpot[]>([])
  const [dnaReveal, setDnaReveal] = useState('')
  const [studyPlan, setStudyPlan] = useState<{ items: Array<{ courseName: string; reason: string }> } | null>(null)
  const [hfData, setHfData] = useState<Record<string, unknown> | null>(null)
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)

  const steps = language === 'pt-BR' ? STEPS_PT : STEPS_EN
  const totalSteps = steps.length - 1 // exclude reveal from count
  const currentStep = steps[stepIndex]
  const progress = Math.round((stepIndex / totalSteps) * 100)

  // Start session on mount
  useEffect(() => {
    if (!objective) { router.push('/'); return }
    async function start() {
      try {
        const res = await fetch('/api/onboarding/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstMessage: objective }),
        })
        const data = await res.json()
        setSessionId(data.sessionId)
        setLanguage(data.language ?? 'en')
        setNodeCount(4)
      } catch (e) {
        console.error('Session start failed:', e)
      }
    }
    start()
  }, [objective, router])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const advance = () => {
    setSelectedChoice(null)
    setTextInput('')
    setNodeCount(n => n + 2)
    setStepIndex(i => i + 1)
  }

  const handleChoice = async (key: string, value: string) => {
    setSelectedChoice(value)
    const next = { ...answers, [key]: value }
    setAnswers(next)

    // Persist to profile on each answer
    if (sessionId) {
      fetch('/api/onboarding/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, answers: { [key]: value } }),
      }).catch(console.error)
    }

    setTimeout(() => advance(), 260)
  }

  const handleText = async () => {
    const val = textInput.trim()
    if (!val && !(currentStep as TextStep).optional) return
    const next = { ...answers, [(currentStep as TextStep).key]: val }
    setAnswers(next)
    if (sessionId && val) {
      fetch('/api/onboarding/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, answers: { [(currentStep as TextStep).key]: val } }),
      }).catch(console.error)
    }
    advance()
  }

  // When we reach the diagnostic step, fetch questions
  const diagFetchedRef = useRef(false)
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

  const handleDiagAnswer = (questionId: string, answer: string) => {
    setSelectedChoice(answer)
    setTimeout(() => {
      const newAnswers = [...diagAnswers, { questionId, selectedAnswer: answer, skipped: false, timeToAnswerMs: 0 }]
      setDiagAnswers(newAnswers)
      setSelectedChoice(null)

      if (diagIndex + 1 < diagQuestions.length) {
        setDiagIndex(i => i + 1)
        setNodeCount(n => n + 3)
      } else {
        // All diagnostic questions done — submit and analyze
        submitDiagnostic(newAnswers)
      }
    }, 260)
  }

  const submitDiagnostic = async (answers: QuizAnswer[]) => {
    if (!sessionId) return
    await fetch('/api/onboarding/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, answers, questions: diagQuestions }),
    }).catch(console.error)
    advance() // → reveal step
  }

  // When we reach reveal, trigger analysis
  const revealFetchedRef = useRef(false)
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
        setBlindSpots(d.blindSpots ?? [])
        setDnaReveal(d.dnaReveal ?? '')
        setStudyPlan(d.studyPlan ?? null)
        setPulsingNodes([0, 1, 2].slice(0, (d.blindSpots ?? []).length))
        setNodeCount(25)
        setHfData({ dnaType: d.dnaType, objective, minutesPerDay: answers.minutesPerDay ?? 20, persona: answers.persona })
        setRevealing(false)
      })
      .catch(() => setRevealing(false))
  }, [currentStep?.type, sessionId, answers.persona, objective])

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!objective) return null

  return (
    <main className="min-h-screen bg-[#0A0C14] flex flex-col">
      <ConstellationBackground nodeCount={nodeCount} pulsingNodeIds={pulsingNodes} />

      {/* Progress bar */}
      {currentStep?.type !== 'reveal' && (
        <div className="fixed top-0 left-0 right-0 z-20 h-0.5 bg-[#8A8FA8]/10">
          <div
            className="h-full bg-[#F5A623] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16">

        {/* ── Choice / Text steps ── */}
        {(currentStep?.type === 'choice' || currentStep?.type === 'text') && (
          <div className="w-full max-w-lg">
            <p className="text-[#8A8FA8] text-xs uppercase tracking-widest mb-4">
              {stepIndex + 1} / {totalSteps}
            </p>
            <h2 className="text-[#F0F0F5] text-2xl font-light mb-2 leading-snug">
              {(currentStep as ChoiceStep | TextStep).question}
            </h2>
            {'sub' in currentStep && currentStep.sub && (
              <p className="text-[#8A8FA8] text-sm mb-8">{currentStep.sub}</p>
            )}
            {!('sub' in currentStep) && <div className="mb-8" />}

            {currentStep.type === 'choice' && (
              <div className="space-y-3">
                {(currentStep as ChoiceStep).options.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleChoice((currentStep as ChoiceStep).key, opt.value)}
                    className={`w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 ${
                      selectedChoice === opt.value
                        ? 'border-[#F5A623] bg-[#F5A623]/10 text-[#F0F0F5]'
                        : 'border-[#8A8FA8]/15 bg-[#0D1117] hover:border-[#F5A623]/40 hover:bg-[#F5A623]/5 text-[#F0F0F5]'
                    }`}
                  >
                    <span className="font-medium text-sm">{opt.label}</span>
                    {opt.sub && (
                      <span className="block text-[#8A8FA8] text-xs mt-0.5">{opt.sub}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {currentStep.type === 'text' && (
              <div>
                <textarea
                  autoFocus
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleText() } }}
                  placeholder={(currentStep as TextStep).placeholder}
                  rows={3}
                  className="w-full bg-[#0D1117] border border-[#8A8FA8]/15 rounded-2xl px-5 py-4 text-[#F0F0F5] placeholder-[#8A8FA8]/40 text-sm outline-none focus:border-[#F5A623]/40 resize-none"
                />
                <div className="flex gap-3 mt-4 justify-end">
                  {(currentStep as TextStep).optional && (
                    <button onClick={advance} className="text-[#8A8FA8] text-sm hover:text-[#F0F0F5] transition-colors">
                      {language === 'pt-BR' ? 'Pular' : 'Skip'}
                    </button>
                  )}
                  <button
                    onClick={handleText}
                    className="bg-[#F5A623] text-[#0A0C14] font-medium px-6 py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity"
                  >
                    {language === 'pt-BR' ? 'Continuar →' : 'Continue →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Diagnostic questions ── */}
        {currentStep?.type === 'diagnostic' && (
          <div className="w-full max-w-lg">
            {diagLoading ? (
              <div className="text-center py-12">
                <div className="flex gap-1.5 justify-center mb-4">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-[#F5A623]/40 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
                <p className="text-[#8A8FA8] text-sm">
                  {language === 'pt-BR' ? 'Gerando perguntas para seu nível...' : 'Generating questions for your level...'}
                </p>
              </div>
            ) : diagQuestions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#8A8FA8] text-sm mb-6">
                  {language === 'pt-BR' ? 'Não foi possível gerar perguntas.' : 'Could not generate questions.'}
                </p>
                <button onClick={advance} className="text-[#F5A623] text-sm">
                  {language === 'pt-BR' ? 'Continuar assim mesmo →' : 'Continue anyway →'}
                </button>
              </div>
            ) : (
              <>
                <p className="text-[#8A8FA8] text-xs uppercase tracking-widest mb-4">
                  {language === 'pt-BR' ? `Diagnóstico ${diagIndex + 1} / ${diagQuestions.length}` : `Diagnostic ${diagIndex + 1} / ${diagQuestions.length}`}
                </p>
                <h2 className="text-[#F0F0F5] text-xl font-light mb-8 leading-snug">
                  {diagQuestions[diagIndex].question}
                </h2>
                <div className="space-y-3">
                  {diagQuestions[diagIndex].options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleDiagAnswer(diagQuestions[diagIndex].id, opt)}
                      className={`w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 text-sm ${
                        selectedChoice === opt
                          ? 'border-[#F5A623] bg-[#F5A623]/10 text-[#F0F0F5]'
                          : 'border-[#8A8FA8]/15 bg-[#0D1117] hover:border-[#F5A623]/40 text-[#F0F0F5]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                  <button
                    onClick={() => { const newAnswers = [...diagAnswers, { questionId: diagQuestions[diagIndex].id, selectedAnswer: '__skipped__', skipped: true, timeToAnswerMs: 0 }]; setDiagAnswers(newAnswers); if (diagIndex + 1 < diagQuestions.length) { setDiagIndex(i => i + 1) } else { submitDiagnostic(newAnswers) } }}
                    className="w-full text-[#8A8FA8]/50 text-xs hover:text-[#8A8FA8] transition-colors py-2"
                  >
                    {language === 'pt-BR' ? "Não sei" : "I don't know"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Reveal ── */}
        {currentStep?.type === 'reveal' && (
          <div className="w-full max-w-lg">
            {revealing ? (
              <div className="text-center py-12">
                <div className="flex gap-1.5 justify-center mb-6">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-[#F5A623]/60 animate-bounce" style={{ animationDelay: `${i * 200}ms` }} />
                  ))}
                </div>
                <p className="text-[#F0F0F5] text-lg font-light mb-2">
                  {language === 'pt-BR' ? 'Analisando seus padrões...' : 'Mapping your blind spots...'}
                </p>
                <p className="text-[#8A8FA8] text-sm">
                  {language === 'pt-BR' ? 'DeepSeek R1 está pensando' : 'DeepSeek R1 is reasoning'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* HyperFrame DNA video */}
                {hfData && (
                  <HyperFrameVideo
                    type="dna_reveal"
                    data={hfData}
                    autoPlay
                    onEnded={() => setHfData(null)}
                  />
                )}

                {/* DNA reveal text */}
                {dnaReveal && (
                  <div className="bg-[#0D1117] border border-[#F5A623]/20 rounded-2xl p-6">
                    <p className="text-[#F0F0F5] text-sm leading-relaxed whitespace-pre-line">{dnaReveal}</p>
                  </div>
                )}

                {/* Blind spots */}
                {blindSpots.length > 0 && (
                  <div>
                    <p className="text-[#8A8FA8] text-xs uppercase tracking-widest mb-3">
                      {language === 'pt-BR' ? `${blindSpots.length} blind spots identificados` : `${blindSpots.length} blind spots found`}
                    </p>
                    <div className="space-y-3">
                      {blindSpots.map((bs, i) => (
                        <div key={bs.id} className={`rounded-2xl p-5 border ${i === 0 ? 'border-[#F5A623]/30 bg-[#F5A623]/5' : 'border-[#8A8FA8]/10 bg-[#0D1117]'}`}>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="text-[#F0F0F5] font-medium text-sm">{bs.name}</span>
                            <span className={`text-xs font-mono flex-shrink-0 ${i === 0 ? 'text-[#F5A623]' : 'text-[#8A8FA8]'}`}>
                              {bs.confidence}%
                            </span>
                          </div>
                          <p className="text-[#8A8FA8] text-xs leading-relaxed">{bs.evidence}</p>
                          {bs.estimatedFixMinutes && (
                            <p className={`text-xs mt-2 ${i === 0 ? 'text-[#F5A623]/70' : 'text-[#8A8FA8]/60'}`}>
                              ~{bs.estimatedFixMinutes} min to fix
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTAs */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => sessionId && router.push(`/study/${sessionId}`)}
                    className="w-full bg-[#F5A623] text-[#0A0C14] font-semibold py-3.5 px-6 rounded-xl hover:opacity-90 transition-opacity text-sm"
                  >
                    {blindSpots[0]
                      ? (language === 'pt-BR' ? `Corrigir: ${blindSpots[0].name} →` : `Fix: ${blindSpots[0].name} →`)
                      : (language === 'pt-BR' ? 'Começar agora →' : 'Start now →')}
                  </button>
                  <button
                    onClick={() => sessionId && router.push(`/dashboard?sessionId=${sessionId}`)}
                    className="w-full border border-[#8A8FA8]/20 text-[#8A8FA8] py-3 px-6 rounded-xl hover:border-[#F5A623]/30 hover:text-[#F0F0F5] transition-colors text-sm"
                  >
                    {language === 'pt-BR' ? 'Ver plano completo' : 'View full plan'}
                  </button>
                  <button
                    onClick={() => sessionId && router.push(`/dashboard?sessionId=${sessionId}`)}
                    className="w-full text-[#8A8FA8]/50 text-xs py-2 hover:text-[#8A8FA8] transition-colors"
                  >
                    {language === 'pt-BR' ? 'Continuar como visitante' : 'Continue as guest'}
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

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingInner />
    </Suspense>
  )
}
