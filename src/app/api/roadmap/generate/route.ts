export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getProfile } from '@/lib/engine/progress'
import { getRoadmap, saveRoadmap } from '@/lib/engine/roadmap'
import { deepseekV3, MODELS } from '@/lib/ai/clients'
import type { Roadmap, LearningUnit } from '@/types/roadmap'
import { logCost, calcDeepseekCost } from '@/lib/costs'

export async function POST(req: NextRequest) {
  const { sessionId, topic } = (await req.json()) as { sessionId: string; topic?: string }
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const profile = await getProfile(sessionId)
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Use explicit topic or fall back to profile objective
  const studyTopic = (topic ?? profile.objective).trim()

  // Return cached roadmap if exists — scoped per topic
  const existing = await getRoadmap(sessionId, studyTopic)
  if (existing) return NextResponse.json({ roadmap: existing })

  const lang = profile.language === 'pt-BR' ? 'Brazilian Portuguese' : 'English'
  const language = lang
  const blindSpots = profile.blindSpotsIdentified ?? []

  const prompt = `You are a curriculum designer building a personalized learning roadmap.

Learner profile:
- Topic to master: ${studyTopic}
- Background level: ${profile.backgroundLevel}
- Language: ${lang}
- Identified blind spots: ${blindSpots.map(b => b.name).join(', ') || 'none identified'}
- Daily study time: ${profile.minutesPerDay} minutes

Create a learning roadmap of exactly 14 units organized in 4 tiers:
- Tier 1 (Foundation, 3 units): Core prerequisites they need first
- Tier 2 (Core Concepts, 5 units): Main subject matter — include ALL identified blind spots here
- Tier 3 (Application, 4 units): How to use and combine the knowledge
- Tier 4 (Mastery, 2 units): Advanced topics to fully achieve their goal

Rules:
- Each unit should be 20-35 minutes of focused learning
- Tier 1 units have NO prerequisites (prerequisites: [])
- Tier 2 units have 1-2 Tier 1 prerequisite IDs
- Tier 3 units have 1-3 Tier 2 prerequisite IDs
- Tier 4 units have 2-3 Tier 3 prerequisite IDs
- Mark isBlindSpot: true for any unit covering a diagnosed blind spot
- ALL text (titles, descriptions, tags) must be in ${language}
- Unit titles must be specific (NOT generic like "Introduction to X")

Return JSON object only — no markdown:
{
  "units": [
    {
      "id": "u1",
      "title": "...",
      "description": "1-2 sentence description of what will be learned in this unit",
      "tier": 1,
      "prerequisites": [],
      "estimatedMinutes": 25,
      "conceptTags": ["tag1", "tag2"],
      "isBlindSpot": false,
      "blindSpotId": null
    }
  ]
}`

  try {
    const res = await deepseekV3.chat.completions.create({
      model: MODELS.V3,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    })

    if (res.usage) logCost({ type: 'deepseek_chat', model: MODELS.V3, endpoint: '/api/roadmap/generate', sessionId, inputTokens: res.usage.prompt_tokens, outputTokens: res.usage.completion_tokens, cost: calcDeepseekCost(res.usage.prompt_tokens, res.usage.completion_tokens) })

    const raw = res.choices[0].message.content ?? '{}'
    const parsed = JSON.parse(raw) as { units: LearningUnit[] }
    const units: LearningUnit[] = parsed.units ?? []

    const roadmap: Roadmap = {
      sessionId,
      objective: studyTopic,
      units,
      generatedAt: new Date().toISOString(),
    }

    await saveRoadmap(roadmap, studyTopic)
    return NextResponse.json({ roadmap })
  } catch (err) {
    console.error('[roadmap/generate]', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
