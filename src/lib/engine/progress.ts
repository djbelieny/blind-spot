import redis from '@/lib/redis'
import type { LearnerProfile, LearnerProgress, LearnerPillars, TrackProgress, StudyTopic } from '@/types/learner'

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
    trackProgress: [],
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

function emptyPillars(): LearnerPillars {
  return { comprehension: 0, application: 0, analysis: 0, synthesis: 0, speed: 0, retention: 0, consistency: 0, precision: 0 }
}

export async function saveTrackProgress(sessionId: string, tracks: TrackProgress[]): Promise<void> {
  const progress = await getProgress(sessionId)
  if (!progress) return
  progress.trackProgress = tracks
  await redis.set(progressKey(sessionId), JSON.stringify(progress), 'EX', PROFILE_TTL)
}

export async function getTrackProgress(sessionId: string): Promise<TrackProgress[]> {
  const progress = await getProgress(sessionId)
  return progress?.trackProgress ?? []
}

export async function updatePillarsFromCheckpoint(
  sessionId: string,
  trackId: string,
  scores: Partial<LearnerPillars>
): Promise<void> {
  const progress = await getProgress(sessionId)
  if (!progress) return
  const tp = progress.trackProgress.find(t => t.trackId === trackId)
  if (!tp) return
  for (const [k, v] of Object.entries(scores)) {
    const key = k as keyof LearnerPillars
    tp.pillars[key] = Math.min(100, Math.max(0, v as number))
  }
  tp.lastUpdatedAt = new Date().toISOString()
  tp.totalSessionsCompleted += 1
  await redis.set(progressKey(sessionId), JSON.stringify(progress), 'EX', PROFILE_TTL)
}

export async function getTopics(sessionId: string): Promise<StudyTopic[]> {
  const progress = await getProgress(sessionId)
  return progress?.topics ?? []
}

export async function saveTopic(sessionId: string, topic: StudyTopic): Promise<void> {
  const progress = await getProgress(sessionId)
  if (!progress) return
  const topics = progress.topics ?? []
  const idx = topics.findIndex(t => t.id === topic.id)
  if (idx >= 0) {
    topics[idx] = topic
  } else {
    topics.push(topic)
  }
  progress.topics = topics
  await redis.set(progressKey(sessionId), JSON.stringify(progress), 'EX', PROFILE_TTL)
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
      trackProgress: [],
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
