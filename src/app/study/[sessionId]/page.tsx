'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import ChatBubble from '@/components/onboarding/ChatBubble'
import VoiceToggle from '@/components/study/VoiceToggle'
import CheckpointModal from '@/components/study/CheckpointModal'
import KnowledgeMap from '@/components/study/KnowledgeMap'
import { ArrowLeft, X, MessageCircle } from 'lucide-react'
import type { LearnerProfile, BlindSpot } from '@/types/learner'
import type { Roadmap, UnitContent } from '@/types/roadmap'

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

// ─── Tab types ────────────────────────────────────────────────────────────────

type ContentTab = 'overview' | 'cards' | 'quiz' | 'listen' | 'watch'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseVideoSections(script: string): Array<{ label: string; text: string }> {
  const labels = ['HOOK', 'CORE CONCEPT', 'EXAMPLE', 'TAKEAWAY']
  const sections: Array<{ label: string; text: string }> = []
  let remaining = script
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]
    const nextLabel = labels[i + 1]
    const startTag = `[${label}`
    const startIdx = remaining.indexOf(startTag)
    if (startIdx === -1) continue
    const contentStart = remaining.indexOf(']', startIdx) + 1
    const endIdx = nextLabel ? remaining.indexOf(`[${nextLabel}`) : remaining.length
    const text = remaining.slice(contentStart, endIdx === -1 ? remaining.length : endIdx).trim()
    sections.push({ label, text })
    remaining = remaining.slice(endIdx === -1 ? remaining.length : endIdx)
  }
  // Fallback: if no tags found, show the whole script as one block
  if (sections.length === 0) {
    sections.push({ label: 'SCRIPT', text: script })
  }
  return sections
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

  const [currentTopic, setCurrentTopic] = useState(initialTopic)
  const [translatedSpots, setTranslatedSpots] = useState<BlindSpot[]>([])

  // Roadmap state
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [roadmapLoading, setRoadmapLoading] = useState(false)

  // Unit content state
  const [unitContent, setUnitContent] = useState<UnitContent | null>(null)
  const [contentLoading, setContentLoading] = useState(false)
  const [contentTab, setContentTab] = useState<ContentTab>('overview')

  // Flashcard state
  const [flashcardIdx, setFlashcardIdx] = useState(0)
  const [flashcardFlipped, setFlashcardFlipped] = useState(false)

  // Quiz state
  const [quizIdx, setQuizIdx] = useState(0)
  const [quizSelected, setQuizSelected] = useState<string | null>(null)
  const [quizAnswered, setQuizAnswered] = useState(false)
  const [quizScore, setQuizScore] = useState(0)
  const [quizDone, setQuizDone] = useState(false)

  // Podcast state
  const [podcastPlaying, setPodcastPlaying] = useState(false)
  const [podcastLoading, setPodcastLoading] = useState(false)
  const [podcastProgress, setPodcastProgress] = useState(0)
  const podcastAudioRef = useRef<HTMLAudioElement | null>(null)

  // Map state
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
  const chatInputRef = useRef<HTMLInputElement>(null)

  const isEn = profile?.language !== 'pt-BR'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Load profile
  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/study/profile?sessionId=${sessionId}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: LearnerProfile | null) => setProfile(data))
      .catch(console.error)
  }, [sessionId])

  // Load translated blind spot labels (kept for backward compat; not used for map)
  useEffect(() => {
    if (!sessionId || !profile?.language) return
    fetch(`/api/translate/blindspots?sessionId=${sessionId}&lang=${profile.language}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.blindSpots?.length) setTranslatedSpots(data.blindSpots) })
      .catch(console.error)
  }, [sessionId, profile?.language])

  // Load progress (completed unit IDs)
  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/study/progress?sessionId=${sessionId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.completedCourseIds?.length) {
          setCompletedNodeIds(data.completedCourseIds)
        }
      })
      .catch(console.error)
  }, [sessionId])

  // Generate roadmap after profile loads
  useEffect(() => {
    if (!profile || !sessionId || roadmap) return
    setRoadmapLoading(true)
    fetch('/api/roadmap/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.roadmap) setRoadmap(data.roadmap) })
      .catch(console.error)
      .finally(() => setRoadmapLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, sessionId])

  // Set welcome message once profile loads
  useEffect(() => {
    if (!profile || welcomeSetRef.current) return
    welcomeSetRef.current = true

    const topic = initialTopic || profile.objective
    setCurrentTopic(topic)

    if (initialTopic) {
      const welcome = isEn
        ? `Let's explore **${initialTopic}**. What do you already know about this?`
        : `Vamos explorar **${initialTopic}**. O que você já sabe sobre isso?`
      setMessages([{ role: 'tutor', content: welcome }])
    } else {
      const welcome = isEn
        ? `Your personalized learning roadmap is being built. Tap any node on the map to start learning.`
        : `Seu roteiro de aprendizagem personalizado está sendo criado. Toque em qualquer nó do mapa para começar.`
      setMessages([{ role: 'tutor', content: welcome }])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  // Load unit content when selectedNodeId changes
  useEffect(() => {
    if (!selectedNodeId || !sessionId) return
    setUnitContent(null)
    setContentLoading(true)
    setContentTab('overview')
    setFlashcardIdx(0)
    setFlashcardFlipped(false)
    setQuizIdx(0)
    setQuizSelected(null)
    setQuizAnswered(false)
    setQuizScore(0)
    setQuizDone(false)

    // Try GET first, then POST to generate
    fetch(`/api/roadmap/content?sessionId=${sessionId}&unitId=${selectedNodeId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.content) return data
        // Not cached — generate
        return fetch('/api/roadmap/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, unitId: selectedNodeId }),
        }).then(r => r.ok ? r.json() : null)
      })
      .then(data => { if (data?.content) setUnitContent(data.content) })
      .catch(console.error)
      .finally(() => setContentLoading(false))
  }, [selectedNodeId, sessionId])

  // Auto-checkpoint every 8 messages
  useEffect(() => {
    const total = messages.length
    if (total === 0 || total % 8 !== 0) return
    if (checkpointTriggeredRef.current.has(total)) return
    checkpointTriggeredRef.current.add(total)
    triggerCheckpoint()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  const handleNodeSelect = useCallback((id: string, label: string) => {
    setSelectedNodeId(id)
    setCurrentTopic(label)
    setContentPanelOpen(true)
    const unit = roadmap?.units.find(u => u.id === id)
    if (unit) {
      const nudge = isEn
        ? `Switching to **${label}**. ${unit.description}`
        : `Mudando para **${label}**. ${unit.description}`
      setMessages(prev => [...prev, { role: 'tutor', content: nudge }])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap, isEn])

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
    const unit = roadmap?.units.find(u => u.id === selectedNodeId)
    try {
      const res = await fetch('/api/study/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          courseName: unit?.title ?? currentTopic,
          conceptsCovered: unit?.conceptTags ?? [],
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

  // Podcast controls
  const togglePodcast = async () => {
    if (!unitContent?.podcastScript) return
    if (podcastPlaying) {
      podcastAudioRef.current?.pause()
      setPodcastPlaying(false)
      return
    }
    if (podcastAudioRef.current) {
      podcastAudioRef.current.play()
      setPodcastPlaying(true)
      return
    }
    setPodcastLoading(true)
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: unitContent.podcastScript.slice(0, 4900),
          persona: profile?.persona ?? 'encorajador',
        }),
      })
      if (!res.ok) return
      const audio = new Audio(URL.createObjectURL(await res.blob()))
      podcastAudioRef.current = audio
      audio.ontimeupdate = () => {
        if (audio.duration) setPodcastProgress(audio.currentTime / audio.duration)
      }
      audio.onended = () => { setPodcastPlaying(false); setPodcastProgress(0) }
      audio.play()
      setPodcastPlaying(true)
    } catch {} finally { setPodcastLoading(false) }
  }

  // Flashcard shuffle
  const shuffleFlashcards = useCallback(() => {
    setFlashcardIdx(0)
    setFlashcardFlipped(false)
  }, [])

  const mapUnits = roadmap?.units ?? []
  const selectedUnit = roadmap?.units.find(u => u.id === selectedNodeId) ?? null
  const HEADER_H = 52

  const tabLabels: Record<ContentTab, { icon: string; en: string; pt: string }> = {
    overview: { icon: '★', en: 'overview', pt: 'visão' },
    cards:    { icon: '⧉', en: 'cards', pt: 'fichas' },
    quiz:     { icon: '?', en: 'quiz', pt: 'quiz' },
    listen:   { icon: '♪', en: 'listen', pt: 'ouvir' },
    watch:    { icon: '▶', en: 'watch', pt: 'assistir' },
  }

  return (
    <main className="h-screen bg-[#08090F] flex flex-col overflow-hidden">

      {showCheckpoint && (
        <CheckpointModal
          questions={checkpointQuestions}
          courseName={selectedUnit?.title ?? currentTopic}
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
        <button onClick={() => router.push('/dashboard')} aria-label="Back to dashboard"
          className="text-[#8A8FA8]/40 hover:text-[#8A8FA8] transition-colors flex-shrink-0 p-1 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[#8A8FA8] text-[9px] uppercase tracking-widest leading-none mb-0.5">
            {isEn ? 'Learning Path' : 'Roteiro de Aprendizagem'}
          </p>
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

        {/* ── Knowledge Map ── */}
        <div className="absolute inset-0">
          {mapUnits.length > 0 ? (
            <KnowledgeMap
              units={mapUnits}
              completedIds={completedNodeIds}
              activeId={selectedNodeId}
              selectedId={selectedNodeId}
              onSelect={handleNodeSelect}
              rootLabel={currentTopic || profile?.objective || '···'}
            />
          ) : (
            <div className="h-full flex items-center justify-center relative">
              {roadmapLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-[#7C3AED]/30 border-t-[#7C3AED] animate-spin" />
                  <p className="text-[#8A8FA8]/60 text-sm">
                    {isEn ? 'Building your learning path…' : 'Criando seu caminho de aprendizagem…'}
                  </p>
                </div>
              ) : (
                <p className="text-[#8A8FA8]/40 text-sm text-center px-8">
                  {isEn
                    ? 'Complete the onboarding diagnostic to unlock your learning roadmap.'
                    : 'Complete o diagnóstico de integração para desbloquear seu roteiro.'}
                </p>
              )}
            </div>
          )}

          {/* Roadmap loading overlay (shown while loading when units may be stale) */}
          {roadmapLoading && mapUnits.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#7C3AED]/30 border-t-[#7C3AED] animate-spin" />
              <p className="text-[#8A8FA8]/60 text-sm">
                {isEn ? 'Building your learning path…' : 'Criando seu caminho de aprendizagem…'}
              </p>
            </div>
          )}

          {/* Floating hint */}
          {!selectedNodeId && mapUnits.length > 0 && (
            <div className="absolute top-4 left-5 pointer-events-none">
              <p className="text-[#7C3AED]/70 text-[10px] uppercase tracking-widest">
                {isEn ? 'Knowledge map' : 'Mapa de conhecimento'}
              </p>
              <p className="text-[#8A8FA8]/50 text-xs mt-0.5">
                {isEn ? 'Tap a node to begin' : 'Toque em um nó para explorar'}
              </p>
            </div>
          )}

          {/* View materials pill */}
          {selectedNodeId && !contentPanelOpen && (
            <button
              onClick={() => setContentPanelOpen(true)}
              className="absolute top-4 left-4 text-[10px] uppercase tracking-widest text-[#7C3AED] border border-[#7C3AED]/30 px-3 py-1.5 rounded-full hover:bg-[#7C3AED]/10 transition-colors backdrop-blur-sm bg-[#08090F]/40"
            >
              {isEn ? 'View materials' : 'Ver materiais'}
            </button>
          )}
        </div>

        {/* ── Content panel — left sidebar ── */}
        <div
          className={`absolute inset-y-0 left-0 w-full sm:w-[340px] bg-[#0E0F1A] border-r border-[#8A8FA8]/8 flex flex-col transition-transform duration-300 ease-out z-20 ${
            contentPanelOpen && selectedNodeId ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#8A8FA8]/8 flex-shrink-0">
            <div className="min-w-0">
              <p className="text-[#8A8FA8] text-[9px] uppercase tracking-widest">
                {isEn ? 'Learning materials' : 'Materiais de estudo'}
              </p>
              <p className="text-[#F0F0F5] text-sm truncate font-medium mt-0.5">
                {selectedUnit?.title ?? currentTopic}
              </p>
            </div>
            <button onClick={() => setContentPanelOpen(false)} aria-label="Close panel"
              className="text-[#8A8FA8]/40 hover:text-[#8A8FA8] transition-colors p-1.5 rounded-lg hover:bg-[#8A8FA8]/5 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-[#8A8FA8]/8 flex-shrink-0">
            {(Object.keys(tabLabels) as ContentTab[]).map(tab => (
              <button key={tab} onClick={() => setContentTab(tab)}
                className={`flex-1 py-2.5 text-[10px] uppercase tracking-widest transition-colors ${
                  contentTab === tab
                    ? 'text-[#7C3AED] border-b border-[#7C3AED]'
                    : 'text-[#8A8FA8]/50 hover:text-[#8A8FA8]'
                }`}>
                {tabLabels[tab].icon}{' '}{isEn ? tabLabels[tab].en : tabLabels[tab].pt}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto">

            {/* Loading skeleton */}
            {contentLoading && (
              <div className="p-4 space-y-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="h-16 bg-[#8A8FA8]/5 rounded-2xl animate-pulse" />
                ))}
              </div>
            )}

            {/* No unit selected */}
            {!contentLoading && !unitContent && (
              <div className="p-6 text-center">
                <p className="text-[#8A8FA8]/40 text-xs">
                  {isEn ? 'Select a node to load content.' : 'Selecione um nó para carregar o conteúdo.'}
                </p>
              </div>
            )}

            {/* OVERVIEW TAB */}
            {!contentLoading && unitContent && contentTab === 'overview' && (
              <div className="p-4 space-y-4">
                {/* Unit metadata */}
                <div className="flex flex-wrap gap-2">
                  {selectedUnit && (
                    <span className="text-[#7C3AED]/70 text-[10px] border border-[#7C3AED]/20 rounded-full px-2.5 py-0.5">
                      {isEn ? `Tier ${selectedUnit.tier}` : `Nível ${selectedUnit.tier}`}
                    </span>
                  )}
                  {selectedUnit && (
                    <span className="text-[#8A8FA8]/60 text-[10px] border border-[#8A8FA8]/15 rounded-full px-2.5 py-0.5">
                      ~{selectedUnit.estimatedMinutes} min
                    </span>
                  )}
                  {selectedUnit?.isBlindSpot && (
                    <span className="text-[#22D3EE]/80 text-[10px] border border-[#22D3EE]/25 rounded-full px-2.5 py-0.5">
                      {isEn ? 'Blind Spot' : 'Ponto Cego'}
                    </span>
                  )}
                </div>

                {/* Key points */}
                {unitContent.keyPoints.length > 0 && (
                  <div>
                    <p className="text-[#8A8FA8] text-[10px] uppercase tracking-widest mb-2.5">
                      {isEn ? 'Key Points' : 'Pontos-Chave'}
                    </p>
                    <ul className="space-y-2">
                      {unitContent.keyPoints.map((pt, i) => (
                        <li key={i} className="flex gap-2.5 items-start">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] mt-1.5 flex-shrink-0" />
                          <span className="text-[#F0F0F5] text-xs leading-relaxed">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Explanation */}
                <div>
                  <p className="text-[#8A8FA8] text-[10px] uppercase tracking-widest mb-2.5">
                    {isEn ? 'Explanation' : 'Explicação'}
                  </p>
                  <p className="text-[#C4C6DA] text-xs leading-[1.7]">{unitContent.explanation}</p>
                </div>

                {/* Concept tags */}
                {selectedUnit?.conceptTags && selectedUnit.conceptTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedUnit.conceptTags.map(tag => (
                      <span key={tag} className="text-[#8A8FA8]/50 text-[10px] bg-[#8A8FA8]/5 rounded px-2 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CARDS TAB (Flashcards) */}
            {!contentLoading && unitContent && contentTab === 'cards' && (
              <div className="p-4 flex flex-col gap-4">
                {unitContent.flashcards.length === 0 ? (
                  <p className="text-[#8A8FA8]/40 text-xs text-center py-8">
                    {isEn ? 'No flashcards available.' : 'Nenhum flashcard disponível.'}
                  </p>
                ) : (
                  <>
                    {/* Counter */}
                    <div className="flex items-center justify-between">
                      <p className="text-[#8A8FA8]/50 text-[11px]">
                        {flashcardIdx + 1} / {unitContent.flashcards.length}
                      </p>
                      <button onClick={shuffleFlashcards}
                        className="text-[#8A8FA8]/50 text-[11px] hover:text-[#8A8FA8] transition-colors">
                        {isEn ? 'Reset' : 'Reiniciar'}
                      </button>
                    </div>

                    {/* Card */}
                    <button
                      onClick={() => setFlashcardFlipped(v => !v)}
                      className="min-h-[180px] w-full rounded-2xl border border-[#8A8FA8]/15 flex flex-col items-center justify-center gap-3 p-5 text-center transition-all duration-200 active:scale-[0.98]"
                      style={{
                        background: flashcardFlipped ? '#141525' : '#0C0D18',
                        borderColor: flashcardFlipped ? 'rgba(124,58,237,0.25)' : 'rgba(138,143,168,0.12)',
                      }}
                    >
                      <p className="text-[#8A8FA8]/40 text-[10px] uppercase tracking-widest">
                        {flashcardFlipped ? (isEn ? 'Answer' : 'Resposta') : (isEn ? 'Question' : 'Pergunta')}
                      </p>
                      <p className={`leading-relaxed transition-all duration-200 ${
                        flashcardFlipped ? 'text-[#C4C6DA] text-sm' : 'text-[#F0F0F5] text-base font-medium'
                      }`}>
                        {flashcardFlipped
                          ? unitContent.flashcards[flashcardIdx].back
                          : unitContent.flashcards[flashcardIdx].front}
                      </p>
                      <p className="text-[#8A8FA8]/30 text-[10px]">
                        {isEn ? 'Tap to flip' : 'Toque para virar'}
                      </p>
                    </button>

                    {/* Navigation */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setFlashcardIdx(v => Math.max(0, v - 1)); setFlashcardFlipped(false) }}
                        disabled={flashcardIdx === 0}
                        className="flex-1 py-2.5 rounded-xl border border-[#8A8FA8]/12 text-[#8A8FA8]/60 text-sm hover:border-[#8A8FA8]/25 hover:text-[#8A8FA8] transition-colors disabled:opacity-30"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => { setFlashcardIdx(v => Math.min(unitContent.flashcards.length - 1, v + 1)); setFlashcardFlipped(false) }}
                        disabled={flashcardIdx === unitContent.flashcards.length - 1}
                        className="flex-1 py-2.5 rounded-xl border border-[#8A8FA8]/12 text-[#8A8FA8]/60 text-sm hover:border-[#8A8FA8]/25 hover:text-[#8A8FA8] transition-colors disabled:opacity-30"
                      >
                        →
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* QUIZ TAB */}
            {!contentLoading && unitContent && contentTab === 'quiz' && (
              <div className="p-4 flex flex-col gap-4">
                {unitContent.quiz.length === 0 ? (
                  <p className="text-[#8A8FA8]/40 text-xs text-center py-8">
                    {isEn ? 'No quiz available.' : 'Nenhum quiz disponível.'}
                  </p>
                ) : quizDone ? (
                  // Score summary
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="w-16 h-16 rounded-full border-2 border-[#7C3AED]/40 flex items-center justify-center">
                      <span className="text-2xl font-bold text-[#7C3AED]">{quizScore}/{unitContent.quiz.length}</span>
                    </div>
                    <p className="text-[#F0F0F5] text-base font-medium">
                      {isEn ? 'Quiz complete!' : 'Quiz concluído!'}
                    </p>
                    <p className="text-[#8A8FA8]/60 text-xs text-center">
                      {quizScore === unitContent.quiz.length
                        ? (isEn ? 'Perfect score!' : 'Pontuação perfeita!')
                        : quizScore >= Math.ceil(unitContent.quiz.length * 0.75)
                          ? (isEn ? 'Great job!' : 'Ótimo trabalho!')
                          : (isEn ? 'Keep practicing!' : 'Continue praticando!')}
                    </p>
                    <button
                      onClick={() => { setQuizIdx(0); setQuizSelected(null); setQuizAnswered(false); setQuizScore(0); setQuizDone(false) }}
                      className="px-5 py-2.5 rounded-xl bg-[#7C3AED]/10 border border-[#7C3AED]/25 text-[#7C3AED] text-sm hover:bg-[#7C3AED]/20 transition-colors"
                    >
                      {isEn ? 'Try again' : 'Tentar novamente'}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Progress */}
                    <p className="text-[#8A8FA8]/50 text-[11px]">
                      {isEn ? `Question ${quizIdx + 1} of ${unitContent.quiz.length}` : `Pergunta ${quizIdx + 1} de ${unitContent.quiz.length}`}
                    </p>

                    {/* Question */}
                    <p className="text-[#F0F0F5] text-sm leading-relaxed">
                      {unitContent.quiz[quizIdx].question}
                    </p>

                    {/* Options */}
                    <div className="space-y-2">
                      {unitContent.quiz[quizIdx].options.map(option => {
                        const isCorrect = option === unitContent.quiz[quizIdx].answer
                        const isChosen = option === quizSelected
                        let borderColor = 'border-[#8A8FA8]/15'
                        let textColor = 'text-[#C4C6DA]'
                        let bgColor = ''
                        if (quizAnswered) {
                          if (isCorrect) { borderColor = 'border-[#34C785]/50'; textColor = 'text-[#34C785]'; bgColor = 'bg-[#34C785]/5' }
                          else if (isChosen) { borderColor = 'border-red-500/50'; textColor = 'text-red-400'; bgColor = 'bg-red-500/5' }
                        }
                        return (
                          <button key={option}
                            onClick={() => {
                              if (quizAnswered) return
                              setQuizSelected(option)
                              setQuizAnswered(true)
                              if (option === unitContent.quiz[quizIdx].answer) {
                                setQuizScore(v => v + 1)
                              }
                            }}
                            className={`w-full text-left px-4 py-3 rounded-xl border text-xs leading-relaxed transition-colors ${borderColor} ${textColor} ${bgColor} ${!quizAnswered ? 'hover:border-[#8A8FA8]/30 hover:text-[#F0F0F5]' : ''}`}
                          >
                            {option}
                          </button>
                        )
                      })}
                    </div>

                    {/* Explanation + Next */}
                    {quizAnswered && (
                      <div className="space-y-3">
                        <div className="bg-[#08090F] rounded-xl p-3 border border-[#8A8FA8]/8">
                          <p className="text-[#8A8FA8]/60 text-[10px] uppercase tracking-widest mb-1">
                            {isEn ? 'Explanation' : 'Explicação'}
                          </p>
                          <p className="text-[#C4C6DA] text-xs leading-relaxed">
                            {unitContent.quiz[quizIdx].explanation}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (quizIdx + 1 >= unitContent.quiz.length) {
                              setQuizDone(true)
                            } else {
                              setQuizIdx(v => v + 1)
                              setQuizSelected(null)
                              setQuizAnswered(false)
                            }
                          }}
                          className="w-full py-2.5 rounded-xl bg-[#7C3AED] text-white text-sm hover:opacity-90 transition-opacity"
                        >
                          {quizIdx + 1 >= unitContent.quiz.length
                            ? (isEn ? 'See results' : 'Ver resultados')
                            : (isEn ? 'Next question' : 'Próxima pergunta')}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* LISTEN TAB (Podcast) */}
            {!contentLoading && unitContent && contentTab === 'listen' && (
              <div className="p-4 flex flex-col gap-4">
                <div className="bg-[#08090F] border border-[#8A8FA8]/10 rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#34C785]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#34C785] text-base">♪</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#F0F0F5] text-sm font-medium leading-snug truncate">
                        {selectedUnit?.title ?? currentTopic}
                      </p>
                      <p className="text-[#8A8FA8]/50 text-[10px] mt-0.5">~6 min</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[#8A8FA8]/60 text-xs leading-relaxed line-clamp-2">
                    {unitContent.podcastScript.slice(0, 120)}…
                  </p>

                  {/* Progress bar */}
                  <div className="h-1 bg-[#8A8FA8]/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#34C785] rounded-full transition-all"
                      style={{ width: `${podcastProgress * 100}%` }}
                    />
                  </div>

                  {/* Play button */}
                  <button
                    onClick={togglePodcast}
                    disabled={podcastLoading}
                    className="flex items-center gap-3 text-[#34C785] hover:opacity-80 transition-opacity disabled:opacity-40"
                  >
                    <span className="w-10 h-10 rounded-full border border-[#34C785]/40 flex items-center justify-center flex-shrink-0">
                      {podcastLoading ? (
                        <span className="w-4 h-4 border border-[#34C785]/40 border-t-[#34C785] rounded-full animate-spin" />
                      ) : podcastPlaying ? '⏸' : '▶'}
                    </span>
                    <span className="text-sm">
                      {podcastLoading
                        ? (isEn ? 'Loading audio…' : 'Carregando áudio…')
                        : podcastPlaying
                          ? (isEn ? 'Pause' : 'Pausar')
                          : (isEn ? 'Play podcast episode' : 'Ouvir episódio')}
                    </span>
                  </button>
                </div>

                {/* Waveform decoration */}
                <div className="flex items-center gap-0.5 h-8 px-2">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div key={i}
                      className={`rounded-full flex-1 transition-all duration-150 ${podcastPlaying ? 'bg-[#34C785]' : 'bg-[#34C785]/25'}`}
                      style={{ height: podcastPlaying ? `${20 + Math.abs(Math.sin(i * 0.7 + Date.now() / 200)) * 70}%` : '25%' }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* WATCH TAB (Video Script) */}
            {!contentLoading && unitContent && contentTab === 'watch' && (
              <div className="p-4 flex flex-col gap-4">
                {/* Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-[#F59E0B] text-[10px] uppercase tracking-widest font-medium border border-[#F59E0B]/30 px-2.5 py-0.5 rounded-full">
                    HYPERFRAME READY
                  </span>
                </div>

                {/* Script sections */}
                {parseVideoSections(unitContent.videoScript).map(section => (
                  <div key={section.label} className="bg-[#08090F] border border-[#8A8FA8]/10 rounded-xl p-4">
                    <p className="text-[#F59E0B]/70 text-[10px] uppercase tracking-widest mb-2">
                      {section.label}
                    </p>
                    <p className="text-[#C4C6DA] text-xs leading-relaxed">{section.text}</p>
                  </div>
                ))}

                {/* Note */}
                <p className="text-[#8A8FA8]/40 text-[10px] leading-relaxed text-center">
                  {isEn
                    ? 'Video generation powered by Hyperframe — connect your API key to auto-generate.'
                    : 'Geração de vídeo via Hyperframe — conecte sua chave de API para gerar automaticamente.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Floating chat panel ── */}
        <div
          className={`absolute bottom-[92px] right-6 z-40 transition-all duration-300 ease-out ${
            chatOpen
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-3 pointer-events-none'
          }`}
          style={{ width: 'min(380px, calc(100vw - 48px))' }}
        >
          <div
            className="bg-[#0E0F1A] border border-[#8A8FA8]/12 rounded-3xl flex flex-col overflow-hidden"
            style={{ height: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.65), 0 0 0 1px rgba(124,58,237,0.1)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#8A8FA8]/8 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                <p className="text-[#F0F0F5] text-sm font-medium">Tutor</p>
              </div>
              <button onClick={() => setChatOpen(false)} aria-label="Close chat"
                className="text-[#8A8FA8]/40 hover:text-[#8A8FA8] transition-colors p-1.5 rounded-lg hover:bg-[#8A8FA8]/5">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {messages.length === 0 && (
                <p className="text-[#8A8FA8]/30 text-xs text-center py-4">
                  {isEn ? 'Ask anything about the selected topic.' : 'Pergunte qualquer coisa sobre o tópico.'}
                </p>
              )}
              {messages.map((msg, i) => (
                <ChatBubble key={i} role={msg.role} content={msg.content} />
              ))}
              {streamingContent && <ChatBubble role="tutor" content={streamingContent} isStreaming />}
              {isLoading && !streamingContent && (
                <div className="flex gap-1 px-2 py-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]/40 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }} />
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
              className="flex-shrink-0 px-4 py-3 border-t border-[#8A8FA8]/8"
            >
              <div className="flex gap-3 items-center bg-[#08090F] border border-[#8A8FA8]/10 rounded-2xl px-4 py-2.5">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={isEn ? 'Ask anything…' : 'Pergunte algo…'}
                  className="flex-1 bg-transparent text-[#F0F0F5] placeholder-[#8A8FA8]/40 outline-none text-sm"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input || isLoading}
                  className="w-7 h-7 rounded-full bg-[#7C3AED] flex items-center justify-center text-white text-xs disabled:opacity-30 flex-shrink-0 transition-opacity hover:opacity-80"
                >
                  ↑
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Chat FAB ── */}
        <button
          onClick={() => { setChatOpen(v => !v); if (!chatOpen) setTimeout(() => chatInputRef.current?.focus(), 350) }}
          className={`absolute bottom-6 right-6 z-50 flex items-center gap-2.5 transition-all duration-300 active:scale-95 ${
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
