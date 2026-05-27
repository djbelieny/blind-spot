export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'

const VOICE_IDS: Record<string, string> = {
  direto: process.env.ELEVENLABS_VOICE_DIRETO ?? 'pNInz6obpgDQGcFmaJgB',
  encorajador: process.env.ELEVENLABS_VOICE_ENCORAJADOR ?? 'EXAVITQu4vr4xnSDxMaL',
  socratico: process.env.ELEVENLABS_VOICE_SOCRATICO ?? 'VR6AewLTigWG4xSOukaG',
}

export async function POST(req: NextRequest) {
  const { text, persona = 'encorajador' } = (await req.json()) as {
    text: string
    persona?: string
  }

  const voiceId = VOICE_IDS[persona] ?? VOICE_IDS['encorajador']
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    return new Response('ElevenLabs API key not configured', { status: 503 })
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text.slice(0, 500),
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  )

  if (!res.ok) return new Response('TTS failed', { status: res.status })

  return new Response(res.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
    },
  })
}
