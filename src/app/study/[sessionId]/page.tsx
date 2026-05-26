'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import ConstellationBackground from '@/components/onboarding/ConstellationBackground'
import ChatBubble from '@/components/onboarding/ChatBubble'
import VoiceToggle from '@/components/study/VoiceToggle'
import CheckpointModal from '@/components/study/CheckpointModal'
import type { LearnerProfile } from '@/types/learner'

interface CheckpointQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: string
}

interface Message {
  role: 'tutor' | 'user'
  content: string
}

export default function StudyPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [profile, setProfile] = useState<LearnerProfile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [showCheckpoint, setShowCheckpoint] = useState(false)
  const [checkpointQuestions, setCheckpointQuestions] = useState<CheckpointQuestion[]>([])
  const [completedNodes, setCompletedNodes] = useState<string[]>([])
  const [lastCheckpointScore, setLastCheckpointScore] = useState<number | null>(null)
  const [showReflection, setShowReflection] = useState(false)
  const [reflectionText, setReflectionText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const welcomeSetRef = useRef(false)
  const checkpointTriggeredRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/study/profile?sessionId=${sessionId}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: LearnerProfile | null) => setProfile(data))
      .catch(console.error)
  }, [sessionId])

  // Auto-set welcome message once profile loads
  useEffect(() => {
    if (!profile || welcomeSetRef.current) return
    welcomeSetRef.current = true
    const bs = profile.blindSpotsIdentified?.[0]
    if (!bs) return
    const welcome = `Vamos trabalhar em **${bs.name}**. ${bs.description} Pronto para começar?`
    setMessages([{ role: 'tutor', content: welcome }])
  }, [profile])

  // Auto-trigger checkpoint every 8 messages
  useEffect(() => {
    const total = messages.length
    if (total === 0 || total % 8 !== 0) return
    if (checkpointTriggeredRef.current.has(total)) return
    checkpointTriggeredRef.current.add(total)
    triggerCheckpoint()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const apiMessages = messages.map(m => ({
      role: (m.role === 'tutor' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.content,
    }))

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setStreamingContent('')

    try {
      const res = await fetch('/api/study/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          messages: [...apiMessages, { role: 'user', content: text }],
        }),
      })

      if (!res.body) return

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value)
        setStreamingContent(full)
      }

      setMessages(prev => [...prev, { role: 'tutor', content: full }])
      setStreamingContent('')
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const playTTS = async (text: string) => {
    const persona = profile?.persona ?? 'encorajador'
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persona }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      new Audio(url).play()
    } catch (e) {
      console.error('TTS failed:', e)
    }
  }

  const triggerCheckpoint = async () => {
    const bs = profile?.blindSpotsIdentified?.[0]
    const courseName = profile?.recommendedCourseIds?.[0] ?? 'Current lesson'
    try {
      const res = await fetch('/api/study/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          courseName: bs?.name ?? courseName,
          conceptsCovered: bs ? [bs.conceptTag] : [],
        }),
      })
      if (!res.ok) return
      const data = (await res.json()) as { questions: CheckpointQuestion[] }
      if (data.questions?.length) {
        setCheckpointQuestions(data.questions)
        setShowCheckpoint(true)
      }
    } catch (e) {
      console.error('Checkpoint failed:', e)
    }
  }

  const handleReflectionSubmit = () => {
    if (!reflectionText.trim()) return
    setMessages(prev => [
      ...prev,
      { role: 'user', content: reflectionText },
      { role: 'tutor', content: 'Otimo! Registrei sua reflexao. Continue assim — reconhecer o que voce aprendeu e parte do processo.' },
    ])
    setReflectionText('')
    setShowReflection(false)
  }

  const currentCourseName = profile?.recommendedCourseIds?.[0] ?? null

  return (
    <main className="min-h-screen bg-[#08090F] flex flex-col">
      <ConstellationBackground nodeCount={20} allGreen={completedNodes.length > 0} />

      {showCheckpoint && (
        <CheckpointModal
          questions={checkpointQuestions}
          courseName={profile?.blindSpotsIdentified?.[0]?.name ?? 'Current lesson'}
          language={profile?.language ?? 'en'}
          onComplete={(score) => {
            setShowCheckpoint(false)
            setLastCheckpointScore(score)
            setCompletedNodes(prev => [...prev, 'current'])
            fetch('/api/study/progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId, courseId: 'current', checkpointScore: score }),
            }).catch(console.error)
            if (score >= 80) {
              setShowReflection(true)
            }
          }}
        />
      )}

      <div className="relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8">
        {/* Header */}
        <div className="mb-6 pb-4 border-b border-[#8A8FA8]/10">
          <p className="text-[#8A8FA8] text-xs uppercase tracking-widest">Blind Spot</p>
          <p className="text-[#F0F0F5] text-sm mt-1 truncate">
            {currentCourseName ?? profile?.objective ?? 'Study session'}
          </p>
          {lastCheckpointScore !== null && (
            <p className="text-[#34C785] text-xs mt-1">
              Last checkpoint: {lastCheckpointScore}%
            </p>
          )}
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto space-y-2 pb-4">
          {messages.map((msg, i) => (
            <ChatBubble key={i} role={msg.role} content={msg.content} />
          ))}

          {streamingContent && (
            <ChatBubble role="tutor" content={streamingContent} isStreaming />
          )}

          {isLoading && !streamingContent && (
            <div className="flex gap-1 px-4 py-3">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]/40 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          )}

          {/* Post-session reflection */}
          {showReflection && (
            <div className="bg-[#0E0F1A] border border-[#34C785]/30 rounded-2xl p-4 mt-4">
              <p className="text-[#34C785] text-xs uppercase tracking-widest mb-2">Reflexao pos-sessao</p>
              <p className="text-[#F0F0F5] text-sm mb-3">
                O que voce aprendeu hoje que nao sabia antes?
              </p>
              <textarea
                value={reflectionText}
                onChange={e => setReflectionText(e.target.value)}
                placeholder="Escreva sua reflexao..."
                className="w-full bg-[#08090F] border border-[#8A8FA8]/20 rounded-xl text-[#F0F0F5] placeholder-[#8A8FA8]/50 text-sm p-3 outline-none resize-none min-h-[80px]"
              />
              <button
                onClick={handleReflectionSubmit}
                className="mt-2 bg-[#34C785] text-[#08090F] font-medium px-4 py-2 rounded-xl text-xs hover:opacity-90 transition-opacity"
              >
                Salvar reflexao →
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={e => { e.preventDefault(); sendMessage(input) }}
          className="border-t border-[#8A8FA8]/10 pt-4"
        >
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={
                profile?.language === 'pt-BR' ? 'Pergunte algo...' : 'Ask anything...'
              }
              className="flex-1 bg-transparent text-[#F0F0F5] placeholder-[#8A8FA8]/50 outline-none text-sm"
              disabled={isLoading}
            />
            {input && (
              <button
                type="submit"
                className="text-[#7C3AED] text-xs uppercase tracking-widest opacity-70 hover:opacity-100"
              >
                →
              </button>
            )}
          </div>
        </form>
      </div>

      <VoiceToggle
        persona={profile?.persona ?? 'encorajador'}
        onTranscript={sendMessage}
        onPlayTTS={playTTS}
      />
    </main>
  )
}
