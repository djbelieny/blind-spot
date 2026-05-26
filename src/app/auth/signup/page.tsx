'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

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
          <div className="flex items-center gap-1.5 mb-6">
            <span className="text-[#F0F0F5] font-semibold text-lg tracking-tight">blindspot</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] mb-2.5 flex-shrink-0" />
          </div>
          <h1 className="text-[#F0F0F5] text-2xl font-light">
            {q ? 'Create your account to continue.' : 'Create your account.'}
          </h1>
          {q && (
            <p className="text-[#8A8FA8] text-sm mt-2 leading-relaxed">
              Your goal: <span className="text-[#F0F0F5]">&ldquo;{q}&rdquo;</span>
            </p>
          )}
          {!q && <p className="text-[#8A8FA8] text-sm mt-1.5">Start finding your blind spots.</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="signup-name" className="sr-only">Your name (optional)</label>
            <input
              id="signup-name"
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name (optional)"
              className="w-full bg-[#0E0F1A] border border-[#8A8FA8]/12 hover:border-[#8A8FA8]/25 rounded-2xl px-5 py-4 text-[#F0F0F5] placeholder-[#8A8FA8]/40 text-sm outline-none transition-colors"
            />
          </div>
          <div>
            <label htmlFor="signup-email" className="sr-only">Email address</label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full bg-[#0E0F1A] border border-[#8A8FA8]/12 hover:border-[#8A8FA8]/25 rounded-2xl px-5 py-4 text-[#F0F0F5] placeholder-[#8A8FA8]/40 text-sm outline-none transition-colors"
            />
          </div>
          <div className="relative">
            <label htmlFor="signup-password" className="sr-only">Password (minimum 6 characters)</label>
            <input
              id="signup-password"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              required
              minLength={6}
              className="w-full bg-[#0E0F1A] border border-[#8A8FA8]/12 hover:border-[#8A8FA8]/25 rounded-2xl px-5 py-4 pr-12 text-[#F0F0F5] placeholder-[#8A8FA8]/40 text-sm outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A8FA8]/40 hover:text-[#8A8FA8] transition-colors p-1 rounded-lg"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p role="alert" className="text-red-400/90 text-xs px-1">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white font-medium py-4 rounded-2xl hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40 text-sm mt-1"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Creating account…
              </span>
            ) : 'Get started'}
          </button>
        </form>

        <p className="text-[#8A8FA8]/50 text-sm text-center mt-8">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[#8A8FA8] hover:text-[#F0F0F5] transition-colors underline underline-offset-2">
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
