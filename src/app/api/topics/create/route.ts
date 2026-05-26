import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getProfile } from '@/lib/engine/progress'
import { saveTopic } from '@/lib/engine/progress'
import { analyzeGaps } from '@/lib/ai/gapanalysis'
import { searchCourses, buildSearchIndex } from '@/lib/engine/catalog'
import { getAllCourses } from '@/lib/cefis'
import type { StudyTopic, LearnerPillars } from '@/types/learner'

function emptyPillars(): LearnerPillars {
  return { comprehension: 5, application: 5, analysis: 5, synthesis: 5, speed: 5, retention: 5, consistency: 5, precision: 5 }
}

export async function POST(req: NextRequest) {
  const { sessionId, topicName, quizResults } = await req.json()
  if (!sessionId || !topicName) {
    return NextResponse.json({ error: 'Missing sessionId or topicName' }, { status: 400 })
  }

  const profile = await getProfile(sessionId)
  if (!profile) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  // Override objective with the specific topic for gap analysis
  const topicProfile = { ...profile, objective: topicName }

  let relevantCourses: Awaited<ReturnType<typeof searchCourses>> = []
  try {
    const allCourses = await getAllCourses()
    const index = buildSearchIndex(allCourses as Parameters<typeof buildSearchIndex>[0])
    relevantCourses = searchCourses(topicName, index, 15)
  } catch {
    // non-fatal — gap analysis still runs without courses
  }

  const normalizedResults = (quizResults ?? []) as Array<{
    questionId: string; correct: boolean; conceptTag: string; timeToAnswerMs: number
  }>

  const blindSpots = await analyzeGaps(topicProfile, normalizedResults, relevantCourses).catch(() => [])

  const topic: StudyTopic = {
    id: randomUUID(),
    name: topicName,
    blindSpots: blindSpots.slice(0, 3),
    pillars: emptyPillars(),
    createdAt: new Date().toISOString(),
  }

  await saveTopic(sessionId, topic)

  return NextResponse.json({ topic })
}
