'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import ChatBubble from '@/components/onboarding/ChatBubble'
import VoiceToggle from '@/components/study/VoiceToggle'
import CheckpointModal from '@/components/study/CheckpointModal'
import dynamic from 'next/dynamic'
import { ArrowLeft, X, MessageCircle } from 'lucide-react'
const KnowledgeMap = dynamic(() => import('@/components/study/KnowledgeMap'), { ssr: false })
import RadarChart from '@/components/RadarChart'
import type { LearnerProfile, BlindSpot, LearnerPillars, StudyTopic } from '@/types/learner'
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

// ─── Map legend with hover tooltips ──────────────────────────────────────────

const LEGEND_ITEMS = (isEn: boolean) => [
  {
    color: '#34C785',
    label: isEn ? 'Completed'         : 'Concluído',
    title: isEn ? 'Completed'         : 'Concluído',
    desc:  isEn
      ? 'You\'ve finished this topic. All prerequisite content has been consumed and/or the checkpoint was passed.'
      : 'Você concluiu este tópico. Todo o conteúdo pré-requisito foi consumido e/ou o checkpoint foi aprovado.',
  },
  {
    color: '#F94716',
    label: isEn ? 'Available'         : 'Disponível',
    title: isEn ? 'Available'         : 'Disponível',
    desc:  isEn
      ? 'This topic is ready to study. Its prerequisites are complete (or it has none). Click to open.'
      : 'Este tópico está pronto para estudo. Seus pré-requisitos estão completos (ou não há nenhum). Clique para abrir.',
  },
  {
    color: '#FF6B3D',
    label: isEn ? 'In progress'       : 'Em progresso',
    title: isEn ? 'Currently selected': 'Selecionado',
    desc:  isEn
      ? 'The topic currently open in the content panel. Your activity here updates your proficiency radar in real time.'
      : 'O tópico atualmente aberto no painel de conteúdo. Sua atividade aqui atualiza seu radar de proficiência em tempo real.',
  },
  {
    color: '#555870',
    label: isEn ? 'Locked'            : 'Bloqueado',
    title: isEn ? 'Locked'            : 'Bloqueado',
    desc:  isEn
      ? 'Prerequisites for this topic are not yet complete. Click it to take an unlock challenge — prove you already know the prerequisites and skip ahead.'
      : 'Os pré-requisitos deste tópico ainda não foram concluídos. Clique para tentar um desafio de desbloqueio — prove que já conhece os pré-requisitos e avance.',
  },
  {
    color: '#22D3EE',
    label: isEn ? 'Blind spot'        : 'Ponto cego',
    title: isEn ? 'Blind spot'        : 'Ponto cego',
    desc:  isEn
      ? 'A gap in your knowledge identified during onboarding. Prioritise these — they\'re what\'s holding back your overall proficiency.'
      : 'Uma lacuna no seu conhecimento identificada durante o onboarding. Priorize estes — são eles que estão limitando sua proficiência geral.',
  },
]

