import { NextRequest, NextResponse } from 'next/server'
import { getProfile, getTrackProgress } from '@/lib/engine/progress'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })

  const [profile, tracks] = await Promise.all([
    getProfile(sessionId),
    getTrackProgress(sessionId),
  ])

  if (!profile) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  return NextResponse.json({
    name: profile.cefisName,
    email: profile.cefisEmail,
    objective: profile.objective,
    language: profile.language,
    dnaType: profile.dnaType,
    tracks,
  })
}
