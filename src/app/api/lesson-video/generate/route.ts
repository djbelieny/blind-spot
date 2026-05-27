export const dynamic = 'force-dynamic'
export const maxDuration = 10

import { NextRequest, NextResponse } from 'next/server'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import redis from '@/lib/redis'
import { getUnitContent, getRoadmap } from '@/lib/engine/roadmap'
import { getProfile } from '@/lib/engine/progress'
import { generateLessonVideo, calcVideoKey } from '@/lib/video/renderer'

interface VideoStatus {
  status: 'generating' | 'ready' | 'failed'
  videoUrl?: string
  posterUrl?: string
  error?: string
}

function redisKey(cacheKey: string): string {
  return `lesson_video:${cacheKey}`
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  const unitId = req.nextUrl.searchParams.get('unitId')
  const topic = req.nextUrl.searchParams.get('topic') ?? ''

  if (!sessionId || !unitId) {
    return NextResponse.json({ error: 'sessionId and unitId required' }, { status: 400 })
  }

  const cacheKey = calcVideoKey(sessionId, unitId, topic)
  const key = redisKey(cacheKey)

  const raw = await redis.get(key)
  let statusData: VideoStatus | null = null
  if (raw) {
    try { statusData = JSON.parse(raw) as VideoStatus } catch {}
  }

  // Check if the file physically exists
  const videoFilePath = resolve(process.cwd(), 'public/generated/lesson-videos', `${cacheKey}.mp4`)
  const fileExists = existsSync(videoFilePath)

  // Reconcile: if file exists but Redis says generating, correct to ready
  if (fileExists && statusData?.status === 'generating') {
    const corrected: VideoStatus = {
      status: 'ready',
      videoUrl: `/generated/lesson-videos/${cacheKey}.mp4`,
      posterUrl: `/generated/lesson-videos/${cacheKey}-poster.png`,
    }
    await redis.set(key, JSON.stringify(corrected), 'EX', 60 * 60 * 24 * 7)
    statusData = corrected
  }

  if (!statusData) {
    return NextResponse.json({
      status: 'missing',
      cacheKey,
      videoCached: false,
    })
  }

  return NextResponse.json({
    status: statusData.status,
    cacheKey,
    videoCached: statusData.status === 'ready',
    videoUrl: statusData.videoUrl,
    posterUrl: statusData.posterUrl,
    error: statusData.error,
  })
}

export async function POST(req: NextRequest) {
  const { sessionId, unitId, topic = '' } = (await req.json()) as {
    sessionId: string
    unitId: string
    topic?: string
  }

  if (!sessionId || !unitId) {
    return NextResponse.json({ error: 'sessionId and unitId required' }, { status: 400 })
  }

  const cacheKey = calcVideoKey(sessionId, unitId, topic)
  const key = redisKey(cacheKey)

  // Check for existing job
  const existing = await redis.get(key)
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as VideoStatus
      if (parsed.status === 'generating' || parsed.status === 'ready') {
        return NextResponse.json({
          status: parsed.status,
          cacheKey,
          videoCached: parsed.status === 'ready',
          videoUrl: parsed.videoUrl,
          posterUrl: parsed.posterUrl,
        })
      }
    } catch {}
  }

  // Fetch required data from Redis
  const [unitContent, roadmap, profile] = await Promise.all([
    getUnitContent(sessionId, unitId, topic),
    getRoadmap(sessionId, topic),
    getProfile(sessionId),
  ])

  if (!unitContent) {
    return NextResponse.json({ error: 'Unit content not found — generate content first' }, { status: 404 })
  }

  const unit = roadmap?.units.find(u => u.id === unitId)
  const language = profile?.language === 'pt-BR' ? 'Brazilian Portuguese' : 'English'

  // Mark as generating
  await redis.set(key, JSON.stringify({ status: 'generating' }), 'EX', 60 * 60 * 24)

  // Fire-and-forget background job
  const params = {
    cacheKey,
    sessionId,
    unitId,
    topic,
    unitTitle: unit?.title ?? unitContent.unitId,
    videoScript: unitContent.videoScript,
    explanation: unitContent.explanation,
    keyPoints: unitContent.keyPoints,
    language,
  }

  generateLessonVideo(params)
    .then(async () => {
      await redis.set(
        key,
        JSON.stringify({
          status: 'ready',
          videoUrl: `/generated/lesson-videos/${cacheKey}.mp4`,
          posterUrl: `/generated/lesson-videos/${cacheKey}-poster.png`,
        }),
        'EX',
        60 * 60 * 24 * 7,
      )
    })
    .catch(async (err: Error) => {
      console.error('[lesson-video] generation failed:', err)
      await redis.set(
        key,
        JSON.stringify({ status: 'failed', error: err.message }),
        'EX',
        60 * 60 * 2,
      )
    })

  return NextResponse.json({ status: 'generating', cacheKey })
}
