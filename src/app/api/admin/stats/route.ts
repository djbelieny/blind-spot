import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'

interface CostEvent {
  ts: number
  type: 'deepseek_chat' | 'openai_tts' | 'elevenlabs_tts'
  model: string
  endpoint: string
  sessionId?: string
  userId?: string
  inputTokens?: number
  outputTokens?: number
  characters?: number
  cost: number
}

function authError() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function startOfDayUTC(daysAgo: number): number {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return d.getTime()
}

function toDateString(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) return authError()

  // Fetch all events from Redis list (LPUSH = newest first)
  const raw = await redis.lrange('ai_costs:events', 0, -1)
  const events: CostEvent[] = raw.flatMap((item) => {
    try { return [JSON.parse(item) as CostEvent] } catch { return [] }
  })

  const now = Date.now()
  const todayStart = startOfDayUTC(0)
  const sevenDaysAgo = startOfDayUTC(7)

  let totalCostUSD = 0
  let last7DaysCostUSD = 0
  let todayCostUSD = 0
  const byType: Record<string, { requests: number; cost: number }> = {}
  const byEndpoint: Record<string, { requests: number; cost: number }> = {}
  const dailyMap: Record<string, { cost: number; requests: number }> = {}

  // Pre-fill last 14 days
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    dailyMap[d.toISOString().slice(0, 10)] = { cost: 0, requests: 0 }
  }

  const fourteenDaysAgo = startOfDayUTC(14)

  for (const e of events) {
    totalCostUSD += e.cost
    if (e.ts >= sevenDaysAgo) last7DaysCostUSD += e.cost
    if (e.ts >= todayStart) todayCostUSD += e.cost

    // byType
    if (!byType[e.type]) byType[e.type] = { requests: 0, cost: 0 }
    byType[e.type].requests++
    byType[e.type].cost += e.cost

    // byEndpoint
    if (!byEndpoint[e.endpoint]) byEndpoint[e.endpoint] = { requests: 0, cost: 0 }
    byEndpoint[e.endpoint].requests++
    byEndpoint[e.endpoint].cost += e.cost

    // daily (last 14 days only)
    if (e.ts >= fourteenDaysAgo) {
      const day = toDateString(e.ts)
      if (dailyMap[day]) {
        dailyMap[day].cost += e.cost
        dailyMap[day].requests++
      }
    }
  }

  const dailySpend = Object.entries(dailyMap).map(([date, v]) => ({
    date,
    cost: v.cost,
    requests: v.requests,
  }))

  const recentEvents = events.slice(0, 20)

  return NextResponse.json({
    totalCostUSD,
    last7DaysCostUSD,
    todayCostUSD,
    totalRequests: events.length,
    byType,
    byEndpoint,
    dailySpend,
    recentEvents,
  })
}
