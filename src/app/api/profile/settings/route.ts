import { NextRequest, NextResponse } from 'next/server'
import { getProfile, updateProfile } from '@/lib/engine/progress'
import { getUserFromToken, updateUser, COOKIE_NAME } from '@/lib/auth'
import type { Language } from '@/types/learner'

export async function PATCH(req: NextRequest) {
  const { sessionId, language } = await req.json() as { sessionId?: string; language?: Language }

  // Validate language value
  if (language && language !== 'en' && language !== 'pt-BR') {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
  }

  // Update LearnerProfile for the given session
  if (sessionId && language) {
    const profile = await getProfile(sessionId)
    if (profile) {
      await updateProfile(sessionId, { language })
    }
  }

  // Also persist to User account so it applies to all future sessions
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (token && language) {
    const user = await getUserFromToken(token)
    if (user) {
      await updateUser(user.id, { preferredLanguage: language })
    }
  }

  return NextResponse.json({ ok: true })
}
