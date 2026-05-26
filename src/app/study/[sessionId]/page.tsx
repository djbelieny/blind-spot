'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import ChatBubble from '@/components/onboarding/ChatBubble'
import VoiceToggle from '@/components/study/VoiceToggle'
import CheckpointModal from '@/components/study/CheckpointModal'
import KnowledgeMap from '@/components/study/KnowledgeMap'
import { ArrowLeft, RotateCw, X, MessageCircle } from 'lucide-react'
import type { LearnerProfile, ContentCard } from '@/types/learner'

// ─── Content card badges ──────────────────────────────────────────────────────

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
    <div className="bg-[#08090F] border border-[#8A8FA8]/10 rounded-2xl p-5 flex flex-col gap-3">
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
          <button onClick={() => setExpanded(v => !v)} className="text-[#8A8FA8]/50 text-xs hover:text-[#8A8FA8] transition-colors">
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
    <div className="bg-[#08090F] border border-[#22D3EE]/12 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <CardBadge type="video" />
        <span className="text-[#8A8FA8]/50 text-[10px]">{card.duration}</span>
      </div>
      <div className="w-full aspect-video bg-[#0E0F1A] rounded-xl flex items-center justify-center border border-[#8A8FA8]/8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#22D3EE]/5 to-transparent" />
        <div className="w-10 h-10 rounded-full bg-[#22D3EE]/15 flex items-center justify-center">
          <span className="text-[#22D3EE] text-lg ml-0.5">▶</span>
        </div>
      </div>
      <h4 className="text-[#F0F0F5] text-sm font-medium leading-snug">{card.title}</h4>
      {ytUrl && (
        <a href={ytUrl} target="_blank" rel="noopener noreferrer" className="text-[#22D3EE] text-xs hover:opacity-80 transition-opacity self-start">
          Watch on YouTube →
        </a>
      )}
    </div>
  )
}

function AudioCard({ card, persona }: { card: ContentCard; persona: string }) {
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const toggle = async () => {
    if (playing) { audioRef.current?.pause(); setPlaying(false); return }
    if (audioRef.current) { audioRef.current.play(); setPlaying(true); return }
    if (!card.audioScript) return
    setLoading(true)
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: card.audioScript, persona }),
      })
      if (!res.ok) return
      const audio = new Audio(URL.createObjectURL(await res.blob()))
      audioRef.current = audio
      audio.onended = () => setPlaying(false)
      audio.play()
      setPlaying(true)
    } catch {} finally { setLoading(false) }
  }

  return (
    <div className="bg-[#08090F] border border-[#34C785]/12 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <CardBadge type="audio" />
        <span className="text-[#8A8FA8]/50 text-[10px]">{card.duration}</span>
      </div>
      <h4 className="text-[#F0F0F5] text-sm font-medium leading-snug">{card.title}</h4>
      <div className="flex items-center gap-0.5 h-8">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className={`rounded-full flex-1 transition-all ${playing ? 'bg-[#34C785]' : 'bg-[#34C785]/25'}`}
            style={{ height: playing ? `${30 + Math.sin(i * 0.8) * 50}%` : '25%' }} />
        ))}
      </div>
      <button onClick={toggle} disabled={loading}
        className="flex items-center gap-2 text-[#34C785] text-xs hover:opacity-80 transition-opacity self-start disabled:opacity-40">
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
    <div className="bg-[#08090F] border border-[#C026D3]/12 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <CardBadge type="exercise" />
        <span className="text-[#8A8FA8]/50 text-[10px]">{card.duration}</span>
      </div>
      <h4 className="text-[#F0F0F5] text-sm font-medium leading-snug">{card.title}</h4>
      {card.exercisePrompt && <p className="text-[#8A8FA8] text-xs leading-relaxed">{card.exercisePrompt}</p>}
      <button onClick={() => onSend(card.exercisePrompt ?? card.title)}
        className="text-[#C026D3] text-xs hover:opacity-80 transition-opacity self-start mt-1">
        Try with tutor →
      </button>
    </div>
  )
}

// ─── Checkpoint types ─────────────────────────────────────────────────────────

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

