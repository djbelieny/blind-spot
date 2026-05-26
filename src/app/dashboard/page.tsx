'use client'
import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ConstellationBackground from '@/components/onboarding/ConstellationBackground'
import RadarChart from '@/components/RadarChart'
import type { LearnerProfile, TrackProgress, Language, LearnerPillars, StudyTopic, QuizQuestion } from '@/types/learner'

interface DashUser {
  id: string
  name?: string
  email: string
  cefisName?: string
  cefisEmail?: string
  cefisTrackIds?: string[]
  sessionIds: string[]
}

interface PendingQuiz {
  topicName: string
  questions: QuizQuestion[]
  startedAt: number
}

const DNA_META: Record<string, {
  symbol: string
  color: string
  en: { name: string; tagline: string; description: string; strengths: string[]; watchOut: string }
  pt: { name: string; tagline: string; description: string; strengths: string[]; watchOut: string }
}> = {
  explorador: {
    symbol: '◎', color: '#7C3AED',
    en: {
      name: 'Practical Explorer', tagline: 'You learn by doing, not by reading.',
      description: 'You process information best through hands-on experience. Passive reading doesn\'t stick — you need to try things, make mistakes, and iterate. Your understanding solidifies through doing, not observing.',
      strengths: ['Learns fast through trial and error', 'Retains applied knowledge deeply', 'Builds real skills, not just theory'],
      watchOut: 'Skipping foundational concepts when jumping straight to practice.',
    },
    pt: {
      name: 'Explorador Prático', tagline: 'Você aprende fazendo, não lendo.',
      description: 'Você processa melhor a informação pela experiência prática. Leitura passiva não fica — você precisa tentar, errar e iterar. Seu entendimento se consolida fazendo, não observando.',
      strengths: ['Aprende rápido por tentativa e erro', 'Retém conhecimento aplicado com profundidade', 'Constrói habilidades reais, não só teoria'],
      watchOut: 'Pular conceitos fundamentais ao ir direto à prática.',
    },
  },
  absorvedor: {
    symbol: '◈', color: '#0EA5E9',
    en: {
      name: 'Visual Absorber', tagline: 'You retain what you can picture.',
      description: 'Your memory is visual. Diagrams, videos, and spatial representations stay with you long after text fades. You build mental models by seeing concepts, not just reading about them.',
      strengths: ['Exceptional visual memory', 'Maps complex systems with diagrams', 'Understands patterns quickly'],
      watchOut: 'Struggling with purely abstract or text-heavy material.',
    },
    pt: {
      name: 'Absorvedor Visual', tagline: 'Você retém o que consegue visualizar.',
      description: 'Sua memória é visual. Diagramas, vídeos e representações espaciais ficam com você muito depois do texto desaparecer. Você constrói modelos mentais vendo conceitos, não só lendo sobre eles.',
      strengths: ['Memória visual excepcional', 'Mapeia sistemas complexos com diagramas', 'Reconhece padrões rapidamente'],
      watchOut: 'Dificuldade com material puramente abstrato ou muito textual.',
    },
  },
  construtor: {
    symbol: '▦', color: '#F59E0B',
    en: {
      name: 'Methodical Builder', tagline: 'You need structure to move forward.',
      description: 'You need a clear foundation before building up. Random or out-of-sequence information frustrates you. Once you have the structure, you\'re unstoppable — you execute systematically and thoroughly.',
      strengths: ['Deep, durable understanding', 'Systematic and reliable executor', 'Catches gaps others miss'],
      watchOut: 'Getting stuck perfecting one layer before moving to the next.',
    },
    pt: {
      name: 'Construtor Metódico', tagline: 'Você precisa de estrutura para avançar.',
      description: 'Você precisa de uma base clara antes de construir. Informação fora de sequência te frustra. Uma vez com a estrutura, é imparável — executa de forma sistemática e completa.',
      strengths: ['Entendimento profundo e duradouro', 'Executor sistemático e confiável', 'Detecta lacunas que outros perdem'],
      watchOut: 'Ficar travado perfeccionando uma camada antes de avançar.',
    },
  },
  conector: {
    symbol: '⬡', color: '#10B981',
    en: {
      name: 'Conceptual Connector', tagline: 'You need the "why" before the "how".',
      description: 'You learn by connecting new ideas to what you already know. The why has to come before the how. Once you understand the context and purpose, everything else clicks rapidly.',
      strengths: ['Builds rich mental models', 'Transfers knowledge across domains', 'Understands systems, not just parts'],
      watchOut: 'Over-thinking context before taking action.',
    },
    pt: {
      name: 'Conector Conceitual', tagline: 'Você precisa do "porquê" antes do "como".',
      description: 'Você aprende conectando novas ideias ao que já sabe. O porquê tem que vir antes do como. Assim que entende o contexto e propósito, todo o resto se encaixa rapidamente.',
      strengths: ['Constrói modelos mentais ricos', 'Transfere conhecimento entre domínios', 'Entende sistemas, não só partes'],
      watchOut: 'Pensar demais no contexto antes de agir.',
    },
  },
  sprint: {
    symbol: '⚡', color: '#C026D3',
    en: {
      name: 'Intense Sprinter', tagline: 'Short focus, high intensity — you peak fast.',
      description: 'You operate in intense bursts. Long sessions drain you, but 15-25 minute focused sprints are where you peak. You absorb dense material fast and need to move before boredom sets in.',
      strengths: ['Rapid absorption in short windows', 'High-intensity focus when engaged', 'Learns efficiently under time pressure'],
      watchOut: 'Losing depth when sprints are too disconnected.',
    },
    pt: {
      name: 'Sprint Intenso', tagline: 'Foco curto, alta intensidade.',
      description: 'Você opera em rajadas intensas. Sessões longas te drenam, mas sprints de 15-25 minutos são onde você performa melhor. Você absorve material denso rápido e precisa seguir antes do tédio.',
      strengths: ['Absorção rápida em janelas curtas', 'Foco de alta intensidade quando engajado', 'Aprende com eficiência sob pressão de tempo'],
      watchOut: 'Perder profundidade quando os sprints são muito desconectados.',
    },
  },
}

