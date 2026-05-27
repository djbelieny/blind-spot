import redis from '@/lib/redis'

export interface CostEvent {
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

// Pricing in USD
const DEEPSEEK_INPUT_PER_TOKEN = 0.27 / 1_000_000
const DEEPSEEK_OUTPUT_PER_TOKEN = 1.10 / 1_000_000
const OPENAI_TTS_HD_PER_CHAR = 0.030 / 1_000
const ELEVENLABS_PER_CHAR = 0.030 / 1_000  // approximation

export function calcDeepseekCost(inputTokens: number, outputTokens: number): number {
  return inputTokens * DEEPSEEK_INPUT_PER_TOKEN + outputTokens * DEEPSEEK_OUTPUT_PER_TOKEN
}

export function calcOpenAITTSCost(characters: number): number {
  return characters * OPENAI_TTS_HD_PER_CHAR
}

export function calcElevenLabsCost(characters: number): number {
  return characters * ELEVENLABS_PER_CHAR
}

const LIST_KEY = 'ai_costs:events'
const MAX_EVENTS = 10_000

export async function logCost(event: Omit<CostEvent, 'ts'>): Promise<void> {
  const full: CostEvent = { ...event, ts: Date.now() }
  try {
    await redis.lpush(LIST_KEY, JSON.stringify(full))
    // Fire-and-forget trim — don't await
    redis.ltrim(LIST_KEY, 0, MAX_EVENTS - 1).catch(() => {})
  } catch {
    // Cost logging must never break the main request
  }
}

export async function getCostEvents(limit = 1000): Promise<CostEvent[]> {
  const items = await redis.lrange(LIST_KEY, 0, limit - 1)
  return items.flatMap(s => {
    try { return [JSON.parse(s) as CostEvent] } catch { return [] }
  })
}
