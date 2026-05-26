import redis from '@/lib/redis'
import type { Roadmap, UnitContent } from '@/types/roadmap'

const ROADMAP_TTL = 60 * 60 * 24 * 30  // 30 days
const CONTENT_TTL = 60 * 60 * 24 * 7   // 7 days

function topicSlug(topic: string): string {
  return topic.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60)
}

function roadmapKey(sessionId: string, topic: string): string {
  return `roadmap:${sessionId}:${topicSlug(topic)}`
}

function unitContentKey(sessionId: string, topic: string, unitId: string): string {
  return `unit_content:${sessionId}:${topicSlug(topic)}:${unitId}`
}

export async function getRoadmap(sessionId: string, topic: string): Promise<Roadmap | null> {
  const raw = await redis.get(roadmapKey(sessionId, topic))
  if (!raw) return null
  try {
    return JSON.parse(raw) as Roadmap
  } catch {
    return null
  }
}

export async function saveRoadmap(roadmap: Roadmap, topic: string): Promise<void> {
  await redis.set(roadmapKey(roadmap.sessionId, topic), JSON.stringify(roadmap), 'EX', ROADMAP_TTL)
}

export async function getUnitContent(sessionId: string, unitId: string, topic: string): Promise<UnitContent | null> {
  const raw = await redis.get(unitContentKey(sessionId, topic, unitId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as UnitContent
  } catch {
    return null
  }
}

export async function saveUnitContent(sessionId: string, content: UnitContent, topic: string): Promise<void> {
  await redis.set(unitContentKey(sessionId, topic, content.unitId), JSON.stringify(content), 'EX', CONTENT_TTL)
}
