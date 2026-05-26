import redis from '@/lib/redis'
import type { LearnerProfile, LearnerProgress } from '@/types/learner'

const PROFILE_TTL = 60 * 60 * 24 * 7 // 7 days

function profileKey(sessionId: string) {
  return `profile:${sessionId}`
}

function progressKey(sessionId: string) {
  return `progress:${sessionId}`
}

export async function saveProfile(profile: LearnerProfile): Promise<void> {
  const key = profileKey(profile.sessionId)
  await redis.set(key, JSON.stringify(profile), 'EX', PROFILE_TTL)
}

export async function getProfile(sessionId: string): Promise<LearnerProfile | null> {
  const key = profileKey(sessionId)
  const raw = await redis.get(key)
  if (!raw) return null
  try {
    const profile = JSON.parse(raw) as LearnerProfile
    // Rehydrate Date fields
    profile.createdAt = new Date(profile.createdAt)
    profile.updatedAt = new Date(profile.updatedAt)
    return profile
  } catch {
    return null
  }
}

export async function updateProfile(
  sessionId: string,
  partial: Partial<LearnerProfile>
): Promise<LearnerProfile> {
  const existing = await getProfile(sessionId)
  if (!existing) {
    throw new Error(`Profile not found for session: ${sessionId}`)
  }
  const updated: LearnerProfile = {
    ...existing,
    ...partial,
    updatedAt: new Date(),
  }
  await saveProfile(updated)
  return updated
}

export async function initProgress(sessionId: string): Promise<void> {
  const key = progressKey(sessionId)
  const progress: LearnerProgress = {
    sessionId,
    completedCourseIds: [],
    checkpointScores: {},
    studyStreakDays: 0,
    totalMinutesStudied: 0,
  }
  await redis.set(key, JSON.stringify(progress), 'EX', PROFILE_TTL)
}

export async function getProgress(sessionId: string): Promise<LearnerProgress | null> {
  const key = progressKey(sessionId)
  const raw = await redis.get(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as LearnerProgress
  } catch {
    return null
  }
}

export async function markNodeComplete(
  sessionId: string,
  courseId: string,
  checkpointScore?: number
): Promise<void> {
  const key = progressKey(sessionId)
  const raw = await redis.get(key)
  let progress: LearnerProgress

  if (!raw) {
    progress = {
      sessionId,
      completedCourseIds: [],
      checkpointScores: {},
      studyStreakDays: 0,
      totalMinutesStudied: 0,
    }
  } else {
    progress = JSON.parse(raw) as LearnerProgress
  }

  if (!progress.completedCourseIds.includes(courseId)) {
    progress.completedCourseIds.push(courseId)
  }

  if (checkpointScore !== undefined) {
    progress.checkpointScores[courseId] = checkpointScore
  }

  progress.lastStudiedAt = new Date()

  await redis.set(key, JSON.stringify(progress), 'EX', PROFILE_TTL)
}
