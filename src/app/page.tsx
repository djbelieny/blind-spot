'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ─── FAQ item ──────────────────────────────────────────────────────────────────
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[#8A8FA8]/10">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-5 text-left text-[#F0F0F5] text-sm font-medium hover:text-white transition-colors"
      >
        <span>{question}</span>
        <span className={`ml-4 flex-shrink-0 text-[#7C3AED] transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>
          +
        </span>
      </button>
      {open && (
        <p className="pb-5 text-[#8A8FA8] text-sm leading-relaxed">
          {answer}
        </p>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [message, setMessage] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    // If already authenticated, go straight to dashboard
    fetch('/api/auth/me')
      .then(r => { if (r.ok) router.replace('/dashboard') })
      .catch(() => {})
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

  const stats = [
    { number: '2,400+', label: 'Students' },
    { number: '89%', label: 'Report closing knowledge gaps' },
    { number: '4.2×', label: 'Faster than traditional study' },
    { number: '28 min', label: 'Average daily session' },
  ]

  const faq = [
    {
      question: 'What is a blind spot in learning?',
      answer: "A blind spot is a gap in your knowledge that you don't know you have. It's the thing you skipped over, misunderstood, or never encountered — and it quietly blocks your progress. Blind Spot identifies these gaps before they cost you.",
    },
    {
      question: 'How is this different from regular tutoring?',
      answer: 'Traditional tutoring assumes you know what you need help with. Blind Spot diagnoses what you actually don\'t know — even the things you\'re not aware of — and builds your study plan around closing those specific gaps. No wasted time on what you already know.',
    },
    {
      question: 'Do I need a CEFIS account?',
      answer: "No. Blind Spot works for any subject or learning goal, with or without a CEFIS account. If you do have one, connecting it gives you deeper integration with your existing course tracks and progress data.",
    },
    {
      question: 'What subjects are supported?',
      answer: 'Blind Spot works across all subjects — from math and sciences to language learning, professional certifications, and exam prep. The AI adapts to whatever topic you bring to it.',
    },
    {
      question: 'Is it free to start?',
      answer: 'Yes. You can start for free, go through the diagnostic, and start closing your blind spots with no credit card required. Premium features are available for users who want deeper analysis and extended session history.',
    },
  ]

  return (
    <div className="min-h-screen bg-[#08090F] text-[#F0F0F5]">

      {/* ── Nav ────────────────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-[#8A8FA8]/10 backdrop-blur-md bg-[#08090F]/80' : ''
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-1.5 text-white font-semibold text-lg tracking-tight">
            blindspot
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] mb-3 flex-shrink-0" />
          </a>

          {/* Links */}
          <div className="hidden md:flex items-center gap-8 text-sm text-[#8A8FA8]">
            <a href="#how-it-works" className="hover:text-[#F0F0F5] transition-colors">How it works</a>
            <a href="#features" className="hover:text-[#F0F0F5] transition-colors">Features</a>
            <a href="#faq" className="hover:text-[#F0F0F5] transition-colors">FAQ</a>
          </div>

          {/* CTA */}
          <button
            onClick={() => router.push('/auth/signup')}
            className="bg-gradient-to-r from-[#7C3AED] to-[#C026D3] text-white text-sm font-medium px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
          >
            Get started
          </button>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
            Stop guessing{' '}
            <span className="bg-gradient-to-r from-[#7C3AED] to-[#C026D3] bg-clip-text text-transparent">
              what you don&apos;t know
            </span>
          </h1>
          <p className="text-[#8A8FA8] text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Blind Spot maps your knowledge gaps in real time and gives you an AI tutor that knows exactly where to focus — so you stop wasting time on what you already know.
          </p>

          {/* Input + CTA */}
          <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What are you trying to learn?"
                className="flex-1 bg-[#0E0F1A] border border-[#7C3AED]/20 text-[#F0F0F5] placeholder-[#8A8FA8]/50 rounded-2xl px-5 py-4 text-sm outline-none focus:border-[#7C3AED]/50 transition-colors"
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-[#7C3AED] to-[#C026D3] text-white font-semibold px-6 py-4 rounded-2xl hover:opacity-90 transition-opacity text-sm whitespace-nowrap"
              >
                Start for free →
              </button>
            </div>
          </form>

          <p className="mt-5 text-[#8A8FA8]/50 text-xs">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => router.push('/auth/login')}
              className="text-[#8A8FA8] hover:text-[#F0F0F5] transition-colors underline underline-offset-2"
            >
              Sign in
            </button>
          </p>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#7C3AED] text-xs uppercase tracking-widest mb-3">Process</p>
            <h2 className="text-3xl md:text-4xl font-bold">Three steps to zero blind spots</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                step: '01',
                title: 'Tell us your goal',
                desc: "Tell us what you want to learn or which exam you're preparing for. No setup required — just describe your goal in plain words.",
                icon: '◎',
              },
              {
                step: '02',
                title: 'We map your gaps',
                desc: 'Our diagnostic identifies exactly what you know and what you don\'t — even the gaps you didn\'t know you had. Precise, not generic.',
                icon: '◈',
              },
              {
                step: '03',
                title: 'You study what matters',
                desc: 'Your AI tutor focuses every session on closing the gaps that matter most for your goal. No busywork, no guessing.',
                icon: '▦',
              },
            ].map(item => (
              <div
                key={item.step}
                className="bg-[#0E0F1A] border border-[#7C3AED]/10 rounded-2xl p-7 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl text-[#7C3AED]">{item.icon}</span>
                  <span className="text-[#7C3AED]/40 text-xs font-mono font-bold tracking-widest">{item.step}</span>
                </div>
                <h3 className="text-[#F0F0F5] text-lg font-semibold leading-snug">{item.title}</h3>
                <p className="text-[#8A8FA8] text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#7C3AED] text-xs uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold">Every tool you need to stop guessing</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-[#0E0F1A] border border-[#7C3AED]/10 rounded-2xl p-8 flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center">
                <span className="text-[#7C3AED] text-lg">◉</span>
              </div>
              <h3 className="text-[#F0F0F5] text-xl font-semibold leading-snug">
                See your knowledge gap in real time
              </h3>
              <p className="text-[#8A8FA8] text-sm leading-relaxed">
                Your personal knowledge radar updates as you study. Watch your blind spots close and your weak areas strengthen — session by session, concept by concept. No more guessing where you stand.
              </p>
            </div>

            <div className="bg-[#0E0F1A] border border-[#7C3AED]/10 rounded-2xl p-8 flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center">
                <span className="text-[#7C3AED] text-lg">⬡</span>
              </div>
              <h3 className="text-[#F0F0F5] text-xl font-semibold leading-snug">
                AI tutoring that knows what you don&apos;t know
              </h3>
              <p className="text-[#8A8FA8] text-sm leading-relaxed">
                Your AI tutor has a complete picture of your knowledge — what you know, what you almost know, and what you&apos;ve never seen. Every explanation is calibrated to fill the exact gap you have, not a generic lesson.
              </p>
            </div>

            <div className="bg-[#0E0F1A] border border-[#7C3AED]/10 rounded-2xl p-8 flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center">
                <span className="text-[#7C3AED] text-lg">⚡</span>
              </div>
              <h3 className="text-[#F0F0F5] text-xl font-semibold leading-snug">
                Adaptive diagnostic, not a test
              </h3>
              <p className="text-[#8A8FA8] text-sm leading-relaxed">
                The diagnostic feels like a conversation, not an exam. It learns from how you answer — speed, confidence, patterns — to build a precise map of your knowledge in minutes.
              </p>
            </div>

            <div className="bg-[#0E0F1A] border border-[#7C3AED]/10 rounded-2xl p-8 flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center">
                <span className="text-[#7C3AED] text-lg">◷</span>
              </div>
              <h3 className="text-[#F0F0F5] text-xl font-semibold leading-snug">
                Built for your schedule
              </h3>
              <p className="text-[#8A8FA8] text-sm leading-relaxed">
                Ten minutes or an hour, Blind Spot adapts. Sessions are designed to maximize progress in whatever time you have — no fluff, no filler, no wasted minutes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-y border-[#8A8FA8]/10">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#8A8FA8]/10">
            {stats.map((s, i) => (
              <div key={i} className="px-8 py-6 text-center first:pl-0 last:pr-0">
                <p className="text-3xl md:text-4xl font-bold text-white mb-1">{s.number}</p>
                <p className="text-[#8A8FA8] text-xs leading-relaxed">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#7C3AED] text-xs uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-bold">Questions, answered</h2>
          </div>

          <div>
            {faq.map((item, i) => (
              <FAQItem key={i} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-[#0E0F1A] border-t border-[#8A8FA8]/10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-[#22D3EE] mb-5 leading-tight">
            Find your blind spots today.
          </h2>
          <p className="text-[#8A8FA8] text-lg mb-10 leading-relaxed">
            Start for free. No credit card. Your first diagnostic takes under five minutes.
          </p>
          <button
            onClick={() => router.push('/auth/signup')}
            className="bg-gradient-to-r from-[#7C3AED] to-[#C026D3] text-white font-semibold px-8 py-4 rounded-full hover:opacity-90 transition-opacity text-base"
          >
            Get started for free →
          </button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-[#8A8FA8]/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-[#8A8FA8]/50 text-xs">
            &copy; {new Date().getFullYear()} Blind Spot. All rights reserved.
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#8A8FA8]/50 text-sm font-semibold tracking-tight">blindspot</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] mb-2 flex-shrink-0" />
          </div>
        </div>
      </footer>

    </div>
  )
}
