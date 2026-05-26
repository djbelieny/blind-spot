import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

export const deepseekV3 = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
  baseURL: 'https://api.deepseek.com/v1',
})

export const deepseekR1 = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
  baseURL: 'https://api.deepseek.com/v1',
})

export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
})

export const MODELS = {
  V3: 'deepseek-chat',
  R1: 'deepseek-reasoner',
  HAIKU: 'claude-haiku-4-5-20251001',
} as const
