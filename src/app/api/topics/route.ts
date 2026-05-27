export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getTopics, saveTopic, getProfile } from '@/lib/engine/progress'
import type { StudyTopic, LearnerPillars, LearnerProfile } from '@/types/learner'

function deriveProfilePillars(profile: LearnerProfile): LearnerPillars {
  const base = Math.max(5, profile.baselineScore ?? 20)
  return {
    comprehension: base,
    application:   profile.learningStyle === 'practice' ? Math.min(100, base + 15) : Math.max(5, base - 10),
    analysis:      profile.backgroundLevel === 'expert' ? 65 : profile.backgroundLevel === 'intermediate' ? 45 : 25,
    synthesis:     Math.max(5, base - 20),
    speed:         profile.urgency === 'immediate' ? 55 : 35,
    retention:     profile.rhythm === 'deep-dive' ? 50 : 35,
    consistency:   10,
    precision:     Math.max(5, base - 25),
  }
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ topics: [] })

  let topics = await getTopics(sessionId)

  // Auto-persist initial topic from onboarding profile so it's never lost
  if (topics.length === 0) {
    const profile = await getProfile(sessionId)
    if (profile && (profile.blindSpotsIdentified?.length ?? 0) > 0) {
      const createdAt = profile.createdAt instanceof Date
        ? profile.createdAt.toISOString()
        : String(profile.createdAt)
      const initialTopic: StudyTopic = {
        id: randomUUID(),
        name: profile.objective,
        blindSpots: profile.blindSpotsIdentified.slice(0, 3),
        pillars: deriveProfilePillars(profile),
        createdAt,
      }
      await saveTopic(sessionId, initialTopic)
      topics = [initialTopic]
    }
  }

  return NextResponse.json({ topics })
}
