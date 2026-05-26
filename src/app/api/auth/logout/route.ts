import { NextRequest, NextResponse } from 'next/server'
import { deleteAuthToken, COOKIE_NAME, cookieOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (token) await deleteAuthToken(token)

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, '', { ...cookieOptions(0), maxAge: 0 })
  return res
}