// ─── Main study component ─────────────────────────────────────────────────────

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

  const [cards, setCards] = useState<ContentCard[]>([])
  const [cardsLoading, setCardsLoading] = useState(false)
  const [currentTopic, setCurrentTopic] = useState(initialTopic)

  // Knowledge map state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([])
  const [contentPanelOpen, setContentPanelOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  // Checkpoint / reflection
  const [showCheckpoint, setShowCheckpoint] = useState(false)
  const [checkpointQuestions, setCheckpointQuestions] = useState<CheckpointQuestion[]>([])
  const [lastCheckpointScore, setLastCheckpointScore] = useState<number | null>(null)
  const [showReflection, setShowReflection] = useState(false)
  const [reflectionText, setReflectionText] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const welcomeSetRef = useRef(false)
  const checkpointTriggeredRef = useRef<Set<number>>(new Set())
  const cardRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  const isEn = profile?.language !== 'pt-BR'

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
    } catch {} finally { setCardsLoading(false) }
  }, [sessionId])

  // Set up welcome + initial node selection
  useEffect(() => {
    if (!profile || welcomeSetRef.current) return
    welcomeSetRef.current = true

    const topic = initialTopic || profile.blindSpotsIdentified?.[0]?.name || profile.objective
    setCurrentTopic(topic)

    // Auto-select first blind spot node
    const firstNode = profile.blindSpotsIdentified?.[0]
    if (firstNode) {
      setSelectedNodeId(firstNode.id)
      setContentPanelOpen(true)
      loadContentCards(firstNode.name)
    }

    if (initialTopic) {
      const welcome = isEn
        ? `Let's explore **${initialTopic}**. What do you already know about this?`
        : `Vamos explorar **${initialTopic}**. O que você já sabe sobre isso?`
      setMessages([{ role: 'tutor', content: welcome }])
    } else if (firstNode) {
      const welcome = isEn
        ? `Let's work on **${firstNode.name}**. ${firstNode.description} Ready to start?`
        : `Vamos trabalhar em **${firstNode.name}**. ${firstNode.description} Pronto para começar?`
      setMessages([{ role: 'tutor', content: welcome }])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  // Auto-checkpoint every 8 messages
  useEffect(() => {
    const total = messages.length
    if (total === 0 || total % 8 !== 0) return
    if (checkpointTriggeredRef.current.has(total)) return
    checkpointTriggeredRef.current.add(total)
    triggerCheckpoint()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  // Refresh cards every 3 user messages
  useEffect(() => {
    const userMessages = messages.filter(m => m.role === 'user')
    if (userMessages.length === 0 || userMessages.length % 3 !== 0) return
    if (cardRefreshTimerRef.current) clearTimeout(cardRefreshTimerRef.current)
    cardRefreshTimerRef.current = setTimeout(() => {
      const context = messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')
      loadContentCards(currentTopic, context)
    }, 500)
    return () => { if (cardRefreshTimerRef.current) clearTimeout(cardRefreshTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  const handleNodeSelect = (id: string, label: string) => {
    setSelectedNodeId(id)
    setCurrentTopic(label)
    setContentPanelOpen(true)
    loadContentCards(label, messages.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n'))
    // Add a tutor nudge in chat
    const nudge = isEn
      ? `Switching focus to **${label}**. ${profile?.blindSpotsIdentified?.find(b => b.id === id)?.description ?? ''}`
      : `Mudando foco para **${label}**. ${profile?.blindSpotsIdentified?.find(b => b.id === id)?.description ?? ''}`
    setMessages(prev => [...prev, { role: 'tutor', content: nudge }])
  }

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
    if (!chatOpen) setChatOpen(true)
    try {
      const res = await fetch('/api/study/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, messages: [...apiMessages, { role: 'user', content: text }] }),
      })
      if (!res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        full += chunk.startsWith('\x00cefis\x00') ? chunk.slice(8) : chunk
        setStreamingContent(full)
      }
      setMessages(prev => [...prev, { role: 'tutor', content: full }])
      setStreamingContent('')
    } catch (e) { console.error(e) } finally { setIsLoading(false) }
  }

  const playTTS = async (text: string) => {
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persona: profile?.persona ?? 'encorajador' }),
      })
      if (!res.ok) return
      new Audio(URL.createObjectURL(await res.blob())).play()
    } catch {}
  }

  const triggerCheckpoint = async () => {
    const bs = profile?.blindSpotsIdentified?.find(b => b.id === selectedNodeId)
      ?? profile?.blindSpotsIdentified?.[0]
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
    setMessages(prev => [...prev,
      { role: 'user', content: reflectionText },
      { role: 'tutor', content: isEn
        ? "Great! I recorded your reflection. Keep it up — acknowledging what you've learned is part of the process."
        : 'Ótimo! Registrei sua reflexão. Continue assim — reconhecer o que você aprendeu é parte do processo.' },
    ])
    setReflectionText('')
    setShowReflection(false)
  }

  const toggleLanguage = (lang: 'en' | 'pt-BR') => {
    if (!sessionId) return
    fetch('/api/profile/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, language: lang }),
    }).catch(console.error)
    fetch(`/api/study/profile?sessionId=${sessionId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setProfile(d) })
      .catch(console.error)
  }

  const blindSpots = profile?.blindSpotsIdentified ?? []
  const HEADER_H = 52 // px — keep in sync with header className

  return (
    <main className="h-screen bg-[#08090F] flex flex-col overflow-hidden">

      {showCheckpoint && (
        <CheckpointModal
          questions={checkpointQuestions}
          courseName={profile?.blindSpotsIdentified?.find(b => b.id === selectedNodeId)?.name ?? currentTopic}
          language={profile?.language ?? 'en'}
          onComplete={(score) => {
            setShowCheckpoint(false)
            setLastCheckpointScore(score)
            if (score >= 70 && selectedNodeId) {
              setCompletedNodeIds(prev => [...prev, selectedNodeId])
            }
            fetch('/api/study/progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId, courseId: selectedNodeId ?? 'current', checkpointScore: score }),
            }).catch(console.error)
            if (score >= 80) setShowReflection(true)
          }}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 border-b border-[#8A8FA8]/8 bg-[#08090F]/90 backdrop-blur-sm"
        style={{ height: HEADER_H }}>
        <button onClick={() => router.push('/dashboard')} aria-label="Back to dashboard" className="text-[#8A8FA8]/40 hover:text-[#8A8FA8] transition-colors flex-shrink-0 p-1 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[#8A8FA8] text-[9px] uppercase tracking-widest leading-none mb-0.5">Blind Spot</p>
          <p className="text-[#F0F0F5] text-sm truncate leading-none">
            {currentTopic || profile?.objective || (isEn ? 'Study session' : 'Sessão de estudo')}
          </p>
        </div>
        {profile?.dnaType && (
          <span className="flex-shrink-0 text-[#7C3AED]/70 text-[10px] border border-[#7C3AED]/20 rounded-full px-2.5 py-0.5">
            {profile.dnaType}
          </span>
        )}
        {lastCheckpointScore !== null && (
          <span className="text-[#34C785] text-xs flex-shrink-0">{lastCheckpointScore}%</span>
        )}
        {/* Language toggle */}
        <div className="flex-shrink-0 flex rounded-full border border-[#8A8FA8]/20 overflow-hidden text-[10px]">
          {(['en', 'pt-BR'] as const).map(lang => (
            <button key={lang} onClick={() => toggleLanguage(lang)}
              className={`px-2.5 py-1 transition-colors ${profile?.language === lang ? 'bg-[#7C3AED] text-white' : 'bg-[#0E0F1A] text-[#8A8FA8] hover:text-[#F0F0F5]'}`}>
              {lang === 'en' ? 'EN' : 'PT'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main area: map + panels ─────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">

        {/* ── Knowledge Map — fills entire area ── */}
        <div className="absolute inset-0">
          {blindSpots.length > 0 ? (
            <KnowledgeMap
              blindSpots={blindSpots}
              completedIds={completedNodeIds}
              activeId={selectedNodeId}
              selectedId={selectedNodeId}
              onSelect={handleNodeSelect}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-[#8A8FA8]/40 text-sm text-center px-8">
                {isEn
                  ? 'Complete the onboarding diagnostic to unlock your knowledge map.'
                  : 'Complete o diagnóstico de integração para desbloquear seu mapa de conhecimento.'}
              </p>
            </div>
          )}

          {/* Floating hint — only when nothing selected */}
          {!selectedNodeId && blindSpots.length > 0 && (
            <div className="absolute top-4 left-5 pointer-events-none">
              <p className="text-[#7C3AED]/70 text-[10px] uppercase tracking-widest">
                {isEn ? 'Knowledge map' : 'Mapa de conhecimento'}
              </p>
              <p className="text-[#8A8FA8]/50 text-xs mt-0.5">
                {isEn ? 'Tap a node to begin' : 'Toque em um nó para explorar'}
              </p>
            </div>
          )}

          {/* View materials pill — shows when node selected but panel closed */}
          {selectedNodeId && !contentPanelOpen && (
            <button
              onClick={() => setContentPanelOpen(true)}
              className="absolute top-4 right-4 text-[10px] uppercase tracking-widest text-[#7C3AED] border border-[#7C3AED]/30 px-3 py-1.5 rounded-full hover:bg-[#7C3AED]/10 transition-colors backdrop-blur-sm bg-[#08090F]/40"
            >
              {isEn ? 'View materials' : 'Ver materiais'}
            </button>
          )}
        </div>

        {/* ── Content panel — right sidebar (slides in) ── */}
        <div
          className={`absolute inset-y-0 right-0 w-full sm:w-[340px] bg-[#0E0F1A] border-l border-[#8A8FA8]/8 flex flex-col transition-transform duration-300 ease-out z-20 ${
            contentPanelOpen && selectedNodeId ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#8A8FA8]/8 flex-shrink-0">
            <div className="min-w-0">
              <p className="text-[#8A8FA8] text-[9px] uppercase tracking-widest">
                {isEn ? 'Learning materials' : 'Materiais de estudo'}
              </p>
              <p className="text-[#F0F0F5] text-sm truncate font-medium mt-0.5">
                {blindSpots.find(b => b.id === selectedNodeId)?.name ?? currentTopic}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => loadContentCards(currentTopic, messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n'))}
                disabled={cardsLoading}
                aria-label="Refresh materials"
                className="text-[#8A8FA8]/40 hover:text-[#8A8FA8] transition-colors disabled:opacity-30 p-1.5 rounded-lg hover:bg-[#8A8FA8]/5"
              >
                <RotateCw className={`w-3.5 h-3.5 ${cardsLoading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setContentPanelOpen(false)} aria-label="Close panel" className="text-[#8A8FA8]/40 hover:text-[#8A8FA8] transition-colors p-1.5 rounded-lg hover:bg-[#8A8FA8]/5">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cardsLoading && cards.length === 0 && (
              <>
                {[0,1,2,3].map(i => (
                  <div key={i} className="bg-[#08090F] border border-[#8A8FA8]/8 rounded-2xl p-5 animate-pulse">
                    <div className="h-3 bg-[#8A8FA8]/10 rounded w-1/4 mb-3" />
                    <div className="h-4 bg-[#8A8FA8]/10 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-[#8A8FA8]/8 rounded w-full mb-1" />
                    <div className="h-3 bg-[#8A8FA8]/8 rounded w-2/3" />
                  </div>
                ))}
              </>
            )}
            {cards.map(card => {
              if (card.type === 'text')     return <TextCard     key={card.id} card={card} onAskTutor={(t) => { sendMessage(t); setChatOpen(true) }} />
              if (card.type === 'video')    return <VideoCard    key={card.id} card={card} />
              if (card.type === 'audio')    return <AudioCard    key={card.id} card={card} persona={profile?.persona ?? 'encorajador'} />
              if (card.type === 'exercise') return <ExerciseCard key={card.id} card={card} onSend={(t) => { sendMessage(t); setChatOpen(true) }} />
              return null
            })}
            {!cardsLoading && cards.length === 0 && (
              <p className="text-[#8A8FA8]/40 text-xs text-center py-8">
                {isEn ? 'Tap a node to load materials.' : 'Toque em um nó para carregar os materiais.'}
              </p>
            )}
          </div>
        </div>

        {/* ── Chat drawer (slides up from bottom) ── */}
        <div
          className={`absolute inset-x-0 bottom-0 bg-[#0E0F1A] border-t border-[#8A8FA8]/8 flex flex-col transition-transform duration-300 ease-out z-30 ${
            chatOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ height: '55%' }}
        >
          {/* Drawer header */}
          <div className="flex-shrink-0">
            <div className="flex justify-center pt-2.5 pb-0.5">
              <div className="w-8 h-1 rounded-full bg-[#8A8FA8]/20" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#8A8FA8]/8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                <p className="text-[#F0F0F5] text-sm font-medium">
                  {isEn ? 'Tutor' : 'Tutor'}
                </p>
              </div>
              <button onClick={() => setChatOpen(false)} aria-label="Close chat" className="text-[#8A8FA8]/40 hover:text-[#8A8FA8] transition-colors p-1.5 rounded-lg hover:bg-[#8A8FA8]/5">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
            {messages.length === 0 && (
              <p className="text-[#8A8FA8]/30 text-xs text-center py-4">
                {isEn ? 'Ask anything about the selected topic.' : 'Pergunte qualquer coisa sobre o tópico selecionado.'}
              </p>
            )}
            {messages.map((msg, i) => (
              <ChatBubble key={i} role={msg.role} content={msg.content} />
            ))}
            {streamingContent && <ChatBubble role="tutor" content={streamingContent} isStreaming />}
            {isLoading && !streamingContent && (
              <div className="flex gap-1 px-4 py-3">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]/40 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
                ))}
              </div>
            )}
            {showReflection && (
              <div className="bg-[#08090F] border border-[#34C785]/30 rounded-2xl p-4 mt-2">
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
                  className="w-full bg-[#0E0F1A] border border-[#8A8FA8]/20 rounded-xl text-[#F0F0F5] placeholder-[#8A8FA8]/50 text-sm p-3 outline-none resize-none min-h-[60px]"
                />
                <button onClick={handleReflectionSubmit}
                  className="mt-2 bg-[#34C785] text-[#08090F] font-medium px-4 py-2 rounded-xl text-xs hover:opacity-90 transition-opacity">
                  {isEn ? 'Save reflection →' : 'Salvar reflexão →'}
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={e => { e.preventDefault(); sendMessage(input) }}
            className="flex-shrink-0 border-t border-[#8A8FA8]/10 px-5 py-3"
          >
            <div className="flex gap-3 items-center">
              <input
                ref={chatInputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={isEn ? 'Ask anything…' : 'Pergunte algo…'}
                className="flex-1 bg-transparent text-[#F0F0F5] placeholder-[#8A8FA8]/50 outline-none text-sm"
                disabled={isLoading}
                autoFocus={chatOpen}
              />
              {input && (
                <button type="submit" className="text-[#7C3AED] text-xs uppercase tracking-widest opacity-70 hover:opacity-100">
                  →
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── Chat FAB ── */}
        <button
          onClick={() => { setChatOpen(v => !v); if (!chatOpen) setTimeout(() => chatInputRef.current?.focus(), 350) }}
          className={`absolute bottom-6 right-6 z-40 flex items-center gap-2.5 transition-all duration-300 active:scale-95 ${
            chatOpen
              ? 'rounded-full bg-[#0E0F1A] border border-[#8A8FA8]/20 text-[#8A8FA8] hover:border-[#8A8FA8]/40 justify-center'
              : 'rounded-full bg-gradient-to-br from-[#7C3AED] to-[#C026D3] text-white hover:opacity-90 shadow-lg shadow-[#7C3AED]/20 pl-5 pr-6'
          }`}
          style={chatOpen ? { width: 52, height: 52 } : { height: 52 }}
          aria-label={isEn ? (chatOpen ? 'Close chat' : 'Ask tutor') : (chatOpen ? 'Fechar chat' : 'Perguntar ao tutor')}
        >
          {chatOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <>
              <MessageCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap">
                {isEn ? 'Ask tutor' : 'Perguntar'}
              </span>
            </>
          )}
        </button>

      </div>

      <VoiceToggle
        persona={profile?.persona ?? 'encorajador'}
        onTranscript={(t) => { sendMessage(t); setChatOpen(true) }}
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
