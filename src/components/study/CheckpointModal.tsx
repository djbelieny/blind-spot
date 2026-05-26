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
  mode?: 'checkpoint' | 'unlock'
  onComplete: (score: number) => void
  onCancel?: () => void
}

export default function CheckpointModal({ questions, courseName, language, mode = 'checkpoint', onComplete, onCancel }: CheckpointModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)

  const current = questions[currentIdx]
  const isEn = language === 'en'
  const isUnlock = mode === 'unlock'

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
    const passed = score >= 70
    const borderColor = passed ? 'border-[#34C785]/30' : 'border-[#C026D3]/30'
    const scoreColor = passed ? 'text-[#34C785]' : 'text-[#C026D3]'

    return (
      <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-[#08090F]/90 backdrop-blur-sm px-4">
        <div className={`bg-[#0E0F1A] border ${borderColor} rounded-2xl p-8 max-w-md w-full text-center`}>
          <div className={`text-5xl font-bold ${scoreColor} mb-2`}>{score}%</div>

          {isUnlock ? (
            <>
              <p className="text-[#F0F0F5] font-medium mb-1">
                {passed
                  ? (isEn ? '🔓 Topic unlocked!' : '🔓 Tópico desbloqueado!')
                  : (isEn ? 'Not quite yet' : 'Ainda não desta vez')}
              </p>
              <p className="text-[#8A8FA8] text-sm mb-6">
                {passed
                  ? (isEn ? `You know enough to dive into ${courseName}.` : `Você sabe o suficiente para mergulhar em ${courseName}.`)
                  : (isEn ? `Let's build the foundation first.` : `Vamos construir a base primeiro.`)}
              </p>
            </>
          ) : (
            <>
              <p className="text-[#F0F0F5] mb-1">{isEn ? 'Session complete' : 'Sessão completa'}</p>
              <p className="text-[#8A8FA8] text-sm mb-6">{courseName}</p>
            </>
          )}

          <button
            onClick={() => onComplete(score)}
            className={`font-medium px-6 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm ${
              passed ? 'bg-[#34C785] text-[#08090F]' : 'bg-[#7C3AED] text-white'
            }`}
          >
            {isUnlock
              ? (passed ? (isEn ? 'Let\'s go →' : 'Vamos lá →') : (isEn ? 'Study prerequisites →' : 'Estudar pré-requisitos →'))
              : (isEn ? 'Continue →' : 'Continuar →')}
          </button>
        </div>
      </div>
    )
  }

  if (!current) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-[#08090F]/80 backdrop-blur-sm px-4">
      <div className="bg-[#0E0F1A] border border-[#8A8FA8]/20 rounded-2xl p-6 max-w-lg w-full">
        {/* Progress bar + cancel row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex gap-1 flex-1">
            {questions.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i <= currentIdx ? 'bg-[#7C3AED]' : 'bg-[#8A8FA8]/20'}`} />
            ))}
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-[#8A8FA8]/40 hover:text-[#8A8FA8] transition-colors text-lg leading-none flex-shrink-0 -mt-0.5"
              aria-label="Cancel"
            >
              ×
            </button>
          )}
        </div>

        {isUnlock && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[#22D3EE] text-xs">🔒</span>
            <p className="text-[#22D3EE] text-xs uppercase tracking-widest">
              {isEn ? 'Unlock challenge' : 'Desafio de desbloqueio'}
            </p>
          </div>
        )}

        {!isUnlock && (
          <p className="text-[#8A8FA8] text-xs mb-3 uppercase tracking-widest">
            {isEn ? 'Quick check' : 'Verificação rápida'}
          </p>
        )}

        <p className="text-[#F0F0F5] text-base mb-5 leading-relaxed">{current.question}</p>
        <div className="space-y-2">
          {current.options.map(opt => (
            <button
              key={opt}
              onClick={() => handleAnswer(opt)}
              className="w-full text-left px-4 py-3 rounded-xl border border-[#8A8FA8]/20 text-[#F0F0F5] text-sm hover:border-[#7C3AED]/50 hover:bg-[#7C3AED]/5 transition-all"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
