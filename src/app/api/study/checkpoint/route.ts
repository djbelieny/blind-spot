import { NextRequest, NextResponse } from 'next/server'
import { getProfile } from '@/lib/engine/progress'
import { deepseekV3, MODELS } from '@/lib/ai/clients'

export async function POST(req: NextRequest) {
  const { sessionId, courseName, conceptsCovered } = (await req.json()) as {
    sessionId: string
    courseName: string
    conceptsCovered?: string[]
  }

  const profile = await getProfile(sessionId)
  if (!profile) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const lang = profile.language
  const prompt = `Create 2 short checkpoint questions to test if a student understood: ${courseName}.
Concepts covered: ${(conceptsCovered ?? []).join(', ')}.
${lang === 'en' ? 'Write in English.' : 'Escreva em português.'}

Return JSON: {"questions": [{"id":"c1","question":"...","options":["A)...","B)...","C)...","D)..."],"correctAnswer":"A)..."}]}`

  const res = await deepseekV3.chat.completions.create({
    model: MODELS.V3,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 600,
    response_format: { type: 'json_object' },
  })

  const content = res.choices[0].message.content ?? '{}'
  try {
    return NextResponse.json(JSON.parse(content))
  } catch {
    return NextResponse.json({ questions: [] })
  }
}
