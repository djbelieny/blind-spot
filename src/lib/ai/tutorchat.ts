import { deepseekV3, MODELS } from './clients'
import type { LearnerProfile, OnboardingStage, Language } from '@/types/learner'

const PERSONA_INSTRUCTIONS: Record<string, Record<Language, string>> = {
  direto: {
    'pt-BR': 'Seja direto e eficiente. Nada de rodeios. Vá ao ponto. Frases curtas. Sem elogios desnecessários.',
    en: 'Be direct and efficient. No fluff. Get to the point. Short sentences. No unnecessary praise.',
  },
  encorajador: {
    'pt-BR': 'Seja encorajador e acolhedor. Celebre o progresso. Construa confiança. Tom caloroso mas específico.',
    en: 'Be encouraging and warm. Celebrate progress. Build confidence. Warm but specific tone.',
  },
  socratico: {
    'pt-BR': 'Use o método socrático. Faça perguntas para guiar o aluno a descobrir por conta própria. Nunca dê a resposta direto.',
    en: 'Use the Socratic method. Ask questions to guide the student to discover on their own. Never give the answer directly.',
  },
}

export function buildSystemPrompt(profile: LearnerProfile, stage: OnboardingStage): string {
  const lang = profile.language
  const persona = profile.persona ?? 'encorajador'
  const personaInstruction =
    PERSONA_INSTRUCTIONS[persona]?.[lang] ?? PERSONA_INSTRUCTIONS['encorajador'][lang]

  return `You are Blind Spot, an AI tutor. Your tagline: "The tutor that reveals what you have not seen yet."

STUDENT PROFILE:
${JSON.stringify(profile, null, 2)}

PERSONA: ${personaInstruction}

LANGUAGE: Always respond in ${lang === 'en' ? 'English' : 'Brazilian Portuguese'}.

CURRENT STAGE: ${stage}

RULES:
- Be a mentor, not a chatbot. Think deeply before responding.
- Always connect advice to the student's specific objective: "${profile.objective}"
- Reference their obstacle "${profile.obstacle ?? 'none'}" when relevant
- Keep responses focused. Don't overwhelm.
- ${lang === 'pt-BR' ? 'Use português brasileiro natural, não formal em excesso.' : 'Use natural, conversational English.'}`
}

export async function* streamTutorResponse(params: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  profile: LearnerProfile
  stage: OnboardingStage
}): AsyncGenerator<string> {
  const { messages, profile, stage } = params
  const systemPrompt = buildSystemPrompt(profile, stage)
  const stream = await deepseekV3.chat.completions.create({
    model: MODELS.V3,
    stream: true,
    max_tokens: 600,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ],
  })
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) yield delta
  }
}