const BACKGROUND_META: Record<string, { en: string; pt: string; icon: string }> = {
  novice:       { en: 'Beginner',     pt: 'Iniciante',      icon: '○' },
  intermediate: { en: 'Intermediate', pt: 'Intermediário',   icon: '◑' },
  expert:       { en: 'Advanced',     pt: 'Avançado',        icon: '●' },
}
const URGENCY_META: Record<string, { en: string; pt: string; icon: string }> = {
  immediate:      { en: 'Urgent',      pt: 'Urgente',       icon: '⚡' },
  'medium-term':  { en: 'Medium-term', pt: 'Médio prazo',   icon: '◈' },
  exploratory:    { en: 'Exploratory', pt: 'Exploratório',  icon: '◎' },
}
const MOTIVATION_META: Record<string, { en: string; pt: string; icon: string }> = {
  career:    { en: 'Career growth', pt: 'Crescimento profissional', icon: '↗' },
  curiosity: { en: 'Curiosity',     pt: 'Curiosidade',              icon: '◎' },
  academic:  { en: 'Academic',      pt: 'Acadêmico',                icon: '▦' },
  survival:  { en: 'Survival mode', pt: 'Modo sobrevivência',       icon: '!' },
}
const STYLE_META: Record<string, { en: string; pt: string; icon: string }> = {
  visual:   { en: 'Visual',   pt: 'Visual',   icon: '◈' },
  reading:  { en: 'Reading',  pt: 'Leitura',  icon: '▭' },
  practice: { en: 'Practice', pt: 'Prática',  icon: '◉' },
  auditory: { en: 'Auditory', pt: 'Auditivo', icon: '♪' },
}
const RHYTHM_META: Record<string, { en: string; pt: string; icon: string }> = {
  sprints:     { en: 'Short sprints', pt: 'Sprints curtos', icon: '⚡' },
  'deep-dive': { en: 'Deep focus',   pt: 'Foco profundo',  icon: '◈' },
}

const PERSONA_META: Record<string, { en: string; pt: string; icon: string }> = {
  direto:      { en: 'Direct',     pt: 'Direto',      icon: '→' },
  encorajador: { en: 'Supportive', pt: 'Encorajador', icon: '◉' },
  socratico:   { en: 'Socratic',   pt: 'Socrático',   icon: '?' },
}

