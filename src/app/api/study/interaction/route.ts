import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { getProgress, saveTopic } from '@/lib/engine/progress'
import type { LearnerPillars } from '@/types/learner'

type InteractionType = 'read' | 'cards' | 'quiz' | 'listen' | 'watch'

// How much each interaction type nudges each pillar (before score scaling)
const PILLAR_NUDGES: Record<InteractionType, Partial<Record<keyof LearnerPillars, number>>> = {
  read:   { comprehension: 6, retention: 4 },
  cards:  { retention: 10, precision: 6 },
  quiz:   { comprehension: 10, analysis: 10, precision: 8, application: 6 }, // scaled by score/100
  listen: { comprehension: 5, consistency: 8 },
  watch:  { comprehension: 5, synthesis: 8 },
}

const PROGRESS_KEY = (id: string) => `progress:${id}`
const PROFILE_TTL  = 60 * 60 * 24 * 7

export async function POST(req: NextRequest) {
  const {
    sessionId,
    unitId,
    topicId,
    interactionType,
    score,
    minutesSpent = 2,
  } = (await req.json()) as {
    sessionId: string
    unitId: string
    topicId?: string
    interactionType: InteractionType
    score?: number       // 0-100, used for quiz
    minutesSpent?: number
  }

  if (!sessionId || !unitId || !interactionType) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  }

  const progress = await getProgress(sessionId)
  if (!progress) return NextResponse.json({ error: 'no progress' }, { status: 404 })

  // Find the topic to update (prefer exact match, fall back to first)
  const topics = progress.topics ?? []
  const topic = (topicId ? topics.find(t => t.id === topicId) : null) ?? topics[0] ?? null

  if (topic) {
    const nudges = PILLAR_NUDGES[interactionType] ?? {}
    // Quiz scales by score; all others apply fully
    const scale = interactionType === 'quiz' ? (score ?? 50) / 100 : 1

    for (const [key, amount] of Object.entries(nudges)) {
      const k = key as keyof LearnerPillars
      topic.pillars[k] = Math.min(100, Math.round(topic.pillars[k] + amount * scale))
    }
    topic.lastStudiedAt = new Date().toISOString()
    await saveTopic(sessionId, topic)
  }

  // Track which interaction types have been fired for this unit (for de-duplication outside)
  const interactionKey = `interactions:${sessionId}:${unitId}`
  await redis.sadd(interactionKey, interactionType)
  await redis.expire(interactionKey, 60 * 60 * 24 * 30)

  // Mark node as in-progress (add to completedCourseIds once all 4 content types done)
  const viewedTypes = await redis.smembers(interactionKey)
  const contentTypes: InteractionType[] = ['read', 'cards', 'listen', 'watch']
  const allContentConsumed = contentTypes.every(t => viewedTypes.includes(t))

  if (allContentConsumed && !progress.completedCourseIds.includes(unitId)) {
    progress.completedCourseIds.push(unitId)
  }

  // Persist minutes + timestamp
  progress.totalMinutesStudied = (progress.totalMinutesStudied ?? 0) + minutesSpent
  progress.lastStudiedAt = new Date()

  await redis.set(PROGRESS_KEY(sessionId), JSON.stringify(progress), 'EX', PROFILE_TTL)

  return NextResponse.json({
    pillars: topic?.pillars ?? null,
    completedCourseIds: progress.completedCourseIds,
    totalMinutesStudied: progress.totalMinutesStudied,
    viewedTypes,
  })
}
