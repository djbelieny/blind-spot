'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    inputRef.current?.focus()
    // If already authenticated, go straight to dashboard
    fetch('/api/auth/me')
      .then(r => { if (r.ok) router.replace('/dashboard') })
      .catch(() => {})
  }, [router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    router.push(`/auth/signup?q=${encodeURIComponent(message.trim())}`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0A0C14]">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl px-6">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What are you trying to learn?"
            className="w-full bg-transparent text-[#F0F0F5] text-xl md:text-2xl placeholder-[#8A8FA8]/50 border-b border-[#8A8FA8]/20 focus:border-[#F5A623]/60 outline-none pb-4 transition-colors duration-300"
          />
        </div>
        {message && (
          <div className="mt-7 flex justify-end">
            <button
              type="submit"
              className="text-[#F5A623]/80 text-sm hover:text-[#F5A623] transition-colors"
            >
              {message.length > 3 ? 'Keep going →' : '→'}
            </button>
          </div>
        )}
        <p className="mt-8 text-center text-[#8A8FA8]/30 text-xs">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => router.push('/auth/login')}
            className="text-[#8A8FA8]/50 hover:text-[#8A8FA8] transition-colors"
          >
            Sign in
          </button>
        </p>
      </form>
    </main>
  )
}