function Dots() {
  return (
    <div className="flex gap-1.5 justify-center py-12">
      {[0,1,2].map(i => (
        <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]/40 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
      ))}
    </div>
  )
}

function ProfileStrip({ profile, isEn }: { profile: LearnerProfile; isEn: boolean }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const dna = profile.dnaType ? DNA_META[profile.dnaType] : null
  const persona = profile.persona ? PERSONA_META[profile.persona] : null
  if (!dna) return null

  const dnaContent = isEn ? dna.en : dna.pt
  const bgMeta    = BACKGROUND_META[profile.backgroundLevel]
  const urgMeta   = URGENCY_META[profile.urgency]
  const motMeta   = MOTIVATION_META[profile.motivationType]
  const styleMeta = STYLE_META[profile.learningStyle]
  const rhtMeta   = RHYTHM_META[profile.rhythm]

  const traits = [
    { label: isEn ? 'Level'      : 'Nível',      icon: bgMeta?.icon,  value: isEn ? bgMeta?.en  : bgMeta?.pt  },
    { label: isEn ? 'Urgency'    : 'Urgência',   icon: urgMeta?.icon, value: isEn ? urgMeta?.en : urgMeta?.pt },
    { label: isEn ? 'Style'      : 'Estilo',     icon: styleMeta?.icon, value: isEn ? styleMeta?.en : styleMeta?.pt },
    { label: isEn ? 'Rhythm'     : 'Ritmo',      icon: rhtMeta?.icon, value: isEn ? rhtMeta?.en : rhtMeta?.pt },
    { label: isEn ? 'Motivation' : 'Motivação',  icon: motMeta?.icon, value: isEn ? motMeta?.en : motMeta?.pt },
  ]

  return (
    <>
      {/* Strip button */}
      <button
        onClick={() => setDrawerOpen(o => !o)}
        className="group relative w-full overflow-hidden rounded-2xl border border-[#7C3AED]/12 hover:border-[#7C3AED]/30 bg-gradient-to-r from-[#7C3AED]/5 to-transparent px-7 py-5 flex items-center gap-5 mb-1 cursor-pointer transition-all duration-200 text-left"
        aria-label={isEn ? 'View learning DNA' : 'Ver DNA de aprendizado'}
      >
        <span className="text-3xl leading-none flex-shrink-0" style={{ color: dna.color }}>{dna.symbol}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[#8A8FA8] text-[10px] uppercase tracking-widest mb-0.5">
            {isEn ? 'Learning DNA' : 'DNA de aprendizado'}
          </p>
          <p className="text-[#F0F0F5] text-base font-light leading-tight truncate">
            {dnaContent.name}
            <span className="text-[#8A8FA8] ml-2 text-sm">— {dnaContent.tagline}</span>
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0 items-center">
          {persona && (
            <span className="flex items-center gap-1 border border-[#8A8FA8]/15 rounded-full px-3 py-1 text-xs text-[#F0F0F5]">
              <span style={{ color: dna.color }}>{persona.icon}</span>
              {isEn ? persona.en : persona.pt}
            </span>
          )}
          {profile.minutesPerDay > 0 && (
            <span className="flex items-center gap-1 border border-[#8A8FA8]/15 rounded-full px-3 py-1 text-xs text-[#8A8FA8]">
              ◷ {profile.minutesPerDay}{isEn ? 'min/day' : 'min/dia'}
            </span>
          )}
          <span className={`text-[#8A8FA8]/40 text-sm group-hover:text-[#8A8FA8]/70 transition-all duration-300 ml-1 ${drawerOpen ? 'rotate-90' : ''}`}>›</span>
        </div>
        <span className="absolute right-5 top-2 text-[72px] leading-none text-[#7C3AED]/4 select-none pointer-events-none">
          {dna.symbol}
        </span>
      </button>

      {/* Inline expand panel */}
      <div className={`grid transition-all duration-300 ease-out mb-8 ${drawerOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="bg-[#0A0B14] border border-[#8A8FA8]/10 rounded-2xl -mt-4 pt-6 pb-7 px-7 flex flex-col gap-7">

            {/* Description */}
            <p className="text-[#C8C9D8] text-sm leading-relaxed">{dnaContent.description}</p>

            {/* Strengths + Watch out side by side on wider screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <p className="text-[#8A8FA8] text-[10px] uppercase tracking-widest mb-3">
                  {isEn ? 'Strengths' : 'Pontos fortes'}
                </p>
                <ul className="space-y-2">
                  {dnaContent.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-[#F0F0F5]">
                      <span style={{ color: dna.color }} className="mt-0.5 flex-shrink-0">◆</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-[#0E0F1A] border border-[#8A8FA8]/8 rounded-2xl px-5 py-4">
                  <p className="text-[#8A8FA8] text-[10px] uppercase tracking-widest mb-1.5">
                    {isEn ? 'Watch out for' : 'Atenção'}
                  </p>
                  <p className="text-[#C8C9D8] text-sm leading-relaxed">{dnaContent.watchOut}</p>
                </div>

                {profile.objective && (
                  <div>
                    <p className="text-[#8A8FA8] text-[10px] uppercase tracking-widest mb-1.5">
                      {isEn ? 'Goal' : 'Objetivo'}
                    </p>
                    <p className="text-[#C8C9D8] text-sm leading-relaxed italic">"{profile.objective}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Trait grid */}
            <div>
              <p className="text-[#8A8FA8] text-[10px] uppercase tracking-widest mb-3">
                {isEn ? 'Learning profile' : 'Perfil de aprendizado'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {traits.map((t, i) => t.value && (
                  <div key={i} className="bg-[#0E0F1A] border border-[#8A8FA8]/8 rounded-xl px-4 py-3">
                    <p className="text-[#8A8FA8] text-[10px] mb-1">{t.label}</p>
                    <p className="text-[#F0F0F5] text-sm flex items-center gap-1.5">
                      <span className="text-[#8A8FA8]">{t.icon}</span>
                      {t.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div className="flex gap-3">
              {profile.minutesPerDay > 0 && (
                <div className="flex-1 bg-[#0E0F1A] border border-[#8A8FA8]/8 rounded-xl px-4 py-3 text-center">
                  <p className="text-[#F0F0F5] text-xl font-medium tabular-nums">{profile.minutesPerDay}</p>
                  <p className="text-[#8A8FA8] text-[10px] mt-0.5">{isEn ? 'min / day' : 'min / dia'}</p>
                </div>
              )}
              {profile.blindSpotsIdentified.length > 0 && (
                <div className="flex-1 bg-[#0E0F1A] border border-[#22D3EE]/12 rounded-xl px-4 py-3 text-center">
                  <p className="text-[#22D3EE] text-xl font-medium tabular-nums">{profile.blindSpotsIdentified.length}</p>
                  <p className="text-[#8A8FA8] text-[10px] mt-0.5">{isEn ? 'blind spots' : 'pontos cegos'}</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

// ─── Topic quiz card (inline) ──────────────────────────────────────────────────

function TopicQuizCard({
  quiz, isEn, onSubmit, onCancel, submitting,
}: {
  quiz: PendingQuiz
  isEn: boolean
  onSubmit: (answers: Record<string, string>) => void
  onCancel: () => void
  submitting: boolean
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const allAnswered = quiz.questions.length > 0 && quiz.questions.every(q => answers[q.id])

  return (
    <div className="bg-[#0E0F1A] border border-[#7C3AED]/15 rounded-3xl p-7 flex flex-col gap-6">
      <div>
        <p className="text-[#8A8FA8] text-[10px] uppercase tracking-widest mb-2">
          {isEn ? 'Quick knowledge check' : 'Verificação rápida'}
        </p>
        <h3 className="text-[#F0F0F5] text-lg font-medium leading-snug">{quiz.topicName}</h3>
        <p className="text-[#8A8FA8] text-xs mt-2 leading-relaxed">
          {isEn
            ? 'Answer these to help us identify your specific blind spots.'
            : 'Responda para identificarmos seus pontos cegos específicos.'}
        </p>
      </div>

      <div className="space-y-6">
        {quiz.questions.map((q, qi) => (
          <div key={q.id}>
            <p className="text-[#F0F0F5] text-sm font-medium mb-3 leading-snug">
              {qi + 1}. {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all border ${
                    answers[q.id] === opt
                      ? 'border-[#7C3AED]/50 bg-[#7C3AED]/8 text-[#F0F0F5]'
                      : 'border-[#8A8FA8]/12 text-[#8A8FA8] hover:border-[#8A8FA8]/30 hover:text-[#F0F0F5]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button onClick={onCancel} className="text-[#8A8FA8]/50 text-xs hover:text-[#8A8FA8] transition-colors">
          {isEn ? 'Cancel' : 'Cancelar'}
        </button>
        <button
          onClick={() => onSubmit(answers)}
          disabled={!allAnswered || submitting}
          className="text-[#7C3AED] text-sm hover:opacity-80 transition-opacity disabled:opacity-30"
        >
          {submitting
            ? (isEn ? 'Analyzing…' : 'Analisando…')
            : (isEn ? 'Analyze my knowledge →' : 'Analisar meu conhecimento →')}
        </button>
      </div>
    </div>
  )
}

// ─── Topic card ────────────────────────────────────────────────────────────────

function TopicCard({
  topic, isEn, onStudy,
}: {
  topic: StudyTopic
  isEn: boolean
  language: Language
  onStudy: (topic: StudyTopic) => void
}) {
  const vals = Object.values(topic.pillars)
  const proficiency = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
  const hasProgress = vals.some(v => v > 5)

  return (
    <button
      className="group w-full text-left bg-[#0E0F1A] border border-[#8A8FA8]/10 hover:border-[#7C3AED]/40 hover:bg-[#0F1025] rounded-3xl p-7 flex flex-col gap-5 transition-all duration-200"
      onClick={() => onStudy(topic)}
      aria-label={`Study ${topic.name}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between">
        <p className="text-[#8A8FA8] text-[10px] uppercase tracking-widest mt-1">
          {isEn ? 'Learning path' : 'Trilha de aprendizado'}
        </p>
        {hasProgress ? (
          <div className="text-right flex-shrink-0">
            <p className="text-[22px] font-bold text-[#7C3AED] leading-none tabular-nums">{proficiency}%</p>
            <p className="text-[#8A8FA8] text-[10px] mt-0.5">
              {isEn ? 'proficiency' : 'proficiência'}
            </p>
          </div>
        ) : (
          <span className="flex-shrink-0 text-[10px] text-[#8A8FA8]/50 border border-[#8A8FA8]/15 rounded-full px-2.5 py-0.5">
            {isEn ? 'New' : 'Novo'}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-[#F0F0F5] text-xl font-medium leading-snug group-hover:text-white transition-colors">
        {topic.name}
      </h3>

      {/* Proficiency bar */}
      {hasProgress && (
        <div className="h-px bg-[#8A8FA8]/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#7C3AED] to-[#C026D3] rounded-full transition-all duration-700"
            style={{ width: `${proficiency}%` }}
          />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[#7C3AED] text-sm group-hover:text-[#9D5CF7] transition-colors">
          {isEn ? 'Open learning map →' : 'Abrir mapa de aprendizado →'}
        </span>
        {topic.blindSpots.length > 0 && (
          <span className="text-[#22D3EE]/50 text-[10px]">
            {topic.blindSpots.length} {isEn ? 'blind spots' : 'pontos cegos'}
          </span>
        )}
      </div>
    </button>
  )
}

function TopicCardSkeleton() {
  return (
    <div className="bg-[#0E0F1A] border border-[#8A8FA8]/10 rounded-3xl p-7 flex flex-col gap-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="h-2.5 bg-[#8A8FA8]/10 rounded w-24" />
        <div className="h-6 bg-[#7C3AED]/15 rounded w-14" />
      </div>
      <div className="h-6 bg-[#8A8FA8]/10 rounded-lg w-4/5" />
      <div className="h-px bg-[#8A8FA8]/8 rounded-full" />
      <div className="h-4 bg-[#7C3AED]/15 rounded w-1/3" />
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

function DashboardInner() {
  const router = useRouter()

  const [user, setUser] = useState<DashUser | null>(null)
  const [profile, setProfile] = useState<LearnerProfile | null>(null)
  const [tracks, setTracks] = useState<TrackProgress[]>([])
  const [topics, setTopics] = useState<StudyTopic[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState<Language>('en')

  // Quiz flow state
  const [pendingQuiz, setPendingQuiz] = useState<PendingQuiz | null>(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizSubmitting, setQuizSubmitting] = useState(false)

  // CEFIS connect
  const [showCefisForm, setShowCefisForm] = useState(false)
  const [cefisEmail, setCefisEmail] = useState('')
  const [cefisPassword, setCefisPassword] = useState('')
  const [cefisLoading, setCefisLoading] = useState(false)
  const [cefisError, setCefisError] = useState('')

  const [learnInput, setLearnInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const isEn = language === 'en'

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(async (u: DashUser | null) => {
        if (!u) { router.push('/auth/login'); return }
        setUser(u)

        const sessionId = u.sessionIds?.[0] ?? null
        if (!sessionId) { setLoading(false); return }

        const [profRes, tracksRes, topicsRes] = await Promise.all([
          fetch(`/api/study/profile?sessionId=${sessionId}`).then(r => r.ok ? r.json() : null),
          fetch(`/api/profile?sessionId=${sessionId}`).then(r => r.ok ? r.json() : null),
          fetch(`/api/topics?sessionId=${sessionId}`).then(r => r.ok ? r.json() : { topics: [] }),
        ])

        if (profRes) {
          setProfile(profRes)
          setLanguage(profRes.language ?? 'en')
        }
        if (tracksRes?.tracks) setTracks(tracksRes.tracks)
        if (topicsRes?.topics) setTopics(topicsRes.topics)

        fetch(`/api/dashboard/suggestions?sessionId=${sessionId}`)
          .then(r => r.ok ? r.json() : { suggestions: [] })
          .then(d => setSuggestions(d.suggestions ?? []))
          .catch(() => {})
      })
      .catch(() => router.push('/auth/login'))
      .finally(() => setLoading(false))
  }, [router])

  const sessionId = user?.sessionIds?.[0]

  const startTopicFlow = async (topicName: string) => {
    if (!sessionId || quizLoading || pendingQuiz) return
    setLearnInput('')
    setQuizLoading(true)
    try {
      const res = await fetch('/api/topics/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, topicName }),
      })
      if (res.ok) {
        const { questions } = await res.json()
        setPendingQuiz({ topicName, questions: questions ?? [], startedAt: Date.now() })
      }
    } catch {
      // silently fail
    } finally {
      setQuizLoading(false)
    }
  }

  const handleLearnSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = learnInput.trim()
    if (!q) return
    if (!sessionId) { router.push(`/onboarding?q=${encodeURIComponent(q)}`); return }
    await startTopicFlow(q)
  }

  const handleSuggestionClick = (s: string) => startTopicFlow(s)

  const handleQuizSubmit = async (answers: Record<string, string>) => {
    if (!pendingQuiz || !sessionId) return
    setQuizSubmitting(true)
    try {
      const elapsed = Date.now() - pendingQuiz.startedAt
      const perQuestion = Math.round(elapsed / Math.max(pendingQuiz.questions.length, 1))

      const quizResults = pendingQuiz.questions.map(q => ({
        questionId: q.id,
        correct: answers[q.id] === q.correctAnswer,
        conceptTag: q.conceptTag,
        timeToAnswerMs: perQuestion,
      }))

      const res = await fetch('/api/topics/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, topicName: pendingQuiz.topicName, quizResults }),
      })
      if (res.ok) {
        const { topic } = await res.json()
        setTopics(prev => [topic, ...prev])
      }
    } catch {
    } finally {
      setQuizSubmitting(false)
      setPendingQuiz(null)
    }
  }

  const handleStudyTopic = (topic: StudyTopic) => {
    if (sessionId) router.push(`/study/${sessionId}?q=${encodeURIComponent(topic.name)}`)
  }

  const handleCefisConnect = async () => {
    setCefisError('')
    setCefisLoading(true)
    try {
      const res = await fetch('/api/auth/cefis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, email: cefisEmail, password: cefisPassword }),
      })
      if (!res.ok) {
        setCefisError(isEn ? 'Incorrect email or password.' : 'Email ou senha incorretos.')
      } else {
        const me = await fetch('/api/auth/me').then(r => r.json())
        setUser(me)
        setShowCefisForm(false)
        if (sessionId) {
          fetch(`/api/profile?sessionId=${sessionId}`)
            .then(r => r.json())
            .then(d => setTracks(d.tracks ?? []))
            .catch(() => {})
        }
      }
    } catch {
      setCefisError(isEn ? 'Something went wrong.' : 'Algo deu errado.')
    } finally {
      setCefisLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#08090F] flex items-center justify-center">
        <Dots />
      </main>
    )
  }

  const busy = quizLoading || quizSubmitting

  return (
    <main className="min-h-screen bg-[#08090F]">
      <ConstellationBackground nodeCount={28} />
      <div className="relative z-10 max-w-5xl mx-auto px-8 py-12">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-[#7C3AED] text-xs uppercase tracking-widest mb-2">Blind Spot</p>
            <h1 className="text-[#F0F0F5] text-3xl font-light">
              {user?.name
                ? (isEn ? `Welcome back, ${user.name}.` : `Bem-vindo, ${user.name}.`)
                : (isEn ? 'Welcome back.' : 'Bem-vindo de volta.')}
            </h1>
          </div>
          <div className="flex items-center gap-4 mt-2">
            {/* Language toggle */}
            <div className="flex rounded-full border border-[#8A8FA8]/20 overflow-hidden text-xs">
              {(['en', 'pt-BR'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={async () => {
                    setLanguage(lang)
                    if (sessionId) {
                      await fetch('/api/profile/settings', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId, language: lang }),
                      }).catch(console.error)
                    }
                  }}
                  className={`px-3 py-1.5 transition-colors ${
                    language === lang
                      ? 'bg-[#7C3AED] text-white'
                      : 'bg-[#0E0F1A] text-[#8A8FA8] hover:text-[#F0F0F5]'
                  }`}
                >
                  {lang === 'en' ? 'EN' : 'PT'}
                </button>
              ))}
            </div>
            <button onClick={handleLogout} className="text-[#8A8FA8]/40 text-xs hover:text-[#8A8FA8] transition-colors">
              {isEn ? 'Sign out' : 'Sair'}
            </button>
          </div>
        </div>

        {/* Learn today input */}
        <div className="mb-10 max-w-2xl">
          <form onSubmit={handleLearnSubmit} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={learnInput}
              onChange={e => setLearnInput(e.target.value)}
              disabled={busy || !!pendingQuiz}
              placeholder={isEn ? 'What would you like to learn today?' : 'O que você quer aprender hoje?'}
              className="w-full bg-transparent text-[#F0F0F5] text-2xl placeholder-[#8A8FA8]/35 border-b border-[#8A8FA8]/20 focus:border-[#7C3AED]/50 outline-none pb-4 transition-colors pr-24 disabled:opacity-40"
            />
            {learnInput && !busy && !pendingQuiz && (
              <button type="submit" className="absolute right-0 bottom-4 text-[#7C3AED]/80 text-base hover:text-[#7C3AED] transition-colors">
                {isEn ? 'Go →' : 'Ir →'}
              </button>
            )}
            {quizLoading && (
              <span className="absolute right-0 bottom-4 text-[#8A8FA8]/50 text-sm">
                {isEn ? 'Preparing quiz…' : 'Preparando quiz…'}
              </span>
            )}
          </form>
          {suggestions.length > 0 && !busy && !pendingQuiz && (
            <div className="flex flex-wrap gap-2 mt-5">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(s)}
                  className="text-[#8A8FA8] text-sm border border-[#8A8FA8]/15 rounded-full px-4 py-2 hover:border-[#7C3AED]/40 hover:text-[#F0F0F5] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DNA strip */}
        {profile && <ProfileStrip profile={profile} isEn={isEn} />}

        {/* Topic cards grid */}
        {(topics.length > 0 || pendingQuiz || quizSubmitting) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Inline quiz card */}
            {pendingQuiz && (
              <TopicQuizCard
                quiz={pendingQuiz}
                isEn={isEn}
                onSubmit={handleQuizSubmit}
                onCancel={() => setPendingQuiz(null)}
                submitting={quizSubmitting}
              />
            )}

            {/* Analyzing skeleton while submitting quiz */}
            {quizSubmitting && <TopicCardSkeleton />}

            {topics.map(topic => (
              <TopicCard
                key={topic.id}
                topic={topic}
                isEn={isEn}
                language={language}
                onStudy={handleStudyTopic}
              />
            ))}

            {/* CEFIS tracks */}
            {tracks.map(track => (
              <div
                key={track.trackId}
                className="bg-[#0E0F1A] border border-[#22D3EE]/12 hover:border-[#22D3EE]/30 hover:bg-[#0F1225] rounded-3xl p-7 flex flex-col gap-6 transition-all duration-200 cursor-pointer group"
                onClick={() => sessionId && router.push(`/study/${sessionId}?q=${encodeURIComponent(track.trackName)}`)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && sessionId && router.push(`/study/${sessionId}?q=${encodeURIComponent(track.trackName)}`)}
                aria-label={`Study ${track.trackName}`}
              >
                <div>
                  <p className="text-[#22D3EE] text-[10px] uppercase tracking-widest mb-1">CEFIS</p>
                  <h3 className="text-[#F0F0F5] text-lg font-medium leading-snug group-hover:text-white transition-colors">{track.trackName}</h3>
                </div>
                <div className="flex justify-center">
                  <RadarChart pillars={track.pillars} label={track.trackName} language={language} size={220} />
                </div>
                <span className="text-[#22D3EE] text-sm group-hover:opacity-80 transition-opacity self-start">
                  {isEn ? 'Continue studying →' : 'Continuar estudando →'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!profile && topics.length === 0 && !pendingQuiz && (
          <div className="text-center py-20">
            <p className="text-[#8A8FA8] text-lg">
              {isEn ? 'Tell us what you want to learn to get started.' : 'Nos diga o que quer aprender para começar.'}
            </p>
          </div>
        )}

        {/* CEFIS connect */}
        {!user?.cefisEmail && tracks.length === 0 && (
          <div className="border border-dashed border-[#7C3AED]/20 rounded-3xl p-6 mt-5">
            {!showCefisForm ? (
              <>
                <p className="text-[#F0F0F5] text-sm font-medium mb-2">
                  {isEn ? 'Have a CEFIS account?' : 'Tem conta no CEFIS?'}
                </p>
                <p className="text-[#8A8FA8] text-xs leading-relaxed mb-4">
                  {isEn
                    ? 'Connect to study from your existing courses and track real progress.'
                    : 'Conecte para estudar com seus cursos e acompanhar progresso real.'}
                </p>
                <button onClick={() => setShowCefisForm(true)} className="text-[#7C3AED] text-sm hover:opacity-80 transition-opacity">
                  {isEn ? 'Connect CEFIS →' : 'Conectar CEFIS →'}
                </button>
              </>
            ) : (
              <div className="space-y-3 max-w-sm">
                <p className="text-[#F0F0F5] text-sm font-medium mb-3">
                  {isEn ? 'Connect your CEFIS account' : 'Conectar conta CEFIS'}
                </p>
                <input autoFocus type="email" value={cefisEmail} onChange={e => setCefisEmail(e.target.value)}
                  placeholder={isEn ? 'CEFIS email' : 'Email do CEFIS'}
                  className="w-full bg-[#08090F] border border-[#8A8FA8]/12 rounded-2xl px-4 py-3 text-[#F0F0F5] placeholder-[#8A8FA8]/30 text-sm outline-none focus:border-[#8A8FA8]/30"
                />
                <input type="password" value={cefisPassword} onChange={e => setCefisPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCefisConnect() }}
                  placeholder={isEn ? 'Password' : 'Senha'}
                  className="w-full bg-[#08090F] border border-[#8A8FA8]/12 rounded-2xl px-4 py-3 text-[#F0F0F5] placeholder-[#8A8FA8]/30 text-sm outline-none focus:border-[#8A8FA8]/30"
                />
                {cefisError && <p className="text-red-400/80 text-xs">{cefisError}</p>}
                <div className="flex justify-between items-center pt-1">
                  <button onClick={() => setShowCefisForm(false)} className="text-[#8A8FA8]/50 text-xs hover:text-[#8A8FA8] transition-colors">
                    {isEn ? 'Cancel' : 'Cancelar'}
                  </button>
                  <button onClick={handleCefisConnect} disabled={cefisLoading || !cefisEmail || !cefisPassword}
                    className="text-[#7C3AED] text-sm hover:opacity-80 transition-opacity disabled:opacity-30">
                    {cefisLoading ? (isEn ? 'Connecting…' : 'Conectando…') : (isEn ? 'Connect →' : 'Conectar →')}
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

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardInner />
    </Suspense>
  )
}
