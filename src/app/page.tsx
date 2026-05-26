'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [message, setMessage] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    router.push(`/onboarding?q=${encodeURIComponent(message.trim())}`)
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
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="What do you want to get unstuck on?"
            className="w-full bg-transparent text-[#F0F0F5] text-xl md:text-2xl placeholder-[#8A8FA8] border-b border-[#8A8FA8]/30 focus:border-[#F5A623] outline-none pb-3 transition-colors duration-300"
          />
          {!message && focused && (
            <span className="absolute right-0 top-0 text-[#F5A623] animate-pulse text-2xl">|</span>
          )}
        </div>
        {message && (
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="text-[#F5A623] text-sm tracking-widest uppercase opacity-70 hover:opacity-100 transition-opacity"
            >
              Find my blind spots →
            </button>
          </div>
        )}
      </form>
    </main>
  )
}
