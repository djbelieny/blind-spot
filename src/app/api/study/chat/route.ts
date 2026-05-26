import { NextRequest } from 'next/server'
import { getProfile } from '@/lib/engine/progress'
import { searchSimilar } from '@/lib/engine/rag'
import { synthesizeAnswer } from '@/lib/ai/ragsynth'
import { streamTutorResponse } from '@/lib/ai/tutorchat'

export async function POST(req: NextRequest) {
  const { sessionId, messages } = (await req.json()) as {
    sessionId: string
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  }

  const profile = await getProfile(sessionId)
  if (!profile) return new Response('Session not found', { status: 404 })

  const lastUserMsg =
    [...messages].reverse().find(m => m.role === 'user')?.content ?? ''

  // RAG: search for relevant transcript chunks (gracefully skipped if unavailable)
  let ragContext = ''
  try {
    const chunks = await searchSimilar(lastUserMsg, 3)
    if (chunks.length > 0) {
      const ragAnswer = await synthesizeAnswer(lastUserMsg, chunks, profile)
      ragContext = `\n\n[COURSE CONTENT CONTEXT]: ${ragAnswer}`
    }
  } catch {
    // RAG is optional — continue without it
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
    },
  })
}