function MapLegend({ isEn }: { isEn: boolean }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const items = LEGEND_ITEMS(isEn)

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
      {/* Tooltip card */}
      <div className={`transition-all duration-200 ${hoveredIdx !== null ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'}`}>
        {hoveredIdx !== null && (
          <div
            className="bg-[#141414] border rounded-2xl px-5 py-4 max-w-xs text-center shadow-xl shadow-black/50"
            style={{ borderColor: `${items[hoveredIdx].color}40` }}
          >
            <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: items[hoveredIdx].color }}>
              {items[hoveredIdx].title}
            </p>
            <p className="text-[#C8C9D8] text-xs leading-relaxed">{items[hoveredIdx].desc}</p>
          </div>
        )}
      </div>

      {/* Legend pill */}
      <div className="flex items-center gap-4 bg-[#0A0B14]/85 backdrop-blur-md border border-[#8A8FA8]/10 rounded-full px-5 py-2">
        {items.map(({ color, label }, i) => (
          <div
            key={label}
            className="flex items-center gap-1.5 cursor-default"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0 transition-transform duration-150"
              style={{
                backgroundColor: color,
                boxShadow: hoveredIdx === i ? `0 0 10px ${color}` : `0 0 5px ${color}80`,
                transform: hoveredIdx === i ? 'scale(1.4)' : 'scale(1)',
              }}
            />
            <span
              className="text-[10px] whitespace-nowrap transition-colors duration-150"
              style={{ color: hoveredIdx === i ? '#F0F0F5' : 'rgba(138,143,168,0.7)' }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
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
  const [podcastGenerating, setPodcastGenerating] = useState(false)
  const [podcastGeneratePhase, setPodcastGeneratePhase] = useState<'script' | 'voices' | null>(null)
  const [podcastProgress, setPodcastProgress] = useState(0)
  const [podcastError, setPodcastError] = useState<string | null>(null)
  const [podcastDialogue, setPodcastDialogue] = useState<{ speaker: 'A' | 'B'; name: string; text: string }[] | null>(null)
  const podcastAudioRef = useRef<HTMLAudioElement | null>(null)
  const podcastUnitRef = useRef<string | null>(null)

  // Map state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([])
  const [contentPanelOpen, setContentPanelOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  // Radar overlay
  const [topicPillars, setTopicPillars] = useState<LearnerPillars | null>(null)
  const [topicId, setTopicId] = useState<string | null>(null)
  const [radarOpen, setRadarOpen] = useState(false)

  // Track which (unitId, interactionType) pairs have already been recorded this session
  const firedInteractionsRef = useRef<Record<string, Set<string>>>({})

  // Checkpoint / unlock challenge
  const [showCheckpoint, setShowCheckpoint] = useState(false)
  const [checkpointMode, setCheckpointMode] = useState<'checkpoint' | 'unlock'>('checkpoint')
  const [checkpointQuestions, setCheckpointQuestions] = useState<CheckpointQuestion[]>([])
  const [lastCheckpointScore, setLastCheckpointScore] = useState<number | null>(null)
  const [unlockTargetId, setUnlockTargetId] = useState<string | null>(null)
  const [unlockLoading, setUnlockLoading] = useState(false)
  const [unlockFailCounts, setUnlockFailCounts] = useState<Record<string, number>>({})
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

  // Load profile + topic pillars
  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/study/profile?sessionId=${sessionId}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: LearnerProfile | null) => setProfile(data))
      .catch(console.error)
    fetch(`/api/topics?sessionId=${sessionId}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { topics: StudyTopic[] } | null) => {
        const first = data?.topics?.[0]
        if (first?.pillars) setTopicPillars(first.pillars)
        if (first?.id) setTopicId(first.id)
      })
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

  // Generate roadmap after profile loads — scoped to the current topic
  useEffect(() => {
    if (!profile || !sessionId) return
    const topic = initialTopic || profile.objective
    setRoadmap(null)
    setRoadmapLoading(true)
    fetch('/api/roadmap/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, topic }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.roadmap) setRoadmap(data.roadmap) })
      .catch(console.error)
      .finally(() => setRoadmapLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, sessionId, initialTopic])

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
  // IMPORTANT: always use `initialTopic` (the main study subject from the URL) for cache keys,
  // NOT `currentTopic` which gets overwritten with the unit title when a node is opened.
  const [contentGenerating, setContentGenerating] = useState(false)
  const [contentError, setContentError] = useState<string | null>(null)

  const loadUnitContent = useCallback(async (unitId: string) => {
    if (!sessionId) return
    setUnitContent(null)
    setContentError(null)
    setContentLoading(true)
    setContentGenerating(false)
    setContentTab('overview')
    setFlashcardIdx(0)
    setFlashcardFlipped(false)
    setQuizIdx(0)
    setQuizSelected(null)
    setQuizAnswered(false)
    setQuizScore(0)
    setQuizDone(false)

    // Use initialTopic for all cache key operations — it is the stable study subject
    const studyTopic = initialTopic || ''
    const topicParam = encodeURIComponent(studyTopic)

    try {
      // 1. Check cache
      const cacheRes = await fetch(
        `/api/roadmap/content?sessionId=${sessionId}&unitId=${unitId}&topic=${topicParam}`
      )
      if (cacheRes.ok) {
        const cached = await cacheRes.json()
        if (cached?.content) {
          setUnitContent(cached.content)
          setContentLoading(false)
          return
        }
      }

      // 2. Not cached — generate (may take several seconds)
      setContentLoading(false)
      setContentGenerating(true)
      const genRes = await fetch('/api/roadmap/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, unitId, topic: studyTopic }),
      })
      const genData = await genRes.json()
      if (genRes.ok && genData?.content) {
        setUnitContent(genData.content)
      } else {
        const msg = genData?.error ?? `HTTP ${genRes.status}`
        console.error('[content generate]', msg, { sessionId, unitId, studyTopic })
        setContentError(msg)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error'
      console.error('[content load]', msg)
      setContentError(msg)
    } finally {
      setContentLoading(false)
      setContentGenerating(false)
    }
  // initialTopic is a stable constant from searchParams
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, initialTopic])

  useEffect(() => {
    if (!selectedNodeId) return
    loadUnitContent(selectedNodeId)
    // Reset podcast state when unit changes
    if (podcastUnitRef.current !== selectedNodeId) {
      podcastAudioRef.current?.pause()
      podcastAudioRef.current = null
      setPodcastPlaying(false)
      setPodcastProgress(0)
      setPodcastDialogue(null)
      setPodcastError(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, sessionId])


  const isUnitLocked = useCallback((unitId: string): boolean => {
    const unit = roadmap?.units.find(u => u.id === unitId)
    if (!unit) return true
    if (completedNodeIds.includes(unitId)) return false
    if (unit.prerequisites.length === 0) return false
    return unit.prerequisites.some(p => !completedNodeIds.includes(p))
  }, [roadmap, completedNodeIds])

  const openUnit = useCallback((id: string, title: string) => {
    setSelectedNodeId(id)
    setCurrentTopic(title)
    setContentPanelOpen(true)
    // Reset fired interactions for this new unit so all tabs get recorded fresh
    firedInteractionsRef.current[id] ??= new Set()
    const unit = roadmap?.units.find(u => u.id === id)
    if (unit) {
      setMessages(prev => [...prev, { role: 'tutor', content: isEn
        ? `Switching to **${title}**. ${unit.description}`
        : `Mudando para **${title}**. ${unit.description}` }])
    }
  }, [roadmap, isEn])

  const recordInteraction = useCallback(async (
    type: 'read' | 'cards' | 'quiz' | 'listen' | 'watch',
    opts?: { score?: number; minutesSpent?: number; force?: boolean }
  ) => {
    if (!selectedNodeId || !sessionId) return
    // De-duplicate per unit per type (quiz is always re-recorded)
    if (type !== 'quiz' && !opts?.force) {
      const bucket = firedInteractionsRef.current[selectedNodeId] ??= new Set()
      if (bucket.has(type)) return
      bucket.add(type)
    }
    try {
      const res = await fetch('/api/study/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          unitId: selectedNodeId,
          topicId,
          interactionType: type,
          score: opts?.score,
          minutesSpent: opts?.minutesSpent,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.pillars) setTopicPillars(data.pillars)
        if (data.completedCourseIds) setCompletedNodeIds(data.completedCourseIds)
      }
    } catch {}
  }, [selectedNodeId, sessionId, topicId])

  const handleNodeSelect = useCallback(async (id: string, label: string) => {
    if (!isUnitLocked(id)) {
      openUnit(id, label)
      return
    }

    // 3-strike rule: if failed 3+ times, require completing a prerequisite first
    const failCount = unlockFailCounts[id] ?? 0
    if (failCount >= 3) {
      const unit = roadmap?.units.find(u => u.id === id)
      const incomplete = (unit?.prerequisites ?? [])
        .filter(p => !completedNodeIds.includes(p))
        .map(p => roadmap?.units.find(u => u.id === p))
        .filter((u): u is NonNullable<typeof u> => Boolean(u))
        .sort((a, b) => a.tier - b.tier)
      const prereqTodo = incomplete[0]
      setMessages(prev => [...prev, { role: 'tutor', content: isEn
        ? `You've tried unlocking **${label}** ${failCount} times. Complete at least one more lesson on **${prereqTodo?.title ?? 'a prerequisite topic'}** before trying again — it'll make a real difference.`
        : `Você tentou desbloquear **${label}** ${failCount} vezes. Conclua pelo menos uma aula sobre **${prereqTodo?.title ?? 'um tópico pré-requisito'}** antes de tentar novamente.` }])
      if (prereqTodo) openUnit(prereqTodo.id, prereqTodo.title)
      return
    }

    // Locked node — generate prerequisite challenge
    const unit = roadmap?.units.find(u => u.id === id)
    if (!unit) return

    const incompletePrereqs = unit.prerequisites
      .filter(p => !completedNodeIds.includes(p))
      .map(p => roadmap?.units.find(u => u.id === p))
      .filter((u): u is NonNullable<typeof u> => Boolean(u))

    const conceptsCovered = incompletePrereqs.flatMap(u => u.conceptTags ?? [])
    const prereqName = incompletePrereqs.map(u => u.title).join(', ') || label

    setMessages(prev => [...prev, { role: 'tutor', content: isEn
      ? `**${label}** is locked. Answer a few questions to see if you already know the prerequisites — you might be able to skip ahead!`
      : `**${label}** está bloqueado. Responda algumas perguntas para ver se você já conhece os pré-requisitos — você pode pular adiante!` }])

    setUnlockLoading(true)
    try {
      const res = await fetch('/api/study/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, courseName: prereqName, conceptsCovered }),
      })
      if (!res.ok) return
      const data = await res.json() as { questions: CheckpointQuestion[] }
      if (data.questions?.length) {
        setUnlockTargetId(id)
        setCheckpointQuestions(data.questions)
        setCheckpointMode('unlock')
        setShowCheckpoint(true)
      }
    } catch {} finally {
      setUnlockLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap, isEn, completedNodeIds, sessionId, isUnitLocked, openUnit, unlockFailCounts])

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
  const togglePodcast = () => {
    if (!podcastAudioRef.current) return
    if (podcastPlaying) {
      podcastAudioRef.current.pause()
      setPodcastPlaying(false)
    } else {
      podcastAudioRef.current.play()
      setPodcastPlaying(true)
    }
  }

  const generatePodcast = async () => {
    if (!selectedNodeId || !unitContent) return
    // If audio already generated for this unit, just play
    if (podcastAudioRef.current && podcastUnitRef.current === selectedNodeId) {
      podcastAudioRef.current.currentTime = 0
      podcastAudioRef.current.play()
      setPodcastPlaying(true)
      return
    }

    setPodcastError(null)
    setPodcastGenerating(true)
    setPodcastGeneratePhase('script')

    try {
      // Phase 1: check if dialogue script is already cached
      const studyTopic = initialTopic || ''
      const topicParam = encodeURIComponent(studyTopic)
      const checkRes = await fetch(`/api/podcast/generate?sessionId=${sessionId}&unitId=${selectedNodeId}&topic=${topicParam}`)
      if (checkRes.ok) {
        const checkData = await checkRes.json()
        if (checkData.dialogue?.length) setPodcastDialogue(checkData.dialogue)
      }

      // Phase 2: synthesize (includes script generation if not cached)
      setPodcastGeneratePhase('voices')
      const res = await fetch('/api/podcast/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, unitId: selectedNodeId, topic: studyTopic }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        setPodcastError(err.error ?? 'Generation failed')
        return
      }

      // If dialogue wasn't pre-loaded, try to get it now
      if (!podcastDialogue) {
        const scriptRes = await fetch(`/api/podcast/generate?sessionId=${sessionId}&unitId=${selectedNodeId}&topic=${topicParam}`)
        if (scriptRes.ok) {
          const sd = await scriptRes.json()
          if (sd.dialogue?.length) setPodcastDialogue(sd.dialogue)
        }
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      podcastAudioRef.current = audio
      podcastUnitRef.current = selectedNodeId
      audio.ontimeupdate = () => {
        if (audio.duration) setPodcastProgress(audio.currentTime / audio.duration)
      }
      audio.onended = () => { setPodcastPlaying(false); setPodcastProgress(0) }
      audio.play()
      setPodcastPlaying(true)
      recordInteraction('listen', { minutesSpent: 8 })
    } catch (err) {
      setPodcastError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setPodcastGenerating(false)
      setPodcastGeneratePhase(null)
    }
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
    <main className="h-screen bg-[#0d0d0d] flex flex-col overflow-hidden">

      {/* Unlock challenge loading overlay */}
      {unlockLoading && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-[#0d0d0d]/80 backdrop-blur-sm px-4">
          <div className="bg-[#141414] border border-[#22D3EE]/20 rounded-2xl p-8 flex flex-col items-center gap-5 max-w-sm w-full text-center">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-2 border-[#22D3EE]/15" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#22D3EE] animate-spin" />
              <div className="absolute inset-[6px] rounded-full border border-[#F94716]/20 border-t-[#F94716] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.2s' }} />
            </div>
            <div>
              <p className="text-[#22D3EE] text-[10px] uppercase tracking-widest mb-1.5">
                {isEn ? 'Unlock challenge' : 'Desafio de desbloqueio'}
              </p>
              <p className="text-[#F0F0F5] text-base font-light">
                {isEn ? 'Preparing your challenge…' : 'Preparando seu desafio…'}
              </p>
              <p className="text-[#8A8FA8]/60 text-xs mt-2">
                {isEn ? 'Generating questions based on prerequisites' : 'Gerando perguntas com base nos pré-requisitos'}
              </p>
            </div>
          </div>
        </div>
      )}

      {showCheckpoint && (
        <CheckpointModal
          questions={checkpointQuestions}
          courseName={unlockTargetId
            ? (roadmap?.units.find(u => u.id === unlockTargetId)?.title ?? currentTopic)
            : (selectedUnit?.title ?? currentTopic)}
          language={profile?.language ?? 'en'}
          mode={checkpointMode}
          onCancel={() => {
            setShowCheckpoint(false)
            setCheckpointMode('checkpoint')
            setUnlockTargetId(null)
          }}
          onComplete={(score) => {
            setShowCheckpoint(false)
            setLastCheckpointScore(score)

            if (checkpointMode === 'unlock' && unlockTargetId) {
              const targetUnit = roadmap?.units.find(u => u.id === unlockTargetId)
              if (score >= 70) {
                // Pass — mark prerequisites as known, open the locked topic
                const prereqIds = targetUnit?.prerequisites ?? []
                setCompletedNodeIds(prev => [...new Set([...prev, ...prereqIds])])
                openUnit(unlockTargetId, targetUnit?.title ?? '')
                setMessages(prev => [...prev, { role: 'tutor', content: isEn
                  ? `You proved it! **${targetUnit?.title}** is now unlocked.`
                  : `Você provou! **${targetUnit?.title}** está desbloqueado agora.` }])
              } else {
                // Fail — increment fail count, redirect to most foundational prereq
                setUnlockFailCounts(prev => ({ ...prev, [unlockTargetId]: (prev[unlockTargetId] ?? 0) + 1 }))
                const incomplete = (targetUnit?.prerequisites ?? [])
                  .filter(p => !completedNodeIds.includes(p))
                  .map(p => roadmap?.units.find(u => u.id === p))
                  .filter((u): u is NonNullable<typeof u> => Boolean(u))
                  .sort((a, b) => a.tier - b.tier)
                const redirect = incomplete[0]
                const newCount = (unlockFailCounts[unlockTargetId] ?? 0) + 1
                const attemptsLeft = Math.max(0, 3 - newCount)
                if (redirect) {
                  openUnit(redirect.id, redirect.title)
                  setMessages(prev => [...prev, { role: 'tutor', content: isEn
                    ? `Not quite! Let's master **${redirect.title}** first.${attemptsLeft > 0 ? ` (${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left before a lesson is required)` : ''}`
                    : `Quase lá! Vamos dominar **${redirect.title}** primeiro.${attemptsLeft > 0 ? ` (${attemptsLeft} tentativa${attemptsLeft === 1 ? '' : 's'} restante${attemptsLeft === 1 ? '' : 's'} antes de uma aula ser necessária)` : ''}` }])
                }
              }
              setUnlockTargetId(null)
              setCheckpointMode('checkpoint')
            } else {
              // Normal checkpoint
              if (score >= 70 && selectedNodeId) {
                setCompletedNodeIds(prev => [...prev, selectedNodeId])
              }
              fetch('/api/study/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, courseId: selectedNodeId ?? 'current', checkpointScore: score }),
              }).catch(console.error)
              if (score >= 80) setShowReflection(true)
            }
          }}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 border-b border-[#8A8FA8]/8 bg-[#0d0d0d]/90 backdrop-blur-sm"
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
          <span className="flex-shrink-0 text-[#F94716]/70 text-[10px] border border-[#F94716]/20 rounded-full px-2.5 py-0.5">
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
              className={`px-2.5 py-1 transition-colors ${profile?.language === lang ? 'bg-[#F94716] text-white' : 'bg-[#141414] text-[#8A8FA8] hover:text-[#F0F0F5]'}`}>
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
                  <div className="w-8 h-8 rounded-full border-2 border-[#F94716]/30 border-t-[#F94716] animate-spin" />
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
              <div className="w-8 h-8 rounded-full border-2 border-[#F94716]/30 border-t-[#F94716] animate-spin" />
              <p className="text-[#8A8FA8]/60 text-sm">
                {isEn ? 'Building your learning path…' : 'Criando seu caminho de aprendizagem…'}
              </p>
            </div>
          )}

          {/* Floating hint */}
          {!selectedNodeId && mapUnits.length > 0 && (
            <div className="absolute top-4 left-5 pointer-events-none">
              <p className="text-[#F94716]/70 text-[10px] uppercase tracking-widest">
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
              className="absolute top-4 left-4 text-[10px] uppercase tracking-widest text-[#F94716] border border-[#F94716]/30 px-3 py-1.5 rounded-full hover:bg-[#F94716]/10 transition-colors backdrop-blur-sm bg-[#0d0d0d]/40"
            >
              {isEn ? 'View materials' : 'Ver materiais'}
            </button>
          )}

          {/* ── Map legend — bottom center ── */}
          {mapUnits.length > 0 && (
            <MapLegend isEn={isEn} />
          )}

          {/* ── Floating radar — top-right ── */}
          {topicPillars && (
            <div className="absolute top-4 right-4 z-10">
              {radarOpen ? (
                <div className="bg-[#141414]/95 backdrop-blur-md border border-[#F94716]/20 rounded-2xl p-3 shadow-xl shadow-black/40">
                  <div className="flex items-center justify-between mb-1 px-1">
                    <p className="text-[#8A8FA8] text-[9px] uppercase tracking-widest">
                      {isEn ? 'Your proficiency' : 'Sua proficiência'}
                    </p>
                    <button
                      onClick={() => setRadarOpen(false)}
                      className="text-[#8A8FA8]/40 hover:text-[#8A8FA8] transition-colors ml-4"
                      aria-label="Close radar"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <RadarChart
                    pillars={topicPillars}
                    label=""
                    language={profile?.language ?? 'en'}
                    size={170}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setRadarOpen(true)}
                  className="flex items-center gap-1.5 bg-[#141414]/80 backdrop-blur-sm border border-[#F94716]/20 hover:border-[#F94716]/50 rounded-full px-3 py-1.5 transition-all group"
                  aria-label="Show proficiency radar"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#F94716]">
                    <polygon points="6,1 11,4.5 9,10 3,10 1,4.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round"/>
                    <polygon points="6,3.5 8.5,5.5 7.5,8.5 4.5,8.5 3.5,5.5" fill="currentColor" opacity="0.4"/>
                  </svg>
                  <span className="text-[#8A8FA8] text-[10px] group-hover:text-[#F0F0F5] transition-colors">
                    {isEn ? 'Proficiency' : 'Proficiência'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Content panel — left sidebar ── */}
        <div
          className={`absolute inset-y-0 left-0 w-full sm:w-[340px] bg-[#141414] border-r border-[#8A8FA8]/8 flex flex-col transition-transform duration-300 ease-out z-20 ${
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
              <button key={tab} onClick={() => {
                setContentTab(tab)
                const typeMap: Partial<Record<ContentTab, 'read' | 'cards' | 'listen' | 'watch'>> = {
                  overview: 'read', cards: 'cards', listen: 'listen', watch: 'watch',
                }
                const interactionType = typeMap[tab]
                if (interactionType) recordInteraction(interactionType)
              }}
                className={`flex-1 py-2.5 text-[10px] uppercase tracking-widest transition-colors ${
                  contentTab === tab
                    ? 'text-[#F94716] border-b border-[#F94716]'
                    : 'text-[#8A8FA8]/50 hover:text-[#8A8FA8]'
                }`}>
                {tabLabels[tab].icon}{' '}{isEn ? tabLabels[tab].en : tabLabels[tab].pt}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto relative">

            {/* Loading skeleton — stays visible during both cache-check and generation */}
            {(contentLoading || contentGenerating) && (
              <div className="p-4 space-y-5 animate-pulse">
                {/* Tag pills */}
                <div className="flex gap-2">
                  <div className="h-5 w-14 rounded-full bg-[#F94716]/15" />
                  <div className="h-5 w-10 rounded-full bg-[#8A8FA8]/10" />
                  <div className="h-5 w-16 rounded-full bg-[#22D3EE]/10" />
                </div>

                {/* Key points block */}
                <div className="space-y-2.5">
                  <div className="h-2.5 w-20 rounded bg-[#8A8FA8]/15" />
                  {[100, 88, 95, 76].map((w, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#F94716]/30 mt-1.5 flex-shrink-0" />
                      <div className={`h-2.5 rounded bg-[#8A8FA8]/10`} style={{ width: `${w}%` }} />
                    </div>
                  ))}
                </div>

                {/* Explanation block */}
                <div className="space-y-2">
                  <div className="h-2.5 w-24 rounded bg-[#8A8FA8]/15" />
                  {[100, 94, 100, 88, 72, 60].map((w, i) => (
                    <div key={i} className="h-2 rounded bg-[#8A8FA8]/8" style={{ width: `${w}%` }} />
                  ))}
                </div>

                {/* Bottom card shimmer */}
                <div className="rounded-2xl border border-[#8A8FA8]/8 bg-[#8A8FA8]/4 h-20" />
              </div>
            )}

            {/* Generating overlay — shown on top of skeleton while AI produces content */}
            {contentGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#141414]/90 backdrop-blur-sm z-10">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-2 border-[#F94716]/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#F94716] animate-spin" />
                  <div className="absolute inset-[5px] rounded-full border border-transparent border-t-[#FF6B3D] animate-spin" style={{ animationDuration: '1.4s', animationDirection: 'reverse' }} />
                </div>
                <div className="text-center px-4">
                  <p className="text-[#F0F0F5] text-sm font-light mb-1">
                    {isEn ? 'Preparing your materials…' : 'Preparando seus materiais…'}
                  </p>
                  <p className="text-[#8A8FA8]/60 text-[11px]">
                    {isEn ? 'Generating content for this topic' : 'Gerando conteúdo para este tópico'}
                  </p>
                </div>
              </div>
            )}

            {/* Error state with retry */}
            {!contentLoading && !contentGenerating && !unitContent && contentError && (
              <div className="p-6 flex flex-col items-center gap-4 text-center">
                <div className="w-10 h-10 rounded-full border border-red-500/30 flex items-center justify-center">
                  <span className="text-red-400 text-base">!</span>
                </div>
                <div>
                  <p className="text-[#F0F0F5] text-sm mb-1">
                    {isEn ? 'Content failed to load' : 'Erro ao carregar conteúdo'}
                  </p>
                  <p className="text-[#8A8FA8]/50 text-[11px] leading-relaxed mb-4">
                    {contentError}
                  </p>
                  <button
                    onClick={() => selectedNodeId && loadUnitContent(selectedNodeId)}
                    className="text-[#F94716] text-xs border border-[#F94716]/30 rounded-full px-4 py-1.5 hover:bg-[#F94716]/10 transition-colors"
                  >
                    {isEn ? 'Try again' : 'Tentar novamente'}
                  </button>
                </div>
              </div>
            )}

            {/* No unit selected */}
            {!contentLoading && !contentGenerating && !unitContent && !contentError && (
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
                    <span className="text-[#F94716]/70 text-[10px] border border-[#F94716]/20 rounded-full px-2.5 py-0.5">
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
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F94716] mt-1.5 flex-shrink-0" />
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
                    <div className="w-16 h-16 rounded-full border-2 border-[#F94716]/40 flex items-center justify-center">
                      <span className="text-2xl font-bold text-[#F94716]">{quizScore}/{unitContent.quiz.length}</span>
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
                      className="px-5 py-2.5 rounded-xl bg-[#F94716]/10 border border-[#F94716]/25 text-[#F94716] text-sm hover:bg-[#F94716]/20 transition-colors"
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
                        <div className="bg-[#0d0d0d] rounded-xl p-3 border border-[#8A8FA8]/8">
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
                              const pct = Math.round(((quizScore + (quizSelected === unitContent.quiz[quizIdx].answer ? 1 : 0)) / unitContent.quiz.length) * 100)
                              recordInteraction('quiz', { score: pct, minutesSpent: Math.round(unitContent.quiz.length * 1.5), force: true })
                            } else {
                              setQuizIdx(v => v + 1)
                              setQuizSelected(null)
                              setQuizAnswered(false)
                            }
                          }}
                          className="w-full py-2.5 rounded-xl bg-[#F94716] text-white text-sm hover:opacity-90 transition-opacity"
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

            {/* LISTEN TAB (Two-host Podcast) */}
            {!contentLoading && unitContent && contentTab === 'listen' && (
              <div className="p-4 flex flex-col gap-4">

                {/* Episode card */}
                <div className="bg-[#0d0d0d] border border-[#8A8FA8]/10 rounded-2xl p-5 flex flex-col gap-4">

                  {/* Two hosts row */}
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F94716] to-[#22D3EE] flex items-center justify-center text-[#F0F0F5] text-xs font-semibold ring-2 ring-[#0d0d0d] z-10">
                        {isEn ? 'A' : 'C'}
                      </div>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#34C785] to-[#F59E0B] flex items-center justify-center text-[#0d0d0d] text-xs font-semibold ring-2 ring-[#0d0d0d]">
                        {isEn ? 'S' : 'M'}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[#F0F0F5] text-sm font-medium leading-snug truncate">
                        {selectedUnit?.title ?? currentTopic}
                      </p>
                      <p className="text-[#8A8FA8]/50 text-[10px] mt-0.5">
                        {isEn ? `${isEn ? 'Alex' : 'Carlos'} & ${isEn ? 'Sam' : 'Marina'} · ~10 min` : `Carlos & Marina · ~10 min`}
                      </p>
                    </div>
                    <div className="text-[#F94716]/70 text-[10px] uppercase tracking-widest border border-[#F94716]/20 px-2 py-0.5 rounded-full flex-shrink-0">
                      {isEn ? 'AI Podcast' : 'Podcast IA'}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1 bg-[#8A8FA8]/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#F94716] to-[#34C785] rounded-full transition-all duration-300"
                      style={{ width: `${podcastProgress * 100}%` }}
                    />
                  </div>

                  {/* Generating overlay */}
                  {podcastGenerating && (
                    <div className="flex flex-col items-center gap-3 py-3">
                      <div className="relative w-10 h-10">
                        <div className="absolute inset-0 rounded-full border-2 border-[#F94716]/15" />
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#F94716] animate-spin" />
                        <div className="absolute inset-[5px] rounded-full border border-[#34C785]/20 border-t-[#34C785] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.1s' }} />
                      </div>
                      <div className="text-center">
                        <p className="text-[#F0F0F5] text-xs font-medium">
                          {podcastGeneratePhase === 'script'
                            ? (isEn ? 'Writing the discussion script…' : 'Escrevendo o roteiro…')
                            : (isEn ? 'Synthesizing voices…' : 'Sintetizando vozes…')}
                        </p>
                        <p className="text-[#8A8FA8]/50 text-[10px] mt-0.5">
                          {podcastGeneratePhase === 'voices'
                            ? (isEn ? 'This takes ~20–30 seconds' : 'Isso leva ~20–30 segundos')
                            : (isEn ? 'Crafting the perfect conversation' : 'Criando a conversa perfeita')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Error state */}
                  {podcastError && !podcastGenerating && (
                    <div className="flex items-center gap-2 text-[#F87171] text-xs bg-[#F87171]/8 rounded-xl px-3 py-2.5">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="flex-1">{podcastError.includes('API key') ? (isEn ? 'OpenAI API key not configured' : 'Chave OpenAI não configurada') : podcastError}</span>
                    </div>
                  )}

                  {/* Controls */}
                  {!podcastGenerating && (
                    <div className="flex items-center gap-3">
                      {podcastAudioRef.current && podcastUnitRef.current === selectedNodeId ? (
                        <>
                          <button
                            onClick={togglePodcast}
                            className="w-11 h-11 rounded-full bg-[#F94716] hover:bg-[#6D28D9] transition-colors flex items-center justify-center flex-shrink-0 cursor-pointer"
                          >
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              {podcastPlaying
                                ? <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                : <path d="M8 5v14l11-7z" />}
                            </svg>
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#F0F0F5] text-xs font-medium">
                              {podcastPlaying ? (isEn ? 'Playing…' : 'Tocando…') : (isEn ? 'Paused' : 'Pausado')}
                            </p>
                            <p className="text-[#8A8FA8]/50 text-[10px]">
                              {isEn ? 'Tap to pause/resume' : 'Toque para pausar/continuar'}
                            </p>
                          </div>
                        </>
                      ) : (
                        <button
                          onClick={generatePodcast}
                          className="flex items-center gap-3 text-[#F94716] hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          <span className="w-11 h-11 rounded-full border border-[#F94716]/40 bg-[#F94716]/8 hover:bg-[#F94716]/15 transition-colors flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                          </span>
                          <span className="text-sm">
                            {isEn ? 'Create & play podcast' : 'Criar e ouvir podcast'}
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Waveform */}
                <div className="flex items-center gap-0.5 h-8 px-2">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div key={i}
                      className="rounded-full flex-1 transition-all duration-150"
                      style={{
                        height: podcastPlaying ? `${20 + Math.abs(Math.sin(i * 0.7 + Date.now() / 200)) * 70}%` : '20%',
                        backgroundColor: i % 2 === 0 ? (podcastPlaying ? '#F94716' : '#F9471644') : (podcastPlaying ? '#34C785' : '#34C78544'),
                      }}
                    />
                  ))}
                </div>

                {/* Transcript */}
                {podcastDialogue && podcastDialogue.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <p className="text-[#8A8FA8]/50 text-[10px] uppercase tracking-widest px-1">
                      {isEn ? 'Transcript' : 'Transcrição'}
                    </p>
                    {podcastDialogue.map((turn, i) => (
                      <div key={i} className={`flex gap-2.5 ${turn.speaker === 'B' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-semibold ring-1 mt-0.5 ${
                          turn.speaker === 'A'
                            ? 'bg-gradient-to-br from-[#F94716] to-[#22D3EE] text-[#F0F0F5] ring-[#F94716]/30'
                            : 'bg-gradient-to-br from-[#34C785] to-[#F59E0B] text-[#0d0d0d] ring-[#34C785]/30'
                        }`}>
                          {turn.name[0]}
                        </div>
                        <div className={`flex-1 rounded-xl px-3.5 py-2.5 ${
                          turn.speaker === 'A'
                            ? 'bg-[#F94716]/8 border border-[#F94716]/15'
                            : 'bg-[#34C785]/8 border border-[#34C785]/15'
                        }`}>
                          <p className={`text-[10px] font-medium mb-1 ${turn.speaker === 'A' ? 'text-[#F94716]' : 'text-[#34C785]'}`}>
                            {turn.name}
                          </p>
                          <p className="text-[#C4C6DA] text-xs leading-relaxed">{turn.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  <div key={section.label} className="bg-[#0d0d0d] border border-[#8A8FA8]/10 rounded-xl p-4">
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
            className="bg-[#141414] border border-[#8A8FA8]/12 rounded-3xl flex flex-col overflow-hidden"
            style={{ height: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.65), 0 0 0 1px rgba(124,58,237,0.1)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#8A8FA8]/8 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#F94716]" />
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
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#F94716]/40 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              )}
              {showReflection && (
                <div className="bg-[#0d0d0d] border border-[#34C785]/30 rounded-2xl p-4 mt-2">
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
                    className="w-full bg-[#141414] border border-[#8A8FA8]/20 rounded-xl text-[#F0F0F5] placeholder-[#8A8FA8]/50 text-sm p-3 outline-none resize-none min-h-[60px]"
                  />
                  <button onClick={handleReflectionSubmit}
                    className="mt-2 bg-[#34C785] text-[#0d0d0d] font-medium px-4 py-2 rounded-xl text-xs hover:opacity-90 transition-opacity">
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
              <div className="flex gap-3 items-center bg-[#0d0d0d] border border-[#8A8FA8]/10 rounded-2xl px-4 py-2.5">
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
                  className="w-7 h-7 rounded-full bg-[#F94716] flex items-center justify-center text-white text-xs disabled:opacity-30 flex-shrink-0 transition-opacity hover:opacity-80"
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
              ? 'rounded-full bg-[#141414] border border-[#8A8FA8]/20 text-[#8A8FA8] hover:border-[#8A8FA8]/40 justify-center'
              : 'rounded-full bg-gradient-to-br from-[#F94716] to-[#FF6B3D] text-white hover:opacity-90 shadow-lg shadow-[#F94716]/20 pl-5 pr-6'
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
