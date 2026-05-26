'use client'
import { useState } from 'react'

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: string
}

interface CheckpointModalProps {
  questions: Question[]
  courseName: string
  language: 'pt-BR' | 'en'
  onComplete: (score: number) => void
}

export default function CheckpointModal({ questions, courseName, language, onComplete }: CheckpointModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)

  const current = questions[currentIdx]
  const isEn = language === 'en'

  const handleAnswer = (opt: string) => {
    const newAnswers = [...answers, opt]
    setAnswers(newAnswers)
    if (currentIdx < questions.length - 1) {
      setTimeout(() => setCurrentIdx(i => i + 1), 300)
    } else {
      const correct = newAnswers.filter((a, i) => a === questions[i].correctAnswer).length
      const s = Math.round((correct / questions.length) * 100)
      setScore(s)
      setShowResult(true)
    }
  }

  if (showResult) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-30 bg-[#0A0C14]/90 backdrop-blur-sm px-4">
        <div className="bg-[#0D1117] border border-[#34C785]/30 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl font-bold text-[#34C785] mb-2">{score}%</div>
          <p className="text-[#F0F0F5] mb-1">{isEn ? 'Session complete' : 'Sessão completa'}</p>
          <p className="text-[#8A8FA8] text-sm mb-6">{courseName}</p>
          <p className="text-[#8A8FA8] text-sm mb-4">
            {isEn
              ? "What did you learn today that you didn't know yesterday?"
              : 'O que você aprendeu hoje que não sabia ontem?'}
          </p>
          <button
            onClick={() => onComplete(score)}
            className="bg-[#34C785] text-[#0A0C14] font-medium px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            {isEn ? 'Continue →' : 'Continuar →'}
          </button>
        </div>
      </div>
    )
  }

  if (!current) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-30 bg-[#0A0C14]/80 backdrop-blur-sm px-4">
      <div className="bg-[#0D1117] border border-[#8A8FA8]/20 rounded-2xl p-6 max-w-lg w-full">
        <div className="flex gap-1 mb-4">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= currentIdx ? 'bg-[#F5A623]' : 'bg-[#8A8FA8]/20'}`}
            />
          ))}
        </div>
        <p className="text-[#8A8FA8] text-xs mb-3 uppercase tracking-widest">
          {isEn ? 'Quick check' : 'Verificação rápida'}
        </p>
        <p className="text-[#F0F0F5] text-base mb-5 leading-relaxed">{current.question}</p>
        <div className="space-y-2">
          {current.options.map(opt => (
            <button
              key={opt}
              onClick={() => handleAnswer(opt)}
              className="w-full text-left px-4 py-3 rounded-xl border border-[#8A8FA8]/20 text-[#F0F0F5] text-sm hover:border-[#F5A623]/50 hover:bg-[#F5A623]/5 transition-all"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
