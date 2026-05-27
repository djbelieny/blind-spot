export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getProfile, updateProfile } from '@/lib/engine/progress'
import type { LearnerProfile } from '@/types/learner'

export async function POST(req: NextRequest) {
  const { sessionId, answers } = await req.json()
  if (!sessionId || !answers) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const profile = await getProfile(sessionId)
  if (!profile) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const patch: Partial<LearnerProfile> = {}

  if (answers.outcome) {
    const map: Record<string, LearnerProfile['motivationType']> = {
      assignment: 'academic',
      test: 'survival',
      understand: 'curiosity',
      foundations: 'academic',
      practice: 'curiosity',
      unsure: 'curiosity',
    }
    patch.motivationType = map[answers.outcome] ?? profile.motivationType
  }

  if (answers.level) {
    const map: Record<string, LearnerProfile['backgroundLevel']> = {
      middle: 'novice',
      high: 'novice',
      college: 'intermediate',
      professional: 'expert',
      self: 'intermediate',
    }
    patch.backgroundLevel = map[answers.level] ?? profile.backgroundLevel
  }

  if (answers.urgency) {
    const map: Record<string, LearnerProfile['urgency']> = {
      today: 'immediate',
      week: 'medium-term',
      norush: 'exploratory',
    }
    patch.urgency = map[answers.urgency] ?? profile.urgency
  }

  if (answers.minutesPerDay) {
    patch.minutesPerDay = Number(answers.minutesPerDay)
  }

  if (answers.learningStyle) {
    patch.learningStyle = answers.learningStyle
  }

  if (answers.persona) {
    patch.persona = answers.persona
  }

  if (answers.obstacle) {
    patch.obstacle = answers.obstacle
  }

  const updated = await updateProfile(sessionId, patch)
  return NextResponse.json({ ok: true, profile: updated })
}
