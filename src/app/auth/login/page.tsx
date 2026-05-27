'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

function LoginInner() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/dashboard'

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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Login failed'); return }
      router.push(next)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <div className="flex items-center gap-1.5 mb-6">
            <span className="text-[#F0F0F5] font-semibold text-lg tracking-tight">blindspot</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F94716] mb-2.5 flex-shrink-0" />
          </div>
          <h1 className="text-[#F0F0F5] text-2xl font-light">Welcome back.</h1>
          <p className="text-[#8A8FA8] text-sm mt-1.5">Sign in to continue learning.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="login-email" className="sr-only">Email address</label>
            <input
              id="login-email"
              autoFocus
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full bg-[#141414] border border-[#8A8FA8]/12 hover:border-[#8A8FA8]/25 rounded-2xl px-5 py-4 text-[#F0F0F5] placeholder-[#8A8FA8]/40 text-sm outline-none transition-colors"
              style={{ '--tw-ring-color': 'transparent' } as React.CSSProperties}
            />
          </div>
          <div className="relative">
            <label htmlFor="login-password" className="sr-only">Password</label>
            <input
              id="login-password"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full bg-[#141414] border border-[#8A8FA8]/12 hover:border-[#8A8FA8]/25 rounded-2xl px-5 py-4 pr-12 text-[#F0F0F5] placeholder-[#8A8FA8]/40 text-sm outline-none transition-colors"
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
            className="w-full bg-gradient-to-r from-[#F94716] to-[#E03A0E] text-white font-medium py-4 rounded-2xl hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40 text-sm mt-1"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Signing in…
              </span>
            ) : 'Sign in'}
          </button>
        </form>

        <p className="text-[#8A8FA8]/50 text-sm text-center mt-8">
          New here?{' '}
          <Link href="/auth/signup" className="text-[#8A8FA8] hover:text-[#F0F0F5] transition-colors underline underline-offset-2">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>
}
