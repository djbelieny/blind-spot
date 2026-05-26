'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ConstellationBackground from '@/components/onboarding/ConstellationBackground'
import ChatBubble from '@/components/onboarding/ChatBubble'
import QuizCard from '@/components/onboarding/QuizCard'
import PersonaCard from '@/components/onboarding/PersonaCard'
import type { OnboardingStage, QuizAnswer, QuizQuestion, PersonaType, Language, BlindSpot } from '@/types/learner'

interface Message {
  role: 'tutor' | 'user'
  content: string
}

const STAGE_QUESTIONS: Record<string, string> = {
  'pt-BR': 'O que você quer aprender? Seja específico.',
  en: 'What do you want to get unstuck on?',
}

function OnboardingInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialMessage = searchParams.get('q') ?? ''

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [language, setLanguage] = useState<Language>('en')
  const [stage, setStage] = useState<OnboardingStage>('entry')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [nodeCount, setNodeCount] = useState(0)
  const [pulsingNodes, setPulsingNodes] = useState<number[]>([])
  const [showQuiz, setShowQuiz] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [showPersona, setShowPersona] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [topBlindSpot, setTopBlindSpot] = useState<BlindSpot | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Start session on mount with initial message
  useEffect(() => {
    if (initialMessage) {
      startSession(initialMessage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startSession = async (firstMessage: string) => {
    setIsLoading(true)
    setMessages([{ role: 'user', content: firstMessage }])

    try {
      const res = await fetch('/api/onboarding/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstMessage }),
      })
      const data = await res.json()
      setSessionId(data.sessionId)
      setLanguage(data.language)
      setNodeCount(3)

      // Get first tutor response
      await streamTutorMessage(
        data.sessionId,
        [{ role: 'user', content: firstMessage }],
        'connection_chat'
      )
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const streamTutorMessage = async (
    sid: string,
    msgs: Message[],
    currentStage: OnboardingStage
  ) => {
    setStreamingContent('')
    let full = ''

    try {
      const res = await fetch('/api/onboarding/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, messages: msgs, stage: currentStage }),
      })

      if (!res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        full += chunk
        setStreamingContent(full)
      }

      setMessages(prev => [...prev, { role: 'tutor', content: full }])
      setStreamingContent('')
      setNodeCount(prev => prev + 2)

      // Check if we should show quiz after 3 tutor messages
      const tutorCount = msgs.filter(m => m.role === 'tutor').length + 1
      if (tutorCount >= 3 && currentStage === 'connection_chat') {
        await generateQuiz(sid)
      }
    } catch (e) {
      console.error('Stream error:', e)
    }
  }

  const generateQuiz = async (sid: string) => {
    try {
      const res = await fetch('/api/onboarding/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid }),
      })
      const data = await res.json()
      if (data.questions?.length) {
        setQuizQuestions(data.questions)
        setStage('quiz')
        setTimeout(() => setShowQuiz(true), 800)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleQuizComplete = async (answers: QuizAnswer[]) => {
    setShowQuiz(false)
    if (!sessionId) return

    try {
      await fetch('/api/onboarding/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, answers, questions: quizQuestions }),
      })
      setStage('persona_selection')
      setShowPersona(true)
    } catch (e) {
      console.error(e)
    }
  }

  const handlePersonaSelect = async (persona: PersonaType) => {
    setShowPersona(false)
    if (!sessionId) return
    setStage('analyzing')
    setNodeCount(prev => prev + 5)

    const analyzingMsg = language === 'pt-BR'
      ? 'Analisando seus padrões de aprendizado...'
      : 'Analyzing your learning patterns...'
    setMessages(prev => [...prev, { role: 'tutor', content: analyzingMsg }])

    try {
      const res = await fetch('/api/onboarding/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, persona }),
      })
      const data = await res.json()

      // Show DNA reveal
      setStage('dna_reveal')
      if (data.dnaReveal) {
        setMessages(prev => [...prev, { role: 'tutor', content: data.dnaReveal }])
      }

      // Pulse nodes for blind spots
      if (data.blindSpots?.length) {
        setPulsingNodes([0, 1, 2].slice(0, data.blindSpots.length))
        setTopBlindSpot((data.blindSpots as BlindSpot[])[0] ?? null)
        setStage('blind_spot_reveal')

        setTimeout(() => {
          const bsMsg = (data.blindSpots as Array<{ name: string; confidence: number; evidence: string }>)
            .map((bs, i) => `${i + 1}. **${bs.name}** (${bs.confidence}% confidence)\n${bs.evidence}`)
            .join('\n\n')
          setMessages(prev => [...prev, { role: 'tutor', content: bsMsg }])
        }, 1500)
      }

      // Show study plan then transition to plan stage
      if (data.studyPlan?.items?.length) {
        setTimeout(() => {
          const planMsg = language === 'pt-BR'
            ? `Seu plano de estudos:\n\n${(data.studyPlan.items as Array<{ courseName: string; reason: string }>).map((item, i) => `${i + 1}. ${item.courseName}\n   ${item.reason}`).join('\n\n')}`
            : `Your study plan:\n\n${(data.studyPlan.items as Array<{ courseName: string; reason: string }>).map((item, i) => `${i + 1}. ${item.courseName}\n   ${item.reason}`).join('\n\n')}`
          setMessages(prev => [...prev, { role: 'tutor', content: planMsg }])
          setStage('plan')
        }, 3000)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !sessionId || isLoading) return

    const userMsg = input.trim()
    setInput('')
    const newMessages = [...messages, { role: 'user' as const, content: userMsg }]
    setMessages(newMessages)
    setNodeCount(prev => prev + 1)

    setIsLoading(true)
    await streamTutorMessage(sessionId, newMessages, stage)
    setIsLoading(false)
  }

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const msg = input.trim()
    setInput('')
    startSession(msg)
  }

  // Initial state — no session yet
  if (!sessionId && !isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0A0C14]">
        <ConstellationBackground nodeCount={0} />
        <form onSubmit={handleInitialSubmit} className="relative z-10 w-full max-w-2xl px-6">
          <input
            autoFocus
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={STAGE_QUESTIONS[language] ?? STAGE_QUESTIONS.en}
            className="w-full bg-transparent text-[#F0F0F5] text-xl placeholder-[#8A8FA8] border-b border-[#8A8FA8]/30 focus:border-[#F5A623] outline-none pb-3 transition-colors"
          />
          {input && (
            <div className="mt-6 flex justify-end">
              <button type="submit" className="text-[#F5A623] text-sm tracking-widest uppercase opacity-70 hover:opacity-100">
                Find my blind spots →
              </button>
            </div>
          )}
        </form>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0A0C14] flex flex-col">
      <ConstellationBackground nodeCount={nodeCount} pulsingNodeIds={pulsingNodes} />

      {showQuiz && quizQuestions.length > 0 && (
        <QuizCard questions={quizQuestions} onComplete={handleQuizComplete} />
      )}

      {showPersona && (
        <PersonaCard language={language} onSelect={handlePersonaSelect} />
      )}

      {/* Chat */}
      <div className="relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8">
        <div className="flex-1 overflow-y-auto space-y-2 pb-4">
          {messages.map((msg, i) => (
            <ChatBubble key={i} role={msg.role} content={msg.content} />
          ))}
          {streamingContent && (
            <ChatBubble role="tutor" content={streamingContent} isStreaming />
          )}
          {isLoading && !streamingContent && (
            <div className="flex justify-start mb-4">
              <div className="flex gap-1 px-4 py-3">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#F5A623]/40 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Post-plan CTAs */}
        {stage === 'plan' && sessionId && (
          <div className="border-t border-[#8A8FA8]/10 pt-6 space-y-3">
            <button
              onClick={() => router.push(`/study/${sessionId}`)}
              className="w-full bg-[#F5A623] text-[#0A0C14] font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity text-sm"
            >
              {topBlindSpot
                ? (language === 'pt-BR' ? `Corrigir: ${topBlindSpot.name} →` : `Fix: ${topBlindSpot.name} →`)
                : (language === 'pt-BR' ? 'Começar agora →' : 'Start now →')
              }
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/dashboard?sessionId=${sessionId}`)}
                className="flex-1 border border-[#8A8FA8]/30 text-[#8A8FA8] py-2.5 px-4 rounded-xl hover:border-[#F5A623]/50 hover:text-[#F0F0F5] transition-colors text-xs uppercase tracking-widest"
              >
                {language === 'pt-BR' ? 'Ver plano completo' : 'View full plan'}
              </button>
              <button
                onClick={() => router.push(`/dashboard?sessionId=${sessionId}`)}
                className="flex-1 border border-[#8A8FA8]/10 text-[#8A8FA8]/60 py-2.5 px-4 rounded-xl hover:border-[#8A8FA8]/30 transition-colors text-xs uppercase tracking-widest"
              >
                {language === 'pt-BR' ? 'Continuar como visitante' : 'Continue as guest'}
              </button>
            </div>
          </div>
        )}

        {/* Input — hidden on plan stage */}
        {stage !== 'analyzing' && stage !== 'quiz' && stage !== 'persona_selection' && stage !== 'plan' && (
          <form onSubmit={handleSend} className="border-t border-[#8A8FA8]/10 pt-4">
            <div className="flex gap-3 items-center">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={language === 'pt-BR' ? 'Responda...' : 'Reply...'}
                className="flex-1 bg-transparent text-[#F0F0F5] placeholder-[#8A8FA8]/50 outline-none text-sm"
                disabled={isLoading}
              />
              {input && (
                <button
                  type="submit"
                  className="text-[#F5A623] text-xs uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity"
                >
                  Send →
                </button>
              )}
            </div>
          </form>
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
