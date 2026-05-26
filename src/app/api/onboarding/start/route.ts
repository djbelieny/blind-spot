import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { detectLanguage, analyzeComplexity, inferUrgency, inferMotivation } from '@/lib/engine/language'
import { inferProfileFromMessage } from '@/lib/ai/inference'
import { saveProfile, initProgress } from '@/lib/engine/progress'
import { getUserFromToken, addSessionToUser, COOKIE_NAME } from '@/lib/auth'
import type { LearnerProfile } from '@/types/learner'

export async function POST(req: NextRequest) {
  const { firstMessage } = await req.json()
  if (!firstMessage?.trim()) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 })
  }

  // Resolve user from auth cookie if present
  const token = req.cookies.get(COOKIE_NAME)?.value
  const authUser = token ? await getUserFromToken(token) : null

  const sessionId = randomUUID()
  const language = detectLanguage(firstMessage)
  const complexity = analyzeComplexity(firstMessage)
  const urgency = inferUrgency(firstMessage)
  const motivationType = inferMotivation(firstMessage)

  let inferred: Partial<LearnerProfile> & { domain?: string; objective?: string } = {}
  try {
    const result = await inferProfileFromMessage(firstMessage, language, complexity)
    inferred = result as typeof inferred
  } catch (e) {
    console.error('Inference failed:', e)
    inferred = { domain: firstMessage.slice(0, 80), objective: firstMessage }
  }

  const profile: LearnerProfile = {
    sessionId,
    userId: authUser?.id,
    language,
    communicationStyle: complexity.style,
    ageProxy: complexity.ageProxy,
    backgroundLevel: complexity.level,
    urgency,
    motivationType,
    objective: inferred.objective ?? firstMessage,
    minutesPerDay: 20,
    learningStyle: 'visual',
    rhythm: 'sprints',
    challengeLevel: 'comfortable',
    baselineScore: 0,
    blindSpotsIdentified: [],
    recommendedCourseIds: [],
    stage: 'connection_chat',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...inferred,
  }

  await saveProfile(profile)
  await initProgress(sessionId)

  // Link session to user account
  if (authUser) {
    await addSessionToUser(authUser.id, sessionId)
  }

  return NextResponse.json({ sessionId, language, stage: 'connection_chat' })
}
