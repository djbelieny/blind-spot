import { NextRequest, NextResponse } from 'next/server'
import { getProfile } from '@/lib/engine/progress'
import { deepseekV3, MODELS } from '@/lib/ai/clients'
import type { ContentCard, DNAType } from '@/types/learner'

const DNA_CARD_WEIGHTS: Record<DNAType, string> = {
  absorvedor: 'Prioritize 2 video cards, 1 text card, 1 audio card. The student learns by seeing and hearing.',
  explorador:  'Prioritize 2 exercise cards, 1 text card, 1 video card. The student learns by doing.',
  construtor:  'Prioritize 2 structured text cards, 1 exercise card, 1 audio card. The student needs step-by-step structure.',
  conector:    'Prioritize 2 conceptual text cards (connect this to what they know), 1 exercise, 1 video. The student needs context.',
  sprint:      'Prioritize short content: 1 text card (key facts only, ≤60 words), 1 video (short), 1 audio (30-second explainer), 1 exercise.',
}

export async function POST(req: NextRequest) {
  const { sessionId, topic, context } = await req.json()
  if (!sessionId || !topic) return NextResponse.json({ cards: [] })

  const profile = await getProfile(sessionId)
  if (!profile) return NextResponse.json({ cards: [] })

  const dnaType = (profile.dnaType ?? 'explorador') as DNAType
  const dnaGuidance = DNA_CARD_WEIGHTS[dnaType]
  const lang = profile.language === 'pt-BR' ? 'Brazilian Portuguese' : 'English'
  const contextSnippet = context ? `\nRecent conversation context: ${context.slice(0, 400)}` : ''

  const langRule = profile.language === 'en'
    ? '⚠️ CRITICAL: Write ALL card text (title, body, audioScript, exercisePrompt) in English ONLY. Not a single word in Portuguese.'
    : '⚠️ CRÍTICO: Escreva TODO o texto dos cards (title, body, audioScript, exercisePrompt) em português brasileiro APENAS. Nenhuma palavra em inglês.'

  const prompt = `You are generating multimodal learning content cards for a student.

${langRule}

Student DNA type: ${dnaType}
Topic: ${topic}
Language: ${lang}
Student background: ${profile.backgroundLevel}
${contextSnippet}

Card type guidance for this DNA:
${dnaGuidance}

Generate exactly 4 learning cards. Return a JSON array only — no markdown, no explanation.

Card schema:
- id: "c1" | "c2" | "c3" | "c4"
- type: "text" | "video" | "audio" | "exercise"
- title: short card title (max 8 words)
- duration: "2 min read" | "5 min video" | "1 min listen" | "3 min exercise"
- tag: a concept tag in kebab-case

For "text" cards also include:
- body: 80-120 words of clear, educational content on the topic in ${lang}

For "video" cards also include:
- searchQuery: a specific YouTube search query to find a great explainer video on this concept

For "audio" cards also include:
- audioScript: 60-80 words of natural spoken explanation in ${lang} (will be read aloud by TTS)

For "exercise" cards also include:
- exercisePrompt: a short, concrete practice prompt the student can try (will be sent to their tutor)

Return ONLY a valid JSON array.`

  const res = await deepseekV3.chat.completions.create({
    model: MODELS.V3,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  })

  const raw = res.choices[0].message.content ?? '{"cards":[]}'
  try {
    const parsed = JSON.parse(raw)
    const cards: ContentCard[] = Array.isArray(parsed) ? parsed : (parsed.cards ?? [])
    return NextResponse.json({ cards: cards.slice(0, 4) })
  } catch {
    return NextResponse.json({ cards: [] })
  }
}
