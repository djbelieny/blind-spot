export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { generateDomainQuestions } from '@/lib/ai/quiz'
import { getProfile, updateProfile } from '@/lib/engine/progress'

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json()
  const profile = await getProfile(sessionId)
  if (!profile) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const questions = await generateDomainQuestions(
    profile.objective,
    (profile as unknown as Record<string, unknown>)['domain'] as string ?? profile.objective,
    profile.backgroundLevel,
    profile.language
  )

  await updateProfile(sessionId, { stage: 'quiz' })
  return NextResponse.json({ questions })
}
