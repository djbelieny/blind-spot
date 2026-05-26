import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import redis from '@/lib/redis'

const USER_TTL = 60 * 60 * 24 * 30  // 30 days
const TOKEN_TTL = 60 * 60 * 24 * 7  // 7 days

export interface User {
  id: string
  email: string
  passwordHash: string
  name?: string
  createdAt: string
  preferredLanguage?: 'en' | 'pt-BR'
  cefisToken?: string
  cefisEmail?: string
  cefisName?: string
  cefisTrackIds?: string[]
  sessionIds: string[]
}

function userKey(userId: string) { return `user:${userId}` }
function emailIdxKey(email: string) { return `useridx:email:${email.toLowerCase()}` }
function tokenKey(token: string) { return `authtoken:${token}` }

export async function createUser(email: string, password: string, name?: string): Promise<User> {
  const existing = await getUserByEmail(email)
  if (existing) throw new Error('Email already registered')

  const id = randomUUID()
  const passwordHash = await bcrypt.hash(password, 10)
  const user: User = {
    id,
    email: email.toLowerCase(),
    passwordHash,
    name,
    createdAt: new Date().toISOString(),
    sessionIds: [],
  }

  await redis.set(userKey(id), JSON.stringify(user), 'EX', USER_TTL)
  await redis.set(emailIdxKey(email), id, 'EX', USER_TTL)
  return user
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const userId = await redis.get(emailIdxKey(email))
  if (!userId) return null
  return getUserById(userId)
}

export async function getUserById(id: string): Promise<User | null> {
  const raw = await redis.get(userKey(id))
  if (!raw) return null
  try { return JSON.parse(raw) as User } catch { return null }
}

export async function updateUser(id: string, patch: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
  const user = await getUserById(id)
  if (!user) return null
  const updated = { ...user, ...patch }
  await redis.set(userKey(id), JSON.stringify(updated), 'EX', USER_TTL)
  return updated
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export async function createAuthToken(userId: string): Promise<string> {
  const token = randomUUID()
  await redis.set(tokenKey(token), userId, 'EX', TOKEN_TTL)
  return token
}

export async function getUserFromToken(token: string): Promise<User | null> {
  if (!token) return null
  const userId = await redis.get(tokenKey(token))
  if (!userId) return null
  return getUserById(userId)
}

export async function deleteAuthToken(token: string): Promise<void> {
  await redis.del(tokenKey(token))
}

export async function addSessionToUser(userId: string, sessionId: string): Promise<void> {
  const user = await getUserById(userId)
  if (!user) return
  if (!user.sessionIds.includes(sessionId)) {
    user.sessionIds = [sessionId, ...user.sessionIds].slice(0, 20)
    await redis.set(userKey(userId), JSON.stringify(user), 'EX', USER_TTL)
  }
}

export const COOKIE_NAME = 'blind_spot_auth'

export function cookieOptions(maxAge = TOKEN_TTL) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  }
}
