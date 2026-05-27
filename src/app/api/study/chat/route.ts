export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { getProfile } from '@/lib/engine/progress'
import { searchSimilar } from '@/lib/engine/rag'
import { synthesizeAnswer } from '@/lib/ai/ragsynth'
import { streamTutorResponse } from '@/lib/ai/tutorchat'

const RAG_SCORE_THRESHOLD = 0.65

export async function POST(req: NextRequest) {
  const { sessionId, messages } = (await req.json()) as {
    sessionId: string
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  }

  const profile = await getProfile(sessionId)
  if (!profile) return new Response('Session not found', { status: 404 })

  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''

  // Content routing: CEFIS RAG when user has token and relevant content exists
  let ragContext = ''
  let source: 'cefis' | 'general' = 'general'

  if (profile.cefisToken) {
    try {
      const chunks = await searchSimilar(lastUserMsg, 4, profile.recommendedCourseIds.length > 0 ? profile.recommendedCourseIds : undefined)
      const relevantChunks = chunks.filter((c: any) => (c.score ?? 1) >= RAG_SCORE_THRESHOLD)
      if (relevantChunks.length > 0) {
        const ragAnswer = await synthesizeAnswer(lastUserMsg, relevantChunks, profile)
        ragContext = `\n\n[COURSE CONTENT CONTEXT]: ${ragAnswer}`
        source = 'cefis'
      }
    } catch {
      // RAG unavailable — fall through to general
    }
  }

  const augmentedMessages = ragContext
    ? [
        ...messages.slice(0, -1),
        { role: 'user' as const, content: lastUserMsg + ragContext },
      ]
    : messages

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Emit source header as first line so client can read it
        if (source === 'cefis') {
          controller.enqueue(new TextEncoder().encode('\x00cefis\x00'))
        }
        for await (const chunk of streamTutorResponse({
          messages: augmentedMessages,
          profile,
          stage: 'dashboard',
        })) {
          controller.enqueue(new TextEncoder().encode(chunk))
        }
        controller.close()
      } catch (e) {
        controller.error(e)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Accel-Buffering': 'no',
      'X-Content-Source': source,
    },
  })
}
