'use client'
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type Lang = 'en' | 'pt-BR'

const T = {
  en: {
    nav: {
      howItWorks: 'How it works', features: 'Features', faq: 'FAQ',
      login: 'Log in', getStarted: 'Get started',
    },
    hero: {
      h1a: 'Stop guessing',
      h1b: "what you don't know",
      sub: 'Blindspot maps your knowledge gaps in real time and gives you an AI tutor that knows exactly where to focus — so you stop wasting time on what you already know.',
      placeholder: 'What are you trying to learn?',
      cta: 'Start for free →',
      hasAccount: 'Already have an account?',
      signIn: 'Sign in',
    },
    hiw: {
      label: 'Process',
      title: 'Three steps to zero blind spots',
      steps: [
        { step: '01', title: 'Tell us your goal', desc: "Tell us what you want to learn or which exam you're preparing for. No setup required — just describe your goal in plain words.", icon: '◎' },
        { step: '02', title: 'We map your gaps', desc: "Our diagnostic identifies exactly what you know and what you don't — even the gaps you didn't know you had. Precise, not generic.", icon: '◈' },
        { step: '03', title: 'You study what matters', desc: 'Your AI tutor focuses every session on closing the gaps that matter most for your goal. No busywork, no guessing.', icon: '▦' },
      ],
    },
    features: {
      label: 'Features',
      title: 'Every tool you need to stop guessing',
      items: [
        { icon: '◉', title: 'See your knowledge gap in real time', desc: 'Your personal knowledge radar updates as you study. Watch your blind spots close and your weak areas strengthen — session by session, concept by concept. No more guessing where you stand.', accent: 'violet' as const },
        { icon: '⬡', title: "AI tutoring that knows what you don't know", desc: "Your AI tutor has a complete picture of your knowledge — what you know, what you almost know, and what you've never seen. Every explanation is calibrated to fill the exact gap you have, not a generic lesson.", accent: 'teal' as const },
        { icon: '⚡', title: 'Adaptive diagnostic, not a test', desc: 'The diagnostic feels like a conversation, not an exam. It learns from how you answer — speed, confidence, patterns — to build a precise map of your knowledge in minutes.', accent: 'magenta' as const },
        { icon: '◷', title: 'Built for your schedule', desc: 'Ten minutes or an hour, Blindspot adapts. Sessions are designed to maximize progress in whatever time you have — no fluff, no filler, no wasted minutes.', accent: 'green' as const },
      ],
    },
    stats: [
      { number: '2,400+', label: 'Students' },
      { number: '89%', label: 'Report closing knowledge gaps' },
      { number: '4.2×', label: 'Faster than traditional study' },
      { number: '28 min', label: 'Average daily session' },
    ],
    faq: {
      label: 'FAQ',
      title: 'Questions, answered',
      items: [
        { q: 'What is a blind spot in learning?', a: "A blind spot is a gap in your knowledge that you don't know you have. It's the thing you skipped over, misunderstood, or never encountered — and it quietly blocks your progress. Blindspot identifies these gaps before they cost you." },
        { q: 'How is this different from regular tutoring?', a: "Traditional tutoring assumes you know what you need help with. Blindspot diagnoses what you actually don't know — even the things you're not aware of — and builds your study plan around closing those specific gaps. No wasted time on what you already know." },
        { q: 'Do I need a CEFIS account?', a: "No. Blindspot works for any subject or learning goal, with or without a CEFIS account. If you do have one, connecting it gives you deeper integration with your existing course tracks and progress data." },
        { q: 'What subjects are supported?', a: 'Blindspot works across all subjects — from math and sciences to language learning, professional certifications, and exam prep. The AI adapts to whatever topic you bring to it.' },
        { q: 'Is it free to start?', a: 'Yes. You can start for free, go through the diagnostic, and start closing your blind spots with no credit card required. Premium features are available for users who want deeper analysis and extended session history.' },
      ],
    },
    footer: {
      cta: 'Find your blind spots today.',
      sub: 'Start for free. No credit card. Your first diagnostic takes under five minutes.',
      btn: 'Get started for free →',
      rights: 'All rights reserved.',
    },
  },
  'pt-BR': {
    nav: {
      howItWorks: 'Como funciona', features: 'Recursos', faq: 'FAQ',
      login: 'Entrar', getStarted: 'Começar',
    },
    hero: {
      h1a: 'Pare de adivinhar',
      h1b: 'o que você não sabe',
      sub: 'O Blindspot mapeia suas lacunas de conhecimento em tempo real e oferece um tutor de IA que sabe exatamente onde focar — para você parar de desperdiçar tempo com o que já domina.',
      placeholder: 'O que você quer aprender?',
      cta: 'Começar de graça →',
      hasAccount: 'Já tem uma conta?',
      signIn: 'Entrar',
    },
    hiw: {
      label: 'Processo',
      title: 'Três passos para zero pontos cegos',
      steps: [
        { step: '01', title: 'Diga seu objetivo', desc: 'Conte o que quer aprender ou qual exame está preparando. Sem configuração — apenas descreva seu objetivo em palavras simples.', icon: '◎' },
        { step: '02', title: 'Mapeamos suas lacunas', desc: 'Nosso diagnóstico identifica exatamente o que você sabe e o que não sabe — até as lacunas que você não sabia que tinha. Preciso, não genérico.', icon: '◈' },
        { step: '03', title: 'Você estuda o que importa', desc: 'Seu tutor de IA foca cada sessão em fechar as lacunas mais importantes para seu objetivo. Sem desperdício, sem suposições.', icon: '▦' },
      ],
    },
    features: {
      label: 'Recursos',
      title: 'Tudo que você precisa para parar de adivinhar',
      items: [
        { icon: '◉', title: 'Veja sua lacuna de conhecimento em tempo real', desc: 'Seu radar pessoal de conhecimento se atualiza conforme você estuda. Veja seus pontos cegos fechando e suas áreas fracas se fortalecendo — sessão por sessão, conceito por conceito.', accent: 'violet' as const },
        { icon: '⬡', title: 'Tutoria de IA que sabe o que você não sabe', desc: 'Seu tutor de IA tem uma visão completa do seu conhecimento — o que você sabe, o que quase sabe e o que nunca viu. Cada explicação é calibrada para preencher exatamente sua lacuna.', accent: 'teal' as const },
        { icon: '⚡', title: 'Diagnóstico adaptativo, não uma prova', desc: 'O diagnóstico parece uma conversa, não um exame. Ele aprende com a forma como você responde — velocidade, confiança, padrões — para construir um mapa preciso do seu conhecimento em minutos.', accent: 'magenta' as const },
        { icon: '◷', title: 'Feito para sua rotina', desc: 'Dez minutos ou uma hora, o Blindspot se adapta. As sessões são projetadas para maximizar o progresso com o tempo que você tem — sem enrolação, sem desperdício.', accent: 'green' as const },
      ],
    },
    stats: [
      { number: '2.400+', label: 'Alunos' },
      { number: '89%', label: 'Relatam fechar lacunas de conhecimento' },
      { number: '4,2×', label: 'Mais rápido que o estudo tradicional' },
      { number: '28 min', label: 'Sessão diária média' },
    ],
    faq: {
      label: 'FAQ',
      title: 'Perguntas respondidas',
      items: [
        { q: 'O que é um ponto cego no aprendizado?', a: 'Um ponto cego é uma lacuna no seu conhecimento que você não sabe que tem. É aquilo que você pulou, entendeu errado ou nunca encontrou — e que silenciosamente bloqueia seu progresso. O Blindspot identifica essas lacunas antes que elas te custem caro.' },
        { q: 'Como isso é diferente de tutoria tradicional?', a: 'A tutoria tradicional assume que você sabe o que precisa de ajuda. O Blindspot diagnostica o que você realmente não sabe — inclusive as coisas que você não percebe — e constrói seu plano de estudo focando em fechar essas lacunas específicas.' },
        { q: 'Preciso de uma conta CEFIS?', a: 'Não. O Blindspot funciona para qualquer matéria ou objetivo de aprendizado, com ou sem conta CEFIS. Se você tiver uma, conectá-la oferece integração mais profunda com suas trilhas de cursos e dados de progresso existentes.' },
        { q: 'Quais matérias são suportadas?', a: 'O Blindspot funciona em todas as áreas — de matemática e ciências até aprendizado de idiomas, certificações profissionais e preparação para exames. A IA se adapta a qualquer tema que você trouxer.' },
        { q: 'É gratuito para começar?', a: 'Sim. Você pode começar de graça, fazer o diagnóstico e começar a fechar seus pontos cegos sem precisar de cartão de crédito. Recursos premium estão disponíveis para usuários que queiram análises mais profundas e histórico estendido de sessões.' },
      ],
    },
    footer: {
      cta: 'Encontre seus pontos cegos hoje.',
      sub: 'Comece de graça. Sem cartão de crédito. Seu primeiro diagnóstico leva menos de cinco minutos.',
      btn: 'Começar de graça →',
      rights: 'Todos os direitos reservados.',
    },
  },
}

