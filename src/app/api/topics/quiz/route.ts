import { NextRequest, NextResponse } from 'next/server'
import { getProfile } from '@/lib/engine/progress'
import { generateDomainQuestions } from '@/lib/ai/quiz'

export async function POST(req: NextRequest) {
  const { sessionId, topicName } = await req.json()
  if (!sessionId || !topicName) {
    return NextResponse.json({ error: 'Missing sessionId or topicName' }, { status: 400 })
  }

  const profile = await getProfile(sessionId)
  if (!profile) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const questions = await generateDomainQuestions(
    topicName,
    topicName,
    profile.backgroundLevel,
    profile.language
  ).catch(() => [])

  return NextResponse.json({ questions })
}
