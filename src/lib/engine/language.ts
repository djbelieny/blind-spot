import { franc } from 'franc-min'
import type { Language, BackgroundLevel, CommunicationStyle, AgeProxy, Urgency, MotivationType } from '@/types/learner'

export function detectLanguage(text: string): Language {
  const code = franc(text, { minLength: 10 })
  // franc returns ISO 639-3; 'por' = Portuguese
  return code === 'por' ? 'pt-BR' : 'en'
}

export function analyzeComplexity(text: string): {
  level: BackgroundLevel
  style: CommunicationStyle
  ageProxy: AgeProxy
} {
  const words = text.trim().split(/\s+/)
  const wordCount = words.length
  const avgWordLength = words.reduce((s, w) => s + w.replace(/[^a-zA-Z]/g, '').length, 0) / Math.max(wordCount, 1)
  const sentenceCount = (text.match(/[.!?]+/g) ?? []).length || 1
  const avgSentenceLength = wordCount / sentenceCount

  // Technical jargon signals
  const technicalTerms = /\b(algorithm|derivative|integration|balance sheet|amortization|regression|neural|leverage|volatility|EBITDA|liquidity|arbitrage|stochastic|eigenvalue|gradient)\b/i
  const hasTechnical = technicalTerms.test(text)

  // Determine background level
  let level: BackgroundLevel
  if (hasTechnical || (avgWordLength > 5.5 && avgSentenceLength > 12)) {
    level = 'expert'
  } else if (avgWordLength > 4.5 || avgSentenceLength > 8) {
    level = 'intermediate'
  } else {
    level = 'novice'
  }

  // Communication style
  const isFormal = /\b(I would like|I am seeking|Could you please|Furthermore|Moreover|I wish to)\b/i.test(text)
  const isTechnical = hasTechnical
  const isCasual = /\b(wanna|gonna|kinda|tbh|idk|lol|btw|yo|help me out)\b/i.test(text)

  let style: CommunicationStyle
  if (isTechnical) style = 'technical'
  else if (isFormal) style = 'formal'
  else if (isCasual) style = 'casual'
  else style = 'simple'

  // Age proxy from vocabulary and phrasing
  let ageProxy: AgeProxy
  if (isCasual || wordCount < 8) {
    ageProxy = 'young'
  } else if (isFormal || hasTechnical) {
    ageProxy = 'adult'
  } else {
    ageProxy = 'adult'
  }

  return { level, style, ageProxy }
}

const URGENCY_PATTERNS: Record<Urgency, RegExp> = {
  immediate: /\b(asap|urgent|deadline|exam|test|tomorrow|next week|interview|job interview|this week|quickly|fast)\b/i,
  'medium-term': /\b(next month|few months|this year|promotion|career change|improve|get better)\b/i,
  exploratory: /\b(curious|interested|learn|explore|understand|want to know|wondering)\b/i,
}

export function inferUrgency(text: string): Urgency {
  for (const [urgency, pattern] of Object.entries(URGENCY_PATTERNS) as [Urgency, RegExp][]) {
    if (pattern.test(text)) return urgency
  }
  return 'exploratory'
}

const MOTIVATION_PATTERNS: Record<MotivationType, RegExp> = {
  career: /\b(job|career|promotion|salary|work|hire|interview|professional|linkedin|company)\b/i,
  survival: /\b(failing|fail|pass|exam|test|failing|must|need to|have to|required|mandatory)\b/i,
  academic: /\b(course|class|homework|assignment|professor|university|college|grade|study for)\b/i,
  curiosity: /\b(curious|interesting|fascinating|wonder|always wanted|love|passionate|hobby)\b/i,
}

export function inferMotivation(text: string): MotivationType {
  for (const [motivation, pattern] of Object.entries(MOTIVATION_PATTERNS) as [MotivationType, RegExp][]) {
    if (pattern.test(text)) return motivation
  }
  return 'curiosity'
}
