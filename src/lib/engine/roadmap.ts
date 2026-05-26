import redis from '@/lib/redis'
import type { Roadmap, UnitContent } from '@/types/roadmap'

const ROADMAP_TTL = 60 * 60 * 24 * 30  // 30 days
const CONTENT_TTL = 60 * 60 * 24 * 7   // 7 days

function roadmapKey(sessionId: string): string {
  return `roadmap:${sessionId}`
}

function unitContentKey(sessionId: string, unitId: string): string {
  return `unit_content:${sessionId}:${unitId}`
}

export async function getRoadmap(sessionId: string): Promise<Roadmap | null> {
  const raw = await redis.get(roadmapKey(sessionId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as Roadmap
  } catch {
    return null
  }
}

export async function saveRoadmap(roadmap: Roadmap): Promise<void> {
  await redis.set(roadmapKey(roadmap.sessionId), JSON.stringify(roadmap), 'EX', ROADMAP_TTL)
}

export async function getUnitContent(sessionId: string, unitId: string): Promise<UnitContent | null> {
  const raw = await redis.get(unitContentKey(sessionId, unitId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as UnitContent
  } catch {
    return null
  }
}

export async function saveUnitContent(sessionId: string, content: UnitContent): Promise<void> {
  await redis.set(unitContentKey(sessionId, content.unitId), JSON.stringify(content), 'EX', CONTENT_TTL)
}
