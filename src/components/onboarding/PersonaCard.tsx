'use client'
import type { PersonaType } from '@/types/learner'

const PERSONAS = [
  {
    id: 'direto' as PersonaType,
    name: 'Sharp',
    namePt: 'Direto',
    icon: '⚡',
    description: 'Straight to the point. No fluff. Maximum efficiency.',
    descriptionPt: 'Direto ao ponto. Sem rodeios. Máxima eficiência.',
    sample: '"This concept has 3 parts. Here they are."',
    samplePt: '"Esse conceito tem 3 partes. Aqui estão."',
  },
  {
    id: 'encorajador' as PersonaType,
    name: 'Coach',
    namePt: 'Encorajador',
    icon: '🌱',
    description: 'Warm and encouraging. Celebrates every step forward.',
    descriptionPt: 'Caloroso e encorajador. Celebra cada passo.',
    sample: '"You\'re closer than you think. Let\'s build on what you know."',
    samplePt: '"Você está mais perto do que imagina. Vamos construir sobre o que você já sabe."',
  },
  {
    id: 'socratico' as PersonaType,
    name: 'Guide',
    namePt: 'Socrático',
    icon: '🔍',
    description: 'Questions over answers. You discover, I guide.',
    descriptionPt: 'Perguntas antes de respostas. Você descobre, eu guio.',
    sample: '"Before I explain — what do you think happens here?"',
    samplePt: '"Antes de explicar — o que você acha que acontece aqui?"',
  },
]

interface PersonaCardProps {
  language: 'pt-BR' | 'en'
  onSelect: (persona: PersonaType) => void
}

export default function PersonaCard({ language, onSelect }: PersonaCardProps) {
  const isPt = language === 'pt-BR'
  return (
    <div className="fixed inset-0 flex items-center justify-center z-20 px-4 bg-[#08090F]/80 backdrop-blur-sm">
      <div className="max-w-2xl w-full">
        <p className="text-[#8A8FA8] text-sm text-center mb-6">
          {isPt ? 'Como você prefere que eu te ajude?' : 'How would you like me to help you?'}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {PERSONAS.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="bg-[#0E0F1A] border border-[#8A8FA8]/20 rounded-2xl p-5 text-left hover:border-[#7C3AED]/50 hover:bg-[#7C3AED]/5 transition-all duration-200 group"
            >
              <div className="text-2xl mb-3">{p.icon}</div>
              <div className="text-[#F0F0F5] font-medium text-sm mb-1">
                {isPt ? p.namePt : p.name}
              </div>
              <div className="text-[#8A8FA8] text-xs mb-3 leading-relaxed">
                {isPt ? p.descriptionPt : p.description}
              </div>
              <div className="text-[#7C3AED]/60 text-xs italic leading-relaxed group-hover:text-[#7C3AED]">
                {isPt ? p.samplePt : p.sample}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
