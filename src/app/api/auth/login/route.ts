import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail, verifyPassword, createAuthToken, COOKIE_NAME, cookieOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const user = await getUserByEmail(email.trim().toLowerCase())
  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const token = await createAuthToken(user.id)
  const res = NextResponse.json({ ok: true, userId: user.id, name: user.name })
  res.cookies.set(COOKIE_NAME, token, cookieOptions())
  return res
}
