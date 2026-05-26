import { NextRequest, NextResponse } from 'next/server'
import { getProfile } from '@/lib/engine/progress'
import { getRoadmap, getUnitContent, saveUnitContent } from '@/lib/engine/roadmap'
import { deepseekV3, MODELS } from '@/lib/ai/clients'
import type { UnitContent } from '@/types/roadmap'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  const unitId = req.nextUrl.searchParams.get('unitId')
  if (!sessionId || !unitId) {
    return NextResponse.json({ error: 'sessionId and unitId required' }, { status: 400 })
  }
  const content = await getUnitContent(sessionId, unitId)
  return NextResponse.json({ content: content ?? null })
}

export async function POST(req: NextRequest) {
  const { sessionId, unitId } = (await req.json()) as { sessionId: string; unitId: string }
  if (!sessionId || !unitId) {
    return NextResponse.json({ error: 'sessionId and unitId required' }, { status: 400 })
  }

  // Return cached content if exists
  const cached = await getUnitContent(sessionId, unitId)
  if (cached) return NextResponse.json({ content: cached })

  const [profile, roadmap] = await Promise.all([
    getProfile(sessionId),
    getRoadmap(sessionId),
  ])

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (!roadmap) return NextResponse.json({ error: 'Roadmap not found' }, { status: 404 })

  const unit = roadmap.units.find(u => u.id === unitId)
  if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })

  const lang = profile.language === 'pt-BR' ? 'Brazilian Portuguese' : 'English'
  const level = profile.backgroundLevel
  const language = lang

  const prompt = `Generate comprehensive multimodal learning content for this unit.

Unit: ${unit.title}
Description: ${unit.description}
Concept tags: ${unit.conceptTags.join(', ')}
Student level: ${level}
Student learning style DNA: ${profile.dnaType ?? 'explorador'}
Language: ${language}

Generate ALL of the following in ${language}. Return JSON only:
{
  "explanation": "200-250 word core explanation, written clearly for ${level} level",
  "keyPoints": ["4-5 bullet points, each max 15 words"],
  "flashcards": [
    {"front": "concept or question", "back": "clear explanation or answer"}
  ],
  "quiz": [
    {
      "question": "...",
      "options": ["option A", "option B", "option C", "option D"],
      "answer": "option A",
      "explanation": "brief explanation of why this is correct"
    }
  ],
  "podcastScript": "700-900 words of natural spoken narration, as if recording a podcast episode on this topic. Conversational tone, includes examples and analogies.",
  "videoScript": "180-220 words structured as: [HOOK 20 words] [CORE CONCEPT 100 words] [EXAMPLE 60 words] [TAKEAWAY 30 words]. Clear, visual, punchy."
}

Requirements:
- Exactly 6 flashcards
- Exactly 4 quiz questions
- answer field must exactly match one of the 4 options
- All content in ${language}`

  try {
    const res = await deepseekV3.chat.completions.create({
      model: MODELS.V3,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    })

    const raw = res.choices[0].message.content ?? '{}'
    const parsed = JSON.parse(raw) as Omit<UnitContent, 'unitId' | 'generatedAt'>

    const content: UnitContent = {
      unitId,
      explanation: parsed.explanation ?? '',
      keyPoints: parsed.keyPoints ?? [],
      flashcards: parsed.flashcards ?? [],
      quiz: parsed.quiz ?? [],
      podcastScript: parsed.podcastScript ?? '',
      videoScript: parsed.videoScript ?? '',
      generatedAt: new Date().toISOString(),
    }

    await saveUnitContent(sessionId, content)
    return NextResponse.json({ content })
  } catch (err) {
    console.error('[roadmap/content]', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
