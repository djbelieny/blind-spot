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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/study/profile?sessionId=${sessionId}`)
      .then(r => r.json())
      .then((data: LearnerProfile) => setProfile(data))
      .catch(console.error)
  }, [sessionId])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    // Map display 'tutor' role → 'assistant' for the API (OpenAI convention)
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

  // Expose checkpoint trigger for future use (e.g. after N messages)
  const triggerCheckpoint = async () => {
    const res = await fetch('/api/study/checkpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, courseName: 'Current lesson', conceptsCovered: [] }),
    })
    if (!res.ok) return
    const data = (await res.json()) as { questions: CheckpointQuestion[] }
    if (data.questions?.length) {
      setCheckpointQuestions(data.questions)
      setShowCheckpoint(true)
    }
  }
  void triggerCheckpoint // available for external call

  return (
    <main className="min-h-screen bg-[#0A0C14] flex flex-col">
      <ConstellationBackground nodeCount={20} allGreen={completedNodes.length > 0} />

      {showCheckpoint && (
        <CheckpointModal
          questions={checkpointQuestions}
          courseName="Current lesson"
          language={profile?.language ?? 'en'}
          onComplete={(score) => {
            setShowCheckpoint(false)
            setCompletedNodes(prev => [...prev, 'current'])
            // Persist to API
            fetch('/api/study/progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId, courseId: 'current', checkpointScore: score }),
            }).catch(console.error)
          }}
        />
      )}

      <div className="relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8">
        {/* Header */}
        <div className="mb-6 pb-4 border-b border-[#8A8FA8]/10">
          <p className="text-[#8A8FA8] text-xs uppercase tracking-widest">Blind Spot</p>
          <p className="text-[#F0F0F5] text-sm mt-1 truncate">
            {profile?.objective ?? 'Study session'}
          </p>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto space-y-2 pb-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#8A8FA8] text-sm">
                {profile?.language === 'pt-BR'
                  ? 'Faça uma pergunta sobre o conteúdo...'
                  : 'Ask a question about the content...'}
              </p>
            </div>
          )}

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
                  className="w-1.5 h-1.5 rounded-full bg-[#F5A623]/40 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
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
                className="text-[#F5A623] text-xs uppercase tracking-widest opacity-70 hover:opacity-100"
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
