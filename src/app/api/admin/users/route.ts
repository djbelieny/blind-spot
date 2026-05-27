export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import type { User } from '@/lib/auth'

export type UserPublic = Omit<User, 'passwordHash' | 'cefisToken'>

function authError() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) return authError()

  const users: UserPublic[] = []
  let cursor = '0'

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'user:*', 'COUNT', 100)
    cursor = nextCursor

    if (keys.length > 0) {
      const pipeline = redis.pipeline()
      for (const key of keys) pipeline.get(key)
      const results = await pipeline.exec()

      if (results) {
        for (const [err, raw] of results) {
          if (err || !raw) continue
          try {
            const u = JSON.parse(raw as string) as User
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { passwordHash, cefisToken, ...pub } = u
            users.push(pub)
          } catch {
            // skip malformed entries
          }
        }
      }
    }
  } while (cursor !== '0')

  // Sort newest first
  users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return NextResponse.json({ users, total: users.length })
}
