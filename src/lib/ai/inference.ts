import { deepseekV3, MODELS } from './clients'
import type { InferredProfile, Language, CommunicationStyle, BackgroundLevel } from '@/types/learner'

export async function inferProfileFromMessage(
  firstMessage: string,
  detectedLanguage: Language,
  complexityData: { level: BackgroundLevel; style: CommunicationStyle; ageProxy: 'young' | 'adult' | 'senior' }
): Promise<InferredProfile> {
  const prompt = `You are analyzing a student's first message to extract their learning profile.

Message: "${firstMessage}"
Detected language: ${detectedLanguage}
Vocabulary complexity: ${complexityData.level}

Extract and return JSON with these exact fields:
{
  "domain": "the subject/topic they want to learn (concise, e.g. 'financial accounting', 'Python programming', 'calculus')",
  "urgency": "immediate|medium-term|exploratory",
  "motivationType": "career|curiosity|academic|survival",
  "communicationStyle": "${complexityData.style}",
  "ageProxy": "${complexityData.ageProxy}",
  "backgroundLevel": "${complexityData.level}",
  "objective": "one sentence describing exactly what they want to achieve"
}

Return ONLY valid JSON, no markdown, no explanation.`

  const res = await deepseekV3.chat.completions.create({
    model: MODELS.V3,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 300,
    response_format: { type: 'json_object' },
  })

  const content = res.choices[0].message.content ?? '{}'
  try {
    return JSON.parse(content) as InferredProfile
  } catch {
    return {
      domain: firstMessage.slice(0, 100),
      urgency: 'exploratory',
      motivationType: 'curiosity',
      communicationStyle: complexityData.style,
      ageProxy: complexityData.ageProxy,
      backgroundLevel: complexityData.level,
    } as InferredProfile & { domain: string; objective: string }
  }
}
