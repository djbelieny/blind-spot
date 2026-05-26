import { deepseekV3, MODELS } from './clients'
import type { LearnerProfile, Language } from '@/types/learner'

const DNA_NAMES: Record<string, { en: string; pt: string }> = {
  explorador: { en: 'Practical Explorer', pt: 'Explorador Prático' },
  absorvedor: { en: 'Visual Absorber', pt: 'Absorvedor Visual' },
  construtor: { en: 'Methodical Builder', pt: 'Construtor Metódico' },
  conector: { en: 'Conceptual Connector', pt: 'Conector Conceitual' },
  sprint: { en: 'Intense Sprinter', pt: 'Sprint Intenso' },
}

export async function generateDNAReveal(
  profile: LearnerProfile,
  language: Language,
  domain: string
): Promise<string> {
  const dnaName = profile.dnaType
    ? DNA_NAMES[profile.dnaType]?.[language === 'en' ? 'en' : 'pt'] ?? profile.dnaType
    : 'Practical Explorer'
  const isEn = language === 'en'

  const prompt = isEn
    ? `Write a short, emotional, mentor-like revelation for a student. 3 short paragraphs.

Student profile:
- DNA type: ${dnaName}
- Objective: ${profile.objective}
- Domain: ${domain}
- Obstacle they mentioned: ${profile.obstacle ?? 'none'}
- Minutes per day: ${profile.minutesPerDay}

Write as a wise mentor who just spent time understanding this specific person. Be warm, specific, not generic.
Reference their obstacle naturally. Give them a concrete timeline.
End with: "And there's something you haven't seen yet..."

Write in English. Plain text only, no markdown.`
    : `Escreva uma revelação curta e emocional, no estilo de um mentor sábio. 3 parágrafos curtos.

Perfil do aluno:
- Tipo DNA: ${dnaName}
- Objetivo: ${profile.objective}
- Domínio: ${domain}
- Obstáculo mencionado: ${profile.obstacle ?? 'nenhum'}
- Minutos por dia: ${profile.minutesPerDay}

Escreva como um mentor que acabou de entender profundamente essa pessoa específica. Seja caloroso, específico, não genérico.
Mencione o obstáculo naturalmente. Dê um prazo concreto.
Termine com: "E tem uma coisa que você ainda não sabe que não sabe..."

Escreva em português brasileiro. Texto simples, sem markdown.`

  const res = await deepseekV3.chat.completions.create({
    model: MODELS.V3,
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  return res.choices[0]?.message?.content ?? ''
}
