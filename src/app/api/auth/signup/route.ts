export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createUser, createAuthToken, COOKIE_NAME, cookieOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  let user
  try {
    user = await createUser(email.trim().toLowerCase(), password, name?.trim() || undefined)
  } catch (e: any) {
    if (e.message === 'Email already registered') {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Could not create account' }, { status: 500 })
  }

  const token = await createAuthToken(user.id)
  const res = NextResponse.json({ ok: true, userId: user.id, name: user.name })
  res.cookies.set(COOKIE_NAME, token, cookieOptions())
  return res
}
