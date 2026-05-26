'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import ChatBubble from '@/components/onboarding/ChatBubble'
import VoiceToggle from '@/components/study/VoiceToggle'
import CheckpointModal from '@/components/study/CheckpointModal'
import type { LearnerProfile, ContentCard } from '@/types/learner'

// ─── Content card components ──────────────────────────────────────────────────

function CardBadge({ type }: { type: ContentCard['type'] }) {
  const map = {
    text:     { label: 'Read',     color: 'text-[#7C3AED]',  bg: 'bg-[#7C3AED]/8'  },
    video:    { label: 'Watch',    color: 'text-[#22D3EE]',  bg: 'bg-[#22D3EE]/8'  },
    audio:    { label: 'Listen',   color: 'text-[#34C785]',  bg: 'bg-[#34C785]/8'  },
    exercise: { label: 'Practice', color: 'text-[#C026D3]',  bg: 'bg-[#C026D3]/8'  },
  }
  const m = map[type]
  return (
    <span className={`text-[10px] uppercase tracking-widest font-medium px-2 py-0.5 rounded-full ${m.color} ${m.bg}`}>
      {m.label}
    </span>
  )
}

function TextCard({ card, onAskTutor }: { card: ContentCard; onAskTutor: (t: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-[#0E0F1A] border border-[#8A8FA8]/10 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <CardBadge type="text" />
        <span className="text-[#8A8FA8]/50 text-[10px]">{card.duration}</span>
      </div>
      <h4 className="text-[#F0F0F5] text-sm font-medium leading-snug">{card.title}</h4>
      {card.body && (
        <p className={`text-[#8A8FA8] text-xs leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
          {card.body}
        </p>
      )}
      <div className="flex items-center gap-3 pt-1">
        {card.body && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-[#8A8FA8]/50 text-xs hover:text-[#8A8FA8] transition-colors"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
        <button
          onClick={() => onAskTutor(`Tell me more about: ${card.title}`)}
          className="text-[#7C3AED] text-xs hover:opacity-80 transition-opacity ml-auto"
        >
          Ask tutor →
        </button>
      </div>
    </div>
  )
}

function VideoCard({ card }: { card: ContentCard }) {
  const ytUrl = card.searchQuery
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(card.searchQuery)}`
    : null

  return (
    <div className="bg-[#0E0F1A] border border-[#22D3EE]/12 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <CardBadge type="video" />
        <span className="text-[#8A8FA8]/50 text-[10px]">{card.duration}</span>
      </div>
      {/* Thumbnail placeholder */}
      <div className="w-full aspect-video bg-[#08090F] rounded-xl flex items-center justify-center border border-[#8A8FA8]/8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#22D3EE]/5 to-transparent" />
        <div className="w-10 h-10 rounded-full bg-[#22D3EE]/15 flex items-center justify-center">
          <span className="text-[#22D3EE] text-lg ml-0.5">▶</span>
        </div>
      </div>
      <h4 className="text-[#F0F0F5] text-sm font-medium leading-snug">{card.title}</h4>
      {ytUrl && (
        <a
          href={ytUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#22D3EE] text-xs hover:opacity-80 transition-opacity self-start"
        >
          Watch on YouTube →
        </a>
      )}
    </div>
  )
}

function AudioCard({
  card, persona,
}: {
  card: ContentCard
  persona: string
}) {
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const toggle = async () => {
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
      return
    }
    if (audioRef.current) {
      audioRef.current.play()
      setPlaying(true)
      return
    }
    if (!card.audioScript) return
    setLoading(true)
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: card.audioScript, persona }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setPlaying(false)
      audio.play()
      setPlaying(true)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#0E0F1A] border border-[#34C785]/12 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <CardBadge type="audio" />
        <span className="text-[#8A8FA8]/50 text-[10px]">{card.duration}</span>
      </div>
      <h4 className="text-[#F0F0F5] text-sm font-medium leading-snug">{card.title}</h4>

      {/* Waveform visualizer */}
      <div className="flex items-center gap-0.5 h-8">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full flex-1 transition-all ${playing ? 'bg-[#34C785]' : 'bg-[#34C785]/25'}`}
            style={{
              height: playing ? `${30 + Math.sin(i * 0.8) * 50}%` : '25%',
              animationDelay: `${i * 40}ms`,
              ...(playing ? { animation: `pulse 0.8s ease-in-out ${i * 40}ms infinite alternate` } : {}),
            }}
          />
        ))}
      </div>

      <button
        onClick={toggle}
        disabled={loading}
        className="flex items-center gap-2 text-[#34C785] text-xs hover:opacity-80 transition-opacity self-start disabled:opacity-40"
      >
        <span className="w-6 h-6 rounded-full border border-[#34C785]/40 flex items-center justify-center">
          {loading ? '…' : playing ? '⏸' : '▶'}
        </span>
        {loading ? 'Loading…' : playing ? 'Pause' : 'Play explanation'}
      </button>
    </div>
  )
}

function ExerciseCard({ card, onSend }: { card: ContentCard; onSend: (t: string) => void }) {
  return (
    <div className="bg-[#0E0F1A] border border-[#C026D3]/12 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <CardBadge type="exercise" />
        <span className="text-[#8A8FA8]/50 text-[10px]">{card.duration}</span>
      </div>
      <h4 className="text-[#F0F0F5] text-sm font-medium leading-snug">{card.title}</h4>
      {card.exercisePrompt && (
        <p className="text-[#8A8FA8] text-xs leading-relaxed">{card.exercisePrompt}</p>
      )}
      <button
        onClick={() => onSend(card.exercisePrompt ?? card.title)}
        className="text-[#C026D3] text-xs hover:opacity-80 transition-opacity self-start mt-1"
      >
        Try with tutor →
      </button>
    </div>
  )
}

function ContentPanel({
  cards, loading, persona, onAskTutor, onRefresh,
}: {
  cards: ContentCard[]
  loading: boolean
  persona: string
  onAskTutor: (text: string) => void
  onRefresh: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#8A8FA8]/8 flex-shrink-0">
        <p className="text-[#8A8FA8] text-[10px] uppercase tracking-widest">Learning materials</p>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-[#8A8FA8]/40 text-xs hover:text-[#8A8FA8] transition-colors disabled:opacity-30"
        >
          {loading ? '…' : '↻ refresh'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && cards.length === 0 && (
          <>
            {[0,1,2,3].map(i => (
              <div key={i} className="bg-[#0E0F1A] border border-[#8A8FA8]/8 rounded-2xl p-5 animate-pulse">
                <div className="h-3 bg-[#8A8FA8]/10 rounded w-1/4 mb-3" />
                <div className="h-4 bg-[#8A8FA8]/10 rounded w-3/4 mb-2" />
                <div className="h-3 bg-[#8A8FA8]/8 rounded w-full mb-1" />
                <div className="h-3 bg-[#8A8FA8]/8 rounded w-2/3" />
              </div>
            ))}
          </>
        )}

        {cards.map(card => {
          if (card.type === 'text')     return <TextCard     key={card.id} card={card} onAskTutor={onAskTutor} />
          if (card.type === 'video')    return <VideoCard    key={card.id} card={card} />
          if (card.type === 'audio')    return <AudioCard    key={card.id} card={card} persona={persona} />
          if (card.type === 'exercise') return <ExerciseCard key={card.id} card={card} onSend={onAskTutor} />
          return null
        })}

        {!loading && cards.length === 0 && (
          <p className="text-[#8A8FA8]/40 text-xs text-center py-8">
            No materials yet — start chatting to generate content.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main study component ─────────────────────────────────────────────────────

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

function StudyInner() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTopic = searchParams.get('q') ?? ''

  const [profile, setProfile] = useState<LearnerProfile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')

  // Multimodal content state
  const [cards, setCards] = useState<ContentCard[]>([])
  const [cardsLoading, setCardsLoading] = useState(false)
  const [currentTopic, setCurrentTopic] = useState(initialTopic)

  // Checkpoint state
  const [showCheckpoint, setShowCheckpoint] = useState(false)
  const [checkpointQuestions, setCheckpointQuestions] = useState<CheckpointQuestion[]>([])
  const [completedNodes, setCompletedNodes] = useState<string[]>([])
  const [lastCheckpointScore, setLastCheckpointScore] = useState<number | null>(null)
  const [showReflection, setShowReflection] = useState(false)
  const [reflectionText, setReflectionText] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const welcomeSetRef = useRef(false)
  const checkpointTriggeredRef = useRef<Set<number>>(new Set())
  const cardRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const loadContentCards = useCallback(async (topic: string, context?: string) => {
    if (!sessionId || !topic) return
    setCardsLoading(true)
    try {
      const res = await fetch('/api/study/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, topic, context }),
      })
      if (res.ok) {
        const { cards: newCards } = await res.json()
        setCards(newCards ?? [])
      }
    } catch {
    } finally {
      setCardsLoading(false)
    }
  }, [sessionId])

  // Welcome message + initial content cards
  useEffect(() => {
    if (!profile || welcomeSetRef.current) return
    welcomeSetRef.current = true

    const topic = initialTopic || profile.blindSpotsIdentified?.[0]?.name || profile.objective
    setCurrentTopic(topic)

    if (initialTopic) {
      // User came from dashboard with a specific topic
      const welcome = profile.language === 'pt-BR'
        ? `Vamos explorar **${initialTopic}**. O que você já sabe sobre isso?`
        : `Let's explore **${initialTopic}**. What do you already know about this?`
      setMessages([{ role: 'tutor', content: welcome }])
    } else {
      const bs = profile.blindSpotsIdentified?.[0]
      if (bs) {
        const welcome = profile.language === 'pt-BR'
          ? `Vamos trabalhar em **${bs.name}**. ${bs.description} Pronto para começar?`
          : `Let's work on **${bs.name}**. ${bs.description} Ready to start?`
        setMessages([{ role: 'tutor', content: welcome }])
      }
    }

    loadContentCards(topic)
  }, [profile, initialTopic, loadContentCards])

  // Auto-checkpoint every 8 messages
  useEffect(() => {
    const total = messages.length
    if (total === 0 || total % 8 !== 0) return
    if (checkpointTriggeredRef.current.has(total)) return
    checkpointTriggeredRef.current.add(total)
    triggerCheckpoint()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  // Debounced card refresh after user messages
  useEffect(() => {
    const userMessages = messages.filter(m => m.role === 'user')
    if (userMessages.length === 0) return
    if (userMessages.length % 3 !== 0) return

    // Refresh cards with conversation context every 3 user messages
    if (cardRefreshTimerRef.current) clearTimeout(cardRefreshTimerRef.current)
    cardRefreshTimerRef.current = setTimeout(() => {
      const context = messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')
      const lastUserMsg = userMessages[userMessages.length - 1].content
      const topic = currentTopic || lastUserMsg
      loadContentCards(topic, context)
    }, 500)

    return () => { if (cardRefreshTimerRef.current) clearTimeout(cardRefreshTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const apiMessages = messages.map(m => ({
      role: (m.role === 'tutor' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.content,
    }))

    setMessages(prev => [...prev, { role: 'user', content: text }])
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
        const chunk = decoder.decode(value)
        // Strip CEFIS source header if present
        full += chunk.startsWith('\x00cefis\x00') ? chunk.slice(8) : chunk
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
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persona: profile?.persona ?? 'encorajador' }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      new Audio(URL.createObjectURL(blob)).play()
    } catch {}
  }

  const triggerCheckpoint = async () => {
    const bs = profile?.blindSpotsIdentified?.[0]
    try {
      const res = await fetch('/api/study/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          courseName: bs?.name ?? currentTopic,
          conceptsCovered: bs ? [bs.conceptTag] : [],
        }),
      })
      if (!res.ok) return
      const data = await res.json() as { questions: CheckpointQuestion[] }
      if (data.questions?.length) {
        setCheckpointQuestions(data.questions)
        setShowCheckpoint(true)
      }
    } catch {}
  }

  const handleReflectionSubmit = () => {
    if (!reflectionText.trim()) return
    setMessages(prev => [
      ...prev,
      { role: 'user', content: reflectionText },
      { role: 'tutor', content: profile?.language === 'pt-BR'
        ? 'Ótimo! Registrei sua reflexão. Continue assim — reconhecer o que você aprendeu é parte do processo.'
        : "Great! I recorded your reflection. Keep it up — acknowledging what you've learned is part of the process." },
    ])
    setReflectionText('')
    setShowReflection(false)
  }

  const isEn = profile?.language !== 'pt-BR'

  return (
    <main className="h-screen bg-[#08090F] flex flex-col overflow-hidden">

      {showCheckpoint && (
        <CheckpointModal
          questions={checkpointQuestions}
          courseName={profile?.blindSpotsIdentified?.[0]?.name ?? currentTopic}
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
            if (score >= 80) setShowReflection(true)
          }}
        />
      )}

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center gap-4 px-5 py-3 border-b border-[#8A8FA8]/8 bg-[#08090F]/90 backdrop-blur-sm">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-[#8A8FA8]/40 hover:text-[#8A8FA8] transition-colors text-sm"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[#8A8FA8] text-[10px] uppercase tracking-widest">Blind Spot</p>
          <p className="text-[#F0F0F5] text-sm truncate">
            {currentTopic || profile?.objective || (isEn ? 'Study session' : 'Sessão de estudo')}
          </p>
        </div>
        {profile?.dnaType && (
          <span className="flex-shrink-0 text-[#7C3AED]/70 text-xs border border-[#7C3AED]/20 rounded-full px-3 py-1">
            {profile.dnaType}
          </span>
        )}
        {/* Language toggle */}
        <div className="flex-shrink-0 flex rounded-full border border-[#8A8FA8]/20 overflow-hidden text-[10px]">
          {(['en', 'pt-BR'] as const).map(lang => (
            <button
              key={lang}
              onClick={() => {
                if (sessionId) {
                  fetch('/api/profile/settings', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, language: lang }),
                  }).catch(console.error)
                  // Reload profile so AI picks up the new language
                  fetch(`/api/study/profile?sessionId=${sessionId}`)
                    .then(r => r.ok ? r.json() : null)
                    .then(d => { if (d) setProfile(d) })
                    .catch(console.error)
                }
              }}
              className={`px-2.5 py-1 transition-colors ${
                profile?.language === lang
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-[#0E0F1A] text-[#8A8FA8] hover:text-[#F0F0F5]'
              }`}
            >
              {lang === 'en' ? 'EN' : 'PT'}
            </button>
          ))}
        </div>
        {lastCheckpointScore !== null && (
          <span className="text-[#34C785] text-xs flex-shrink-0">
            {lastCheckpointScore}%
          </span>
        )}
      </div>

      {/* ── Two-panel body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Content cards panel — hidden on small screens, shown as left column on lg */}
        <div className="hidden lg:flex lg:w-[340px] xl:w-[380px] flex-shrink-0 flex-col border-r border-[#8A8FA8]/8 overflow-hidden">
          <ContentPanel
            cards={cards}
            loading={cardsLoading}
            persona={profile?.persona ?? 'encorajador'}
            onAskTutor={sendMessage}
            onRefresh={() => loadContentCards(currentTopic, messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n'))}
          />
        </div>

        {/* Mobile: horizontal cards strip */}
        <div className="lg:hidden absolute bottom-20 left-0 right-0 z-10 pointer-events-none">
          {cards.length > 0 && (
            <div className="flex gap-3 px-4 overflow-x-auto pb-2 pointer-events-auto">
              {cards.map(card => (
                <div key={card.id} className="flex-shrink-0 w-56">
                  {card.type === 'text'     && <TextCard     card={card} onAskTutor={sendMessage} />}
                  {card.type === 'video'    && <VideoCard    card={card} />}
                  {card.type === 'audio'    && <AudioCard    card={card} persona={profile?.persona ?? 'encorajador'} />}
                  {card.type === 'exercise' && <ExerciseCard card={card} onSend={sendMessage} />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
            {messages.map((msg, i) => (
              <ChatBubble key={i} role={msg.role} content={msg.content} />
            ))}

            {streamingContent && (
              <ChatBubble role="tutor" content={streamingContent} isStreaming />
            )}

            {isLoading && !streamingContent && (
              <div className="flex gap-1 px-4 py-3">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]/40 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
                ))}
              </div>
            )}

            {showReflection && (
              <div className="bg-[#0E0F1A] border border-[#34C785]/30 rounded-2xl p-4 mt-4">
                <p className="text-[#34C785] text-xs uppercase tracking-widest mb-2">
                  {isEn ? 'Post-session reflection' : 'Reflexão pós-sessão'}
                </p>
                <p className="text-[#F0F0F5] text-sm mb-3">
                  {isEn ? "What did you learn today that you didn't know before?" : 'O que você aprendeu hoje que não sabia antes?'}
                </p>
                <textarea
                  value={reflectionText}
                  onChange={e => setReflectionText(e.target.value)}
                  placeholder={isEn ? 'Write your reflection…' : 'Escreva sua reflexão…'}
                  className="w-full bg-[#08090F] border border-[#8A8FA8]/20 rounded-xl text-[#F0F0F5] placeholder-[#8A8FA8]/50 text-sm p-3 outline-none resize-none min-h-[80px]"
                />
                <button
                  onClick={handleReflectionSubmit}
                  className="mt-2 bg-[#34C785] text-[#08090F] font-medium px-4 py-2 rounded-xl text-xs hover:opacity-90 transition-opacity"
                >
                  {isEn ? 'Save reflection →' : 'Salvar reflexão →'}
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={e => { e.preventDefault(); sendMessage(input) }}
            className="flex-shrink-0 border-t border-[#8A8FA8]/10 px-5 py-4"
          >
            <div className="flex gap-3 items-center">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={isEn ? 'Ask anything…' : 'Pergunte algo…'}
                className="flex-1 bg-transparent text-[#F0F0F5] placeholder-[#8A8FA8]/50 outline-none text-sm"
                disabled={isLoading}
              />
              {input && (
                <button type="submit" className="text-[#7C3AED] text-xs uppercase tracking-widest opacity-70 hover:opacity-100">
                  →
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <VoiceToggle
        persona={profile?.persona ?? 'encorajador'}
        onTranscript={sendMessage}
        onPlayTTS={playTTS}
      />
    </main>
  )
}

export default function StudyPage() {
  return (
    <Suspense>
      <StudyInner />
    </Suspense>
  )
}
