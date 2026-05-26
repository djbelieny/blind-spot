import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken, COOKIE_NAME } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    cefisName: user.cefisName,
    cefisEmail: user.cefisEmail,
    cefisTrackIds: user.cefisTrackIds,
    sessionIds: user.sessionIds,
  })
}
