import { NextRequest, NextResponse } from 'next/server'
import { getProfile } from '@/lib/engine/progress'
import { deepseekV3, MODELS } from '@/lib/ai/clients'
import redis from '@/lib/redis'
import type { BlindSpot } from '@/types/learner'
import { logCost, calcDeepseekCost } from '@/lib/costs'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  const lang = req.nextUrl.searchParams.get('lang') as 'en' | 'pt-BR' | null
  if (!sessionId || !lang) return NextResponse.json({ error: 'sessionId and lang required' }, { status: 400 })

  const cacheKey = `spots:${sessionId}:${lang}`

  try {
    const hit = await redis.get(cacheKey)
    if (hit) return NextResponse.json({ blindSpots: JSON.parse(hit), cached: true })
  } catch {}

  const profile = await getProfile(sessionId)
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const spots = profile.blindSpotsIdentified
  if (!spots?.length) return NextResponse.json({ blindSpots: [] })

  const targetLang = lang === 'pt-BR' ? 'Brazilian Portuguese' : 'English'

  const payload = spots.map(s => ({
    id: s.id, name: s.name, description: s.description, evidence: s.evidence, impact: s.impact,
    confidence: s.confidence, estimatedFixMinutes: s.estimatedFixMinutes,
    relatedCourseIds: s.relatedCourseIds, conceptTag: s.conceptTag,
    prerequisiteTag: s.prerequisiteTag, status: s.status,
  }))

  try {
    const res = await deepseekV3.chat.completions.create({
      model: MODELS.V3,
      messages: [{
        role: 'user',
        content: `Translate the following learning blind spot data to ${targetLang}.
Keep all field names exactly as-is. Only translate the string values of: name, description, evidence, impact.
Do not change: id, confidence, estimatedFixMinutes, relatedCourseIds, conceptTag, prerequisiteTag, status.
Return a JSON object with key "blindSpots" containing the translated array. No markdown, no explanation.

${JSON.stringify(payload)}`,
      }],
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    })

    if (res.usage) logCost({ type: 'deepseek_chat', model: MODELS.V3, endpoint: '/api/translate/blindspots', sessionId: sessionId!, inputTokens: res.usage.prompt_tokens, outputTokens: res.usage.completion_tokens, cost: calcDeepseekCost(res.usage.prompt_tokens, res.usage.completion_tokens) })

    const raw = res.choices[0].message.content ?? '{}'
    const parsed = JSON.parse(raw)
    const translated: BlindSpot[] = parsed.blindSpots ?? parsed.blind_spots ?? spots

    redis.setex(cacheKey, 604800, JSON.stringify(translated)).catch(() => {})
    return NextResponse.json({ blindSpots: translated })
  } catch {
    return NextResponse.json({ blindSpots: spots })
  }
}
