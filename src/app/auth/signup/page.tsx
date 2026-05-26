'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function SignupInner() {
  const router = useRouter()
  const params = useSearchParams()
  const q = params.get('q') ?? ''

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: name || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not create account'); return }
      // After signup, go to onboarding if we have a query, otherwise dashboard
      if (q) {
        router.push(`/onboarding?q=${encodeURIComponent(q)}`)
      } else {
        router.push('/')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#08090F] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <p className="text-[#7C3AED] text-xs uppercase tracking-widest mb-3">Blind Spot</p>
          <h1 className="text-[#F0F0F5] text-2xl font-light">
            {q ? 'Create your account to continue.' : 'Create your account.'}
          </h1>
          {q && (
            <p className="text-[#8A8FA8] text-sm mt-2 leading-relaxed">
              Your goal: <span className="text-[#F0F0F5]">{q}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full bg-[#0E0F1A] border border-[#8A8FA8]/12 rounded-2xl px-5 py-4 text-[#F0F0F5] placeholder-[#8A8FA8]/30 text-sm outline-none focus:border-[#8A8FA8]/30"
          />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full bg-[#0E0F1A] border border-[#8A8FA8]/12 rounded-2xl px-5 py-4 text-[#F0F0F5] placeholder-[#8A8FA8]/30 text-sm outline-none focus:border-[#8A8FA8]/30"
          />
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              required
              minLength={6}
              className="w-full bg-[#0E0F1A] border border-[#8A8FA8]/12 rounded-2xl px-5 py-4 pr-14 text-[#F0F0F5] placeholder-[#8A8FA8]/30 text-sm outline-none focus:border-[#8A8FA8]/30"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A8FA8]/50 hover:text-[#8A8FA8] text-xs transition-colors"
            >
              {showPw ? 'hide' : 'show'}
            </button>
          </div>

          {error && <p className="text-red-400/80 text-xs px-1">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-[#7C3AED] text-[#08090F] font-semibold py-4 rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-40 text-sm mt-2"
          >
            {loading ? 'Creating account…' : 'Get started →'}
          </button>
        </form>

        <p className="text-[#8A8FA8]/50 text-sm text-center mt-8">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[#8A8FA8] hover:text-[#F0F0F5] transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function SignupPage() {
  return <Suspense><SignupInner /></Suspense>
}
