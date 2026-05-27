'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Lang = 'pt' | 'en'

const T = {
  pt: {
    nav: [['#features', 'Ferramentas'], ['#students', 'Alunos'], ['#faq', 'FAQ']] as [string, string][],
    loginBtn: 'Entrar',
    ctaBtn: 'Começar grátis',
    heroTitle: ['VOCÊ NÃO SABE', 'O QUE VOCÊ', 'NÃO SABE...'],
    heroSub: 'E nem por onde começar',
    heroMainCta: 'Quero aprender qualquer coisa',
    heroSecondaryCta: 'Ver em ação',
    heroStats: [['2.400', '+', 'alunos ativos'], ['100', '%', 'personalizável'], ['4.2', '×', 'mais absorção de conteúdo']],
    rightTitle: ['Domine', 'TUDO', 'Mais', 'RÁPIDO'],
    radarChartTitle: 'Aprendizado ativo',
    radarChartSub1: '3 habilidades',
    radarChartSub2: 'desbloqueadas',
    radarChartDesc: 'Seu progresso personalizado',
    radarLabels: ['Tons', 'Escrita', 'Fala', 'Compreensão', 'Gramática', 'Cultura'],
    radarLang: 'Mandarim',
    absorptionBadge: 'absorção em 7 dias',
    newLevelBadge: 'NOVO NÍVEL DESBLOQUEADO',
    newLevelSub: 'Mandarim · Nível intermediário',
    skills: [
      { subj: 'Mandarim', meta: 'Fonética e tons', badge: 'Ativo', dot: '#FF6B3D', bg: 'rgba(249,71,22,.15)', tc: '#F94716', bc: 'rgba(249,71,22,.3)' },
      { subj: 'Programação', meta: 'Algoritmos e lógica', badge: 'Em progresso', dot: '#FBBF24', bg: 'rgba(251,191,36,.12)', tc: '#FBBF24', bc: 'rgba(251,191,36,.25)' },
      { subj: 'Filosofia', meta: 'Epistemologia básica', badge: 'Iniciando', dot: '#A855F7', bg: 'rgba(168,85,247,.12)', tc: '#A855F7', bc: 'rgba(168,85,247,.25)' },
    ],
    problemLabel: 'O Problema',
    problemTitle: 'Você quer dominar algo, mas não tem o passo a passo?',
    problemCards: [
      { n: '01', title: 'Método estruturado', text: 'Montamos um passo a passo completo para qualquer coisa que você queira aprender. Sem improvisação, sem etapas perdidas. Você sabe exatamente por onde começa e onde vai chegar.', r: '16px 0 0 16px' },
      { n: '02', title: 'Aprendizado Camaleão', text: 'A interface se adapta ao seu método de aprendizado específico e à sua linguagem. O BlindSpot fala como você pensa, respeita seu ritmo e entrega o conteúdo do jeito que você absorve melhor.', r: undefined },
      { n: '03', title: 'Rápido. Prático. Simplesmente eficiente.', text: 'Trabalha o seu alvo de estudo em sessões curtas, sem passar o dia todo em uma mentoria ou sala de aula. Você aprende de verdade em menos tempo do que imagina.', r: '0 16px 16px 0' },
    ],
    statsStrip: [['2.400+', 'Alunos ativos'], ['100%', 'Personalizável'], ['4.2×', 'Mais absorção de conteúdo'], ['28min', 'Sessão diária média']],
    featuresLabel: 'Ferramentas',
    featuresTitle: 'Tudo que você precisa para parar de adivinhar',
    radarFeatureLabel: 'Radar de Conhecimento',
    radarFeatureTitle: 'Visualize exatamente o que você domina em cada área',
    radarFeatureDesc: 'Um mapa dinâmico de todos os seus domínios de conhecimento, atualizado após cada sessão. Você sabe o que está forte, o que precisa de atenção e o que vem a seguir.',
    gapLabel: 'Detecção de Lacunas por AI',
    gapTitle: '94% de precisão em encontrar o que você não sabe que não sabe',
    gapDesc: 'Nosso modelo não olha apenas para respostas erradas. Analisa tempo de resposta, padrões de hesitação e caminhos de raciocínio para encontrar lacunas que o estudo comum nunca detecta.',
    gapBadge: 'Lacuna detectada',
    gapQuote: '"Você entende conceitos básicos de Mandarim mas ainda não conectou os tons à pronúncia em contexto. Isso afeta toda sua fluência oral."',
    featureCards: [
      { title: 'Plano Adaptativo', desc: 'Cada sessão recalibra seu plano. O BlindSpot aprende o que funciona pra você e ajusta dificuldade, sequência e tempo automaticamente.' },
      { title: 'Feedback Inteligente', desc: 'Você sabe exatamente o que precisa melhorar, quais pontos aprender e em que ordem. Nada de achismo. Cada sugestão tem um porquê claro por trás.' },
    ],
    testimonialsLabel: 'Resultados reais',
    testimonialsTitle: 'Pessoas reais. Aprendizado de verdade.',
    testimonials: [
      { q: '"Passei meses tentando aprender programação do jeito errado. Em duas semanas com o BlindSpot aprendi mais do que em seis meses sozinho. Ele entende exatamente como eu penso."', i: 'AC', n: 'Ana Costa', r: 'Dev em formação' },
      { q: '"Queria aprender Mandarim faz anos. Nunca conseguia porque não tinha por onde começar. O BlindSpot montou um caminho claro e agora estou tendo conversas básicas em 40 dias."', i: 'BM', n: 'Bruno Melo', r: 'Empreendedor' },
      { q: '"Achei que aprender fotografia precisava de curso caro. O BlindSpot montou minha trilha personalizada, identificou minha maior fraqueza e em três semanas o resultado mudou completamente."', i: 'CF', n: 'Carla Freitas', r: 'Fotógrafa' },
      { q: '"A melhor ferramenta que já usei. Não é só aprender. É saber o que aprender, em que ordem, e por quê. Essa clareza muda tudo."', i: 'DS', n: 'Diego Santos', r: 'Designer' },
    ],
    faqLabel: 'FAQ',
    faqTitle: 'Perguntas, respondidas',
    faqItems: [
      { q: 'Posso usar o BlindSpot para aprender qualquer coisa?', a: 'Sim. O BlindSpot funciona para qualquer tema que você queira dominar. Mandarim, programação, filosofia, fotografia, finanças, música, marketing. Se existe um conjunto de conhecimentos a dominar, o BlindSpot monta o caminho e te guia até lá.' },
      { q: 'Como o BlindSpot é diferente de outros apps de aprendizado?', a: 'Outros apps te entregam conteúdo genérico. O BlindSpot identifica o que você especificamente não sabe, monta um método personalizado para o seu jeito de aprender e te guia pelos pontos certos. A diferença é que você para de estudar no escuro e começa a aprender com direção.' },
      { q: 'Quanto tempo até ver resultados reais?', a: 'A maioria das pessoas nota mudanças em 2 a 3 semanas de sessões diárias consistentes de 20 a 30 minutos. As maiores evoluções vêm logo após o primeiro diagnóstico revelar exatamente onde estão as lacunas.' },
      { q: 'Meus dados de aprendizado são privados?', a: 'Sim. Seu perfil de conhecimento, resultados e dados de sessão são criptografados e nunca vendidos. Você é dono dos seus dados e pode exportar ou excluir tudo a qualquer momento.' },
      { q: 'Preciso ter algum conhecimento prévio para começar?', a: 'Não. O BlindSpot funciona do zero absoluto até níveis avançados. O diagnóstico inicial identifica exatamente onde você está hoje e monta o caminho a partir dali. Você começa de onde for.' },
      { q: 'Como a AI detecta o que eu ainda não sei?', a: 'Analisamos não só respostas erradas, mas tempo de resposta, padrões de hesitação, o caminho do raciocínio e como você interage com o conteúdo. Isso revela lacunas que métodos de detecção tradicionais nunca encontram.' },
    ],
    ctaBadge: 'Comece grátis hoje. Sem cartão de crédito.',
    ctaTitle: ['Aprenda qualquer coisa.', 'Do jeito certo.', 'Agora.'],
    ctaDesc: ['Diagnóstico em 15 minutos. Trilha personalizada. Resultado de verdade.', 'Você não precisa de mais conteúdo. Você precisa do caminho certo.'],
    ctaMainBtn: 'Quero aprender qualquer coisa',
    ctaNote: 'Grátis para começar. Sem cartão. Resultado em 15 minutos.',
    ctaSocial: 'Mais de 2.400 pessoas já aprendendo este mês',
    footerDesc: 'O tutor de AI que revela o que você ainda não sabe que não sabe. Aprenda mais rápido, de verdade.',
    footerCols: [
      { h: 'Produto', links: [{ l: 'Entrar', href: '/auth/login' }, { l: 'Cadastro', href: '/auth/signup' }, { l: 'Recursos', href: '#features' }] },
      { h: 'Saiba mais', links: [{ l: 'Problema', href: '#problem' }, { l: 'FAQ', href: '#faq' }] },
      { h: 'Redes', links: [{ l: 'Twitter', href: '#' }, { l: 'LinkedIn', href: '#' }, { l: 'Discord', href: '#' }] },
    ],
    footerCopy: 'Copyright 2024 BlindSpot. Todos os direitos reservados.',
    explainerAriaLabel: 'Vídeo explicativo do BlindSpot',
    explainerLabel: 'Explainer',
    explainerTitle: 'Como o BlindSpot encontra seus pontos cegos',
    explainerCloseLabel: 'Fechar vídeo',
  },
  en: {
    nav: [['#features', 'Features'], ['#students', 'Students'], ['#faq', 'FAQ']] as [string, string][],
    loginBtn: 'Log in',
    ctaBtn: 'Get started free',
    heroTitle: ["YOU DON'T KNOW", 'WHAT YOU', "DON'T KNOW..."],
    heroSub: "And you don't know where to start",
    heroMainCta: 'I want to learn anything',
    heroSecondaryCta: 'See it in action',
    heroStats: [['2,400', '+', 'active students'], ['100', '%', 'customizable'], ['4.2', '×', 'more content retention']],
    rightTitle: ['Master', 'ANYTHING', 'Even', 'FASTER'],
    radarChartTitle: 'Active learning',
    radarChartSub1: '3 skills',
    radarChartSub2: 'unlocked',
    radarChartDesc: 'Your personalized progress',
    radarLabels: ['Tones', 'Writing', 'Speaking', 'Comprehension', 'Grammar', 'Culture'],
    radarLang: 'Mandarin',
    absorptionBadge: 'retention in 7 days',
    newLevelBadge: 'NEW LEVEL UNLOCKED',
    newLevelSub: 'Mandarin · Intermediate level',
    skills: [
      { subj: 'Mandarin', meta: 'Phonetics & tones', badge: 'Active', dot: '#FF6B3D', bg: 'rgba(249,71,22,.15)', tc: '#F94716', bc: 'rgba(249,71,22,.3)' },
      { subj: 'Programming', meta: 'Algorithms & logic', badge: 'In progress', dot: '#FBBF24', bg: 'rgba(251,191,36,.12)', tc: '#FBBF24', bc: 'rgba(251,191,36,.25)' },
      { subj: 'Philosophy', meta: 'Basic epistemology', badge: 'Starting', dot: '#A855F7', bg: 'rgba(168,85,247,.12)', tc: '#A855F7', bc: 'rgba(168,85,247,.25)' },
    ],
    problemLabel: 'The Problem',
    problemTitle: "You want to master something, but don't have a roadmap?",
    problemCards: [
      { n: '01', title: 'Structured Method', text: "We build a complete step-by-step plan for anything you want to learn. No guesswork, no missed steps. You know exactly where you start and where you'll end up.", r: '16px 0 0 16px' },
      { n: '02', title: 'Chameleon Learning', text: 'The interface adapts to your specific learning style and language. BlindSpot speaks the way you think, respects your pace, and delivers content the way you absorb it best.', r: undefined },
      { n: '03', title: 'Fast. Practical. Simply effective.', text: 'Tackle your study target in short sessions, without spending the whole day in a mentorship or classroom. You learn for real in less time than you think.', r: '0 16px 16px 0' },
    ],
    statsStrip: [['2,400+', 'Active students'], ['100%', 'Customizable'], ['4.2×', 'More content retention'], ['28min', 'Average daily session']],
    featuresLabel: 'Tools',
    featuresTitle: 'Everything you need to stop guessing',
    radarFeatureLabel: 'Knowledge Radar',
    radarFeatureTitle: 'Visualize exactly what you master in each area',
    radarFeatureDesc: "A dynamic map of all your knowledge domains, updated after each session. You know what's strong, what needs attention, and what comes next.",
    gapLabel: 'AI Gap Detection',
    gapTitle: "94% accuracy in finding what you don't know you don't know",
    gapDesc: "Our model doesn't just look at wrong answers. It analyzes response time, hesitation patterns, and reasoning paths to find gaps that regular study never detects.",
    gapBadge: 'Gap detected',
    gapQuote: '"You understand basic Mandarin concepts but haven\'t yet connected tones to pronunciation in context. This affects your entire oral fluency."',
    featureCards: [
      { title: 'Adaptive Plan', desc: 'Each session recalibrates your plan. BlindSpot learns what works for you and automatically adjusts difficulty, sequence, and timing.' },
      { title: 'Smart Feedback', desc: "You know exactly what to improve, which points to learn, and in what order. No guesswork. Every suggestion has a clear reason behind it." },
    ],
    testimonialsLabel: 'Real results',
    testimonialsTitle: 'Real people. Real learning.',
    testimonials: [
      { q: '"I spent months trying to learn programming the wrong way. In two weeks with BlindSpot I learned more than in six months alone. It understands exactly how I think."', i: 'AC', n: 'Ana Costa', r: 'Dev in training' },
      { q: '"I\'ve wanted to learn Mandarin for years. Never managed because I didn\'t know where to start. BlindSpot built a clear path and now I\'m having basic conversations in 40 days."', i: 'BM', n: 'Bruno Melo', r: 'Entrepreneur' },
      { q: '"I thought learning photography required an expensive course. BlindSpot built my personalized track, identified my biggest weakness, and in three weeks the results changed completely."', i: 'CF', n: 'Carla Freitas', r: 'Photographer' },
      { q: '"The best tool I\'ve ever used. It\'s not just about learning. It\'s about knowing what to learn, in what order, and why. That clarity changes everything."', i: 'DS', n: 'Diego Santos', r: 'Designer' },
    ],
    faqLabel: 'FAQ',
    faqTitle: 'Questions, answered',
    faqItems: [
      { q: 'Can I use BlindSpot to learn anything?', a: "Yes. BlindSpot works for any topic you want to master. Mandarin, programming, philosophy, photography, finance, music, marketing. If there's a set of knowledge to master, BlindSpot builds the path and guides you there." },
      { q: 'How is BlindSpot different from other learning apps?', a: "Other apps deliver generic content. BlindSpot identifies what you specifically don't know, builds a personalized method for your learning style, and guides you to the right points. The difference is you stop studying in the dark and start learning with direction." },
      { q: 'How long until you see real results?', a: 'Most people notice changes in 2 to 3 weeks of consistent daily sessions of 20 to 30 minutes. The biggest breakthroughs come right after the first diagnosis reveals exactly where the gaps are.' },
      { q: 'Is my learning data private?', a: 'Yes. Your knowledge profile, results, and session data are encrypted and never sold. You own your data and can export or delete everything at any time.' },
      { q: 'Do I need prior knowledge to start?', a: "No. BlindSpot works from absolute zero to advanced levels. The initial diagnosis identifies exactly where you are today and builds the path from there. You start from wherever you are." },
      { q: "How does AI detect what I don't yet know?", a: "We analyze not just wrong answers, but response time, hesitation patterns, reasoning paths, and how you interact with content. This reveals gaps that traditional detection methods never find." },
    ],
    ctaBadge: 'Start free today. No credit card.',
    ctaTitle: ['Learn anything.', 'The right way.', 'Now.'],
    ctaDesc: ['15-minute diagnosis. Personalized track. Real results.', "You don't need more content. You need the right path."],
    ctaMainBtn: 'I want to learn anything',
    ctaNote: 'Free to start. No card. Results in 15 minutes.',
    ctaSocial: 'Over 2,400 people already learning this month',
    footerDesc: "The AI tutor that reveals what you don't know you don't know. Learn faster, for real.",
    footerCols: [
      { h: 'Product', links: [{ l: 'Log in', href: '/auth/login' }, { l: 'Sign up', href: '/auth/signup' }, { l: 'Features', href: '#features' }] },
      { h: 'Learn more', links: [{ l: 'Problem', href: '#problem' }, { l: 'FAQ', href: '#faq' }] },
      { h: 'Social', links: [{ l: 'Twitter', href: '#' }, { l: 'LinkedIn', href: '#' }, { l: 'Discord', href: '#' }] },
    ],
    footerCopy: 'Copyright 2024 BlindSpot. All rights reserved.',
    explainerAriaLabel: 'BlindSpot explainer video',
    explainerLabel: 'Explainer',
    explainerTitle: 'How BlindSpot finds your blind spots',
    explainerCloseLabel: 'Close video',
  },
}

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in') }),
      { threshold: 0.1 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

function drawRadar(canvas: HTMLCanvasElement, labels: string[], radarLang: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width, h = canvas.height
  const cx = w / 2, cy = h / 2
  const maxR = 80, n = 6
  const start = -Math.PI / 2
  const pt = (i: number, r: number): [number, number] => {
    const a = start + (i / n) * 2 * Math.PI
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }
  const scores = [75, 52, 48, 85, 68, 40]

  ctx.fillStyle = '#0d0d0d'
  ctx.fillRect(0, 0, w, h)

  for (let l = 1; l <= 5; l++) {
    const r = (l / 5) * maxR
    ctx.beginPath()
    for (let i = 0; i < n; i++) { const [x, y] = pt(i, r); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) }
    ctx.closePath(); ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.stroke()
  }
  for (let i = 0; i < n; i++) {
    const [x, y] = pt(i, maxR)
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y)
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1; ctx.stroke()
  }

  const dataPts = scores.map((s, i) => pt(i, (s / 100) * maxR))
  ctx.beginPath()
  dataPts.forEach(([x, y], i) => { i === 0 ? ctx.moveTo(x + 7, y + 7) : ctx.lineTo(x + 7, y + 7) })
  ctx.closePath(); ctx.fillStyle = 'rgba(249,71,22,0.10)'; ctx.fill()

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR)
  grad.addColorStop(0, 'rgba(249,71,22,0.65)')
  grad.addColorStop(0.6, 'rgba(249,71,22,0.35)')
  grad.addColorStop(1, 'rgba(249,71,22,0.10)')
  ctx.beginPath()
  dataPts.forEach(([x, y], i) => { i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) })
  ctx.closePath(); ctx.fillStyle = grad; ctx.fill()
  ctx.beginPath()
  dataPts.forEach(([x, y], i) => { i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) })
  ctx.closePath(); ctx.strokeStyle = '#F94716'; ctx.lineWidth = 2; ctx.stroke()

  dataPts.forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y, 8, 0, 2 * Math.PI); ctx.fillStyle = 'rgba(249,71,22,0.20)'; ctx.fill()
    ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.fillStyle = '#F94716'; ctx.fill()
    ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 2 * Math.PI); ctx.fillStyle = '#fff'; ctx.fill()
  })

  ctx.font = 'bold 11px Inter, sans-serif'
  const lR = maxR + 24
  labels.forEach((label, i) => {
    const [x, y] = pt(i, lR)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,255,255,0.90)'; ctx.fillText(label, x, y)
  })
  ctx.font = '600 10px Inter, sans-serif'
  dataPts.forEach(([x, y], i) => {
    const a = start + (i / n) * 2 * Math.PI
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = '#FF8C5A'; ctx.fillText(String(scores[i]), x + 18 * Math.cos(a), y + 18 * Math.sin(a))
  })
  ctx.font = 'bold 12px Inter, sans-serif'; ctx.fillStyle = 'rgba(249,71,22,0.85)'
  ctx.textAlign = 'center'; ctx.fillText(radarLang, cx, cy - maxR - 14)
}

