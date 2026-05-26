import { NextRequest, NextResponse } from 'next/server'
import { scoreQuizAnswers, classifyBaselineLevel, determineDNAType } from '@/lib/engine/scoring'
import { getProfile, updateProfile } from '@/lib/engine/progress'
import type { QuizAnswer, QuizQuestion } from '@/types/learner'

export async function POST(req: NextRequest) {
  const { sessionId, answers, questions } = await req.json() as {
    sessionId: string
    answers: QuizAnswer[]
    questions: QuizQuestion[]
  }

  const profile = await getProfile(sessionId)
  if (!profile) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const score = scoreQuizAnswers(answers, questions)
  const newLevel = classifyBaselineLevel(score)
  const dnaType = determineDNAType({
    learningStyle: profile.learningStyle,
    rhythm: profile.rhythm,
    challengeLevel: profile.challengeLevel,
    backgroundLevel: newLevel,
  })

  await updateProfile(sessionId, {
    baselineScore: score,
    backgroundLevel: newLevel,
    dnaType,
    stage: 'persona_selection',
  })

  return NextResponse.json({ score, backgroundLevel: newLevel, dnaType })
}
