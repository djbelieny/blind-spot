import { NextRequest } from 'next/server'
import { streamTutorResponse } from '@/lib/ai/tutorchat'
import { getProfile, updateProfile } from '@/lib/engine/progress'
import type { OnboardingStage } from '@/types/learner'

export async function POST(req: NextRequest) {
  const { sessionId, messages, stage } = await req.json()

  const profile = await getProfile(sessionId)
  if (!profile) {
    return new Response('Session not found', { status: 404 })
  }

  // Update stage if changed
  if (stage && stage !== profile.stage) {
    await updateProfile(sessionId, { stage: stage as OnboardingStage })
  }

  // Map 'tutor' role to 'assistant' for the AI client
  const mappedMessages = (messages as Array<{ role: string; content: string }>).map(m => ({
    role: m.role === 'tutor' ? 'assistant' : 'user',
    content: m.content,
  })) as Array<{ role: 'user' | 'assistant'; content: string }>

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamTutorResponse({
          messages: mappedMessages,
          profile,
          stage: (stage ?? profile.stage) as OnboardingStage,
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
      'Transfer-Encoding': 'chunked',
      'X-Accel-Buffering': 'no',
    },
  })
}
