'use client'
import { useState, useRef, useEffect } from 'react'

// Web Speech API types — not in all TS DOM lib versions
interface ISpeechRecognition {
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { results: { [i: number]: { [i: number]: { transcript: string } } } }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognition
}

interface VoiceToggleProps {
  persona: string
  onTranscript: (text: string) => void
  onPlayTTS: (text: string) => void
}

export default function VoiceToggle({ persona, onTranscript, onPlayTTS }: VoiceToggleProps) {
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<ISpeechRecognition | null>(null)

  // Keep a stable ref to the latest callback so the SpeechRecognition instance
  // is only created once (avoids re-instantiation on every parent re-render).
  const onTranscriptRef = useRef(onTranscript)
  useEffect(() => { onTranscriptRef.current = onTranscript }, [onTranscript])

  // onPlayTTS is available via prop for external callers; suppress unused-var
  void onPlayTTS
  void persona

  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as unknown as {
      SpeechRecognition?: ISpeechRecognitionConstructor
      webkitSpeechRecognition?: ISpeechRecognitionConstructor
    }
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) return

    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      onTranscriptRef.current(transcript)
      setIsListening(false)
    }
    rec.onend = () => setIsListening(false)
    recognitionRef.current = rec
  }, [])

  const toggleListen = () => {
    if (!recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-20 flex flex-col items-end gap-3">
      {isVoiceMode && (
        <button
          onClick={toggleListen}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isListening
              ? 'bg-[#F5A623] animate-pulse'
              : 'bg-[#1a1f2e] border border-[#8A8FA8]/20 hover:border-[#F5A623]/50'
          }`}
          title={isListening ? 'Listening...' : 'Speak'}
        >
          <svg className="w-5 h-5 text-[#F0F0F5]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
          </svg>
        </button>
      )}
      <button
        onClick={() => setIsVoiceMode(v => !v)}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          isVoiceMode
            ? 'bg-[#F5A623]/20 border border-[#F5A623]/50'
            : 'bg-[#1a1f2e] border border-[#8A8FA8]/20 hover:border-[#F5A623]/30'
        }`}
        title={isVoiceMode ? 'Switch to text' : 'Switch to voice'}
      >
        {isVoiceMode ? (
          <svg className="w-5 h-5 text-[#F5A623]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        ) : (
          <svg className="w-5 h-5 text-[#8A8FA8]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
          </svg>
        )}
      </button>
    </div>
  )
}