const ACCENT_STYLES = {
  violet:  { border: 'border-[#7C3AED]/20', icon: 'bg-[#7C3AED]/10 text-[#7C3AED]',  glow: 'from-[#7C3AED]/5' },
  teal:    { border: 'border-[#22D3EE]/20', icon: 'bg-[#22D3EE]/10 text-[#22D3EE]',  glow: 'from-[#22D3EE]/5' },
  magenta: { border: 'border-[#C026D3]/20', icon: 'bg-[#C026D3]/10 text-[#C026D3]',  glow: 'from-[#C026D3]/5' },
  green:   { border: 'border-[#34C785]/20', icon: 'bg-[#34C785]/10 text-[#34C785]',  glow: 'from-[#34C785]/5' },
}

const STAT_COLORS = [
  'bg-gradient-to-r from-[#7C3AED] to-[#C026D3] bg-clip-text text-transparent',
  'text-[#22D3EE]',
  'text-[#C026D3]',
  'text-[#34C785]',
]

function BrandLockup({ size = 'nav', muted = false }: { size?: 'nav' | 'hero' | 'footer'; muted?: boolean }) {
  const isHero = size === 'hero'
  const markClass = isHero ? 'h-14 w-16 sm:h-16 sm:w-[74px]' : size === 'footer' ? 'h-7 w-8' : 'h-7 w-8 sm:h-8 sm:w-9'
  const textClass = isHero
    ? 'text-2xl sm:text-3xl md:text-4xl text-white'
    : size === 'footer'
      ? 'text-sm text-[#8A8FA8]/50'
      : 'text-base sm:text-lg text-white'

  return (
    <span className={`inline-flex items-center ${isHero ? 'gap-3' : 'gap-2'}`}>
      <span className={`${markClass} relative inline-flex flex-shrink-0 items-center justify-center`}>
        <Image
          src="/blindspot-mark-gradient.png"
          alt=""
          width={540}
          height={465}
          priority={isHero}
          aria-hidden="true"
          className="h-full w-full object-contain drop-shadow-[0_0_18px_rgba(192,38,211,0.28)]"
        />
      </span>
      <span className={`${textClass} font-heading font-semibold tracking-tight ${muted ? '' : 'drop-shadow-[0_0_20px_rgba(124,58,237,0.16)]'}`}>
        blindspot
      </span>
    </span>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[#8A8FA8]/10">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-5 text-left text-[#F0F0F5] text-sm font-medium hover:text-white transition-colors"
      >
        <span>{question}</span>
        <span className={`ml-4 flex-shrink-0 text-[#7C3AED] transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && <p className="pb-5 text-[#8A8FA8] text-sm leading-relaxed">{answer}</p>}
    </div>
  )
}

export default function Home() {
  const [message, setMessage] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [lang, setLang] = useState<Lang>('en')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const t = T[lang]

  useEffect(() => {
    fetch('/api/auth/me').then(r => { if (r.ok) router.replace('/dashboard') }).catch(() => {})
  }, [router])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    router.push(`/auth/signup?q=${encodeURIComponent(message.trim())}`)
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#08090F] text-[#F0F0F5]">

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-[#8A8FA8]/10 backdrop-blur-md bg-[#08090F]/80' : ''
      }`}>
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <a href="/" aria-label="Blindspot home" className="flex items-center flex-shrink-0">
            <BrandLockup />
          </a>

          {/* Links */}
          <div className="hidden md:flex items-center gap-8 text-sm text-[#8A8FA8]">
            <a href="#how-it-works" className="hover:text-[#F0F0F5] transition-colors">{t.nav.howItWorks}</a>
            <a href="#features" className="hover:text-[#F0F0F5] transition-colors">{t.nav.features}</a>
            <a href="#faq" className="hover:text-[#F0F0F5] transition-colors">{t.nav.faq}</a>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Language toggle */}
            <div className="flex rounded-full border border-[#8A8FA8]/20 overflow-hidden text-[11px]">
              {(['en', 'pt-BR'] as Lang[]).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-3 py-1.5 transition-colors ${lang === l ? 'bg-[#7C3AED] text-white' : 'bg-transparent text-[#8A8FA8] hover:text-[#F0F0F5]'}`}>
                  {l === 'en' ? 'EN' : 'PT'}
                </button>
              ))}
            </div>

            {/* Login */}
            <button
              onClick={() => router.push('/auth/login')}
            className="hidden sm:block text-[#8A8FA8] hover:text-[#F0F0F5] text-sm transition-colors"
            >
              {t.nav.login}
            </button>

            {/* Get started */}
            <button
              onClick={() => router.push('/auth/signup')}
              className="hidden sm:block bg-gradient-to-r from-[#7C3AED] to-[#C026D3] text-white text-sm font-heading font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
            >
              {t.nav.getStarted}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-4 sm:px-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#7C3AED]/8 rounded-full blur-[100px]" />
          <div className="absolute top-40 left-1/3 w-[300px] h-[200px] bg-[#C026D3]/6 rounded-full blur-[80px]" />
        </div>

        <div className="relative -mx-4 w-screen px-4 text-center sm:mx-auto sm:w-auto sm:max-w-3xl sm:px-0">
          <div className="mb-7 flex justify-center">
            <BrandLockup size="hero" />
          </div>

          <div className="inline-flex items-center gap-2 bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34C785] animate-pulse" />
            <span className="text-[#7C3AED] text-xs tracking-wide">
              {lang === 'en' ? 'AI-powered knowledge mapping' : 'Mapeamento de conhecimento com IA'}
            </span>
          </div>

          <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
            {t.hero.h1a}
            <span className="block mx-auto max-w-[20rem] bg-gradient-to-r from-[#7C3AED] to-[#C026D3] bg-clip-text text-transparent sm:max-w-none">
              {t.hero.h1b}
            </span>
          </h1>
          <p className="text-[#8A8FA8] text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            {t.hero.sub}
          </p>

          <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t.hero.placeholder}
                className="flex-1 min-w-0 bg-[#0E0F1A] border border-[#7C3AED]/20 text-[#F0F0F5] placeholder-[#8A8FA8]/50 rounded-2xl px-5 py-4 text-sm outline-none focus:border-[#7C3AED]/50 transition-colors"
              />
              <button
                type="submit"
                className="w-full sm:w-auto bg-gradient-to-r from-[#7C3AED] to-[#C026D3] text-white font-heading font-semibold px-6 py-4 rounded-2xl hover:opacity-90 transition-opacity text-sm whitespace-nowrap"
              >
                {t.hero.cta}
              </button>
            </div>
          </form>

          <p className="mt-5 text-[#8A8FA8]/50 text-xs">
            {t.hero.hasAccount}{' '}
            <button
              type="button"
              onClick={() => router.push('/auth/login')}
              className="text-[#8A8FA8] hover:text-[#F0F0F5] transition-colors underline underline-offset-2"
            >
              {t.hero.signIn}
            </button>
          </p>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#7C3AED] text-xs uppercase tracking-widest mb-3">{t.hiw.label}</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold">{t.hiw.title}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {t.hiw.steps.map((item, idx) => (
              <div key={item.step} className="bg-[#0E0F1A] border border-[#7C3AED]/10 rounded-2xl p-7 flex flex-col gap-4 relative overflow-hidden group hover:border-[#7C3AED]/30 transition-colors">
                <div className={`absolute inset-0 bg-gradient-to-br ${idx === 0 ? 'from-[#7C3AED]/5' : idx === 1 ? 'from-[#C026D3]/5' : 'from-[#22D3EE]/5'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="flex items-center justify-between relative">
                  <span className={`text-2xl ${idx === 0 ? 'text-[#7C3AED]' : idx === 1 ? 'text-[#C026D3]' : 'text-[#22D3EE]'}`}>{item.icon}</span>
                  <span className={`text-xs font-mono font-bold tracking-widest ${idx === 0 ? 'text-[#7C3AED]/40' : idx === 1 ? 'text-[#C026D3]/40' : 'text-[#22D3EE]/40'}`}>{item.step}</span>
                </div>
                <h3 className="font-heading text-[#F0F0F5] text-lg font-semibold leading-snug relative">{item.title}</h3>
                <p className="text-[#8A8FA8] text-sm leading-relaxed relative">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#7C3AED] text-xs uppercase tracking-widest mb-3">{t.features.label}</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold">{t.features.title}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {t.features.items.map(item => {
              const a = ACCENT_STYLES[item.accent]
              return (
                <div key={item.title} className={`bg-[#0E0F1A] border ${a.border} rounded-2xl p-8 flex flex-col gap-4 relative overflow-hidden group hover:bg-[#111225] transition-colors`}>
                  <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${a.glow} to-transparent`} />
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.icon}`}>
                    <span className="text-lg">{item.icon}</span>
                  </div>
                  <h3 className="font-heading text-[#F0F0F5] text-xl font-semibold leading-snug">{item.title}</h3>
                  <p className="text-[#8A8FA8] text-sm leading-relaxed">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-y border-[#8A8FA8]/10 bg-[#0A0B15]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#8A8FA8]/10">
            {t.stats.map((s, i) => (
              <div key={i} className="px-8 py-6 text-center first:pl-0 last:pr-0">
                <p className={`font-heading text-3xl md:text-4xl font-bold mb-1 ${STAT_COLORS[i]}`}>{s.number}</p>
                <p className="text-[#8A8FA8] text-xs leading-relaxed">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#7C3AED] text-xs uppercase tracking-widest mb-3">{t.faq.label}</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold">{t.faq.title}</h2>
          </div>
          <div>
            {t.faq.items.map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 relative overflow-hidden bg-[#0E0F1A] border-t border-[#8A8FA8]/10">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#22D3EE]/5 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[200px] bg-[#7C3AED]/6 rounded-full blur-[60px]" />
        </div>
        <div className="max-w-2xl mx-auto text-center relative">
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-[#22D3EE] mb-5 leading-tight">
            {t.footer.cta}
          </h2>
          <p className="text-[#8A8FA8] text-lg mb-10 leading-relaxed">{t.footer.sub}</p>
          <button
            onClick={() => router.push('/auth/signup')}
            className="bg-gradient-to-r from-[#7C3AED] to-[#C026D3] text-white font-heading font-semibold px-8 py-4 rounded-full hover:opacity-90 transition-opacity text-base"
          >
            {t.footer.btn}
          </button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-[#8A8FA8]/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <span className="text-[#8A8FA8]/50 text-xs">
            &copy; {new Date().getFullYear()} Blindspot. {t.footer.rights}
          </span>
          <div className="flex items-center gap-4">
            <div className="flex rounded-full border border-[#8A8FA8]/15 overflow-hidden text-[11px]">
              {(['en', 'pt-BR'] as Lang[]).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-3 py-1 transition-colors ${lang === l ? 'bg-[#7C3AED] text-white' : 'bg-transparent text-[#8A8FA8] hover:text-[#F0F0F5]'}`}>
                  {l === 'en' ? 'EN' : 'PT'}
                </button>
              ))}
            </div>
            <BrandLockup size="footer" muted />
          </div>
        </div>
      </footer>

    </div>
  )
}
