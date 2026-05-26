import { deepseekV3, MODELS } from './clients'
import type { TextChunk, LearnerProfile } from '@/types/learner'

export async function synthesizeAnswer(
  question: string,
  chunks: TextChunk[],
  profile: LearnerProfile
): Promise<string> {
  if (!chunks.length) {
    return profile.language === 'en'
      ? "I don't have specific course content on that yet, but let me help you understand the concept."
      : 'Não tenho conteúdo específico do curso sobre isso ainda, mas deixa eu te ajudar a entender o conceito.'
  }

  const context = chunks.map((c, i) => `[Source ${i + 1}]\n${c.text}`).join('\n\n')
  const langInstruction =
    profile.language === 'en' ? 'Answer in English.' : 'Responda em português brasileiro.'

  const prompt = `You are a tutor answering a student's question using course material.

Student level: ${profile.backgroundLevel}
Student objective: ${profile.objective}
${langInstruction}

COURSE CONTENT:
${context}

STUDENT QUESTION: ${question}

Answer clearly and concisely based on the course content. Adapt the explanation to the student's level.
If the content doesn't directly answer the question, use it as context and explain the relevant concept.
Keep your answer under 200 words.`

  const res = await deepseekV3.chat.completions.create({
    model: MODELS.V3,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 400,
    temperature: 0.3,
  })

  return res.choices[0].message.content ?? ''
}
