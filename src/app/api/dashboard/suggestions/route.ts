export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getProfile } from '@/lib/engine/progress'
import { deepseekV3, MODELS } from '@/lib/ai/clients'
import { logCost, calcDeepseekCost } from '@/lib/costs'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ suggestions: [] })

  const profile = await getProfile(sessionId)
  if (!profile) return NextResponse.json({ suggestions: [] })

  const topBlindSpot = profile.blindSpotsIdentified?.[0]
  const lang = profile.language

  const prompt = lang === 'pt-BR'
    ? `Você é um tutor. Dado o perfil do aluno abaixo, gere 3 sugestões de aprendizado curtas (máximo 7 palavras cada) para começar uma sessão de estudo hoje.

Perfil:
- Objetivo: ${profile.objective}
- Nível: ${profile.backgroundLevel}
- Blind spot principal: ${topBlindSpot?.name ?? 'não identificado'}
- Impacto do blind spot: ${topBlindSpot?.impact ?? ''}

Responda APENAS com um JSON: { "suggestions": ["sugestão 1", "sugestão 2", "sugestão 3"] }
Sem explicações. Sem markdown.`
    : `You are a tutor. Given the student profile below, generate 3 short learning prompts (max 7 words each) for starting a study session today.

Profile:
- Objective: ${profile.objective}
- Level: ${profile.backgroundLevel}
- Top blind spot: ${topBlindSpot?.name ?? 'not identified'}
- Blind spot impact: ${topBlindSpot?.impact ?? ''}

Respond ONLY with JSON: { "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"] }
No explanations. No markdown.`

  try {
    const res = await deepseekV3.chat.completions.create({
      model: MODELS.V3,
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    })
    if (res.usage) logCost({ type: 'deepseek_chat', model: MODELS.V3, endpoint: '/api/dashboard/suggestions', sessionId: sessionId ?? undefined, inputTokens: res.usage.prompt_tokens, outputTokens: res.usage.completion_tokens, cost: calcDeepseekCost(res.usage.prompt_tokens, res.usage.completion_tokens) })
    const content = res.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(content)
    const suggestions: string[] = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : []
    return NextResponse.json({ suggestions })
  } catch {
    return NextResponse.json({ suggestions: [] })
  }
}
