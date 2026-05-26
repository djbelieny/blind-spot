import { NextRequest, NextResponse } from 'next/server'
import { getProfile } from '@/lib/engine/progress'
import { getUnitContent, getRoadmap } from '@/lib/engine/roadmap'
import { deepseekV3, MODELS } from '@/lib/ai/clients'
import redis from '@/lib/redis'

export const maxDuration = 120

const VOICE_HOST_A = process.env.ELEVENLABS_VOICE_HOST_A ?? 'pNInz6obpgDQGcFmaJgB'
const VOICE_HOST_B = process.env.ELEVENLABS_VOICE_HOST_B ?? '21m00Tcm4TlvDq8ikWAM'

export interface PodcastTurn {
  speaker: 'A' | 'B'
  name: string
  text: string
}

function topicSlug(topic: string) {
  return topic.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60)
}

function dialogueCacheKey(sessionId: string, unitId: string, slug: string) {
  return `podcast_dialogue:${sessionId}:${slug}:${unitId}`
}

async function generateDialogue(
  unitTitle: string,
  description: string,
  explanation: string,
  keyPoints: string[],
  language: string,
): Promise<PodcastTurn[]> {
  const names = language === 'Brazilian Portuguese'
    ? { A: 'Carlos', B: 'Marina' }
    : { A: 'Alex', B: 'Sam' }

  const prompt = `Create a two-host educational podcast script on the following topic.

Topic: ${unitTitle}
Description: ${description}
Core concept: ${explanation.slice(0, 800)}
Key points: ${keyPoints.slice(0, 4).join(' | ')}
Language: ${language}

Hosts:
- ${names.A}: the explainer — breaks down concepts clearly, uses analogies, connects to examples
- ${names.B}: the curious questioner — pushes deeper, challenges assumptions, asks "what about...", "why not just...", connects to real-world scenarios

Rules:
- Exactly 12 turns (6 each), alternating A-B-A-B...
- Each turn 80-120 words — conversational, energetic, no lecture-style blocks
- ${names.A} opens by diving right into the most surprising or counterintuitive aspect of the topic
- No generic intros like "Welcome to the show" or "Today we're talking about X"
- End with ${names.B} giving a practical takeaway
- All content in ${language}

Return JSON only:
{
  "turns": [
    { "speaker": "A", "name": "${names.A}", "text": "..." },
    { "speaker": "B", "name": "${names.B}", "text": "..." }
  ]
}`

  const res = await deepseekV3.chat.completions.create({
    model: MODELS.V3,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.75,
    max_tokens: 2500,
    response_format: { type: 'json_object' },
  })

  const raw = res.choices[0].message.content ?? '{}'
  const parsed = JSON.parse(raw) as { turns: PodcastTurn[] }
  return parsed.turns ?? []
}

async function synthesizeTurn(text: string, voiceId: string, apiKey: string): Promise<Buffer> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: text.slice(0, 2500),
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 200)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  const unitId = req.nextUrl.searchParams.get('unitId')
  const topic = req.nextUrl.searchParams.get('topic') ?? ''
  if (!sessionId || !unitId) {
    return NextResponse.json({ error: 'sessionId and unitId required' }, { status: 400 })
  }
  const slug = topicSlug(topic)
  const cached = await redis.get(dialogueCacheKey(sessionId, unitId, slug))
  if (!cached) return NextResponse.json({ dialogue: null })
  try {
    return NextResponse.json({ dialogue: JSON.parse(cached) as PodcastTurn[] })
  } catch {
    return NextResponse.json({ dialogue: null })
  }
}

export async function POST(req: NextRequest) {
  const { sessionId, unitId, topic = '' } = (await req.json()) as {
    sessionId: string
    unitId: string
    topic?: string
  }

  if (!sessionId || !unitId) {
    return NextResponse.json({ error: 'sessionId and unitId required' }, { status: 400 })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 503 })
  }

  const slug = topicSlug(topic)
  const cacheKey = dialogueCacheKey(sessionId, unitId, slug)

  // Check cached dialogue script
  let dialogue: PodcastTurn[] | null = null
  const cached = await redis.get(cacheKey)
  if (cached) {
    try { dialogue = JSON.parse(cached) } catch {}
  }

  // Generate dialogue if not cached
  if (!dialogue || dialogue.length === 0) {
    const [profile, unitContent, roadmap] = await Promise.all([
      getProfile(sessionId),
      getUnitContent(sessionId, unitId, topic),
      getRoadmap(sessionId, topic),
    ])

    if (!unitContent) {
      return NextResponse.json({ error: 'Unit content not found — generate content first' }, { status: 404 })
    }

    const unit = roadmap?.units.find(u => u.id === unitId)
    const lang = profile?.language === 'pt-BR' ? 'Brazilian Portuguese' : 'English'

    dialogue = await generateDialogue(
      unit?.title ?? unitContent.unitId,
      unit?.description ?? '',
      unitContent.explanation,
      unitContent.keyPoints,
      lang,
    )

    await redis.set(cacheKey, JSON.stringify(dialogue), 'EX', 60 * 60 * 24 * 7)
  }

  // Synthesize each turn sequentially (ElevenLabs rate limits)
  const segments: Buffer[] = []
  for (const turn of dialogue) {
    const voiceId = turn.speaker === 'A' ? VOICE_HOST_A : VOICE_HOST_B
    try {
      const buf = await synthesizeTurn(turn.text, voiceId, apiKey)
      segments.push(buf)
    } catch (err) {
      console.error(`[podcast] synthesis failed for turn ${turn.speaker}:`, err)
      return NextResponse.json({ error: 'Voice synthesis failed' }, { status: 502 })
    }
  }

  const combined = Buffer.concat(segments)
  return new Response(combined, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(combined.length),
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
