import { deepseekV3, MODELS } from './clients'
import type { QuizQuestion, Language, BackgroundLevel } from '@/types/learner'

const DIFFICULTY_MAP: Record<BackgroundLevel, QuizQuestion['difficulty']> = {
  novice: 'basic',
  intermediate: 'intermediate',
  expert: 'advanced',
}

export async function generateDomainQuestions(
  objective: string,
  domain: string,
  level: BackgroundLevel,
  language: Language
): Promise<QuizQuestion[]> {
  const langInstruction = language === 'en' ? 'Write everything in English.' : 'Escreva tudo em português brasileiro.'
  const difficulty = DIFFICULTY_MAP[level]

  const prompt = `You are creating diagnostic questions to assess a student's knowledge level.

Domain: ${domain}
Student objective: ${objective}
Level: ${level}
${langInstruction}

Create exactly 3 multiple-choice questions that test foundational concepts in this domain.
Calibrate difficulty to ${level}: ${level === 'novice' ? 'basic definitions and simple applications' : level === 'intermediate' ? 'applied concepts and common misconceptions' : 'nuanced distinctions and advanced applications'}.

Return JSON array with this structure:
[
  {
    "id": "q1",
    "question": "question text",
    "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
    "correctAnswer": "A) option1",
    "conceptTag": "concept-name-kebab-case",
    "prerequisiteTag": "prerequisite-concept or null",
    "difficulty": "${difficulty}"
  }
]

Return ONLY a valid JSON array.`

  const res = await deepseekV3.chat.completions.create({
    model: MODELS.V3,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1000,
    response_format: { type: 'json_object' },
  })

  const content = res.choices[0].message.content ?? '{"questions":[]}'
  try {
    const parsed = JSON.parse(content)
    const questions: QuizQuestion[] = Array.isArray(parsed) ? parsed : (parsed.questions ?? [])
    return questions.slice(0, 3)
  } catch {
    return []
  }
}