function Stars() {
  return (
    <div className="flex gap-1 mb-3.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="#F94716">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`mb-2 overflow-hidden transition-colors duration-300 rounded-xl ${open ? 'border-[#F94716]/35' : 'border-white/[0.08]'} border bg-[#141414]`}>
      <button className="w-full flex items-center justify-between px-6 py-5 text-left gap-4" onClick={() => setOpen(v => !v)}>
        <span className={`text-[15px] font-bold transition-colors ${open ? 'text-[#F94716]' : 'text-white'}`}>{q}</span>
        <div className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 ${open ? 'rotate-45 bg-[#F94716] border-[#F94716]' : 'border-[#555]'}`}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
        </div>
      </button>
      <div className={`transition-all duration-300 overflow-hidden ${open ? 'max-h-[300px] opacity-100 pb-[22px]' : 'max-h-0 opacity-0'}`}>
        <p className="px-6 text-[14px] text-[#888] leading-[1.8]">{a}</p>
      </div>
    </div>
  )
}

const OR_BTN = 'inline-flex items-center gap-2 rounded-lg bg-[#F94716] text-white font-bold cursor-pointer transition-all duration-200 hover:bg-[#FF6B3D] hover:-translate-y-px [box-shadow:0_0_20px_rgba(249,71,22,.35)]'
const DARK_BTN = 'inline-flex items-center gap-2 rounded-lg text-white font-semibold cursor-pointer transition-all duration-200 hover:border-white/20 hover:bg-[#1f1f1f] bg-[#1a1a1a] border border-white/[0.08]'
const EXPLAINER_VIDEO = '/videos/blindspot-explainer.mp4'
const EXPLAINER_POSTER = '/videos/blindspot-explainer-poster.png'

export default function Home() {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('pt')
  const [scrolled, setScrolled] = useState(false)
  const [explainerOpen, setExplainerOpen] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const explainerVideoRef = useRef<HTMLVideoElement>(null)

  const t = T[lang]

  const openExplainer = useCallback(() => setExplainerOpen(true), [])
  const closeExplainer = useCallback(() => {
    setExplainerOpen(false)
    if (explainerVideoRef.current) {
      explainerVideoRef.current.pause()
      explainerVideoRef.current.currentTime = 0
    }
  }, [])

  useScrollReveal()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    fetch('/api/auth/me').then(r => { if (r.ok) router.replace('/dashboard') }).catch(() => {})
  }, [router])

  useEffect(() => {
    if (canvasRef.current) drawRadar(canvasRef.current, t.radarLabels, t.radarLang)
  }, [lang, t.radarLabels, t.radarLang])

  useEffect(() => {
    if (!explainerOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeExplainer()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [closeExplainer, explainerOpen])

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#0d0d0d', color: '#fff', fontFamily: 'Inter, DM Sans, sans-serif', lineHeight: 1.5, WebkitFontSmoothing: 'antialiased' }}>

      {/* HEADER */}
      <header className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-12 py-[18px] transition-all duration-300 border-b ${scrolled ? 'bg-[#0d0d0d]/92 backdrop-blur-xl border-white/[0.08]' : 'border-transparent'}`}>
        <a className="flex items-center gap-2.5 no-underline" href="/">
          <span className="text-[16px] font-bold tracking-[-0.01em] text-white">BlindSpot</span>
        </a>
        <nav className="hidden md:flex gap-8">
          {t.nav.map(([href, label]) => (
            <a key={href} href={href} className="text-[14px] text-[#888] no-underline hover:text-white transition-colors duration-200 font-medium">{label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[13px] font-semibold">
            <button
              onClick={() => setLang('pt')}
              className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${lang === 'pt' ? 'text-white' : 'text-[#555] hover:text-[#888]'}`}
            >PT</button>
            <span className="text-[#333]">/</span>
            <button
              onClick={() => setLang('en')}
              className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${lang === 'en' ? 'text-white' : 'text-[#555] hover:text-[#888]'}`}
            >EN</button>
          </div>
          <button onClick={() => router.push('/auth/login')} className={`${DARK_BTN} px-[18px] py-[9px] text-[14px]`}>{t.loginBtn}</button>
          <button onClick={() => router.push('/auth/signup')} className={`${OR_BTN} px-[22px] py-[10px] text-[14px]`}>{t.ctaBtn}</button>
        </div>
      </header>

      {/* HERO */}
      <section id="hero" className="relative min-h-screen flex items-center overflow-hidden" style={{ padding: '130px 48px 80px' }}>
        <div className="absolute rounded-full pointer-events-none" style={{ width: 600, height: 600, top: '-20%', left: '-5%', background: 'rgba(249,71,22,.08)', filter: 'blur(100px)' }} />
        <div className="absolute rounded-full pointer-events-none" style={{ width: 400, height: 400, bottom: '-10%', right: '-8%', background: 'rgba(249,71,22,.05)', filter: 'blur(100px)' }} />
        <div className="relative z-10 w-full max-w-[1200px] mx-auto grid gap-[80px] items-center" style={{ gridTemplateColumns: '1fr 1fr' }}>

          {/* LEFT */}
          <div>
            <p className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-semibold mb-7" style={{ background: 'rgba(249,71,22,.12)', border: '1px solid rgba(249,71,22,.3)', color: '#F94716' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#F94716] animate-pulse" />
              CEFIS Hackathon 2026 Winner
            </p>
            <h1 className="font-black leading-[1.05] tracking-[-0.03em] mb-6 text-white" style={{ fontSize: 'clamp(40px,5.5vw,72px)' }}>
              {t.heroTitle[0]}<br />{t.heroTitle[1]}<br /><em className="not-italic text-[#F94716]">{t.heroTitle[2]}</em>
            </h1>
            <p className="mb-10 font-medium" style={{ fontSize: 20, color: '#888', lineHeight: 1.5, maxWidth: 480 }}>
              {t.heroSub}
            </p>
            <div className="flex gap-3 flex-wrap mb-14">
              <button onClick={() => router.push('/auth/signup')} className={`${OR_BTN} px-[22px] py-[10px] text-[14px]`}>
                {t.heroMainCta}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button type="button" onClick={openExplainer} className={`${DARK_BTN} px-[22px] py-[10px] text-[14px]`}>
                {t.heroSecondaryCta}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="M10 8.5l5 3.5-5 3.5V8.5z" fill="currentColor"/></svg>
              </button>
            </div>
            <div className="reveal flex gap-10 flex-wrap">
              {t.heroStats.map(([n, s, l]) => (
                <div key={l}>
                  <div className="text-[26px] font-extrabold text-white"><span className="text-[#F94716]">{n}</span>{s}</div>
                  <p className="text-[13px] mt-0.5" style={{ color: '#888' }}>{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div className="reveal hidden lg:flex flex-col items-start gap-6 relative">
            <h2 className="font-black leading-[1] tracking-[-0.03em] text-white" style={{ fontSize: 'clamp(36px,4.5vw,60px)' }}>
              {t.rightTitle[0]} <em className="not-italic text-[#F94716]">{t.rightTitle[1]}</em><br />{t.rightTitle[2]} <em className="not-italic text-[#F94716]">{t.rightTitle[3]}</em>
            </h2>
            <div className="relative w-full flex items-center justify-center" style={{ animation: 'landing-float 5s ease-in-out infinite' }}>
              <div className="absolute top-[-16px] left-[-20px] px-[18px] py-3.5 rounded-2xl z-10" style={{ background: 'rgba(20,20,20,.96)', border: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(16px)', animation: 'landing-fade-up .8s cubic-bezier(.16,1,.3,1) .3s both' }}>
                <div className="text-[28px] font-black leading-[1] text-[#F94716]">85%</div>
                <div className="text-[11px] mt-0.5" style={{ color: '#888' }}>{t.absorptionBadge}</div>
              </div>
              <div className="relative w-full max-w-[380px] rounded-3xl p-7 overflow-hidden" style={{ background: '#141414', border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 32px 80px rgba(0,0,0,.6),0 0 60px rgba(249,71,22,.08)' }}>
                <div className="absolute left-0 right-0 h-[2px] opacity-50 z-10" style={{ background: 'linear-gradient(90deg,transparent,#F94716,transparent)', animation: 'landing-scan 3s linear infinite' }} />
                <p className="text-[11px] font-bold tracking-[0.18em] uppercase mb-5 text-[#F94716]">{t.radarChartTitle}</p>
                <h3 className="text-[22px] font-extrabold text-white mb-1.5 leading-[1.2]">{t.radarChartSub1}<br />{t.radarChartSub2}</h3>
                <p className="text-[13px] mb-6" style={{ color: '#888' }}>{t.radarChartDesc}</p>
                <div className="flex flex-col gap-2.5">
                  {t.skills.map(item => (
                    <div key={item.subj} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,.08)' }}>
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.dot }} />
                        <div>
                          <p className="text-[14px] font-semibold text-white">{item.subj}</p>
                          <p className="text-[12px]" style={{ color: '#888' }}>{item.meta}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-[6px]" style={{ background: item.bg, color: item.tc, border: `1px solid ${item.bc}` }}>{item.badge}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute bottom-[-16px] right-[-20px] flex items-center gap-2.5 px-4 py-3 rounded-2xl whitespace-nowrap" style={{ background: 'rgba(20,20,20,.96)', border: '1px solid rgba(249,71,22,.35)', backdropFilter: 'blur(16px)', animation: 'landing-slide-r .8s cubic-bezier(.16,1,.3,1) .6s both' }}>
                <span className="text-lg">🚀</span>
                <div>
                  <p className="text-[11px] font-bold tracking-[0.05em] text-[#F94716]">{t.newLevelBadge}</p>
                  <p className="text-[12px]" style={{ color: '#888' }}>{t.newLevelSub}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section id="problem" className="relative" style={{ padding: '100px 48px' }}>
        <div className="absolute rounded-full pointer-events-none" style={{ width: 500, height: 500, top: 0, right: '-10%', background: 'rgba(249,71,22,.06)', filter: 'blur(100px)' }} />
        <div className="max-w-[1200px] mx-auto">
          <div className="reveal text-center max-w-[760px] mx-auto mb-14">
            <p className="text-[12px] font-bold tracking-[0.2em] uppercase mb-4 text-[#F94716]">{t.problemLabel}</p>
            <h2 className="font-black leading-[1.05] tracking-[-0.025em] text-white" style={{ fontSize: 'clamp(32px,4vw,52px)' }}>{t.problemTitle}</h2>
          </div>
          <div className="reveal grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
            {t.problemCards.map(card => (
              <div key={card.n} className="group relative overflow-hidden transition-all duration-300" style={{ padding: '36px 32px', background: '#141414', border: '1px solid rgba(255,255,255,.08)', borderRadius: card.r }}>
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#F94716] scale-x-0 group-hover:scale-x-100 transition-transform duration-400 origin-left" />
                <div className="text-[42px] font-black leading-[1] mb-4 text-[#F94716]" style={{ opacity: 0.2 }}>{card.n}</div>
                <h3 className="text-[18px] font-extrabold text-white mb-2.5">{card.title}</h3>
                <p className="text-[14px] leading-[1.75]" style={{ color: '#888' }}>{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', borderBottom: '1px solid rgba(255,255,255,.08)', padding: '40px 0', background: '#141414' }}>
        <div className="grid max-w-[1200px] mx-auto px-12" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          {t.statsStrip.map(([val, lbl], i) => (
            <div key={val} className={`reveal text-center px-6 ${i < 3 ? 'border-r border-white/[0.08]' : ''}`}>
              <span className="block font-black leading-[1] mb-2 text-[#F94716]" style={{ fontSize: 'clamp(36px,4vw,52px)' }}>{val}</span>
              <p className="text-[13px]" style={{ color: '#888' }}>{lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" className="relative" style={{ padding: '100px 48px' }}>
        <div className="absolute rounded-full pointer-events-none" style={{ width: 600, height: 600, bottom: 0, left: '-15%', background: 'rgba(249,71,22,.07)', filter: 'blur(100px)' }} />
        <div className="max-w-[1200px] mx-auto">
          <div className="reveal text-center mb-14">
            <p className="text-[12px] font-bold tracking-[0.2em] uppercase mb-4 text-[#F94716]">{t.featuresLabel}</p>
            <h2 className="font-black leading-[1.05] tracking-[-0.025em] text-white" style={{ fontSize: 'clamp(32px,4vw,52px)' }}>{t.featuresTitle}</h2>
          </div>
          <div className="grid gap-6 mb-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="reveal relative overflow-hidden rounded-[20px] transition-colors duration-300 hover:border-[#F94716]/25 p-9" style={{ background: '#141414', border: '1px solid rgba(255,255,255,.08)' }}>
              <div className="absolute bottom-[-60px] right-[-60px] w-[200px] h-[200px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(249,71,22,.12),transparent 70%)' }} />
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ background: 'rgba(249,71,22,.15)', border: '1px solid rgba(249,71,22,.3)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#F94716" strokeWidth="1.5"/><circle cx="12" cy="12" r="4" stroke="#F94716" strokeWidth="1.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="#F94716" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#F94716]">{t.radarFeatureLabel}</span>
              </div>
              <h3 className="text-[20px] font-extrabold text-white mb-2.5 leading-[1.3]">{t.radarFeatureTitle}</h3>
              <p className="text-[14px] leading-[1.75] mb-6" style={{ color: '#888' }}>{t.radarFeatureDesc}</p>
              <div className="flex justify-center"><canvas ref={canvasRef} width={320} height={280} style={{ maxWidth: '100%', display: 'block' }} /></div>
            </div>
            <div className="reveal relative overflow-hidden rounded-[20px] transition-colors duration-300 hover:border-[#F94716]/25 p-9" style={{ background: '#141414', border: '1px solid rgba(255,255,255,.08)' }}>
              <div className="absolute bottom-[-60px] right-[-60px] w-[200px] h-[200px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(249,71,22,.12),transparent 70%)' }} />
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ background: 'rgba(249,71,22,.15)', border: '1px solid rgba(249,71,22,.3)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#F94716" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="#F94716" strokeWidth="1.5"/></svg>
                </div>
                <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#F94716]">{t.gapLabel}</span>
              </div>
              <h3 className="text-[20px] font-extrabold text-white mb-2.5 leading-[1.3]">{t.gapTitle}</h3>
              <p className="text-[14px] leading-[1.75] mb-6" style={{ color: '#888' }}>{t.gapDesc}</p>
              <div className="px-4 py-3 rounded-xl" style={{ background: '#1a1a1a', borderLeft: '3px solid #F94716' }}>
                <p className="text-[11px] font-bold tracking-[0.12em] uppercase mb-1.5 text-[#F94716]">{t.gapBadge}</p>
                <p className="text-[13px] leading-[1.65]" style={{ color: '#94A3B8' }}>{t.gapQuote}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {t.featureCards.map((card, idx) => (
              <div key={card.title} className="reveal group rounded-2xl transition-all duration-300 hover:bg-[#181818] hover:border-[#F94716]/20 p-6" style={{ background: '#141414', border: '1px solid rgba(255,255,255,.08)' }}>
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center mb-3.5" style={{ background: 'rgba(249,71,22,.12)', border: '1px solid rgba(249,71,22,.25)' }}>
                  {idx === 0
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="#F94716" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 20V10M12 20V4M6 20v-6" stroke="#F94716" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  }
                </div>
                <h3 className="text-[15px] font-bold text-white mb-2">{card.title}</h3>
                <p className="text-[13px] leading-[1.7]" style={{ color: '#888' }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="students" style={{ padding: '100px 48px', background: '#141414' }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="reveal text-center mb-14">
            <p className="text-[12px] font-bold tracking-[0.2em] uppercase mb-4 text-[#F94716]">{t.testimonialsLabel}</p>
            <h2 className="font-black leading-[1.05] tracking-[-0.025em] text-white" style={{ fontSize: 'clamp(32px,4vw,52px)' }}>{t.testimonialsTitle}</h2>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {t.testimonials.map(testimonial => (
              <div key={testimonial.n} className="reveal rounded-[18px] transition-all duration-300 hover:bg-[#181818] hover:border-[#F94716]/20 p-7" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,.08)' }}>
                <Stars />
                <blockquote className="text-[15px] leading-[1.75] mb-6" style={{ color: '#CBD5E1', fontStyle: 'normal' }}>{testimonial.q}</blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-extrabold flex-shrink-0" style={{ background: 'rgba(249,71,22,.15)', border: '1.5px solid rgba(249,71,22,.4)', color: '#F94716' }}>{testimonial.i}</div>
                  <div><p className="text-[14px] font-bold text-white">{testimonial.n}</p><p className="text-[12px]" style={{ color: '#888' }}>{testimonial.r}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: '100px 48px' }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="reveal text-center mb-14">
            <p className="text-[12px] font-bold tracking-[0.2em] uppercase mb-4 text-[#F94716]">{t.faqLabel}</p>
            <h2 className="font-black leading-[1.05] tracking-[-0.025em] text-white" style={{ fontSize: 'clamp(32px,4vw,52px)' }}>{t.faqTitle}</h2>
          </div>
          <div className="max-w-[760px] mx-auto reveal">
            {t.faqItems.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="relative overflow-hidden text-center" style={{ padding: '120px 48px' }}>
        <div className="absolute rounded-full pointer-events-none" style={{ width: 700, height: 700, top: '-15%', right: '-20%', background: 'rgba(249,71,22,.05)', filter: 'blur(100px)' }} />
        <div className="absolute rounded-full pointer-events-none" style={{ width: 500, height: 500, bottom: 0, left: '-10%', background: 'rgba(249,71,22,.06)', filter: 'blur(100px)' }} />
        <div className="max-w-[1200px] mx-auto relative z-10">
          <p className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-semibold mb-7 reveal" style={{ background: 'rgba(249,71,22,.12)', border: '1px solid rgba(249,71,22,.3)', color: '#F94716' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F94716] animate-pulse" />
            {t.ctaBadge}
          </p>
          <h2 className="font-black leading-[1] tracking-[-0.03em] text-white mb-5 reveal" style={{ fontSize: 'clamp(40px,6vw,80px)' }}>
            {t.ctaTitle[0]}<br /><span className="text-[#F94716]">{t.ctaTitle[1]}<br />{t.ctaTitle[2]}</span>
          </h2>
          <p className="text-[18px] leading-[1.7] max-w-[560px] mx-auto mb-12 reveal" style={{ color: '#888' }}>
            {t.ctaDesc[0]}<br />{t.ctaDesc[1]}
          </p>
          <div className="reveal">
            <button onClick={() => router.push('/auth/signup')} className={`${OR_BTN} text-[16px] px-7 py-3.5`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" fill="white"/><circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.5" opacity=".5"/></svg>
              {t.ctaMainBtn}
            </button>
          </div>
          <p className="text-[12px] mt-4 reveal" style={{ color: '#555' }}>{t.ctaNote}</p>
          <div className="flex items-center justify-center gap-2.5 mt-7 reveal">
            <div className="flex">
              {['AC', 'BM', 'CF', 'DS'].map((init, i) => (
                <div key={init} className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: '#1a1a1a', color: '#F94716', border: '2px solid #0d0d0d', marginLeft: i === 0 ? 0 : -8 }}>{init}</div>
              ))}
            </div>
            <p className="text-[13px]" style={{ color: '#888' }}>{t.ctaSocial}</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,.08)', padding: '56px 48px 36px' }}>
        <div className="grid max-w-[1200px] mx-auto mb-12" style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 48 }}>
          <div>
            <p className="text-white font-bold text-base mb-4">BlindSpot</p>
            <p className="text-[13px] leading-[1.6]" style={{ color: '#888' }}>{t.footerDesc}</p>
          </div>
          {t.footerCols.map(col => (
            <div key={col.h}>
              <h4 className="text-[12px] font-bold tracking-[0.15em] uppercase mb-4 text-[#F94716]">{col.h}</h4>
              {col.links.map(ln => (
                <a key={ln.l} href={ln.href} className="block text-[13px] mb-2.5 no-underline hover:text-white transition-colors" style={{ color: '#888' }}>{ln.l}</a>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t pt-8 text-center text-[12px] max-w-[1200px] mx-auto" style={{ borderColor: 'rgba(255,255,255,.08)', color: '#555' }}>
          {t.footerCopy}
        </div>
      </footer>

      {explainerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.explainerAriaLabel}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-8"
          style={{ background: 'rgba(0,0,0,.78)', backdropFilter: 'blur(14px)' }}
          onClick={closeExplainer}
        >
          <div
            className="relative w-full max-w-[960px] overflow-hidden rounded-[24px]"
            style={{ background: '#0d0d0d', border: '1px solid rgba(249,71,22,.35)', boxShadow: '0 30px 120px rgba(0,0,0,.8), 0 0 60px rgba(249,71,22,.14)' }}
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
              <div>
                <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#F94716]">{t.explainerLabel}</p>
                <h2 className="text-white text-[18px] font-extrabold">{t.explainerTitle}</h2>
              </div>
              <button
                type="button"
                onClick={closeExplainer}
                aria-label={t.explainerCloseLabel}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-white/[0.06] border border-white/[0.10] hover:bg-[#F94716] hover:border-[#F94716] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <video
              ref={explainerVideoRef}
              src={EXPLAINER_VIDEO}
              poster={EXPLAINER_POSTER}
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="block w-full bg-black"
            />
          </div>
        </div>
      )}

    </div>
  )
}
