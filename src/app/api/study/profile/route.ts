import { NextRequest, NextResponse } from 'next/server'
import { getProfile } from '@/lib/engine/progress'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  const profile = await getProfile(sessionId)
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(profile)
}
