import { NextRequest, NextResponse } from 'next/server'
import { loginCEFISUser, getMeWithToken, getTracksWithToken } from '@/lib/cefis'
import { getProfile, updateProfile, getProgress, saveTrackProgress } from '@/lib/engine/progress'
import { getUserFromToken, updateUser, COOKIE_NAME } from '@/lib/auth'
import type { TrackProgress } from '@/types/learner'

export async function POST(req: NextRequest) {
  const { sessionId, email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Resolve auth user from cookie
  const authToken = req.cookies.get(COOKIE_NAME)?.value
  const authUser = authToken ? await getUserFromToken(authToken) : null

  // Resolve session profile (optional — sessionId may not be provided from dashboard)
  const profile = sessionId ? await getProfile(sessionId) : null

  let cefisToken: string
  try {
    cefisToken = await loginCEFISUser(email, password)
  } catch {
    return NextResponse.json({ error: 'Invalid CEFIS credentials' }, { status: 401 })
  }

  let cefisUser: any = {}
  let tracks: any[] = []

  try {
    cefisUser = await getMeWithToken(cefisToken)
  } catch {
    // non-fatal — proceed without user data
  }

  try {
    const tracksData = await getTracksWithToken(cefisToken)
    tracks = tracksData.tracks ?? tracksData.data ?? tracksData ?? []
    if (!Array.isArray(tracks)) tracks = []
  } catch {
    tracks = []
  }

  const cefisName = cefisUser.name ?? cefisUser.firstName ?? undefined
  const cefisUserId = cefisUser.id ?? cefisUser.userId ?? undefined
  const cefisTrackIds = tracks.map((t: any) => t.id ?? t._id).filter(Boolean)

  // Persist CEFIS data to User account (survives across sessions)
  if (authUser) {
    await updateUser(authUser.id, { cefisToken, cefisEmail: email, cefisName, cefisTrackIds })
  }

  // Persist CEFIS data to current LearnerProfile session
  if (profile && sessionId) {
    await updateProfile(sessionId, {
      cefisToken,
      cefisUserId,
      cefisName,
      cefisEmail: email,
      cefisTrackIds,
    })
  }

  // Initialize pillar data per track
  const progress = sessionId ? await getProgress(sessionId) : null
  if (progress && sessionId) {
    const existingTrackIds = new Set((progress.trackProgress ?? []).map(t => t.trackId))
    const newTracks: TrackProgress[] = tracks
      .filter((t: any) => !existingTrackIds.has(t.id ?? t._id))
      .map((t: any) => ({
        trackId: t.id ?? t._id,
        trackName: t.title ?? t.name ?? 'Track',
        pillars: { comprehension: 0, application: 0, analysis: 0, synthesis: 0, speed: 0, retention: 0, consistency: 0, precision: 0 },
        lastUpdatedAt: new Date().toISOString(),
        totalSessionsCompleted: 0,
        coursesCompleted: [],
      }))
    if (newTracks.length > 0) {
      await saveTrackProgress(sessionId, [...(progress.trackProgress ?? []), ...newTracks])
    }
  }

  return NextResponse.json({
    ok: true,
    name: cefisName ?? email.split('@')[0],
    trackCount: tracks.length,
  })
}
