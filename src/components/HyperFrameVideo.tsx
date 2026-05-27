'use client'
import { useState, useEffect, useRef } from 'react'

interface HyperFrameVideoProps {
  type: 'dna_reveal' | 'blind_spot' | 'session_start' | 'session_end'
  data: Record<string, unknown>
  autoPlay?: boolean
  onEnded?: () => void
}

export default function HyperFrameVideo({ type, data, autoPlay = true, onEnded }: HyperFrameVideoProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    let objectUrl: string | null = null

    async function generate() {
      setLoading(true)
      setError(false)
      try {
        const res = await fetch('/api/hyperframes/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, data, fps: 30, duration: type === 'session_start' ? 3 : type === 'blind_spot' ? 2 : 3 }),
        })
        if (!res.ok) throw new Error('render failed')
        const blob = await res.blob()
        objectUrl = URL.createObjectURL(blob)
        setVideoUrl(objectUrl)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    generate()
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [type, JSON.stringify(data)])

  if (error) return null

  if (loading) {
    return (
      <div className="w-full aspect-video bg-[#141414] rounded-2xl flex items-center justify-center border border-[#888888]/10 my-4">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#F94716]/40 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!videoUrl) return null

  return (
    <div className="w-full my-4">
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay={autoPlay}
        muted
        playsInline
        onEnded={onEnded}
        className="w-full rounded-2xl border border-[#888888]/10"
        style={{ maxHeight: '240px', objectFit: 'cover' }}
      />
    </div>
  )
}
