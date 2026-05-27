'use client'
import { useState } from 'react'
import type { QuizQuestion, QuizAnswer } from '@/types/learner'

interface QuizCardProps {
  questions: QuizQuestion[]
  onComplete: (answers: QuizAnswer[]) => void
}

export default function QuizCard({ questions, onComplete }: QuizCardProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [visible, setVisible] = useState(true)
  const [startTime] = useState(Date.now())

  const current = questions[currentIdx]

  const handleSelect = (option: string) => {
    const answer: QuizAnswer = {
      questionId: current.id,
      selectedAnswer: option,
      timeToAnswerMs: Date.now() - startTime,
      skipped: false,
    }
    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)

    if (currentIdx < questions.length - 1) {
      setTimeout(() => setCurrentIdx(i => i + 1), 300)
    } else {
      setVisible(false)
      setTimeout(() => onComplete(newAnswers), 400)
    }
  }

  if (!visible || !current) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-20 px-4">
      <div className="bg-[#141414] border border-[#F94716]/20 rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex gap-1 mb-4">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < currentIdx ? 'bg-[#F94716]' : i === currentIdx ? 'bg-[#F94716]/60' : 'bg-[#888888]/20'
              }`}
            />
          ))}
        </div>
        <p className="text-[#F0F0F5] text-base mb-5 leading-relaxed">{current.question}</p>
        <div className="space-y-2">
          {current.options.map(opt => (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              className="w-full text-left px-4 py-3 rounded-xl border border-[#888888]/20 text-[#F0F0F5] text-sm hover:border-[#F94716]/50 hover:bg-[#F94716]/5 transition-all duration-200"
            >
              {opt}
            </button>
          ))}
        </div>
        <button
          onClick={() => handleSelect('__skipped__')}
          className="mt-3 text-[#888888] text-xs w-full text-center hover:text-[#F0F0F5] transition-colors"
        >
          I don&apos;t know / Skip
        </button>
      </div>
    </div>
  )
}
