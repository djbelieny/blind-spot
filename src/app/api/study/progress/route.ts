import { NextRequest, NextResponse } from 'next/server'
import { markNodeComplete, getProfile } from '@/lib/engine/progress'

export async function POST(req: NextRequest) {
  const { sessionId, courseId, checkpointScore } = (await req.json()) as {
    sessionId: string
    courseId: string
    checkpointScore?: number
  }

  await markNodeComplete(sessionId, courseId, checkpointScore)
  const profile = await getProfile(sessionId)
  const nextCourseId = profile?.recommendedCourseIds.find(id => id !== courseId) ?? null
  return NextResponse.json({ updated: true, nextCourseId })
}
